// controllers/AdministradorController.js
const path = require('path');
const { pool } = require('../database/connection'); 

// --- LÓGICA DE VISTAS (SPA) ---
const enviarConteudoOuMoldura = (req, res, ficheiroMetodo) => {
    if (req.headers['x-solicitado-por'] === 'SPA') {
        return res.sendFile(ficheiroMetodo);
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'dashboard.html'));
};

exports.getAdminIndex = (req, res) => {
    enviarConteudoOuMoldura(req, res, path.join(__dirname, '..', 'public', 'mngr', 'admin', 'admin_index.html'));
};

// --- API: DASHBOARD (ESTATÍSTICAS GLOBAIS) ---
exports.getEstatisticasGlobais = async (req, res) => {
    try {
        const totalAtletas = await pool.query("SELECT COUNT(*) FROM utilizador WHERE LOWER(tipo_utilizador) = 'atleta' AND ativo = true");
        const totalTreinadores = await pool.query("SELECT COUNT(*) FROM utilizador WHERE LOWER(tipo_utilizador) = 'treinador' AND ativo = true");
        const totalGestores = await pool.query("SELECT COUNT(*) FROM utilizador WHERE LOWER(tipo_utilizador) = 'gestor' AND ativo = true");
        const totalClubes = await pool.query("SELECT COUNT(*) FROM clube");

        // Calcular a média de minutos de uso agrupada por cada papel
        const queryTempos = `
            SELECT LOWER(tipo_utilizador) as tipo, ROUND(AVG(COALESCE(tempo_uso_minutos, 0))) as media_minutos 
            FROM utilizador 
            WHERE ativo = true
            GROUP BY LOWER(tipo_utilizador)
        `;
        const temposResult = await pool.query(queryTempos);
        
        let tempoAtletas = 0, tempoTreinadores = 0, tempoGestores = 0;
        temposResult.rows.forEach(row => {
            if (row.tipo === 'atleta') tempoAtletas = row.media_minutos;
            if (row.tipo === 'treinador') tempoTreinadores = row.media_minutos;
            if (row.tipo === 'gestor') tempoGestores = row.media_minutos;
        });

        const stats = {
            totalAtletas: parseInt(totalAtletas.rows[0].count),
            totalTreinadores: parseInt(totalTreinadores.rows[0].count),
            totalGestores: parseInt(totalGestores.rows[0].count),
            totalClubes: parseInt(totalClubes.rows[0].count),
            tempoAtletas,
            tempoTreinadores,
            tempoGestores
        };

        res.json({ success: true, stats });
    } catch (erro) {
        console.error("Erro ao calcular estatísticas globais:", erro);
        res.status(500).json({ error: 'Erro ao carregar estatísticas.' });
    }
};

// --- APIS DE GESTAO DE UTILIZADORES ---
exports.getTodosUtilizadores = async (req, res) => {
    try {
        const query = `
            SELECT id, nome, email, tipo_utilizador, ativo, COALESCE(tempo_uso_minutos, 0) as tempo_uso_minutos 
            FROM utilizador 
            ORDER BY tipo_utilizador ASC, nome ASC
        `;
        const result = await pool.query(query);
        res.json({ success: true, utilizadores: result.rows });
    } catch (erro) {
        console.error("Erro ao buscar utilizadores:", erro);
        res.status(500).json({ error: 'Erro ao carregar utilizadores.' });
    }
};

exports.toggleEstadoUtilizador = async (req, res) => {
    try {
        const { id, ativo } = req.body;
        
        await pool.query('UPDATE utilizador SET ativo = $1 WHERE id = $2', [ativo, id]);
        
        res.json({ success: true, ativo });
    } catch (erro) {
        console.error("Erro ao alterar estado do utilizador:", erro);
        res.status(500).json({ error: 'Erro ao alterar estado.' });
    }
};

