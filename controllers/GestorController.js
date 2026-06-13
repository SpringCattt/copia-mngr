// controllers/GestorController.js
const path = require('path');
const { pool } = require('../database/connection');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// 🌟 Credenciais automatizadas e seguras a partir do teu ficheiro .env
const SUPABASE_URL = process.env.SUPABASE_URL; 
const SUPABASE_KEY = process.env.SUPABASE_KEY; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuração do Multer para ler os campos de imagem multipart
const storageMemoria = multer.memoryStorage();
const uploadConfig = multer({
    storage: storageMemoria,
    limits: { fileSize: 3 * 1024 * 1024 }, // Limite de 3MB
    fileFilter: (req, file, cb) => {
        const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (formatosPermitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato inválido. Apenas são aceites imagens JPG, PNG ou WEBP.'));
        }
    }
}).single('logo_file');

const enviarConteudoOuMoldura = (req, res, ficheiroMetodo) => {
    if (req.headers['x-solicitado-por'] === 'SPA') {
        return res.sendFile(ficheiroMetodo);
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'dashboard.html'));
};

const uploadEquipaConfig = multer({
    storage: multer.memoryStorage(), 
    limits: { fileSize: 3 * 1024 * 1024 }, // Limite de 3MB
    fileFilter: (req, file, cb) => {
        const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (formatosPermitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato inválido. Apenas são aceites imagens JPG, PNG ou WEBP.'));
        }
    }
}).single('foto_file');

// --- GESTOR VISTAS ---
exports.getEquipas = async (req, res) => {
    // 1. Apenas serve o ficheiro estático limpo (A moldura SPA trata do resto)
    const caminhoMiolo = path.join(__dirname, '..', 'public', 'mngr', 'gestorClube', 'equipas.html');
    enviarConteudoOuMoldura(req, res, caminhoMiolo);
};

exports.getEquipaDetalhes = (req, res) => {
    const caminhoMiolo = path.join(__dirname, '..', 'public', 'mngr', 'gestorClube', 'equipa_detalhes.html');
    enviarConteudoOuMoldura(req, res, caminhoMiolo);
};

exports.getCriarClube = (req, res) => {
    const caminhoFicheiroLimpo = path.join(__dirname, '..', 'public', 'mngr', 'gestorClube', 'criarClube.html');
    res.sendFile(caminhoFicheiroLimpo);
};

