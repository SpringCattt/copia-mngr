// controllers/GestorController.js
const path = require('path');
const { pool } = require('../database/connection');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const SUPABASE_URL = process.env.SUPABASE_URL; 
const SUPABASE_KEY = process.env.SUPABASE_KEY; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const storageMemoria = multer.memoryStorage();
const uploadConfig = multer({
    storage: storageMemoria,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (formatosPermitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato inválido. Apenas são aceites imagens JPG, PNG ou WEBP.'));
        }
    }
}).single('logo_file');

const enviarConteudoOuMoldura = (req, res, ficheiroMetodo) => {
    if (req.headers['x-solicitado-por'] === 'SPA') {
        return res.sendFile(ficheiroMetodo);
    }
    res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'dashboard.html'));
};

const uploadEquipaConfig = multer({
    storage: multer.memoryStorage(), 
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (formatosPermitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato inválido. Apenas são aceites imagens JPG, PNG ou WEBP.'));
        }
    }
}).single('foto_file');

// 🌟 Configuração do Multer para o Upload de Imagem de Competições
const uploadCompeticaoConfig = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024 }, // Limite de 3MB
    fileFilter: (req, file, cb) => {
        const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (formatosPermitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato inválido. Apenas são aceites imagens JPG, PNG ou WEBP para a competição.'));
        }
    }
}).single('imagem_competicao');

// Função para enviar o HTML via SPA
exports.getGestorIndex = (req, res) => {
    if (req.headers['x-solicitado-por'] === 'SPA') {
        res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'gestorClube', 'gestor_index.html'));
    } else {
        res.sendFile(path.join(__dirname, '..', 'public', 'mngr', 'components', 'dashboard.html'));
    }
};

// Função com as Matemáticas e Estatísticas
exports.getDashboardDados = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        // 🌟 1. O Clube (CORRIGIDO: Extrair apenas o ano da coluna 'criado_em')
        const queryClube = `
            SELECT c.id, c.nome, c.pais, c.regiao, c.logo_url as logo, EXTRACT(YEAR FROM c.criado_em) as ano_fundacao
            FROM clube c
            LEFT JOIN gestoresclube gc ON c.id_gestor = gc.id
            WHERE c.id_gestor = $1 OR gc.id_utilizador = $1 
            LIMIT 1
        `;
        const resultClube = await pool.query(queryClube, [userId]);
        if (resultClube.rows.length === 0) return res.json({ success: false });
        
        const clube = resultClube.rows[0];
        const idClube = clube.id;

        // 2. Os KPIs
        const kpis = { totalEquipas: 0, totalAtletas: 0, totalStaff: 0, convitesPendentes: 0 };
        
        const reqEq = await pool.query("SELECT COUNT(*) FROM equipa WHERE id_clube = $1 AND ativo = true", [idClube]);
        kpis.totalEquipas = parseInt(reqEq.rows[0].count);

        const reqAtl = await pool.query(`SELECT COUNT(DISTINCT ea.id_atleta) FROM equipa_atleta ea JOIN equipa e ON ea.id_equipa = e.id WHERE e.id_clube = $1 AND ea.ativo = true`, [idClube]);
        kpis.totalAtletas = parseInt(reqAtl.rows[0].count);

        const reqTr = await pool.query(`SELECT COUNT(DISTINCT et.id_treinador) FROM equipa_treinador et JOIN equipa e ON et.id_equipa = e.id WHERE e.id_clube = $1 AND et.ativo = true`, [idClube]);
        kpis.totalStaff = parseInt(reqTr.rows[0].count);

        // Proteção extra para os convites
        try {
            const reqConv = await pool.query(`SELECT COUNT(*) FROM convite_equipa WHERE id_clube = $1 AND estado = 'pendente'`, [idClube]);
            kpis.convitesPendentes = parseInt(reqConv.rows[0].count);
        } catch(e) {
            kpis.convitesPendentes = 0; 
        }

        // 4. Próximos 4 Jogos de qualquer escalão
        const reqJogos = await pool.query(`
            SELECT ev.id, ev.titulo, ev.data_hora, ev.local, eq.nome as nome_equipa
            FROM evento ev
            JOIN equipa eq ON ev.id_equipa = eq.id
            WHERE eq.id_clube = $1 AND ev.tipo_evento = 'jogo' AND ev.data_hora > NOW() AND ev.estado = 'ativo'
            ORDER BY ev.data_hora ASC LIMIT 4
        `, [idClube]);

        // 5. Ponto de Situação
        const reqStatus = await pool.query(`
            SELECT DISTINCT ON (e.nome)
                e.id, 
                e.nome as nome_equipa,
                u.nome as treinador_nome,
                u.url_imagem as treinador_foto,
                (SELECT COUNT(*) FROM equipa_atleta ea WHERE ea.id_equipa = e.id AND ea.ativo = true) as num_atletas,
                (SELECT MIN(data_hora) FROM evento ev WHERE ev.id_equipa = e.id AND ev.tipo_evento = 'jogo' AND ev.data_hora > NOW()) as proximo_jogo
            FROM equipa e
            LEFT JOIN equipa_treinador et ON e.id = et.id_equipa AND et.ativo = true
            LEFT JOIN utilizador u ON et.id_treinador = u.id
            WHERE e.id_clube = $1 AND e.ativo = true
            ORDER BY e.nome ASC
        `, [idClube]);

        res.json({ 
            success: true, 
            clube, 
            kpis, 
            proximosJogos: reqJogos.rows, 
            equipasStatus: reqStatus.rows 
        });

    } catch (error) {
        console.error("Erro no Dashboard do Gestor:", error);
        res.status(500).json({ success: false });
    }
};

exports.getEquipas = async (req, res) => {
    const caminhoMiolo = path.join(__dirname, '..', 'public', 'mngr', 'gestorClube', 'equipas.html');
    enviarConteudoOuMoldura(req, res, caminhoMiolo);
};

exports.getEquipaDetalhes = (req, res) => {
    const caminhoMiolo = path.join(__dirname, '..', 'public', 'mngr', 'gestorClube', 'equipa_detalhes.html');
    enviarConteudoOuMoldura(req, res, caminhoMiolo);
};

exports.getCriarClube = (req, res) => {
    const caminhoFicheiroLimpo = path.join(__dirname, '..', 'public', 'mngr', 'gestorClube', 'criarClube.html');
    res.sendFile(caminhoFicheiroLimpo);
};

