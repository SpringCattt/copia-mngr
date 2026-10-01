const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { pool } = require('../database/connection');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const SUPABASE_URL = process.env.SUPABASE_URL; 
const SUPABASE_KEY = process.env.SUPABASE_KEY; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuração do Multer para ler os campos de imagem multipart
const storageMemoria = multer.memoryStorage();
const uploadConfig = multer({
    storage: storageMemoria,
    limits: { fileSize: 3 * 1024 * 1024 }, // Limite de 3MB
    fileFilter: (req, file, cb) => {
        const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (formatosPermitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato inválido. Apenas são aceites imagens JPG, PNG ou WEBP.'));
        }
    }
}).single('avatar'); // Ajustado para 'avatar' que condiz com o teu perfil.js

async function determinarRotaPorPerfil(tipoUtilizador, userId) {
    if (!tipoUtilizador) return '/mngr/maisdetalhes';

    console.log(`[DEBUG] Determinando rota para o utilizador ID ${userId} com tipo: ${tipoUtilizador}`);
    
    const tipo = tipoUtilizador.trim().toLowerCase();
    
    if (tipo === 'treinador') {
        const check = await pool.query('SELECT grau_treinador FROM treinadores WHERE id_utilizador = $1', [userId]);
        if (check.rows.length === 0 || !check.rows[0].grau_treinador) return '/mngr/maisdetalhes';
        
        return '/mngr/treinador/treinador_index';
    }
    
    if (tipo === 'atleta') {
        const check = await pool.query('SELECT altura, peso FROM atletas WHERE id_utilizador = $1', [userId]);
        if (check.rows.length === 0 || !check.rows[0].altura || !check.rows[0].peso) return '/mngr/maisdetalhes';
        
        return '/mngr/atleta/inicio';
    }
    
    if (tipo === 'admin') return '/mngr/admin/inicio';
    
   if (tipo === 'gestor') {
        const check = await pool.query('SELECT data_inicio_carreira FROM gestoresclube WHERE id_utilizador = $1', [userId]);
        if (check.rows.length === 0 || !check.rows[0].data_inicio_carreira) return '/mngr/maisdetalhes';
        
        try {
            const clubeCheck = await pool.query('SELECT id FROM clube WHERE id_gestor = $1 LIMIT 1', [userId]);
            if (clubeCheck.rows.length > 0) return '/mngr/gestorClube/inicio'; // ✅ CORRIGIDO!
            else return '/mngr/gestorClube/criarClube'; 
        } catch (err) { return '/mngr/gestorClube/criarClube'; }
    }
    
    return '/mngr/maisdetalhes';
};

const enviarConteudoOuMoldura = (req, res, ficheiroMetodo) => {
    if (req.headers['x-solicitado-por'] === 'SPA') {
        return res.sendFile(ficheiroMetodo);
    }
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
exports.getPerfil = (req, res) => {
    enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'components', 'perfil.html'));
};

exports.getPerfilDados = async (req, res) => {
    // 🌟 Usar o ID real do utilizador que fez login!
    const utilizadorId = req.session.userId;

    try {
        if (!utilizadorId) {
            return res.status(401).json({ error: 'Não autorizado. Por favor, faça login.' });
        }

        // 🌟 Consulta focada em trazer todas as informações incluindo a url_imagem
        const perfilQuery = await pool.query(
            `SELECT 
                id, 
                nome, 
                email, 
                tipo_utilizador, 
                ativo, 
                criado_em, 
                estado, 
                nome_completo,
                url_imagem 
            FROM public.utilizador 
            WHERE id = $1 
            LIMIT 1`,
            [utilizadorId]
        );

        // Se o utilizador não for encontrado na base de dados
        if (perfilQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }

        const utilizador = perfilQuery.rows[0];

        // 🌟 Devolve o JSON limpo com os dados do utilizador
        return res.status(200).json(utilizador);

    } catch (err) {
        console.error("=== [BACKEND ERRO PERFIL] ===", err.message);
        return res.status(500).json({ 
            error: 'Erro interno ao carregar os dados do perfil.', 
            detalhe: err.message 
        });
    }
};

