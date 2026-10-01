(function() {
    console.log("=== [SPA-INLINE] Módulo de Exames Físicos Dinâmico (Modo: Inserir/Atualizar) ===");

    const selectAtleta = document.getElementById('id_atleta');
    const selectTipoExame = document.getElementById('tipo_exame');
    const contentorDinamico = document.getElementById('contentor-campos-dinamicos');
    const zonaInputsDinamicos = document.getElementById('zona-inputs-dinamicos');

    let modalidadeEquipaGlobal = null;
    let idEventoGlobal = null;
    let idExameEmEdicaoGlobal = null;

    // ─── 1. ESTRUTURA COMPLETA DE CAMPOS ───
    const examesDefinicao = {
        "Exame Medico Base": {
            categoria: "🩺 Exames Médicos e Clínicos",
            label: "Triagem Clínica Base (Peso, Altura, PA, FC)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Pressão Arterial (Ex: 12/8)</label>
                    <input type="text" class="jogo-input" name="pressao_arterial" placeholder="Sistólica/Diastólica" required>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">FC Repouso (bpm)</label>
                    <input type="number" class="jogo-input" name="fc_repouso" placeholder="Ex: 58" required>
                </div>`
        },
        "ECG Repouso": {
            categoria: "🩺 Exames Médicos e Clínicos",
            label: "Eletrocardiograma (ECG) em Repouso",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Frequência Cardíaca (bpm)</label>
                    <input type="number" class="jogo-input" name="ecg_fc" placeholder="Ex: 60" required>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Resultado ECG</label>
                    <input type="text" class="jogo-input" name="ecg_resultado" placeholder="Ex: Normal / Sem anomalias" required>
                </div>`
        },
        "Análises Clínicas Sanguíneas": {
            categoria: "🩺 Exames Médicos e Clínicos",
            label: "Análises Clínicas Sanguíneas",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Hemoglobina (g/dL)</label>
                    <input type="number" step="0.1" class="jogo-input" name="sangue_hemoglobina" placeholder="Ex: 14.5" required>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Ferritina (ng/mL)</label>
                    <input type="number" class="jogo-input" name="sangue_ferritina" placeholder="Ex: 120" required>
                </div>`
        },
        "Exame Fisioterapeutico": {
            categoria: "🩺 Exames Médicos e Clínicos",
            label: "Exame Fisioterapêutico / Screening Postural",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Flexibilidade Isquios (º)</label>
                    <input type="number" class="jogo-input" name="fisio_isquios" placeholder="Ex: 80">
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Assimetrias Detetadas</label>
                    <input type="text" class="jogo-input" name="fisio_assimetrias" placeholder="Ex: Nenhuma / Escoliose ligeira">
                </div>`
        },
        "Avaliacao Podologica": {
            categoria: "🩺 Exames Médicos e Clínicos",
            label: "Avaliação Podológica / Baropodometria",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Passada Esq.</label>
                    <input type="text" class="jogo-input" name="pod_passada_esq" placeholder="Pronador/Supinador/Neutro" required>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Passada Dir.</label>
                    <input type="text" class="jogo-input" name="pod_passada_dir" placeholder="Pronador/Supinador/Neutro" required>
                </div>`
        },
        "Yo-Yo IR Test (Level 1)": {
            categoria: "🏃 Testes Físicos Gerais e Performance",
            label: "Yo-Yo Intermittent Recovery Test (Level 1)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Velocidade Final (km/h)</label>
                    <input type="number" step="0.1" class="jogo-input" name="yoyo_velocidade" placeholder="Ex: 16.5" required>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Distância Total (m)</label>
                    <input type="number" class="jogo-input" name="yoyo_distancia" placeholder="Ex: 1240" required>
                </div>`
        },
        "Course Navette": {
            categoria: "🏃 Testes Físicos Gerais e Performance",
            label: "Course Navette (VO2 Máx)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Último Patamar</label>
                    <input type="number" step="0.5" class="jogo-input" name="navette_patamar" placeholder="Ex: 11.5" required>
                </div>`
        },
        "Sprint de Velocidade (30m)": {
            categoria: "🏃 Testes Físicos Gerais e Performance",
            label: "Sprint em Linha Reta (10m e 30m)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Tempo 10m (s)</label>
                    <input type="number" step="0.01" class="jogo-input" name="sprint_10m" placeholder="Ex: 1.74" required>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Tempo Total 30m (s)</label>
                    <input type="number" step="0.01" class="jogo-input" name="sprint_30m" placeholder="Ex: 4.12" required>
                </div>`
        },
        "Salto Vertical": {
            categoria: "🏃 Testes Físicos Gerais e Performance",
            label: "Salto Vertical / CMJ (Potência Muscular)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Altura do Salto (cm)</label>
                    <input type="number" step="0.1" class="jogo-input" name="salto_altura" placeholder="Ex: 42.5" required>
                </div>`
        },
        "Illinois Agility Test": {
            categoria: "🏃 Testes Físicos Gerais e Performance",
            label: "Illinois Agility Test (Agilidade)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Tempo Total (s)</label>
                    <input type="number" step="0.01" class="jogo-input" name="illinois_tempo" placeholder="Ex: 15.42" required>
                </div>`
        },
        "FMS Functional Screen": {
            categoria: "🏃 Testes Físicos Gerais e Performance",
            label: "Functional Movement Screen (FMS)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Pontuação Total (Máx 21)</label>
                    <input type="number" min="0" max="21" class="jogo-input" name="fms_score" placeholder="Ex: 16" required>
                </div>`
        },
        "Teste RAST Futebol": {
            categoria: "⚽ Específicos: Futebol",
            modalidade: "futebol",
            label: "Teste de RAST (Potência Anaeróbica)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Potência Máxima (W)</label>
                    <input type="number" class="jogo-input" name="rast_pot_max" placeholder="Ex: 650" required>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Índice de Fadiga (%)</label>
                    <input type="number" step="0.1" class="jogo-input" name="rast_fadiga" placeholder="Ex: 28.4" required>
                </div>`
        },
        "Avaliacao Isocinetica": {
            categoria: "⚽ Específicos: Futebol",
            modalidade: "futebol",
            label: "Avaliação Isocinética (Coxa)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Rácio Isquio/Quad Dir(%)</label>
                    <input type="number" class="jogo-input" name="iso_racio_dir" placeholder="Ideal > 60%" required>
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Rácio Isquio/Quad Esq(%)</label>
                    <input type="number" class="jogo-input" name="iso_racio_esq" placeholder="Ideal > 60%" required>
                </div>`
        },
        "Radar de Remate (Andebol)": {
            categoria: "🤾 Específicos: Andebol",
            modalidade: "andebol",
            label: "Teste de Lançamento com Radar",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Velocidade Máxima (km/h)</label>
                    <input type="number" class="jogo-input" name="radar_vel_max" placeholder="Ex: 95" required>
                </div>`
        },
        "Lancamento Bola Medicinal": {
            categoria: "🤾 Específicos: Andebol",
            modalidade: "andebol",
            label: "Medicine Ball Overhead Throw",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:0.01;">Distância (m)</label>
                    <input type="number" step="0.01" class="jogo-input" name="medball_distancia" placeholder="Ex: 6.45" required>
                </div>`
        },
        "Agilidade Defensiva Andebol": {
            categoria: "🤾 Específicos: Andebol",
            modalidade: "andebol",
            label: "Circuito de Agilidade Defensiva",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Tempo de Execução (s)</label>
                    <input type="number" step="0.01" class="jogo-input" name="andebol_def_tempo" placeholder="Ex: 12.15" required>
                </div>`
        },
        "Line Drill Basquetebol": {
            categoria: "🏀 Específicos: Basquetebol",
            modalidade: "basquetebol",
            label: "Line Drill (Teste de Suicídios)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Tempo do Circuito (s)</label>
                    <input type="number" step="0.01" class="jogo-input" name="basket_suicidio_tempo" placeholder="Ex: 28.30" required>
                </div>`
        },
        "Salto Vertical Maximo Basquet": {
            categoria: "🏀 Específicos: Basquetebol",
            modalidade: "basquetebol",
            label: "Salto Vertical Máximo com Corrida (Vertec)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Alcance c/ Corrida (cm)</label>
                    <input type="number" class="jogo-input" name="basket_vertec_max" placeholder="Ex: 315" required>
                </div>`
        },
        "Lane Agility Test (Basquetebol)": {
            categoria: "🏀 Específicos: Basquetebol",
            modalidade: "basquetebol",
            label: "Lane Agility Test (Combine NBA)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Tempo de Execução (s)</label>
                    <input type="number" step="0.01" class="jogo-input" name="basket_lane_tempo" placeholder="Ex: 11.25" required>
                </div>`
        },
        "Velocidade em Patins 30m (Hóquei)": {
            categoria: "🏑 Específicos: Hóquei em Patins",
            modalidade: "hóquei em patins",
            label: "Velocidade em Patins (Reta de 30m)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Tempo c/ Stick e Bola (s)</label>
                    <input type="number" step="0.01" class="jogo-input" name="hoquei_vel_bola" placeholder="Ex: 4.15" required>
                </div>`
        },
        "Agilidade e Travagem Patins": {
            categoria: "🏑 Específicos: Hóquei em Patins",
            modalidade: "hóquei em patins",
            label: "Circuito de Agilidade e Travagem",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Tempo Total (s)</label>
                    <input type="number" step="0.01" class="jogo-input" name="hoquei_agilidade_tempo" placeholder="Ex: 14.80" required>
                </div>`
        },
        "Dinamometria Manual Hoquei": {
            categoria: "🏑 Específicos: Hóquei em Patins",
            modalidade: "hóquei em patins",
            label: "Dinamometria Manual (Preensão Stick)",
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label class="jogo-stats-team-label" style="text-align:left;">Força Mão Dir. (kg)</label>
                    <input type="number" step="0.1" class="jogo-input" name="hoquei_forca_dir" placeholder="Ex: 48.5" required>
                </div>`
        }
    };

    // ─── 2. DETEÇÃO DE MUDANÇA NO SELECT DE EXAMES ───
    if (selectTipoExame) {
        selectTipoExame.addEventListener('change', function() {
            const exameSelecionado = this.value;
            if (examesDefinicao[exameSelecionado] && zonaInputsDinamicos && contentorDinamico) {
                zonaInputsDinamicos.innerHTML = examesDefinicao[exameSelecionado].html;
                contentorDinamico.style.display = 'block';
            } else if (contentorDinamico && zonaInputsDinamicos) {
                contentorDinamico.style.display = 'none';
                zonaInputsDinamicos.innerHTML = '';
            }
        });
    }

    // ─── 3. CONSTRUÇÃO COMPLETA FILTRANDO APENAS POR DESPORTO (SEM ESCONDER HISTÓRICO) ───
    function renderizarSelectExames(modalidadeAlvo) {
        if (!selectTipoExame) return;

        if (contentorDinamico) contentorDinamico.style.display = 'none';
        if (zonaInputsDinamicos) zonaInputsDinamicos.innerHTML = '';

        let htmlOpcoes = `<option value="" selected disabled>Escolha um teste físico...</option>`;
        const grupos = {};

        const modAlvoTratada = modalidadeAlvo ? modalidadeAlvo.toLowerCase().trim() : '';

        for (const [chave, dados] of Object.entries(examesDefinicao)) {
            const modExameTratada = dados.modalidade ? dados.modalidade.toLowerCase().trim() : '';

            // Regra: Mostra se for exame geral OU se coincidir com o desporto da equipa
            if (!dados.modalidade || modExameTratada === modAlvoTratada) {
                if (!grupos[dados.categoria]) {
                    grupos[dados.categoria] = [];
                }
                grupos[dados.categoria].push({ chave: chave, label: dados.label });
            }
        }

        for (const [nomeCategoria, listaItens] of Object.entries(grupos)) {
            htmlOpcoes += `<optgroup label="${nomeCategoria}">`;
            listaItens.forEach(item => {
                htmlOpcoes += `<option value="${item.chave}">${item.label}</option>`;
            });
            htmlOpcoes += `</optgroup>`;
        }
        selectTipoExame.innerHTML = htmlOpcoes;
    }

    // ─── 4. CARREGAMENTO DOS DADOS INICIAIS ───
    async function carregarDadosIniciais() {
        if (!selectAtleta) return;
        try {
            const urlParams = new URLSearchParams(window.location.search);
            idEventoGlobal = urlParams.get('evento') || urlParams.get('id');

            selectAtleta.innerHTML = '<option value="" disabled selected>A carregar atletas ativos...</option>';
            
            const resposta = await fetch(`/mngr/api/treinador/atletas-equipa${window.location.search}`);
            if (!resposta.ok) throw new Error("Erro na comunicação com a rota.");
            
            const dadosDoServidor = await resposta.json();
            
            modalidadeEquipaGlobal = dadosDoServidor.modalidade || ''; 
            const atletas = dadosDoServidor.atletas || [];

            selectAtleta.innerHTML = '<option value="" disabled selected>Escolha o jogador...</option>';
            
            atletas.forEach(atleta => {
                const opt = document.createElement('option');
                opt.value = atleta.id;
                opt.textContent = atleta.nome;
                selectAtleta.appendChild(opt);
            });

            const atletaIdUrl = urlParams.get('atleta_id') || urlParams.get('id_atleta');
            if (atletaIdUrl) {
                selectAtleta.value = atletaIdUrl;
            }

            // Desenha a árvore completa de exames
            renderizarSelectExames(modalidadeEquipaGlobal);

            // ─── MODO EDIÇÃO: se vier ?exame_id=, busca o exame existente e pré-preenche o formulário ───
            idExameEmEdicaoGlobal = urlParams.get('exame_id');
            if (idExameEmEdicaoGlobal) {
                await carregarExameParaEdicao(idExameEmEdicaoGlobal);
            }

        } catch (err) {
            console.error("Erro ao popular combobox de atletas:", err);
            selectAtleta.innerHTML = '<option value="">Erro ao carregar lista.</option>';
        }
    }

    // ─── CARREGA UM EXAME EXISTENTE E PRÉ-PREENCHE O FORMULÁRIO (MODO EDIÇÃO) ───
    async function carregarExameParaEdicao(idExame) {
        try {
            const resposta = await fetch(`/mngr/api/treinador/exames_fisicos/${idExame}`);
            const resultado = await resposta.json();

            if (!resposta.ok || !resultado.success) {
                mostrarAlerta(resultado.error || "Não foi possível carregar o exame para edição.");
                return;
            }

            const exame = resultado.exame;

            // Garante que o evento associado ao exame é usado na submissão (upsert)
            idEventoGlobal = exame.id_evento;

            if (selectAtleta) selectAtleta.value = exame.id_atleta;
            if (selectTipoExame) {
                selectTipoExame.value = exame.tipo_exame;
                // Dispara o evento 'change' manualmente para desenhar os campos dinâmicos certos
                selectTipoExame.dispatchEvent(new Event('change'));
            }

            // Preenche os campos dinâmicos com os valores já guardados
            if (exame.dados && zonaInputsDinamicos) {
                Object.entries(exame.dados).forEach(([nome, valor]) => {
                    const input = zonaInputsDinamicos.querySelector(`[name="${nome}"]`);
                    if (input) input.value = valor;
                });
            }

            const campoObservacoes = document.getElementById('observacoes');
            if (campoObservacoes) campoObservacoes.value = exame.observacoes || '';

            // Ajusta o título e o botão para refletir o modo de edição
            const tituloPagina = document.querySelector('.jogo-team-name');
            if (tituloPagina) {
                tituloPagina.innerHTML = `<i class="fas fa-edit" style="color: #8b5cf6;"></i> Editar Exame Físico`;
            }
            const btnSubmeter = document.querySelector('#formExameFisico button[type="submit"]');
            if (btnSubmeter) btnSubmeter.innerHTML = `<i class="fas fa-save"></i> Atualizar Resultados`;

        } catch (err) {
            console.error("Erro ao carregar exame para edição:", err);
            mostrarAlerta("Ocorreu um erro ao carregar os dados do exame para edição.");
        }
    }

    // ─── SUBMISSÃO DO FORMULÁRIO ───
    const formExameFisico = document.getElementById('formExameFisico');

    if (formExameFisico) {
        formExameFisico.addEventListener('submit', async function(e) {
            e.preventDefault();

            const atletaId = selectAtleta ? selectAtleta.value : '';
            const tipoExame = selectTipoExame ? selectTipoExame.value : '';
            const observacoes = document.getElementById('observacoes') ? document.getElementById('observacoes').value : '';

            if (!atletaId || !tipoExame) {
                mostrarAlerta("Por favor, certifique-se de escolher o atleta e o tipo de teste.","aviso");
                return;
            }

            if (!idEventoGlobal) {
                mostrarAlerta("Erro Técnico: ID do Evento em falta no URL.");
                return;
            }

            const inputsDinamicos = zonaInputsDinamicos.querySelectorAll('input, select, textarea');
            const dadosExame = {};
            let camposVazios = false;

            inputsDinamicos.forEach(input => {
                if (input.hasAttribute('required') && !input.value.trim()) {
                    camposVazios = true;
                    input.style.borderColor = 'red';
                } else {
                    input.style.borderColor = '';
                }
                if (input.name) {
                    dadosExame[input.name] = input.value.trim();
                }
            });

            if (camposVazios) {
                mostrarAlerta("Por favor, preencha todos os campos obrigatórios do teste.","aviso");
                return;
            }

            const payload = {
                id_atleta: parseInt(atletaId),
                id_evento: parseInt(idEventoGlobal),
                tipo_exame: tipoExame,
                dados: dadosExame,
                observacoes: observacoes
            };

            try {
                const resposta = await fetch('/mngr/api/treinador/exames_fisicos', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Solicitado-Por': 'SPA'
                    },
                    body: JSON.stringify(payload)
                });

                const resultado = await resposta.json();

                if (resposta.ok && resultado.success) {
                    mostrarAlerta(resultado.message || "Operação efetuada com sucesso!","sucesso");
                    voltarParaOrigem();
                } else {
                    mostrarAlerta(` Erro: ${resultado.error || 'Erro desconhecido.'}`);
                }

            } catch (err) {
                console.error("Erro na submissão:", err);
                mostrarAlerta("Ocorreu um erro na ligação com o servidor.");
            }
        });
    }

    // ─── DETERMINA PARA ONDE VOLTAR (Cancelar / após gravar com sucesso) ───
    // Se o formulário foi aberto em modo edição (veio de Estatísticas, via
    // ?exame_id=), volta para a aba de Exames das Estatísticas. Caso contrário
    // (modo criação, veio do Calendário, via ?id= do evento), volta ao Calendário.
    function voltarParaOrigem() {
        const destino = idExameEmEdicaoGlobal
            ? '/mngr/dashboard/estatisticas?vista=exames'
            : '/mngr/dashboard/calendario';

        window.history.pushState({}, '', destino);
        if (typeof window.carregarPedacoPagina === 'function' && window.appConteudoCentral) {
            window.carregarPedacoPagina(destino, window.appConteudoCentral);
            if (typeof window.sincronizarMenuAtivo === 'function') window.sincronizarMenuAtivo(destino);
        } else {
            window.location.href = destino;
        }
    }

    // ─── BOTÃO CANCELAR: volta ao ecrã de origem sem gravar nada ───
    const btnCancelar = document.getElementById('btn-cancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            voltarParaOrigem();
        });
    }

    carregarDadosIniciais();
})();