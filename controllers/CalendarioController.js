// controllers/CalendarioController.js
const path = require('path');

// Serve a interface HTML estática a partir da pasta public
exports.getCalendario = (req, res) => {
res.sendFile(path.join(__dirname, '../public/mngr/calendario.html'));};

// Devolve os dados dos eventos filtrados
exports.getCalendarioDados = async (req, res) => {
    try {
        const usuarioAtual = req.user; 

        res.json({
            usuario: { 
                role: usuarioAtual.role,     // 'atleta', 'treinador' ou 'gestor'
                equipa: usuarioAtual.equipa  
            },
            eventos: [
                // Dados simulados estruturados como a tabela real do PostgreSQL
                { id: 1, titulo: 'Reunião pré-treino', data_hora: '2026-05-07T18:00:00.000Z', tipo_evento: 'reuniao', local: 'Sala Tática' },
                { id: 2, titulo: 'Jogo Casa - FC Porto', data_hora: '2026-05-17T20:00:00.000Z', tipo_evento: 'jogo', local: 'Estádio Principal' }
            ]
        });
    } catch (erro) {
        res.status(500).json({ error: 'Erro ao obter os dados do calendário.' });
    }
};

// Processa o formulário do modal para inserir na tabela 'evento' do PostgreSQL
exports.criarEvento = async (req, res) => {
    try {
        const usuarioAtual = req.user;

        if (usuarioAtual.role === 'atleta') {
            return res.status(403).json({ error: 'Não tens permissões para criar eventos.' });
        }

        const { 
            tipo_evento, 
            titulo, 
            id_equipa, 
            data_evento, // Agora vem injetado pelo JS
            hora_inicio, 
            local, 
            descricao,
            oficial,         // NOVO
            id_equipa_rival, // NOVO
            duracao          // NOVO
        } = req.body;

        const data_hora_formatada = new Date(`${data_evento}T${hora_inicio}:00`);
        const agora = new Date();

        // Validação de segurança no Backend: Bloquear datas passadas
        if (data_hora_formatada < agora) {
            return res.status(400).json({ error: 'A data e hora do evento não podem estar no passado.' });
        }

        const novoEvento = {
            tipo_evento: tipo_evento,
            titulo: titulo,
            data_hora: data_hora_formatada,
            local: local,
            descricao: descricao,
            id_equipa: parseInt(id_equipa),
            // Se for jogo, usa o boolean recebido, senão false
            oficial: tipo_evento === 'jogo' ? oficial : false,
            // Se for jogo, grava o rival, senão nulo
            id_equipa_rival: tipo_evento === 'jogo' ? parseInt(id_equipa_rival) : null,
            // Se for treino, grava duração, senão nulo
            duracao: tipo_evento.includes('treino') ? parseInt(duracao) : null,
            criado_por: usuarioAtual.id,
            estado: 'agendado' 
        };

        // await EventoModel.create(novoEvento);
        
        res.status(201).json({ message: 'Evento criado com sucesso!' });
    } catch (erro) {
        res.status(500).json({ error: 'Erro ao registar o compromisso desportivo.' });
    }
};