exports.getDadosPreRegisto = async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false });
    try {
        const userRes = await pool.query('SELECT nome, tipo_utilizador FROM utilizador WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ success: false });
        const { nome, tipo_utilizador } = userRes.rows[0];
        const tipo = tipo_utilizador?.trim().toLowerCase();
        let dadosPerfil = {};
        if (tipo === 'atleta') {
            const r = await pool.query('SELECT data_nascimento, id_genero, id_desporto FROM atletas WHERE id_utilizador = $1', [userId]);
            if (r.rows.length > 0) dadosPerfil = r.rows[0];
        } else if (tipo === 'treinador') {
            const r = await pool.query('SELECT data_nascimento, id_desporto FROM treinadores WHERE id_utilizador = $1', [userId]);
            if (r.rows.length > 0) dadosPerfil = r.rows[0];
            // Se id_desporto não está em treinadores (conta nova), buscar da equipa associada
            if (!dadosPerfil.id_desporto) {
                const eqRes = await pool.query(
                    `SELECT eq.id_tipo_desporto FROM equipa_treinador et
                     JOIN equipa eq ON et.id_equipa = eq.id
                     WHERE et.id_treinador = $1 AND et.ativo = true LIMIT 1`,
                    [userId]
                );
                if (eqRes.rows.length > 0) dadosPerfil.id_desporto = eqRes.rows[0].id_tipo_desporto;
            }
        }
        return res.json({ success: true, nome, tipo_utilizador: tipo, ...dadosPerfil });
    } catch (err) {
        return res.status(500).json({ success: false });
    }
};

exports.alterarAvatarUtilizador = (req, res) => {
    // Executa o middleware do Multer para ler o ficheiro
    uploadConfig(req, res, async (err) => {
        if (err) {
            console.error("====== [MULTER ERRO] ======", err);
            return res.status(400).json({ success: false, message: err.message });
        }

        // Verifica se o ficheiro foi capturado com sucesso
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Nenhuma imagem foi selecionada ou o formato é inválido.' });
        }

        const id_utilizador = req.session.userId;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Gerar um nome único para o ficheiro utilizando o ID do utilizador e hash aleatório
            const extensao = path.extname(req.file.originalname) || '.png';
            const nomeFicheiroSeguro = `avatar-${id_utilizador}-${crypto.randomBytes(6).toString('hex')}${extensao}`;

            // 🌟 CORREÇÃO: Enviamos diretamente o 'nomeFicheiroSeguro' sem o prefixo 'utilizadores/'
            // Isto guarda o ficheiro diretamente na raiz do teu bucket 'logo-clubes'
            const { data, error } = await supabase.storage
                .from('logo-clubes')
                .upload(nomeFicheiroSeguro, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });

            if (error) {
                console.error('====== [SUPABASE ERRO] ======', error);
                await client.query('ROLLBACK');
                return res.status(500).json({ success: false, message: 'Falha ao guardar a imagem no Cloud Storage.' });
            }

            // Capturar a URL pública diretamente da raiz do bucket
            const { data: urlData } = supabase.storage
                .from('logo-clubes')
                .getPublicUrl(nomeFicheiroSeguro);

            const novaUrlImagem = urlData.publicUrl;

            // Fazer o UPDATE na tabela utilizador com o link público definitivo
            const queryUpdateAvatarSQL = `
                UPDATE public.utilizador 
                SET url_imagem = $1 
                WHERE id = $2;
            `;
            await client.query(queryUpdateAvatarSQL, [novaUrlImagem, id_utilizador]);

            await client.query('COMMIT');
            
            console.log(`[Sucesso] Novo avatar guardado na raiz para o utilizador ${id_utilizador}.`);
            
            return res.status(200).json({ 
                success: true, 
                message: 'Foto de perfil atualizada com sucesso.',
                url_imagem: novaUrlImagem 
            });

        } catch (dbErr) {
            await client.query('ROLLBACK');
            console.error('====== [SISTEMA ERRO CRÍTICO] ======', dbErr);
            return res.status(500).json({ success: false, message: 'Erro interno ao atualizar a Base de Dados.' });
        } finally {
            client.release();
        }
    });
};

