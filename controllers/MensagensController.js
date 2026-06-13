const { pool } = require('../database/connection');

exports.getListaContactos = async (req, res) => {
    try {
        const meuId = req.session.userId;
        const query = `
            SELECT 
                u.id, u.nome, u.tipo_utilizador,
                COUNT(m.id) FILTER (WHERE m.id_remetente = u.id AND m.lida = FALSE) as unread_count
            FROM utilizador u
            JOIN participantes_conversa p_outro ON u.id = p_outro.id_utilizador
            JOIN participantes_conversa p_eu ON p_outro.id_conversa = p_eu.id_conversa
            JOIN conversa c ON c.id = p_eu.id_conversa
            LEFT JOIN mensagem m ON m.id_conversa = p_eu.id_conversa 
            WHERE p_eu.id_utilizador = $1 AND u.id != $1 AND c.canal = 'direto'
            GROUP BY u.id, u.nome, u.tipo_utilizador
            ORDER BY u.nome ASC
        `;
        const result = await pool.query(query, [meuId]);
        res.json({ success: true, contactos: result.rows });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ success: false, message: "Erro ao buscar contactos." }); 
    }
};

exports.getConversaComUtilizador = async (req, res) => {
    try {
        const idDestinatario = req.params.id_destinatario;
        const meuId = req.session.userId; 
        const queryConversa = `
            SELECT c.id FROM conversa c
            JOIN participantes_conversa p1 ON c.id = p1.id_conversa
            JOIN participantes_conversa p2 ON c.id = p2.id_conversa
            WHERE c.canal = 'direto' AND p1.id_utilizador = $1 AND p2.id_utilizador = $2 LIMIT 1
        `;
        const resultConversa = await pool.query(queryConversa, [meuId, idDestinatario]);

        if (resultConversa.rows.length === 0) return res.json({ success: true, id_conversa: null, mensagens: [], meu_id: meuId });

        const idConversa = resultConversa.rows[0].id;
        const queryMensagens = `
            SELECT id, id_remetente, mensagem, to_char(enviado_em, 'HH24:MI') as hora
            FROM mensagem WHERE id_conversa = $1 ORDER BY enviado_em ASC
        `;
        const resultMensagens = await pool.query(queryMensagens, [idConversa]);

        res.json({ success: true, id_conversa: idConversa, mensagens: resultMensagens.rows, meu_id: meuId });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ success: false, message: "Erro ao buscar histórico." }); 
    }
};

exports.enviarMensagem = async (req, res) => {
    try {
        let { id_conversa, id_destinatario, texto_mensagem } = req.body; 
        const meuId = req.session.userId; 

        if (!id_conversa) {
            // Agora usa o ENUM correto 'direto'
            const insertConversa = `INSERT INTO conversa (canal, criado_em) VALUES ('direto', NOW()) RETURNING id`;
            const resultNovaConversa = await pool.query(insertConversa);
            id_conversa = resultNovaConversa.rows[0].id;
            await pool.query(`INSERT INTO participantes_conversa (id_conversa, id_utilizador) VALUES ($1, $2), ($1, $3)`, [id_conversa, meuId, id_destinatario]);
        }

        await pool.query(`INSERT INTO mensagem (id_conversa, id_remetente, mensagem, enviado_em, lida) VALUES ($1, $2, $3, NOW(), FALSE)`, [id_conversa, meuId, texto_mensagem]);
        res.json({ success: true, id_conversa: id_conversa });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ success: false, message: "Erro ao gravar mensagem." }); 
    }
};

exports.marcarMensagensLidas = async (req, res) => {
    try {
        const idDestinatario = req.params.id_destinatario;
        const meuId = req.session.userId;
        
        const queryConversa = `
            SELECT c.id FROM conversa c
            JOIN participantes_conversa p1 ON c.id = p1.id_conversa
            JOIN participantes_conversa p2 ON c.id = p2.id_conversa
            WHERE c.canal = 'direto' AND p1.id_utilizador = $1 AND p2.id_utilizador = $2 LIMIT 1
        `;
        const resultConversa = await pool.query(queryConversa, [meuId, idDestinatario]);
        
        if (resultConversa.rows.length > 0) {
            const idConversa = resultConversa.rows[0].id;
            await pool.query(`UPDATE mensagem SET lida = TRUE WHERE id_conversa = $1 AND id_remetente = $2 AND lida = FALSE`, [idConversa, idDestinatario]);
        }
        res.json({ success: true });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ success: false }); 
    }
};

