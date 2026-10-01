// controllers/MensagensController.js
const { pool } = require('../database/connection');

exports.getListaContactos = async (req, res) => {
    try {
        const meuId = req.session.userId;
        const query = `
            WITH meus_clubes AS (
                SELECT e.id_clube
                FROM equipa_atleta ea JOIN equipa e ON ea.id_equipa = e.id
                WHERE ea.id_atleta = $1 AND ea.ativo = true
                UNION
                SELECT e.id_clube
                FROM equipa_treinador et JOIN equipa e ON et.id_equipa = e.id
                WHERE et.id_treinador = $1 AND et.ativo = true
                UNION
                SELECT id AS id_clube FROM clube WHERE id_gestor = $1
            ),
            mesmo_clube AS (
                SELECT DISTINCT u2.id
                FROM utilizador u2
                WHERE
                    EXISTS (
                        SELECT 1 FROM equipa_atleta ea2 JOIN equipa e2 ON ea2.id_equipa = e2.id
                        WHERE ea2.id_atleta = u2.id AND ea2.ativo = true AND e2.id_clube IN (SELECT id_clube FROM meus_clubes)
                    )
                    OR EXISTS (
                        SELECT 1 FROM equipa_treinador et2 JOIN equipa e2 ON et2.id_equipa = e2.id
                        WHERE et2.id_treinador = u2.id AND et2.ativo = true AND e2.id_clube IN (SELECT id_clube FROM meus_clubes)
                    )
                    OR EXISTS (
                        SELECT 1 FROM clube c2 WHERE c2.id_gestor = u2.id AND c2.id IN (SELECT id_clube FROM meus_clubes)
                    )
            )
            SELECT
                CASE WHEN c.canal = 'grupo' THEN eq.nome ELSE u.nome END as nome,
                CASE WHEN c.canal = 'grupo' THEN 'Grupo' ELSE u.tipo_utilizador END as tipo_utilizador,
                c.canal,
                CASE WHEN c.canal = 'grupo' THEN 'g_' || c.id ELSE u.id::text END as id,
                CASE WHEN c.canal = 'grupo' THEN eq.foto_url ELSE u.url_imagem END as url_imagem,
                COUNT(m.id) FILTER (WHERE m.id_remetente != $1 AND m.lida = FALSE) as unread_count
            FROM conversa c
            JOIN participantes_conversa p_eu ON c.id = p_eu.id_conversa AND p_eu.id_utilizador = $1
            LEFT JOIN participantes_conversa p_outro ON c.id = p_outro.id_conversa AND p_outro.id_utilizador != $1 AND c.canal = 'direto'
            LEFT JOIN utilizador u ON p_outro.id_utilizador = u.id
            LEFT JOIN equipa eq ON c.id_equipa = eq.id
            LEFT JOIN mensagem m ON m.id_conversa = c.id
            WHERE (
                c.canal = 'grupo'
                AND (
                    c.id_equipa IS NULL
                    OR EXISTS (
                        SELECT 1 FROM equipa_atleta ea3 WHERE ea3.id_equipa = c.id_equipa AND ea3.id_atleta = $1 AND ea3.ativo = true
                    )
                    OR EXISTS (
                        SELECT 1 FROM equipa_treinador et3 WHERE et3.id_equipa = c.id_equipa AND et3.id_treinador = $1 AND et3.ativo = true
                    )
                    OR EXISTS (
                        SELECT 1 FROM equipa e3 JOIN clube cl ON e3.id_clube = cl.id WHERE e3.id = c.id_equipa AND cl.id_gestor = $1
                    )
                )
            )
            OR (c.canal = 'direto' AND u.id IN (SELECT id FROM mesmo_clube))
            GROUP BY c.id, c.canal, eq.nome, eq.foto_url, u.id, u.nome, u.tipo_utilizador, u.url_imagem
            ORDER BY c.canal DESC, nome ASC
        `;
        const result = await pool.query(query, [meuId]);
        res.json({ success: true, contactos: result.rows });
    } catch (err) {
        console.error("❌ ERRO GET LISTA CONTACTOS:", err);
        res.status(500).json({ success: false });
    }
};

