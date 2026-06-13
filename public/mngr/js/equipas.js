(function() {
    setTimeout(async function inicializarPagina() {
        console.log("=== [SPA] A carregar dados dinâmicos de equipas via API... ===");

        const containerModalidades = document.getElementById('modalidades-container');
        const formAddEquipa = document.getElementById('form-add-equipa');
        const sportSelect = document.getElementById('sport-select');
        const escalaoSelect = document.getElementById('escalao-select');
        const fileInput = document.getElementById("foto_file");
        const fileLabelSpan = document.querySelector(".file-upload-label span");

        try {
            const res = await fetch('/mngr/painel-equipas-dados');
            const dados = await res.json();

            if (!dados.success) {
                const elClubeNome = document.getElementById('clube-nome');
                if (elClubeNome) elClubeNome.textContent = dados.message || "Erro ao carregar dados.";
                return;
            }

            // 1. Renderizar Cabeçalho do Clube
            const elClubeNome = document.getElementById('clube-nome');
            if (elClubeNome) elClubeNome.textContent = dados.clube.nome;

            const elClubeLocalizacao = document.getElementById('clube-localizacao');
            if (elClubeLocalizacao) elClubeLocalizacao.textContent = `${dados.clube.regiao}, ${dados.clube.pais || 'Portugal'}`;
            
            const elClubeLogo = document.getElementById('clube-logo');
            if (dados.clube.logo_url && elClubeLogo) elClubeLogo.src = dados.clube.logo_url;

            const elPainelGestor = document.getElementById('painel-gestor');
            if (elPainelGestor) elPainelGestor.style.display = 'block';

            // 2. Preencher os Selects (Modalidades e Escalões)
            if (sportSelect) {
                sportSelect.innerHTML = '<option value="" disabled selected>Escolhe a Modalidade...</option>';
                dados.desportos.forEach(d => sportSelect.innerHTML += `<option value="${d.id}">${d.nome}</option>`);
            }

            if (escalaoSelect) {
                escalaoSelect.innerHTML = '<option value="" disabled selected>Escolhe o Escalão...</option>';
                dados.escaloes.forEach(e => escalaoSelect.innerHTML += `<option value="${e.id}">${e.nome}</option>`);
            }

            // 3. Renderizar Grelha de Equipas
            if (containerModalidades) {
                renderizarEquipas(dados.equipas);
            }

        } catch (err) {
            console.error("Erro na inicialização:", err);
        }

        // 🌟 Atualiza o texto visual do botão com o nome do ficheiro (Igual ao criarClube.js)
        if (fileInput && fileLabelSpan) {
            fileInput.onchange = (e) => {
                if (e.target.files.length > 0) {
                    const ficheiro = e.target.files[0];
                    
                    // Validação de tamanho no front-end (3MB)
                    if (ficheiro.size > 3 * 1024 * 1024) {
                        alert("A imagem selecionada excede o limite máximo de 3MB.");
                        fileInput.value = ""; 
                        fileLabelSpan.textContent = "Selecionar imagem...";
                        return;
                    }

                    fileLabelSpan.textContent = ficheiro.name;
                    fileLabelSpan.style.color = "var(--text-primary)";
                    fileLabelSpan.style.fontWeight = "500";
                } else {
                    fileLabelSpan.textContent = "Selecionar imagem...";
                    fileLabelSpan.style.color = "var(--text-secondary)";
                    fileLabelSpan.style.fontWeight = "400";
                }
            };
        }

        function renderizarEquipas(equipas) {
            if (!containerModalidades) return;
            containerModalidades.innerHTML = "";
            
            if (!equipas || equipas.length === 0) {
                containerModalidades.innerHTML = "<p style='color: var(--text-secondary); text-align:center;'>Nenhuma equipa registada neste clube.</p>";
                return;
            }

            const agrupado = {};
            equipas.forEach(eq => {
                if (!agrupado[eq.desporto_nome]) agrupado[eq.desporto_nome] = [];
                agrupado[eq.desporto_nome].push(eq);
            });

            for (const desporto in agrupado) {
                const titleElement = document.createElement('h3');
                titleElement.classList.add('section-title');
                titleElement.textContent = desporto;

                const gridElement = document.createElement('div');
                gridElement.classList.add('teams-grid');

                agrupado[desporto].forEach(eq => {
                    const card = document.createElement('a');
                    card.classList.add('team-card');
                    card.style.textDecoration = 'none';
                    card.style.color = 'inherit';
                    
                    
                    const linkDestino = `/mngr/gestorClube/equipa_detalhes?id=${eq.id}`;
                    card.setAttribute('data-page', linkDestino);
                    card.href = linkDestino;

                    
                    card.innerHTML = `
                        <img src="${eq.foto_url || 'https://dummyimage.com/150x150/e2e8f0/627d98.png&text=' + encodeURIComponent(eq.nome)}" alt="${eq.nome}" class="team-photo">
                        <div class="team-info">
                            <h4>${eq.nome} <span style="font-size:12px; color:gray;">(${eq.escalao_nome})</span></h4>
                        </div>
                    `;
                    gridElement.appendChild(card);
                });

                containerModalidades.appendChild(titleElement);
                containerModalidades.appendChild(gridElement);
            }
        }

        if (formAddEquipa) {
        formAddEquipa.onsubmit = async (e) => {
            e.preventDefault();
            
            const formData = new FormData(formAddEquipa);
    
            // Debug: Verifica se os campos obrigatórios estão a ser enviados
            console.log("Desporto:", formData.get('id_tipo_desporto'));
            console.log("Escalão:", formData.get('id_tipo_escalao'));

            // Verifica se os valores são válidos
            if (!formData.get('id_tipo_desporto') || !formData.get('id_tipo_escalao')) {
                alert("Por favor, seleciona a modalidade e o escalão.");
                return;
            }

            // 🌟 LOGS DE DEBBUGGING NO FRONT-END:
            console.log("=== [FRONTEND] A inspecionar o FormData antes do Fetch ===");
            for (let [key, value] of formData.entries()) {
                console.log(`Campo: ${key} | Valor:`, value);
            }

            try {
                const resposta = await fetch('/mngr/criar-equipa', {
                    method: 'POST',
                    // LEMBRETE: Não adiciones Content-Type aqui! Deixa o browser decidir.
                    body: formData
                });

                const resultado = await resposta.json();

                if (resposta.ok && resultado.success) {
                    formAddEquipa.reset();
                    if (fileLabelSpan) fileLabelSpan.textContent = "Selecionar imagem...";
                    inicializarPagina();
                } else {
                    alert(resultado.message || "Erro ao adicionar equipa.");
                }
            } catch (err) {
                console.error("Erro ao submeter equipa:", err);
                alert("Não foi possível estabelecer ligação com o servidor.");
            }
        };
    }
    }, 0);
})();