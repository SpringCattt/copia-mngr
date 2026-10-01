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
                if (containerModalidades) containerModalidades.innerHTML = `<p style="padding:20px;color:red;text-align:center;">${dados.message || 'Erro ao carregar dados.'}</p>`;
                return;
            }

            // 2. Preencher os Selects (Modalidades e Escalões)
            const todosEscaloes = dados.escaloes || [];

            if (sportSelect) {
                sportSelect.innerHTML = '<option value="" disabled selected>Escolhe a Modalidade...</option>';
                dados.desportos.forEach(d => sportSelect.innerHTML += `<option value="${d.id}">${d.nome}</option>`);
            }

            function preencherEscaloes(idDesporto) {
                if (!escalaoSelect) return;
                const filtrados = idDesporto
                    ? todosEscaloes.filter(e => !e.id_tipo_desporto || String(e.id_tipo_desporto) === String(idDesporto))
                    : todosEscaloes;
                if (filtrados.length === 0) {
                    escalaoSelect.innerHTML = '<option value="" disabled selected>Sem escalões para esta modalidade</option>';
                } else {
                    escalaoSelect.innerHTML = '<option value="" disabled selected>Escolhe o Escalão...</option>';
                    filtrados.forEach(e => {
                        const generoLabel = e.genero ? ` (${e.genero})` : '';
                        escalaoSelect.innerHTML += `<option value="${e.id}">${e.nome}${generoLabel}</option>`;
                    });
                }
            }

            if (escalaoSelect) {
                escalaoSelect.innerHTML = '<option value="" disabled selected>Escolhe primeiro a modalidade</option>';
            }

            if (sportSelect) {
                sportSelect.addEventListener('change', () => preencherEscaloes(sportSelect.value));
            }

            // 3. Renderizar Grelha de Equipas
            if (containerModalidades) {
                renderizarEquipas(dados.equipas);
            }

        } catch (err) {
            console.error("Erro na inicialização:", err);
        }

        // 🌟 Atualiza o texto visual com o nome do ficheiro (Form 1: Equipa)
        if (fileInput && fileLabelSpan) {
            fileInput.onchange = (e) => {
                if (e.target.files.length > 0) {
                    const ficheiro = e.target.files[0];
                    
                    if (ficheiro.size > 3 * 1024 * 1024) {
                        mostrarAlerta("A imagem selecionada excede o limite máximo de 3MB.","aviso");
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

            let primeiroGrupo = true;
            for (const desporto in agrupado) {
                const titleElement = document.createElement('h3');
                titleElement.classList.add('section-title');
                titleElement.textContent = desporto;
                if (!primeiroGrupo) titleElement.style.marginTop = '36px';
                primeiroGrupo = false;

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

        // Submissão do Formulário de Criar Equipa
        if (formAddEquipa) {
            formAddEquipa.onsubmit = async (e) => {
                e.preventDefault();
                
                const formData = new FormData(formAddEquipa);
        
                if (!formData.get('id_tipo_desporto') || !formData.get('id_tipo_escalao')) {
                    mostrarAlerta("Por favor, seleciona a modalidade e o escalão.","aviso");
                    return;
                }

                try {
                    const resposta = await fetch('/mngr/criar-equipa', {
                        method: 'POST',
                        body: formData
                    });

                    const resultado = await resposta.json();

                    if (resposta.ok && resultado.success) {
                        formAddEquipa.reset();
                        if (fileLabelSpan) fileLabelSpan.textContent = "Selecionar imagem...";
                        inicializarPagina();
                    } else {
                        mostrarAlerta(resultado.message || "Erro ao adicionar equipa.");
                    }
                } catch (err) {
                    console.error("Erro ao submeter equipa:", err);
                    mostrarAlerta("Não foi possível estabelecer ligação com o servidor.");
                }
            };
        }


    }, 0);
})();