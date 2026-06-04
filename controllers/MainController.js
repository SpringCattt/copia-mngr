// controllers/MainController.js
const path = require('path');
const { pool } = require('../database/connection');
const Utilizador = require('../classes/utilizador'); 
const crypto = require('crypto'); // Módulo nativo para gerar senhas automáticas fortes

// --- RENDERIZAÇÃO DE PÁGINAS (GET) ---
exports.getHome = (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'principal_page', 'index.html'));
exports.getRegister = (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'register.html'));
exports.getLogin = (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'login.html'));
exports.getMaisDetalhes = (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'maisdetalhes.html'));

// --- PROCESSAMENTO DE REGISTO MANUAL (POST) ---
exports.registarUtilizador = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ code: 'EMPTY_BODY', message: 'Dados não recebidos pelo servidor.' });
        }

        const { nome, email, password } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({ code: 'ERR_NOME_VAZIO', field: 'nome', message: 'O nome completo é obrigatório.' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ code: 'ERR_EMAIL_VAZIO', field: 'email', message: 'O email é obrigatório.' });
        }
        if (!password) {
            return res.status(400).json({ code: 'ERR_PASSWORD_VAZIO', field: 'password', message: 'A palavra-passe é obrigatória.' });
        }

        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;
        if (!regexPassword.test(password)) {
            return res.status(400).json({ 
                code: 'ERR_PASSWORD_FRACA', 
                field: 'password', 
                message: 'A palavra-passe deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas e um número ou caractere especial.' 
            });
        }

        const verificarEmail = await pool.query('SELECT id FROM utilizador WHERE email = $1', [email.trim()]);
        if (verificarEmail.rows.length > 0) {
            return res.status(400).json({ code: 'ERR_EMAIL_DUPLICADO', field: 'email', message: 'Este endereço de email já está registado.' });
        }

        const verificarNome = await pool.query('SELECT id FROM utilizador WHERE nome = $1', [nome.trim()]);
        if (verificarNome.rows.length > 0) {
            return res.status(400).json({ code: 'ERR_NOME_DUPLICADO', field: 'nome', message: 'Este nome de utilizador já está em uso.' });
        }

        const dataCriacao = new Date();
        const querySQL = `
            INSERT INTO utilizador (nome, email, password, criado_em)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        const valores = [nome.trim(), email.trim(), password, dataCriacao];
        const resultado = await pool.query(querySQL, valores);
        
        const idGerado = resultado.rows[0].id;

        // 🌟 Ativar a sessão do utilizador recém-criado
        req.session.userId = idGerado;

        const novoUtilizador = new Utilizador(
            idGerado,
            nome.trim(),
            email.trim(),
            password,
            null,
            null,
            dataCriacao,
            null
        );

        console.log(`[Sessão Ativa] Utilizador manual criado na BD com ID: ${novoUtilizador.id}`);
        return res.status(201).json({ success: true, redirectTo: '/mngr/maisdetalhes' });

    } catch (err) {
        console.error('❌ Erro na operação de registo manual:', err.message);
        return res.status(500).json({ code: 'ERR_SERVER', message: 'Erro interno do servidor ao criar conta.' });
    }
};

// --- PROCESSAMENTO DE AUTENTICAÇÃO / REGISTO SOCIAL (POST) ---
exports.registarUtilizadorSocial = async (req, res) => {
    try {
        const { nome, email, redeSocial } = req.body;

        if (!email || !nome) {
            return res.status(400).json({ code: 'ERR_SOCIAL', message: 'Dados da rede social em falta.' });
        }

        // 1. Verificar se o e-mail vindo da rede social já existe na BD
        const verificarUtilizador = await pool.query('SELECT id FROM utilizador WHERE email = $1', [email.trim()]);
        
        if (verificarUtilizador.rows.length > 0) {
            const idExistente = verificarUtilizador.rows[0].id;
            
            // 🌟 Ativar a sessão para quem já tinha conta e fez login social direto
            req.session.userId = idExistente;

            console.log(`[Sessão Ativa] Login via ${redeSocial} efetuado com sucesso para o ID: ${idExistente}`);
            return res.status(200).json({ success: true, redirectTo: '/mngr/maisdetalhes' });
        }

        // 2. Se for novo, gera uma senha forte automatizada
        const senhaInquebravel = 'SocialAuth!' + crypto.randomBytes(8).toString('hex') + 'A9';
        const dataCriacao = new Date();

        const querySQL = `
            INSERT INTO utilizador (nome, email, password, criado_em)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        const valores = [nome.trim(), email.trim(), senhaInquebravel, dataCriacao];
        const resultado = await pool.query(querySQL, valores);
        const idGerado = resultado.rows[0].id;

        // 🌟 Ativar a sessão para a nova conta social criada
        req.session.userId = idGerado;

        const novoUtilizador = new Utilizador(
            idGerado,
            nome.trim(),
            email.trim(),
            senhaInquebravel,
            null,
            true, // Conta verificada por omissão
            dataCriacao,
            null
        );

        console.log(`[Sessão Ativa] Nova conta via ${redeSocial} gravada com ID: ${novoUtilizador.id}`);
        return res.status(201).json({ success: true, redirectTo: '/mngr/maisdetalhes' });

    } catch (err) {
        console.error('❌ Erro no registo social do Controller:', err.message);
        return res.status(500).json({ code: 'ERR_SERVER', message: 'Erro interno ao processar autenticação social.' });
    }
};