// --- APIS DE GESTAO DE CLUBES ---
exports.getTodosClubes = async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id, 
                c.nome, 
                c.regiao, 
                c.pais, 
                u.nome AS gestor, 
                c.ativo,
                COALESCE(
                    (SELECT json_agg(json_build_object('id', esc.id, 'nome', esc.nome, 'desporto', d.nome))
                     FROM escalao esc
                     LEFT JOIN desporto d ON esc.id_tipo_desporto = d.id
                     WHERE esc.ativo = true),
                    '[]'::json
                ) AS escaloes,
                COALESCE(
                    (SELECT json_agg(json_build_object('id', e.id, 'nome', e.nome, 'desporto', d.nome)) 
                     FROM equipa e 
                     LEFT JOIN desporto d ON e.id_tipo_desporto = d.id
                     WHERE e.id_clube = c.id AND e.ativo = true), 
                    '[]'::json
                ) AS equipas
            FROM clube c
            LEFT JOIN utilizador u ON c.id_gestor = u.id
            ORDER BY c.nome ASC
        `;
        const result = await pool.query(query);
        const clubesLimpados = result.rows.map(clube => {
            let esc = typeof clube.escaloes === 'string' ? JSON.parse(clube.escaloes) : clube.escaloes;
            let eq = typeof clube.equipas === 'string' ? JSON.parse(clube.equipas) : clube.equipas;
            
            return {
                ...clube,
                escaloes: Array.isArray(esc) ? esc.filter(e => e && e.id !== null) : [],
                equipas: Array.isArray(eq) ? eq.filter(e => e && e.id !== null) : []
            };
        });

        res.json({ success: true, clubes: clubesLimpados });
    } catch (erro) {
        console.error("Erro ao buscar clubes:", erro);
        res.status(500).json({ error: 'Erro SQL: ' + erro.message });
    }
};

exports.toggleEstadoClube = async (req, res) => {
    try {
        const { id, ativo } = req.body;
        
        await pool.query('UPDATE clube SET ativo = $1 WHERE id = $2', [ativo, id]);
        
        res.json({ success: true, ativo });
    } catch (erro) {
        res.status(500).json({ error: 'Erro ao alterar estado do clube.' });
    }
};

// --- EDITAR UTILIZADOR ---
exports.editarUtilizador = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, tipo_utilizador } = req.body;
        
        await pool.query(
            'UPDATE utilizador SET nome = $1, email = $2, tipo_utilizador = $3 WHERE id = $4',
            [nome, email, tipo_utilizador, id]
        );
        res.json({ success: true, message: 'Utilizador atualizado com sucesso.' });
    } catch (erro) {
        console.error("Erro ao editar utilizador:", erro);
        res.status(500).json({ error: 'Erro ao editar o utilizador no servidor.' });
    }
};


exports.desativarEquipa = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE equipa SET ativo = false WHERE id = $1', [id]);
        res.json({ success: true, message: 'Equipa desativada com sucesso.' });
    } catch (erro) {
        console.error("Erro ao desativar equipa:", erro);
        res.status(500).json({ error: 'Erro ao desativar equipa.' });
    }
};

exports.desativarEscalao = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE escalao SET ativo = false WHERE id = $1', [id]);
        res.json({ success: true, message: 'Escalão desativado com sucesso.' });
    } catch (erro) {
        console.error("Erro ao desativar escalão:", erro);
        res.status(500).json({ error: 'Erro ao desativar escalão.' });
    }
};

exports.getEscaloes = async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM escalao WHERE ativo = true ORDER BY nome ASC');
        res.json(r.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.criarEscalao = async (req, res) => {
    try {
        const { nome, genero, id_tipo_desporto, idade_min, idade_max } = req.body;
        if (!nome || !nome.trim() || !genero) return res.status(400).json({ error: 'Nome e género obrigatórios.' });
        if (!id_tipo_desporto) return res.status(400).json({ error: 'Desporto obrigatório.' });
        const r = await pool.query(
            `INSERT INTO escalao (nome, id_genero, id_tipo_desporto, idade_min, idade_max, ativo)
             VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
            [nome.trim(), genero, id_tipo_desporto, idade_min || null, idade_max || null]
        );
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.editarEscalao = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, genero, id_tipo_desporto, idade_min, idade_max } = req.body;
        if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome obrigatório.' });
        if (!genero) return res.status(400).json({ error: 'Género obrigatório.' });
        if (!id_tipo_desporto) return res.status(400).json({ error: 'Desporto obrigatório.' });
        const r = await pool.query(
            `UPDATE escalao SET nome = $1, id_genero = $2, id_tipo_desporto = $3, idade_min = $4, idade_max = $5
             WHERE id = $6 RETURNING *`,
            [nome.trim(), genero, id_tipo_desporto, idade_min || null, idade_max || null, id]
        );
        if (r.rows.length === 0) return res.status(404).json({ error: 'Escalão não encontrado.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- VER DETALHES ESPECÍFICOS DO UTILIZADOR (Atleta, Treinador, Gestor) ---
exports.getDetalhesUtilizador = async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo } = req.query;

        let perfil = {};
        let associacoes = [];

        if (tipo === 'atleta') {
            const query = `
                SELECT a.*, d.nome as modalidade,
                  COALESCE(
                    (SELECT json_agg(json_build_object('equipa', e.nome, 'clube', c.nome, 'escalao', esc.nome))
                     FROM equipa_atleta ea
                     JOIN equipa e ON ea.id_equipa = e.id
                     JOIN clube c ON e.id_clube = c.id
                     LEFT JOIN escalao esc ON e.id_tipo_escalao = esc.id
                     WHERE ea.id_atleta = a.id_utilizador AND ea.ativo = true),
                    '[]'::json
                  ) as equipas
                FROM atletas a LEFT JOIN desporto d ON a.id_desporto = d.id WHERE a.id_utilizador = $1
            `;
            const result = await pool.query(query, [id]);
            if(result.rows.length > 0) {
                perfil = result.rows[0];
                associacoes = perfil.equipas || [];
            }
        } 
        else if (tipo === 'treinador') {
            const query = `
                SELECT t.*, d.nome as modalidade,
                  COALESCE(
                    (SELECT json_agg(json_build_object('equipa', e.nome, 'clube', c.nome, 'escalao', esc.nome))
                     FROM equipa_treinador et
                     JOIN equipa e ON et.id_equipa = e.id
                     JOIN clube c ON e.id_clube = c.id
                     LEFT JOIN escalao esc ON e.id_tipo_escalao = esc.id
                     WHERE et.id_treinador = t.id_utilizador AND et.ativo = true),
                    '[]'::json
                  ) as equipas
                FROM treinadores t LEFT JOIN desporto d ON t.id_desporto = d.id WHERE t.id_utilizador = $1
            `;
            const result = await pool.query(query, [id]);
            if(result.rows.length > 0) {
                perfil = result.rows[0];
                associacoes = perfil.equipas || [];
            }
        }
        else if (tipo === 'gestor') {
            const queryGestor = `SELECT * FROM gestoresclube WHERE id_utilizador = $1`;
            const resultGestor = await pool.query(queryGestor, [id]);
            if(resultGestor.rows.length > 0) {
                perfil = resultGestor.rows[0];
            }
            
            const queryClubes = `SELECT nome as clube FROM clube WHERE id_gestor = $1`;
            const resultClubes = await pool.query(queryClubes, [id]);
            associacoes = resultClubes.rows;
        }

        res.json({ success: true, perfil, associacoes });
    } catch (erro) {
        console.error("Erro ao buscar detalhes:", erro);
        res.status(500).json({ error: 'Erro ao buscar detalhes do perfil.' });
    }
};

