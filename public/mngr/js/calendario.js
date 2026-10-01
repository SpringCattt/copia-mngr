// public/mngr/js/calendario.js
(function() {

    // ── Modal de Feedback inline (global para notificações e calendário) ─
    window.abrirModalFeedbackCalendario = async function abrirModalFeedbackCalendario(eventoId, titulo, dataHora) {
        // Remover modal anterior se existir
        const existente = document.getElementById('cal-feedback-modal');
        if (existente) existente.remove();

        let rpeSelecionado = null, fadigaSelecionada = null, sonoSelecionado = null;
        let observacoesExistentes = '';

        // 🌟 1. BUSCAR DADOS NA NOVA ROTA BLINDADA
        try {
            const resFetch = await fetch(`/mngr/api/calendario/sessao-feedback/${eventoId}`);
            const dataFetch = await resFetch.json();
            if (dataFetch.success && dataFetch.feedback) {
                rpeSelecionado = dataFetch.feedback.rpe;
                fadigaSelecionada = dataFetch.feedback.fadiga;
                sonoSelecionado = dataFetch.feedback.sono;
                observacoesExistentes = dataFetch.feedback.observacoes || '';
            }
        } catch (e) { console.error("Erro ao puxar dados antigos:", e); }

        const modal = document.createElement('div');
        modal.id = 'cal-feedback-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';

        const dataFormatada = new Date(dataHora).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

        modal.innerHTML = `
            <div class="modal-content" style="max-width:560px;text-align:left;padding:0;overflow:hidden;">
                <div style="padding:20px 24px 16px;border-bottom:1px solid #e2e8f0;">
                    <h2 style="margin:0;font-size:17px;font-weight:800;color:var(--text-primary,#0f172a);">Feedback Pós-Treino</h2>
                </div>
                <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;">
                    <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;">
                        <div>
                            <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#64748b);display:block;margin-bottom:4px;">Treino</label>
                            <input type="text" value="${titulo.replace(/"/g,'&quot;')}" readonly style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:var(--text-primary,#0f172a);font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#64748b);display:block;margin-bottom:4px;">Data</label>
                            <input type="text" value="${dataFormatada}" readonly style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:var(--text-primary,#0f172a);font-size:13px;box-sizing:border-box;text-align:center;">
                        </div>
                    </div>
                    <div class="card" style="margin:0;padding:14px 16px;">
                        <p style="margin:0 0 2px 0;font-size:13px;font-weight:700;color:var(--text-primary,#0f172a);">Avaliação de Esforço (RPE)</p>
                        <p style="margin:0;font-size:12px;color:var(--text-muted,#64748b);">Quão difícil foi o treino? (1 = muito fácil, 10 = máximo)</p>
                        <div style="display:flex;justify-content:space-between;gap:4px;margin-top:12px;">
                            ${[1,2,3,4,5,6,7,8,9,10].map(n => `<button class="cf-rpe-btn" data-val="${n}" style="flex:1;height:36px;border-radius:8px;background:#f1f5f9;color:#0f172a;border:1px solid #e2e8f0;font-weight:700;font-size:13px;cursor:pointer;">${n}</button>`).join('')}
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div class="card" style="margin:0;padding:14px 16px;text-align:center;">
                            <p style="margin:0 0 2px 0;font-size:13px;font-weight:700;color:var(--text-primary,#0f172a);">Fadiga</p>
                            <p style="margin:0;font-size:11px;color:var(--text-muted,#64748b);">1 = sem fadiga · 5 = esgotado</p>
                            <div class="cf-rating-fadiga" style="display:flex;justify-content:center;gap:6px;margin-top:8px;">
                                ${[1,2,3,4,5].map(n => `<span class="cf-rating-icon" data-val="${n}" style="font-size:24px;cursor:pointer;filter:grayscale(100%) opacity(25%);">💪</span>`).join('')}
                            </div>
                        </div>
                        <div class="card" style="margin:0;padding:14px 16px;text-align:center;">
                            <p style="margin:0 0 2px 0;font-size:13px;font-weight:700;color:var(--text-primary,#0f172a);">Qualidade do Sono</p>
                            <p style="margin:0;font-size:11px;color:var(--text-muted,#64748b);">1 = péssimo · 5 = excelente</p>
                            <div class="cf-rating-sono" style="display:flex;justify-content:center;gap:6px;margin-top:8px;">
                                ${[1,2,3,4,5].map(n => `<span class="cf-rating-icon" data-val="${n}" style="font-size:24px;cursor:pointer;filter:grayscale(100%) opacity(25%);">⚡</span>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted,#64748b);display:block;margin-bottom:4px;">Observações (opcional)</label>
                        <textarea id="cf-observacoes" rows="2" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;resize:none;font-size:13px;background:#f8fafc;box-sizing:border-box;">${observacoesExistentes}</textarea>
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:4px;">
                        <button id="cf-btn-cancelar" style="padding:10px 20px;border-radius:8px;border:1px solid #e2e8f0;background:white;font-size:14px;font-weight:600;cursor:pointer;">Cancelar</button>
                        <button id="cf-btn-submeter" class="btn-primary-action" style="margin:0;padding:10px 24px;font-size:14px;border-radius:8px;background:#0ea5e9;color:white;border:none;">Submeter</button>
                    </div>
                </div>
            </div>`;

        document.body.appendChild(modal);

        // 🌟 2. PREENCHER E INICIALIZAR BOTÕES RPE
        modal.querySelectorAll('.cf-rpe-btn').forEach(btn => {
            if (rpeSelecionado && btn.getAttribute('data-val') == rpeSelecionado) {
                btn.style.background = '#0b5394'; btn.style.color = 'white'; btn.style.borderColor = '#0b5394';
            }
            btn.addEventListener('click', function() {
                modal.querySelectorAll('.cf-rpe-btn').forEach(b => { b.style.background = '#f1f5f9'; b.style.color = '#0f172a'; b.style.borderColor = '#e2e8f0'; });
                this.style.background = '#0b5394'; this.style.color = 'white'; this.style.borderColor = '#0b5394';
                rpeSelecionado = this.getAttribute('data-val');
            });
        });

        // 🌟 3. PREENCHER E INICIALIZAR EMOJIS (FADIGA/SONO)
        function setupRating(containerClass, callback, valorAtual) {
            const icons = modal.querySelectorAll(`.${containerClass} .cf-rating-icon`);
            
            function atualizarVisuais(val) {
                icons.forEach(i => {
                    i.style.filter = parseInt(i.getAttribute('data-val')) <= val ? 'grayscale(0%) opacity(100%)' : 'grayscale(100%) opacity(25%)';
                });
            }
            if (valorAtual) atualizarVisuais(valorAtual);

            icons.forEach(icon => {
                icon.addEventListener('click', function() {
                    const val = parseInt(this.getAttribute('data-val'));
                    callback(val);
                    atualizarVisuais(val);
                });
            });
        }
        setupRating('cf-rating-fadiga', v => fadigaSelecionada = v, fadigaSelecionada);
        setupRating('cf-rating-sono', v => sonoSelecionado = v, sonoSelecionado);

        // Cancelar
        modal.querySelector('#cf-btn-cancelar').addEventListener('click', () => modal.remove());

        // Submeter
        modal.querySelector('#cf-btn-submeter').addEventListener('click', async () => {
            if (!rpeSelecionado || !fadigaSelecionada || !sonoSelecionado) {
                mostrarAlerta('Por favor preenche o RPE, Fadiga e Sono antes de submeter.','aviso');
                return;
            }
            const btn = modal.querySelector('#cf-btn-submeter');
            btn.disabled = true; btn.textContent = 'A enviar...';
            try {
                const res = await fetch(`/mngr/api/calendario/sessao-feedback/${eventoId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rpe: rpeSelecionado, fadiga: fadigaSelecionada, sono: sonoSelecionado, observacoes: document.getElementById('cf-observacoes').value })
                });
                const data = await res.json();
                if (data.success) {
                    modal.remove();
                    mostrarAlerta('Feedback guardado com sucesso! Já podes consultar as estatísticas.','sucesso');
                } else {
                    mostrarAlerta('Erro ao guardar: ' + data.message);
                    btn.disabled = false; btn.textContent = 'Submeter';
                }
            } catch (e) {
                mostrarAlerta('Erro de ligação ao servidor.');
                btn.disabled = false; btn.textContent = 'Submeter';
            }
        });
    };
    
    // ── Modal de Ata de Reunião ─ (AGORA COM PROTEÇÃO DE ROLE) ─
    window.abrirModalAta = async function abrirModalAta(eventoId, titulo, dataHora, role) {
        const existente = document.getElementById('cal-ata-modal');
        if (existente) existente.remove();

        const isTreinador = role === 'treinador';
        let resumoExistente = '';
        let anotacoesExistentes = '';

        try {
            const resFetch = await fetch(`/mngr/api/calendario/ata/${eventoId}`);
            const dataFetch = await resFetch.json();
            if (dataFetch.success && dataFetch.ata) {
                const ataParseada = JSON.parse(dataFetch.ata);
                resumoExistente = ataParseada.resumo || '';
                anotacoesExistentes = ataParseada.anotacoes || '';
            }
        } catch (e) { console.error("Erro ao puxar ata antiga:", e); }

        const modal = document.createElement('div');
        modal.id = 'cal-ata-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';

        const dataFormatada = new Date(dataHora).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

        // Definições visuais dependendo se é treinador ou não
        const attrSomenteLeitura = isTreinador ? '' : 'readonly';
        const bgCor = isTreinador ? '#ffffff' : '#f1f5f9';
        const txtCor = isTreinador ? '#0f172a' : '#64748b';
        const placeholderResumo = isTreinador ? 'O que foi discutido de forma geral...' : 'Nenhum resumo registado.';
        const placeholderAnotacoes = isTreinador ? 'Ex:\n1. O João vai tratar do material...\n2. Decidido alterar o horário...' : 'Nenhuma anotação registada.';

        modal.innerHTML = `
            <div class="modal-content" style="max-width:600px;text-align:left;padding:0;overflow:hidden;">
                <div style="padding:20px 24px 16px;border-bottom:1px solid #e2e8f0;background-color:#f59e0b;color:white;">
                    <h2 style="margin:0;font-size:18px;font-weight:800;">Ata de Reunião</h2>
                </div>
                <div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;">
                    <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;">
                        <div>
                            <label style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted,#64748b);display:block;margin-bottom:4px;">Tópico</label>
                            <input type="text" value="${titulo.replace(/"/g,'&quot;')}" readonly style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:var(--text-primary,#0f172a);font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted,#64748b);display:block;margin-bottom:4px;">Data</label>
                            <input type="text" value="${dataFormatada}" readonly style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;color:var(--text-primary,#0f172a);font-size:13px;box-sizing:border-box;text-align:center;">
                        </div>
                    </div>
                    
                    <div>
                        <label style="font-size:12px;font-weight:700;color:var(--text-primary,#0f172a);display:block;margin-bottom:6px;">Resumo Geral da Reunião</label>
                        <textarea id="ata-resumo" rows="4" placeholder="${placeholderResumo}" ${attrSomenteLeitura} style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;resize:vertical;font-size:13px;box-sizing:border-box; background-color:${bgCor}; color:${txtCor};">${resumoExistente}</textarea>
                    </div>
                    
                    <div>
                        <label style="font-size:12px;font-weight:700;color:var(--text-primary,#0f172a);display:block;margin-bottom:6px;">Anotações Importantes (Decisões/Tarefas)</label>
                        <textarea id="ata-anotacoes" rows="4" placeholder="${placeholderAnotacoes}" ${attrSomenteLeitura} style="width:100%;padding:10px;border-radius:8px;border:1px solid #e2e8f0;resize:vertical;font-size:13px;box-sizing:border-box; background-color:${bgCor}; color:${txtCor};">${anotacoesExistentes}</textarea>
                    </div>

                    <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:10px;">
                        <button id="ata-btn-cancelar" style="padding:10px 20px;border-radius:8px;border:1px solid #e2e8f0;background:white;font-size:14px;font-weight:600;cursor:pointer;">Fechar</button>
                        ${isTreinador ? `<button id="ata-btn-submeter" style="margin:0;padding:10px 24px;font-size:14px;font-weight:600;border-radius:8px;background:#f59e0b;color:white;border:none;cursor:pointer;">Guardar Ata</button>` : ''}
                    </div>
                </div>
            </div>`;

        document.body.appendChild(modal);

        modal.querySelector('#ata-btn-cancelar').addEventListener('click', () => modal.remove());

        // Lógica de gravação ativa APENAS para treinadores
        const btnSubmeter = modal.querySelector('#ata-btn-submeter');
        if (btnSubmeter) {
            btnSubmeter.addEventListener('click', async () => {
                const resumo = document.getElementById('ata-resumo').value;
                const anotacoes = document.getElementById('ata-anotacoes').value;
                
                btnSubmeter.disabled = true; 
                btnSubmeter.textContent = 'A guardar...';
                
                try {
                    const res = await fetch(`/mngr/api/calendario/ata/${eventoId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ resumo, anotacoes })
                    });
                    const data = await res.json();
                    if (data.success) {
                        modal.remove();
                        mostrarAlerta('Ata guardada com sucesso!','sucesso');
                    } else {
                        mostrarAlerta('Erro ao guardar: ' + data.message);
                        btnSubmeter.disabled = false; btnSubmeter.textContent = 'Guardar Ata';
                    }
                } catch (e) {
                    mostrarAlerta('Erro de ligação ao servidor.');
                    btnSubmeter.disabled = false; btnSubmeter.textContent = 'Guardar Ata';
                }
            });
        }
    };

    setTimeout(async function inicializarCalendario() {
        console.log("=== [SPA] Módulo do Calendário Iniciado ===");

        const gridAtivo = document.getElementById('grid-calendario');
        if (!gridAtivo) return;

        // 🌟 FORÇAR A SIDEBAR A MANTER-SE ATIVA NO CALENDÁRIO
        setTimeout(() => {
            document.querySelectorAll('.sidebar-menu a, .sidebar a, .nav-item').forEach(el => el.classList.remove('active'));
            const linkCalendario = document.querySelector('a[href="/mngr/dashboard/calendario"]');
            if (linkCalendario) {
                linkCalendario.classList.add('active');
                const liPai = linkCalendario.closest('li');
                if (liPai) liPai.classList.add('active');
            }
        }, 80);

        const tituloMes = document.querySelector('.cal-mngr-title');
        const btnAbrirModal = document.getElementById('btn-abrir-modal');
        const btnEditarEventoSelecionado = document.getElementById('btn-editar-evento-selecionado');
        const btnEliminarEventoSelecionado = document.getElementById('btn-eliminar-evento-selecionado');
        const modal = document.getElementById('modal-evento-mngr');
        const btnFecharModal = document.getElementById('btn-fechar-modal');
        const btnEliminarEventoModal = document.getElementById('btn-eliminar-evento-modal');
        const formEvento = document.getElementById('form-criar-evento');
        const btnMesAnterior = document.getElementById('btn-prev-mes');
        const btnMesSeguinte = document.getElementById('btn-next-mes');

        const selectTipoEvento = document.getElementById('select-tipo-evento');
        const selectCompeticao = document.getElementById('select-competicao'); 
        const camposJogo = document.getElementById('campos-jogo');
        const camposTreino = document.getElementById('campos-treino');
        
        const inputLogoRival = document.getElementById('logo_file_rival');

        const mesesNomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        
        const dataHoje = new Date();
        let mesAtual = dataHoje.getMonth();
        let anoAtual = dataHoje.getFullYear();
        
        let eventosCarregados = [];
        let competicoesCarregadas = [];
        let equipasCarregadas = [];
        let dataSelecionadaStr = null; 
        let modoFormulario = 'criar';
        let eventoEmEdicaoId = null;
        let eventoSelecionadoId = null;
        let podeGerirEventos = false;
        let usuarioRole = null;
        let popupEventoAtivo = null;
        
        let meuEscalaoId = null;
        let meuClubeId = null;

        function atualizarEstadoBotoesEvento() {
            const podeAtivar = podeGerirEventos && Boolean(eventoSelecionadoId);
            if (btnEditarEventoSelecionado) btnEditarEventoSelecionado.disabled = !podeAtivar;
            if (btnEliminarEventoSelecionado) btnEliminarEventoSelecionado.disabled = !podeAtivar;
        }

        function fecharPopupEvento() {
            if (popupEventoAtivo) {
                popupEventoAtivo.remove();
                popupEventoAtivo = null;
            }
        }

        function mostrarPopupEvento(evento, elemento) {
            fecharPopupEvento();
            if (!evento) return;

            const popup = document.createElement('div');
            popup.className = 'cal-mngr-popup';
            const duracaoHtml = evento.duracao ? `<p><span class="cal-mngr-popup-label">Duração:</span> ${evento.duracao} min</p>` : '';
            const escalaoHtml = evento.nome_escalao ? `<p><span class="cal-mngr-popup-label">Escalão:</span> ${evento.nome_escalao}</p>` : '';
            
            const equipaRivalHtml = evento.equipa_rival ? `<p><span class="cal-mngr-popup-label">Clube Rival:</span> ${evento.equipa_rival.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : '';
            
            // 1. Renderização dinâmica dos botões
            let btnAcaoHtml = '';
            const tiposTreino = ['treino_tatico', 'treino_fisico', 'treino_tecnico', 'treino'];
            if (evento.tipo_evento === 'jogo') {
                btnAcaoHtml = `<button class="cal-mngr-popup-btn-jogo" data-id="${evento.id}">Ver Jogo →</button>`;
            } else if (evento.tipo_evento === 'exame_fisico' && usuarioRole != 'atleta') {
                btnAcaoHtml = `<button class="cal-mngr-popup-btn-exame" data-id="${evento.id}" style="background-color: #8b5cf6; color: white; width: 100%; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background 0.2s;">Ver Exame →</button>`;
            } else if (tiposTreino.includes(evento.tipo_evento) && usuarioRole === 'treinador') {
                btnAcaoHtml = `<button class="cal-mngr-popup-btn-treino" data-id="${evento.id}" style="background-color: #0ea5e9; color: white; width: 100%; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background 0.2s;">Ver Treino →</button>`;
            } 
            
            // 🌟 NOVA LÓGICA DE REUNIÃO COM PROTEÇÃO DE TEMPO E TEXTO DO BOTÃO POR ROLE
            else if (evento.tipo_evento === 'reuniao') {
                const dataReuniao = new Date(evento.data_hora);
                const agora = new Date();
                const textoBotaoAta = usuarioRole === 'treinador' ? 'Ver / Escrever Ata →' : 'Ver Ata da Reunião →';
                
                if (agora >= dataReuniao) {
                    btnAcaoHtml = `<button class="cal-mngr-popup-btn-ata" data-id="${evento.id}" style="background-color: #f59e0b; color: white; width: 100%; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background 0.2s;">${textoBotaoAta}</button>`;
                } else {
                    btnAcaoHtml = `<button disabled style="background-color: #cbd5e1; color: #64748b; width: 100%; border: none; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: not-allowed; margin-top: 8px;">Ata disponível após o início</button>`;
                }
            }

            // 🌟 2. LÓGICA DO BOTÃO DE CLASSIFICAR
            let btnFeedbackHtml = '';
            const dataFim = new Date(new Date(evento.data_hora).getTime() + ((evento.duracao || 120) * 60000));
            const jaPassou = new Date() > dataFim;
            const tiposComFeedback = ['treino_tatico', 'treino_fisico', 'treino_tecnico'];

            if (usuarioRole === 'atleta' && jaPassou && tiposComFeedback.includes(evento.tipo_evento)) {
                btnFeedbackHtml = `<button class="cal-mngr-popup-btn-feedback" data-id="${evento.id}" style="display: block; text-align: center; width: 100%; box-sizing: border-box; text-decoration: none; padding: 10px; margin-top: 8px; border-radius: 6px; background: #e2e8f0; color: #0f172a; font-weight: bold; border: 1px solid #cbd5e1; transition: 0.2s; font-size: 13px; cursor: pointer;">⭐ Classificar Sessão</button>`;
            }

            // 3. Montagem do HTML Final
            popup.innerHTML = `
                <div class="cal-mngr-popup-header">
                    <h4>${(evento.titulo || 'Evento').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h4>
                </div>
                <div class="cal-mngr-popup-body">
                    ${escalaoHtml}
                    <p><span class="cal-mngr-popup-label">Hora:</span> ${new Date(evento.data_hora).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</p>
                    ${duracaoHtml}
                    ${equipaRivalHtml}
                    <p><span class="cal-mngr-popup-label">Local:</span> ${evento.local ? evento.local.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Não definido'}</p>
                    <p><span class="cal-mngr-popup-label">Descrição:</span> ${evento.descricao ? evento.descricao.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Sem descrição'}</p>
                    ${btnAcaoHtml}
                    ${btnFeedbackHtml}
                </div>
            `;

            // ==========================================
            // LISTENERS (Cliques nos botões do Balão)
            // ==========================================

            popup.querySelector('.cal-mngr-popup-btn-jogo')?.addEventListener('click', () => {
                const url = `/mngr/treinador/treinador_jogo?id=${evento.id}`;
                fecharPopupEvento();
                window.history.pushState({}, '', url);
                if (window.carregarPedacoPagina && window.appConteudoCentral) {
                    window.carregarPedacoPagina(url, window.appConteudoCentral);
                } else {
                    window.location.href = url;
                }
            });

            popup.querySelector('.cal-mngr-popup-btn-exame')?.addEventListener('click', () => {
                const url = `/mngr/treinador/exames_fisicos?id=${evento.id}`;
                fecharPopupEvento();
                window.history.pushState({}, '', url);
                if (window.carregarPedacoPagina && window.appConteudoCentral) {
                    window.carregarPedacoPagina(url, window.appConteudoCentral);
                } else {
                    window.location.href = url;
                }
            });

            popup.querySelector('.cal-mngr-popup-btn-treino')?.addEventListener('click', () => {
                fecharPopupEvento();
                const url = '/mngr/treinador/treinos';
                if (window.carregarPedacoPagina && window.appConteudoCentral) {
                    window.history.pushState({}, '', url);
                    window.carregarPedacoPagina(url, window.appConteudoCentral);
                    setTimeout(() => {
                        if (window.abrirTreinoNasPresencas) {
                            const dataFmt = new Date(evento.data_hora).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                            window.abrirTreinoNasPresencas(evento.id, evento.titulo, dataFmt);
                        }
                    }, 600);
                } else {
                    window.location.href = url;
                }
            });

            popup.querySelector('.cal-mngr-popup-btn-feedback')?.addEventListener('click', () => {
                fecharPopupEvento();
                abrirModalFeedbackCalendario(evento.id, evento.titulo, evento.data_hora);
            });

            popup.querySelector('.cal-mngr-popup-btn-ata')?.addEventListener('click', () => {
                fecharPopupEvento();
                abrirModalAta(evento.id, evento.titulo, evento.data_hora, usuarioRole);
            });

            document.body.appendChild(popup);
            const rect = elemento.getBoundingClientRect();
            
            const popupWidth = popup.offsetWidth || 240;
            const popupHeight = popup.offsetHeight || 150;
            
            let centroEvento = rect.left + (rect.width / 2);
            let leftPopup = centroEvento - (popupWidth / 2);
            let topPopup = rect.bottom + 8;

            if (leftPopup < 12) leftPopup = 12;
            if (leftPopup + popupWidth > window.innerWidth - 12) leftPopup = window.innerWidth - popupWidth - 12;
            if (topPopup + popupHeight > window.innerHeight - 12) topPopup = rect.top - popupHeight - 8;
            let arrowLeft = centroEvento - leftPopup;
            if (arrowLeft < 15) arrowLeft = 15;
            if (arrowLeft > popupWidth - 15) arrowLeft = popupWidth - 15;

            popup.style.setProperty('--arrow-left', `${arrowLeft}px`);
            popup.style.top = `${Math.max(12, topPopup)}px`;
            popup.style.left = `${Math.max(12, leftPopup)}px`;
            
            popupEventoAtivo = popup;
        }
        
        function renderizarSelectCompeticoes(competicoes) {
            if (!selectCompeticao) return;
            selectCompeticao.innerHTML = '<option value="">Sem competição</option>';
            competicoes.forEach(comp => {
                const option = document.createElement('option');
                option.value = comp.id;
                option.textContent = comp.nome;
                selectCompeticao.appendChild(option);
            });
        }

        function resetarFormularioEvento() {
            modoFormulario = 'criar';
            eventoEmEdicaoId = null;
            if (formEvento) {
                formEvento.reset();
                if (document.getElementById('id-evento-editar')) document.getElementById('id-evento-editar').value = '';
                if (document.getElementById('input-data-evento')) document.getElementById('input-data-evento').value = '';
                
                const inputClubeRivalReset = document.getElementById('input-clube-rival');
                if (inputClubeRivalReset) inputClubeRivalReset.value = '';

                if (selectCompeticao) {
                    selectCompeticao.value = "";
                    selectCompeticao.required = false;
                }
                const containerComp = document.getElementById('container-competicao');
                if (containerComp) containerComp.classList.add('cal-mngr-hidden');

                const labelTexto = formEvento.querySelector('.file-upload-label span');
                if (labelTexto) labelTexto.textContent = 'Selecionar imagem...';
            }
            if (document.getElementById('titulo-modal-evento')) document.getElementById('titulo-modal-evento').textContent = 'Novo Evento Desportivo';
            if (document.getElementById('btn-submit-evento')) document.getElementById('btn-submit-evento').textContent = 'Criar Evento';
            if (btnEliminarEventoModal) btnEliminarEventoModal.classList.add('cal-mngr-hidden');
            if (camposJogo) camposJogo.classList.add('cal-mngr-hidden');
            if (camposTreino) camposTreino.classList.add('cal-mngr-hidden');
            atualizarEstadoBotoesEvento();
        }

        function formatarDataParaInput(dataHora) {
            if (!dataHora) return '';
            const data = new Date(dataHora);
            const local = new Date(data.getTime() + (data.getTimezoneOffset() * 60000));
            return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
        }

        function formatarHoraParaInput(dataHora) {
            if (!dataHora) return '';
            const data = new Date(dataHora);
            const local = new Date(data.getTime() + (data.getTimezoneOffset() * 60000));
            return `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`;
        }

        function abrirModalEvento(evento = null) {
            resetarFormularioEvento();

            if (usuarioRole === 'gestor') {
                renderizarSelectCompeticoes([]);
                const selectEquipaDinamico = document.getElementById('select-nossa-equipa');
                if (selectEquipaDinamico) selectEquipaDinamico.value = '';
            }

            if (evento) {
                modoFormulario = 'editar';
                eventoEmEdicaoId = evento.id; 
                if (document.getElementById('id-evento-editar')) document.getElementById('id-evento-editar').value = evento.id;
                if (document.getElementById('titulo-modal-evento')) document.getElementById('titulo-modal-evento').textContent = 'Editar Evento';
                if (document.getElementById('btn-submit-evento')) document.getElementById('btn-submit-evento').textContent = 'Guardar Alterações';
                if (btnEliminarEventoModal) btnEliminarEventoModal.classList.remove('cal-mngr-hidden');

                if (formEvento) {
                    formEvento.elements.tipo_evento.value = evento.tipo_evento || '';
                    formEvento.elements.titulo.value = evento.titulo || '';
                    formEvento.elements.hora_inicio.value = formatarHoraParaInput(evento.data_hora);
                    formEvento.elements.local.value = evento.local || '';
                    formEvento.elements.descricao.value = evento.descricao || '';
                    formEvento.elements.duracao.value = evento.duracao || '';
                    
                    if (usuarioRole === 'gestor' && formEvento.elements.id_equipa_selecionada) {
                        formEvento.elements.id_equipa_selecionada.value = evento.id_equipa || '';
                        if (evento.id_equipa) {
                            const compsFiltradas = competicoesCarregadas.filter(c => String(c.id_equipa) === String(evento.id_equipa));
                            renderizarSelectCompeticoes(compsFiltradas);
                        }
                    }

                    if (evento.tipo_evento === 'jogo') {
                        const containerComp = document.getElementById('container-competicao');
                        if (containerComp) containerComp.classList.remove('cal-mngr-hidden');
                        if (selectCompeticao && evento.id_competicao) {
                            selectCompeticao.value = evento.id_competicao;
                        }
                    }

                    const inputClubeRival = document.getElementById('input-clube-rival');
                    if (inputClubeRival) inputClubeRival.value = evento.equipa_rival || '';

                    if (formEvento.elements.oficial) formEvento.elements.oficial.checked = Boolean(evento.oficial);
                    if (document.getElementById('input-data-evento')) document.getElementById('input-data-evento').value = formatarDataParaInput(evento.data_hora);
                }
                if (selectTipoEvento) selectTipoEvento.dispatchEvent(new Event('change'));
            } else if (dataSelecionadaStr) {
                if (document.getElementById('input-data-evento')) document.getElementById('input-data-evento').value = dataSelecionadaStr;
            }
            if (modal) modal.classList.remove('cal-mngr-hidden');
        }

        if (btnAbrirModal) btnAbrirModal.disabled = true;
        atualizarEstadoBotoesEvento();

        async function carregarDadosBase() {
            try {
                const resposta = await fetch('/mngr/api/calendario/dados');
                let dados;
                if (resposta.ok) {
                    dados = await resposta.json();
                    if (dados.usuario) {
                        usuarioRole = dados.usuario.role;
                        meuEscalaoId = dados.usuario.escalao;
                        meuClubeId = dados.usuario.clube;
                    }
                } else {
                    dados = { usuario: { role: 'treinador' }, eventos: [], competicoes: [] };
                    usuarioRole = 'treinador';
                }

                eventosCarregados = dados.eventos || [];
                competicoesCarregadas = dados.competicoes || [];
                equipasCarregadas = dados.equipas || [];
                podeGerirEventos = Boolean(dados.usuario) && (usuarioRole === 'gestor' || usuarioRole === 'treinador');

                if (btnAbrirModal) btnAbrirModal.classList.toggle('cal-mngr-hidden', !podeGerirEventos);
                if (btnEditarEventoSelecionado) btnEditarEventoSelecionado.classList.toggle('cal-mngr-hidden', !podeGerirEventos);
                if (btnEliminarEventoSelecionado) btnEliminarEventoSelecionado.classList.toggle('cal-mngr-hidden', !podeGerirEventos);
                const acoesContainer = document.querySelector('.cal-mngr-acoes');
                if (acoesContainer) acoesContainer.style.display = podeGerirEventos ? '' : 'none';

                renderizarSelectCompeticoes([]);

                const selectEquipaDinamico = document.getElementById('select-nossa-equipa');
                const containerSelecaoEquipa = document.getElementById('container-selecao-equipa-mngr');
                const containerCompModal = document.getElementById('container-competicao');
                if (containerCompModal) containerCompModal.classList.add('cal-mngr-hidden');
                if (usuarioRole === 'gestor') {
                    if (containerSelecaoEquipa) containerSelecaoEquipa.classList.remove('cal-mngr-hidden');
                    if (selectEquipaDinamico) {
                        selectEquipaDinamico.required = true;
                        selectEquipaDinamico.innerHTML = '<option value="">Selecione a equipa...</option>';
                        equipasCarregadas.forEach(eq => {
                            const opt = document.createElement('option');
                            opt.value = eq.id;
                            opt.textContent = eq.nome;
                            selectEquipaDinamico.appendChild(opt);
                        });
                        selectEquipaDinamico.addEventListener('change', function() {
                            const idEq = this.value;
                            const comps = idEq ? competicoesCarregadas.filter(c => String(c.id_equipa) === idEq) : [];
                            renderizarSelectCompeticoes(comps);
                        });
                    }
                } else {
                    if (containerSelecaoEquipa) containerSelecaoEquipa.classList.add('cal-mngr-hidden');
                    if (selectEquipaDinamico) selectEquipaDinamico.required = false;
                }

                const filtroWrapper = document.getElementById('filtro-equipa-wrapper');
                const filtroEquipa = document.getElementById('filtro-equipa');
                if (usuarioRole === 'gestor' && filtroWrapper && filtroEquipa) {
                    filtroWrapper.style.display = '';
                    filtroEquipa.innerHTML = '<option value="">Todas as equipas</option>';
                    equipasCarregadas.forEach(eq => {
                        const opt = document.createElement('option');
                        opt.value = eq.id;
                        opt.textContent = eq.nome;
                        filtroEquipa.appendChild(opt);
                    });
                    filtroEquipa.addEventListener('change', function () {
                        const idFiltro = this.value;
                        const eventosFiltrados = idFiltro
                            ? eventosCarregados.filter(e => String(e.id_equipa) === idFiltro)
                            : eventosCarregados;
                        renderizarMes(mesAtual, anoAtual, eventosFiltrados);
                    });
                }

                atualizarEstadoBotoesEvento();
                renderizarMes(mesAtual, anoAtual, eventosCarregados);
            } catch (erro) {
                console.error("Erro no fetch do calendário:", erro);
                renderizarMes(mesAtual, anoAtual, []);
            }
        }

        function renderizarMes(mes, ano, eventos) {
            fecharPopupEvento();
            if (tituloMes) tituloMes.innerText = `${mesesNomes[mes]} ${ano}`;
            gridAtivo.innerHTML = '';

            let diaSemanaJS = new Date(ano, mes, 1).getDay();
            let primeiroDiaMes = diaSemanaJS === 0 ? 6 : diaSemanaJS - 1; 

            let diasNoMes = new Date(ano, mes + 1, 0).getDate(); 
            let diasMesAnterior = new Date(ano, mes, 0).getDate(); 
            let totalCelulas = 42; 
            let htmlGrid = '';

            for (let i = 0; i < totalCelulas; i++) {
                if (i < primeiroDiaMes) {
                    let diaAnterior = diasMesAnterior - (primeiroDiaMes - 1) + i;
                    htmlGrid += `<div class="cal-mngr-celda" style="background: #f8fafc; color: #94a3b8; opacity: 0.6;"><span class="num-dia">${diaAnterior}</span></div>`;
                } else if (i >= primeiroDiaMes + diasNoMes) {
                    let diaSeguinte = i - (primeiroDiaMes + diasNoMes) + 1;
                    htmlGrid += `<div class="cal-mngr-celda" style="background: #f8fafc; color: #94a3b8; opacity: 0.6;"><span class="num-dia">${diaSeguinte}</span></div>`;
                } else {
                    let diaAtual = i - primeiroDiaMes + 1;
                    let htmlEventos = '';
                    
                    let ehHoje = (diaAtual === dataHoje.getDate() && mes === dataHoje.getMonth() && ano === dataHoje.getFullYear());
                    let classeHoje = ehHoje ? 'dia-hoje' : '';

                    let eventosDoDia = eventos.filter(e => {
                        if (!e.data_hora) return false;
                        let d = new Date(e.data_hora);
                        let dataLocal = new Date(d.getTime() + (d.getTimezoneOffset() * 60000));
                        return dataLocal.getDate() === diaAtual && dataLocal.getMonth() === mes && dataLocal.getFullYear() === ano;
                    });

                    let eventosOrdenados = eventosDoDia.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

                    eventosOrdenados.forEach(evento => {
                        let corFundo = '#64748b'; 
                        if (evento.tipo_evento === 'jogo') corFundo = '#059669';
                        else if (evento.tipo_evento === 'reuniao') corFundo = '#f59e0b';
                        else if (evento.tipo_evento.includes('treino')) corFundo = '#0ea5e9'; 
                        else if (evento.tipo_evento === 'exame_fisico') corFundo = '#8b5cf6';

                        let horaFormatada = new Date(evento.data_hora).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                        const estaSelecionado = String(evento.id) === String(eventoSelecionadoId);
                        const bordaSelecionada = estaSelecionado ? 'border: 2px solid #fef3c7;' : 'border: 1px solid rgba(255,255,255,0.3);';

                        let sufixoEscalao = (usuarioRole === 'gestor' && evento.nome_escalao) ? ` [${evento.nome_escalao}]` : '';

                        htmlEventos += `
                            <div class="cal-mngr-evento-item" data-id="${evento.id}" style="background-color: ${corFundo}; color: white; font-size: 11px; padding: 4px; margin-top: 4px; border-radius: 4px; text-align: left; cursor: pointer; ${bordaSelecionada}">
                                <div style="font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${evento.titulo}${sufixoEscalao}</div>
                                <div>${horaFormatada}</div>
                            </div>
                        `;
                    });

                    let stringDataCelula = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`;
                    let classeSelecao = (dataSelecionadaStr === stringDataCelula) ? 'dia-selecionado' : '';

                    let bolinhaHtml = '';
                    if (eventosOrdenados.length > 0) {
                        bolinhaHtml = `
                            <span
                                style="position: absolute; top: 4px; left: 4px; background-color: #8b5cf6; color: white; border-radius: 50%; min-width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 10; cursor: default; transition: transform 0.2s; gap: 2px;"
                                onmouseover="this.style.transform='scale(1.2)'"
                                onmouseout="this.style.transform='scale(1)'"
                            >
                                ${eventosOrdenados.length}
                            </span>`;
                    }

                    htmlGrid += `
                        <div class="cal-mngr-celda dia-clicavel ${classeSelecao}" data-data="${stringDataCelula}" style="position: relative;">
                            ${bolinhaHtml}
                            <div style="margin-bottom: 6px; text-align: right;">
                                <span class="num-dia ${classeHoje}">${diaAtual}</span>
                            </div>
                            ${htmlEventos}
                        </div>
                    `;
                }
            }
            
            gridAtivo.innerHTML = htmlGrid;

            document.querySelectorAll('.dia-clicavel').forEach(celula => {
                celula.addEventListener('click', function() {
                    document.querySelectorAll('.dia-clicavel').forEach(c => c.classList.remove('dia-selecionado'));
                    this.classList.add('dia-selecionado');
                    dataSelecionadaStr = this.getAttribute('data-data');
                    eventoSelecionadoId = null;
                    fecharPopupEvento();
                    atualizarEstadoBotoesEvento();
                    if (btnAbrirModal) btnAbrirModal.disabled = false;
                });
            });

            document.querySelectorAll('.cal-mngr-evento-item').forEach(item => {
                item.addEventListener('click', function(eventoClick) {
                    eventoClick.stopPropagation();
                    const idEvento = this.getAttribute('data-id');
                    const evento = eventosCarregados.find(item => String(item.id) === idEvento);
                    eventoSelecionadoId = idEvento;
                    atualizarEstadoBotoesEvento();

                    fetch('/mngr/api/notificacoes/marcar-vista-evento', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id_evento: idEvento })
                    }).catch(() => {});

                    document.querySelectorAll('.cal-mngr-evento-item').forEach(el => {
                        const isSelected = String(el.getAttribute('data-id')) === String(idEvento);
                        el.style.border = isSelected ? '2px solid #fef3c7' : '1px solid rgba(255,255,255,0.3)';
                    });

                    mostrarPopupEvento(evento, this);
                });
            });
        }

        if (selectTipoEvento) {
            selectTipoEvento.addEventListener('change', function() {
                let valor = this.value;

                if (camposJogo) camposJogo.classList.add('cal-mngr-hidden');
                if (camposTreino) camposTreino.classList.add('cal-mngr-hidden');

                if (valor === 'jogo') {
                    if (camposJogo) camposJogo.classList.remove('cal-mngr-hidden');
                    const containerComp = document.getElementById('container-competicao');
                    if (usuarioRole === 'gestor') {
                        const selectEquipaDinamico = document.getElementById('select-nossa-equipa');
                        const idEq = selectEquipaDinamico ? selectEquipaDinamico.value : '';
                        const comps = idEq ? competicoesCarregadas.filter(c => String(c.id_equipa) === idEq) : [];
                        renderizarSelectCompeticoes(comps);
                    } else {
                        renderizarSelectCompeticoes(competicoesCarregadas);
                    }
                    if (containerComp) containerComp.classList.remove('cal-mngr-hidden');
                } else if (valor.includes('treino')) {
                    if (camposTreino) camposTreino.classList.remove('cal-mngr-hidden');
                    const containerComp = document.getElementById('container-competicao');
                    if (containerComp) containerComp.classList.add('cal-mngr-hidden');
                } else {
                    const containerComp = document.getElementById('container-competicao');
                    if (containerComp) containerComp.classList.add('cal-mngr-hidden');
                }
            });
        }

        if (inputLogoRival) {
            inputLogoRival.addEventListener('change', function() {
                const labelTexto = formEvento.querySelector('.file-upload-label span');
                if (labelTexto && this.files.length > 0) {
                    labelTexto.textContent = this.files[0].name;
                }
            });
        }

        function eventosComFiltro() {
            const filtroEquipa = document.getElementById('filtro-equipa');
            const idFiltro = filtroEquipa ? filtroEquipa.value : '';
            return idFiltro ? eventosCarregados.filter(e => String(e.id_equipa) === idFiltro) : eventosCarregados;
        }

        if (btnMesAnterior) {
            btnMesAnterior.addEventListener('click', () => {
                mesAtual--;
                if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
                renderizarMes(mesAtual, anoAtual, eventosComFiltro());
            });
        }

        if (btnMesSeguinte) {
            btnMesSeguinte.addEventListener('click', () => {
                mesAtual++;
                if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
                renderizarMes(mesAtual, anoAtual, eventosComFiltro());
            });
        }

        if (btnAbrirModal) {
            btnAbrirModal.addEventListener('click', () => {
                if (!dataSelecionadaStr) return;
                abrirModalEvento();
            });
        }

        if (btnEditarEventoSelecionado) {
            btnEditarEventoSelecionado.addEventListener('click', () => {
                const evento = eventosCarregados.find(item => String(item.id) === String(eventoSelecionadoId));
                if (!evento) return;
                abrirModalEvento(evento);
            });
        }

        // LÓGICA DE ELIMINAR EVENTO CORRIGIDA E A CHAMAR A FUNÇÃO GLOBAL
        if (btnEliminarEventoSelecionado) {
            btnEliminarEventoSelecionado.addEventListener('click', async () => {
                const evento = eventosCarregados.find(item => String(item.id) === String(eventoSelecionadoId));
                if (!evento) return;
                
                const confirmar = await window.mostrarConfirmacao(`Deseja eliminar o evento "${evento.titulo}"?`);
                if (!confirmar) return;

                try {
                    const resposta = await fetch(`/mngr/api/eventos/${evento.id}`, { method: 'DELETE' });
                    if (resposta.ok) {
                        eventoSelecionadoId = null;
                        atualizarEstadoBotoesEvento();
                        await carregarDadosBase();
                    } else {
                        const erro = await resposta.json();
                        mostrarAlerta(`Erro: ${erro.error || 'Não foi possível eliminar o evento.'}`);
                    }
                } catch (erro) { console.error('Erro ao eliminar evento:', erro); }
            });
        }

        if (btnFecharModal) {
            btnFecharModal.addEventListener('click', () => {
                modal.classList.add('cal-mngr-hidden');
                resetarFormularioEvento();
            });
        }

        if (btnEliminarEventoModal) {
            btnEliminarEventoModal.addEventListener('click', async () => {
                const idEvento = document.getElementById('id-evento-editar')?.value;
                if (!idEvento) return;
                const evento = eventosCarregados.find(item => String(item.id) === idEvento);
                if (!evento) return;

                const confirmar = await window.mostrarConfirmacao(`Deseja eliminar o evento "${evento.titulo}"?`);
                if (!confirmar) return;

                try {
                    const resposta = await fetch(`/mngr/api/eventos/${idEvento}`, { method: 'DELETE' });
                    if (resposta.ok) {
                        modal.classList.add('cal-mngr-hidden');
                        resetarFormularioEvento();
                        await carregarDadosBase();
                    } else {
                        const erro = await resposta.json();
                        mostrarAlerta(`Erro: ${erro.error || 'Não foi possível eliminar o evento.'}`);
                    }
                } catch (erro) { console.error('Erro ao eliminar evento:', erro); }
            });
        }

        if (formEvento) {
            formEvento.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const dadosFormulario = new FormData(formEvento);
                
                const tipoEvento = dadosFormulario.get('tipo_evento');
                const horaInicio = dadosFormulario.get('hora_inicio');
                const inputData = document.getElementById('input-data-evento');
                const dataEventoStr = inputData && inputData.value ? inputData.value : dataSelecionadaStr;

                dadosFormulario.set('data_evento', dataEventoStr);
                dadosFormulario.set('oficial', dadosFormulario.has('oficial') ? 'true' : 'false');

                if (inputLogoRival && inputLogoRival.files.length > 0) {
                    dadosFormulario.set('avatar', inputLogoRival.files[0]);
                }

                if (tipoEvento !== 'jogo') {
                    dadosFormulario.delete('competicao');
                }

                const dataFormatadaFrontStr = dataEventoStr.replace(/-/g, '/');
                const dataHoraAgendada = new Date(`${dataFormatadaFrontStr} ${horaInicio}:00`);
                if (dataHoraAgendada.getTime() < new Date().getTime()) {
                    mostrarAlerta("Erro: Não é permitido criar eventos no passado.");
                    return;  
                }

                try {
                    const idEvento = document.getElementById('id-evento-editar')?.value;
                    const metodo = modoFormulario === 'editar' && idEvento ? 'PUT' : 'POST';
                    const endpoint = modoFormulario === 'editar' && idEvento ? `/mngr/api/eventos/${idEvento}` : '/mngr/api/eventos';

                    const resposta = await fetch(endpoint, {
                        method: metodo,
                        body: dadosFormulario
                    });

                    if (resposta.ok) {
                        modal.classList.add('cal-mngr-hidden');
                        resetarFormularioEvento();
                        await carregarDadosBase(); 
                    } else {
                        const respostaErro = await resposta.json();
                        mostrarAlerta(`Erro do Servidor: ${respostaErro.error || 'Falha ao registar o evento.'}`);
                    }
                } catch (erro) { console.error("Erro no envio do evento:", erro); }
            });
        }

        document.addEventListener('click', function(evento) {
            const popup = document.querySelector('.cal-mngr-popup');
            if (!popup) return;
            if (!popup.contains(evento.target)) fecharPopupEvento();
        });

        // =========================================================================
        // LÓGICA DE ESCALÕES DO NOSSO CLUBE
        // =========================================================================
        let todasEquipasDados = [];

        async function carregarEquipasERivais() {
            try {
                const resposta = await fetch('/mngr/api/equipas-rivais');
                if (resposta.ok) {
                    todasEquipasDados = await resposta.json();

                    const selectNossaEquipaEscalao = document.querySelector('select[name="id_escalao_selecionado"]');
                    if (selectNossaEquipaEscalao) {
                        if (meuClubeId) {
                            const osNossosEscaloes = todasEquipasDados.filter(eq => eq.id_clube === meuClubeId);
                            selectNossaEquipaEscalao.innerHTML = '<option value="">Selecione o escalão alvo...</option>';
                            osNossosEscaloes.forEach(esc => {
                                if (!esc.id_escalao) return;
                                let option = document.createElement('option');
                                option.value = esc.id_escalao;
                                option.textContent = esc.nome_escalao || esc.nome_equipa;
                                selectNossaEquipaEscalao.appendChild(option);
                            });
                        } else {
                            selectNossaEquipaEscalao.innerHTML = '<option value="" disabled>Clube não identificado</option>';
                        }
                    }
                }
            } catch (erro) { console.error("Erro ao carregar dados de escalões:", erro); }
        }

        renderizarMes(mesAtual, anoAtual, []);
        await carregarDadosBase(); 
        await carregarEquipasERivais();

        const urlParams = new URLSearchParams(window.location.search);
        const eventoDesejadoId = urlParams.get('eventoId');

        if (eventoDesejadoId) {
            const eventoAlvo = eventosCarregados.find(e => String(e.id) === eventoDesejadoId);
            
            if (eventoAlvo) {
                const dataEvento = new Date(eventoAlvo.data_hora);
                const localDate = new Date(dataEvento.getTime() + (dataEvento.getTimezoneOffset() * 60000));
                
                mesAtual = localDate.getMonth();
                anoAtual = localDate.getFullYear();

                eventoSelecionadoId = String(eventoAlvo.id);
                
                renderizarMes(mesAtual, anoAtual, eventosCarregados);
                atualizarEstadoBotoesEvento();
                
                setTimeout(() => {
                    const elementoDOM = document.querySelector(`.cal-mngr-evento-item[data-id="${eventoAlvo.id}"]`);
                    
                    if (elementoDOM) {
                        document.querySelectorAll('.cal-mngr-evento-item').forEach(el => {
                            const isSelected = String(el.getAttribute('data-id')) === String(eventoAlvo.id);
                            el.style.border = isSelected ? '2px solid #fef3c7' : '1px solid rgba(255,255,255,0.3)';
                        });
                        
                        mostrarPopupEvento(eventoAlvo, elementoDOM);
                        elementoDOM.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 150);
                
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

    }, 0);
})();