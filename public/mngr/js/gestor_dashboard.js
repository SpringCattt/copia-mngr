
(function() {
    async function inicializarDashboardGestor() {
        console.log("🟡 A carregar Dashboard do Gestor...");
        try {
            const res = await fetch('/mngr/api/gestor/dashboard-dados');
            const data = await res.json();
            
            if (!data.success) return;

            // 1. Identidade do Clube
            document.getElementById('dash-nome-clube').textContent = data.clube.nome || 'Clube Sem Nome';
            document.getElementById('dash-clube-info').innerHTML = `
                <span style="margin-right: 15px;">🌍 ${data.clube.pais || 'Desconhecido'}</span>
                <span style="margin-right: 15px;">📍 ${data.clube.regiao || 'Sede não definida'}</span>
                <span>📅 Fundado em ${data.clube.ano_fundacao || '-'}</span>
            `;
            if (data.clube.logo) {
                document.getElementById('clube-foto').src = data.clube.logo;
                document.getElementById('clube-foto').style.display = 'block';
                document.getElementById('clube-foto-placeholder').style.display = 'none';
            }

            // 2. KPIs
            document.getElementById('kpi-equipas').textContent = data.kpis.totalEquipas || 0;
            document.getElementById('kpi-atletas').textContent = data.kpis.totalAtletas || 0;
            document.getElementById('kpi-staff').textContent = data.kpis.totalStaff || 0;
            document.getElementById('kpi-convites').textContent = data.kpis.convitesPendentes || 0;

            // 4. Agenda Global
            const gridAgenda = document.getElementById('grid-agenda-global');
            if (data.proximosJogos && data.proximosJogos.length > 0) {
                gridAgenda.innerHTML = data.proximosJogos.map(jogo => `
                    <div class="event-card">
                        <div class="event-body">
                            <div class="event-details" style="width: 100%;">
                                <span class="league-tag">${jogo.nome_equipa}</span>
                                <h3 class="event-title" style="margin-top: 8px;">${jogo.titulo}</h3>
                                <p class="event-meta">📅 ${new Date(jogo.data_hora).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })} | 📍 ${jogo.local || 'A definir'}</p>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                gridAgenda.innerHTML = '<p style="color: #64748b;">Nenhum jogo agendado para o clube nos próximos dias.</p>';
            }

            // 5. Ponto de Situação das Equipas
            const tabelaEquipas = document.getElementById('tabela-equipas-status');
            if (data.equipasStatus && data.equipasStatus.length > 0) {
                tabelaEquipas.innerHTML = data.equipasStatus.map(eq => `
                    <tr>
                        <td class="text-left" style="font-weight: 600; color: #0f172a;">${eq.nome_equipa}</td>
                        <td>
                            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                <img src="${eq.treinador_foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(eq.treinador_nome || 'A')}&background=e2e8f0`}" style="width: 28px; height: 28px; border-radius: 50%;">
                                ${eq.treinador_nome || '<span style="color: #ef4444; font-size: 12px; font-weight: bold;">Sem Treinador</span>'}
                            </div>
                        </td>
                        <td style="text-align: center; font-weight: bold; font-size: 15px;">${eq.num_atletas}</td>
                        <td>${eq.proximo_jogo ? new Date(eq.proximo_jogo).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : '<span style="color: #94a3b8;">Sem jogos</span>'}</td>
                    </tr>
                `).join('');
            } else {
                tabelaEquipas.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 20px;">Ainda não existem equipas registadas.</td></tr>';
            }

        } catch (error) {
            console.error('Erro ao carregar dashboard do gestor:', error);
        }
    }
    setTimeout(inicializarDashboardGestor, 50);
})();