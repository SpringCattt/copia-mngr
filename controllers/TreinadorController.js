// controllers/TreinadorController.js
const path = require('path');
const { pool } = require('../database/connection'); // 🌟 IMPORTAÇÃO CORRIGIDA: Necessária para o Registo e para o teu getDashboard!

// ==========================================
// ----- Lógica de Vistas (Páginas) -----
// ==========================================

const enviarConteudoOuMoldura = (req, res, ficheiroMetodo) => {
    if (req.headers['x-solicitado-por'] === 'SPA') {
        return res.sendFile(ficheiroMetodo);
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'dashboard.html'));
};

exports.getTreinadorIndex = (req, res) => {
    enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'treinador', 'treinador_index.html'));
};

exports.getTreinadorJogo = (req, res) => {
    enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'treinador', 'treinador_jogo.html'));
};


// ==========================================
// 🌟 1. LÓGICA DE REGISTO DO TREINADOR 
// ==========================================

exports.guardarDetalhesTreinador = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const id_utilizador = req.session.userId;
        
        // 🌟 AGORA RECEBEMOS O 'pais' E A 'regiao' EM VEZ DA 'cidade'
        const { nome_completo, data_nascimento, sexo, grau_treinador, modalidade, pais, regiao } = req.body;

        // Validação atualizada
        if (!nome_completo || !data_nascimento || !sexo || !grau_treinador || !modalidade || !pais || !regiao) {
            return res.status(400).json({ success: false, message: "Todos os campos da ficha de treinador são obrigatórios." });
        }

        await client.query('BEGIN');

        // Atualiza o tipo_utilizador e o nome_completo na tabela central
        await client.query(
            "UPDATE utilizador SET tipo_utilizador = 'TREINADOR', nome_completo = $1 WHERE id = $2",
            [nome_completo.trim(), id_utilizador]
        );

        // 🌟 COMBINAMOS A REGIÃO E O PAÍS NUMA SÓ STRING (ex: "Porto, Portugal")
        const localizacao = `${regiao.trim()}, ${pais.trim()}`;

        // Insere na BD usando a variável 'localizacao' na gaveta da 'cidade'
        const queryInsert = `
            INSERT INTO public.treinadores (id_utilizador, data_nascimento, sexo, grau_treinador, modalidade, cidade)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        
        await client.query(queryInsert, [
            id_utilizador, 
            data_nascimento, 
            sexo, 
            grau_treinador.trim(), 
            modalidade.trim(), 
            localizacao // Injetamos aqui a morada combinada!
        ]);

        await client.query('COMMIT');

        return res.status(200).json({ success: true, redirectTo: '/mngr/treinador/treinador_index' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao salvar dados do Treinador:", err);
        return res.status(500).json({ success: false, message: "Erro de servidor ao criar o perfil de treinador." });
    } finally {
        client.release();
    }
};


// ==========================================
// ----- Index do Treinador (Dashboard) -----
// ==========================================

// ==========================================
// ----- Index do Treinador (Dashboard) -----
// ==========================================

exports.getDashboard = async (req, res) => {
    // 🌟 1. Usar o ID real do Treinador que fez login!
    const treinadorId = req.session.userId;

    try {
        // 🌟 2. Consulta atualizada para cruzar os dados com a tabela equipa_treinador
        const dadosGeraisQuery = await pool.query(
            `SELECT 
                e.id AS id_equipa,
                e.nome AS equipa_nome,
                e.epoca,
                c.nome AS clube_nome,
                c.regiao AS clube_regiao,
                c.pais AS clube_pais,
                c.logo_url AS clube_logo
            FROM equipa_treinador et
            INNER JOIN equipa e ON et.id_equipa = e.id
            INNER JOIN clube c ON e.id_clube = c.id
            WHERE et.id_treinador = $1 AND et.ativo = true
            ORDER BY et.data_entrada DESC LIMIT 1`,
            [treinadorId]
        );

        // Se o Treinador ainda não tem clube (ou não aceitou convite), não quebra a página
        if (dadosGeraisQuery.rows.length === 0) {
            return res.json({
                equipa: { nome: "Sem Equipa", clube: "N/A", regiao: "N/A", pais: "N/A", logo: "https://dummyimage.com/150x150/e2e8f0/627d98.png&text=Sem+Clube" },
                ultimoEvento: null,
                proximoEvento: null
            });
        }

        const dadosPrincipais = dadosGeraisQuery.rows[0];
        const equipaId = dadosPrincipais.id_equipa;

        // Query Último Evento
        const ultimoEventoQuery = await pool.query(
            `SELECT tipo_evento, titulo, data_hora
             FROM evento 
             WHERE id_equipa = $1 AND data_hora < NOW() 
             ORDER BY data_hora DESC LIMIT 1`, 
            [equipaId]
        );

        // Query Próximo Evento
        const proximoEventoQuery = await pool.query(
            `SELECT tipo_evento, titulo, data_hora
             FROM evento 
             WHERE id_equipa = $1 AND data_hora >= NOW() 
             ORDER BY data_hora ASC LIMIT 1`, 
            [equipaId]
        );

        return res.status(200).json({
            equipa: {
                nome: `${dadosPrincipais.clube_nome} - ${dadosPrincipais.equipa_nome} ${dadosPrincipais.epoca}`,
                clube: dadosPrincipais.clube_nome,
                regiao: dadosPrincipais.clube_regiao,
                pais: dadosPrincipais.clube_pais,
                logo: dadosPrincipais.clube_logo
            },
            ultimoEvento: ultimoEventoQuery.rows[0] || null,
            proximoEvento: proximoEventoQuery.rows[0] || null
        });

    } catch (err) {
        console.error("=== [BACKEND ERRO] ===", err.message);
        return res.status(500).json({ error: 'Erro interno ao carregar o dashboard.', detalhe: err.message });
    }
};