exports.registarUtilizador = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ code: 'EMPTY_BODY', message: 'Dados em falta.' });
        const { nome, email, password } = req.body;
        
        const verificarEmail = await pool.query('SELECT id FROM utilizador WHERE email = $1', [email.trim()]);
        if (verificarEmail.rows.length > 0) return res.status(400).json({ code: 'ERR_EMAIL_DUPLICADO', message: 'Email registado.' });

        // 🌟 ENCRIPTAÇÃO DA PASSWORD
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const querySQL = `INSERT INTO utilizador (nome, email, password, criado_em, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id, tipo_utilizador;`;
        const resultado = await pool.query(querySQL, [nome.trim(), email.trim(), hashPassword, new Date(), null]);
        
        req.session.userId = resultado.rows[0].id;
        const rotaDestino = await determinarRotaPorPerfil(resultado.rows[0].tipo_utilizador, req.session.userId);
        return res.status(201).json({ success: true, redirectTo: rotaDestino });
    } catch (err) { return res.status(500).json({ code: 'ERR_SERVER', message: 'Erro interno.' }); }
};

exports.registarUtilizadorSocial = async (req, res) => {
    try {
        const { nome, email, redeSocial } = req.body;
        
        const verificarUtilizador = await pool.query('SELECT id, tipo_utilizador, ativo FROM utilizador WHERE email = $1;', [email.trim()]);
        
        if (verificarUtilizador.rows.length > 0) {
            if (verificarUtilizador.rows[0].ativo === false) {
                return res.status(403).json({ success: false, message: 'Esta conta foi desativada ou apagada do sistema.' });
            }

            req.session.userId = verificarUtilizador.rows[0].id;
            const rotaDestino = await determinarRotaPorPerfil(verificarUtilizador.rows[0].tipo_utilizador, req.session.userId);
            return res.status(200).json({ success: true, redirectTo: rotaDestino });
        }

        // 🌟 ENCRIPTAÇÃO DA SENHA ALEATÓRIA DO LOGIN SOCIAL
        const senhaBase = 'SocialAuth!' + crypto.randomBytes(8).toString('hex') + 'A9';
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(senhaBase, salt);

        const queryInserir = `INSERT INTO utilizador (nome, email, password, criado_em, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id, tipo_utilizador;`;
        const resultado = await pool.query(queryInserir, [nome.trim(), email.trim(), hashPassword, new Date(), null]);
        
        req.session.userId = resultado.rows[0].id;
        const rotaDestino = await determinarRotaPorPerfil(resultado.rows[0].tipo_utilizador, req.session.userId);
        return res.status(201).json({ success: true, redirectTo: rotaDestino });
    } catch (err) { return res.status(500).json({ code: 'ERR_SERVER', message: 'Erro interno.' }); }
};

exports.autenticarUtilizador = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const querySQL = 'SELECT id, password, tipo_utilizador, ativo FROM utilizador WHERE nome = $1 OR email = $2';
        const resultado = await pool.query(querySQL, [username.trim(), username.trim()]);

        if (resultado.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Dados incorretos.' });
        }

        const utilizadorBD = resultado.rows[0];

        
        const passwordCorreta = await bcrypt.compare(password, utilizadorBD.password);

        if (!passwordCorreta) {
            return res.status(401).json({ success: false, message: 'Dados incorretos.' });
        }

        if (utilizadorBD.ativo === false) {
            return res.status(403).json({ success: false, message: 'Esta conta foi desativada ou apagada do sistema.' });
        }

        req.session.userId = utilizadorBD.id;
        const rotaDestino = await determinarRotaPorPerfil(utilizadorBD.tipo_utilizador, req.session.userId);
        return res.status(200).json({ success: true, redirectTo: rotaDestino });
    } catch (err) { return res.status(500).json({ success: false, message: 'Erro interno.' }); }
};