// --- ATUALIZAR DETALHES ESPECÍFICOS DO UTILIZADOR ---
exports.atualizarDetalhesUtilizador = async (req, res) => {
    try {
        const id_utilizador = req.params.id;
        const { tipo_utilizador, dados } = req.body;

        if (tipo_utilizador === 'atleta') {
            const check = await pool.query('SELECT id FROM atletas WHERE id_utilizador = $1', [id_utilizador]);
            if (check.rows.length > 0) {
                await pool.query(`
                    UPDATE atletas SET
                        data_nascimento = $1, id_genero = $2, altura = $3, peso = $4, cidade = $5, id_desporto = $6
                    WHERE id_utilizador = $7`,
                    [dados.data_nascimento, dados.id_genero || null, dados.altura, dados.peso, dados.cidade, dados.id_desporto || null, id_utilizador]
                );
            } else {
                await pool.query(`
                    INSERT INTO atletas (id_utilizador, data_nascimento, id_genero, altura, peso, cidade, id_desporto)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [id_utilizador, dados.data_nascimento, dados.id_genero || null, dados.altura, dados.peso, dados.cidade, dados.id_desporto || null]
                );
            }
        }

        else if (tipo_utilizador === 'treinador') {
            const check = await pool.query('SELECT id FROM treinadores WHERE id_utilizador = $1', [id_utilizador]);
            if (check.rows.length > 0) {
                await pool.query(`
                    UPDATE treinadores SET
                        data_nascimento = $1, sexo = $2, grau_treinador = $3, id_desporto = $4, cidade = $5
                    WHERE id_utilizador = $6`,
                    [dados.data_nascimento, dados.sexo, dados.grau_treinador, dados.id_desporto || null, dados.cidade, id_utilizador]
                );
            } else {
                await pool.query(`
                    INSERT INTO treinadores (id_utilizador, data_nascimento, sexo, grau_treinador, id_desporto, cidade)
                    VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id_utilizador, dados.data_nascimento, dados.sexo, dados.grau_treinador, dados.id_desporto || null, dados.cidade]
                );
            }
        } 
        
        else if (tipo_utilizador === 'gestor') {
            const check = await pool.query('SELECT id FROM gestoresclube WHERE id_utilizador = $1', [id_utilizador]);
            if (check.rows.length > 0) {
                await pool.query(`
                    UPDATE gestoresclube SET 
                        data_nascimento = $1, sexo = $2, data_inicio_carreira = $3, cidade = $4 
                    WHERE id_utilizador = $5`,
                    [dados.data_nascimento, dados.sexo, dados.data_inicio_carreira, dados.cidade, id_utilizador]
                );
            } else {
                await pool.query(`
                    INSERT INTO gestoresclube (id_utilizador, data_nascimento, sexo, data_inicio_carreira, cidade)
                    VALUES ($1, $2, $3, $4, $5)`,
                    [id_utilizador, dados.data_nascimento, dados.sexo, dados.data_inicio_carreira, dados.cidade]
                );
            }
        }

        res.json({ success: true, message: 'Perfil atualizado com sucesso.' });
    } catch (erro) {
        console.error("Erro ao atualizar detalhes:", erro);
        res.status(500).json({ error: 'Erro interno ao atualizar o perfil na Base de Dados.' });
    }
};