// --- AÇÕES DE BASE DE DADOS (POST) ---
exports.guardarDetalhesGestor = async (req, res) => {
    const client = await pool.connect();
    try {
        const id_utilizador = req.session.userId;
        const { nome_completo, data_nascimento, sexo, cidade, data_inicio_carreira } = req.body;

        if (!nome_completo || !data_nascimento || !sexo || !cidade || !data_inicio_carreira) {
            return res.status(400).json({ success: false, message: "Todos os campos do formulário são de preenchimento obrigatório." });
        }

        const nascimento = new Date(data_nascimento);
        const inicioCarreira = new Date(data_inicio_carreira);
        const hoje = new Date();

        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }

        if (idade < 18) {
            return res.status(400).json({ success: false, message: "Operação negada. O gestor tem de ser maior de 18 anos." });
        }

        const dataDezoitoAnos = new Date(nascimento);
        dataDezoitoAnos.setFullYear(dataDezoitoAnos.getFullYear() + 18);

        if (inicioCarreira < dataDezoitoAnos) {
            return res.status(400).json({ success: false, message: "Inconsistência de datas. O início de carreira não pode ser anterior à data em que completou 18 anos." });
        }

        await client.query('BEGIN');

        // 🌟 1. Atualiza o tipo_utilizador e o NOVO campo nome_completo na tabela central
        await client.query(
            "UPDATE utilizador SET tipo_utilizador = 'GESTOR', nome_completo = $1 WHERE id = $2",
            [nome_completo.trim(), id_utilizador]
        );

        // 🌟 2. Insere os dados profissionais na tabela do Gestor
        await client.query(
            `INSERT INTO gestoresClube (id_utilizador, data_nascimento, sexo, cidade, data_inicio_carreira)
             VALUES ($1, $2, $3, $4, $5)`,
            [id_utilizador, data_nascimento, sexo, cidade.trim(), data_inicio_carreira]
        );

        await client.query('COMMIT');

        // Como ele acabou de se registar como Gestor, ele garantidamente ainda NÃO tem clube criado
        return res.status(200).json({ success: true, redirectTo: '/mngr/gestorClube/criarClube' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao salvar dados do Gestor:", err);
        return res.status(500).json({ success: false, message: "Erro de servidor ao processar o perfil de gestor." });
    } finally {
        client.release();
    }
};

// --- AÇÕES DE BASE DE DADOS ---
exports.guardarClube = (req, res) => {
    uploadConfig(req, res, async (err) => {
        // O Multer já está configurado no topo com limits: { fileSize: 3 * 1024 * 1024 } (3MB)
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        const client = await pool.connect();

        try {
            // 🌟 VALIDAR COOKIE DE SESSÃO
            if (!req.session || !req.session.userId) {
                client.release();
                return res.status(401).json({ success: false, message: 'Sessão expirada ou inválida. Por favor, volte a fazer login.' });
            }

            const id_gestor = req.session.userId; 
            const { nome, pais, regiao, data_fundacao, descricao } = req.body;

            // 🌟 VALIDAR CAMPOS OBRIGATÓRIOS EM BRANCO (Exceto descrição)
            if (!nome || !nome.trim()) {
                client.release();
                return res.status(400).json({ success: false, message: 'O nome do clube não pode estar em branco.' });
            }
            if (!pais || !pais.trim()) {
                client.release();
                return res.status(400).json({ success: false, message: 'O país de origem não pode estar em branco.' });
            }
            if (!regiao || !regiao.trim()) {
                client.release();
                return res.status(400).json({ success: false, message: 'A região/distrito não pode estar em branco.' });
            }
            if (!data_fundacao || !data_fundacao.trim()) {
                client.release();
                return res.status(400).json({ success: false, message: 'A data de fundação é obrigatória.' });
            }

            // 🌟 VALIDAR REGRAS CRONOLÓGICAS DA DATA DE FUNDAÇÃO
            const dataFundacaoConvertida = new Date(data_fundacao);
            const dataMinimaValida = new Date('1857-01-01');
            const dataAtual = new Date();

            if (isNaN(dataFundacaoConvertida.getTime())) {
                client.release();
                return res.status(400).json({ success: false, message: 'O formato da data introduzido é inválido.' });
            }
            if (dataFundacaoConvertida < dataMinimaValida) {
                client.release();
                return res.status(400).json({ success: false, message: 'Não é permitido registar datas de fundação anteriores ao ano de 1857.' });
            }
            if (dataFundacaoConvertida > dataAtual) {
                client.release();
                return res.status(400).json({ success: false, message: 'A data de fundação não pode ser uma data futura.' });
            }

            // 🌟 DUPLA SEGURANÇA: Garantir que o gestor atual não tem outro clube ativo
            const clubeExistenteGestor = await client.query('SELECT id FROM clube WHERE id_gestor = $1 LIMIT 1', [id_gestor]);
            if (clubeExistenteGestor.rows.length > 0) {
                client.release();
                return res.status(403).json({ success: false, message: 'A sua conta de gestor já possui um clube associado.' });
            }

            // 🌟 UNICIDADE COMBINADA RIGOROSA (Nome + Região limpos de espaços nas pontas)
            const nomeLimpo = nome.trim();
            const regiaoLimpa = regiao.trim();

            const queryDuplicadoSQL = `
                SELECT id FROM clube 
                WHERE LOWER(TRIM(nome)) = LOWER($1) 
                  AND LOWER(TRIM(regiao)) = LOWER($2) 
                LIMIT 1;
            `;
            const clubeDuplicado = await client.query(queryDuplicadoSQL, [nomeLimpo, regiaoLimpa]);
            
            if (clubeDuplicado.rows.length > 0) {
                client.release();
                return res.status(409).json({ 
                    success: false, 
                    message: `Já se encontra registado um clube chamado "${nomeLimpo}" na região de "${regiaoLimpa}".` 
                });
            }

            // 🔏 INÍCIO DA TRANSAÇÃO CONTROLADA
            await client.query('BEGIN');

            // 🌟 PASSO 1: Inserir o clube usando a data de fundação diretamente no campo "criado_em"
            const queryInsert = `
                INSERT INTO public.equipa (nome, id_clube, id_tipo_desporto, id_tipo_escalao, foto_url)
                VALUES ($1, $2, $3, $4, NULL)
                RETURNING id;
            `;
            
            const resultadoBD = await client.query(queryInsertSQL, [
                id_gestor,
                nomeLimpo,
                pais.trim(),
                regiaoLimpa,
                descricao && descricao.trim() ? descricao.trim() : null,
                data_fundacao 
            ]);

            const novoClubeId = resultadoBD.rows[0].id;
            let logoPublicUrl = null;

            // 🌟 PASSO 2: Upload para o Supabase apenas após a inserção bem-sucedida do Passo 1
            if (req.file) {
                const extensao = path.extname(req.file.originalname) || '.png';
                const nomeFicheiroSeguro = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${extensao}`;

                const { data, error } = await supabase.storage
                    .from('logo-clubes')
                    .upload(nomeFicheiroSeguro, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: false
                    });

                // Se o cloud storage falhar, revertemos o passo 1 instantaneamente
                if (error) {
                    console.error('Erro no upload para o Supabase Storage:', error);
                    await client.query('ROLLBACK'); 
                    client.release();
                    return res.status(500).json({ success: false, message: 'Falha ao guardar a imagem no Cloud Storage. O clube foi revertido.' });
                }

                const { data: urlData } = supabase.storage
                    .from('logo-clubes')
                    .getPublicUrl(nomeFicheiroSeguro);

                logoPublicUrl = urlData.publicUrl;

                // 🌟 PASSO 3: Atualizar o clube com a URL definitiva gerada pelo bucket
                const queryUpdateSQL = `
                    UPDATE clube 
                    SET logo_url = $1 
                    WHERE id = $2;
                `;
                await client.query(queryUpdateSQL, [logoPublicUrl, novoClubeId]);
            }

            // Confirmação final da transação
            await client.query('COMMIT');
            client.release();

            console.log(`[Sucesso] Clube ID ${novoClubeId} ("${nomeLimpo}") registado com a data cronológica ${data_fundacao}.`);

            return res.status(201).json({
                success: true,
                redirectTo: '/mngr/gestorClube/equipas'
            });

        } catch (dbErr) {
            await client.query('ROLLBACK');
            client.release();
            
            // Tratamento específico caso a restrição física do banco de dados trave o registo
            if (dbErr.code === '23505') { 
                return res.status(409).json({ success: false, message: 'Erro: Já existe um clube registado com este nome nessa região.' });
            }
            
            console.error('Erro crítico ao salvar clube na BD:', dbErr);
            return res.status(500).json({ success: false, message: 'Erro interno ao registar o clube na Base de Dados.' });
        }
    });
};

exports.getPainelEquipasDados = async (req, res) => {
    try {
        const id_utilizador_logado = req.session.userId; 

        if (!id_utilizador_logado) {
            return res.status(401).json({ success: false, message: "Sessão expirada." });
        }

        // Buscar Clube
        const queryClube = `SELECT id, nome, regiao, pais, logo_url FROM public.clube WHERE id_gestor = $1 LIMIT 1`;
        const clubeRes = await pool.query(queryClube, [id_utilizador_logado]);

        if (clubeRes.rows.length === 0) {
            return res.status(200).json({ success: false, message: "Precisa de criar um clube primeiro!" });
        }
        const clube = clubeRes.rows[0];

        // Buscar Desportos e Escalões
        const desportosRes = await pool.query(`SELECT id, nome FROM public.desporto ORDER BY nome`);
        const escaloesRes = await pool.query(`SELECT id, nome FROM public.escalao ORDER BY nome`);

        // Buscar Equipas Existentes
        const queryEquipas = `
            SELECT e.id, e.nome, e.foto_url, d.nome AS desporto_nome, esc.nome AS escalao_nome
            FROM public.equipa e
            JOIN public.desporto d ON e.id_tipo_desporto = d.id
            JOIN public.escalao esc ON e.id_tipo_escalao = esc.id
            WHERE e.id_clube = $1
            ORDER BY d.nome, e.nome;
        `;
        const equipasRes = await pool.query(queryEquipas, [clube.id]);

        return res.status(200).json({
            success: true,
            clube: clube,
            desportos: desportosRes.rows,
            escaloes: escaloesRes.rows,
            equipas: equipasRes.rows
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: "Erro interno no servidor." });
    }
};

exports.criarEquipa = (req, res) => {
    uploadEquipaConfig(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });

        const client = await pool.connect();

        try {
            const id_utilizador_logado = req.session.userId;
            if (!id_utilizador_logado) {
                client.release();
                return res.status(401).json({ success: false, message: "Sessão expirada." });
            }

            const { nome, id_tipo_desporto, id_tipo_escalao } = req.body;

            // 1. Validação estrita
            if (!nome || !id_tipo_desporto || !id_tipo_escalao) {
                client.release();
                return res.status(400).json({ success: false, message: "Todos os campos são obrigatórios." });
            }

            // 2. Busca do Clube
            const clubeRes = await client.query(`SELECT id FROM public.clube WHERE id_gestor = $1 LIMIT 1`, [id_utilizador_logado]);
            if (clubeRes.rows.length === 0) {
                client.release();
                return res.status(400).json({ success: false, message: "Precisa de criar um clube primeiro!" });
            }
            const id_clube = parseInt(clubeRes.rows[0].id, 10);

            // 3. Validação de duplicados (forçando cast para integer no $2)
            const checkRes = await client.query(
                `SELECT id FROM public.equipa WHERE nome = $1 AND id_clube = $2`, 
                [nome.trim(), id_clube]
            );

            if (checkRes.rows.length > 0) {
                client.release();
                return res.status(400).json({ success: false, message: `Já existe uma equipa com o nome "${nome}".` });
            }

            await client.query('BEGIN');

            // 4. Inserção (usando cast explícito ::integer para garantir tipagem no Postgres)
            const queryInsert = `
                INSERT INTO public.equipa (nome, id_clube, id_tipo_desporto, id_tipo_escalao, foto_url)
                VALUES ($1, $2::integer, $3::integer, $4::integer, $5)
                RETURNING id;
            `;

            const novaEquipaRes = await client.query(queryInsert, [
                nome.trim(), 
                id_clube, 
                parseInt(id_tipo_desporto, 10), 
                parseInt(id_tipo_escalao, 10),
                null // foto_url inicial
            ]);

            const novaEquipaId = novaEquipaRes.rows[0].id;
            let fotoPublicUrl = null;

            // 5. Upload Supabase
            if (req.file) {
                const nomeFicheiroSeguro = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${path.extname(req.file.originalname)}`;

                const { error } = await supabase.storage
                    .from('logo-clubes')
                    .upload(nomeFicheiroSeguro, req.file.buffer, { contentType: req.file.mimetype });

                if (error) throw error;

                fotoPublicUrl = supabase.storage.from('logo-clubes').getPublicUrl(nomeFicheiroSeguro).data.publicUrl;

                await client.query(`UPDATE public.equipa SET foto_url = $1 WHERE id = $2`, [fotoPublicUrl, novaEquipaId]);
            }

            await client.query('COMMIT');
            client.release();

            return res.status(201).json({ success: true, message: "Equipa criada!", equipa: { id: novaEquipaId, nome, foto_url: fotoPublicUrl } });

        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
            console.error("Erro crítico ao criar equipa:", error);
            return res.status(500).json({ success: false, message: "Erro ao criar equipa. Verifique os dados." });
        }
    });
};

// Retorna os metadados da equipa e a lista de todas as épocas em que ela participa
exports.obterDetalhesEquipa = async (req, res) => {
    const client = await pool.connect();

    try {
        const idEquipa = req.params.id;
        const id_utilizador_logado = req.session.userId;
        
        if (!id_utilizador_logado) {
            client.release();
            return res.status(401).json({ success: false, message: "Sessão expirada." });
        }

        // Query simplificada: Sem tabelas ou colunas de época
        const queryEquipa = `
            SELECT 
                e.id,
                e.nome AS equipa_nome,
                e.foto_url,
                d.nome AS desporto_nome,
                esc.nome AS escalao_nome
            FROM public.equipa e
            LEFT JOIN public.desporto d ON e.id_tipo_desporto = d.id
            LEFT JOIN public.escalao esc ON e.id_tipo_escalao = esc.id
            WHERE e.id = $1;
        `;

        const resultadoEquipa = await client.query(queryEquipa, [idEquipa]);

        if (resultadoEquipa.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, message: "Equipa não encontrada." });
        }

        client.release();

        const dadosEquipa = resultadoEquipa.rows[0];

        // Retorno limpo
        return res.status(200).json({
            success: true,
            dados: {
                equipa: {
                    id: dadosEquipa.id,
                    nome: dadosEquipa.equipa_nome,
                    desporto_nome: dadosEquipa.desporto_nome || "Não Definido",
                    escalao_nome: dadosEquipa.escalao_nome || "Não Definido",
                    foto_url: dadosEquipa.foto_url || "/mngr/images/equipa-placeholder.png"
                }
                // 'epocas' foi removido porque já não existe na BD
            }
        });

    } catch (error) {
        client.release();
        console.error("======= [ERRO CRÍTICO SQL DETALHADO] =======");
        console.error(error);
        console.error("============================================");
        
        return res.status(500).json({ 
            success: false, 
            message: "Erro de servidor ao carregar cabeçalho da equipa." 
        });
    }
};

