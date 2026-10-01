// middlewares/authMiddleware.js
const { pool } = require('../database/connection');

// 1. Redireciona se o utilizador já tiver sessão iniciada (ex: se tentar ir ao Login/Registo)
exports.seJaLogadoRedireciona = async (req, res, next) => {
    try {
        if (req.session && req.session.userId) {
            // Procuramos o tipo de utilizador para saber para onde o mandar
            const resultado = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
            
            if (resultado.rows.length > 0) {
                const tipo = resultado.rows[0].tipo_utilizador?.trim().toUpperCase();
                
                if (tipo === 'TREINADOR') return res.redirect('/mngr/treinador/treinador_index');
                if (tipo === 'ATLETA') return res.redirect('/mngr/atleta/inicio');
                if (tipo === 'GESTOR') return res.redirect('/mngr/gestorClube/inicio');
                if (tipo === 'ADMIN') return res.redirect('/mngr/admin/inicio');
            }
            
            // Se não tiver tipo (conta acabada de criar), vai para os detalhes escolher
            return res.redirect('/mngr/maisdetalhes'); 
        }
        next();
    } catch (err) {
        console.error('Erro no seJaLogadoRedireciona:', err);
        next();
    }
};

// 2. Proteção Geral: Garante que a conta está logada E que ainda existe na Base de Dados
exports.protegerRota = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            if (req.headers['x-solicitado-por'] === 'SPA') {
                return res.status(401).json({ error: 'Sessão expirada. Por favor, faça login.' });
            }
            return res.redirect('/mngr/login');
        }

        const verificarContaExiste = await pool.query('SELECT id FROM utilizador WHERE id = $1', [req.session.userId]);
        
        if (verificarContaExiste.rows.length === 0) {
            console.log(`[Sessão Bloqueada] O utilizador com ID ${req.session.userId} tentou navegar mas a conta já não existe na BD.`);
            return req.session.destroy((err) => {
                res.clearCookie('connect.sid');
                if (req.headers['x-solicitado-por'] === 'SPA') {
                    return res.status(401).json({ error: 'A sua conta já não se encontra ativa no sistema.' });
                }
                return res.redirect('/');
            });
        }
        next();
    } catch (err) {
        console.error('Erro crítico no middleware protegerRota:', err);
        return res.status(500).send('Erro interno do servidor.');
    }
};

// 2.A Middleware Inteligente: Verifica se já tem o perfil 100% completo
exports.verificarSeJaTemPerfil = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');

        const resultado = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
        const tipo = resultado.rows[0]?.tipo_utilizador?.trim().toUpperCase();

        if (!tipo) return next(); // Se ainda não tem tipo (conta nova), fica na página para escolher!

        // 🌟 VERIFICAÇÃO INTELIGENTE DE DADOS
        if (tipo === 'TREINADOR') {
            const check = await pool.query('SELECT grau_treinador FROM treinadores WHERE id_utilizador = $1', [req.session.userId]);
            if (check.rows.length > 0 && check.rows[0].grau_treinador) {
                return res.redirect('/mngr/treinador/treinador_index'); // 100% completo, pode ir!
            }
        } 
        else if (tipo === 'ATLETA') {
            const check = await pool.query('SELECT altura, peso FROM atletas WHERE id_utilizador = $1', [req.session.userId]);
            if (check.rows.length > 0 && check.rows[0].altura && check.rows[0].peso) {
                return res.redirect('/mngr/atleta/inicio'); // 100% completo, pode ir!
            }
        } 
        else if (tipo === 'GESTOR') {
            const check = await pool.query('SELECT data_inicio_carreira FROM gestoresclube WHERE id_utilizador = $1', [req.session.userId]);
            if (check.rows.length > 0 && check.rows[0].data_inicio_carreira) {
                return res.redirect('/mngr/gestorClube/inicio'); // 100% completo, pode ir!
            }
        }
        else if (tipo === 'ADMIN') {
            return res.redirect('/mngr/admin/inicio');
        }

        // Se a pessoa tem um "tipo" mas falta preencher a altura/peso/carreira, o Next() deixa a pessoa ver o formulário!
        next();
    } catch (err) {
        console.error('Erro no verificarSeJaTemPerfil:', err);
        next();
    }
};

// 3. 🛡️ VERIFICAÇÃO EXCLUSIVA PARA TREINADORES (Agora com barreira de Dados)
exports.verificarTreinador = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');

        const resultado = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
        const tipo = resultado.rows[0]?.tipo_utilizador?.trim().toUpperCase();

        if (tipo !== 'TREINADOR') {
            if (req.headers['x-solicitado-por'] === 'SPA') return res.status(403).json({ error: 'Acesso negado.' });
            return res.redirect('/mngr/login');
        }

        // 🌟 BARREIRA: Verifica se o Treinador já preencheu a sua ficha
        const fichaQuery = await pool.query('SELECT grau_treinador FROM treinadores WHERE id_utilizador = $1', [req.session.userId]);
        if (fichaQuery.rows.length === 0 || !fichaQuery.rows[0].grau_treinador) {
            if (req.headers['x-solicitado-por'] === 'SPA') return res.status(403).json({ redirect: '/mngr/maisdetalhes' });
            return res.redirect('/mngr/maisdetalhes');
        }

        next(); 
    } catch (err) {
        console.error('Erro no middleware de verificação do Treinador:', err);
        return res.status(500).send('Erro interno do servidor.');
    }
};