// =========================================================================
// GESTÃO DE DESPORTOS — CONFIG MULTIDESPORTO
// =========================================================================

exports.getDesportosConfig = async (req, res) => {
    try {
        const desportosRes = await pool.query('SELECT * FROM desporto ORDER BY nome ASC');
        const configRes = await pool.query('SELECT * FROM desporto_config');
        const statsRes = await pool.query('SELECT * FROM desporto_estatistica ORDER BY id_desporto, ordem ASC');

        const configMap = {};
        configRes.rows.forEach(c => { configMap[c.id_desporto] = c; });

        const statsMap = {};
        statsRes.rows.forEach(s => {
            if (!statsMap[s.id_desporto]) statsMap[s.id_desporto] = [];
            statsMap[s.id_desporto].push(s);
        });

        const result = desportosRes.rows.map(d => ({
            ...d,
            config: configMap[d.id] || null,
            estatisticas: statsMap[d.id] || []
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.guardarDesportoConfig = async (req, res) => {
    try {
        const { id_desporto, unidade_pontuacao, tem_cartoes, tipos_cartao, tem_assistencias } = req.body;
        await pool.query(`
            INSERT INTO desporto_config (id_desporto, unidade_pontuacao, tem_cartoes, tipos_cartao, tem_assistencias)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (id_desporto) DO UPDATE SET
                unidade_pontuacao = $2, tem_cartoes = $3, tipos_cartao = $4, tem_assistencias = $5`,
            [id_desporto, unidade_pontuacao, tem_cartoes, tipos_cartao, tem_assistencias]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.adicionarEstatistica = async (req, res) => {
    try {
        const { id_desporto, campo, label } = req.body;
        const ordemRes = await pool.query(
            'SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima FROM desporto_estatistica WHERE id_desporto = $1',
            [id_desporto]
        );
        const ordem = ordemRes.rows[0].proxima;
        const r = await pool.query(
            'INSERT INTO desporto_estatistica (id_desporto, campo, label, ordem) VALUES ($1, $2, $3, $4) RETURNING *',
            [id_desporto, campo, label, ordem]
        );
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.removerEstatistica = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const row = await client.query('SELECT id_desporto FROM desporto_estatistica WHERE id = $1', [id]);
        if (row.rows.length === 0) return res.status(404).json({ error: 'Estatística não encontrada.' });
        const id_desporto = row.rows[0].id_desporto;

        await client.query('BEGIN');
        await client.query('DELETE FROM desporto_estatistica WHERE id = $1', [id]);
        // Reordenar as restantes a partir de 0 para não deixar lacunas
        await client.query(`
            UPDATE desporto_estatistica de
            SET ordem = sub.nova_ordem
            FROM (
                SELECT id, ROW_NUMBER() OVER (ORDER BY ordem ASC) - 1 AS nova_ordem
                FROM desporto_estatistica
                WHERE id_desporto = $1
            ) sub
            WHERE de.id = sub.id
        `, [id_desporto]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

exports.editarEstatistica = async (req, res) => {
    try {
        const { id } = req.params;
        const { campo, label } = req.body;
        if (!campo || !label) return res.status(400).json({ error: 'Campo e label obrigatórios.' });
        const r = await pool.query(
            'UPDATE desporto_estatistica SET campo = $1, label = $2 WHERE id = $3 RETURNING *',
            [campo.trim().replace(/\s+/g, '_').toLowerCase(), label.trim(), id]
        );
        if (r.rows.length === 0) return res.status(404).json({ error: 'Estatística não encontrada.' });
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.reordenarEstatisticas = async (req, res) => {
    try {
        const { ids } = req.body;
        for (let i = 0; i < ids.length; i++) {
            await pool.query('UPDATE desporto_estatistica SET ordem = $1 WHERE id = $2', [i, ids[i]]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.criarDesporto = async (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome obrigatório.' });
        const r = await pool.query(
            'INSERT INTO desporto (nome) VALUES ($1) RETURNING *',
            [nome.trim()]
        );
        res.json(r.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.removerDesporto = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM desporto WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
