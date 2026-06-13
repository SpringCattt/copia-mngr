// controllers/AtletaController.js
const path = require('path');
const { pool } = require('../database/connection'); // 🌟 IMPORTANTE: Importar a ligação à BD!

// --- LÓGICA DE VISTAS (SPA) ---
const enviarConteudoOuMoldura = (req, res, ficheiroMetodo) => {
    if (req.headers['x-solicitado-por'] === 'SPA') {
        return res.sendFile(ficheiroMetodo);
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'dashboard.html'));
};

exports.getAtletaIndex = (req, res) => {
    enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'atleta', 'atleta_index.html'));
};

// --- AÇÕES DE BASE DE DADOS (POST) ---
exports.guardarDetalhesAtleta = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const id_utilizador = req.session.userId;
        const { nome_completo, data_nascimento, sexo, altura, peso, cidade, modalidade } = req.body;

        if (!nome_completo || !data_nascimento || !sexo || !altura || !peso || !cidade || !modalidade) {
            return res.status(400).json({ success: false, message: "Todos os campos da ficha de atleta são de preenchimento obrigatório." });
        }

        await client.query('BEGIN');

        // 🌟 1. Atualiza o tipo_utilizador e o NOVO campo nome_completo na tabela central
        await client.query(
            "UPDATE utilizador SET tipo_utilizador = 'ATLETA', nome_completo = $1 WHERE id = $2",
            [nome_completo.trim(), id_utilizador]
        );

        // 🌟 2. Insere os dados físicos na tabela específica de Atletas
        const queryInsert = `
            INSERT INTO public.atletas (id_utilizador, data_nascimento, sexo, altura, peso, cidade, modalidade)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        await client.query(queryInsert, [
            id_utilizador, 
            data_nascimento, 
            sexo, 
            parseFloat(altura), 
            parseFloat(peso),   
            cidade.trim(), 
            modalidade.trim()
        ]);

        await client.query('COMMIT');

        // 3. Redirecionar para o Dashboard do Atleta!
        return res.status(200).json({ success: true, redirectTo: '/mngr/atleta/inicio' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao salvar dados do Atleta:", err);
        return res.status(500).json({ success: false, message: "Erro de servidor ao criar o perfil de atleta." });
    } finally {
        client.release();
    }
};

exports.getDashboardDados = async (req, res) => {
    try {
        const idAtleta = req.session.userId; 

        // 1. DADOS DO PERFIL E EQUIPA
        const queryPerfil = `
            SELECT 
                u.nome as nome_curto, u.nome_completo,
                a.data_nascimento, a.altura, a.peso, a.modalidade, a.cidade,
                e.id as id_equipa, e.nome as nome_equipa
            FROM utilizador u
            LEFT JOIN atletas a ON u.id = a.id_utilizador
            LEFT JOIN equipa_atleta ea ON u.id = ea.id_atleta AND ea.ativo = true
            LEFT JOIN equipa e ON ea.id_equipa = e.id
            WHERE u.id = $1 LIMIT 1
        `;
        const resultPerfil = await pool.query(queryPerfil, [idAtleta]);
        if (resultPerfil.rows.length === 0) return res.json({ success: false, message: "Atleta não encontrado" });
        
        const perfil = resultPerfil.rows[0];
        const idEquipa = perfil.id_equipa;

        // Calcular idade
        let idade = null;
        if (perfil.data_nascimento) {
            const diff = Date.now() - new Date(perfil.data_nascimento).getTime();
            idade = Math.abs(new Date(diff).getUTCFullYear() - 1970);
        }

        let agenda = { proximo: null, ultimo: null };
        let stats = { jogos: 0, minutos: 0, golos: 0, assistencias: 0 };

        if (idEquipa) {
            // 2. PRÓXIMO COMPROMISSO (O primeiro evento no futuro)
            const queryProximo = `SELECT tipo_evento, titulo, data_hora, local FROM evento WHERE id_equipa = $1 AND data_hora > NOW() ORDER BY data_hora ASC LIMIT 1`;
            const resultProximo = await pool.query(queryProximo, [idEquipa]);
            if (resultProximo.rows.length > 0) agenda.proximo = resultProximo.rows[0];

            // 3. ÚLTIMO JOGO COM ESTATÍSTICAS
            const queryUltimo = `
                SELECT e.tipo_evento, e.titulo, e.data_hora, ej.golos, ej.assistencias, ej.minutos_jogados 
                FROM evento e 
                LEFT JOIN estatistica_jogo ej ON e.id = ej.id_evento AND ej.id_atleta = $2
                WHERE e.id_equipa = $1 AND e.data_hora <= NOW() AND e.tipo_evento = 'jogo'
                ORDER BY e.data_hora DESC LIMIT 1
            `;
            const resultUltimo = await pool.query(queryUltimo, [idEquipa, idAtleta]);
            if (resultUltimo.rows.length > 0) agenda.ultimo = resultUltimo.rows[0];

            // 4. RESUMO DA ÉPOCA (Soma de tudo)
            const queryStats = `
                SELECT COUNT(id_evento) as jogos, COALESCE(SUM(minutos_jogados), 0) as minutos, COALESCE(SUM(golos), 0) as golos, COALESCE(SUM(assistencias), 0) as assistencias 
                FROM estatistica_jogo WHERE id_atleta = $1
            `;
            const resultStats = await pool.query(queryStats, [idAtleta]);
            stats = resultStats.rows[0];
        }

        res.json({ success: true, perfil, idade, agenda, stats });
    } catch (error) {
        console.error("Erro no Dashboard do Atleta:", error);
        res.status(500).json({ success: false });
    }
};

exports.getAtletaDetalhes = async (req, res) => {
    try {
        // A MÁGICA ESTÁ AQUI: Vamos buscar o ID que vem na URL!
        const idAtleta = req.params.id; 

        // 1. DADOS DO PERFIL E EQUIPA
        const queryPerfil = `
            SELECT 
                u.nome as nome_curto, u.nome_completo,
                a.data_nascimento, a.altura, a.peso, a.modalidade, a.cidade,
                e.id as id_equipa, e.nome as nome_equipa
            FROM utilizador u
            LEFT JOIN atletas a ON u.id = a.id_utilizador
            LEFT JOIN equipa_atleta ea ON u.id = ea.id_atleta AND ea.ativo = true
            LEFT JOIN equipa e ON ea.id_equipa = e.id
            WHERE u.id = $1 LIMIT 1
        `;
        const resultPerfil = await pool.query(queryPerfil, [idAtleta]);
        
        if (resultPerfil.rows.length === 0) {
            return res.json({ success: false, message: "Atleta não encontrado" });
        }
        
        const perfil = resultPerfil.rows[0];
        const idEquipa = perfil.id_equipa;

        // Calcular idade
        let idade = null;
        if (perfil.data_nascimento) {
            const diff = Date.now() - new Date(perfil.data_nascimento).getTime();
            idade = Math.abs(new Date(diff).getUTCFullYear() - 1970);
        }

        let agenda = { proximo: null, ultimo: null };
        let stats = { jogos: 0, minutos: 0, golos: 0, assistencias: 0 };

        if (idEquipa) {
            // Próximo Compromisso
            const queryProximo = `SELECT tipo_evento, titulo, data_hora, local FROM evento WHERE id_equipa = $1 AND data_hora > NOW() ORDER BY data_hora ASC LIMIT 1`;
            const resultProximo = await pool.query(queryProximo, [idEquipa]);
            if (resultProximo.rows.length > 0) agenda.proximo = resultProximo.rows[0];

            // Último Jogo
            const queryUltimo = `
                SELECT e.tipo_evento, e.titulo, e.data_hora, ej.golos, ej.assistencias, ej.minutos_jogados 
                FROM evento e 
                LEFT JOIN estatistica_jogo ej ON e.id = ej.id_evento AND ej.id_atleta = $2
                WHERE e.id_equipa = $1 AND e.data_hora <= NOW() AND e.tipo_evento = 'jogo'
                ORDER BY e.data_hora DESC LIMIT 1
            `;
            const resultUltimo = await pool.query(queryUltimo, [idEquipa, idAtleta]);
            if (resultUltimo.rows.length > 0) agenda.ultimo = resultUltimo.rows[0];

            // Stats Totais
            const queryStats = `
                SELECT COUNT(id_evento) as jogos, COALESCE(SUM(minutos_jogados), 0) as minutos, COALESCE(SUM(golos), 0) as golos, COALESCE(SUM(assistencias), 0) as assistencias 
                FROM estatistica_jogo WHERE id_atleta = $1
            `;
            const resultStats = await pool.query(queryStats, [idAtleta]);
            stats = resultStats.rows[0];
        }

        res.json({ success: true, perfil, idade, agenda, stats });
    } catch (error) {
        console.error("Erro nos Detalhes do Atleta:", error);
        res.status(500).json({ success: false });
    }
};

exports.getPaginaDetalhes = (req, res) => {
    // A usar a tua função fantástica enviarConteudoOuMoldura para o SPA!
    enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'atleta', 'atleta_detalhes.html'));
};
