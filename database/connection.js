// database/connection.js
const { Pool } = require('pg');
require('dotenv').config(); 

let pool;

// Função assíncrona para inicializar e testar a melhor conexão disponível
const inicializarPool_BD = async () => {
    // 1. TENTATIVA: Se houver DATABASE_URL, tenta ligar ao Render primeiro
    if (process.env.DATABASE_URL) {
        try {
            console.log('🔄 A tentar estabelecer ligação com a Base de Dados do Render...');
            const poolRender = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false // Obrigatório para o Render
                },
                connectionTimeoutMillis: 5000 // Desiste após 5 segundos se o Render estiver suspenso
            });

            // Força um teste real de ligação à BD do Render
            const clienteTeste = await poolRender.connect();
            clienteTeste.release(); // Liberta o cliente imediatamente se funcionar

            console.log('✅ Ligação à Base de Dados do Render bem-sucedida!');
            pool = poolRender;
            configurarTratamentoErros();
            return; // Conexão estabelecida com sucesso, interrompe a função

        } catch (erroRender) {
            console.error(`⚠️ A base de dados do Render falhou ou está suspensa: ${erroRender.message}`);
            console.log('🔌 A ativar Plano B: A tentar ligar à Base de Dados local/padrão...');
        }
    }

    // 2. TENTATIVA / FALLBACK: Ligação à BD Padrão do .env (Localhost)
    try {
        const poolLocal = new Pool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_DATABASE,
        });

        // Teste real de ligação à BD local/padrão
        const clienteTesteLocal = await poolLocal.connect();
        clienteTesteLocal.release();

        console.log('✅ Conexão à base de dados Padrão/Local estabelecida com sucesso!');
        pool = poolLocal;
        configurarTratamentoErros();

    } catch (erroLocal) {
        console.error('❌ ERRO CRÍTICO: Não foi possível ligar a NENHUMA base de dados!', erroLocal.message);
        process.exit(1); // Fecha o servidor porque não há dados para ler
    }
};

// Garante que a tabela de eventos tem a coluna necessária para o calendário
const garantirEstruturaCalendario = async () => {
    await pool.query(`
        ALTER TABLE IF EXISTS public.evento
        ADD COLUMN IF NOT EXISTS duracao integer;
    `);
    await pool.query(`
        ALTER TABLE IF EXISTS public.evento
        ADD COLUMN IF NOT EXISTS oficial boolean DEFAULT false;
    `);
};

const garantizarTabelasJogo = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.resultado_jogo (
            id SERIAL PRIMARY KEY,
            id_evento INTEGER UNIQUE NOT NULL REFERENCES public.evento(id) ON DELETE CASCADE,
            golos_nossa INTEGER DEFAULT 0,
            golos_adversario INTEGER DEFAULT 0
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.golo (
            id SERIAL PRIMARY KEY,
            id_evento INTEGER NOT NULL REFERENCES public.evento(id) ON DELETE CASCADE,
            id_atleta INTEGER REFERENCES public.utilizador(id) ON DELETE SET NULL,
            nome_marcador VARCHAR(255),
            minuto INTEGER,
            equipa_propria BOOLEAN DEFAULT true,
            autogolo BOOLEAN DEFAULT false
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.estatistica_jogo_match (
            id SERIAL PRIMARY KEY,
            id_evento INTEGER UNIQUE NOT NULL REFERENCES public.evento(id) ON DELETE CASCADE,
            dados JSONB DEFAULT '{}'
        );
    `);
    
    await pool.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'estatistica_jogo_match' AND column_name = 'remates_nossa'
            ) THEN
                ALTER TABLE public.estatistica_jogo_match
                    DROP COLUMN IF EXISTS remates_nossa,
                    DROP COLUMN IF EXISTS remates_adversario,
                    DROP COLUMN IF EXISTS remates_baliza_nossa,
                    DROP COLUMN IF EXISTS remates_baliza_adversario,
                    DROP COLUMN IF EXISTS posse_nossa,
                    DROP COLUMN IF EXISTS posse_adversario,
                    DROP COLUMN IF EXISTS faltas_nossa,
                    DROP COLUMN IF EXISTS faltas_adversario,
                    DROP COLUMN IF EXISTS cartoes_amarelos_nossa,
                    DROP COLUMN IF EXISTS cartoes_amarelos_adversario,
                    DROP COLUMN IF EXISTS cartoes_vermelhos_nossa,
                    DROP COLUMN IF EXISTS cartoes_vermelhos_adversario,
                    DROP COLUMN IF EXISTS foras_jogo_nossa,
                    DROP COLUMN IF EXISTS foras_jogo_adversario,
                    DROP COLUMN IF EXISTS cantos_nossa,
                    DROP COLUMN IF EXISTS cantos_adversario,
                    DROP COLUMN IF EXISTS assistencias_nossa,
                    DROP COLUMN IF EXISTS assistencias_adversario;
                ALTER TABLE public.estatistica_jogo_match ADD COLUMN IF NOT EXISTS dados JSONB DEFAULT '{}';
            END IF;
        END $$;
    `);

    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'estatistica_jogo_evento_atleta_unique'
            ) THEN
                ALTER TABLE public.estatistica_jogo
                ADD CONSTRAINT estatistica_jogo_evento_atleta_unique UNIQUE (id_evento, id_atleta);
            END IF;
        END $$;
    `);

    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'atletas' AND column_name = 'id_desporto'
            ) THEN
                ALTER TABLE public.atletas ADD COLUMN id_desporto INTEGER REFERENCES public.desporto(id) ON DELETE SET NULL;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'treinadores' AND column_name = 'id_desporto'
            ) THEN
                ALTER TABLE public.treinadores ADD COLUMN id_desporto INTEGER REFERENCES public.desporto(id) ON DELETE SET NULL;
            END IF;
        END $$;
    `);

    await pool.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'escalao' AND column_name = 'id_clube'
            ) THEN
                ALTER TABLE public.escalao DROP COLUMN id_clube;
            END IF;
        END $$;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.genero (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(50) NOT NULL UNIQUE
        );
    `);
    await pool.query(`
        INSERT INTO public.genero (nome) VALUES ('Masculino'), ('Feminino'), ('Misto')
        ON CONFLICT (nome) DO NOTHING;
    `);
    await pool.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'atletas' AND column_name = 'id_genero'
            ) THEN
                ALTER TABLE public.atletas ADD COLUMN id_genero INTEGER REFERENCES public.genero(id) ON DELETE SET NULL;
            END IF;
        END $$;
    `);
};

