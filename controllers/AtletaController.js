// controllers/AtletaController.js
const path = require('path');
const { pool } = require('../database/connection');

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

exports.getPaginaDetalhes = (req, res) => {
    enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'atleta', 'atleta_detalhes.html'));
};

// --- AÇÕES DE BASE DE DADOS ---
exports.guardarDetalhesAtleta = async (req, res) => {
    const client = await pool.connect();
    try {
        const id_utilizador = req.session.userId;
        const { nome_completo, data_nascimento, id_genero, altura, peso, cidade, id_desporto } = req.body;

        if (!nome_completo || !id_genero || !altura || !peso || !cidade || !id_desporto) {
            return res.status(400).json({ success: false, message: "Todos os campos da ficha de atleta são de preenchimento obrigatório." });
        }

        await client.query('BEGIN');
        await client.query("UPDATE utilizador SET tipo_utilizador = 'atleta', nome_completo = $1 WHERE id = $2", [nome_completo.trim(), id_utilizador]);

        // Verificar se já existe linha em atletas (criada pelo gestor com data_nascimento)
        const existente = await client.query('SELECT data_nascimento, id_genero, id_desporto FROM atletas WHERE id_utilizador = $1', [id_utilizador]);

        if (existente.rows.length > 0) {
            // Já existe: preservar data_nascimento e id_genero definidos pelo gestor
            const generoFinal = existente.rows[0].id_genero || (id_genero ? parseInt(id_genero) : null);
            const desportoFinal = existente.rows[0].id_desporto || (id_desporto ? parseInt(id_desporto) : null);
            await client.query(
                `UPDATE atletas SET id_genero=$2, altura=$3, peso=$4, cidade=$5, id_desporto=$6 WHERE id_utilizador=$1`,
                [id_utilizador, generoFinal, parseFloat(altura), parseFloat(peso), cidade.trim(), desportoFinal]
            );
        } else {
            // Conta nova (auto-registo): data_nascimento é obrigatória
            if (!data_nascimento) {
                await client.query('ROLLBACK');
                return res.status(400).json({ success: false, message: "A data de nascimento é obrigatória." });
            }
            await client.query(
                `INSERT INTO atletas (id_utilizador, data_nascimento, id_genero, altura, peso, cidade, id_desporto) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [id_utilizador, data_nascimento, parseInt(id_genero), parseFloat(altura), parseFloat(peso), cidade.trim(), parseInt(id_desporto)]
            );
        }

        await client.query('COMMIT');
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
        const userId = req.session.userId;

        const queryPerfil = `
            SELECT u.nome as nome_curto, u.nome_completo, u.url_imagem as avatar,
                   a.id as atleta_id, a.data_nascimento, a.altura, a.peso, a.id_desporto, d.nome as modalidade, a.cidade,
                   e.id as id_equipa, e.nome as nome_equipa, e.foto_url as equipa_foto,
                   c.nome as clube_nome, c.logo_url as clube_logo, c.pais as clube_pais, c.regiao as clube_regiao
            FROM utilizador u
            LEFT JOIN atletas a ON u.id = a.id_utilizador
            LEFT JOIN desporto d ON a.id_desporto = d.id
            LEFT JOIN equipa_atleta ea ON u.id = ea.id_atleta AND ea.ativo = true
            LEFT JOIN equipa e ON ea.id_equipa = e.id
            LEFT JOIN clube c ON e.id_clube = c.id
            WHERE u.id = $1 LIMIT 1
        `;
        const resultPerfil = await pool.query(queryPerfil, [userId]);
        if (resultPerfil.rows.length === 0) return res.json({ success: false, message: "Atleta não encontrado" });

        const perfil = resultPerfil.rows[0];
        const idEquipa = perfil.id_equipa;
        const atletaId = perfil.atleta_id; // atletas.id (PK)

        let idade = null;
        if (perfil.data_nascimento) {
            const nascimento = new Date(perfil.data_nascimento);
            const hoje = new Date();
            let a = hoje.getFullYear() - nascimento.getFullYear();
            const m = hoje.getMonth() - nascimento.getMonth();
            if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) a--;
            idade = a;
        }

        let agenda = { proximo: null, ultimo: null };
        let stats = { jogos: 0, minutos: 0, golos: 0, assistencias: 0 };
        let feedbacksPendentes = [];
        let epochasAnteriores = [];

        if (idEquipa && atletaId) {
            const [resProximo, resUltimo, resStats] = await Promise.all([
                pool.query(
                    `SELECT id, tipo_evento, titulo, data_hora, local, equipa_rival_imagem
                     FROM evento WHERE id_equipa = $1 AND data_hora > NOW()
                     AND COALESCE(estado::text, 'ativo') <> 'inativo'
                     ORDER BY data_hora ASC LIMIT 1`,
                    [idEquipa]
                ),
                pool.query(
                    `SELECT e.id, e.tipo_evento, e.titulo, e.data_hora, e.equipa_rival_imagem, ej.minutos_jogados,
                            (SELECT COUNT(*) FROM golo g WHERE g.id_evento = e.id AND g.id_atleta = $2 AND g.autogolo = false) as golos,
                            (SELECT COUNT(*) FROM golo g WHERE g.id_evento = e.id AND g.id_assistente = $2) as assistencias
                     FROM evento e
                     LEFT JOIN estatistica_jogo ej ON e.id = ej.id_evento AND ej.id_atleta = $2
                     WHERE e.id_equipa = $1 AND e.data_hora <= NOW() AND e.tipo_evento = 'jogo'
                     AND COALESCE(e.estado::text, 'ativo') <> 'inativo'
                     ORDER BY e.data_hora DESC LIMIT 1`,
                    [idEquipa, atletaId]
                ),
                pool.query(
                    `SELECT COUNT(ej.id_evento) as jogos, COALESCE(SUM(ej.minutos_jogados), 0) as minutos,
                            (SELECT COUNT(*) FROM golo g WHERE g.id_atleta = $1 AND g.autogolo = false
                             AND g.id_evento IN (SELECT id FROM evento WHERE id_equipa = $2)) as golos,
                            (SELECT COUNT(*) FROM golo g WHERE g.id_assistente = $1
                             AND g.id_evento IN (SELECT id FROM evento WHERE id_equipa = $2)) as assistencias
                     FROM estatistica_jogo ej
                     JOIN evento e ON ej.id_evento = e.id
                     WHERE ej.id_atleta = $1 AND e.id_equipa = $2`,
                    [atletaId, idEquipa]
                )
            ]);

            if (resProximo.rows.length > 0) agenda.proximo = resProximo.rows[0];
            if (resUltimo.rows.length > 0) agenda.ultimo = resUltimo.rows[0];
            stats = resStats.rows[0];

            const queryFeedback = `
                SELECT e.id, e.titulo, e.tipo_evento, e.data_hora
                FROM evento e
                JOIN equipa_atleta ea ON e.id_equipa = ea.id_equipa
                LEFT JOIN feedback_evento fe ON e.id = fe.id_evento AND fe.id_atleta = $2
                WHERE e.id_equipa = $1
                  AND ea.id_atleta = $2
                  AND e.tipo_evento IN ('treino_tatico', 'treino_fisico', 'treino_tecnico')
                  AND e.estado = 'ativo'
                  AND (e.data_hora + (COALESCE(e.duracao, 120) * interval '1 minute')) <= NOW()
                  AND fe.id IS NULL
                ORDER BY e.data_hora ASC
            `;
            const resultFeedback = await pool.query(queryFeedback, [idEquipa, userId]);
            feedbacksPendentes = resultFeedback.rows;

            for (let fb of feedbacksPendentes) {
                const urlDestino = `/mngr/atleta/inicio?avaliar=${fb.id}`;
                const checkNotif = await pool.query(
                    `SELECT id FROM notificacao WHERE id_destinatario = $1 AND url_destino = $2`,
                    [userId, urlDestino]
                );
                if (checkNotif.rows.length === 0) {
                    await pool.query(
                        `INSERT INTO notificacao (id_destinatario, titulo, mensagem, visto, enviado_em, url_destino)
                         VALUES ($1, 'Feedback Pendente', $2, false, NOW(), $3)`,
                        [userId, `A sessão "${fb.titulo}" terminou. Clica aqui para submeter o teu Bem-Estar!`, urlDestino]
                    );
                }
            }
        }

        if (atletaId) {
            const resEpocas = await pool.query(
                `SELECT eq.nome as equipa_nome, eq.foto_url as equipa_foto,
                        COUNT(ej.id_evento) as jogos,
                        COALESCE(SUM(ej.minutos_jogados), 0) as minutos,
                        (SELECT COUNT(*) FROM golo g WHERE g.id_atleta = $1 AND g.autogolo = false
                         AND g.id_evento IN (SELECT id FROM evento WHERE id_equipa = ea2.id_equipa)) as golos,
                        (SELECT COUNT(*) FROM golo g WHERE g.id_assistente = $1
                         AND g.id_evento IN (SELECT id FROM evento WHERE id_equipa = ea2.id_equipa)) as assistencias
                 FROM equipa_atleta ea2
                 JOIN equipa eq ON ea2.id_equipa = eq.id
                 LEFT JOIN estatistica_jogo ej ON ej.id_atleta = $1
                     AND ej.id_evento IN (SELECT id FROM evento WHERE id_equipa = ea2.id_equipa)
                 WHERE ea2.id_atleta = $2 AND ea2.ativo = false
                 GROUP BY eq.nome, eq.foto_url, ea2.id_equipa
                 ORDER BY MAX(ea2.data_saida) DESC`,
                [atletaId, userId]
            );
            epochasAnteriores = resEpocas.rows;
        }

        res.json({ success: true, perfil, idade, agenda, stats, feedbacksPendentes, epochasAnteriores });
    } catch (error) {
        console.error("Erro no Dashboard do Atleta:", error);
        res.status(500).json({ success: false });
    }
};

exports.getAtletaDetalhes = async (req, res) => {
    const client = await pool.connect();
    try {
        const idAtleta = req.params.id; 
        const idEquipaFiltro = req.query.idEquipa ? parseInt(req.query.idEquipa, 10) : null;

        const queryFicha = `
            SELECT 
                u.id, u.nome, u.email, u.url_imagem,
                EXTRACT(YEAR FROM AGE(a.data_nascimento)) AS idade,
                to_char(a.data_nascimento, 'DD "de" FMMonth, YYYY') as data_nascimento_formatada,
                a.altura, a.peso, a.cidade, d.nome as desporto_nome,
                eq.nome as equipa_nome, eq.id as equipa_id,
                to_char(ea.data_entrada, 'DD/MM/YYYY') as data_entrada_formatada
            FROM public.utilizador u
            LEFT JOIN public.atletas a ON u.id = a.id_utilizador
            LEFT JOIN public.desporto d ON a.id_desporto = d.id
            LEFT JOIN public.equipa_atleta ea ON u.id = ea.id_atleta AND ea.ativo = true
            LEFT JOIN public.equipa eq ON ea.id_equipa = eq.id
            WHERE u.id = $1
            ${idEquipaFiltro ? 'AND (eq.id = $2 OR eq.id IS NULL)' : ''}
            LIMIT 1;
        `;
        
        const parametros = [idAtleta];
        if (idEquipaFiltro) parametros.push(idEquipaFiltro);

        const resFicha = await client.query(queryFicha, parametros);
        
        if (resFicha.rows.length === 0) {
            client.release();
            return res.json({ success: false, message: "Atleta não encontrado" });
        }
        
        const atleta = resFicha.rows[0];

        const queryStats = `
            SELECT COUNT(ej.id_evento) as jogos, COALESCE(SUM(ej.minutos_jogados), 0) as minutos,
                   (SELECT COUNT(*) FROM golo g WHERE g.id_atleta = a.id AND g.autogolo = false) as golos,
                   (SELECT COUNT(*) FROM golo g WHERE g.id_assistente = a.id) as assistencias
            FROM atletas a
            LEFT JOIN estatistica_jogo ej ON ej.id_atleta = a.id
            WHERE a.id_utilizador = $1
            GROUP BY a.id
        `;
        const resultStats = await client.query(queryStats, [idAtleta]);
        const stats = resultStats.rows[0];

        client.release();
        return res.status(200).json({ success: true, dados: { atleta, stats } });
        
    } catch (error) {
        client.release();
        console.error("❌ Erro nos Detalhes do Atleta:", error);
        return res.status(500).json({ success: false });
    }
};

exports.guardarEdicaoAtleta = async (req, res) => {
    const client = await pool.connect();
    try {
        const idAtleta = parseInt(req.params.id, 10);
        const { altura, peso } = req.body;

        await client.query('BEGIN');

        const perfilExiste = await client.query('SELECT id_utilizador FROM public.atletas WHERE id_utilizador = $1', [idAtleta]);
        
        if (perfilExiste.rows.length === 0) {
            await client.query(
                `INSERT INTO public.atletas (id_utilizador, data_nascimento, altura, peso) VALUES ($1, NOW(), $2, $3)`,
                [idAtleta, altura ? parseFloat(altura) : null, peso ? parseFloat(peso) : null]
            );
        } else {
            await client.query(
                `UPDATE public.atletas SET altura = $1, peso = $2 WHERE id_utilizador = $3;`,
                [altura ? parseFloat(altura) : null, peso ? parseFloat(peso) : null, idAtleta]
            );
        }

        await client.query('COMMIT');
        client.release();
        return res.status(200).json({ success: true, message: "Ficha técnica guardada com sucesso!" });

    } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        console.error("❌ ERRO CRÍTICO AO ATUALIZAR JOGADOR:", error);
        return res.status(500).json({ success: false, message: "Erro ao gravar as alterações do atleta." });
    }
};

// 🌟 NOVA FUNÇÃO: Gravar o formulário Pós-Treino
exports.submeterFeedback = async (req, res) => {
    try {
        const idAtleta = req.session.userId;
        const idEvento = req.params.id;
        const { rpe, fadiga, sono, observacoes } = req.body;

        const query = `
            INSERT INTO feedback_evento (id_evento, id_atleta, rpe, fadiga, sono, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id_evento, id_atleta) DO NOTHING
        `;
        await pool.query(query, [idEvento, idAtleta, parseInt(rpe), parseInt(fadiga), parseInt(sono), observacoes]);
        
        res.json({ success: true, message: 'Feedback submetido com sucesso!' });
    } catch (error) {
        console.error("Erro ao submeter feedback:", error);
        res.status(500).json({ success: false, message: 'Erro ao guardar o feedback.' });
    }
};