// Retorna os atletas e equipa técnica associados ao ID da equipa e à época especificada
exports.obterPlantelEquipa = async (req, res) => {
    const client = await pool.connect();
    try {
        const idEquipa = parseInt(req.params.id, 10);

        // 🌟 AGORA VAI BUSCAR ATLETAS E TREINADORES JUNTOS (UNION ALL)
        const queryPlantel = `
            SELECT ea.id_atleta AS id, 'Atleta' AS cargo, u.nome AS nome_utilizador, u.email,
                   EXTRACT(YEAR FROM AGE(a.data_nascimento)) AS idade, a.altura, a.peso
            FROM public.equipa_atleta ea
            JOIN public.utilizador u ON ea.id_atleta = u.id
            LEFT JOIN public.atletas a ON u.id = a.id_utilizador
            WHERE ea.id_equipa = $1

            UNION ALL

            SELECT et.id_treinador AS id, 'Treinador' AS cargo, u.nome AS nome_utilizador, u.email,
                   EXTRACT(YEAR FROM AGE(t.data_nascimento)) AS idade, NULL AS altura, NULL AS peso
            FROM public.equipa_treinador et
            JOIN public.utilizador u ON et.id_treinador = u.id
            LEFT JOIN public.treinadores t ON u.id = t.id_utilizador
            WHERE et.id_equipa = $1

            ORDER BY cargo DESC, nome_utilizador ASC;
        `;
        
        const plantelRes = await client.query(queryPlantel, [idEquipa]);
        client.release();

        return res.status(200).json({ success: true, membros: plantelRes.rows });
    } catch (error) {
        client.release();
        return res.status(500).json({ success: false, message: "Erro de servidor ao carregar a tabela de plantel." });
    }
};