exports.getSugestoesNovosContactos = async (req, res) => {
    try {
        const meuId = req.session.userId;
        const userQuery = await pool.query('SELECT tipo_utilizador FROM utilizador WHERE id = $1 LIMIT 1', [meuId]);
        const tipoPerfil = userQuery.rows[0].tipo_utilizador ? userQuery.rows[0].tipo_utilizador.trim().toLowerCase() : '';
        let querySugestoes = '';

        if (tipoPerfil === 'gestor') {
            querySugestoes = `
                WITH membros AS (
                    SELECT u.id, u.nome, u.tipo_utilizador, d.nome as desporto, eq.nome as equipa_nome, 'TREINADOR' as cargo, 1 as ordem_cargo
                    FROM utilizador u 
                    JOIN equipa eq ON eq.id_treinador = u.id 
                    LEFT JOIN desporto d ON eq.id_tipo_desporto = d.id
                    WHERE eq.id_clube = (SELECT id FROM clube WHERE id_gestor = $1 LIMIT 1)
                    UNION
                    SELECT u.id, u.nome, u.tipo_utilizador, d.nome as desporto, eq.nome as equipa_nome, 'ATLETAS' as cargo, 2 as ordem_cargo
                    FROM utilizador u 
                    JOIN equipa_atleta ea ON ea.id_atleta = u.id 
                    JOIN equipa eq ON eq.id = ea.id_equipa 
                    LEFT JOIN desporto d ON eq.id_tipo_desporto = d.id
                    WHERE eq.id_clube = (SELECT id FROM clube WHERE id_gestor = $1 LIMIT 1)
                )
                SELECT DISTINCT id, nome, tipo_utilizador, desporto, equipa_nome, cargo, ordem_cargo FROM membros
                WHERE id != $1 AND id NOT IN (
                    SELECT p_outro.id_utilizador FROM participantes_conversa p_outro JOIN participantes_conversa p_eu ON p_outro.id_conversa = p_eu.id_conversa JOIN conversa c ON c.id = p_eu.id_conversa WHERE p_eu.id_utilizador = $1 AND c.canal = 'direto'
                ) ORDER BY desporto ASC, equipa_nome ASC, ordem_cargo ASC, nome ASC
            `;
        } else if (tipoPerfil === 'treinador') {
            querySugestoes = `
                WITH membros AS (
                    SELECT u.id, u.nome, u.tipo_utilizador, NULL as desporto, 'ESTRUTURA DO CLUBE' as equipa_nome, 'DIREÇÃO' as cargo, 0 as ordem_cargo
                    FROM utilizador u JOIN clube c ON c.id_gestor = u.id JOIN equipa eq ON eq.id_clube = c.id WHERE eq.id_treinador = $1
                    UNION
                    SELECT u.id, u.nome, u.tipo_utilizador, NULL as desporto, eq.nome as equipa_nome, 'ATLETAS' as cargo, 2 as ordem_cargo
                    FROM utilizador u JOIN equipa_atleta ea ON ea.id_atleta = u.id JOIN equipa eq ON eq.id = ea.id_equipa WHERE eq.id_treinador = $1
                )
                SELECT DISTINCT id, nome, tipo_utilizador, desporto, equipa_nome, cargo, ordem_cargo FROM membros
                WHERE id != $1 AND id NOT IN (
                    SELECT p_outro.id_utilizador FROM participantes_conversa p_outro JOIN participantes_conversa p_eu ON p_outro.id_conversa = p_eu.id_conversa JOIN conversa c ON c.id = p_eu.id_conversa WHERE p_eu.id_utilizador = $1 AND c.canal = 'direto'
                ) ORDER BY equipa_nome ASC, ordem_cargo ASC, nome ASC
            `;
        } else if (tipoPerfil === 'atleta') {
            querySugestoes = `
                WITH membros AS (
                    SELECT u.id, u.nome, u.tipo_utilizador, NULL as desporto, eq.nome as equipa_nome, 'TREINADOR' as cargo, 1 as ordem_cargo
                    FROM utilizador u JOIN equipa eq ON eq.id_treinador = u.id JOIN equipa_atleta ea ON ea.id_equipa = eq.id WHERE ea.id_atleta = $1
                    UNION
                    SELECT u.id, u.nome, u.tipo_utilizador, NULL as desporto, eq.nome as equipa_nome, 'ATLETAS' as cargo, 2 as ordem_cargo
                    FROM utilizador u JOIN equipa_atleta ea_other ON ea_other.id_atleta = u.id JOIN equipa eq ON eq.id = ea_other.id_equipa JOIN equipa_atleta ea_me ON ea_me.id_equipa = eq.id WHERE ea_me.id_atleta = $1
                )
                SELECT DISTINCT id, nome, tipo_utilizador, desporto, equipa_nome, cargo, ordem_cargo FROM membros
                WHERE id != $1 AND id NOT IN (
                    SELECT p_outro.id_utilizador FROM participantes_conversa p_outro JOIN participantes_conversa p_eu ON p_outro.id_conversa = p_eu.id_conversa JOIN conversa c ON c.id = p_eu.id_conversa WHERE p_eu.id_utilizador = $1 AND c.canal = 'direto'
                ) ORDER BY equipa_nome ASC, ordem_cargo ASC, nome ASC
            `;
        } else {
            return res.json({ success: true, contactos: [] });
        }

        const result = await pool.query(querySugestoes, [meuId]);
        res.json({ success: true, contactos: result.rows });
    } catch (err) { 
        console.error("Erro no chat BD:", err); 
        res.status(500).json({ success: false, message: "Erro do servidor." }); 
    }
};