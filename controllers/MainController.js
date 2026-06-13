const path = require('path');
const { pool } = require('../database/connection');
const crypto = require('crypto');

async function determinarRotaPorPerfil(tipoUtilizador, userId) {
    if (!tipoUtilizador) return '/mngr/maisdetalhes';
    const tipo = tipoUtilizador.trim().toLowerCase();
    if (tipo === 'treinador') return '/mngr/treinador/treinador_index';
    if (tipo === 'atleta') return '/mngr/atleta/inicio';
    if (tipo === 'gestor') {
        try {
            const clubeCheck = await pool.query('SELECT id FROM clube WHERE id_gestor = $1 LIMIT 1', [userId]);
            if (clubeCheck.rows.length > 0) return '/mngr/gestorClube/equipas'; 
            else return '/mngr/gestorClube/criarClube'; 
        } catch (err) { return '/mngr/gestorClube/criarClube'; }
    }
    return '/mngr/maisdetalhes';
}

const enviarConteudoOuMoldura = (req, res, ficheiroMetodo) => {
    if (req.headers['x-solicitado-por'] === 'SPA') return res.sendFile(ficheiroMetodo);
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'dashboard.html'));
};

exports.getDadosSessao = async (req, res) => {
    try {
        if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autenticado' });
        const resultado = await pool.query('SELECT id, nome, tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
        if (resultado.rows.length === 0) return res.status(404).json({ error: 'Utilizador não encontrado' });
        return res.json(resultado.rows[0]);
    } catch (err) { return res.status(500).json({ error: 'Erro interno' }); }
};

exports.logoutUtilizador = (req, res) => {
    req.session.destroy((err) => {
        res.clearCookie('connect.sid'); 
        return res.redirect('/mngr/login');
    });
};

exports.getHome = (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'principal_page', 'index.html'));
exports.getRegister = (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'register.html'));
exports.getLogin = (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'login.html'));
exports.getMaisDetalhes = (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'maisdetalhes.html'));
exports.getNavbar = (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'navbar.html'));
exports.getSidebarTreinador = (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'sidebar.html'));
exports.getMensagens = (req, res) => enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'components', 'mensagens.html'));

exports.registarUtilizador = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ code: 'EMPTY_BODY', message: 'Dados em falta.' });
        const { nome, email, password } = req.body;
        
        const verificarEmail = await pool.query('SELECT id FROM utilizador WHERE email = $1', [email.trim()]);
        if (verificarEmail.rows.length > 0) return res.status(400).json({ code: 'ERR_EMAIL_DUPLICADO', message: 'Email registado.' });

        const querySQL = `INSERT INTO utilizador (nome, email, password, criado_em, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id, tipo_utilizador;`;
        const resultado = await pool.query(querySQL, [nome.trim(), email.trim(), password, new Date(), null]);
        
        req.session.userId = resultado.rows[0].id;
        const rotaDestino = await determinarRotaPorPerfil(resultado.rows[0].tipo_utilizador, req.session.userId);
        return res.status(201).json({ success: true, redirectTo: rotaDestino });
    } catch (err) { return res.status(500).json({ code: 'ERR_SERVER', message: 'Erro interno.' }); }
};

exports.registarUtilizadorSocial = async (req, res) => {
    try {
        const { nome, email, redeSocial } = req.body;
        const verificarUtilizador = await pool.query('SELECT id, tipo_utilizador FROM utilizador WHERE email = $1;', [email.trim()]);
        
        if (verificarUtilizador.rows.length > 0) {
            req.session.userId = verificarUtilizador.rows[0].id;
            const rotaDestino = await determinarRotaPorPerfil(verificarUtilizador.rows[0].tipo_utilizador, req.session.userId);
            return res.status(200).json({ success: true, redirectTo: rotaDestino });
        }

        const senhaInquebravel = 'SocialAuth!' + crypto.randomBytes(8).toString('hex') + 'A9';
        const queryInserir = `INSERT INTO utilizador (nome, email, password, criado_em, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id, tipo_utilizador;`;
        const resultado = await pool.query(queryInserir, [nome.trim(), email.trim(), senhaInquebravel, new Date(), null]);
        
        req.session.userId = resultado.rows[0].id;
        const rotaDestino = await determinarRotaPorPerfil(resultado.rows[0].tipo_utilizador, req.session.userId);
        return res.status(201).json({ success: true, redirectTo: rotaDestino });
    } catch (err) { return res.status(500).json({ code: 'ERR_SERVER', message: 'Erro interno.' }); }
};

exports.autenticarUtilizador = async (req, res) => {
    try {
        const { username, password } = req.body;
        const querySQL = 'SELECT id, password, tipo_utilizador FROM utilizador WHERE nome = $1 OR email = $2';
        const resultado = await pool.query(querySQL, [username.trim(), username.trim()]);

        if (resultado.rows.length === 0 || password !== resultado.rows[0].password) {
            return res.status(401).json({ success: false, message: 'Dados incorretos.' });
        }

        req.session.userId = resultado.rows[0].id;
        const rotaDestino = await determinarRotaPorPerfil(resultado.rows[0].tipo_utilizador, req.session.userId);
        return res.status(200).json({ success: true, redirectTo: rotaDestino });
    } catch (err) { return res.status(500).json({ success: false, message: 'Erro interno.' }); }
};

