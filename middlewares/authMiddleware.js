// middlewares/authMiddleware.js
const { pool } = require('../database/connection');

// 1. Redireciona se o utilizador já tiver sessão iniciada (ex: se tentar ir ao Login/Registo)
exports.seJaLogadoRedireciona = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/mngr/maisdetalhes'); 
    }
    next();
};

// 2. Proteção Geral: Garante que a conta está logada E que ainda existe na Base de Dados
exports.protegerRota = async (req, res, next) => {
    try {
        // Passo 1: Verifica se o cookie/sessão existe no Express
        if (!req.session || !req.session.userId) {
            if (req.headers['x-solicitado-por'] === 'SPA') {
                return res.status(401).json({ error: 'Sessão expirada. Por favor, faça login.' });
            }
            return res.redirect('/mngr/login');
        }

        // 🌟 NOVA VALIDAÇÃO EM TEMPO REAL: Verifica se a conta foi apagada da BD
        const verificarContaExiste = await pool.query('SELECT id FROM utilizador WHERE id = $1', [req.session.userId]);
        
        if (verificarContaExiste.rows.length === 0) {
            console.log(`[Sessão Bloqueada] O utilizador com ID ${req.session.userId} tentou navegar mas a conta já não existe na BD.`);
            
            // Destrói a sessão local para limpar o cookie inválido do navegador
            return req.session.destroy((err) => {
                res.clearCookie('connect.sid');
                
                // Se for uma requisição AJAX/SPA, avisa o frontend
                if (req.headers['x-solicitado-por'] === 'SPA') {
                    return res.status(401).json({ error: 'A sua conta já não se encontra ativa no sistema.' });
                }
                // Se for uma troca de página normal no browser, manda para a página inicial (/)
                return res.redirect('/');
            });
        }

        // Se passou em tudo, o utilizador é válido e a conta existe!
        next();

    } catch (err) {
        console.error('Erro crítico no middleware protegerRota:', err);
        return res.status(500).send('Erro interno do servidor.');
    }
};

// 2.A NOVO MIDDLEWARE: Bloqueia acesso ao 'maisdetalhes' se o utilizador já possuir perfil configurado
exports.verificarSeJaTemPerfil = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');

        const resultado = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
        const tipo = resultado.rows[0]?.tipo_utilizador;

        if (tipo) {
            // Se já tem perfil definido, não faz sentido estar no 'maisdetalhes', redireciona para a rota correta
            if (tipo.trim().toUpperCase() === 'TREINADOR') return res.redirect('/mngr/treinador/treinador_index');
            if (tipo.trim().toUpperCase() === 'ATLETA') return res.redirect('/mngr/atleta/inicio');
            if (tipo.trim().toUpperCase() === 'GESTOR') return res.redirect('/mngr/gestorClube/equipas');
        }
        next();
    } catch (err) {
        console.error('Erro no verificarSeJaTemPerfil:', err);
        next();
    }
};

// 3. 🛡️ VERIFICAÇÃO EXCLUSIVA PARA TREINADORES
exports.verificarTreinador = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');

        const resultado = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
        const tipo = resultado.rows[0]?.tipo_utilizador?.trim().toUpperCase();

        if (tipo === 'TREINADOR') {
            return next(); 
        }

        if (req.headers['x-solicitado-por'] === 'SPA') {
            return res.status(403).json({ error: 'Acesso negado. Apenas treinadores.' });
        }
        return res.redirect('/mngr/maisdetalhes');
    } catch (err) {
        console.error('Erro no middleware de verificação do Treinador:', err);
        return res.status(500).send('Erro interno do servidor.');
    }
};

// 4. 🛡️ VERIFICAÇÃO EXCLUSIVA PARA ATLETAS
exports.verificarAtleta = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');

        const resultado = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
        const tipo = resultado.rows[0]?.tipo_utilizador?.trim().toUpperCase();

        if (tipo === 'ATLETA') {
            return next(); 
        }

        if (req.headers['x-solicitado-por'] === 'SPA') {
            return res.status(403).json({ error: 'Acesso negado. Apenas atletas.' });
        }
        return res.redirect('/mngr/maisdetalhes');
    } catch (err) {
        console.error('Erro no middleware de verificação do Atleta:', err);
        return res.status(500).send('Erro interno do servidor.');
    }
};

// 5. 🛡️ VERIFICAÇÃO EXCLUSIVA PARA GESTORES
exports.verificarGestor = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');

        const resultado = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [req.session.userId]);
        const tipo = resultado.rows[0]?.tipo_utilizador?.trim().toUpperCase();

        if (tipo === 'GESTOR') {
            return next(); 
        }

        if (req.headers['x-solicitado-por'] === 'SPA') {
            return res.status(403).json({ error: 'Acesso negado. Apenas gestores.' });
        }
        return res.redirect('/mngr/maisdetalhes');
    } catch (err) {
        console.error('Erro no middleware de verificação do Gestor:', err);
        return res.status(500).send('Erro interno do servidor.');
    }
};

// 6. 🛡️ BLOQUEIA GESTOR DE CRIAR MAIS DO QUE UM CLUBE
exports.bloquearCriarClubeSeJaTiver = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) return res.redirect('/mngr/login');

        const clubeCheck = await pool.query('SELECT id FROM clube WHERE id_gestor = $1 LIMIT 1', [req.session.userId]);
        
        if (clubeCheck.rows.length > 0) {
            if (req.headers['x-solicitado-por'] === 'SPA') {
                return res.status(403).json({ error: 'Acesso negado. Já possui um clube criado.' });
            }
            return res.redirect('/mngr/gestorClube/equipas');
        }
        
        next();
    } catch (err) {
        console.error('Erro no middleware bloquearCriarClubeSeJaTiver:', err);
        return res.status(500).send('Erro interno do servidor.');
    }
};