// =========================================================
// 🌟 ADICIONAR NOVO MEMBRO (CRIAR CONTA DO ZERO)
// =========================================================
exports.criarMembroEquipa = async (req, res) => {
    const client = await pool.connect();
    try {
        const { idEquipa, nome, email, password, cargo } = req.body;

        // 1. Prevenção de Erros: Garantir que a Equipa existe no URL
        if (!idEquipa || idEquipa === 'null') {
            client.release();
            return res.status(400).json({ success: false, message: "ID da equipa não encontrado. Volte à página de Equipas e entre novamente." });
        }

        // 2. Verificar se o e-mail já existe na BD inteira
        const emailExiste = await client.query('SELECT id FROM public.utilizador WHERE email = $1', [email.trim()]);
        if (emailExiste.rows.length > 0) {
            client.release();
            return res.status(400).json({ success: false, message: "Este e-mail já tem conta! Use a aba 'Convidar Existente'." });
        }

        await client.query('BEGIN'); // Inicia a transação segura

        // 3. Criar a nova conta no Utilizador
        const tipoUtilizador = cargo.toUpperCase(); 
        const queryInsertUser = `
            INSERT INTO public.utilizador (nome, email, password, tipo_utilizador, ativo, criado_em)
            VALUES ($1, $2, $3, $4, true, NOW())
            RETURNING id;
        `;
        const novoUserRes = await client.query(queryInsertUser, [nome.trim(), email.trim(), password, tipoUtilizador]);
        const novoUserId = novoUserRes.rows[0].id;

        // 4. Associar à Equipa (Usando a NOVA ESTRUTURA DA BD)
        if (tipoUtilizador === 'ATLETA') {
            // Insere na tabela equipa_atleta com a Posição e Data de Entrada
            await client.query(
                `INSERT INTO public.equipa_atleta (id_equipa, id_atleta, data_entrada, ativo) 
                 VALUES ($1, $2, $3, NOW(), true)`, 
                [idEquipa, novoUserId]
            );
        } else if (tipoUtilizador === 'TREINADOR') {
            // Insere na NOVA tabela equipa_treinador
            await client.query(
                `INSERT INTO public.equipa_treinador (id_equipa, id_treinador, data_entrada, ativo) 
                 VALUES ($1, $2, NOW(), true)`, 
                [idEquipa, novoUserId]
            );
        }

        await client.query('COMMIT'); 
        client.release();

        return res.status(201).json({ success: true });

    } catch (error) {
        await client.query('ROLLBACK'); 
        client.release();
        
        // Vai imprimir o erro real a vermelho no terminal do teu VS Code!
        console.error("❌ ERRO CRÍTICO AO CRIAR MEMBRO:", error);
        
        return res.status(500).json({ success: false, message: "Erro no servidor. Verifica o terminal do VS Code para veres a falha exata de SQL." });
    }
};