exports.guardarDetalhesGestor = async (req, res) => {
    const client = await pool.connect();
    try {
        const id_utilizador = req.session.userId;
        const { nome_completo, data_nascimento, sexo, cidade, data_inicio_carreira } = req.body;

        if (!nome_completo || !data_nascimento || !sexo || !cidade || !data_inicio_carreira) {
            return res.status(400).json({ success: false, message: "Todos os campos do formulário são de preenchimento obrigatório." });
        }

        const nascimento = new Date(data_nascimento);
        const inicioCarreira = new Date(data_inicio_carreira);
        const hoje = new Date();

        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const m = hoje.getMonth() - nascimento.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }

        if (idade < 18) {
            return res.status(400).json({ success: false, message: "Operação negada. O gestor tem de ser maior de 18 anos." });
        }

        const dataDezoitoAnos = new Date(nascimento);
        dataDezoitoAnos.setFullYear(dataDezoitoAnos.getFullYear() + 18);

        if (inicioCarreira < dataDezoitoAnos) {
            return res.status(400).json({ success: false, message: "Inconsistência de datas. O início de carreira não pode ser anterior à data em que completou 18 anos." });
        }

        await client.query('BEGIN');

        await client.query(
            "UPDATE utilizador SET tipo_utilizador = 'GESTOR', nome_completo = $1 WHERE id = $2",
            [nome_completo.trim(), id_utilizador]
        );

        await client.query(
            `INSERT INTO gestoresClube (id_utilizador, data_nascimento, sexo, cidade, data_inicio_carreira)
             VALUES ($1, $2, $3, $4, $5)`,
            [id_utilizador, data_nascimento, sexo, cidade.trim(), data_inicio_carreira]
        );

        await client.query('COMMIT');
        return res.status(200).json({ success: true, redirectTo: '/mngr/gestorClube/criarClube' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro ao salvar dados do Gestor:", err);
        return res.status(500).json({ success: false, message: "Erro de servidor ao processar o perfil de gestor." });
    } finally {
        client.release();
    }
};

exports.guardarClube = (req, res) => {
    uploadConfig(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        const client = await pool.connect();

        try {
            if (!req.session || !req.session.userId) {
                client.release();
                return res.status(401).json({ success: false, message: 'Sessão expirada ou inválida. Por favor, volte a fazer login.' });
            }

            const id_gestor = req.session.userId; 
            const { nome, pais, regiao, data_fundacao, descricao } = req.body;

            if (!nome || !nome.trim()) { client.release(); return res.status(400).json({ success: false, message: 'O nome do clube não pode estar em branco.' }); }
            if (!pais || !pais.trim()) { client.release(); return res.status(400).json({ success: false, message: 'O país de origem não pode estar em branco.' }); }
            if (!regiao || !regiao.trim()) { client.release(); return res.status(400).json({ success: false, message: 'A região/distrito não pode estar em branco.' }); }
            if (!data_fundacao || !data_fundacao.trim()) { client.release(); return res.status(400).json({ success: false, message: 'A data de fundação é obrigatória.' }); }

            const dataFundacaoConvertida = new Date(data_fundacao);
            const dataMinimaValida = new Date('1857-01-01');
            const dataAtual = new Date();

            if (isNaN(dataFundacaoConvertida.getTime())) { client.release(); return res.status(400).json({ success: false, message: 'O formato da data introduzido é inválido.' }); }
            if (dataFundacaoConvertida < dataMinimaValida) { client.release(); return res.status(400).json({ success: false, message: 'Não é permitido registar datas de fundação anteriores ao ano de 1857.' }); }
            if (dataFundacaoConvertida > dataAtual) { client.release(); return res.status(400).json({ success: false, message: 'A data de fundação não pode ser uma data futura.' }); }

            const clubeExistenteGestor = await client.query('SELECT id FROM clube WHERE id_gestor = $1 LIMIT 1', [id_gestor]);
            if (clubeExistenteGestor.rows.length > 0) {
                client.release();
                return res.status(403).json({ success: false, message: 'A sua conta de gestor já possui um clube associado.' });
            }

            const nomeLimpo = nome.trim();
            const regiaoLimpa = regiao.trim();

            const queryDuplicadoSQL = `SELECT id FROM clube WHERE LOWER(TRIM(nome)) = LOWER($1) AND LOWER(TRIM(regiao)) = LOWER($2) LIMIT 1;`;
            const clubeDuplicado = await client.query(queryDuplicadoSQL, [nomeLimpo, regiaoLimpa]);
            
            if (clubeDuplicado.rows.length > 0) {
                client.release();
                return res.status(409).json({ success: false, message: `Já se encontra registado um clube chamado "${nomeLimpo}" na região de "${regiaoLimpa}".` });
            }

            await client.query('BEGIN');

            const queryInsertSQL = `
                INSERT INTO public.clube (id_gestor, nome, pais, regiao, descricao, criado_em)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id;
            `;
            
            const resultadoBD = await client.query(queryInsertSQL, [
                id_gestor, nomeLimpo, pais.trim(), regiaoLimpa, descricao && descricao.trim() ? descricao.trim() : null, data_fundacao 
            ]);

            const novoClubeId = resultadoBD.rows[0].id;
            let logoPublicUrl = null;

            if (req.file) {
                const extensao = path.extname(req.file.originalname) || '.png';
                const nomeFicheiroSeguro = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${extensao}`;

                const { data, error } = await supabase.storage.from('logo-clubes').upload(nomeFicheiroSeguro, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

                if (error) {
                    await client.query('ROLLBACK'); 
                    client.release();
                    return res.status(500).json({ success: false, message: 'Falha ao guardar a imagem no Cloud Storage. O clube foi revertido.' });
                }

                logoPublicUrl = supabase.storage.from('logo-clubes').getPublicUrl(nomeFicheiroSeguro).data.publicUrl;
                await client.query(`UPDATE clube SET logo_url = $1 WHERE id = $2;`, [logoPublicUrl, novoClubeId]);
            }

            await client.query('COMMIT');
            client.release();

            return res.status(201).json({ success: true, redirectTo: '/mngr/gestorClube/equipas' });

        } catch (dbErr) {
            await client.query('ROLLBACK');
            client.release();
            if (dbErr.code === '23505') { 
                return res.status(409).json({ success: false, message: 'Erro: Já existe um clube registado com este nome nessa região.' });
            }
            return res.status(500).json({ success: false, message: 'Erro interno ao registar o clube na Base de Dados.' });
        }
    });
};

exports.getPainelEquipasDados = async (req, res) => {
    try {
        const id_utilizador_logado = req.session.userId; 
        if (!id_utilizador_logado) return res.status(401).json({ success: false, message: "Sessão expirada." });

        const clubeRes = await pool.query(`SELECT id, nome, regiao, pais, logo_url FROM public.clube WHERE id_gestor = $1 LIMIT 1`, [id_utilizador_logado]);
        if (clubeRes.rows.length === 0) return res.status(200).json({ success: false, message: "Precisa de criar um clube primeiro!" });
        const clube = clubeRes.rows[0];

        const desportosRes = await pool.query(`SELECT id, nome FROM public.desporto ORDER BY nome`);
        const escaloesRes = await pool.query(
            `SELECT esc.id, esc.nome, esc.id_tipo_desporto, g.nome AS genero
             FROM public.escalao esc
             LEFT JOIN public.genero g ON esc.id_genero = g.id
             WHERE esc.ativo = true ORDER BY esc.nome`
        );

        const queryEquipas = `
            SELECT e.id, e.nome, e.foto_url, d.nome AS desporto_nome, esc.nome AS escalao_nome
            FROM public.equipa e
            JOIN public.desporto d ON e.id_tipo_desporto = d.id
            JOIN public.escalao esc ON e.id_tipo_escalao = esc.id
            WHERE e.id_clube = $1
            ORDER BY d.nome, e.nome;
        `;
        const equipasRes = await pool.query(queryEquipas, [clube.id]);

        return res.status(200).json({ success: true, clube: clube, desportos: desportosRes.rows, escaloes: escaloesRes.rows, equipas: equipasRes.rows });
    } catch (error) { return res.status(500).json({ success: false, message: "Erro interno no servidor." }); }
};

exports.criarEquipa = (req, res) => {
    uploadEquipaConfig(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        const client = await pool.connect();

        try {
            const id_utilizador_logado = req.session.userId;
            if (!id_utilizador_logado) { client.release(); return res.status(401).json({ success: false, message: "Sessão expirada." }); }

            const { nome, id_tipo_desporto, id_tipo_escalao } = req.body;
            if (!nome || !id_tipo_desporto || !id_tipo_escalao) { client.release(); return res.status(400).json({ success: false, message: "Todos os campos são obrigatórios." }); }

            const clubeRes = await client.query(`SELECT id FROM public.clube WHERE id_gestor = $1 LIMIT 1`, [id_utilizador_logado]);
            if (clubeRes.rows.length === 0) { client.release(); return res.status(400).json({ success: false, message: "Precisa de criar um clube primeiro!" }); }
            const id_clube = parseInt(clubeRes.rows[0].id, 10);

            const checkRes = await client.query(`SELECT id FROM public.equipa WHERE nome = $1 AND id_clube = $2`, [nome.trim(), id_clube]);
            if (checkRes.rows.length > 0) { client.release(); return res.status(400).json({ success: false, message: `Já existe uma equipa com o nome "${nome}".` }); }

            await client.query('BEGIN');

            const queryInsert = `
                INSERT INTO public.equipa (nome, id_clube, id_tipo_desporto, id_tipo_escalao, foto_url)
                VALUES ($1, $2::integer, $3::integer, $4::integer, $5)
                RETURNING id;
            `;
            const novaEquipaRes = await client.query(queryInsert, [nome.trim(), id_clube, parseInt(id_tipo_desporto, 10), parseInt(id_tipo_escalao, 10), null]);
            const novaEquipaId = novaEquipaRes.rows[0].id;

            // 🌟 O TRUQUE MAGICO: Criar logo o chat de grupo para a nova equipa
            await client.query(`INSERT INTO public.conversa (canal, id_equipa, criado_em) VALUES ('grupo', $1, NOW())`, [novaEquipaId]);

            let fotoPublicUrl = null;
            if (req.file) {
                const nomeFicheiroSeguro = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${path.extname(req.file.originalname)}`;
                const { error } = await supabase.storage.from('logo-clubes').upload(nomeFicheiroSeguro, req.file.buffer, { contentType: req.file.mimetype });
                if (error) throw error;
                fotoPublicUrl = supabase.storage.from('logo-clubes').getPublicUrl(nomeFicheiroSeguro).data.publicUrl;
                await client.query(`UPDATE public.equipa SET foto_url = $1 WHERE id = $2`, [fotoPublicUrl, novaEquipaId]);
            }

            await client.query('COMMIT');
            client.release();

            return res.status(201).json({ success: true, message: "Equipa criada!", equipa: { id: novaEquipaId, nome, foto_url: fotoPublicUrl } });
        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(500).json({ success: false, message: "Erro ao criar equipa. Verifique os dados." });
        }
    });
};

