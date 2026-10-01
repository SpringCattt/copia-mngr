// controllers/CalendarioController.js
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { pool } = require('../database/connection');
const crypto = require('crypto');

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
}).single('avatar'); 

// Exportar o middleware para ser usado nas rotas
exports.uploadMiddleware = uploadConfig;

// Função auxiliar para fazer upload para o Supabase Storage
async function uploadImagemSupabase(file) {
    if (!file) return null;

    // Gera um nome único para o ficheiro para evitar sobreposições
    const extensao = path.extname(file.originalname) || '.png';
    const nomeFicheiro = `${crypto.randomUUID()}${extensao}`;
    const bucketNome = 'logo-clubes'; // 🌟 Ajustado para o nome real do teu bucket

    console.log(`[SUPABASE] A tentar fazer upload de ${nomeFicheiro} para o bucket "${bucketNome}"...`);

    // Faz o upload direto para a raiz do bucket
    const { data, error } = await supabase.storage
        .from(bucketNome) 
        .upload(nomeFicheiro, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        throw new Error(`Erro no Supabase Storage: ${error.message}`);
    }

    // Vai buscar o URL público do ficheiro que acabou de ser carregado
    const { data: publicUrlData } = supabase.storage
        .from(bucketNome)
        .getPublicUrl(nomeFicheiro);

    console.log("[SUPABASE] Upload concluído com sucesso. URL pública:", publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
}

// Função auxiliar para descobrir o Escalão, Equipa e Clube do Utilizador
async function resolverContextoUtilizador(userId, role) {
    const roleNormalizada = role?.trim().toLowerCase();

    if (roleNormalizada === 'atleta') {
        const resultado = await pool.query(
            `SELECT ea.id_equipa, e.id_tipo_escalao AS id_escalao, e.id_clube
             FROM equipa_atleta ea
             JOIN equipa e ON ea.id_equipa = e.id
             WHERE ea.id_atleta = $1 AND ea.ativo = true
             ORDER BY ea.data_entrada DESC LIMIT 1`,
            [userId]
        );
        return resultado.rows[0] || { id_equipa: null, id_escalao: null, id_clube: null };
    }

    if (roleNormalizada === 'gestor') {
        const resultado = await pool.query(
            `SELECT id AS id_clube FROM clube WHERE id_gestor = $1 LIMIT 1`,
            [userId]
        );
        const idClube = resultado.rows[0]?.id_clube || null;
        return { id_equipa: null, id_escalao: null, id_clube: idClube };
    }

    if (roleNormalizada === 'treinador') {
        const resultado = await pool.query(
            `SELECT et.id_equipa, e.id_tipo_escalao AS id_escalao, e.id_clube
             FROM equipa_treinador et
             JOIN equipa e ON et.id_equipa = e.id
             WHERE et.id_treinador = $1 AND et.ativo = true
             ORDER BY et.data_entrada DESC LIMIT 1`,
            [userId]
        );
        return resultado.rows[0] || { id_equipa: null, id_escalao: null, id_clube: null };
    }

    return { id_equipa: null, id_escalao: null, id_clube: null };
}

exports.getCalendario = (req, res) => {
    if (req.headers['x-solicitado-por'] === 'SPA') {
        res.sendFile(path.join(__dirname, '../public/mngr/calendario.html'));
    } else {
        res.sendFile(path.join(__dirname, '../public/mngr/components/dashboard.html')); 
    }
};

exports.getCalendarioDados = async (req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) return res.status(401).json({ error: 'Não autenticado.' });

        const resultadoUsuario = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [userId]);
        const role = resultadoUsuario.rows[0]?.tipo_utilizador?.trim().toLowerCase();
        
        const contexto = await resolverContextoUtilizador(userId, role);

        // 1. Procurar as competições com base no contexto do utilizador
        let resultadoCompeticoes = { rows: [] };
        
        if (role === 'gestor' && contexto.id_clube) {
            resultadoCompeticoes = await pool.query(
                `SELECT id, id_equipa, nome, tipo, nparticipantes, url_imagem, criado_em 
                 FROM competicao 
                 WHERE id_equipa IN (SELECT id FROM equipa WHERE id_clube = $1)
                 ORDER BY nome ASC`,
                [contexto.id_clube]
            );
        } else if (contexto.id_equipa) {
            resultadoCompeticoes = await pool.query(
                `SELECT id, id_equipa, nome, tipo, nparticipantes, url_imagem, criado_em 
                 FROM competicao 
                 WHERE id_equipa = $1
                 ORDER BY nome ASC`,
                [contexto.id_equipa]
            );
        }

        // 2. Procurar os Eventos
        let resultadoEventos;
        const queryBase = `
            SELECT ev.id, ev.titulo, ev.data_hora, ev.tipo_evento, ev.local, ev.descricao, 
                   ev.id_equipa, ev.id_escalao, ev.duracao, ev.equipa_rival, 
                   ev.equipa_rival_imagem, esc.nome AS nome_escalao, ev.id_equipa_rival, ev.oficial, ev.id_competicao
            FROM evento ev
            LEFT JOIN escalao esc ON ev.id_escalao = esc.id
            WHERE COALESCE(ev.estado::text, 'ativo') <> 'inativo'
        `;

        if (role === 'gestor' && contexto.id_clube) {
            resultadoEventos = await pool.query(
                queryBase + ` AND ev.id_equipa IN (SELECT id FROM equipa WHERE id_clube = $1) ORDER BY ev.data_hora ASC`,
                [contexto.id_clube]
            );
        } else if (contexto.id_equipa) {
            resultadoEventos = await pool.query(
                queryBase + ` AND ev.id_equipa = $1 ORDER BY ev.data_hora ASC`,
                [contexto.id_equipa]
            );
        } else {
            return res.json({ usuario: { role }, eventos: [], competicoes: [] });
        }

        let equipasClube = [];
        if (role === 'gestor' && contexto.id_clube) {
            const resEquipas = await pool.query(
                `SELECT id, nome FROM equipa WHERE id_clube = $1 ORDER BY nome ASC`,
                [contexto.id_clube]
            );
            equipasClube = resEquipas.rows;
        }

        res.json({
            usuario: {
                role: role || 'desconhecido',
                escalao: contexto.id_escalao,
                clube: contexto.id_clube,
                equipa: contexto.id_equipa
            },
            eventos: resultadoEventos.rows,
            competicoes: resultadoCompeticoes.rows,
            equipas: equipasClube
        });
    } catch (erro) {
        console.error('Erro ao obter os dados do calendário:', erro);
        res.status(500).json({ error: 'Erro ao obter os dados do calendário.' });
    }
};