exports.getConversaComUtilizador = async (req, res) => {
    try {
        const idDestinatario = String(req.params.id_destinatario); 
        const meuId = req.session.userId; 
        let idConversa = null;

        if (idDestinatario.startsWith('g_')) {
            idConversa = parseInt(idDestinatario.replace('g_', ''), 10);
        } else {
            const queryConversa = `SELECT c.id FROM conversa c JOIN participantes_conversa p1 ON c.id = p1.id_conversa JOIN participantes_conversa p2 ON c.id = p2.id_conversa WHERE c.canal = 'direto' AND p1.id_utilizador = $1 AND p2.id_utilizador = $2 LIMIT 1`;
            const resultConversa = await pool.query(queryConversa, [meuId, idDestinatario]);
            if (resultConversa.rows.length === 0) return res.json({ success: true, id_conversa: null, mensagens: [], meu_id: meuId });
            idConversa = resultConversa.rows[0].id;
        }

        // 🌟 Self-join à própria tabela "mensagem" para trazer os dados da mensagem
        // original quando esta mensagem é uma resposta (resposta_a_id). Os alias
        // "respondida" representam a mensagem citada/original.
        const queryMensagens = `
            SELECT 
                m.id, 
                m.id_remetente, 
                u.nome as nome_remetente,
                u.url_imagem as foto_remetente,
                m.mensagem, 
                to_char(m.enviado_em, 'HH24:MI') as hora, 
                to_char(m.enviado_em, 'YYYY-MM-DD') as data_completa,
                m.resposta_a_id,
                respondida.mensagem as resposta_a_texto,
                u_respondida.nome as resposta_a_nome
            FROM mensagem m
            JOIN utilizador u ON m.id_remetente = u.id
            LEFT JOIN mensagem respondida ON respondida.id = m.resposta_a_id
            LEFT JOIN utilizador u_respondida ON respondida.id_remetente = u_respondida.id
            WHERE m.id_conversa = $1 
            ORDER BY m.enviado_em ASC
        `;
        const resultMensagens = await pool.query(queryMensagens, [idConversa]);

        res.json({ success: true, id_conversa: idConversa, mensagens: resultMensagens.rows, meu_id: meuId });
    } catch (err) { 
        console.error("❌ ERRO GET CONVERSA:", err);
        res.status(500).json({ success: false }); 
    }
};

exports.enviarMensagem = async (req, res) => {
    try {
        let { id_conversa, id_destinatario, texto_mensagem, resposta_a_id } = req.body; 
        const meuId = req.session.userId; 
        const destIdStr = String(id_destinatario);

        if (!id_conversa) {
            if (destIdStr.startsWith('g_')) {
                id_conversa = parseInt(destIdStr.replace('g_', ''), 10);
            } else {
                const insertConversa = `INSERT INTO conversa (canal, criado_em) VALUES ('direto', NOW()) RETURNING id`;
                const resultNovaConversa = await pool.query(insertConversa);
                id_conversa = resultNovaConversa.rows[0].id;
                await pool.query(`INSERT INTO participantes_conversa (id_conversa, id_utilizador) VALUES ($1, $2), ($1, $3)`, [id_conversa, meuId, id_destinatario]);
            }
        }

        // 🌟 Validação do resposta_a_id: só aceitamos responder a uma mensagem
        // que realmente pertença a esta mesma conversa. Isto evita que alguém
        // manipule o pedido para "colar" uma citação de outra conversa onde
        // nem é participante.
        let idRespostaValido = null;
        if (resposta_a_id) {
            const checkRes = await pool.query(
                `SELECT id FROM mensagem WHERE id = $1 AND id_conversa = $2 LIMIT 1`,
                [resposta_a_id, id_conversa]
            );
            if (checkRes.rows.length > 0) {
                idRespostaValido = checkRes.rows[0].id;
            }
        }

        // 1. Inserir a mensagem
        await pool.query(
            `INSERT INTO mensagem (id_conversa, id_remetente, mensagem, enviado_em, lida, resposta_a_id) VALUES ($1, $2, $3, NOW(), FALSE, $4)`,
            [id_conversa, meuId, texto_mensagem, idRespostaValido]
        );

        // 2. Lógica da Notificação — todos os participantes exceto o remetente
        const participantesRes = await pool.query(
            `SELECT id_utilizador FROM participantes_conversa WHERE id_conversa = $1 AND id_utilizador != $2`,
            [id_conversa, meuId]
        );

        const urlDestino = `/mngr/dashboard/mensagens?conversa=${id_conversa}`;
        for (const row of participantesRes.rows) {
            const idDest = row.id_utilizador;
            const checkNotif = await pool.query(
                `SELECT id FROM notificacao
                 WHERE id_destinatario = $1 AND visto = false AND url_destino = $2
                 LIMIT 1`,
                [idDest, urlDestino]
            );

            if (checkNotif.rows.length === 0) {
                await pool.query(
                    `INSERT INTO notificacao (id_destinatario, titulo, mensagem, visto, enviado_em, url_destino)
                     VALUES ($1, 'Nova Mensagem', 'Recebeu uma nova mensagem', false, NOW(), $2)`,
                    [idDest, urlDestino]
                );
            }
        }

        res.json({ success: true, id_conversa: id_conversa });
    } catch (err) { 
        console.error("❌ ERRO ENVIAR MENSAGEM:", err);
        res.status(500).json({ success: false }); 
    }
};