exports.obterDetalhesEquipa = async (req, res) => {
    const client = await pool.connect();
    try {
        const idEquipa = req.params.id;
        const id_utilizador_logado = req.session.userId;
        if (!id_utilizador_logado) { client.release(); return res.status(401).json({ success: false, message: "Sessão expirada." }); }

        const queryEquipa = `
            SELECT e.id, e.nome AS equipa_nome, e.foto_url, d.nome AS desporto_nome, esc.nome AS escalao_nome
            FROM public.equipa e
            LEFT JOIN public.desporto d ON e.id_tipo_desporto = d.id
            LEFT JOIN public.escalao esc ON e.id_tipo_escalao = esc.id
            WHERE e.id = $1;
        `;
        const resultadoEquipa = await client.query(queryEquipa, [idEquipa]);

        if (resultadoEquipa.rows.length === 0) { client.release(); return res.status(404).json({ success: false, message: "Equipa não encontrada." }); }
        client.release();

        const dadosEquipa = resultadoEquipa.rows[0];
        return res.status(200).json({
            success: true,
            dados: {
                equipa: {
                    id: dadosEquipa.id,
                    nome: dadosEquipa.equipa_nome,
                    desporto_nome: dadosEquipa.desporto_nome || "Não Definido",
                    escalao_nome: dadosEquipa.escalao_nome || "Não Definido",
                    foto_url: dadosEquipa.foto_url || "/mngr/images/equipa-placeholder.png"
                }
            }
        });
    } catch (error) {
        client.release();
        return res.status(500).json({ success: false, message: "Erro de servidor ao carregar cabeçalho da equipa." });
    }
};

exports.obterPlantelEquipa = async (req, res) => {
    const client = await pool.connect();
    try {
        const idEquipa = parseInt(req.params.id, 10);
        const queryPlantel = `
            SELECT ea.id_atleta AS id, 'Atleta' AS cargo, u.nome AS nome_utilizador, u.email,
                EXTRACT(YEAR FROM AGE(a.data_nascimento)) AS idade, a.altura, a.peso,
                CASE
                    WHEN esc.idade_max IS NOT NULL AND a.data_nascimento IS NOT NULL
                     AND (EXTRACT(YEAR FROM NOW())::int + 1 - EXTRACT(YEAR FROM a.data_nascimento)::int) > esc.idade_max
                    THEN true ELSE false
                END AS subir_escalao
            FROM public.equipa_atleta ea
            JOIN public.utilizador u ON ea.id_atleta = u.id
            LEFT JOIN public.atletas a ON u.id = a.id_utilizador
            LEFT JOIN public.equipa e ON ea.id_equipa = e.id
            LEFT JOIN public.escalao esc ON e.id_tipo_escalao = esc.id
            WHERE ea.id_equipa = $1 AND ea.ativo = true
            UNION ALL
            SELECT et.id_treinador AS id, 'Treinador' AS cargo, u.nome AS nome_utilizador, u.email,
                EXTRACT(YEAR FROM AGE(t.data_nascimento)) AS idade, NULL AS altura, NULL AS peso,
                false AS subir_escalao
            FROM public.equipa_treinador et JOIN public.utilizador u ON et.id_treinador = u.id LEFT JOIN public.treinadores t ON u.id = t.id_utilizador WHERE et.id_equipa = $1 AND et.ativo = true
            ORDER BY cargo DESC, nome_utilizador ASC;
        `;
        const plantelRes = await client.query(queryPlantel, [idEquipa]);
        client.release();
        return res.status(200).json({ success: true, membros: plantelRes.rows });
    } catch (error) {
        client.release();
        return res.status(500).json({ success: false, message: "Erro de servidor ao carregar a tabela de plantel." });
    }
};

