// public/mngr/gestorClube/js/criarClube.js
document.addEventListener("DOMContentLoaded", () => {
    const formCriarClube = document.getElementById("form-criar-clube");
    const containerErro = document.getElementById("container-erro-clube");
    const fileInput = document.getElementById("logo_file");
    const fileLabelSpan = document.querySelector(".file-upload-label span");
    const selectPais = document.getElementById("pais");
    const selectRegiao = document.getElementById("regiao");
    const inputDataFundacao = document.getElementById("data_fundacao");

    // 🌟 Bloquear datas futuras no calendário do HTML5
    if (inputDataFundacao) {
        const hoje = new Date().toISOString().split("T")[0];
        inputDataFundacao.setAttribute("max", hoje);
    }

    // 🗺️ Base de Dados Geográfica Local e Integrada (Evita delays de APIs externas)
    const baseGeografica = {
        "Portugal": [
            "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", 
            "Évora", "Faro", "Guarda", "Leiria", "Lisboa", "Portalegre", "Porto", 
            "Santarém", "Setúbal", "Viana do Castelo", "Vila Real", "Viseu", "Açores", "Madeira"
        ],
        "Brasil": [
            "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", 
            "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", 
            "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí", 
            "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", 
            "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
        ],
        "Espanha": [
            "Andaluzia", "Aragão", "Astúrias", "Baleares", "Canárias", "Cantábria", 
            "Castela-Mancha", "Castela e Leão", "Catalunha", "Comunidade Valenciana", 
            "Estremadura", "Galiza", "La Rioja", "Madrid", "Múrcia", "Navarra", "País Basco"
        ],
        "Angola": [
            "Bengo", "Benguela", "Bié", "Cabinda", "Cuando-Cubango", "Cuanza Norte", 
            "Cuanza Sul", "Cunene", "Huambo", "Huíla", "Luanda", "Lunda Norte", 
            "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire"
        ],
        "Moçambique": [
            "Cabo Delgado", "Gaza", "Inhambane", "Manica", "Maputo", "Nampula", 
            "Niassa", "Sofala", "Tete", "Zambézia"
        ]
    };

    // 🌟 Popular a Combobox de Países
    if (selectPais) {
        Object.keys(baseGeografica).forEach(pais => {
            const option = document.createElement("option");
            option.value = pais;
            option.textContent = pais;
            selectPais.appendChild(option);
        });

        // 🌟 Atualizar a Combobox de Regiões consoante o país selecionado
        selectPais.addEventListener("change", (e) => {
            const paisSelecionado = e.target.value;
            
            // Resetar combobox de regiões
            selectRegiao.innerHTML = '<option value="">Selecione um distrito/região...</option>';
            
            if (paisSelecionado && baseGeografica[paisSelecionado]) {
                selectRegiao.disabled = false;
                baseGeografica[paisSelecionado].forEach(regiao => {
                    const option = document.createElement("option");
                    option.value = regiao;
                    option.textContent = regiao;
                    selectRegiao.appendChild(option);
                });
            } else {
                selectRegiao.disabled = true;
                selectRegiao.innerHTML = '<option value="">Selecione primeiro o país...</option>';
            }
        });
    }

    // 🌟 Atualiza o texto visual do botão com o nome do ficheiro do PC
    if (fileInput && fileLabelSpan) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                const ficheiro = e.target.files[0];
                
                // Validação imediata de tamanho no front-end (3MB)
                if (ficheiro.size > 3 * 1024 * 1024) {
                    alert("A imagem selecionada excede o limite máximo de 3MB.");
                    fileInput.value = ""; // Limpa a seleção
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
        });
    }

    if (formCriarClube) {
        formCriarClube.addEventListener("submit", async (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            
            containerErro.style.display = "none";
            containerErro.textContent = "";

            const formData = new FormData(formCriarClube);

            try {
                const resposta = await fetch('/mngr/gestorClube/guardarClube', {
                    method: 'POST',
                    headers: { 
                        'X-Solicitado-Por': 'SPA'
                    },
                    body: formData
                });

                const resultado = await resposta.json();

                if (resposta.ok && resultado.success) {
                    window.location.href = resultado.redirectTo;
                } else {
                    containerErro.textContent = resultado.message || "Ocorreu um erro ao registar o clube.";
                    containerErro.style.display = "block";
                }
            } catch (err) {
                console.error("Erro na comunicação com a API:", err);
                containerErro.textContent = "Não foi possível conectar ao servidor. Verifique a consola do terminal.";
                containerErro.style.display = "block";
            }
        });
    }
});