// controllers/TreinosController.js
const path = require('path');
const { pool } = require('../database/connection');

// 1. Entrega a página HTML (SPA)
exports.getPaginaTreinos = (req, res) => {
    if (req.headers['x-solicitado-por'] === 'SPA') {
        res.sendFile(path.join(__dirname, '../public/mngr/treinador/treinador_treinos.html'));
    } else {
        res.redirect('/mngr/dashboard');
    }
};

// 2. Vai buscar APENAS os treinos/reuniões que já começaram ou já acabaram
exports.getListaTreinosPassados = async (req, res) => {
    try {
        const userId = req.session.userId;
        const query = `
            SELECT ev.id, ev.titulo, ev.data_hora, ev.tipo_evento, ev.local, ev.duracao
            FROM evento ev
            JOIN equipa_treinador et ON ev.id_equipa = et.id_equipa
            WHERE et.id_treinador = $1 
              AND et.ativo = true
              AND ev.tipo_evento IN ('treino_tatico', 'treino_fisico', 'treino_tecnico', 'reuniao')
              AND ev.data_hora <= NOW()
              AND ev.estado = 'ativo'
            ORDER BY ev.data_hora DESC
        `;
        const result = await pool.query(query, [userId]);
        res.json({ success: true, treinos: result.rows });
    } catch (err) {
        console.error("Erro ao carregar treinos passados:", err);
        res.status(500).json({ success: false });
    }
};

// 3. Carrega a lista de atletas da equipa e o estado atual da presença deles
exports.getChamadaTreino = async (req, res) => {
    try {
        const idEvento = req.params.id;
        const query = `
            SELECT 
                ea.id_atleta, 
                u.nome_completo,
                u.nome, 
                u.url_imagem,
                COALESCE(pe.estado, 'presente') as estado, 
                COALESCE(pe.notas, '') as notas
            FROM equipa_atleta ea
            JOIN utilizador u ON ea.id_atleta = u.id
            JOIN evento ev ON ev.id_equipa = ea.id_equipa
            LEFT JOIN presenca_evento pe ON pe.id_atleta = ea.id_atleta AND pe.id_evento = ev.id
            WHERE ev.id = $1 AND ea.ativo = true
            ORDER BY u.nome ASC
        `;
        const result = await pool.query(query, [idEvento]);
        
        // Verifica se o evento já tem presenças marcadas na BD
        const checkPresencas = await pool.query('SELECT id FROM presenca_evento WHERE id_evento = $1 LIMIT 1', [idEvento]);
        const jaSubmetido = checkPresencas.rows.length > 0;

        res.json({ success: true, atletas: result.rows, jaSubmetido: jaSubmetido });
    } catch (err) {
        console.error("Erro ao carregar chamada:", err);
        res.status(500).json({ success: false });
    }
};

// 4. Grava (ou atualiza) as presenças todas de uma vez
exports.submeterPresencas = async (req, res) => {
    const client = await pool.connect();
    try {
        const idEvento = req.params.id;
        const { presencas } = req.body;

        await client.query('BEGIN');

        for (let p of presencas) {
            await client.query(`
                INSERT INTO presenca_evento (id_evento, id_atleta, estado, notas)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id_evento, id_atleta) 
                DO UPDATE SET estado = EXCLUDED.estado, notas = EXCLUDED.notas
            `, [idEvento, p.id_atleta, p.estado, p.notas]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Presenças submetidas com sucesso!' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao submeter presenças:", err);
        res.status(500).json({ success: false, message: 'Erro ao guardar dados.' });
    } finally {
        client.release();
    }
};

// 5. Ir buscar feedback dos atletas para um treino específico
// NOTA: feedback_evento.id_atleta guarda atletas.id (não utilizador.id).
// O insert é feito via CalendarioController que faz: SELECT id FROM atletas WHERE id_utilizador = $1
exports.getFeedbackTreino = async (req, res) => {
    try {
        const idEvento = req.params.id;

        // feedback_evento.id_atleta referencia atletas.id → precisa JOIN via atletas para chegar a utilizador
        const query = `
            SELECT 
                fe.id,
                fe.rpe,
                fe.fadiga,
                fe.sono,
                fe.observacoes,
                fe.criado_em,
                COALESCE(u.nome_completo, u.nome) as nome_atleta,
                u.url_imagem
            FROM feedback_evento fe
            JOIN atletas atl ON fe.id_atleta = atl.id
            JOIN utilizador u ON atl.id_utilizador = u.id
            WHERE fe.id_evento = $1
            ORDER BY u.nome ASC
        `;
        const result = await pool.query(query, [idEvento]);

        // Médias gerais do treino
        const mediasQuery = `
            SELECT 
                ROUND(AVG(rpe), 1) as rpe_medio,
                ROUND(AVG(fadiga), 1) as fadiga_media,
                ROUND(AVG(sono), 1) as sono_medio,
                COUNT(*) as total_respostas
            FROM feedback_evento WHERE id_evento = $1
        `;
        const mediasResult = await pool.query(mediasQuery, [idEvento]);

        res.json({ 
            success: true, 
            feedback: result.rows,
            medias: mediasResult.rows[0] || { rpe_medio: null, fadiga_media: null, sono_medio: null, total_respostas: 0 }
        });
    } catch (err) {
        console.error("Erro ao carregar feedback do treino:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// 6. Ir buscar detalhes completos de um treino (para vista de detalhe)
exports.getDetalhesTreino = async (req, res) => {
    try {
        const idEvento = req.params.id;
        const userId = req.session.userId;

        const eventoQuery = `
            SELECT e.id, e.titulo, e.tipo_evento, e.data_hora, e.local, e.descricao, e.duracao,
                   to_char(e.data_hora, 'DD/MM/YYYY HH24:MI') as data_formatada,
                   eq.nome as nome_equipa
            FROM evento e
            JOIN equipa eq ON e.id_equipa = eq.id
            JOIN equipa_treinador et ON eq.id = et.id_equipa
            WHERE e.id = $1 AND et.id_treinador = $2 AND et.ativo = true
        `;
        const eventoResult = await pool.query(eventoQuery, [idEvento, userId]);
        if (eventoResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Treino não encontrado.' });
        }

        res.json({ success: true, evento: eventoResult.rows[0] });
    } catch (err) {
        console.error("Erro ao carregar detalhes do treino:", err);
        res.status(500).json({ success: false });
    }
};