exports.editarCompeticao = (req, res) => {
    uploadCompeticaoConfig(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        const client = await pool.connect();
        try {
            const id = parseInt(req.params.id, 10);
            const { nome_competicao, tipo_competicao, num_equipas } = req.body;
            if (!nome_competicao || !tipo_competicao || !num_equipas)
                return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });

            let url_imagem = null;
            if (req.file) {
                const extensao = path.extname(req.file.originalname) || '.png';
                const nomeFicheiro = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${extensao}`;
                const { error } = await supabase.storage.from('logo-clubes').upload(nomeFicheiro, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
                if (error) return res.status(500).json({ success: false, message: 'Falha ao guardar imagem.' });
                url_imagem = supabase.storage.from('logo-clubes').getPublicUrl(nomeFicheiro).data.publicUrl;
            }

            const updateQuery = url_imagem
                ? `UPDATE public.competicao SET nome=$1, tipo=$2, nparticipantes=$3, url_imagem=$4 WHERE id=$5 RETURNING *`
                : `UPDATE public.competicao SET nome=$1, tipo=$2, nparticipantes=$3 WHERE id=$4 RETURNING *`;
            const params = url_imagem
                ? [nome_competicao.trim(), tipo_competicao, parseInt(num_equipas, 10), url_imagem, id]
                : [nome_competicao.trim(), tipo_competicao, parseInt(num_equipas, 10), id];

            const r = await client.query(updateQuery, params);
            client.release();
            return res.json({ success: true, competicao: r.rows[0] });
        } catch (e) {
            client.release();
            return res.status(500).json({ success: false, message: e.message });
        }
    });
};

exports.obterCompeticoesEquipa = async (req, res) => {
    const client = await pool.connect();
    try {
        const idEquipa = parseInt(req.params.id, 10);

        const compRes = await client.query(
            `SELECT id, nome, tipo, nparticipantes, url_imagem FROM public.competicao WHERE id_equipa = $1 ORDER BY criado_em DESC`,
            [idEquipa]
        );

        const competicoes = await Promise.all(compRes.rows.map(async (comp) => {
            const jogosRes = await client.query(
                `SELECT e.id, e.titulo, e.data_hora, e.estado, e.equipa_rival, e.equipa_rival_imagem, e.oficial,
                        rj.golos_nossa, rj.golos_adversario
                 FROM public.evento e
                 LEFT JOIN public.resultado_jogo rj ON rj.id_evento = e.id
                 WHERE e.id_equipa = $1 AND e.id_competicao = $2 AND e.tipo_evento = 'jogo'
                 ORDER BY e.data_hora ASC`,
                [idEquipa, comp.id]
            );
            return { ...comp, jogos: jogosRes.rows };
        }));

        client.release();
        return res.json({ success: true, competicoes });
    } catch (err) {
        client.release();
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.criarMembroEquipa = async (req, res) => {
    const client = await pool.connect();
    try {
        const { idEquipa, nome, email, password, cargo, data_nascimento } = req.body;

        if (!idEquipa || idEquipa === 'null') { client.release(); return res.status(400).json({ success: false, message: "ID da equipa não encontrado. Volte à página de Equipas e entre novamente." }); }

        const tipoUtilizador = cargo.toLowerCase() === 'staff' ? 'treinador' : cargo.toLowerCase();

        if (tipoUtilizador === 'atleta') {
            if (!data_nascimento) { client.release(); return res.status(400).json({ success: false, message: "A data de nascimento é obrigatória para atletas." }); }
            const nascimento = new Date(data_nascimento);
            const hoje = new Date();
            let idade = hoje.getFullYear() - nascimento.getFullYear();
            const m = hoje.getMonth() - nascimento.getMonth();
            if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
            if (idade < 6) { client.release(); return res.status(400).json({ success: false, message: `O atleta tem ${idade} anos. A idade mínima para registo é 6 anos.` }); }

            const escalaoRes = await client.query(
                `SELECT esc.nome, esc.idade_min, esc.idade_max FROM public.equipa e JOIN public.escalao esc ON e.id_tipo_escalao = esc.id WHERE e.id = $1`,
                [idEquipa]
            );
            if (escalaoRes.rows.length > 0) {
                const { nome: nomeEscalao, idade_min, idade_max } = escalaoRes.rows[0];
                if (idade_min !== null && idade < idade_min) {
                    client.release();
                    return res.status(400).json({ success: false, message: `O atleta tem ${idade} anos mas o escalão "${nomeEscalao}" exige mínimo de ${idade_min} anos.` });
                }
                if (idade_max !== null && idade > idade_max) {
                    client.release();
                    return res.status(400).json({ success: false, message: `O atleta tem ${idade} anos mas o escalão "${nomeEscalao}" permite no máximo ${idade_max} anos.` });
                }
            }
        }

        const emailExiste = await client.query('SELECT id FROM public.utilizador WHERE email = $1', [email.trim()]);
        if (emailExiste.rows.length > 0) { client.release(); return res.status(400).json({ success: false, message: "Este e-mail já tem conta! Use a aba 'Convidar Existente'." }); }

        await client.query('BEGIN');

        // 🌟 ENCRIPTAÇÃO DA PASSWORD PROVISÓRIA GERADA PELO GESTOR
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const queryInsertUser = `
            INSERT INTO public.utilizador (nome, email, password, tipo_utilizador, ativo, criado_em)
            VALUES ($1, $2, $3, $4, true, NOW())
            RETURNING id;
        `;
        // Passamos o hashPassword!
        const novoUserRes = await client.query(queryInsertUser, [nome.trim(), email.trim(), hashPassword, tipoUtilizador]);
        const novoUserId = novoUserRes.rows[0].id;

        if (tipoUtilizador === 'atleta') {
            const equipaRes = await client.query(
                `SELECT eq.id_tipo_desporto, esc.id_genero AS id_genero_escalao
                 FROM public.equipa eq
                 LEFT JOIN public.escalao esc ON esc.id = eq.id_tipo_escalao
                 WHERE eq.id = $1`,
                [idEquipa]
            );
            const idDesporto = equipaRes.rows[0]?.id_tipo_desporto || null;
            const generoId = equipaRes.rows[0]?.id_genero_escalao || null;
            await client.query(`INSERT INTO public.atletas (id_utilizador, data_nascimento, id_genero, id_desporto) VALUES ($1, $2, $3, $4)`, [novoUserId, data_nascimento, generoId, idDesporto]);
            await client.query(`INSERT INTO public.equipa_atleta (id_equipa, id_atleta, data_entrada, ativo) VALUES ($1, $2, NOW(), true)`, [idEquipa, novoUserId]);
        } else if (tipoUtilizador === 'treinador') {
            const equipaTrRes = await client.query('SELECT id_tipo_desporto FROM public.equipa WHERE id = $1', [idEquipa]);
            const idDesportoTr = equipaTrRes.rows[0]?.id_tipo_desporto || null;
            if (idDesportoTr) {
                try {
                    await client.query(`SAVEPOINT sp_treinador_desporto`);
                    await client.query(
                        `INSERT INTO public.treinadores (id_utilizador, id_desporto) VALUES ($1, $2)`,
                        [novoUserId, idDesportoTr]
                    );
                    await client.query(`RELEASE SAVEPOINT sp_treinador_desporto`);
                } catch (_) {
                    await client.query(`ROLLBACK TO SAVEPOINT sp_treinador_desporto`);
                }
            }
            await client.query(`INSERT INTO public.equipa_treinador (id_equipa, id_treinador, data_entrada, ativo) VALUES ($1, $2, NOW(), true)`, [idEquipa, novoUserId]);
        }

        const resGrupo = await client.query("SELECT id FROM public.conversa WHERE id_equipa = $1 AND canal = 'grupo' LIMIT 1", [idEquipa]);
        if (resGrupo.rows.length > 0) {
            await client.query(
                `INSERT INTO public.participantes_conversa (id_conversa, id_utilizador) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [resGrupo.rows[0].id, novoUserId]
            );
        }

        await client.query('COMMIT'); 
        client.release();

        return res.status(201).json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK'); 
        client.release();
        console.error("❌ ERRO CRÍTICO AO CRIAR MEMBRO:", error);
        return res.status(500).json({ success: false, message: "Erro no servidor. Verifica o terminal do VS Code para veres a falha exata de SQL." });
    }
};