exports.marcarMensagensLidas = async (req, res) => {
    try {
        const idDestinatario = String(req.params.id_destinatario);
        const meuId = req.session.userId;
        let idConversa = null;

        if (idDestinatario.startsWith('g_')) {
            idConversa = parseInt(idDestinatario.replace('g_', ''), 10);
        } else {
            const queryConversa = `SELECT c.id FROM conversa c JOIN participantes_conversa p1 ON c.id = p1.id_conversa JOIN participantes_conversa p2 ON c.id = p2.id_conversa WHERE c.canal = 'direto' AND p1.id_utilizador = $1 AND p2.id_utilizador = $2 LIMIT 1`;
            const resultConversa = await pool.query(queryConversa, [meuId, idDestinatario]);
            if (resultConversa.rows.length > 0) idConversa = resultConversa.rows[0].id;
        }

        if (idConversa) {
            // 1. Marca mensagens como lidas (o que já tens)
            await pool.query(`UPDATE mensagem SET lida = TRUE WHERE id_conversa = $1 AND id_remetente != $2 AND lida = FALSE`, [idConversa, meuId]);

            // 2. Marca a notificação como vista
            await pool.query(`
                UPDATE notificacao
                SET visto = TRUE
                WHERE id_destinatario = $1
                AND visto = FALSE
                AND url_destino = $2
            `, [meuId, `/mngr/dashboard/mensagens?conversa=${idConversa}`]);
        }
        res.json({ success: true });
    } catch (err) { 
        console.error("❌ ERRO MARCAR LIDAS:", err);
        res.status(500).json({ success: false }); 
    }
};

exports.getContactoPorConversa = async (req, res) => {
    try {
        const meuId = req.session.userId;
        const idConversa = parseInt(req.params.id_conversa, 10);

        const conversaRes = await pool.query('SELECT canal FROM conversa WHERE id = $1', [idConversa]);
        if (conversaRes.rows.length === 0) return res.status(404).json({ success: false });

        const canal = conversaRes.rows[0].canal;
        if (canal === 'grupo') {
            return res.json({ success: true, contacto_id: `g_${idConversa}` });
        }

        const outroRes = await pool.query(
            `SELECT id_utilizador FROM participantes_conversa WHERE id_conversa = $1 AND id_utilizador != $2 LIMIT 1`,
            [idConversa, meuId]
        );
        if (outroRes.rows.length === 0) return res.status(404).json({ success: false });
        return res.json({ success: true, contacto_id: String(outroRes.rows[0].id_utilizador) });
    } catch (err) {
        console.error("Erro ao resolver contacto por conversa:", err);
        return res.status(500).json({ success: false });
    }
};