// =========================================================
// 🌟 CONVIDAR MEMBRO EXISTENTE (INSERIR NA TABELA CONVITE)
// =========================================================
exports.convidarMembroEquipa = async (req, res) => {
    const client = await pool.connect();
    try {
        const { idEquipa, email, cargo } = req.body;

        if (!idEquipa || idEquipa === 'null') {
            client.release();
            return res.status(400).json({ success: false, message: "ID da equipa não encontrado." });
        }

        // 1. Procurar utilizador (LOWER para evitar erros de maiúsculas)
        const userRes = await client.query('SELECT id, nome, tipo_utilizador FROM public.utilizador WHERE LOWER(email) = LOWER($1)', [email.trim()]);
        
        if (userRes.rows.length === 0) {
            client.release();
            return res.status(404).json({ success: false, message: "Não existe nenhuma conta com este email." });
        }

        const utilizador = userRes.rows[0];
        const tipoDB = utilizador.tipo_utilizador ? utilizador.tipo_utilizador.toUpperCase() : null;

        // Bloqueia se tentar convidar um Atleta para Treinador (ou vice-versa)
        if (tipoDB !== cargo.toUpperCase() && tipoDB !== null) {
            client.release();
            return res.status(400).json({ success: false, message: `O utilizador é um ${utilizador.tipo_utilizador}, não pode ser convidado como ${cargo}.` });
        }

        // 2. Verificar se já existe um convite pendente (Usamos ILIKE para ignorar maiúsculas/minúsculas)
        const queryCheckConvite = `
            SELECT id FROM public.convite 
            WHERE id_equipa = $1 AND (id_atleta = $2 OR id_treinador = $2) AND estado::text ILIKE 'pendente'
        `;
        const conviteExiste = await client.query(queryCheckConvite, [idEquipa, utilizador.id]);

        if (conviteExiste.rows.length > 0) {
            client.release();
            return res.status(400).json({ success: false, message: "Já existe um convite pendente para este utilizador." });
        }

        // 3. Inserir na tabela de Convites (SEM A POSIÇÃO)
        const colunaAlvo = cargo.toUpperCase() === 'ATLETA' ? 'id_atleta' : 'id_treinador';
        const queryInsertConvite = `
            INSERT INTO public.convite (id_equipa, ${colunaAlvo}, estado)
            VALUES ($1, $2, 'pendente')
        `;
        // Passamos apenas o idEquipa e o ID do utilizador!
        await client.query(queryInsertConvite, [idEquipa, utilizador.id]);

        client.release();
        return res.status(200).json({ success: true, nomeEncontrado: utilizador.nome });

    } catch (error) {
        client.release();
        // ESTA É A LINHA QUE TE MOSTRA O VERDADEIRO ERRO NO VS CODE
        console.error("❌ ERRO CRÍTICO AO CONVIDAR MEMBRO:", error);
        return res.status(500).json({ success: false, message: "Erro interno. Verifica o terminal do VS Code para ver o erro SQL exato!" });
    }
};