exports.convidarMembroEquipa = async (req, res) => {
    const client = await pool.connect();
    try {
        const { idEquipa, email, cargo } = req.body;
        if (!idEquipa || idEquipa === 'null') { client.release(); return res.status(400).json({ success: false, message: "ID da equipa não encontrado." }); }

        const userRes = await client.query('SELECT id, nome, tipo_utilizador FROM public.utilizador WHERE LOWER(email) = LOWER($1)', [email.trim()]);
        if (userRes.rows.length === 0) { client.release(); return res.status(404).json({ success: false, message: "Não existe nenhuma conta com este email." }); }

        const utilizador = userRes.rows[0];
        const tipoDB = utilizador.tipo_utilizador ? utilizador.tipo_utilizador.toUpperCase() : null;

        if (tipoDB !== cargo.toUpperCase() && tipoDB !== null) { client.release(); return res.status(400).json({ success: false, message: `O utilizador é um ${utilizador.tipo_utilizador}, não pode ser convidado como ${cargo}.` }); }

        // Validar idade do atleta vs escalão da equipa
        if (cargo.toUpperCase() === 'ATLETA') {
            const atletaRes = await client.query(`SELECT a.data_nascimento FROM public.atletas a WHERE a.id_utilizador = $1`, [utilizador.id]);

            if (atletaRes.rows.length === 0 || !atletaRes.rows[0].data_nascimento) {
                client.release();
                return res.status(400).json({ success: false, message: 'O atleta não tem data de nascimento registada. Não é possível verificar a elegibilidade.' });
            }

            const nascimento = new Date(atletaRes.rows[0].data_nascimento);
            const hoje = new Date();
            let idade = hoje.getFullYear() - nascimento.getFullYear();
            const m = hoje.getMonth() - nascimento.getMonth();
            if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;

            if (idade < 6) {
                client.release();
                return res.status(400).json({ success: false, message: `O atleta tem ${idade} anos. A idade mínima para participar é 6 anos.` });
            }

            const escalaoRes = await client.query(
                `SELECT esc.idade_min, esc.idade_max FROM public.equipa e JOIN public.escalao esc ON e.id_tipo_escalao = esc.id WHERE e.id = $1`,
                [idEquipa]
            );
            if (escalaoRes.rows.length > 0) {
                const { idade_min, idade_max } = escalaoRes.rows[0];
                if (idade_min !== null && idade < idade_min) {
                    client.release();
                    return res.status(400).json({ success: false, message: `O atleta tem ${idade} anos mas o escalão desta equipa exige mínimo de ${idade_min} anos.` });
                }
                if (idade_max !== null && idade > idade_max) {
                    client.release();
                    return res.status(400).json({ success: false, message: `O atleta tem ${idade} anos mas o escalão desta equipa permite no máximo ${idade_max} anos.` });
                }
            }
        }

        if (cargo.toUpperCase() === 'ATLETA') {
            // Verificar se o atleta já pertence a uma equipa ativa
            const equipaAtual = await client.query(
                `SELECT id FROM public.equipa_atleta WHERE id_atleta = $1 AND ativo = true LIMIT 1`,
                [utilizador.id]
            );
            if (equipaAtual.rows.length > 0) {
                client.release();
                return res.status(400).json({ success: false, message: 'Este atleta já pertence a uma equipa. Não é possível enviar convite.' });
            }

            // Verificar se a modalidade e o género do atleta coincidem com a da equipa/escalão
            const verificacaoRes = await client.query(
                `SELECT a.id_desporto AS atleta_desporto, a.id_genero AS atleta_genero,
                        eq.id_tipo_desporto AS equipa_desporto,
                        esc.id_genero AS escalao_genero, g.nome AS escalao_genero_nome
                 FROM atletas a
                 JOIN equipa eq ON eq.id = $2
                 LEFT JOIN escalao esc ON esc.id = eq.id_tipo_escalao
                 LEFT JOIN genero g ON g.id = esc.id_genero
                 WHERE a.id_utilizador = $1`,
                [utilizador.id, idEquipa]
            );
            if (verificacaoRes.rows.length > 0) {
                const { atleta_desporto, atleta_genero, equipa_desporto, escalao_genero, escalao_genero_nome } = verificacaoRes.rows[0];
                if (atleta_desporto && equipa_desporto && atleta_desporto !== equipa_desporto) {
                    client.release();
                    return res.status(400).json({ success: false, message: 'A modalidade do atleta não corresponde à modalidade desta equipa.' });
                }
                if (escalao_genero && escalao_genero_nome !== 'Misto' && atleta_genero && atleta_genero !== escalao_genero) {
                    client.release();
                    return res.status(400).json({ success: false, message: `O género do atleta não corresponde ao escalão desta equipa (${escalao_genero_nome}).` });
                }
            }
        }

        const queryCheckConvite = `SELECT id FROM public.convite WHERE id_equipa = $1 AND (id_atleta = $2 OR id_treinador = $2) AND estado::text ILIKE 'pendente'`;
        const conviteExiste = await client.query(queryCheckConvite, [idEquipa, utilizador.id]);

        if (conviteExiste.rows.length > 0) { client.release(); return res.status(400).json({ success: false, message: "Já existe um convite pendente para este utilizador." }); }

        const colunaAlvo = cargo.toUpperCase() === 'ATLETA' ? 'id_atleta' : 'id_treinador';
        const queryInsertConvite = `INSERT INTO public.convite (id_equipa, ${colunaAlvo}, estado) VALUES ($1, $2, 'pendente')`;
        await client.query(queryInsertConvite, [idEquipa, utilizador.id]);

        client.release();
        return res.status(200).json({ success: true, nomeEncontrado: utilizador.nome });
    } catch (error) {
        client.release();
        console.error("❌ ERRO CRÍTICO AO CONVIDAR MEMBRO:", error);
        return res.status(500).json({ success: false, message: "Erro interno. Verifica o terminal do VS Code para ver o erro SQL exato!" });
    }
};