exports.getSugestoesNovosContactos = async (req, res) => {
    try {
        const meuId = req.session.userId;
        const userQuery = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1 LIMIT 1', [meuId]);
        if (userQuery.rows.length === 0) return res.json({ success: true, contactos: [] });
        
        const tipoPerfil = userQuery.rows[0].tipo_utilizador ? userQuery.rows[0].tipo_utilizador.trim().toLowerCase() : '';
        let querySugestoes = '';

        if (tipoPerfil === 'gestor') {
            querySugestoes = `
                WITH meus_clubes AS (SELECT id FROM clube WHERE id_gestor = $1),
                     membros AS (
                        SELECT u.id, u.nome, u.tipo_utilizador, u.url_imagem, d.nome as desporto, eq.nome as equipa_nome, 'EQUIPA TÉCNICA' as cargo, 1 as ordem_cargo 
                        FROM utilizador u 
                        JOIN equipa_treinador et ON et.id_treinador = u.id AND et.ativo = true
                        JOIN equipa eq ON et.id_equipa = eq.id 
                        LEFT JOIN desporto d ON eq.id_tipo_desporto = d.id 
                        WHERE eq.id_clube IN (SELECT id FROM meus_clubes)
                        UNION
                        SELECT u.id, u.nome, u.tipo_utilizador, u.url_imagem, d.nome as desporto, eq.nome as equipa_nome, 'ATLETAS' as cargo, 2 as ordem_cargo 
                        FROM utilizador u 
                        JOIN equipa_atleta ea ON u.id = ea.id_atleta 
                        JOIN equipa eq ON ea.id_equipa = eq.id 
                        LEFT JOIN desporto d ON eq.id_tipo_desporto = d.id 
                        WHERE eq.id_clube IN (SELECT id FROM meus_clubes)
                     )
                SELECT DISTINCT id, nome, tipo_utilizador, url_imagem, desporto, equipa_nome, cargo, ordem_cargo FROM membros WHERE id != $1 ORDER BY desporto ASC, equipa_nome ASC, ordem_cargo ASC, nome ASC
            `;
        } else if (tipoPerfil === 'treinador') {
            querySugestoes = `
                WITH minhas_equipas AS (
                    SELECT eq.id, eq.id_clube, eq.nome as equipa_nome 
                    FROM equipa eq 
                    JOIN equipa_treinador et ON eq.id = et.id_equipa 
                    WHERE et.id_treinador = $1 AND et.ativo = true
                ),
                     membros AS (
                        SELECT u.id, u.nome, u.tipo_utilizador, u.url_imagem, NULL as desporto, 'ESTRUTURA DO CLUBE' as equipa_nome, 'DIREÇÃO' as cargo, 0 as ordem_cargo 
                        FROM utilizador u JOIN clube c ON c.id_gestor = u.id 
                        WHERE c.id IN (SELECT id_clube FROM minhas_equipas)
                        UNION
                        SELECT u.id, u.nome, u.tipo_utilizador, u.url_imagem, NULL as desporto, me.equipa_nome, 'COLEGAS EQUIPA TÉCNICA' as cargo, 1 as ordem_cargo 
                        FROM utilizador u 
                        JOIN equipa_treinador et ON u.id = et.id_treinador AND et.ativo = true
                        JOIN minhas_equipas me ON et.id_equipa = me.id
                        UNION
                        SELECT u.id, u.nome, u.tipo_utilizador, u.url_imagem, NULL as desporto, me.equipa_nome, 'ATLETAS' as cargo, 2 as ordem_cargo 
                        FROM utilizador u JOIN equipa_atleta ea ON u.id = ea.id_atleta JOIN minhas_equipas me ON ea.id_equipa = me.id
                     )
                SELECT DISTINCT id, nome, tipo_utilizador, url_imagem, desporto, equipa_nome, cargo, ordem_cargo FROM membros WHERE id != $1 ORDER BY equipa_nome ASC, ordem_cargo ASC, nome ASC
            `;
        } else if (tipoPerfil === 'atleta') {
             querySugestoes = `
                WITH minhas_equipas AS (SELECT eq.id, eq.id_clube, eq.nome as equipa_nome FROM equipa eq JOIN equipa_atleta ea ON eq.id = ea.id_equipa WHERE ea.id_atleta = $1),
                     membros AS (
                        SELECT u.id, u.nome, u.tipo_utilizador, u.url_imagem, NULL as desporto, 'ESTRUTURA DO CLUBE' as equipa_nome, 'DIREÇÃO' as cargo, 0 as ordem_cargo FROM utilizador u JOIN clube c ON c.id_gestor = u.id WHERE c.id IN (SELECT id_clube FROM minhas_equipas)
                        UNION
                        SELECT u.id, u.nome, u.tipo_utilizador, u.url_imagem, NULL as desporto, me.equipa_nome, 'EQUIPA TÉCNICA' as cargo, 1 as ordem_cargo 
                        FROM utilizador u 
                        JOIN equipa_treinador et ON u.id = et.id_treinador AND et.ativo = true
                        JOIN minhas_equipas me ON et.id_equipa = me.id
                        UNION
                        SELECT u.id, u.nome, u.tipo_utilizador, u.url_imagem, NULL as desporto, me.equipa_nome, 'ATLETAS' as cargo, 2 as ordem_cargo FROM utilizador u JOIN equipa_atleta ea ON u.id = ea.id_atleta JOIN minhas_equipas me ON ea.id_equipa = me.id
                     )
                SELECT DISTINCT id, nome, tipo_utilizador, url_imagem, desporto, equipa_nome, cargo, ordem_cargo FROM membros WHERE id != $1 ORDER BY equipa_nome ASC, ordem_cargo ASC, nome ASC
             `;
        } else { return res.json({ success: true, contactos: [] }); }

        const result = await pool.query(querySugestoes, [meuId]);
        const conversasExistentes = await pool.query(`SELECT p_outro.id_utilizador FROM participantes_conversa p_outro JOIN participantes_conversa p_eu ON p_outro.id_conversa = p_eu.id_conversa JOIN conversa c ON c.id = p_eu.id_conversa WHERE p_eu.id_utilizador = $1 AND c.canal = 'direto'`, [meuId]);
        const idsComConversa = conversasExistentes.rows.map(r => r.id_utilizador);
        res.json({ success: true, contactos: result.rows.filter(c => !idsComConversa.includes(c.id)) });
    } catch (err) { 
        console.error("❌ ERRO SUGESTOES CONTACTOS:", err);
        res.status(500).json({ success: false }); 
    }
};