exports.getDadosLayout = async (req, res) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ success: false, message: 'Não autenticado' });
    const userId = req.session.userId;
    const client = await pool.connect();
    try {
        // 🌟 ATUALIZADO: Inclui a coluna url_imagem na seleção dos dados do utilizador
        const userQuery = await client.query('SELECT nome, tipo_utilizador, url_imagem FROM utilizador WHERE id = $1 LIMIT 1', [userId]);
        if (userQuery.rows.length === 0) { 
            client.release(); 
            return res.status(404).json({ success: false, message: 'Utilizador não encontrado' }); 
        }

        const utilizador = userQuery.rows[0];
        const tipoPerfil = utilizador.tipo_utilizador ? utilizador.tipo_utilizador.trim().toLowerCase() : '';
        let nomeClube = "Sem Clube";
        let logoClube = null;
        let idEquipa = null;

        if (tipoPerfil === 'gestor') {
            const clubeQuery = await client.query('SELECT nome, logo_url FROM clube WHERE id_gestor = $1 LIMIT 1', [userId]);
            if (clubeQuery.rows.length > 0) {
                nomeClube = clubeQuery.rows[0].nome;
                logoClube = clubeQuery.rows[0].logo_url;
            }
        }
        else if (tipoPerfil === 'treinador') {
            const clubeQuery = await client.query(`
                SELECT c.nome, c.logo_url, e.id AS id_equipa, e.foto_url AS foto_equipa
                FROM clube c
                JOIN equipa e ON e.id_clube = c.id
                JOIN equipa_treinador et ON et.id_equipa = e.id
                WHERE et.id_treinador = $1 AND et.ativo = true LIMIT 1`,
                [userId]
            );
            if (clubeQuery.rows.length > 0) {
                nomeClube = clubeQuery.rows[0].nome;
                logoClube = clubeQuery.rows[0].logo_url;
                idEquipa = clubeQuery.rows[0].id_equipa;
            }
        }
        else if (tipoPerfil === 'atleta') {
            const clubeQuery = await client.query(`SELECT c.nome, c.logo_url FROM clube c JOIN equipa e ON e.id_clube = c.id JOIN equipa_atleta ea ON ea.id_equipa = e.id WHERE ea.id_atleta = $1 AND ea.ativo = true LIMIT 1`, [userId]);
            if (clubeQuery.rows.length > 0) {
                nomeClube = clubeQuery.rows[0].nome;
                logoClube = clubeQuery.rows[0].logo_url;
            }
        }

        client.release();

        return res.json({
            success: true,
            nomeUtilizador: utilizador.nome,
            tipoUtilizador: tipoPerfil,
            nomeClube: nomeClube,
            urlImagem: utilizador.url_imagem,
            logoClube: logoClube,
            idEquipa: idEquipa
        });
    } catch (err) { 
        client.release(); 
        return res.status(500).json({ success: false, message: 'Erro interno' }); 
    }
};

// =========================================================================
// 🔔 API DE NOTIFICAÇÕES / CONVITES
// =========================================================================

exports.getNotificacoes = async (req, res) => {
    try {
        const userId = req.session.userId;
        const result = await pool.query(
            `SELECT n.id, n.titulo, n.mensagem, n.enviado_em, n.url_destino
             FROM public.notificacao n
             WHERE n.id_destinatario = $1 AND n.visto = false
             ORDER BY n.enviado_em DESC
             LIMIT 20`,
            [userId]
        );
        return res.status(200).json({ success: true, notificacoes: result.rows });
    } catch (err) {
        console.error("Erro ao buscar notificações:", err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar notificações.' });
    }
};

exports.marcarNotificacaoVista = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { id_notificacao } = req.body;
        await pool.query(
            `UPDATE public.notificacao SET visto = true WHERE id = $1 AND id_destinatario = $2`,
            [id_notificacao, userId]
        );
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Erro ao marcar notificação como vista:", err);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar notificação.' });
    }
};

