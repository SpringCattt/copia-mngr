// public/mngr/js/equipa_detalhes.js
(function() {
    // 1. Obter o id da equipa a partir dos parâmetros do URL (?id=X)
    function obterIdEquipaDoURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }

    async function inicializarPaginaDetalhes() {
        const idEquipa = obterIdEquipaDoURL();

        if (!idEquipa || idEquipa === 'null') {
            console.error("[SPA] Erro: ID da equipa não fornecido no URL.");
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) pageTitle.textContent = "Erro: Equipa não especificada.";
            return;
        }

        // Elementos do DOM capturados com base no teu HTML
        const elFotoEquipa = document.querySelector('.js-team-photo');
        const elBreadcrumbModalidade = document.getElementById('breadcrumb-modalidade');
        const elBreadcrumbEscalao = document.getElementById('breadcrumb-escalao');
        const elPageTitle = document.getElementById('page-title');
        const elTabelaPlantelBody = document.getElementById('table-atletas');

        try {
            // 2. Chamar o teu endpoint do backend para obter os metadados do cabeçalho
            const resCabeçalho = await fetch(`/mngr/api/equipa/${idEquipa}`);
            const dadosCabecalho = await resCabeçalho.json();

            if (!dadosCabecalho.success) {
                if (elPageTitle) elPageTitle.textContent = dadosCabecalho.message || "Equipa não encontrada.";
                return;
            }

            const equipa = dadosCabecalho.equipa || (dadosCabecalho.dados ? dadosCabecalho.dados.equipa : null) || dadosCabecalho;

            // 3. Aplicar a imagem com fallback condicional
            if (elFotoEquipa) {
                const urlFoto = equipa.foto_url || `https://dummyimage.com/150x150/e2e8f0/627d98.png&text=${encodeURIComponent(equipa.nome || 'Equipa')}`;
                elFotoEquipa.src = urlFoto;
                elFotoEquipa.alt = equipa.nome || "Foto da Equipa";
            }

            // 4. Preencher dados de texto e Breadcrumbs
            if (elPageTitle) elPageTitle.textContent = equipa.nome || "Equipa Sem Nome";
            if (elBreadcrumbModalidade) elBreadcrumbModalidade.textContent = equipa.desporto_nome || "Modalidade";
            if (elBreadcrumbEscalao) elBreadcrumbEscalao.textContent = equipa.escalao_nome || "Escalão";

            // 5. Carregar o Plantel de Atletas e Treinadores
            carregarPlantel(idEquipa);

        } catch (err) {
            console.error("Erro ao processar inicialização dos detalhes da equipa:", err);
        }
    }

    // Função auxiliar para injetar o plantel nas duas tabelas
    async function carregarPlantel(idEquipa) {
        const containerAtletas = document.getElementById('table-atletas');
        const containerTecnica = document.getElementById('table-equipa-tecnica');
        
        if (containerAtletas) containerAtletas.innerHTML = `<tr><td colspan="5" style="text-align: center;">A carregar atletas...</td></tr>`;
        if (containerTecnica) containerTecnica.innerHTML = `<tr><td colspan="4" style="text-align: center;">A carregar equipa técnica...</td></tr>`;

        try {
            const res = await fetch(`/mngr/api/equipa/${idEquipa}/plantel`);
            const dados = await res.json();

            if (!dados.success || !dados.membros) {
                if(containerAtletas) containerAtletas.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Erro ao obter plantel.</td></tr>`;
                return;
            }

            // Separar os atletas dos treinadores
            const atletas = dados.membros.filter(m => m.cargo === 'Atleta');
            const equipaTecnica = dados.membros.filter(m => m.cargo === 'Treinador' || m.cargo === 'Staff');

            // --- 1. RENDERIZAR EQUIPA TÉCNICA ---
            if (containerTecnica) {
                if (equipaTecnica.length === 0) {
                    containerTecnica.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">Nenhum membro na equipa técnica.</td></tr>`;
                } else {
                    containerTecnica.innerHTML = "";
                    equipaTecnica.forEach(membro => {
                        const idade = membro.idade ? `${membro.idade} anos` : '-';
                        containerTecnica.innerHTML += `
                            <tr>
                                <td class="text-left">
                                    <div style="font-weight: 500;">${membro.nome_utilizador}</div>
                                    <div style="font-size: 12px;">${membro.email}</div>
                                </td>
                                <td>${idade}</td>
                                <td>${membro.cargo}</td>
                                <td style="text-align: right; display: flex; justify-content: flex-end; gap: 8px;">
                                    <button class="btn-acao-tabela" title="Editar" style="background: none; border: none; cursor: pointer; color: #64748b;">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button class="btn-acao-tabela" title="Eliminar" style="background: none; border: none; cursor: pointer; color: #64748b;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#64748b'">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }
            }

            // --- 2. RENDERIZAR ATLETAS (COM LINK PARA DETALHES) ---
            if (containerAtletas) {
                if (atletas.length === 0) {
                    containerAtletas.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Nenhum atleta nesta equipa.</td></tr>`;
                } else {
                    containerAtletas.innerHTML = "";
                    atletas.forEach(membro => {
                        const idade = membro.idade ? `${membro.idade} anos` : '-';
                        const altura = membro.altura ? `${membro.altura}m` : '-';
                        const peso = membro.peso ? `${membro.peso}kg` : '-';
                        
                        // O link dinâmico é injetado aqui usando membro.id
                        containerAtletas.innerHTML += `
                            <tr>
                                <td class="text-left">
                                    <div style="font-weight: 500;">
                                        <a href="/mngr/atleta/detalhes?id=${membro.id}" style="color: #0284c7; text-decoration: none; font-weight: 600; transition: color 0.15s ease-in-out;" onmouseover="this.style.color='#0ea5e9'; this.style.textDecoration='underline';" onmouseout="this.style.color='#0284c7'; this.style.textDecoration='none';">
                                            ${membro.nome_utilizador}
                                        </a>
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-muted);">${membro.email}</div>
                                </td>
                                <td>${idade}</td>
                                <td>${altura}</td>
                                <td>${peso}</td>
                                <td style="text-align: right; display: flex; justify-content: flex-end; gap: 8px;">
                                    <button class="btn-acao-tabela" title="Editar" style="background: none; border: none; cursor: pointer; color: #64748b;">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button class="btn-acao-tabela" title="Eliminar" style="background: none; border: none; cursor: pointer; color: #64748b;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#64748b'">
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }
            }
        } catch (error) {
            console.error("Erro ao carregar plantel:", error);
        }
    }

    // ==========================================
    // LÓGICA DA MODAL DE ADICIONAR MEMBRO
    // ==========================================
    setTimeout(() => {
        const btnAddMember = document.getElementById('btn-add-member');
        const memberModal = document.getElementById('add-member-modal');
        const closeMemberModal = document.getElementById('close-member-modal');

        const tabNewAccount = document.getElementById('tab-new-account');
        const tabInvite = document.getElementById('tab-invite');
        const formNewAccount = document.getElementById('form-new-account');
        const formInvite = document.getElementById('form-invite');
        const selectCargoNew = document.getElementById('new-member-role');
        const selectCargoInvite = document.getElementById('invite-member-role');

        function abrirModalMembro(cargoPredefinido) {
            if (!memberModal) return;
            memberModal.style.display = 'flex';
            
            if (selectCargoNew) selectCargoNew.value = cargoPredefinido;
            if (selectCargoInvite) selectCargoInvite.value = cargoPredefinido;
        }

        if (btnAddMember) {
            btnAddMember.addEventListener('click', () => abrirModalMembro('')); 
        }
        if (closeMemberModal) {
            closeMemberModal.addEventListener('click', () => {
                memberModal.style.display = 'none';
            });
        }

        if (tabNewAccount && tabInvite && formNewAccount && formInvite) {
            tabNewAccount.addEventListener('click', () => {
                formNewAccount.style.display = 'flex';
                formInvite.style.display = 'none';
                tabNewAccount.classList.add('btn-tab-active');
                tabNewAccount.classList.remove('btn-tab-inactive');
                tabInvite.classList.add('btn-tab-inactive');
                tabInvite.classList.remove('btn-tab-active');
            });

            tabInvite.addEventListener('click', () => {
                formInvite.style.display = 'flex';
                formNewAccount.style.display = 'none';
                tabInvite.classList.add('btn-tab-active');
                tabInvite.classList.remove('btn-tab-inactive');
                tabNewAccount.classList.add('btn-tab-inactive');
                tabNewAccount.classList.remove('btn-tab-active');
            });
        }

        if (formNewAccount) {
            formNewAccount.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const idEquipa = obterIdEquipaDoURL();
                const nome = document.getElementById('new-member-name').value.trim();
                const email = document.getElementById('new-member-email').value.trim();
                const password = document.getElementById('new-member-password').value;
                const cargo = document.getElementById('new-member-role').value; 

                try {
                    const response = await fetch('/mngr/equipa/criar-membro', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idEquipa, nome, email, password, cargo })
                    });

                    const data = await response.json();
                    
                    if (data.success) {
                        if (memberModal) memberModal.style.display = 'none';
                        formNewAccount.reset();
                        mostrarSucesso(`A conta de ${nome} foi criada e associada à equipa!`);
                    } else {
                        alert("Erro: " + data.message);
                    }
                } catch (error) {
                    console.error("Erro Técnico:", error);
                    alert("Erro técnico ao comunicar com o servidor.");
                }
            });
        }

        if (formInvite) {
            formInvite.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const idEquipa = obterIdEquipaDoURL();
                const email = document.getElementById('invite-member-email').value.trim();
                const cargo = document.getElementById('invite-member-role').value;

                try {
                    const response = await fetch('/mngr/equipa/convidar-membro', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idEquipa, email, cargo })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        if (memberModal) memberModal.style.display = 'none';
                        formInvite.reset();
                        mostrarSucesso(`O convite foi enviado para ${email} com sucesso!`);
                    } else {
                        alert("Erro: " + data.message);
                    }
                } catch (error) {
                    console.error("Erro Técnico:", error);
                    alert("Erro técnico ao enviar o convite.");
                }
            });
        }
    }, 100);

    function mostrarSucesso(mensagem) {
        const successModal = document.getElementById('success-modal');
        const successMsg = document.getElementById('success-message');
        const btnCloseSuccess = document.getElementById('close-success-btn');
        
        if (successModal && successMsg) {
            successMsg.textContent = mensagem;
            successModal.style.display = 'flex';
            
            if (btnCloseSuccess) {
                btnCloseSuccess.onclick = function() {
                    successModal.style.display = 'none';
                    window.location.reload();
                };
            }
        }
    }

    setTimeout(inicializarPaginaDetalhes, 0);

    window.obterIdEquipaDoURL = obterIdEquipaDoURL;
    window.atualizarDadosEquipaInterface = inicializarPaginaDetalhes;
})();

// ==========================================
// Gestão Unificada do Modal de Edição
// ==========================================
const btnEditarEquipa = document.getElementById('btn-edit-team');
const modalEditar = document.getElementById('modal-editar-equipa');
const btnFecharEditarX = document.getElementById('btn-fechar-editar');
const formEditarEquipa = document.getElementById('form-editar-equipa');

const inputNome = document.getElementById('edit-nome-equipa');
const inputEpoca = document.getElementById('edit-epoca-equipa');

function fecharModalEditar() {
    if (!modalEditar) return;
    modalEditar.classList.add('modal-escondido');
    modalEditar.style.display = 'none';
    if (formEditarEquipa) formEditarEquipa.reset();
}

if (btnEditarEquipa && modalEditar) {
    btnEditarEquipa.addEventListener('click', () => {
        const elPageTitle = document.getElementById('page-title');
        const seletorEpoca = document.getElementById('season-selector');

        const nomeAtual = elPageTitle ? elPageTitle.textContent : "";
        const epocaAtual = seletorEpoca ? seletorEpoca.value : "";

        if (inputNome) inputNome.value = nomeAtual;
        if (inputEpoca) inputEpoca.value = epocaAtual;

        modalEditar.classList.remove('modal-escondido');
        modalEditar.style.display = 'flex';
    });
}

if (btnFecharEditarX) {
    btnFecharEditarX.addEventListener('click', fecharModalEditar);
}

if (formEditarEquipa) {
    formEditarEquipa.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const idEquipa = typeof window.obterIdEquipaDoURL === 'function' ? window.obterIdEquipaDoURL() : null;
        
        if (!idEquipa || idEquipa === 'null') {
            alert('Erro: Não foi possível detetar o ID da equipa.');
            return;
        }
        
        const urlDestino = `/mngr/equipas/editar/${idEquipa}`;
        const formData = new FormData(formEditarEquipa);

        try {
            const resposta = await fetch(urlDestino, {
                method: 'POST',
                body: formData
            });

            if (resposta.ok) {
                alert('Informações da equipa updated com sucesso!');
                fecharModalEditar();
                
                if (typeof window.atualizarDadosEquipaInterface === 'function') {
                    await window.atualizarDadosEquipaInterface();
                } else if (inputNome) {
                    const elPageTitle = document.getElementById('page-title');
                    if (elPageTitle) elPageTitle.textContent = inputNome.value;
                }
            } else {
                alert('Erro ao atualizar: O servidor respondeu com um erro.');
            }

        } catch (erro) {
            console.error('Erro na requisição Fetch:', erro);
            alert('Não foi possível comunicar com o servidor.');
        }
    });
}