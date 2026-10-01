// public/mngr/js/atleta_dashboard.js
(function() {
    let rpeSelecionado = null;
    let fadigaSelecionada = null;
    let sonoSelecionado = null;
    let eventoFeedbackId = null;

    async function inicializarDashboard() {
        try {
            const res = await fetch('/mngr/api/atleta/dashboard-dados');
            const data = await res.json();
            if (!data.success) return;

            const { perfil, idade, agenda, stats, feedbacksPendentes, epochasAnteriores } = data;

            // --- Perfil ---
            document.getElementById('dash-nome').textContent = perfil.nome_curto || perfil.nome_completo || 'Atleta';
            document.getElementById('dash-equipa-info').textContent = perfil.nome_equipa
                ? `${perfil.nome_equipa}${perfil.clube_nome ? ' · ' + perfil.clube_nome : ''}`
                : 'Sem equipa associada';
            document.getElementById('dash-idade').textContent = idade !== null ? `${idade} anos` : '-';
            document.getElementById('dash-altura').textContent = perfil.altura ? `${perfil.altura} cm` : '-';
            document.getElementById('dash-peso').textContent = perfil.peso ? `${perfil.peso} kg` : '-';
            document.getElementById('dash-cidade').textContent = perfil.cidade || '-';

            // --- Mostrar eventos só se tiver equipa ---
            if (perfil.id_equipa) {
                document.getElementById('atleta-events-grid').style.display = '';
            }

            // --- Foto da equipa no card unificado ---
            const equipaFoto = document.getElementById('equipa-foto');
            const equipaFotoPlaceholder = document.getElementById('equipa-foto-placeholder');
            if (perfil.clube_logo) {
                equipaFoto.src = perfil.clube_logo;
                equipaFoto.style.display = '';
                if (equipaFotoPlaceholder) equipaFotoPlaceholder.style.display = 'none';
            }

            // --- Último Evento ---
            if (agenda.ultimo) {
                const u = agenda.ultimo;
                document.getElementById('ultimo-tag').textContent = u.tipo_evento?.toUpperCase() || 'EVENTO';
                document.getElementById('ultimo-titulo').textContent = u.titulo || '-';
                const dataU = new Date(u.data_hora).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
                let metaU = dataU;
                if (u.minutos_jogados !== null && u.minutos_jogados !== undefined) metaU += ` · ${u.minutos_jogados} min`;
                if (u.golos > 0) metaU += ` · ⚽ ${u.golos}`;
                if (u.assistencias > 0) metaU += ` · 👟 ${u.assistencias}`;
                document.getElementById('ultimo-meta').textContent = metaU;
                const logoU = document.getElementById('ultimo-logo');
                if (logoU && u.equipa_rival_imagem) { logoU.src = u.equipa_rival_imagem; logoU.style.display = ''; }
                const btnUltimo = document.getElementById('btn-ultimo-evento');
                if (btnUltimo) btnUltimo.setAttribute('data-page', `/mngr/dashboard/calendario?eventoId=${u.id}`);
            } else {
                const secUltimo = document.getElementById('section-ultimo-evento');
                if (secUltimo) secUltimo.style.display = 'none';
            }

            // --- Próximo Evento ---
            if (agenda.proximo) {
                const p = agenda.proximo;
                document.getElementById('proximo-tag').textContent = p.tipo_evento?.toUpperCase() || 'EVENTO';
                document.getElementById('proximo-titulo').textContent = p.titulo || '-';
                const dataP = new Date(p.data_hora).toLocaleString('pt-PT', { dateStyle: 'full', timeStyle: 'short' });
                document.getElementById('proximo-meta').textContent = `${dataP}${p.local ? ' · 📍 ' + p.local : ''}`;
                const logoP = document.getElementById('proximo-logo');
                if (logoP && p.equipa_rival_imagem) { logoP.src = p.equipa_rival_imagem; logoP.style.display = ''; }
                const btnProximo = document.getElementById('btn-proximo-evento');
                if (btnProximo) btnProximo.setAttribute('data-page', `/mngr/dashboard/calendario?eventoId=${p.id}`);
            } else {
                const secProximo = document.getElementById('section-proximo-evento');
                if (secProximo) secProximo.style.display = 'none';
            }

            // --- Estatísticas época atual ---
            document.getElementById('stat-jogos').textContent = stats?.jogos || 0;
            document.getElementById('stat-minutos').textContent = stats?.minutos || 0;
            document.getElementById('stat-golos').textContent = stats?.golos || 0;
            document.getElementById('stat-assists').textContent = stats?.assistencias || 0;

            // --- Épocas anteriores ---
            const tbody = document.getElementById('tabela-epocas-anteriores');
            if (tbody && epochasAnteriores && epochasAnteriores.length > 0) {
                tbody.innerHTML = epochasAnteriores.map(ep => `
                    <tr>
                        <td class="text-left">
                            <div class="team-cell-inline">
                                ${ep.equipa_foto
                                    ? `<div class="team-logo-thumb"><img src="${ep.equipa_foto}" alt=""></div>`
                                    : `<div class="team-logo-thumb team-logo-empty"></div>`
                                }
                                <span>${ep.equipa_nome}</span>
                            </div>
                        </td>
                        <td>${ep.jogos}</td>
                        <td>${ep.minutos}</td>
                        <td>${ep.golos}</td>
                        <td>${ep.assistencias}</td>
                    </tr>
                `).join('');
            }

            // --- Gatilho de feedback via URL ---
            const urlParams = new URLSearchParams(window.location.search);
            const idAvaliar = urlParams.get('avaliar');
            if (idAvaliar) {
                if (feedbacksPendentes && feedbacksPendentes.length > 0) {
                    const eventoParaAvaliar = feedbacksPendentes.find(f => String(f.id) === idAvaliar);
                    if (eventoParaAvaliar) {
                        abrirFormularioFeedback(eventoParaAvaliar);
                    } else {
                        mostrarAlerta("Este formulário já foi preenchido e entregue à equipa técnica. Obrigado!", "sucesso", "Tudo Feito!");
                        window.history.replaceState({}, '', '/mngr/atleta/inicio');
                    }
                } else {
                    mostrarAlerta("Não tens nenhum formulário de bem-estar pendente neste momento.", "sucesso", "Tudo em dia!");
                    window.history.replaceState({}, '', '/mngr/atleta/inicio');
                }
            }

        } catch (err) {
            console.error('Erro ao carregar dashboard do atleta:', err);
        }
    }

    // ====================================================================
    // LÓGICA DE CONTROLOS VISUAIS E MODAIS
    // ====================================================================
    function abrirFormularioFeedback(evento) {
        eventoFeedbackId = evento.id;
        // Reset dos estados visuais ao abrir
        rpeSelecionado = null;
        fadigaSelecionada = null;
        sonoSelecionado = null;
        document.querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.rating-icon').forEach(i => i.classList.remove('active'));
        const obsEl = document.getElementById('feedback-observacoes');
        if (obsEl) obsEl.value = '';

        document.getElementById('feedback-treino-titulo').value = evento.titulo;
        const dataF = new Date(evento.data_hora);
        document.getElementById('feedback-treino-data').value = dataF.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
        document.getElementById('modal-feedback-treino').style.display = 'flex';
    }

    // ====================================================================
    // REGISTO DE EVENTOS — usa delegação no container para evitar duplicados
    // ====================================================================

    // Botões RPE — delegação no documento
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.rpe-btn');
        if (!btn) return;
        document.querySelectorAll('.rpe-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        rpeSelecionado = btn.getAttribute('data-val');
    });

    // Ícones Fadiga/Sono — delegação no documento
    document.addEventListener('click', function(e) {
        const icon = e.target.closest('.rating-icon');
        if (!icon) return;
        const container = icon.closest('.rating-icons-container');
        if (!container) return;
        const val = parseInt(icon.getAttribute('data-val'));
        const isFadiga = container.classList.contains('rating-fadiga');
        const isSono = container.classList.contains('rating-sono');
        if (isFadiga) fadigaSelecionada = val;
        if (isSono) sonoSelecionado = val;
        container.querySelectorAll('.rating-icon').forEach(i => {
            parseInt(i.getAttribute('data-val')) <= val
                ? i.classList.add('active')
                : i.classList.remove('active');
        });
    });

    // Botão Submeter Feedback — delegação
    document.addEventListener('click', async function(e) {
        const btn = e.target.closest('#btn-submeter-feedback');
        if (!btn) return;
        if (btn.disabled) return;

        if (!rpeSelecionado || !fadigaSelecionada || !sonoSelecionado) {
            mostrarAlerta("Por favor, preenche a avaliação do teu Esforço (RPE), a Fadiga e o Sono antes de submeteres.", "aviso", "Campos em Falta");
            return;
        }

        btn.disabled = true;
        btn.textContent = 'A enviar...';

        const observacoes = document.getElementById('feedback-observacoes').value;

        try {
            const res = await fetch(`/mngr/api/atleta/feedback/${eventoFeedbackId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rpe: rpeSelecionado, fadiga: fadigaSelecionada, sono: sonoSelecionado, observacoes: observacoes })
            });

            const dataRes = await res.json();

            if (dataRes.success) {
                document.getElementById('modal-feedback-treino').style.display = 'none';
                mostrarAlerta("Feedback submetido com sucesso!", "sucesso");
                window.history.replaceState({}, '', '/mngr/atleta/inicio');
                inicializarDashboard();
            } else {
                mostrarAlerta('Ocorreu um problema ao guardar os teus dados: ' + dataRes.message, "erro", "Falha ao Guardar");
                btn.disabled = false;
                btn.textContent = 'Submeter Feedback';
            }
        } catch (err) {
            mostrarAlerta('Erro de comunicação com o servidor. Verifica a tua internet e tenta novamente.', "erro", "Sem Ligação");
            btn.disabled = false;
            btn.textContent = 'Submeter Feedback';
        }
    });

    // Botão Cancelar Feedback
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#btn-cancelar-feedback')) return;
        document.getElementById('modal-feedback-treino').style.display = 'none';
        window.history.replaceState({}, '', '/mngr/atleta/inicio');
    });

    setTimeout(inicializarDashboard, 50);

})();