exports.marcarNotificacaoEventoVista = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { id_evento } = req.body;
        const urlDestino = `/mngr/dashboard/calendario?eventoId=${id_evento}`;
        await pool.query(
            `UPDATE public.notificacao SET visto = true WHERE id_destinatario = $1 AND url_destino = $2 AND visto = false`,
            [userId, urlDestino]
        );
        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("Erro ao marcar notificação de evento como vista:", err);
        return res.status(500).json({ success: false });
    }
};

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
        const conviteRes = await client.query(`SELECT * FROM public.convite WHERE id = $1 AND (id_atleta = $2 OR id_treinador = $2) AND estado::text ILIKE 'pendente'`, [id_convite, userId]);

        if (conviteRes.rows.length === 0) { await client.query('ROLLBACK'); client.release(); return res.status(404).json({ success: false }); }

        const convite = conviteRes.rows[0];
        const novoEstado = resposta === 'Aceitar' ? 'concluido' : 'cancelado';
        await client.query('UPDATE public.convite SET estado = $1 WHERE id = $2', [novoEstado, id_convite]);

        if (resposta === 'Aceitar') {
            if (convite.id_atleta) {
                await client.query(`INSERT INTO public.equipa_atleta (id_equipa, id_atleta, data_entrada, ativo) VALUES ($1, $2, NOW(), true)`, [convite.id_equipa, convite.id_atleta]);
                await client.query(`UPDATE public.utilizador SET tipo_utilizador = 'atleta' WHERE id = $1 AND (tipo_utilizador IS NULL OR tipo_utilizador = '')`, [convite.id_atleta]);
            } else if (convite.id_treinador) {
                await client.query(`INSERT INTO public.equipa_treinador (id_equipa, id_treinador, data_entrada, ativo) VALUES ($1, $2, NOW(), true)`, [convite.id_equipa, convite.id_treinador]);
                await client.query(`UPDATE public.utilizador SET tipo_utilizador = 'treinador' WHERE id = $1 AND (tipo_utilizador IS NULL OR tipo_utilizador = '')`, [convite.id_treinador]);
            }

            // 🌟 Insere a pessoa no chat da equipa
            const resGrupo = await client.query("SELECT id FROM public.conversa WHERE id_equipa = $1 AND canal = 'grupo' LIMIT 1", [convite.id_equipa]);
            if (resGrupo.rows.length > 0) {
                const idParticipante = convite.id_atleta || convite.id_treinador;
                await client.query(`INSERT INTO public.participantes_conversa (id_conversa, id_utilizador) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [resGrupo.rows[0].id, idParticipante]);
            }
        }

        await client.query('COMMIT'); client.release();
        return res.status(200).json({ success: true, message: `Convite ${novoEstado} com sucesso.` });
    } catch (err) { await client.query('ROLLBACK'); client.release(); return res.status(500).json({ success: false }); }
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

exports.getGeneros = async (req, res) => {
    try {
        const resultado = await pool.query('SELECT id, nome FROM genero ORDER BY id ASC');
        return res.json({ success: true, generos: resultado.rows });
    } catch (err) {
        console.error('Erro ao obter géneros:', err);
        return res.status(500).json({ success: false, message: 'Erro ao carregar géneros.' });
    }
};

exports.pingTempoUso = async (req, res) => {
    try {
        const idUtilizador = req.session.userId;
        if (idUtilizador) {
            // Soma 1 minuto. COALESCE garante que, se for NULL, começa em 0.
            await pool.query('UPDATE utilizador SET tempo_uso_minutos = COALESCE(tempo_uso_minutos, 0) + 1 WHERE id = $1', [idUtilizador]);
        }
        res.json({ success: true });
    } catch (erro) {
        // Falha silenciosamente para não saturar a consola com erros de rede menores
        res.status(500).json({ success: false });
    }
};

exports.alterarPassword = async (req, res) => {
    try {
        const idUtilizador = req.session.userId;
        const { senhaAtual, novaSenha } = req.body;

        if (!senhaAtual || !novaSenha) {
            return res.status(400).json({ success: false, message: 'Por favor, preenche todos os campos.' });
        }

        const resultado = await pool.query('SELECT password FROM utilizador WHERE id = $1', [idUtilizador]);
        if (resultado.rows.length === 0) return res.status(404).json({ success: false, message: 'Utilizador não encontrado.' });

        const hashAtualDB = resultado.rows[0].password;

        // 🌟 VERIFICAR A PASSWORD ANTIGA (Comparação direta e segura)
        const passwordCorreta = await bcrypt.compare(senhaAtual, hashAtualDB);

        if (!passwordCorreta) {
            return res.status(401).json({ success: false, message: 'A palavra-passe atual está incorreta.' });
        }

        // 🌟 ENCRIPTAR A NOVA PALAVRA-PASSE ANTES DE GUARDAR
        const salt = await bcrypt.genSalt(10);
        const novoHash = await bcrypt.hash(novaSenha, salt);

        await pool.query('UPDATE utilizador SET password = $1 WHERE id = $2', [novoHash, idUtilizador]);

        return res.json({ success: true, message: 'Palavra-passe atualizada com sucesso!' });
    } catch (erro) {
        console.error('Erro ao alterar a password:', erro);
        return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};