exports.getDadosLayout = async (req, res) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ success: false, message: 'Não autenticado' });
    const userId = req.session.userId;
    const client = await pool.connect();
    try {
        const userQuery = await client.query('SELECT nome, tipo_utilizador FROM utilizador WHERE id = $1 LIMIT 1', [userId]);
        if (userQuery.rows.length === 0) { client.release(); return res.status(404).json({ success: false, message: 'Utilizador não encontrado' }); }

        const utilizador = userQuery.rows[0];
        const tipoPerfil = utilizador.tipo_utilizador ? utilizador.tipo_utilizador.trim().toLowerCase() : '';
        let nomeClube = "Sem Clube";

        if (tipoPerfil === 'gestor') {
            const clubeQuery = await client.query('SELECT nome FROM clube WHERE id_gestor = $1 LIMIT 1', [userId]);
            if (clubeQuery.rows.length > 0) nomeClube = clubeQuery.rows[0].nome;
        } 
        else if (tipoPerfil === 'treinador') {
            // 🌟 ATUALIZADO: Agora procura o treinador usando a ponte equipa_treinador
            const clubeQuery = await client.query(`
                SELECT c.nome 
                FROM clube c 
                JOIN equipa e ON e.id_clube = c.id 
                JOIN equipa_treinador et ON et.id_equipa = e.id 
                WHERE et.id_treinador = $1 AND et.ativo = true LIMIT 1`, 
                [userId]
            );
            if (clubeQuery.rows.length > 0) nomeClube = clubeQuery.rows[0].nome;
        }
        else if (tipoPerfil === 'atleta') {
            const clubeQuery = await client.query(`SELECT c.nome FROM clube c JOIN equipa e ON e.id_clube = c.id JOIN equipa_atleta ea ON ea.id_equipa = e.id WHERE ea.id_atleta = $1 LIMIT 1`, [userId]);
            if (clubeQuery.rows.length > 0) nomeClube = clubeQuery.rows[0].nome;
        }

        client.release();
        return res.json({ success: true, nomeUtilizador: utilizador.nome, tipoUtilizador: tipoPerfil, nomeClube: nomeClube });
    } catch (err) { client.release(); return res.status(500).json({ success: false, message: 'Erro interno' }); }
};

// =========================================================================
// 🔔 API DE NOTIFICAÇÕES / CONVITES 
// =========================================================================

exports.getConvitesPendentes = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.session.userId;
        
        // ILIKE 'pendente' garante que ignora maiúsculas/minúsculas no ENUM
        const query = `
            SELECT c.id AS id_convite, e.nome AS equipa_nome, cl.nome AS clube_nome
            FROM public.convite c
            JOIN public.equipa e ON c.id_equipa = e.id
            JOIN public.clube cl ON e.id_clube = cl.id
            WHERE (c.id_atleta = $1 OR c.id_treinador = $1) AND c.estado::text ILIKE 'pendente'
            ORDER BY c.id DESC;
        `;
        const result = await client.query(query, [userId]);
        
        return res.status(200).json({ success: true, convites: result.rows });
    } catch (err) {
        console.error("Erro ao buscar convites pendentes:", err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar notificações.' });
    } finally {
        client.release();
    }
};

exports.responderConvite = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.session.userId;
        const { id_convite, resposta } = req.body; 

        await client.query('BEGIN');

        // 1. Vai buscar os detalhes do convite
        const conviteRes = await client.query(
            `SELECT * FROM public.convite WHERE id = $1 AND (id_atleta = $2 OR id_treinador = $2) AND estado::text ILIKE 'pendente'`, 
            [id_convite, userId]
        );

        if (conviteRes.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ success: false, message: 'Convite não encontrado ou já processado.' });
        }

        const convite = conviteRes.rows[0];
        
        // 🔥 Agora usamos as palavras exatas que existem na vossa Base de Dados!
        const novoEstado = resposta === 'Aceitar' ? 'concluido' : 'cancelado';

        // 2. Atualiza a tabela convite
        await client.query('UPDATE public.convite SET estado = $1 WHERE id = $2', [novoEstado, id_convite]);

        // 3. SE ACEITOU: Insere a pessoa de forma oficial na equipa (SEM A POSIÇÃO)
        if (resposta === 'Aceitar') {
            if (convite.id_atleta) {
                await client.query(
                    `INSERT INTO public.equipa_atleta (id_equipa, id_atleta, data_entrada, ativo) 
                     VALUES ($1, $2, NOW(), true)`, 
                    [convite.id_equipa, convite.id_atleta]
                );
            } else if (convite.id_treinador) {
                await client.query(
                    `INSERT INTO public.equipa_treinador (id_equipa, id_treinador, data_entrada, ativo) 
                     VALUES ($1, $2, NOW(), true)`, 
                    [convite.id_equipa, convite.id_treinador]
                );
            }
        }

        await client.query('COMMIT');
        return res.status(200).json({ success: true, message: `Convite ${novoEstado} com sucesso.` });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao responder ao convite:", err);
        return res.status(500).json({ success: false, message: 'Erro interno ao processar a resposta.' });
    } finally {
        client.release();
    }
};

exports.getDesportos = async (req, res) => {
    try {
        const resultado = await pool.query('SELECT id, nome FROM desporto ORDER BY nome ASC');
        return res.json({ success: true, desportos: resultado.rows });
    } catch (err) {
        console.error('Erro ao obter desportos:', err);
        return res.status(500).json({ success: false, message: 'Erro ao carregar modalidades.' });
    }
};