// 4. 🛡️ VERIFICAÇÃO EXCLUSIVA PARA ADMINS
exports.verificarAdmin = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');

        const resultado = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
        const tipo = resultado.rows[0]?.tipo_utilizador?.trim().toUpperCase();

        if (tipo === 'ADMIN') {
            return next(); 
        }

        if (req.headers['x-solicitado-por'] === 'SPA') {
            return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
        }
        return res.redirect('/mngr/maisdetalhes');
    } catch (err) {
        console.error('Erro no middleware de verificação do Administrador:', err);
        return res.status(500).send('Erro interno do servidor.');
    }
};

// 5. 🛡️ VERIFICAÇÃO EXCLUSIVA PARA ATLETAS (Agora com barreira de Peso e Altura)
exports.verificarAtleta = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');

        const resultado = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
        const tipo = resultado.rows[0]?.tipo_utilizador?.trim().toUpperCase();

        if (tipo !== 'ATLETA') {
            if (req.headers['x-solicitado-por'] === 'SPA') return res.status(403).json({ error: 'Acesso negado.' });
            return res.redirect('/mngr/login');
        }

        // 🌟 BARREIRA: Verifica se o Atleta já preencheu a altura e peso
        const fichaQuery = await pool.query('SELECT altura, peso FROM atletas WHERE id_utilizador = $1', [req.session.userId]);
        if (fichaQuery.rows.length === 0 || !fichaQuery.rows[0].altura || !fichaQuery.rows[0].peso) {
            if (req.headers['x-solicitado-por'] === 'SPA') return res.status(403).json({ redirect: '/mngr/maisdetalhes' });
            return res.redirect('/mngr/maisdetalhes');
        }

        next(); 
    } catch (err) {
        console.error('Erro no middleware de verificação do Atleta:', err);
        return res.status(500).send('Erro interno do servidor.');
    }
};

// 6. 🛡️ VERIFICAÇÃO EXCLUSIVA PARA GESTORES (Agora com barreira de Dados)
exports.verificarGestor = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');

        const resultado = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
        const tipo = resultado.rows[0]?.tipo_utilizador?.trim().toUpperCase();

        if (tipo !== 'GESTOR') {
            if (req.headers['x-solicitado-por'] === 'SPA') return res.status(403).json({ error: 'Acesso negado.' });
            return res.redirect('/mngr/login');
        }

        // 🌟 BARREIRA: Verifica se o Gestor já preencheu a sua ficha
        const fichaQuery = await pool.query('SELECT data_inicio_carreira FROM gestoresclube WHERE id_utilizador = $1', [req.session.userId]);
        if (fichaQuery.rows.length === 0 || !fichaQuery.rows[0].data_inicio_carreira) {
            if (req.headers['x-solicitado-por'] === 'SPA') return res.status(403).json({ redirect: '/mngr/maisdetalhes' });
            return res.redirect('/mngr/maisdetalhes');
        }

        next(); 
    } catch (err) {
        console.error('Erro no middleware de verificação do Gestor:', err);
        return res.status(500).send('Erro interno do servidor.');
    }
};

// 7.A 🛡️ PERMITE ACESSO A GESTOR OU TREINADOR (endpoints de leitura partilhados)
exports.verificarGestorOuTreinador = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');
        const resultado = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
        const tipo = resultado.rows[0]?.tipo_utilizador?.trim().toUpperCase();
        if (tipo !== 'GESTOR' && tipo !== 'TREINADOR') {
            if (req.headers['x-solicitado-por'] === 'SPA') return res.status(403).json({ error: 'Acesso negado.' });
            return res.redirect('/mngr/login');
        }
        next();
    } catch (err) {
        return res.status(500).send('Erro interno do servidor.');
    }
};

// 7. 🛡️ BLOQUEIA GESTOR DE CRIAR MAIS DO QUE UM CLUBE
exports.bloquearCriarClubeSeJaTiver = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');

        const clubeCheck = await pool.query('SELECT id FROM clube WHERE id_gestor = $1 LIMIT 1', [req.session.userId]);
        
        if (clubeCheck.rows.length > 0) {
            if (req.headers['x-solicitado-por'] === 'SPA') {
                return res.status(403).json({ error: 'Acesso negado. Já possui um clube criado.' });
            }
            return res.redirect('/mngr/gestorClube/inicio');
        }
        
        next();
    } catch (err) {
        console.error('Erro no middleware bloquearCriarClubeSeJaTiver:', err);
        return res.status(500).send('Erro interno do servidor.');
    }
};