(function() {
    setTimeout(async function inicializarCalendario() {
        console.log("=== [SPA] Módulo do Calendário Iniciado ===");

        // Elementos do DOM Principal
        const grid = document.getElementById('grid-calendario');
        const tituloMes = document.querySelector('.cal-mngr-title');
        const btnAbrirModal = document.getElementById('btn-abrir-modal');
        const modal = document.getElementById('modal-evento-mngr');
        const btnFecharModal = document.getElementById('btn-fechar-modal');
        const formEvento = document.getElementById('form-criar-evento');
        const btnMesAnterior = document.getElementById('btn-prev-mes');
        const btnMesSeguinte = document.getElementById('btn-next-mes');

        // Novos Elementos do Formulário Dinâmico
        const selectTipoEvento = document.getElementById('select-tipo-evento');
        const camposJogo = document.getElementById('campos-jogo');
        const camposTreino = document.getElementById('campos-treino');

        if (!grid) {
            console.error("Erro: A grelha do calendário não foi encontrada no DOM.");
            return;
        }

        // Configuração de Datas e Estados do Calendário
        const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        
        // Inicializa com base na data real de hoje
        const dataHoje = new Date();
        let mesAtual = dataHoje.getMonth();
        let anoAtual = dataHoje.getFullYear();
        
        let eventosCarregados = [];
        let dataSelecionadaStr = null; // Guardará o formato 'YYYY-MM-DD' do dia selecionado

        // Desativa o botão de adicionar por padrão até que um dia seja selecionado
        if (btnAbrirModal) {
            btnAbrirModal.disabled = true;
        }

        // Função para carregar permissões e eventos do Servidor
        async function carregarDadosBase() {
            try {
                const resposta = await fetch('/mngr/api/calendario/dados');
                let dados;

                if (resposta.ok) {
                    dados = await resposta.json();
                } else {
                    dados = { usuario: { role: 'treinador' }, eventos: [] };
                }

                eventosCarregados = dados.eventos || [];

                // Verifica permissões para o botão de gestão
                if (dados.usuario && (dados.usuario.role === 'gestor' || dados.usuario.role === 'treinador')) {
                    if (btnAbrirModal) btnAbrirModal.classList.remove('cal-mngr-hidden');
                }

                renderizarMes(mesAtual, anoAtual, eventosCarregados);
            } catch (erro) {
                console.error("Erro no fetch do calendário:", erro);
                renderizarMes(mesAtual, anoAtual, []);
            }
        }

        // Função Principal para Renderizar a Grelha de 42 Dias
        function renderizarMes(mes, ano, eventos) {
            if (tituloMes) tituloMes.innerText = `${mesesNomes[mes]} ${ano}`;
            grid.innerHTML = '';

            // Lógica matemática para Segunda-feira ser o primeiro dia da semana
            let diaSemanaJS = new Date(ano, mes, 1).getDay(); // 0 (Dom) a 6 (Sáb)
            let primeiroDiaMes = diaSemanaJS === 0 ? 6 : diaSemanaJS - 1; // Ajusta 0 para Seg, 6 para Dom

            let diasNoMes = new Date(ano, mes + 1, 0).getDate(); 
            let diasMesAnterior = new Date(ano, mes, 0).getDate(); 
            
            let totalCelulas = 42; // Grid Fixo (6 semanas x 7 dias)
            let htmlGrid = '';

            for (let i = 0; i < totalCelulas; i++) {
                if (i < primeiroDiaMes) {
                    // Células de preenchimento: MÊS ANTERIOR (Dias cinzentos)
                    let diaAnterior = diasMesAnterior - (primeiroDiaMes - 1) + i;
                    htmlGrid += `<div class="cal-mngr-celda" style="background: #f8fafc; color: #94a3b8; opacity: 0.6;"><span>${diaAnterior}</span></div>`;
                    
                } else if (i >= primeiroDiaMes + diasNoMes) {
                    // Células de preenchimento: MÊS SEGUINTE (Dias cinzentos)
                    let diaSeguinte = i - (primeiroDiaMes + diasNoMes) + 1;
                    htmlGrid += `<div class="cal-mngr-celda" style="background: #f8fafc; color: #94a3b8; opacity: 0.6;"><span>${diaSeguinte}</span></div>`;
                    
                } else {
                    // Células válidas: MÊS ATUAL
                    let diaAtual = i - primeiroDiaMes + 1;
                    let htmlEventos = '';
                    
                    // Verifica se a célula corresponde ao dia real de hoje para destaque visual
                    let ehHoje = (diaAtual === dataHoje.getDate() && mes === dataHoje.getMonth() && ano === dataHoje.getFullYear());
                    let estiloHoje = ehHoje ? 'background: #0ea5e9; color: white; padding: 2px 6px; border-radius: 50%; font-weight: bold;' : 'color: #1e293b;';

                    // Filtra eventos agendados para este dia específico (usando data_hora)
                    let eventosDoDia = eventos.filter(e => {
                        if (!e.data_hora) return false;
                        let d = new Date(e.data_hora);
                        return d.getDate() === diaAtual && d.getMonth() === mes && d.getFullYear() === ano;
                    });

                    eventosDoDia.forEach(evento => {
                        // Cores dinâmicas associadas ao ENUM da Base de Dados
                        let corFundo = '#64748b'; // Outro (Padrão)
                        if (evento.tipo_evento === 'jogo') corFundo = '#059669';
                        else if (evento.tipo_evento === 'reuniao') corFundo = '#f59e0b';
                        else if (evento.tipo_evento.includes('treino')) corFundo = '#0ea5e9'; // físico, tático, técnico
                        else if (evento.tipo_evento === 'exame_fisico') corFundo = '#8b5cf6';

                        let horaFormatada = new Date(evento.data_hora).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

                        htmlEventos += `
                            <div style="background-color: ${corFundo}; color: white; font-size: 11px; padding: 4px; margin-top: 4px; border-radius: 4px; text-align: left; cursor: pointer;">
                                <div style="font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${evento.titulo}</div>
                                <div>${horaFormatada}</div>
                            </div>
                        `;
                    });

                    // Formata a data string para embutir na célula do DOM
                    let stringDataCelula = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`;
                    
                    // Verifica se esta célula já estava marcada como selecionada anteriormente
                    let classeSelecao = (dataSelecionadaStr === stringDataCelula) ? 'dia-selecionado' : '';

                    htmlGrid += `
                        <div class="cal-mngr-celda dia-clicavel ${classeSelecao}" data-data="${stringDataCelula}">
                            <span style="${estiloHoje}">${diaAtual}</span>
                            ${htmlEventos}
                        </div>
                    `;
                }
            }
            
            grid.innerHTML = htmlGrid;

            // Atribui os Eventos de Clique para as Células Ativas do Mês
            document.querySelectorAll('.dia-clicavel').forEach(celula => {
                celula.addEventListener('click', function() {
                    document.querySelectorAll('.dia-clicavel').forEach(c => c.classList.remove('dia-selecionado'));
                    
                    this.classList.add('dia-selecionado');
                    dataSelecionadaStr = this.getAttribute('data-data');
                    
                    // Ativa e destaca o botão de adicionar evento agora que existe uma data alvo
                    if (btnAbrirModal) {
                        btnAbrirModal.disabled = false;
                    }
                });
            });
        }

        // ==========================================
        // GESTÃO DOS CAMPOS DINÂMICOS DO FORMULÁRIO
        // ==========================================
        if (selectTipoEvento) {
            selectTipoEvento.addEventListener('change', function() {
                let valor = this.value;
                
                // Oculta todos os blocos dinâmicos primeiro
                if (camposJogo) camposJogo.classList.add('cal-mngr-hidden');
                if (camposTreino) camposTreino.classList.add('cal-mngr-hidden');

                // Mostra as opções específicas baseadas no ENUM selecionado
                if (valor === 'jogo') {
                    if (camposJogo) camposJogo.classList.remove('cal-mngr-hidden');
                } else if (valor.includes('treino')) {
                    if (camposTreino) camposTreino.classList.remove('cal-mngr-hidden');
                }
            });
        }

        // ==========================================
        // EVENTOS DE NAVEGAÇÃO E MODAL
        // ==========================================
        if (btnMesAnterior) {
            btnMesAnterior.addEventListener('click', () => {
                mesAtual--;
                if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
                renderizarMes(mesAtual, anoAtual, eventosCarregados);
            });
        }

        if (btnMesSeguinte) {
            btnMesSeguinte.addEventListener('click', () => {
                mesAtual++;
                if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
                renderizarMes(mesAtual, anoAtual, eventosCarregados);
            });
        }

        if (btnAbrirModal) {
            btnAbrirModal.addEventListener('click', () => {
                if (!dataSelecionadaStr) return;
                modal.classList.remove('cal-mngr-hidden');
            });
        }

        if (btnFecharModal) {
            btnFecharModal.addEventListener('click', () => {
                modal.classList.add('cal-mngr-hidden');
                formEvento.reset();
                if (camposJogo) camposJogo.classList.add('cal-mngr-hidden');
                if (camposTreino) camposTreino.classList.add('cal-mngr-hidden');
            });
        }

        // ==========================================
        // SUBMISSÃO E VALIDAÇÃO DE DADOS (POST)
        // ==========================================
        if (formEvento) {
            formEvento.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const dadosFormulario = new FormData(formEvento);
                const cargaUtil = Object.fromEntries(dadosFormulario.entries());

                // Injeta automaticamente a data capturada da célula selecionada no Grid
                cargaUtil.data_evento = dataSelecionadaStr;
                
                // Mapeamento correto do estado do Checkbox boleano de Jogo Oficial
                cargaUtil.oficial = dadosFormulario.has('oficial');

                // Validação Cronológica Avançada (Evitar agendamentos no passado)
                const dataHoraAgendada = new Date(`${cargaUtil.data_evento}T${cargaUtil.hora_inicio}:00`);
                const agoraReal = new Date();

                if (dataHoraAgendada < agoraReal) {
                    alert("Erro: Não é permitido criar ou agendar eventos em datas ou horários que já passaram.");
                    return; 
                }

                try {
                    const resposta = await fetch('/mngr/api/eventos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cargaUtil)
                    });

                    if (resposta.ok) {
                        modal.classList.add('cal-mngr-hidden');
                        formEvento.reset();
                        if (camposJogo) camposJogo.classList.add('cal-mngr-hidden');
                        if (camposTreino) camposTreino.classList.add('cal-mngr-hidden');
                        
                        // Atualiza os dados locais de forma síncrona com o servidor
                        await carregarDadosBase(); 
                    } else {
                        const respostaErro = await resposta.json();
                        alert(`Erro do Servidor: ${respostaErro.error || 'Falha ao registar o evento.'}`);
                    }
                } catch (erro) {
                    console.error("Erro no envio do evento:", erro);
                }
            });
        }

        // Execução Inicial Automática ao Carregar o Script
        await carregarDadosBase();

        // ==========================================
        // LÓGICA DE SELEÇÃO EM CASCATA (ADVERSÁRIOS)
        // ==========================================
        const selectClubeRival = document.getElementById('select-clube-rival');
        const selectEscalaoRival = document.getElementById('select-escalao-rival');
        let todasEquipasRivais = []; // Guardará os dados vindos da API

        // Função para ir buscar as equipas à Base de Dados
        async function carregarEquipasRivais() {
            try {
                // Precisarás de criar esta rota no teu backend!
                const resposta = await fetch('/mngr/api/equipas-rivais');
                if (resposta.ok) {
                    todasEquipasRivais = await resposta.json();
                    
                    // Extrair apenas os clubes únicos para o primeiro Select
                    const clubesUnicos = [...new Map(todasEquipasRivais.map(eq => [eq.id_clube, eq])).values()];
                    
                    clubesUnicos.forEach(clube => {
                        let option = document.createElement('option');
                        option.value = clube.id_clube;
                        option.textContent = clube.nome_clube; // Ajusta conforme o retorno da tua API
                        selectClubeRival.appendChild(option);
                    });
                }
            } catch (erro) {
                console.error("Erro ao carregar equipas adversárias:", erro);
            }
        }

        // Quando o utilizador escolhe um Clube, preenchemos o Escalão
        if (selectClubeRival && selectEscalaoRival) {
            selectClubeRival.addEventListener('change', function() {
                const idClubeSelecionado = this.value;
                
                // Limpa e desativa o select de escalões se não houver clube selecionado
                selectEscalaoRival.innerHTML = '<option value="">Selecione o escalão...</option>';
                
                if (!idClubeSelecionado) {
                    selectEscalaoRival.disabled = true;
                    return;
                }

                // Filtra as equipas que pertencem apenas ao clube selecionado
                const equipasDoClube = todasEquipasRivais.filter(eq => eq.id_clube == idClubeSelecionado);

                equipasDoClube.forEach(equipa => {
                    let option = document.createElement('option');
                    option.value = equipa.id; // ESTE É O ID REAL DA TABELA 'equipa'
                    option.textContent = equipa.nome_escalao; // Ajusta conforme o retorno da tua API
                    selectEscalaoRival.appendChild(option);
                });

                selectEscalaoRival.disabled = false;
            });
        }

        // Chama a função para carregar os dados ao iniciar
        carregarEquipasRivais();

    }, 0);
})();