exports.editarEquipa = (req, res) => {
    uploadEquipaConfig(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        res.setHeader('Content-Type', 'application/json');
        const client = await pool.connect();

        try {
            const id_utilizador_logado = req.session.userId;
            const idEquipa = parseInt(req.params.id, 10);

            if (!id_utilizador_logado) { client.release(); return res.status(401).json({ success: false, message: "Sessão expirada." }); }

            const { nome } = req.body;
            if (!nome) { client.release(); return res.status(400).json({ success: false, message: "O nome da equipa é obrigatório." }); }

            await client.query('BEGIN');
            await client.query(`UPDATE public.equipa SET nome = $1 WHERE id = $2;`, [nome.trim(), idEquipa]);

            if (req.file) {
                const extensao = path.extname(req.file.originalname) || '.png';
                const nomeFicheiroSeguro = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${extensao}`;
                const { error } = await supabase.storage.from('logo-clubes').upload(nomeFicheiroSeguro, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
                if (error) { await client.query('ROLLBACK'); client.release(); return res.status(500).json({ success: false, message: 'Falha ao guardar a nova imagem na nuvem.' }); }
                const { data: urlData } = supabase.storage.from('logo-clubes').getPublicUrl(nomeFicheiroSeguro);
                await client.query(`UPDATE public.equipa SET foto_url = $1 WHERE id = $2`, [urlData.publicUrl, idEquipa]);
            }

            await client.query('COMMIT');
            client.release();
            return res.status(200).json({ success: true, message: "Equipa atualizada com sucesso!" });

            return res.status(200).json({
                success: true,
                message: "Equipa updated com sucesso!"
            });

        } catch (error) {
            try { await client.query('ROLLBACK'); } catch (e) {}
            client.release();
            return res.status(500).json({ success: false, message: "Erro interno no servidor." });
        }
    });
};

exports.criarEscalao = async (req, res) => {
    const userId = req.session.userId;
    let { nome, genero, id_tipo_desporto, idade_min, idade_max } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: 'Sessão expirada. Faça login novamente.' });
    if (!nome || !genero) return res.status(400).json({ success: false, message: 'O nome e o género são obrigatórios.' });
    if (!id_tipo_desporto) return res.status(400).json({ success: false, message: 'O desporto é obrigatório.' });

    try {
        const clubeCheck = await pool.query('SELECT id FROM clube WHERE id_gestor = $1 LIMIT 1', [userId]);
        if (clubeCheck.rows.length === 0) return res.status(403).json({ success: false, message: 'Não possui nenhum clube associado.' });
        const id_clube = clubeCheck.rows[0].id;

        idade_min = (idade_min !== undefined && idade_min !== null && idade_min !== '') ? parseInt(idade_min, 10) : null;
        idade_max = (idade_max !== undefined && idade_max !== null && idade_max !== '') ? parseInt(idade_max, 10) : null;

        if (idade_min !== null && idade_min < 0) return res.status(400).json({ success: false, message: 'A idade mínima não pode ser negativa.' });
        if (idade_max !== null && idade_max < 0) return res.status(400).json({ success: false, message: 'A idade máxima não pode ser negativa.' });
        if (idade_min !== null && idade_max !== null && idade_min >= idade_max) return res.status(400).json({ success: false, message: 'A idade mínima tem de ser menor que a idade máxima.' });

        const escalaoDuplicado = await pool.query('SELECT id FROM escalao WHERE LOWER(TRIM(nome)) = LOWER($1) LIMIT 1', [nome.trim()]);
        if (escalaoDuplicado.rows.length > 0) return res.status(409).json({ success: false, message: 'Já existe um escalão registado com este nome.' });

        await pool.query(
            `INSERT INTO escalao (nome, id_genero, id_tipo_desporto, idade_min, idade_max) VALUES ($1, $2, $3, $4, $5)`,
            [nome.trim(), genero, id_tipo_desporto, idade_min, idade_max]
        );

        return res.status(201).json({ success: true, message: 'Escalão gravado com sucesso!' });
    } catch (err) {
        console.error("Erro crítico ao criar escalão:", err);
        return res.status(500).json({ success: false, message: 'Erro interno no servidor ao processar o registo.' });
    }
};

// =========================================================
// 🌟 ADICIONADO: CRIAR NOVA COMPETIÇÃO (POST)
// =========================================================
exports.criarCompeticao = (req, res) => {
    uploadCompeticaoConfig(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });

        const client = await pool.connect();

        try {
            const id_utilizador_logado = req.session.userId;
            if (!id_utilizador_logado) {
                client.release();
                return res.status(401).json({ success: false, message: "Sessão expirada. Por favor, volte a autenticar-se." });
            }

            // 🌟 1. Extração do campo fase_inicial do req.body
            const { nome_competicao, tipo_competicao, num_equipas, id_equipa, fase_inicial } = req.body;

            // Validação estrita de Obrigatoriedade de campos e do Ficheiro de Imagem
            if (!nome_competicao || !nome_competicao.trim() || !tipo_competicao || !num_equipas || !id_equipa || !req.file) {
                client.release();
                return res.status(400).json({ success: false, message: "Todos os campos e a imagem da competição são obrigatórios." });
            }

            const nParticipantes = parseInt(num_equipas, 10);
            if (isNaN(nParticipantes) || nParticipantes <= 0) {
                client.release();
                return res.status(400).json({ success: false, message: "O número de equipas participantes deve ser maior ou igual a 1." });
            }

            // 🌟 2. VALIDAÇÃO DE NEGÓCIO: Cruzar Fase Inicial com o Número de Equipas
            // Só validamos se for um formato que possua eliminatórias e se não for a fase de grupos
            if ((tipo_competicao === 'eliminatoria' || tipo_competicao === 'grupo_eliminatorias') && fase_inicial !== 'grupos') {
                const faseLimiteMaxEquipas = {
                    '128': 128, // Trinta e dois avos
                    '64': 64,   // Dezasseis avos
                    '32': 32,   // Trinta e dois avos (padrão)
                    '16': 16,   // Oitavos de Final
                    '8': 8,     // Quartos de Final
                    '4': 4,     // Meias-Finais
                    '2': 2      // Final
                };

                const limiteMaximo = faseLimiteMaxEquipas[fase_inicial];
                
                if (limiteMaximo) {
                    // Se a fase for Oitavos (16), a eliminatória teoricamente começa com mais de 8 equipas e até 16.
                    // Se o número de participantes for menor ou igual à metade desse limite, a fase escolhida é inválida.
                    // Exemplo: 4 equipas numa fase de Oitavos (máx 16, metade é 8). 4 <= 8 -> ERRO.
                    const limiteMinimoNecessario = limiteMaximo / 2;

                    if (nParticipantes <= limiteMinimoNecessario) {
                        client.release();
                        return res.status(400).json({ 
                            success: false, 
                            message: `A fase inicial escolhida é inválida para ${nParticipantes} equipas. Para essa fase seriam necessárias mais do que ${limiteMinimoNecessario} equipas.` 
                        });
                    }
                    
                    // Validação inversa: Não faz sentido ter 32 equipas e começar nas meias-finais (máx 4)
                    if (nParticipantes > limiteMaximo) {
                        client.release();
                        return res.status(400).json({ 
                            success: false, 
                            message: `Número de equipas (${nParticipantes}) excede a capacidade máxima da fase inicial selecionada (máximo ${limiteMaximo} equipas).` 
                        });
                    }
                }
            }

            const id_equipa_int = parseInt(id_equipa, 10);

            // Validar que a equipa pertence ao clube do gestor logado
            const clubeRes = await client.query(`SELECT id FROM public.clube WHERE id_gestor = $1 LIMIT 1`, [id_utilizador_logado]);
            if (clubeRes.rows.length === 0) {
                client.release();
                return res.status(400).json({ success: false, message: "Necessita de criar um clube primeiro antes de gerir competições!" });
            }
            const id_clube = parseInt(clubeRes.rows[0].id, 10);

            const equipaRes = await client.query(`SELECT id FROM public.equipa WHERE id = $1 AND id_clube = $2 LIMIT 1`, [id_equipa_int, id_clube]);
            if (equipaRes.rows.length === 0) {
                client.release();
                return res.status(403).json({ success: false, message: "Equipa não encontrada ou não pertence ao seu clube." });
            }

            // Validação de Unicidade: Bloquear nomes duplicados para a mesma equipa
            const checkRes = await client.query(
                `SELECT id FROM public.competicao WHERE LOWER(TRIM(nome)) = LOWER($1) AND id_equipa = $2 LIMIT 1`,
                [nome_competicao.trim(), id_equipa_int]
            );

            if (checkRes.rows.length > 0) {
                client.release();
                return res.status(409).json({ success: false, message: `Já existe uma competição com o nome "${nome_competicao.trim()}" para esta equipa.` });
            }

            // Início da Transação Controlada
            await client.query('BEGIN');

            // 🌟 3. Inserção Inicial incluindo o campo fase_inicial na Query
            const queryInsert = `
                INSERT INTO public.competicao (id_equipa, nome, tipo, nparticipantes, url_imagem, fase_inicial)
                VALUES ($1::integer, $2, $3, $4::integer, null, $5)
                RETURNING id;
            `;

            // Se for Liga ou Jogo Único, guardamos a fase_inicial como null (ou podes tratar conforme preferires)
            const valorFaseInicial = (tipo_competicao === 'eliminatoria' || tipo_competicao === 'grupo_eliminatorias') ? fase_inicial : null;

            const novaCompRes = await client.query(queryInsert, [
                id_equipa_int,
                nome_competicao.trim(),
                tipo_competicao,
                nParticipantes,
                valorFaseInicial
            ]);

            const novaCompeticaoId = novaCompRes.rows[0].id;
            let imagemPublicUrl = null;

            // Upload para o Supabase Storage
            const extensao = path.extname(req.file.originalname) || '.png';
            const nomeFicheiroSeguro = `${crypto.randomBytes(16).toString('hex')}-${Date.now()}${extensao}`;

            const { data, error } = await supabase.storage
                .from('logo-clubes')
                .upload(nomeFicheiroSeguro, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (error) {
                console.error('Erro no upload da competição para o Supabase:', error);
                await client.query('ROLLBACK'); // Faz Rollback total do Insert se o Bucket falhar
                client.release();
                return res.status(500).json({ success: false, message: 'Falha ao guardar a imagem no Cloud Storage. A competição foi revertida.' });
            }

            // Obter a URL pública final
            imagemPublicUrl = supabase.storage.from('logo-clubes').getPublicUrl(nomeFicheiroSeguro).data.publicUrl;

            // Atualizar o registo com o Link Definitivo da Nuvem
            await client.query(`UPDATE public.competicao SET url_imagem = $1 WHERE id = $2`, [imagemPublicUrl, novaCompeticaoId]);

            await client.query('COMMIT');
            client.release();

            return res.status(201).json({ 
                success: true, 
                message: "Competição guardada com sucesso!", 
                competicao: { id: novaCompeticaoId, nome: nome_competicao.trim(), url_imagem: imagemPublicUrl } 
            });

        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
            console.error("Erro crítico ao criar competição:", error);
            return res.status(500).json({ success: false, message: "Erro de servidor ao processar o registo da competição." });
        }
    });
};

exports.getEquipasClubeExceto = async (req, res) => {
    try {
        const { id } = req.params; // id da equipa atual
        const { id_atleta } = req.query;

        const r = await pool.query(
            `SELECT e.id, e.nome, esc.nome AS nome_escalao, d.nome AS nome_desporto,
                    esc.idade_min, esc.idade_max
             FROM equipa e
             LEFT JOIN escalao esc ON e.id_tipo_escalao = esc.id
             LEFT JOIN desporto d ON e.id_tipo_desporto = d.id
             WHERE e.id_clube = (SELECT id_clube FROM equipa WHERE id = $1)
               AND e.id != $1
               AND e.ativo = true
               AND e.id_tipo_desporto = (SELECT id_tipo_desporto FROM equipa WHERE id = $1)
               AND (
                 $2::int IS NULL
                 OR (
                   (esc.idade_min IS NULL OR
                    EXTRACT(YEAR FROM AGE((SELECT a.data_nascimento FROM atletas a WHERE a.id_utilizador = $2::int))) >= esc.idade_min)
                   AND
                   (esc.idade_max IS NULL OR
                    EXTRACT(YEAR FROM AGE((SELECT a.data_nascimento FROM atletas a WHERE a.id_utilizador = $2::int))) <= esc.idade_max)
                 )
               )
             ORDER BY esc.nome ASC`,
            [id, id_atleta || null]
        );
        res.json({ success: true, equipas: r.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.mudarEscalaoAtleta = async (req, res) => {
    const client = await pool.connect();
    try {
        const { idEquipa } = req.params;
        const { id_atleta, id_equipa_destino } = req.body;

        if (!id_atleta || !id_equipa_destino) {
            client.release();
            return res.status(400).json({ success: false, message: 'Dados em falta.' });
        }

        const validRes = await client.query(
            `SELECT e.id FROM equipa e WHERE e.id = $1 AND e.id_clube = (SELECT id_clube FROM equipa WHERE id = $2)`,
            [id_equipa_destino, idEquipa]
        );
        if (validRes.rows.length === 0) {
            client.release();
            return res.status(403).json({ success: false, message: 'Equipa destino inválida.' });
        }

        await client.query('BEGIN');

        await client.query(`UPDATE public.equipa_atleta SET ativo = false, data_saida = NOW() WHERE id_equipa = $1 AND id_atleta = $2 AND ativo = true`, [idEquipa, id_atleta]);
        await client.query(`INSERT INTO public.equipa_atleta (id_equipa, id_atleta, data_entrada, ativo) VALUES ($1, $2, NOW(), true)`, [id_equipa_destino, id_atleta]);

        // 🌟 Tira do chat antigo e põe no chat novo
        const resOld = await client.query(`SELECT id FROM conversa WHERE id_equipa = $1 AND canal = 'grupo' LIMIT 1`, [idEquipa]);
        if (resOld.rows.length > 0) await client.query(`DELETE FROM participantes_conversa WHERE id_conversa = $1 AND id_utilizador = $2`, [resOld.rows[0].id, id_atleta]);

        const resNew = await client.query(`SELECT id FROM conversa WHERE id_equipa = $1 AND canal = 'grupo' LIMIT 1`, [id_equipa_destino]);
        if (resNew.rows.length > 0) await client.query(`INSERT INTO participantes_conversa (id_conversa, id_utilizador) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [resNew.rows[0].id, id_atleta]);

        await client.query('COMMIT');
        client.release();
        return res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK'); client.release();
        return res.status(500).json({ success: false, message: 'Erro interno.' });
    }
};

exports.removerMembroEquipa = async (req, res) => {
    const client = await pool.connect();
    try {
        const { idEquipa, idMembro, cargo } = req.body;
        if (!idEquipa || !idMembro || !cargo) { client.release(); return res.status(400).json({ success: false }); }

        const cargoNorm = cargo.toLowerCase();

        if (cargoNorm === 'atleta') {
            await client.query(`UPDATE public.equipa_atleta SET ativo = false, data_saida = NOW() WHERE id_equipa = $1 AND id_atleta = $2`, [idEquipa, idMembro]);
        } else if (cargoNorm === 'treinador' || cargoNorm === 'staff') {
            await client.query(`UPDATE public.equipa_treinador SET ativo = false, data_saida = NOW() WHERE id_equipa = $1 AND id_treinador = $2`, [idEquipa, idMembro]);
        } else {
            client.release(); return res.status(400).json({ success: false, message: 'Cargo inválido.' });
        }

        // 🌟 Tira do chat
        const resGrupo = await client.query(`SELECT id FROM conversa WHERE id_equipa = $1 AND canal = 'grupo' LIMIT 1`, [idEquipa]);
        if (resGrupo.rows.length > 0) await client.query(`DELETE FROM participantes_conversa WHERE id_conversa = $1 AND id_utilizador = $2`, [resGrupo.rows[0].id, idMembro]);

        await client.query(`DELETE FROM public.notificacao WHERE id_destinatario = $1`, [idMembro]);

        client.release();
        return res.json({ success: true });
    } catch (err) { client.release(); return res.status(500).json({ success: false }); }
};

// Equipas do mesmo clube e mesma modalidade (para mover treinador)
exports.getEquipasMesmaModalidadeSemTreinador = async (req, res) => {
    const client = await pool.connect();
    try {
        const idEquipa = parseInt(req.params.id, 10);

        const result = await client.query(
            `SELECT e.id, e.nome
             FROM public.equipa e
             WHERE e.id_clube = (SELECT id_clube FROM public.equipa WHERE id = $1)
               AND e.id != $1
               AND e.ativo = true
               AND e.id_tipo_desporto = (SELECT id_tipo_desporto FROM public.equipa WHERE id = $1)
             ORDER BY e.nome`,
            [idEquipa]
        );

        client.release();
        return res.json({ success: true, equipas: result.rows });
    } catch (err) {
        client.release();
        console.error('Erro ao buscar equipas:', err);
        return res.status(500).json({ success: false, message: 'Erro interno.' });
    }
};

// Move o treinador da equipa atual para outra equipa
exports.moverTreinadorEquipa = async (req, res) => {
    const client = await pool.connect();
    try {
        const { idEquipaOrigem, idTreinador, idEquipaDestino } = req.body;
        if (!idEquipaOrigem || !idTreinador || !idEquipaDestino) { client.release(); return res.status(400).json({ success: false }); }

        await client.query('BEGIN');
        await client.query(`UPDATE public.equipa_treinador SET ativo = false, data_saida = NOW() WHERE id_equipa = $1 AND id_treinador = $2 AND ativo = true`, [idEquipaOrigem, idTreinador]);

        const existente = await client.query(`SELECT id FROM public.equipa_treinador WHERE id_equipa = $1 AND id_treinador = $2`, [idEquipaDestino, idTreinador]);
        if (existente.rows.length > 0) {
            await client.query(`UPDATE public.equipa_treinador SET ativo = true, data_saida = NULL, data_entrada = NOW() WHERE id_equipa = $1 AND id_treinador = $2`, [idEquipaDestino, idTreinador]);
        } else {
            await client.query(`INSERT INTO public.equipa_treinador (id_equipa, id_treinador, data_entrada, ativo) VALUES ($1, $2, NOW(), true)`, [idEquipaDestino, idTreinador]);
        }

        // 🌟 Tira do chat antigo e põe no novo
        const resOld = await client.query(`SELECT id FROM conversa WHERE id_equipa = $1 AND canal = 'grupo' LIMIT 1`, [idEquipaOrigem]);
        if (resOld.rows.length > 0) await client.query(`DELETE FROM participantes_conversa WHERE id_conversa = $1 AND id_utilizador = $2`, [resOld.rows[0].id, idTreinador]);

        const resNew = await client.query(`SELECT id FROM conversa WHERE id_equipa = $1 AND canal = 'grupo' LIMIT 1`, [idEquipaDestino]);
        if (resNew.rows.length > 0) await client.query(`INSERT INTO participantes_conversa (id_conversa, id_utilizador) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [resNew.rows[0].id, idTreinador]);

        await client.query('COMMIT'); client.release(); return res.json({ success: true });
    } catch (err) { await client.query('ROLLBACK'); client.release(); return res.status(500).json({ success: false }); }
};