exports.criarEvento = async (req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) return res.status(401).json({ error: 'Não autenticado.' });

        const resultadoUsuario = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [userId]);
        const role = resultadoUsuario.rows[0]?.tipo_utilizador?.trim().toLowerCase();

        if (role === 'atleta') {
            return res.status(403).json({ error: 'Não tens permissões para criar eventos.' });
        }

        const contexto = await resolverContextoUtilizador(userId, role);
        if (role === 'gestor' && !contexto.id_clube) {
            return res.status(400).json({ error: 'Este utilizador não está associado a nenhum clube válido.' });
        }
        if (role !== 'gestor' && !contexto.id_equipa) {
            return res.status(400).json({ error: 'Este utilizador não está associado a nenhuma equipa/clube válido.' });
        }

        const {
            tipo_evento, titulo, data_evento, hora_inicio, local, descricao,
            equipa_rival, oficial, duracao, id_equipa_selecionada, competicao
        } = req.body;

        const dataFinalBruta = data_evento || req.body.data;

        if (!dataFinalBruta || !hora_inicio) {
            return res.status(400).json({ error: 'A data e a hora de início são campos obrigatórios.' });
        }

        let escalaoFinal = contexto.id_escalao;
        let equipaFinal = contexto.id_equipa;

        if (role === 'gestor' && id_equipa_selecionada) {
            equipaFinal = parseInt(id_equipa_selecionada, 10);
            const buscaEscalao = await pool.query(
                `SELECT id_tipo_escalao FROM equipa WHERE id = $1 AND id_clube = $2 LIMIT 1`,
                [equipaFinal, contexto.id_clube]
            );
            if (buscaEscalao.rows.length > 0) {
                escalaoFinal = buscaEscalao.rows[0].id_tipo_escalao;
            }
        }

        const dataFormatadaStr = dataFinalBruta.replace(/-/g, '/');
        const data_hora_formatada = new Date(`${dataFormatadaStr} ${hora_inicio}:00`);
        const agora = new Date();

        if (data_hora_formatada.getTime() < agora.getTime()) {
            return res.status(400).json({ error: 'A data e hora do evento não podem estar no passado.' });
        }

        // Processar o upload da imagem se ela existir
        let urlImagemRival = null;
        if (tipo_evento === 'jogo' && req.file) {
            urlImagemRival = await uploadImagemSupabase(req.file);
        }

        // 🌟 VALIDAÇÃO ANTIBUG POSTGRESQL (Evita NaN)
        let idCompeticaoFinal = null;
        if (tipo_evento === 'jogo' && competicao && competicao !== "" && competicao !== "null" && competicao !== "undefined") {
            const parsedComp = parseInt(competicao, 10);
            if (!isNaN(parsedComp)) idCompeticaoFinal = parsedComp;
        }

        const resultadoEvento = await pool.query(
            `INSERT INTO evento (
                tipo_evento, titulo, data_hora, local, descricao,
                id_equipa, id_escalao, equipa_rival, equipa_rival_imagem, oficial, duracao, 
                id_competicao, criado_por, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
            [
                tipo_evento,
                titulo,
                data_hora_formatada,
                local,
                descricao || null,
                equipaFinal ? parseInt(equipaFinal, 10) : null,
                escalaoFinal ? parseInt(escalaoFinal, 10) : null,
                tipo_evento === 'jogo' && equipa_rival ? equipa_rival : null,
                urlImagemRival,
                tipo_evento === 'jogo' ? (oficial === 'true' || oficial === true) : false,
                duracao && duracao !== "" ? parseInt(duracao, 10) : null,
                idCompeticaoFinal, 
                userId,
                'ativo'
            ]
        );

        const idEvento = resultadoEvento.rows[0].id;
        const urlDestino = `/mngr/dashboard/calendario?eventoId=${idEvento}`;
        const tipoLabel = tipo_evento === 'jogo' ? 'Novo Jogo' : tipo_evento === 'treino' ? 'Novo Treino' : 'Novo Evento';

        const membrosRes = await pool.query(
            `SELECT id_atleta AS id_utilizador FROM equipa_atleta WHERE id_equipa = $1 AND ativo = true
             UNION
             SELECT id_treinador AS id_utilizador FROM equipa_treinador WHERE id_equipa = $1 AND ativo = true`,
            [equipaFinal]
        );

        for (const row of membrosRes.rows) {
            if (row.id_utilizador === userId) continue;
            await pool.query(
                `INSERT INTO notificacao (id_destinatario, titulo, mensagem, visto, enviado_em, url_destino)
                 VALUES ($1, $2, $3, false, NOW(), $4)`,
                [row.id_utilizador, tipoLabel, `Foi adicionado um novo evento: ${titulo}`, urlDestino]
            );
        }

        res.status(201).json({ message: 'Evento criado com sucesso!' });
    } catch (erro) {
        console.error('=== ERRO CRÍTICO NO BACKEND (criarEvento) ===', erro);
        res.status(500).json({ error: 'Erro ao registar o compromisso desportivo: ' + erro.message });
    }
};

exports.editarEvento = async (req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) return res.status(401).json({ error: 'Não autenticado.' });

        const resultadoUsuario = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [userId]);
        const role = resultadoUsuario.rows[0]?.tipo_utilizador?.trim().toLowerCase();
        if (role === 'atleta') return res.status(403).json({ error: 'Não tens permissões para editar eventos.' });

        const contexto = await resolverContextoUtilizador(userId, role);
        const { id } = req.params;
        const {
            tipo_evento, titulo, data_evento, hora_inicio, local, descricao,
            oficial, equipa_rival, duracao, id_equipa_selecionada, competicao
        } = req.body;

        const dataFinalBruta = data_evento || req.body.data;
        if (!dataFinalBruta || !hora_inicio) {
            return res.status(400).json({ error: 'A data e a hora de início são obrigatórias para a edição.' });
        }

        let queryVerificacao = `
            SELECT ev.id, ev.equipa_rival_imagem
            FROM evento ev
            JOIN equipa eq ON ev.id_equipa = eq.id
            WHERE ev.id = $1 AND COALESCE(ev.estado::text, 'ativo') <> 'inativo'`;
        let parametrosVerificacao = [id];

        if (role !== 'gestor') {
            queryVerificacao += ' AND ev.id_escalao = $2';
            parametrosVerificacao.push(contexto.id_escalao);
        } else {
            queryVerificacao += ' AND eq.id_clube = $2';
            parametrosVerificacao.push(contexto.id_clube);
        }

        const eventoExiste = await pool.query(queryVerificacao, parametrosVerificacao);
        if (eventoExiste.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado ou sem permissão para editá-lo.' });
        }

        let escalaoFinal = contexto.id_escalao;
        let equipaFinal = contexto.id_equipa;

        if (role === 'gestor' && id_equipa_selecionada) {
            equipaFinal = parseInt(id_equipa_selecionada, 10);
            const buscaEscalao = await pool.query(
                `SELECT id_tipo_escalao FROM equipa WHERE id = $1 AND id_clube = $2 LIMIT 1`,
                [equipaFinal, contexto.id_clube]
            );
            if (buscaEscalao.rows.length > 0) escalaoFinal = buscaEscalao.rows[0].id_tipo_escalao;
        }

        const dataFormatadaStr = dataFinalBruta.replace(/-/g, '/');
        const data_hora_formatada = new Date(`${dataFormatadaStr} ${hora_inicio}:00`);

        let urlImagemFinal = eventoExiste.rows[0].equipa_rival_imagem; 
        
        if (tipo_evento === 'jogo' && req.file) {
            urlImagemFinal = await uploadImagemSupabase(req.file);
        } else if (tipo_evento !== 'jogo') {
            urlImagemFinal = null; 
        }

        // 🌟 VALIDAÇÃO ANTIBUG POSTGRESQL (Evita NaN)
        let idCompeticaoFinal = null;
        if (tipo_evento === 'jogo' && competicao && competicao !== "" && competicao !== "null" && competicao !== "undefined") {
            const parsedComp = parseInt(competicao, 10);
            if (!isNaN(parsedComp)) idCompeticaoFinal = parsedComp;
        }

        await pool.query(
            `UPDATE evento
             SET tipo_evento = $1, titulo = $2, data_hora = $3, local = $4, descricao = $5,
                 oficial = $6, equipa_rival = $7, equipa_rival_imagem = $8, duracao = $9, 
                 id_escalao = $10, id_equipa = $11, id_competicao = $12
             WHERE id = $13`,
            [
                tipo_evento, titulo, data_hora_formatada, local, descricao || null,
                tipo_evento === 'jogo' ? (oficial === 'true' || oficial === true) : false,
                tipo_evento === 'jogo' && equipa_rival ? equipa_rival : null,
                urlImagemFinal,
                duracao && duracao !== "" ? parseInt(duracao, 10) : null,
                escalaoFinal ? parseInt(escalaoFinal, 10) : null, 
                equipaFinal ? parseInt(equipaFinal, 10) : null, 
                idCompeticaoFinal,
                id
            ]
        );

        res.json({ message: 'Evento atualizado com sucesso!' });
    } catch (erro) {
        console.error('=== ERRO CRÍTICO NO BACKEND (editarEvento) ===', erro);
        res.status(500).json({ error: erro.message || 'Erro ao editar o evento.' });
    }
};

exports.eliminarEvento = async (req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) return res.status(401).json({ error: 'Não autenticado.' });

        const resultadoUsuario = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1', [userId]);
        const role = resultadoUsuario.rows[0]?.tipo_utilizador?.trim().toLowerCase();
        if (role === 'atleta') return res.status(403).json({ error: 'Não tens permissões para eliminar eventos.' });

        const contexto = await resolverContextoUtilizador(userId, role);
        const { id } = req.params;

        let queryEliminar = `
            UPDATE evento ev
            SET estado = 'inativo'
            FROM equipa eq
            WHERE ev.id_equipa = eq.id AND ev.id = $1`;
        let parametros = [id];

        if (role !== 'gestor') {
            queryEliminar += ` AND ev.id_escalao = $2`;
            parametros.push(contexto.id_escalao);
        } else {
            queryEliminar += ` AND eq.id_clube = $2`;
            parametros.push(contexto.id_clube);
        }

        await pool.query(queryEliminar, parametros);
        res.json({ message: 'Evento eliminado com sucesso.' });
    } catch (erro) {
        console.error('Erro ao eliminar o evento:', erro);
        res.status(500).json({ error: erro.message || 'Erro ao eliminar o evento.' });
    }
};

exports.getEventoSimples = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT id, titulo, data_hora, tipo_evento FROM evento WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Evento não encontrado.' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar evento.' });
    }
};

exports.getEquipasRivais = async (req, res) => {
    try {
        const query = `
            SELECT 
                e.id AS id, e.id_clube AS id_clube, c.nome AS nome_clube, e.nome AS nome_equipa,
                esc.id AS id_escalao, esc.nome AS nome_escalao 
            FROM equipa e
            JOIN clube c ON e.id_clube = c.id
            LEFT JOIN escalao esc ON e.id_tipo_escalao = esc.id
            ORDER BY c.nome ASC, e.nome ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar equipas rivais na BD:", error);
        res.status(500).json({ error: 'Erro ao buscar equipas rivais.' });
    }
};