exports.editarEquipa = (req, res) => {
    uploadEquipaConfig(req, res, async (err) => {
        if (err) {
            console.error('[MULTER ERROR] Erro no processamento do FormData:', err);
            return res.status(400).json({ success: false, message: err.message });
        }

        res.setHeader('Content-Type', 'application/json');

        const client = await pool.connect();

        try {
            const id_utilizador_logado = req.session.userId;
            const idEquipa = parseInt(req.params.id, 10);

            if (!id_utilizador_logado) {
                client.release();
                return res.status(401).json({ success: false, message: "Sessão expirada." });
            }

            // Removida a 'epoca' da desestruturação
            const { nome } = req.body;

            // Validação simplificada: apenas o nome é obrigatório
            if (!nome) {
                client.release();
                return res.status(400).json({ success: false, message: "O nome da equipa é obrigatório." });
            }

            await client.query('BEGIN');

            // 1. Atualiza o nome da equipa (sem a época)
            const queryUpdateTexto = `
                UPDATE public.equipa 
                SET nome = $1 
                WHERE id = $2;
            `;
            await client.query(queryUpdateTexto, [nome.trim(), idEquipa]);

            // 2. Se foi enviada uma imagem nova, processa o upload
            if (req.file) {
                const extensao = path.extname(req.file.originalname) || '.png';
                const nomeFicheiroSeguro = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${extensao}`;

                const { data, error } = await supabase.storage
                    .from('logo-clubes')
                    .upload(nomeFicheiroSeguro, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: false
                    });

                if (error) {
                    console.error('Erro no upload da edição para o Supabase:', error);
                    await client.query('ROLLBACK'); 
                    client.release();
                    return res.status(500).json({ success: false, message: 'Falha ao guardar a nova imagem na nuvem.' });
                }

                const { data: urlData } = supabase.storage
                    .from('logo-clubes')
                    .getPublicUrl(nomeFicheiroSeguro);

                await client.query(`UPDATE public.equipa SET foto_url = $1 WHERE id = $2`, [urlData.publicUrl, idEquipa]);
            }

            await client.query('COMMIT');
            client.release();

            return res.status(200).json({
                success: true,
                message: "Equipa atualizada com sucesso!"
            });

        } catch (error) {
            try { await client.query('ROLLBACK'); } catch (e) {}
            client.release();
            console.error("Erro crítico ao editar equipa:", error);
            return res.status(500).json({ success: false, message: "Erro interno no servidor." });
        }
    });
};