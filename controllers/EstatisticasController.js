// controllers/EstatisticasController.js
const path = require('path');
const { pool } = require('../database/connection');

exports.getEstatisticasView = (req, res) => {
    if (req.headers['x-solicitado-por'] === 'SPA') {
        return res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'estatisticas.html'));
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'dashboard.html'));
};

exports.getEstatisticasDados = async (req, res) => {
    try {
        const idUtilizador = req.session.userId;

        const userRes = await pool.query("SELECT LOWER(tipo_utilizador) as role FROM utilizador WHERE id = $1", [idUtilizador]);
        if (userRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Utilizador não encontrado na Base de Dados.' });

        const papel = userRes.rows[0].role;
        let dadosCustomizados = {};

        // =========================================================================
        // 🧠 LÓGICA DE DADOS: TREINADOR
        // =========================================================================
        if (papel === 'treinador') {
            const kpisRes = await pool.query(`
                SELECT 
                    COALESCE(SUM(rj.golos_nossa), 0) as total_golos,
                    COUNT(rj.id) as total_jogos,
                    COUNT(*) FILTER (WHERE rj.golos_nossa > rj.golos_adversario) as vitorias,
                    COUNT(*) FILTER (WHERE rj.golos_nossa = rj.golos_adversario) as empates,
                    COUNT(*) FILTER (WHERE rj.golos_nossa < rj.golos_adversario) as derrotas
                FROM resultado_jogo rj
                JOIN evento e ON rj.id_evento = e.id
                JOIN equipa_treinador et ON e.id_equipa = et.id_equipa
                WHERE et.id_treinador = $1 AND et.ativo = true AND e.tipo_evento::text ILIKE '%jogo%'
            `, [idUtilizador]);

            const assistRes = await pool.query(`
                SELECT COUNT(g.id) as total_assistencias FROM golo g
                JOIN evento e ON g.id_evento = e.id JOIN equipa_treinador et ON e.id_equipa = et.id_equipa
                WHERE et.id_treinador = $1 AND et.ativo = true AND g.id_assistente IS NOT NULL
            `, [idUtilizador]);

            const disciplinaRes = await pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE c.tipo ILIKE '%Amarelo%') as amarelos,
                    COUNT(*) FILTER (WHERE c.tipo ILIKE '%Vermelho%') as vermelhos
                FROM cartao c
                JOIN evento e ON c.id_evento = e.id JOIN equipa_treinador et ON e.id_equipa = et.id_equipa
                WHERE et.id_treinador = $1 AND et.ativo = true AND c.equipa_propria = true AND e.tipo_evento::text ILIKE '%jogo%'
            `, [idUtilizador]);

            const topGolos = await pool.query(`
                SELECT COALESCE(u.nome_completo, u.nome) as nome, eq.nome as equipa, COUNT(g.id) as total
                FROM golo g JOIN evento e ON g.id_evento = e.id JOIN equipa eq ON e.id_equipa = eq.id
                JOIN equipa_treinador et ON eq.id = et.id_equipa JOIN atletas atl ON g.id_atleta = atl.id JOIN utilizador u ON atl.id_utilizador = u.id
                WHERE et.id_treinador = $1 AND et.ativo = true AND g.autogolo = false
                GROUP BY u.id, eq.id ORDER BY total DESC LIMIT 10
            `, [idUtilizador]);

            const topAssist = await pool.query(`
                SELECT COALESCE(u.nome_completo, u.nome) as nome, eq.nome as equipa, COUNT(g.id) as total
                FROM golo g JOIN evento e ON g.id_evento = e.id JOIN equipa eq ON e.id_equipa = eq.id
                JOIN equipa_treinador et ON eq.id = et.id_equipa JOIN atletas atl ON g.id_assistente = atl.id JOIN utilizador u ON atl.id_utilizador = u.id
                WHERE et.id_treinador = $1 AND et.ativo = true AND g.id_assistente IS NOT NULL
                GROUP BY u.id, eq.id ORDER BY total DESC LIMIT 10
            `, [idUtilizador]);

            const evolucaoJogos = await pool.query(`
                WITH ordenados AS (
                    SELECT eq.nome as equipa, to_char(e.data_hora, 'DD/MM') as data_real, COALESCE(rj.golos_nossa, 0) as golos,
                           ROW_NUMBER() OVER (PARTITION BY eq.id ORDER BY e.data_hora ASC) as num_jogo
                    FROM resultado_jogo rj JOIN evento e ON rj.id_evento = e.id 
                    JOIN equipa eq ON e.id_equipa = eq.id JOIN equipa_treinador et ON eq.id = et.id_equipa
                    WHERE et.id_treinador = $1 AND et.ativo = true AND e.tipo_evento::text ILIKE '%jogo%' AND e.data_hora IS NOT NULL
                )
                SELECT equipa, data_real, golos, 'Jogo ' || num_jogo as data FROM ordenados ORDER BY num_jogo ASC LIMIT 50;
            `, [idUtilizador]);

            // Histórico de jogos com estatísticas de match (remates, posse, cantos, faltas, foras)
            // Os dados extra estão em estatistica_jogo_match.dados (JSONB)
            const historicoJogos = await pool.query(`
                SELECT 
                    e.id, 
                    to_char(e.data_hora, 'DD/MM/YYYY HH24:MI') as data, 
                    eq.nome as equipa, 
                    eq.id_tipo_desporto,
                    e.equipa_rival, 
                    rj.golos_nossa, 
                    rj.golos_adversario,
                    ejm.dados as stats_extra
                FROM resultado_jogo rj 
                JOIN evento e ON rj.id_evento = e.id 
                JOIN equipa eq ON e.id_equipa = eq.id 
                JOIN equipa_treinador et ON eq.id = et.id_equipa
                LEFT JOIN estatistica_jogo_match ejm ON ejm.id_evento = e.id
                WHERE et.id_treinador = $1 AND et.ativo = true AND e.tipo_evento::text ILIKE '%jogo%' 
                ORDER BY e.data_hora DESC LIMIT 10
            `, [idUtilizador]);

            // 🆕 CORREÇÃO: as chaves do JSONB "dados" NÃO são fixas — são definidas
            // livremente pelo admin em desporto_estatistica.campo (ex: para um
            // desporto pode ser "remates", para outro "remates_totais", etc.).
            // Por isso já não assumimos nomes de chave fixos ("remates_nossa", ...).
            // Em vez disso vamos buscar a lista real de campos configurados para
            // os desportos das equipas deste treinador, e usamos essa lista (em JS)
            // para encontrar e agregar os valores corretos, sejam quais forem as
            // chaves usadas. Isto resolve o problema de estatísticas a aparecer
            // sempre vazias quando o "campo" configurado não batia certo com o
            // nome hardcoded que o dashboard esperava.
            const desportosEquipas = [...new Set(historicoJogos.rows.map(j => j.id_tipo_desporto).filter(Boolean))];

            let camposEstatisticas = [];
            if (desportosEquipas.length > 0) {
                const camposRes = await pool.query(
                    `SELECT DISTINCT campo, label, ordem FROM desporto_estatistica WHERE id_desporto = ANY($1::int[]) ORDER BY ordem ASC`,
                    [desportosEquipas]
                );
                camposEstatisticas = camposRes.rows;
            }

            // Calcula as médias em JavaScript (em vez de SQL fixo), usando os
            // "campo" reais configurados para o(s) desporto(s) deste treinador.
            // Convenção mantida do formulário (jogo.js): cada stat é gravada
            // como "<campo>_nossa" e "<campo>_adversario".
            const mediasStatsJogo = { jogos_com_stats: 0 };
            const somaPorCampo = {};
            let jogosComStats = 0;

            historicoJogos.rows.forEach(j => {
                if (!j.stats_extra) return;
                jogosComStats++;
                camposEstatisticas.forEach(({ campo }) => {
                    const valor = j.stats_extra[`${campo}_nossa`];
                    if (valor === undefined || valor === null) return;
                    if (!somaPorCampo[campo]) somaPorCampo[campo] = { soma: 0, count: 0 };
                    somaPorCampo[campo].soma += parseFloat(valor) || 0;
                    somaPorCampo[campo].count++;
                });
            });

            mediasStatsJogo.jogos_com_stats = jogosComStats;
            camposEstatisticas.forEach(({ campo }) => {
                const agregado = somaPorCampo[campo];
                mediasStatsJogo[`media_${campo}`] = agregado && agregado.count > 0
                    ? Math.round((agregado.soma / agregado.count) * 10) / 10
                    : null;
            });

            // TREINOS ---
            const treinosKpi = await pool.query(`
                SELECT COUNT(e.id) as realizados, COALESCE(AVG(e.duracao), 0) / 60.0 as duracao_media
                FROM evento e JOIN equipa_treinador et ON e.id_equipa = et.id_equipa
                WHERE et.id_treinador = $1 AND et.ativo = true AND e.tipo_evento::text ILIKE '%treino%' AND e.data_hora <= NOW()
            `, [idUtilizador]);

            const treinosPresenca = await pool.query(`
                SELECT eq.nome as equipa,
                       COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%presente%') as presentes,
                       COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%falta%') as faltas,
                       COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%atraso%') as atrasos,
                       COUNT(pe.id) as total
                FROM presenca_evento pe 
                JOIN evento e ON pe.id_evento = e.id 
                JOIN equipa eq ON e.id_equipa = eq.id 
                JOIN equipa_treinador et ON eq.id = et.id_equipa
                WHERE et.id_treinador = $1 AND et.ativo = true AND e.tipo_evento::text ILIKE '%treino%' 
                GROUP BY eq.nome
            `, [idUtilizador]);

            const treinosIntensidade = await pool.query(`
                WITH ordenados AS (
                    SELECT eq.nome as equipa, to_char(e.data_hora, 'DD/MM') as data_real, 
                           COALESCE(AVG(fe.rpe), 0) as rpe,
                           COALESCE(AVG(fe.fadiga), 0) as fadiga,
                           COALESCE(AVG(fe.sono), 0) as sono,
                           ROW_NUMBER() OVER (PARTITION BY eq.id ORDER BY e.data_hora ASC) as num_treino
                    FROM feedback_evento fe JOIN evento e ON fe.id_evento = e.id 
                    JOIN equipa eq ON e.id_equipa = eq.id 
                    JOIN equipa_treinador et ON eq.id = et.id_equipa
                    WHERE et.id_treinador = $1 AND et.ativo = true AND e.tipo_evento::text ILIKE '%treino%' AND e.data_hora IS NOT NULL
                    GROUP BY eq.id, eq.nome, e.data_hora
                )
                SELECT equipa, data_real, rpe, fadiga, sono, 'Treino ' || num_treino as data 
                FROM ordenados ORDER BY num_treino ASC LIMIT 50;
            `, [idUtilizador]);

            // Histórico de treinos com dados de presença e feedback
            // Inclui titulo e data para o link de navegação
            const historicoTreinos = await pool.query(`
                SELECT 
                    e.id,
                    e.titulo,
                    e.tipo_evento,
                    to_char(e.data_hora, 'DD/MM/YYYY HH24:MI') as data,
                    to_char(e.data_hora, 'DD MMM, HH24:MI') as data_display,
                    e.data_hora,
                    e.local,
                    e.duracao,
                    COUNT(pe.id) as total_atletas,
                    COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%presente%') as presentes,
                    COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%falta%') as faltas,
                    COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%atraso%') as atrasos,
                    ROUND(AVG(fe.rpe), 1) as rpe_medio,
                    ROUND(AVG(fe.fadiga), 1) as fadiga_media,
                    ROUND(AVG(fe.sono), 1) as sono_medio,
                    COUNT(fe.id) as total_feedback
                FROM evento e 
                JOIN equipa_treinador et ON e.id_equipa = et.id_equipa
                LEFT JOIN presenca_evento pe ON pe.id_evento = e.id
                LEFT JOIN feedback_evento fe ON fe.id_evento = e.id
                WHERE et.id_treinador = $1 AND et.ativo = true 
                  AND e.tipo_evento::text ILIKE '%treino%' 
                  AND e.data_hora <= NOW()
                GROUP BY e.id, e.titulo, e.tipo_evento, e.data_hora, e.local, e.duracao
                ORDER BY e.data_hora DESC
                LIMIT 20
            `, [idUtilizador]);

            // Atletas com mais faltas (ranking de ausências)
            const rankingFaltas = await pool.query(`
                SELECT 
                    COALESCE(u.nome_completo, u.nome) as nome,
                    eq.nome as equipa,
                    COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%falta%') as faltas,
                    COUNT(pe.id) as total_treinos
                FROM presenca_evento pe
                JOIN evento e ON pe.id_evento = e.id
                JOIN equipa eq ON e.id_equipa = eq.id
                JOIN equipa_treinador et ON eq.id = et.id_equipa
                JOIN utilizador u ON pe.id_atleta = u.id
                WHERE et.id_treinador = $1 AND et.ativo = true AND e.tipo_evento::text ILIKE '%treino%'
                GROUP BY u.id, eq.id
                HAVING COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%falta%') > 0
                ORDER BY faltas DESC
                LIMIT 10
            `, [idUtilizador]);

            // Feedback médio por treino (para gráfico)
            const feedbackTreinos = await pool.query(`
                WITH ordenados AS (
                    SELECT 
                        e.id,
                        e.titulo,
                        to_char(e.data_hora, 'DD/MM') as data_real,
                        ROUND(AVG(fe.rpe), 1) as rpe_medio,
                        ROUND(AVG(fe.fadiga), 1) as fadiga_media,
                        ROUND(AVG(fe.sono), 1) as sono_medio,
                        COUNT(fe.id) as respostas,
                        ROW_NUMBER() OVER (ORDER BY e.data_hora ASC) as num_treino
                    FROM feedback_evento fe
                    JOIN evento e ON fe.id_evento = e.id
                    JOIN equipa_treinador et ON e.id_equipa = et.id_equipa
                    WHERE et.id_treinador = $1 AND et.ativo = true AND e.tipo_evento::text ILIKE '%treino%'
                    GROUP BY e.id, e.titulo, e.data_hora
                )
                SELECT *, 'Treino ' || num_treino as label FROM ordenados ORDER BY num_treino ASC LIMIT 30
            `, [idUtilizador]);

            // Evolução presença total
            const evolucaoPresenca = await pool.query(`
                WITH ordenados AS (
                    SELECT 
                        to_char(e.data_hora, 'DD/MM') as data_real,
                        COUNT(pe.id) as total,
                        COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%presente%') as presentes,
                        ROUND(100.0 * COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%presente%') / NULLIF(COUNT(pe.id), 0), 1) as taxa_presenca,
                        ROW_NUMBER() OVER (ORDER BY e.data_hora ASC) as num
                    FROM evento e
                    JOIN equipa_treinador et ON e.id_equipa = et.id_equipa
                    LEFT JOIN presenca_evento pe ON pe.id_evento = e.id
                    WHERE et.id_treinador = $1 AND et.ativo = true AND e.tipo_evento::text ILIKE '%treino%' AND e.data_hora <= NOW()
                    GROUP BY e.id, e.data_hora
                )
                SELECT data_real, taxa_presenca, presentes, total, 'Treino ' || num as label FROM ordenados ORDER BY num ASC LIMIT 30
            `, [idUtilizador]);

            // 🆕 EXAMES FÍSICOS — Treinador vê os exames de TODOS os atletas das suas equipas
            const examesTreinador = await pool.query(`
                SELECT 
                    ef.id,
                    to_char(ef.criado_em, 'DD/MM/YYYY') as data,
                    to_char(ef.criado_em, 'DD MMM, HH24:MI') as data_display,
                    ef.tipo_exame,
                    ef.dados,
                    ef.observacoes,
                    COALESCE(u.nome_completo, u.nome) as nome_atleta,
                    eq.nome as equipa
                FROM exames_fisicos ef
                JOIN atletas a ON ef.id_atleta = a.id
                JOIN utilizador u ON a.id_utilizador = u.id
                JOIN evento e ON ef.id_evento = e.id
                JOIN equipa eq ON e.id_equipa = eq.id
                JOIN equipa_treinador et ON eq.id = et.id_equipa
                WHERE et.id_treinador = $1 AND et.ativo = true AND ef.ativo = true
                ORDER BY ef.criado_em DESC
                LIMIT 50
            `, [idUtilizador]);

            dadosCustomizados = { 
                kpis: { 
                    total_golos: kpisRes.rows[0]?.total_golos || 0,
                    total_jogos: kpisRes.rows[0]?.total_jogos || 0,
                    total_assistencias: assistRes.rows[0]?.total_assistencias || 0
                },
                historicoResultados: kpisRes.rows[0], 
                golos: topGolos.rows, 
                assistencias: topAssist.rows, 
                disciplina: disciplinaRes.rows[0],
                evolucaoJogos: evolucaoJogos.rows,
                historicoJogos: historicoJogos.rows,
                // 🆕 Médias globais de estatísticas de jogo (calculadas dinamicamente
                // a partir dos "campo" reais configurados para o desporto)
                mediasStatsJogo: mediasStatsJogo,
                camposEstatisticasJogo: camposEstatisticas,
                treinos: {
                    kpis: treinosKpi.rows[0] || { realizados: 0, duracao_media: 0 },
                    presencasEquipas: treinosPresenca.rows,
                    evolucaoIntensidade: treinosIntensidade.rows,
                    historico: historicoTreinos.rows,
                    rankingFaltas: rankingFaltas.rows,
                    feedbackSeries: feedbackTreinos.rows,
                    evolucaoPresenca: evolucaoPresenca.rows
                },
                // 🆕 Histórico de Exames Físicos (todos os atletas das equipas do treinador)
                exames: examesTreinador.rows
            };
        }

        // =========================================================================
        // 🏃‍♂️ LÓGICA DE DADOS: ATLETA
        // =========================================================================
        else if (papel === 'atleta') {
            const kpisAtleta = await pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM golo g WHERE g.id_atleta = a.id AND g.autogolo = false) as meus_golos,
                    (SELECT COUNT(*) FROM golo g WHERE g.id_assistente = a.id) as minhas_assists,
                    COALESCE(SUM(ej.minutos_jogados), 0) as meus_minutos, 
                    COUNT(ej.id_evento) as meus_jogos
                FROM atletas a LEFT JOIN estatistica_jogo ej ON ej.id_atleta = a.id
                WHERE a.id_utilizador = $1 GROUP BY a.id
            `, [idUtilizador]);

            // Jogos recentes do atleta com stats do match (para ele ver remates, posse, etc. do jogo)
            const historicoRecente = await pool.query(`
                SELECT 
                    e.id, 
                    to_char(e.data_hora, 'DD/MM/YYYY') as data_extensa, 
                    e.equipa_rival, 
                    rj.golos_nossa, 
                    rj.golos_adversario,
                    ej.minutos_jogados,
                    eq.id_tipo_desporto,
                    ejm.dados as stats_extra
                FROM atletas a 
                JOIN estatistica_jogo ej ON ej.id_atleta = a.id 
                JOIN evento e ON ej.id_evento = e.id
                JOIN equipa eq ON e.id_equipa = eq.id
                LEFT JOIN resultado_jogo rj ON e.id = rj.id_evento
                LEFT JOIN estatistica_jogo_match ejm ON ejm.id_evento = e.id
                WHERE a.id_utilizador = $1 AND e.tipo_evento::text ILIKE '%jogo%' 
                ORDER BY e.data_hora DESC LIMIT 10
            `, [idUtilizador]);

            // 🆕 CORREÇÃO: mesma lógica do treinador — usar os "campo" reais
            // configurados em desporto_estatistica em vez de chaves fixas,
            // para que as médias batam certo com o que foi realmente gravado.
            const desportosEquipasAtleta = [...new Set(historicoRecente.rows.map(j => j.id_tipo_desporto).filter(Boolean))];

            let camposEstatisticasAtleta = [];
            if (desportosEquipasAtleta.length > 0) {
                const camposResAtleta = await pool.query(
                    `SELECT DISTINCT campo, label, ordem FROM desporto_estatistica WHERE id_desporto = ANY($1::int[]) ORDER BY ordem ASC`,
                    [desportosEquipasAtleta]
                );
                camposEstatisticasAtleta = camposResAtleta.rows;
            }

            const minutosValidos = historicoRecente.rows.map(j => j.minutos_jogados).filter(v => v !== null && v !== undefined);
            const mediasStatsAtleta = {
                jogos_com_stats: historicoRecente.rows.filter(j => j.stats_extra).length,
                media_minutos: minutosValidos.length > 0
                    ? Math.round(minutosValidos.reduce((a, b) => a + (parseFloat(b) || 0), 0) / minutosValidos.length)
                    : null
            };
            const somaPorCampoAtleta = {};
            historicoRecente.rows.forEach(j => {
                if (!j.stats_extra) return;
                camposEstatisticasAtleta.forEach(({ campo }) => {
                    const valor = j.stats_extra[`${campo}_nossa`];
                    if (valor === undefined || valor === null) return;
                    if (!somaPorCampoAtleta[campo]) somaPorCampoAtleta[campo] = { soma: 0, count: 0 };
                    somaPorCampoAtleta[campo].soma += parseFloat(valor) || 0;
                    somaPorCampoAtleta[campo].count++;
                });
            });
            camposEstatisticasAtleta.forEach(({ campo }) => {
                const agregado = somaPorCampoAtleta[campo];
                mediasStatsAtleta[`media_${campo}_equipa`] = agregado && agregado.count > 0
                    ? Math.round((agregado.soma / agregado.count) * 10) / 10
                    : null;
            });

            const evolucaoMinutos = await pool.query(`
                WITH ordenados AS (
                    SELECT 'A Minha Prestação' as equipa, to_char(e.data_hora, 'DD/MM') as data_real, COALESCE(ej.minutos_jogados, 0) as golos,
                           ROW_NUMBER() OVER (ORDER BY e.data_hora ASC) as num_jogo
                    FROM atletas a JOIN estatistica_jogo ej ON ej.id_atleta = a.id JOIN evento e ON ej.id_evento = e.id
                    WHERE a.id_utilizador = $1 AND e.tipo_evento::text ILIKE '%jogo%' AND e.data_hora IS NOT NULL
                )
                SELECT equipa, data_real, golos, 'Jogo ' || num_jogo as data FROM ordenados ORDER BY num_jogo ASC LIMIT 30;
            `, [idUtilizador]);

            const queryResultadosAtleta = `
                SELECT COUNT(*) FILTER (WHERE rj.golos_nossa > rj.golos_adversario) as vitorias,
                       COUNT(*) FILTER (WHERE rj.golos_nossa = rj.golos_adversario) as empates,
                       COUNT(*) FILTER (WHERE rj.golos_nossa < rj.golos_adversario) as derrotas
                FROM resultado_jogo rj JOIN evento e ON rj.id_evento = e.id JOIN estatistica_jogo ej ON e.id = ej.id_evento
                JOIN atletas a ON ej.id_atleta = a.id WHERE a.id_utilizador = $1 AND e.tipo_evento::text ILIKE '%jogo%'
            `;
            const resultadosAtletaRes = await pool.query(queryResultadosAtleta, [idUtilizador]);

            // Rankings da Equipa do Atleta
            const topGolosAtleta = await pool.query(`
                SELECT COALESCE(u.nome_completo, u.nome) as nome, eq.nome as equipa, COUNT(g.id) as total
                FROM golo g JOIN evento e ON g.id_evento = e.id JOIN equipa eq ON e.id_equipa = eq.id
                JOIN atletas atl ON g.id_atleta = atl.id JOIN utilizador u ON atl.id_utilizador = u.id
                WHERE eq.id IN (SELECT id_equipa FROM equipa_atleta WHERE id_atleta = (SELECT id FROM atletas WHERE id_utilizador = $1 LIMIT 1) AND ativo = true) 
                AND g.autogolo = false GROUP BY u.id, eq.id ORDER BY total DESC LIMIT 10
            `, [idUtilizador]);

            const topAssistsAtleta = await pool.query(`
                SELECT COALESCE(u.nome_completo, u.nome) as nome, eq.nome as equipa, COUNT(g.id) as total
                FROM golo g JOIN evento e ON g.id_evento = e.id JOIN equipa eq ON e.id_equipa = eq.id
                JOIN atletas atl ON g.id_assistente = atl.id JOIN utilizador u ON atl.id_utilizador = u.id
                WHERE eq.id IN (SELECT id_equipa FROM equipa_atleta WHERE id_atleta = (SELECT id FROM atletas WHERE id_utilizador = $1 LIMIT 1) AND ativo = true) 
                AND g.id_assistente IS NOT NULL GROUP BY u.id, eq.id ORDER BY total DESC LIMIT 10
            `, [idUtilizador]);

            // Treinos do Atleta - KPIs de assiduidade
            // NOTA: presenca_evento.id_atleta guarda utilizador.id diretamente
            const treinosKpi = await pool.query(`
                SELECT 
                    COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%presente%') as treinos_realizados,
                    COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%falta%') as treinos_faltou,
                    COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%atraso%') as treinos_atraso,
                    COUNT(pe.id) as total_treinos,
                    ROUND(100.0 * COUNT(pe.id) FILTER (WHERE pe.estado ILIKE '%presente%') / NULLIF(COUNT(pe.id), 0), 1) as taxa_presenca
                FROM presenca_evento pe 
                JOIN evento e ON pe.id_evento = e.id 
                WHERE pe.id_atleta = $1 AND e.tipo_evento::text ILIKE '%treino%'
            `, [idUtilizador]);

            // Histórico de treinos do atleta com estado de presença
            const historicoTreinos = await pool.query(`
                SELECT 
                    e.id,
                    e.titulo,
                    to_char(e.data_hora, 'DD/MM/YYYY') as data,
                    to_char(e.data_hora, 'DD MMM, HH24:MI') as data_display,
                    e.local,
                    pe.estado,
                    pe.notas,
                    fe.rpe,
                    fe.fadiga,
                    fe.sono,
                    fe.observacoes as feedback_obs
                FROM evento e
                JOIN atletas a ON a.id_utilizador = $1
                LEFT JOIN presenca_evento pe ON pe.id_evento = e.id AND pe.id_atleta = a.id_utilizador
                LEFT JOIN feedback_evento fe ON fe.id_evento = e.id AND fe.id_atleta = a.id
                JOIN equipa_atleta ea ON ea.id_atleta = a.id_utilizador AND ea.id_equipa = e.id_equipa AND ea.ativo = true
                WHERE e.tipo_evento::text ILIKE '%treino%' AND e.data_hora <= NOW()
                ORDER BY e.data_hora DESC
                LIMIT 20
            `, [idUtilizador]);

            // Evolução RPE/Fadiga/Sono do atleta
            const evolucaoFadiga = await pool.query(`
                WITH ordenados AS (
                    SELECT 
                        to_char(e.data_hora, 'DD/MM') as data_real, 
                        COALESCE(fe.rpe, 0) as rpe,
                        COALESCE(fe.fadiga, 0) as fadiga,
                        COALESCE(fe.sono, 0) as sono,
                        ROW_NUMBER() OVER (ORDER BY e.data_hora ASC) as num_treino
                    FROM feedback_evento fe 
                    JOIN evento e ON fe.id_evento = e.id 
                    JOIN atletas a ON fe.id_atleta = a.id
                    WHERE a.id_utilizador = $1 AND e.tipo_evento::text ILIKE '%treino%' AND e.data_hora IS NOT NULL
                )
                SELECT data_real, rpe, fadiga, sono, 'Treino ' || num_treino as label 
                FROM ordenados ORDER BY num_treino ASC LIMIT 30;
            `, [idUtilizador]);

            // 🆕 EXAMES FÍSICOS — Atleta vê apenas os SEUS próprios exames
            const examesAtleta = await pool.query(`
                SELECT 
                    ef.id,
                    to_char(ef.criado_em, 'DD/MM/YYYY') as data,
                    to_char(ef.criado_em, 'DD MMM, HH24:MI') as data_display,
                    ef.tipo_exame,
                    ef.dados,
                    ef.observacoes
                FROM exames_fisicos ef
                JOIN atletas a ON ef.id_atleta = a.id
                WHERE a.id_utilizador = $1 AND ef.ativo = true
                ORDER BY ef.criado_em DESC
                LIMIT 50
            `, [idUtilizador]);

            dadosCustomizados = { 
                kpis: kpisAtleta.rows[0] || { meus_golos: 0, minhas_assists: 0, meus_minutos: 0, meus_jogos: 0 }, 
                historicoJogos: historicoRecente.rows,
                evolucaoMinutos: evolucaoMinutos.rows,
                historicoResultados: resultadosAtletaRes.rows[0],
                rankingGolos: topGolosAtleta.rows,
                rankingAssists: topAssistsAtleta.rows,
                // 🆕 Médias de stats de jogo para atleta (contexto da equipa)
                mediasStatsAtleta: mediasStatsAtleta,
                camposEstatisticasJogo: camposEstatisticasAtleta,
                treinos: {
                    kpis: treinosKpi.rows[0] || { treinos_realizados: 0, total_treinos: 0, taxa_presenca: 0, treinos_faltou: 0, treinos_atraso: 0 },
                    evolucaoFadiga: evolucaoFadiga.rows,
                    historico: historicoTreinos.rows
                },
                // 🆕 Histórico de Exames Físicos (apenas os do próprio atleta)
                exames: examesAtleta.rows
            };
        }

        // =========================================================================
        // 🏢 LÓGICA DE DADOS: GESTOR
        // =========================================================================
        else if (papel === 'gestor') {
            const totaisRes = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM equipa WHERE id_clube = (SELECT id FROM clube WHERE id_gestor = $1 LIMIT 1)) as equipas,
                    (SELECT COUNT(DISTINCT ea.id_atleta) FROM equipa_atleta ea JOIN equipa e ON ea.id_equipa = e.id JOIN clube c ON e.id_clube = c.id WHERE c.id_gestor = $1 AND ea.ativo = true) as atletas,
                    (SELECT COUNT(DISTINCT et.id_treinador) FROM equipa_treinador et JOIN equipa e ON et.id_equipa = e.id JOIN clube c ON e.id_clube = c.id WHERE c.id_gestor = $1 AND et.ativo = true) as treinadores
            `, [idUtilizador]);

            // Aproveitamento por equipa (% de vitórias) - independente da modalidade,
            // pois usa resultado_jogo (golos_nossa/golos_adversario), que serve de "pontuação"
            // genérica para qualquer desporto (futebol, andebol, basquete, etc.)
            const eficacioEquipas = await pool.query(`
                SELECT 
                    e.nome as equipa,
                    COUNT(rj.id) as jogos,
                    COUNT(*) FILTER (WHERE rj.golos_nossa > rj.golos_adversario) as vitorias,
                    ROUND(
                        100.0 * COUNT(*) FILTER (WHERE rj.golos_nossa > rj.golos_adversario) / COUNT(rj.id), 1
                    ) as total
                FROM resultado_jogo rj
                JOIN evento ev ON rj.id_evento = ev.id
                JOIN equipa e ON ev.id_equipa = e.id
                JOIN clube c ON e.id_clube = c.id
                WHERE c.id_gestor = $1 AND ev.tipo_evento::text ILIKE '%jogo%'
                GROUP BY e.nome
                ORDER BY total DESC, jogos DESC
                LIMIT 5
            `, [idUtilizador]);

            const resultadosClubeRes = await pool.query(`
                SELECT COUNT(*) FILTER (WHERE rj.golos_nossa > rj.golos_adversario) as vitorias,
                       COUNT(*) FILTER (WHERE rj.golos_nossa = rj.golos_adversario) as empates,
                       COUNT(*) FILTER (WHERE rj.golos_nossa < rj.golos_adversario) as derrotas
                FROM resultado_jogo rj JOIN evento e ON rj.id_evento = e.id JOIN equipa eq ON e.id_equipa = eq.id
                JOIN clube c ON eq.id_clube = c.id WHERE c.id_gestor = $1 AND e.tipo_evento::text ILIKE '%jogo%'
            `, [idUtilizador]);

            const disciplinaClubeRes = await pool.query(`
                SELECT COUNT(*) FILTER (WHERE ca.tipo ILIKE '%Amarelo%') as amarelos,
                       COUNT(*) FILTER (WHERE ca.tipo ILIKE '%Vermelho%') as vermelhos
                FROM cartao ca JOIN evento e ON ca.id_evento = e.id JOIN equipa eq ON e.id_equipa = eq.id
                JOIN clube c ON eq.id_clube = c.id WHERE c.id_gestor = $1 AND ca.equipa_propria = true AND e.tipo_evento::text ILIKE '%jogo%'
            `, [idUtilizador]);

            const historicoJogosGestor = await pool.query(`
                SELECT e.id, to_char(e.data_hora, 'DD/MM/YYYY HH24:MI') as data, eq.nome as equipa, e.equipa_rival, rj.golos_nossa, rj.golos_adversario
                FROM resultado_jogo rj 
                JOIN evento e ON rj.id_evento = e.id 
                JOIN equipa eq ON e.id_equipa = eq.id
                JOIN clube c ON eq.id_clube = c.id
                WHERE c.id_gestor = $1 AND e.tipo_evento::text ILIKE '%jogo%'
                ORDER BY e.data_hora DESC LIMIT 10
            `, [idUtilizador]);

            dadosCustomizados = {
                kpis: totaisRes.rows[0],
                rankingEquipas: eficacioEquipas.rows,
                historicoResultados: resultadosClubeRes.rows[0],
                disciplinaClube: disciplinaClubeRes.rows[0],
                historicoJogos: historicoJogosGestor.rows
            };
        }

        res.json({ success: true, role: papel, dados: dadosCustomizados });

    } catch (erro) {
        console.error("Erro catastrófico nas estatísticas:", erro.message);
        res.status(500).json({ success: false, error: 'Erro SQL: ' + erro.message });
    }
};