// --- PROCESSAMENTO DE LOGIN VIA REDE SOCIAL (POST) ---
exports.loginUtilizadorSocial = async (req, res) => {
    try {
        const { email, redeSocial } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Dados de autenticação em falta.' });
        }

        // 1. Procurar o utilizador na BD pelo e-mail retornado pela rede social
        const verificarUtilizador = await pool.query('SELECT id FROM utilizador WHERE email = $1', [email.trim()]);
        
        if (verificarUtilizador.rows.length > 0) {
            const idExistente = verificarUtilizador.rows[0].id;
            
            // 🌟 Ativar a sessão para quem já possui conta criada
            req.session.userId = idExistente;

            console.log(`[Sessão Social] Login via ${redeSocial} com sucesso para o ID: ${idExistente}`);
            return res.status(200).json({ success: true, redirectTo: '/mngr/maisdetalhes' });
        } else {
            // 🌟 REGRA ATIVADA: Se não tem conta associada, avisa e cancela a entrada!
            return res.status(404).json({ 
                success: false, 
                message: `Não encontrámos nenhuma conta associada ao e-mail do seu ${redeSocial}. Por favor, faça o registo primeiro.` 
            });
        }

    } catch (err) {
        console.error('❌ Erro no login social do Controller:', err.message);
        return res.status(500).json({ success: false, message: 'Erro interno ao validar autenticação social.' });
    }
};

// --- PROCESSAMENTO DE AUTENTICAÇÃO MANUAL (POST) ---
exports.autenticarUtilizador = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ success: false, message: 'Dados não recebidos pelo servidor.' });
        }

        const { username, password } = req.body;

        // Validação de campos vazios
        if (!username || !username.trim()) {
            return res.status(400).json({ success: false, field: 'username', message: 'O utilizador ou email é obrigatório.' });
        }
        if (!password) {
            return res.status(400).json({ success: false, field: 'password', message: 'A palavra-passe é obrigatória.' });
        }

        // Procura na BD pelo nome de utilizador OU pelo e-mail
        const querySQL = 'SELECT id, password FROM utilizador WHERE nome = $1 OR email = $2';
        const resultado = await pool.query(querySQL, [username.trim(), username.trim()]);

        if (resultado.rows.length === 0) {
            return res.status(401).json({ success: false, field: 'username', message: 'Dados incorretos. Verifique as suas credenciais.' });
        }

        const utilizadorBD = resultado.rows[0];

        // Validação da palavra-passe (comparação direta)
        if (password !== utilizadorBD.password) {
            return res.status(401).json({ success: false, field: 'password', message: 'Dados incorretos. Verifique as suas credenciais.' });
        }

        // 🌟 Ativar a sessão do utilizador (Grava o Cookie de segurança no browser)
        req.session.userId = utilizadorBD.id;

        console.log(`[Sessão Ativa] Utilizador efetuou login manual com ID: ${utilizadorBD.id}`);
        
        // Retorna sucesso e a rota protegida para onde o frontend deve redirecionar
        return res.status(200).json({ success: true, redirectTo: '/mngr/maisdetalhes' });

    } catch (err) {
        console.error('Erro na operação de login manual:', err.message);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor ao iniciar sessão.' });
    }
};