// --- OBTER FEEDBACK PÓS-TREINO (PARA PRÉ-PREENCHER O MODAL) ---
exports.getFeedback = async (req, res) => {
    try {
        const idUtilizador = req.session.userId;
        const eventoId = req.params.eventoId;

        // Procurar o ID do Atleta
        const atletaRes = await pool.query('SELECT id FROM atletas WHERE id_utilizador = $1', [idUtilizador]);
        if (atletaRes.rows.length === 0) return res.json({ success: true, feedback: null });
        const idAtleta = atletaRes.rows[0].id;

        // Ir à tabela feedback_evento ver se ele já avaliou este treino
        const fb = await pool.query('SELECT rpe, fadiga, sono, observacoes FROM feedback_evento WHERE id_evento = $1 AND id_atleta = $2', [eventoId, idAtleta]);
        
        res.json({ success: true, feedback: fb.rows.length > 0 ? fb.rows[0] : null });
    } catch (err) {
        console.error("Erro ao buscar feedback:", err);
        res.status(500).json({ success: false });
    }
};

// --- GUARDAR FEEDBACK PÓS-TREINO DO ATLETA ---
exports.guardarFeedback = async (req, res) => {
    try {
        const idUtilizador = req.session.userId;
        const eventoId = req.params.eventoId; 
        const { rpe, fadiga, sono, observacoes } = req.body;

        if (!eventoId || rpe === null || fadiga === null || sono === null) {
            return res.status(400).json({ success: false, message: 'Preenche os campos obrigatórios.' });
        }

        const atletaRes = await pool.query('SELECT id FROM atletas WHERE id_utilizador = $1', [idUtilizador]);
        if (atletaRes.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Apenas os atletas podem enviar feedback.' });
        }
        const idAtleta = atletaRes.rows[0].id;

        // Verificar se já existe para saber se fazemos UPDATE ou INSERT
        const checkRes = await pool.query('SELECT id FROM feedback_evento WHERE id_evento = $1 AND id_atleta = $2', [eventoId, idAtleta]);

        if (checkRes.rows.length > 0) {
            await pool.query(
                'UPDATE feedback_evento SET rpe = $1, fadiga = $2, sono = $3, observacoes = $4 WHERE id = $5',
                [rpe, fadiga, sono, observacoes, checkRes.rows[0].id]
            );
        } else {
            await pool.query(
                'INSERT INTO feedback_evento (id_evento, id_atleta, rpe, fadiga, sono, observacoes, criado_em) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                [eventoId, idAtleta, rpe, fadiga, sono, observacoes]
            );
        }

        res.json({ success: true, message: 'Feedback guardado com sucesso.' });

    } catch (erro) {
        console.error("Erro ao guardar feedback:", erro);
        res.status(500).json({ success: false, message: 'Erro interno ao processar o formulário.' });
    }
};

