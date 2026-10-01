// controllers/TreinadorController.js
const path = require('path');
const { pool } = require('../database/connection');

const PDFDocument = require('pdfkit');

const enviarConteudoOuMoldura = (req, res, ficheiroMetodo) => {
    if (req.headers['x-solicitado-por'] === 'SPA') {
        return res.sendFile(ficheiroMetodo);
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'dashboard.html'));
};

exports.getTreinadorIndex = (req, res) => {
    enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'treinador', 'treinador_index.html'));
};

exports.getEquipaTreinador = (req, res) => {
    enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'treinador', 'treinador_equipa.html'));
};

exports.getTreinadorJogo = (req, res) => {
    enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'treinador', 'treinador_jogo.html'));
};

exports.getJogoDados = async (req, res) => {
    try {
        const userId = req.session.userId;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Sessão expirada ou utilizador não autenticado.' });
        }

        // ── 0. Obter o Tipo/Cargo do Utilizador Atual ──
        const utilRes = await pool.query(
            'SELECT tipo_utilizador FROM utilizador WHERE id = $1',
            [userId]
        );
        if (utilRes.rows.length === 0) {
            return res.status(404).json({ error: 'Utilizador não encontrado.' });
        }
        
        const userRole = utilRes.rows[0].tipo_utilizador ? utilRes.rows[0].tipo_utilizador.toLowerCase() : 'atleta';

        // ── 1. Obter Dados do Evento/Jogo ───────────────────────────
        const eventoRes = await pool.query(
            `SELECT ev.id, ev.titulo, ev.data_hora, ev.local, ev.equipa_rival, ev.equipa_rival_imagem,
                    ev.oficial, ev.id_competicao, ev.id_escalao, ev.id_equipa,
                    e.nome AS nome_equipa, e.id_tipo_desporto,
                    c.logo_url AS logo_nossa, c.nome AS nome_clube,
                    d.nome AS nome_desporto,
                    comp.nome AS nome_competicao, comp.url_imagem AS imagem_competicao
             FROM evento ev
             JOIN equipa e ON ev.id_equipa = e.id
             JOIN clube c ON e.id_clube = c.id
             LEFT JOIN desporto d ON e.id_tipo_desporto = d.id
             LEFT JOIN competicao comp ON ev.id_competicao = comp.id
             WHERE ev.id = $1`,
            [id]
        );
        if (eventoRes.rows.length === 0) return res.status(404).json({ error: 'Jogo não encontrado.' });
        const evento = eventoRes.rows[0];

        // ── 2. Obter Atletas do Escalão/Equipa do Jogo ───────────
        const atletasRes = await pool.query(
            `SELECT DISTINCT 
                atl.id AS id, 
                COALESCE(u.nome_completo, u.nome) AS nome_completo,
                u.id AS id_utilizador
             FROM equipa_atleta ea
             JOIN utilizador u ON ea.id_atleta = u.id
             JOIN atletas atl ON atl.id_utilizador = u.id
             WHERE ea.id_equipa = $1 AND ea.ativo = true
             ORDER BY nome_completo ASC`,
            [evento.id_equipa]
        );

        // ── 3. Obter Lista de Convocados para o Jogo ────────
        const convocatoriaRes = await pool.query(
            `SELECT 
                conv.id AS id_convocatoria, 
                conv.id_atleta AS id_atleta,
                conv.id_atleta AS id, 
                conv.estado, 
                conv.notas,
                u.id AS id_utilizador, 
                COALESCE(u.nome_completo, u.nome) AS nome_completo
             FROM convocatoria conv
             JOIN atletas atl ON conv.id_atleta = atl.id
             JOIN utilizador u ON atl.id_utilizador = u.id
             WHERE conv.id_evento = $1
             ORDER BY nome_completo ASC`,
            [id]
        );

        // ── 4. Resultados, Golos, Stats e Cartões ───────────────────
        const resultadoRes = await pool.query('SELECT * FROM resultado_jogo WHERE id_evento = $1', [id]);
        
        const golosRes = await pool.query(
            `SELECT g.id, g.id_atleta, g.nome_marcador, g.minuto, g.equipa_propria, g.autogolo,
                    g.id_assistente, g.nome_assistente AS nome_assistente_texto,
                    COALESCE(u.nome_completo, u.nome, g.nome_marcador) AS nome_completo,
                    COALESCE(ua.nome_completo, ua.nome, g.nome_assistente) AS nome_assistente_atleta
             FROM golo g
             LEFT JOIN atletas atl ON g.id_atleta = atl.id
             LEFT JOIN utilizador u ON atl.id_utilizador = u.id
             LEFT JOIN atletas atla ON g.id_assistente = atla.id
             LEFT JOIN utilizador ua ON atla.id_utilizador = ua.id
             WHERE g.id_evento = $1
             ORDER BY g.minuto ASC NULLS LAST`,
            [id]
        );

        const statsRes = await pool.query('SELECT dados FROM estatistica_jogo_match WHERE id_evento = $1', [id]);
        
        const atletaStatsRes = await pool.query(
            `SELECT ej.id_atleta, ej.minutos_jogados, ej.notas, u.nome_completo
             FROM estatistica_jogo ej
             LEFT JOIN atletas atl ON ej.id_atleta = atl.id
             LEFT JOIN utilizador u ON atl.id_utilizador = u.id
             WHERE ej.id_evento = $1`,
            [id]
        );

        const cartoesRes = await pool.query(
            `SELECT c.id, c.id_atleta, c.nome_jogador, c.minuto, c.tipo, c.equipa_propria,
                    COALESCE(u.nome_completo, c.nome_jogador) AS nome_completo
             FROM cartao c
             LEFT JOIN atletas atl ON c.id_atleta = atl.id
             LEFT JOIN utilizador u ON atl.id_utilizador = u.id
             WHERE c.id_evento = $1
             ORDER BY c.minuto ASC NULLS LAST`,
            [id]
        );

        const penalidadesRes = await pool.query(
            `SELECT p.id, p.id_atleta, p.nome_cobrador, p.minuto, p.convertida, p.equipa_propria,
                    COALESCE(u.nome_completo, u.nome, p.nome_cobrador) AS nome_completo
             FROM penalidade p
             LEFT JOIN atletas atl ON p.id_atleta = atl.id
             LEFT JOIN utilizador u ON atl.id_utilizador = u.id
             WHERE p.id_evento = $1
             ORDER BY p.minuto ASC NULLS LAST`,
            [id]
        );

        // ── 5. Configuração do Desporto e Estatísticas Dinâmicas ────
        let configDesporto = null;
        if (evento.id_tipo_desporto) {
            const cfgRes = await pool.query('SELECT * FROM desporto_config WHERE id_desporto = $1', [evento.id_tipo_desporto]);
            const statsDesportoRes = await pool.query(
                'SELECT campo, label FROM desporto_estatistica WHERE id_desporto = $1 ORDER BY ordem ASC',
                [evento.id_tipo_desporto]
            );

            // Mapeamos os campos explicitamente como [{ campo: '...', label: '...' }] para o jogo.js ler sem falhas
            const estatisticasModalidade = statsDesportoRes.rows.map(row => ({
                campo: row.campo,
                label: row.label
            }));

            // Inicializar o objeto com os dados base que vieram do desporto_config (ou um objeto vazio se não houver config de ecrã)
            const baseConfig = cfgRes.rows.length > 0 ? cfgRes.rows[0] : {
                unidade_pontuacao: 'Golo',
                tem_cartoes: true,
                tem_assistencias: true
            };

            configDesporto = { 
                ...baseConfig, 
                estatisticas: estatisticasModalidade,
                modalidade: evento.nome_desporto 
            };
        }

        const jogoPassado = new Date(evento.data_hora) < new Date();

        // ── 6. Resposta JSON ────────────────────────────────────────
        res.json({
            utilizador: {
                role: userRole
            },
            evento,
            atletas: atletasRes.rows,
            convocatoria: convocatoriaRes.rows,
            resultado: resultadoRes.rows[0] || null,
            golos: golosRes.rows,
            cartoes: cartoesRes.rows,
            penalidades: penalidadesRes.rows,
            estatisticas: statsRes.rows[0]?.dados || {},
            atleta_stats: atletaStatsRes.rows,
            config_desporto: configDesporto,
            jogoPassado
        });
    } catch (err) {
        console.error('Erro ao obter dados do jogo:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.guardarResultado = async (req, res) => {
    try {
        const { id } = req.params;
        const { golos_nossa, golos_adversario } = req.body;
        await pool.query(
            `INSERT INTO resultado_jogo (id_evento, golos_nossa, golos_adversario)
             VALUES ($1, $2, $3)
             ON CONFLICT (id_evento) DO UPDATE SET golos_nossa = $2, golos_adversario = $3`,
            [id, golos_nossa, golos_adversario]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.adicionarGolo = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_atleta, nome_marcador, minuto, equipa_propria, autogolo, id_assistente, nome_assistente } = req.body;
        const isAutogolo = Boolean(autogolo);
        const equipaPropria = isAutogolo ? !Boolean(equipa_propria) : Boolean(equipa_propria);
        const r = await pool.query(
            `INSERT INTO golo (id_evento, id_atleta, nome_marcador, minuto, equipa_propria, autogolo, id_assistente, nome_assistente)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [id, id_atleta || null, nome_marcador || null, minuto || null, equipaPropria, isAutogolo, id_assistente || null, nome_assistente || null]
        );

        // Atualizar contagem no resultado_jogo
        if (equipaPropria) {
            await pool.query(
                `INSERT INTO resultado_jogo (id_evento, golos_nossa, golos_adversario) VALUES ($1, 1, 0)
                 ON CONFLICT (id_evento) DO UPDATE SET golos_nossa = resultado_jogo.golos_nossa + 1`,
                [id]
            );
        } else {
            await pool.query(
                `INSERT INTO resultado_jogo (id_evento, golos_nossa, golos_adversario) VALUES ($1, 0, 1)
                 ON CONFLICT (id_evento) DO UPDATE SET golos_adversario = resultado_jogo.golos_adversario + 1`,
                [id]
            );
        }
        res.json({ success: true, id: r.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.removerGolo = async (req, res) => {
    try {
        const { idGolo } = req.params;
        const goloRes = await pool.query('SELECT * FROM golo WHERE id = $1', [idGolo]);
        if (goloRes.rows.length === 0) return res.status(404).json({ error: 'Golo não encontrado.' });
        const golo = goloRes.rows[0];

        await pool.query('DELETE FROM golo WHERE id = $1', [idGolo]);

        if (golo.equipa_propria) {
            await pool.query(
                `UPDATE resultado_jogo SET golos_nossa = GREATEST(0, golos_nossa - 1) WHERE id_evento = $1`,
                [golo.id_evento]
            );
        } else {
            await pool.query(
                `UPDATE resultado_jogo SET golos_adversario = GREATEST(0, golos_adversario - 1) WHERE id_evento = $1`,
                [golo.id_evento]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.guardarConvocatoria = async (req, res) => {
    const { id } = req.params; 
    const { atletas } = req.body; 

    if (!Array.isArray(atletas)) {
        return res.status(400).json({ error: 'Os dados dos atletas devem ser transmitidos num array.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Limpar a convocatória existente para este evento
        await client.query(
            'DELETE FROM convocatoria WHERE id_evento = $1',
            [id]
        );

        // 2. Inserir os novos atletas selecionados (se existirem)
        if (atletas.length > 0) {
            for (const idAtleta of atletas) {
                await client.query(
                    `INSERT INTO convocatoria (id_evento, id_atleta, estado)
                     VALUES ($1, $2, $3)`,
                    [id, idAtleta, 'Convocado']
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Convocatória atualizada com sucesso!' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao guardar convocatória:', err);
        res.status(500).json({ error: 'Erro interno ao processar a convocatória: ' + err.message });
    } finally {
        client.release();
    }
};

exports.adicionarCartao = async (req, res) => {
    try {
        const { id } = req.params;
        let { id_atleta, nome_jogador, minuto, tipo, equipa_propria } = req.body;

        // [CORREÇÃO DEFINITIVA] A BD rejeitou '2 minutos', portanto espera '2min'
        if (tipo === '2 minutos' || tipo === '2min') {
            tipo = '2min';
        } else if (tipo) {
            tipo = tipo.toLowerCase().trim(); // Garante 'amarelo' ou 'vermelho'
        }

        await pool.query(
            `INSERT INTO cartao (id_evento, id_atleta, nome_jogador, minuto, tipo, equipa_propria)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                id, 
                id_atleta || null, 
                nome_jogador || null, 
                minuto ? parseInt(minuto) : null, 
                tipo, 
                Boolean(equipa_propria)
            ]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao inserir cartão na BD:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.removerCartao = async (req, res) => {
    try {
        const { idCartao } = req.params;
        await pool.query('DELETE FROM cartao WHERE id = $1', [idCartao]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.adicionarPenalidade = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_atleta, nome_cobrador, minuto, convertida, equipa_propria } = req.body;
        const isConvertida = Boolean(convertida);
        const equipaPropria = Boolean(equipa_propria);

        const r = await pool.query(
            `INSERT INTO penalidade (id_evento, id_atleta, nome_cobrador, minuto, convertida, equipa_propria)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [id, id_atleta || null, nome_cobrador || null, minuto || null, isConvertida, equipaPropria]
        );

        // Se convertida, conta como golo no resultado
        if (isConvertida) {
            if (equipaPropria) {
                await pool.query(
                    `INSERT INTO resultado_jogo (id_evento, golos_nossa, golos_adversario) VALUES ($1, 1, 0)
                     ON CONFLICT (id_evento) DO UPDATE SET golos_nossa = resultado_jogo.golos_nossa + 1`,
                    [id]
                );
            } else {
                await pool.query(
                    `INSERT INTO resultado_jogo (id_evento, golos_nossa, golos_adversario) VALUES ($1, 0, 1)
                     ON CONFLICT (id_evento) DO UPDATE SET golos_adversario = resultado_jogo.golos_adversario + 1`,
                    [id]
                );
            }
        }

        res.json({ success: true, id: r.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.removerPenalidade = async (req, res) => {
    try {
        const { idPenalidade } = req.params;
        const penRes = await pool.query('SELECT * FROM penalidade WHERE id = $1', [idPenalidade]);
        if (penRes.rows.length === 0) return res.status(404).json({ error: 'Penalidade não encontrada.' });
        const pen = penRes.rows[0];

        await pool.query('DELETE FROM penalidade WHERE id = $1', [idPenalidade]);

        // Se era convertida, subtrai do resultado
        if (pen.convertida) {
            if (pen.equipa_propria) {
                await pool.query(
                    `UPDATE resultado_jogo SET golos_nossa = GREATEST(0, golos_nossa - 1) WHERE id_evento = $1`,
                    [pen.id_evento]
                );
            } else {
                await pool.query(
                    `UPDATE resultado_jogo SET golos_adversario = GREATEST(0, golos_adversario - 1) WHERE id_evento = $1`,
                    [pen.id_evento]
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.guardarEstatisticas = async (req, res) => {
    try {
        const { id } = req.params;
        // O node-postgres não serializa objetos automaticamente para colunas jsonb:
        // é preciso passar a string JSON explicitamente, senão o INSERT falha
        // (ou grava algo inválido) e os dados nunca chegam à tabela —
        // esta era a razão de "Remates / Posse / Faltas..." aparecerem sempre vazios.
        await pool.query(
            `INSERT INTO estatistica_jogo_match (id_evento, dados) VALUES ($1, $2)
             ON CONFLICT (id_evento) DO UPDATE SET dados = $2`,
            [id, JSON.stringify(req.body)]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao guardar estatísticas de jogo:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.guardarEstatisticasAtletas = async (req, res) => {
    try {
        const { id } = req.params;
        const { atletas } = req.body;
        for (const a of atletas) {
            await pool.query(
                `INSERT INTO estatistica_jogo (id_evento, id_atleta, minutos_jogados, notas)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (id_evento, id_atleta) DO UPDATE SET minutos_jogados = $3, notas = $4`,
                [id, a.id_atleta, a.minutos_jogados ?? null, a.notas ?? null]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.guardarDetalhesTreinador = async (req, res) => {
    const client = await pool.connect();
    try {
        const id_utilizador = req.session.userId;
        const { nome_completo, data_nascimento, sexo, grau_treinador, id_desporto, pais, regiao } = req.body;

        if (!nome_completo || !data_nascimento || !sexo || !grau_treinador || !id_desporto || !pais || !regiao) {
            return res.status(400).json({ success: false, message: "Todos os campos da ficha de treinador são obrigatórios." });
        }

        await client.query('BEGIN');
        await client.query(
            "UPDATE utilizador SET tipo_utilizador = 'TREINADOR', nome_completo = $1 WHERE id = $2",
            [nome_completo.trim(), id_utilizador]
        );

        const localizacao = `${regiao.trim()}, ${pais.trim()}`;

        // Gestor pode ter criado linha parcial com id_desporto; UPDATE se já existir
        const existente = await client.query('SELECT id_utilizador FROM treinadores WHERE id_utilizador = $1', [id_utilizador]);
        if (existente.rows.length > 0) {
            await client.query(
                `UPDATE treinadores SET data_nascimento=$2, sexo=$3, grau_treinador=$4, id_desporto=$5, cidade=$6 WHERE id_utilizador=$1`,
                [id_utilizador, data_nascimento, sexo, grau_treinador.trim(), parseInt(id_desporto), localizacao]
            );
        } else {
            await client.query(
                `INSERT INTO treinadores (id_utilizador, data_nascimento, sexo, grau_treinador, id_desporto, cidade) VALUES ($1, $2, $3, $4, $5, $6)`,
                [id_utilizador, data_nascimento, sexo, grau_treinador.trim(), parseInt(id_desporto), localizacao]
            );
        }
        await client.query('COMMIT');

        return res.status(200).json({ success: true, redirectTo: '/mngr/treinador/treinador_index' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao salvar dados do Treinador:", err);
        return res.status(500).json({ success: false, message: "Erro de servidor ao criar o perfil de treinador." });
    } finally {
        client.release();
    }
};

exports.getDashboard = async (req, res) => {
    const treinadorId = req.session.userId;
    try {
        const dadosGeraisQuery = await pool.query(
            `SELECT 
                e.id AS id_equipa, e.nome AS equipa_nome, c.nome AS clube_nome,
                c.regiao AS clube_regiao, c.pais AS clube_pais, c.logo_url AS clube_logo
            FROM equipa_treinador et
            INNER JOIN equipa e ON et.id_equipa = e.id
            INNER JOIN clube c ON e.id_clube = c.id
            WHERE et.id_treinador = $1 AND et.ativo = true
            ORDER BY et.data_entrada DESC LIMIT 1`,
            [treinadorId]
        );

        if (dadosGeraisQuery.rows.length === 0) {
            return res.json({
                equipa: { nome: "Sem Equipa", clube: "N/A", regiao: "N/A", pais: "N/A", logo: "https://dummyimage.com/150x150/e2e8f0/627d98.png&text=Sem+Clube" },
                ultimoEvento: null,
                proximoEvento: null,
                classificacoes: []
            });
        }

        const dadosPrincipais = dadosGeraisQuery.rows[0];
        const equipaId = dadosPrincipais.id_equipa;

        const ultimoEventoQuery = await pool.query(
            `SELECT id, tipo_evento, titulo, data_hora, equipa_rival_imagem AS logo_adversario_url
             FROM evento
             WHERE id_equipa = $1 AND data_hora < NOW() AND COALESCE(estado::text, 'ativo') <> 'inativo'
             ORDER BY data_hora DESC LIMIT 1`,
            [equipaId]
        );

        const proximoEventoQuery = await pool.query(
            `SELECT id, tipo_evento, titulo, data_hora, equipa_rival_imagem AS logo_adversario_url
             FROM evento
             WHERE id_equipa = $1 AND data_hora >= NOW() AND COALESCE(estado::text, 'ativo') <> 'inativo'
             ORDER BY data_hora ASC LIMIT 1`,
            [equipaId]
        );

        // 🌟 ATUALIZADO: Selecionar também o campo c.fase_inicial da tabela
        const competicoesQuery = await pool.query(
            `SELECT DISTINCT c.id, c.nome, c.id_equipa, 
                             LOWER(COALESCE(c.tipo, 'liga')) AS tipo_competicao,
                             COALESCE(c.nparticipantes, 0) AS nparticipantes,
                             c.fase_inicial
             FROM competicao c
             WHERE c.id_equipa = $1
             ORDER BY c.id DESC`,
            [equipaId]
        );

        const classificacoesPorCompeticao = [];

        for (const comp of competicoesQuery.rows) {
            const jogosQuery = await pool.query(
                `SELECT
                    ev.id AS id_evento,
                    ev.id_equipa,
                    rj.golos_nossa,
                    rj.golos_adversario,
                    e.nome AS nome_equipa,
                    c.logo_url AS logo_equipa
                FROM evento ev
                INNER JOIN resultado_jogo rj ON ev.id = rj.id_evento
                INNER JOIN equipa e ON ev.id_equipa = e.id
                LEFT JOIN clube c ON e.id_clube = c.id
                WHERE ev.id_competicao = $1
                  AND ev.data_hora < NOW()
                ORDER BY ev.data_hora ASC`,
                [comp.id]
            );

            if (jogosQuery.rows.length === 0) continue;

            // Mapeamento textual para exibição amigável na interface das fases
            const fasesLabels = {
                'grupos': 'Fase de Grupos',
                '128': 'Trinta e dois avos (1/128)',
                '64': 'Dezasseis avos (1/64)',
                '32': 'Dezanove avos / 32 avos (1/32)',
                '16': 'Oitavos-de-final',
                '8': 'Quartos-de-final',
                '4': 'Meias-finais',
                '2': 'Final'
            };

            // Definir o valor por defeito se for nulo ou se for outro tipo de competição
            const faseInicialChave = comp.fase_inicial || 'grupos';
            const faseInicialTexto = fasesLabels[faseInicialChave] || 'Fase Inicial';

            // Estrutura de estatísticas APENAS para a nossa equipa
            const stats = {
                id_equipa: equipaId,
                nome: dadosPrincipais.clube_nome + " - " + dadosPrincipais.equipa_nome,
                logo: dadosPrincipais.clube_logo || null,
                jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
                golos_marcados: 0, golos_sofridos: 0,
                fase_eliminatoria: faseInicialTexto, // 🌟 Começa dinamicamente com a fase definida na BD
                eliminado: false
            };

            for (const jogo of jogosQuery.rows) {
                const gnossa = parseInt(jogo.golos_nossa) || 0;
                const gadv = parseInt(jogo.golos_adversario) || 0;

                stats.jogos++;
                stats.golos_marcados += gnossa;
                stats.golos_sofridos += gadv;

                if (gnossa > gadv) {
                    stats.vitorias++;
                } else if (gnossa === gadv) {
                    stats.empates++;
                } else {
                    stats.derrotas++;
                }
            }

            const tipo = comp.tipo_competicao;

            // CALCULAR A FASE DINÂMICA DA ELIMINATÓRIA COM BASE NA FASE INICIAL DA BASE DE DADOS
            if (tipo === 'eliminatoria' || tipo === 'grupo_eliminatorias' || tipo === 'grupo+eliminatoria' || tipo === 'jogo unico') {
                if (stats.derrotas > 0 && (tipo === 'eliminatoria' || faseInicialChave !== 'grupos')) {
                    stats.eliminado = true;
                }

                // Se começou na Fase de Grupos e ainda não tem jogos suficientes ou o tipo gerencia grupos, mantém
                if (faseInicialChave === 'grupos') {
                    if (stats.derrotas > 0) {
                        stats.fase_eliminatoria = 'Eliminado na Fase de Grupos';
                    } else {
                        stats.fase_eliminatoria = 'Fase de Grupos';
                    }
                } else {
                    // Cálculo da progressão real baseada no número de vitórias obtidas a partir daquela fase
                    // Se a fase inicial for '16' (Oitavos) -> 1 vitória vai para Quartos (8), 2 vitórias vai para Meias (4)...
                    let divisorFaseAtual = parseInt(faseInicialChave, 10);

                    if (!isNaN(divisorFaseAtual)) {
                        for (let i = 0; i < stats.vitorias; i++) {
                            divisorFaseAtual = divisorFaseAtual / 2;
                            if (divisorFaseAtual < 2) break; // Garante que não divide além do título
                        }

                        if (stats.eliminado) {
                            stats.fase_eliminatoria = `Eliminado nos ${fasesLabels[divisorFaseAtual * 2] || 'Fase Anterior'}`;
                        } else if (stats.vitorias >= Math.log2(parseInt(faseInicialChave, 10))) {
                            stats.fase_eliminatoria = 'Campeão';
                        } else {
                            stats.fase_eliminatoria = fasesLabels[divisorFaseAtual.toString()] || stats.fase_eliminatoria;
                        }
                    }
                }
            } else {
                // Formato Liga padrão por pontos
                stats.pontos = stats.vitorias * 3 + stats.empates;
                stats.diferenca_golos = stats.golos_marcados - stats.golos_sofridos;
            }

            classificacoesPorCompeticao.push({
                id: comp.id,
                nome: comp.nome,
                tipo_competicao: tipo,
                fase_inicial: comp.fase_inicial, // 🌟 Adicionado para expor diretamente no objeto da competição
                tabela: [stats]
            });
        }

        return res.status(200).json({
            equipa: {
                nome: `${dadosPrincipais.clube_nome} - ${dadosPrincipais.equipa_nome}`,
                clube: dadosPrincipais.clube_nome,
                regiao: dadosPrincipais.clube_regiao,
                pais: dadosPrincipais.clube_pais,
                logo: dadosPrincipais.clube_logo,
                id: equipaId
            },
            ultimoEvento: ultimoEventoQuery.rows[0] || null,
            proximoEvento: proximoEventoQuery.rows[0] || null,
            classificacoes: classificacoesPorCompeticao
        });
    } catch (err) {
        console.error("=== [BACKEND ERRO] ===", err.message);
        return res.status(500).json({ error: 'Erro interno ao carregar o dashboard.', detalhe: err.message });
    }
};

exports.getExamesFisicos = (req, res) => {
    enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'treinador', 'treinador_exames.html'));
};

exports.getExamesDados = async (req, res) => {
    try {
        const userId = req.session.userId;
        // Captura o ?id=25 da URL (id do evento)
        const idEvento = req.query.id; 

        if (!userId) {
            console.log("=== [getExamesDados] Falha: Sem userId na sessão ===");
            return res.status(401).json({ success: false, error: 'Sessão expirada ou não autenticado.' });
        }

        // 1. Identificar o tipo do utilizador logado (treinador ou gestor)
        const userQuery = await pool.query(
            `SELECT tipo_utilizador FROM utilizador WHERE id = $1 AND ativo = true`,
            [userId]
        );

        if (userQuery.rows.length === 0) {
            console.log(`=== [getExamesDados] Utilizador ID ${userId} não encontrado ou inativo ===`);
            return res.status(403).json({ success: false, error: 'Utilizador inválido ou inativo.' });
        }

        const tipoUtilizador = userQuery.rows[0].tipo_utilizador.toLowerCase();
        let listaEquipasIds = [];
        let modalidadeEquipa = 'futebol'; // Valor padrão de fallback

        // 2. Determinar os IDs de equipas e buscar a modalidade (desporto)
        if (tipoUtilizador === 'treinador') {
            const equipaTreinadorQuery = await pool.query(
                `SELECT et.id_equipa, LOWER(d.nome) as modalidade
                 FROM equipa_treinador et
                 JOIN equipa e ON e.id = et.id_equipa
                 JOIN desporto d ON e.id_tipo_desporto = d.id
                 WHERE et.id_treinador = $1 AND et.ativo = true AND e.ativo = true
                 LIMIT 1`,
                [userId]
            );

            if (equipaTreinadorQuery.rows.length > 0) {
                listaEquipasIds.push(equipaTreinadorQuery.rows[0].id_equipa);
                modalidadeEquipa = equipaTreinadorQuery.rows[0].modalidade;
            }

        } else if (tipoUtilizador === 'gestor') {
            const equipasGestorQuery = await pool.query(
                `SELECT e.id, LOWER(d.nome) as modalidade
                 FROM equipa e
                 JOIN clube c ON e.id_clube = c.id
                 JOIN desporto d ON e.id_tipo_desporto = d.id
                 WHERE c.id_gestor = $1 AND c.ativo = true AND e.ativo = true`,
                [userId]
            );

            listaEquipasIds = equipasGestorQuery.rows.map(row => row.id);
            if (equipasGestorQuery.rows.length > 0) {
                modalidadeEquipa = equipasGestorQuery.rows[0].modalidade;
            }
        }

        if (listaEquipasIds.length === 0) {
            return res.json({ modalidade: modalidadeEquipa, atletas: [], exames: [] });
        }

        // 3. Procurar o ID da tabela 'atletas' e o Nome da tabela 'utilizador'
        const atletasQuery = await pool.query(
            `SELECT DISTINCT a.id, u.nome 
             FROM utilizador u
             JOIN equipa_atleta ea ON ea.id_atleta = u.id
             JOIN atletas a ON a.id_utilizador = u.id
             WHERE ea.id_equipa = ANY($1) 
               AND ea.ativo = true
               AND LOWER(u.tipo_utilizador) = 'atleta'
               AND u.ativo = true
             ORDER BY u.nome ASC`,
            [listaEquipasIds]
        );

        // 4. Procurar TODOS os exames já realizados especificamente para este id_evento
        let examesDoEvento = [];
        if (idEvento) {
            const examesQuery = await pool.query(
                `SELECT ef.id, ef.id_evento, ef.id_atleta, ef.tipo_exame, ef.dados, ef.observacoes, ef.criado_em,
                        u.nome as nome_atleta
                 FROM exames_fisicos ef
                 JOIN atletas a ON ef.id_atleta = a.id
                 JOIN utilizador u ON a.id_utilizador = u.id
                 WHERE ef.id_evento = $1 AND ef.ativo = true
                 ORDER BY ef.criado_em DESC`,
                [idEvento]
            );
            examesDoEvento = examesQuery.rows;
        }

        // Retornamos tudo empacotado num único payload limpo
        return res.json({
            modalidade: modalidadeEquipa, 
            atletas: atletasQuery.rows,
            exames: examesDoEvento
        });

    } catch (err) {
        console.error("ERRO CRÍTICO EM getExamesDados:", err);
        return res.status(500).json({ success: false, error: 'Erro interno ao processar dados.' });
    }
};


exports.guardarExameFisico = async (req, res) => {
    try {
        const { id_atleta, id_evento, tipo_exame, dados, observacoes } = req.body;

        // 1. Validações de segurança no Servidor
        if (!id_evento) {
            return res.status(400).json({ success: false, error: 'O registo de exames requer obrigatoriamente um ID de evento associado.' });
        }
        if (!id_atleta) {
            return res.status(400).json({ success: false, error: 'O ID do atleta avaliado é obrigatório.' });
        }
        if (!tipo_exame) {
            return res.status(400).json({ success: false, error: 'O tipo de exame físico deve ser selecionado.' });
        }
        if (!dados || Object.keys(dados).length === 0) {
            return res.status(400).json({ success: false, error: 'As métricas de resultados não contêm dados válidos.' });
        }

        console.log(`[UPSERT] Processando exame físico para Atleta: ${id_atleta} | Evento: ${id_evento} | Tipo: ${tipo_exame}`);

        // 2. Query Avançada com ON CONFLICT (Deteta duplicados e atualiza)
        const queryUpsert = `
            INSERT INTO exames_fisicos (id_evento, id_atleta, tipo_exame, dados, observacoes, criado_em)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (id_evento, id_atleta, tipo_exame) 
            DO UPDATE SET 
                dados = EXCLUDED.dados,
                observacoes = EXCLUDED.observacoes,
                criado_em = NOW()
            RETURNING id, (xmax = 0) AS foi_inserido;
        `;

        const valores = [
            id_evento,
            id_atleta,
            tipo_exame,
            JSON.stringify(dados),
            observacoes || null
        ];

        const resultado = await pool.query(queryUpsert, valores);
        
        // xmax no postgres diz-nos se a linha foi atualizada ou inserida de fresco
        const foiInserido = resultado.rows[0].foi_inserido;

        return res.status(200).json({
            success: true,
            message: foiInserido 
                ? 'Resultados do exame físico guardados com sucesso!' 
                : 'Este exame já existia! Os dados foram atualizados com sucesso com as novas métricas.',
            id_exame: resultado.rows[0].id
        });

    } catch (err) {
        console.error("Erro crítico ao executar upsert em exames_fisicos:", err);
        return res.status(500).json({
            success: false,
            error: 'Erro interno ao processar a inserção/atualização na base de dados.',
            detalhe: err.message
        });
    }
};

// 🆕 Devolve um único exame físico (usado para pré-preencher o formulário em modo edição).
// Confirma que o exame pertence a uma equipa gerida pelo treinador/gestor autenticado.
exports.getExameFisicoPorId = async (req, res) => {
    try {
        const userId = req.session.userId;
        const idExame = req.params.id;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Sessão expirada ou não autenticado.' });
        }

        const exameQuery = await pool.query(
            `SELECT ef.id, ef.id_evento, ef.id_atleta, ef.tipo_exame, ef.dados, ef.observacoes
             FROM exames_fisicos ef
             JOIN evento e ON ef.id_evento = e.id
             WHERE ef.id = $1
               AND ef.ativo = true
               AND e.id_equipa IN (
                   SELECT et.id_equipa FROM equipa_treinador et WHERE et.id_treinador = $2 AND et.ativo = true
                   UNION
                   SELECT eq2.id FROM equipa eq2 JOIN clube c ON eq2.id_clube = c.id WHERE c.id_gestor = $2 AND c.ativo = true
               )`,
            [idExame, userId]
        );

        if (exameQuery.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Exame não encontrado ou sem permissões para o aceder.' });
        }

        return res.json({ success: true, exame: exameQuery.rows[0] });

    } catch (err) {
        console.error("Erro ao obter exame físico por ID:", err);
        return res.status(500).json({ success: false, error: 'Erro interno ao obter o exame físico.' });
    }
};

// 🆕 Soft delete de um exame físico — mantém o registo na BD (histórico/auditoria)
// mas deixa de aparecer nas listagens e estatísticas.
exports.eliminarExameFisico = async (req, res) => {
    try {
        const userId = req.session.userId;
        const idExame = req.params.id;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Sessão expirada ou não autenticado.' });
        }

        const resultado = await pool.query(
            `UPDATE exames_fisicos
             SET ativo = false
             WHERE id = $1
               AND ativo = true
               AND id_evento IN (
                   SELECT e.id
                   FROM evento e
                   JOIN equipa eq ON e.id_equipa = eq.id
                   WHERE eq.id IN (
                       SELECT et.id_equipa FROM equipa_treinador et WHERE et.id_treinador = $2 AND et.ativo = true
                       UNION
                       SELECT eq2.id FROM equipa eq2 JOIN clube c ON eq2.id_clube = c.id WHERE c.id_gestor = $2 AND c.ativo = true
                   )
               )
             RETURNING id`,
            [idExame, userId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Exame não encontrado ou sem permissões para o eliminar.' });
        }

        return res.json({ success: true, message: 'Exame físico eliminado com sucesso.' });

    } catch (err) {
        console.error("Erro ao eliminar (soft delete) exame físico:", err);
        return res.status(500).json({ success: false, error: 'Erro interno ao eliminar o exame físico.' });
    }
};


exports.gerarRelatorioPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const geradoPor = req.session.userId || null; // ID do utilizador logado que gerou o relatório

        // 1. Obter dados principais do evento e detalhes do clube/equipa/desporto/competição
        const eventoRes = await pool.query(
            `SELECT ev.*, e.nome AS nome_equipa, c.nome AS nome_clube, d.nome AS nome_desporto, comp.nome AS nome_competicao
             FROM evento ev
             LEFT JOIN equipa e ON ev.id_equipa = e.id
             LEFT JOIN clube c ON e.id_clube = c.id
             LEFT JOIN desporto d ON e.id_tipo_desporto = d.id
             LEFT JOIN competicao comp ON ev.id_competicao = comp.id
             WHERE ev.id = $1`, [id]
        );
        
        if (eventoRes.rows.length === 0) {
            return res.status(404).send('Jogo não encontrado.');
        }
        const evento = eventoRes.rows[0];

        // 2. Obter placar/resultado final
        const resultadoRes = await pool.query('SELECT * FROM resultado_jogo WHERE id_evento = $1', [id]);
        const resultado = resultadoRes.rows[0] || { golos_nossa: 0, golos_adversario: 0 };

        // 3. Obter a convocatória
        const convocadosRes = await pool.query(
            `SELECT COALESCE(u.nome_completo, u.nome) AS nome_completo, conv.estado 
             FROM convocatoria conv 
             JOIN atletas atl ON conv.id_atleta = atl.id 
             JOIN utilizador u ON atl.id_utilizador = u.id 
             WHERE conv.id_evento = $1 
             ORDER BY nome_completo ASC`, [id]
        );

        // 4. Obter golos do encontro
        const golosRes = await pool.query(
            `SELECT g.*, COALESCE(u.nome_completo, u.nome, g.nome_marcador) AS marcador_nome
             FROM golo g 
             LEFT JOIN atletas atl ON g.id_atleta = atl.id 
             LEFT JOIN utilizador u ON atl.id_utilizador = u.id
             WHERE g.id_evento = $1 
             ORDER BY g.minuto ASC`, [id]
        );

        // 5. Obter cartões aplicados
        const cartoesRes = await pool.query(
            `SELECT c.*, COALESCE(u.nome_completo, c.nome_jogador) AS jogador_nome
             FROM cartao c 
             LEFT JOIN atletas atl ON c.id_atleta = atl.id 
             LEFT JOIN utilizador u ON atl.id_utilizador = u.id
             WHERE c.id_evento = $1 
             ORDER BY c.minuto ASC`, [id]
        );

        // 6. Obter minutos jogados por atleta
        const atletaStatsRes = await pool.query(
            `SELECT ej.minutos_jogados, ej.notas, COALESCE(u.nome_completo, u.nome) AS nome_completo
             FROM estatistica_jogo ej
             JOIN atletas atl ON ej.id_atleta = atl.id 
             JOIN utilizador u ON atl.id_utilizador = u.id
             WHERE ej.id_evento = $1
             ORDER BY ej.minutos_jogados DESC`, [id]
        );

        // 7. Obter as Estatísticas Colectivas da Match (JSONB)
        const matchStatsRes = await pool.query(
            `SELECT dados FROM estatistica_jogo_match WHERE id_evento = $1`, [id]
        );
        const matchStats = matchStatsRes.rows[0]?.dados || null;

        // -------------------------------------------------------------------------
        // NOVO: GUARDAR DADOS DO RELATÓRIO NA TABELA 'RELATORIO' (Formato JSON)
        // -------------------------------------------------------------------------
        const tituloRelatorio = `Relatório Técnico: ${evento.nome_clube || 'Nossa Equipa'} vs ${evento.equipa_rival || 'Adversário'}`;
        
        const dadosJSON = {
            evento: {
                id_evento: evento.id,
                competicao: evento.nome_competicao,
                modalidade: evento.nome_desporto,
                data_hora: evento.data_hora,
                local: evento.local,
                nossa_equipa: evento.nome_clube || evento.nome_equipa,
                equipa_rival: evento.equipa_rival
            },
            resultado: resultado,
            golos: golosRes.rows,
            cartoes: cartoesRes.rows,
            convocados_e_minutos: convocadosRes.rows.map(c => {
                const stat = atletaStatsRes.rows.find(s => s.nome_completo === c.nome_completo);
                return {
                    nome: c.nome_completo,
                    estado: c.estado,
                    minutos: stat ? stat.minutos_jogados || 0 : 0,
                    notas: stat ? stat.notas || null : null
                };
            }),
            estatisticas_coletivas: matchStats
        };

        // Executa o INSERT na tabela relatorio
        await pool.query(
            `INSERT INTO relatorio (id_equipa, gerado_por, titulo, dados)
             VALUES ($1, $2, $3, $4)`,
            [evento.id_equipa, geradoPor, tituloRelatorio, JSON.stringify(dadosJSON)]
        );

        // 8. Inicializar o PDF com margens limpas
        const doc = new PDFDocument({ size: 'A4', margin: 45 });
        
        const nomeFicheiro = `MatchReport_${(evento.nome_clube || 'Equipa').replace(/\s+/g, '_')}_vs_${(evento.equipa_rival || 'Rival').replace(/\s+/g, '_')}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${nomeFicheiro}"`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        const larguraUtil = 505;

        // Função de ajuda para garantir que ao mudar de página o cursor não cola no topo
        const verificarQuebraPagina = (espacoNecessario = 20) => {
            if (doc.y + espacoNecessario > 750) {
                doc.addPage();
                doc.y = 55; // Força uma margem superior limpa na nova página
            }
        };

        // =========================================================================
        // CABEÇALHO DETALHADO (DESIGN ESTILO BANNER)
        // =========================================================================
        doc.rect(45, 45, larguraUtil, 35).fill('#0a3d80');
        doc.fillColor('#ffffff').fontSize(12).text('RELATÓRIO TÉCNICO DE JOGO', 55, 57);
        doc.fontSize(9).text(`Gerado em: ${new Date().toLocaleDateString('pt-PT')}`, 420, 58, { align: 'right', width: 120 });
        doc.moveDown(2);

        // =========================================================================
        // PLACAR E INFO GERAL (CARD VIRTUAL)
        // =========================================================================
        const yCard = doc.y + 15;
        doc.rect(45, yCard, larguraUtil, 85).fill('#f8fafc').stroke('#e2e8f0');
        
        const clubeNome = evento.nome_clube || evento.nome_equipa || 'Nossa Equipa';
        const rivalNome = evento.equipa_rival || 'Adversário';
        
        doc.fillColor('#0a3d80').fontSize(12).text(clubeNome.toUpperCase(), 60, yCard + 20, { width: 170, align: 'left', bold: true });
        doc.fillColor('#1e293b').fontSize(24).text(`${resultado.golos_nossa}  -  ${resultado.golos_adversario}`, 45, yCard + 15, { width: larguraUtil, align: 'center', bold: true });
        doc.fillColor('#dc2626').fontSize(12).text(rivalNome.toUpperCase(), 365, yCard + 20, { width: 170, align: 'right', bold: true });

        doc.fillColor('#64748b').fontSize(9);
        const infoLinha1 = `Competição: ${evento.nome_competicao || 'Particular'}  |  Modalidade: ${evento.nome_desporto || 'N/A'}`;
        const infoLinha2 = `Data: ${evento.data_hora ? new Date(evento.data_hora).toLocaleString('pt-PT') : 'N/A'}  |  Local: ${evento.local || 'Não Definido'}`;
        
        doc.text(infoLinha1, 60, yCard + 55);
        doc.text(infoLinha2, 60, yCard + 68);

        doc.y = yCard + 105;

        // Criador de Títulos Separadores
        const criarTituloSecao = (titulo) => {
            verificarQuebraPagina(40);
            doc.moveDown(1.5);
            doc.fillColor('#0a3d80').fontSize(11).text(titulo.toUpperCase(), { bold: true });
            doc.strokeColor('#0a3d80').lineWidth(1).moveTo(45, doc.y + 2).lineTo(45 + larguraUtil, doc.y + 2).stroke();
            doc.y += 12; // Avanço fixo controlado para evitar sobreposição
        };

        // =========================================================================
        // 1. CRONOLOGIA DE GOLOS
        // =========================================================================
        criarTituloSecao('Evolução do Marcador');
        if (golosRes.rows.length === 0) {
            doc.fontSize(10).fillColor('#94a3b8').text('Nenhum golo ou pontuação registada.', { italic: true });
        } else {
            golosRes.rows.forEach(g => {
                verificarQuebraPagina(18);
                const isNossa = g.equipa_propria;
                const equipaTexto = isNossa ? `[${clubeNome}]` : `[${rivalNome}]`;
                const autogolo = g.autogolo ? ' (A.G.)' : '';
                
                doc.fontSize(10).fillColor('#1e293b');
                doc.text(`Minuto ${g.minuto || '--'}'  -  ${g.marcador_nome}${autogolo}   ${equipaTexto}`);
                doc.y += 4; 
            });
        }

        // =========================================================================
        // 2. REGISTO DISCIPLINAR
        // =========================================================================
        criarTituloSecao('Ação Disciplinar');
        if (cartoesRes.rows.length === 0) {
            doc.fontSize(10).fillColor('#94a3b8').text('Partida sem cartões registados.', { italic: true });
        } else {
            cartoesRes.rows.forEach(c => {
                verificarQuebraPagina(18);
                const equipaTexto = c.equipa_propria ? `[${clubeNome}]` : `[${rivalNome}]`;
                doc.fontSize(10).fillColor('#1e293b');
                doc.text(`Minuto ${c.minuto || '--'}'  -  ${c.jogador_nome} (${c.tipo.toUpperCase()})   ${equipaTexto}`);
                doc.y += 4;
            });
        }

        // =========================================================================
        // 3. CONVOCATÓRIA E DESEMPENHO INDIVIDUAL
        // =========================================================================
        criarTituloSecao('Atletas Convocados & Minutos Jogados');
        if (convocadosRes.rows.length === 0) {
            doc.fontSize(10).fillColor('#94a3b8').text('Nenhum dado de convocatória disponível.', { italic: true });
        } else {
            doc.y += 5;
            const yTabHeader = doc.y;
            doc.rect(45, yTabHeader, larguraUtil, 18).fill('#f1f5f9');
            doc.fillColor('#475569').fontSize(9).text('NOME COMPLETO DO ATLETA', 55, yTabHeader + 5);
            doc.text('CONVOCAÇÃO', 320, yTabHeader + 5);
            doc.text('TEMPO JOGADO', 440, yTabHeader + 5);
            
            doc.y = yTabHeader + 22;

            convocadosRes.rows.forEach((c, index) => {
                verificarQuebraPagina(18);
                const yLinha = doc.y;
                
                if (index % 2 === 0) {
                    doc.rect(45, yLinha - 2, larguraUtil, 16).fill('#f8fafc');
                }

                const statAtleta = atletaStatsRes.rows.find(s => s.nome_completo === c.nome_completo);
                const minutos = statAtleta ? `${statAtleta.minutos_jogados || 0} min` : '0 min';
                const obs = statAtleta && statAtleta.notas ? ` (${statAtleta.notas})` : '';

                doc.fillColor('#1e293b').fontSize(9.5).text(c.nome_completo, 55, yLinha);
                doc.fillColor('#64748b').text(c.estado.toUpperCase(), 320, yLinha);
                doc.fillColor('#0a3d80').text(`${minutos}${obs}`, 440, yLinha);
                
                doc.y = yLinha + 16;
            });
        }

        // =========================================================================
        // 4. ESTATÍSTICAS COLECTIVAS DA EQUIPA
        // =========================================================================
        criarTituloSecao('Análise Colectiva Avançada');

        if (!matchStats || Object.keys(matchStats).length === 0) {
            doc.fontSize(10).fillColor('#94a3b8').text('Nenhuma estatística coletiva preenchida para este jogo.', { italic: true });
        } else {
            doc.y += 5;
            
            const dadosAgrupados = {};
            Object.entries(matchStats).forEach(([chave, valor]) => {
                let nomeLimpo = chave.replace(/_/g, ' ')
                                     .replace(/\b(Nossa|Adversario|Adversário|Propria|Rival)\b/gi, '')
                                     .trim();
                nomeLimpo = nomeLimpo.charAt(0).toUpperCase() + nomeLimpo.slice(1);

                if (!dadosAgrupados[nomeLimpo]) {
                    dadosAgrupados[nomeLimpo] = { nossa: '0', adversario: '0' };
                }

                const valorString = String(valor).trim();

                if (chave.toLowerCase().includes('nossa') || chave.toLowerCase().includes('propria')) {
                    dadosAgrupados[nomeLimpo].nossa = valorString;
                } else if (chave.toLowerCase().includes('adversario') || chave.toLowerCase().includes('rival')) {
                    dadosAgrupados[nomeLimpo].adversario = valorString;
                } else {
                    dadosAgrupados[nomeLimpo].nossa = valorString;
                }
            });

            const yTopoTabela = doc.y;
            doc.rect(45, yTopoTabela, larguraUtil, 18).fill('#f1f5f9');
            doc.fontSize(9).fillColor('#475569');
            doc.text('NOSSA EQUIPA', 45, yTopoTabela + 5, { width: 100, align: 'center', bold: true });
            doc.text('MÉTRICA / INDICADOR', 145, yTopoTabela + 5, { width: 305, align: 'center', bold: true });
            doc.text('ADVERSÁRIO', 450, yTopoTabela + 5, { width: 100, align: 'center', bold: true });
            
            doc.y = yTopoTabela + 24;

            Object.entries(dadosAgrupados).forEach(([indicador, valores], index) => {
                verificarQuebraPagina(20);
                const yLinha = doc.y;

                if (index % 2 === 0) {
                    doc.rect(45, yLinha - 2, larguraUtil, 18).fill('#f8fafc');
                }

                doc.fillColor('#0a3d80').fontSize(10).text(valores.nossa, 45, yLinha, { width: 100, align: 'center', bold: true });
                doc.fillColor('#1e293b').fontSize(9.5).text(indicador.toUpperCase(), 145, yLinha, { width: 305, align: 'center' });
                doc.fillColor('#dc2626').fontSize(10).text(valores.adversario, 450, yLinha, { width: 100, align: 'center', bold: true });

                doc.y = yLinha + 18;
            });
        }

        doc.end();

    } catch (err) {
        console.error('Erro crítico ao renderizar e guardar o relatório:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Erro interno ao processar, guardar ou desenhar o PDF do relatório.' });
        }
    }
};