const garantirTabelasDesportoConfig = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.desporto_config (
            id_desporto INTEGER PRIMARY KEY REFERENCES public.desporto(id) ON DELETE CASCADE,
            unidade_pontuacao VARCHAR(50) DEFAULT 'Golo',
            tem_cartoes BOOLEAN DEFAULT true,
            tipos_cartao TEXT[] DEFAULT ARRAY['amarelo','vermelho'],
            tem_assistencias BOOLEAN DEFAULT true
        );
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.desporto_estatistica (
            id SERIAL PRIMARY KEY,
            id_desporto INTEGER NOT NULL REFERENCES public.desporto(id) ON DELETE CASCADE,
            campo VARCHAR(100) NOT NULL,
            label VARCHAR(100) NOT NULL,
            ordem INTEGER DEFAULT 0
        );
    `);
};

// Única função conectarBD responsável pela ordem sequencial da estrutura
const conectarBD = async () => {
    try {
        // 1. Resolve dinamicamente o pool correto (Render ou Local)
        await inicializarPool_BD();

        // 2. Executa as tabelas e alterações na BD selecionada
        await garantirEstruturaCalendario();
        await garantizarTabelasJogo();
        await garantirTabelasDesportoConfig();
        
        await pool.query(`ALTER TABLE IF EXISTS public.golo ADD COLUMN IF NOT EXISTS autogolo BOOLEAN DEFAULT false;`);
        await pool.query(`ALTER TABLE IF EXISTS public.golo ADD COLUMN IF NOT EXISTS id_assistente INTEGER REFERENCES public.utilizador(id) ON DELETE SET NULL;`);
        await pool.query(`ALTER TABLE IF EXISTS public.golo ADD COLUMN IF NOT EXISTS nome_assistente VARCHAR(255);`);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.cartao (
                id SERIAL PRIMARY KEY,
                id_evento INTEGER NOT NULL REFERENCES public.evento(id) ON DELETE CASCADE,
                id_atleta INTEGER REFERENCES public.utilizador(id) ON DELETE SET NULL,
                nome_jogador VARCHAR(255),
                minuto INTEGER,
                tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('amarelo','vermelho')),
                equipa_propria BOOLEAN DEFAULT true
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.penalidade (
                id SERIAL PRIMARY KEY,
                id_evento INTEGER NOT NULL REFERENCES public.evento(id) ON DELETE CASCADE,
                id_atleta INTEGER REFERENCES public.utilizador(id) ON DELETE SET NULL,
                nome_cobrador VARCHAR(255),
                minuto INTEGER,
                convertida BOOLEAN NOT NULL DEFAULT false,
                equipa_propria BOOLEAN NOT NULL DEFAULT true
            );
        `);

        // 🆕 Soft delete para exames_fisicos: permite "eliminar" um exame sem
        // perder o histórico nem partir o ON CONFLICT (id_evento, id_atleta, tipo_exame)
        // usado no upsert de criação/edição.
        await pool.query(`ALTER TABLE IF EXISTS public.exames_fisicos ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;`);

    } catch (err) {
        console.error('❌ Erro na configuração estrutural das tabelas:', err.message);
        process.exit(1);
    }
};

// Atribui o Listener de segurança assim que a pool escolhida é instanciada
const configurarTratamentoErros = () => {
    if (pool) {
        pool.on('error', (err) => {
            console.error('⚠️ Ligação PostgreSQL perdida (idle client error):', err.message);
        });
    }
};

const poolCompativel = {
    query: async (text, params) => {
        if (!pool) throw new Error("A base de dados ainda não foi inicializada.");
        return pool.query(text, params);
    },
    connect: async () => {
        if (!pool) throw new Error("A base de dados ainda não foi inicializada.");
        return pool.connect();
    },
    on: (event, callback) => {
        // Guarda o listener para quando o pool real for criado
        if (pool) pool.on(event, callback);
    }
};

// Exportação 100% compatível com o teu código antigo
module.exports = { 
    pool: poolCompativel, 
    conectarBD 
};