// --- OBTER ATA DA REUNIÃO ---
exports.getAta = async (req, res) => {
    try {
        const eventoId = req.params.eventoId;
        const result = await pool.query('SELECT ata FROM evento WHERE id = $1 AND tipo_evento = $2', [eventoId, 'reuniao']);
        
        if (result.rows.length === 0) return res.json({ success: false, message: 'Reunião não encontrada.' });
        
        res.json({ success: true, ata: result.rows[0].ata });
    } catch (err) {
        console.error("Erro ao buscar ata:", err);
        res.status(500).json({ success: false });
    }
};

// --- GUARDAR ATA DA REUNIÃO (Guarda em formato JSON para separar os campos) ---
exports.guardarAta = async (req, res) => {
    try {
        const eventoId = req.params.eventoId;
        const { resumo, anotacoes } = req.body;
        
        // Compacta os dois campos num formato de texto JSON estruturado
        const ataJSON = JSON.stringify({ resumo, anotacoes });

        await pool.query('UPDATE evento SET ata = $1 WHERE id = $2 AND tipo_evento = $3', [ataJSON, eventoId, 'reuniao']);
        
        res.json({ success: true, message: 'Ata guardada com sucesso.' });
    } catch (err) {
        console.error("Erro ao guardar ata:", err);
        res.status(500).json({ success: false, message: 'Erro ao guardar a ata.' });
    }
};