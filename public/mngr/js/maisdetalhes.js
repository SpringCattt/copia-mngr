// public/mngr/js/maisdetalhes.js

document.addEventListener("DOMContentLoaded", () => {
    const card = document.getElementById("md-card");
    const passoCategoria = document.getElementById("passo-categoria");
    const passoDetalhes = document.getElementById("passo-detalhes");
    
    const formEscolha = document.getElementById("form-escolha-categoria");
    const formDadosFinais = document.getElementById("form-dados-finais");
    
    const selectCategoria = document.getElementById("select-categoria");
    const tituloDinamico = document.getElementById("titulo-dinamico");
    const contentorCampos = document.getElementById("contentor-campos-dinamicos");
    const btnVoltar = document.getElementById("btn-voltar");
    const containerErro = document.getElementById("container-erro-detalhes");

    let categoriaSelecionada = "";

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
            "Bengo", "Benguela", "Bié", "Cabinda", "Quando-Cubango", "Cuanza Norte", 
            "Cuanza Sul", "Cunene", "Huambo", "Huíla", "Luanda", "Lunda Norte", 
            "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire"
        ],
        "Moçambique": [
            "Cabo Delgado", "Gaza", "Inhambane", "Manica", "Maputo", "Nampula", 
            "Niassa", "Sofala", "Tete", "Zambézia"
        ]
    };

    formEscolha.addEventListener("submit", (e) => {
        e.preventDefault();
        categoriaSelecionada = selectCategoria.value;

        if (!categoriaSelecionada) return;

        // Reset de erros prévios
        if(containerErro) {
            containerErro.style.display = "none";
            containerErro.textContent = "";
        }

        card.classList.add("card-modo-largo");
        passoCategoria.style.display = "none";
        passoDetalhes.style.display = "block";

        gerarCamposEspecificos(categoriaSelecionada);
    });

    btnVoltar.addEventListener("click", () => {
        card.classList.remove("card-modo-largo");
        passoDetalhes.style.display = "none";
        passoCategoria.style.display = "block";
        contentorCampos.innerHTML = "";
        if(containerErro) {
            containerErro.style.display = "none";
            containerErro.textContent = "";
        }
    });

    function gerarCamposEspecificos(perfil) {
        contentorCampos.innerHTML = ""; 

        if (perfil === "atleta") {
            tituloDinamico.textContent = "Ficha de Registo do Atleta";
            contentorCampos.innerHTML = `
                <div class="input-group full-width"><label>Nome Completo</label><input type="text" name="nome_completo" class="main-input" required></div>
                <div class="input-group"><label>Data de Nascimento</label><input type="date" name="data_nascimento" class="main-input" required></div>
                <div class="input-group"><label>Sexo</label><select name="sexo" class="main-input" required><option value="M">Masculino</option><option value="F">Feminino</option><option value="Outro">Outro</option></select></div>
                <div class="input-group"><label>Altura (cm)</label><input type="number" name="altura" class="main-input" placeholder="Ex: 182" required></div>
                <div class="input-group"><label>Peso (kg)</label><input type="number" step="0.1" name="peso" class="main-input" placeholder="Ex: 75.5" required></div>
                <div class="input-group"><label>Cidade</label><input type="text" name="cidade" class="main-input" required></div>
                <div class="input-group"><label>Modalidade</label><input type="text" name="modalidade" class="main-input" placeholder="Ex: Futebol" required></div>
            `;
        } 
        else if (perfil === "treinador") {
            tituloDinamico.textContent = "Ficha de Registo do Treinador";
            // 🌟 Correção Visual: Forçada a classe full-width individual em cada div para quebrar de linha corretamente
            contentorCampos.innerHTML = `
                <div class="input-group full-width"><label>Nome Completo</label><input type="text" name="nome_completo" class="main-input" required></div>
                <div class="input-group"><label>Data de Nascimento</label><input type="date" id="data_nascimento_treinador" name="data_nascimento" class="main-input" required></div>
                <div class="input-group"><label>Sexo</label><select name="sexo" class="main-input" required><option value="M">Masculino</option><option value="F">Feminino</option><option value="Outro">Outro</option></select></div>
                <div class="input-group "><label>Grau de Treinador</label><input type="text" name="grau_treinador" class="main-input" placeholder="Ex: Grau II" required></div>
                <div class="input-group "><label>Modalidade</label><select id="modalidade_treinador" name="modalidade" class="main-input" required><option value="" disabled selected>A carregar desportos...</option></select></div>
                <div class="input-group "><label for="pais">País *</label><select id="pais" name="pais" class="main-input" required><option value="">Selecione um país...</option></select></div>
                <div class="input-group"><label for="regiao">Região / Distrito *</label><select id="regiao" name="regiao" class="main-input" required disabled><option value="">Selecione primeiro o país...</option></select></div>
            `;

            // 🌟 1. Bloquear data de nascimento para maiores de 18 anos e impedir datas futuras
            const inputDataTreinador = document.getElementById("data_nascimento_treinador");
            if (inputDataTreinador) {
                const hoje = new Date();
                const maxDataValida = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
                inputDataTreinador.setAttribute("max", maxDataValida.toISOString().split("T")[0]);
            }

            // 🌟 2. Procurar desportos na rota correta fornecida do backend
            const selectModalidade = document.getElementById("modalidade_treinador");
            if (selectModalidade) {
                fetch('/mngr/api/desportos')
                    .then(res => res.json())
                    .then(dados => {
                        if (dados.success && dados.desportos) {
                            selectModalidade.innerHTML = '<option value="" disabled selected>Escolhe a Modalidade...</option>';
                            dados.desportos.forEach(d => {
                                selectModalidade.innerHTML += `<option value="${d.nome}">${d.nome}</option>`;
                            });
                        } else {
                            selectModalidade.innerHTML = '<option value="">Erro ao carregar desportos</option>';
                        }
                    })
                    .catch(err => {
                        console.error("Erro ao fazer fetch dos desportos:", err);
                        selectModalidade.innerHTML = '<option value="">Erro ao ligar ao servidor</option>';
                    });
            }

            // 🌟 3. Configurar os Elementos Geográficos Dinâmicos apenas após existirem no DOM
            const selectPaisDinamico = document.getElementById("pais");
            const selectRegiaoDinamico = document.getElementById("regiao");

            if (selectPaisDinamico && selectRegiaoDinamico) {
                // Popular a Combobox de Países
                Object.keys(baseGeografica).forEach(pais => {
                    const option = document.createElement("option");
                    option.value = pais;
                    option.textContent = pais;
                    selectPaisDinamico.appendChild(option);
                });

                // Escutar mudanças no País para popular as Regiões
                selectPaisDinamico.addEventListener("change", (e) => {
                    const paisSelecionado = e.target.value;
                    
                    // Resetar combobox de regiões
                    selectRegiaoDinamico.innerHTML = '<option value="">Selecione um distrito/região...</option>';
                    
                    if (paisSelecionado && baseGeografica[paisSelecionado]) {
                        selectRegiaoDinamico.disabled = false;
                        baseGeografica[paisSelecionado].forEach(regiao => {
                            const option = document.createElement("option");
                            option.value = regiao;
                            option.textContent = regiao;
                            selectRegiaoDinamico.appendChild(option);
                        });
                    } else {
                        selectRegiaoDinamico.disabled = true;
                        selectRegiaoDinamico.innerHTML = '<option value="">Selecione primeiro o país...</option>';
                    }
                });
            }
        } 
        else if (perfil === "gestor") {
            tituloDinamico.textContent = "Ficha de Registo do Gestor";
            contentorCampos.innerHTML = `
                <div class="input-group full-width"><label>Nome Completo</label><input type="text" name="nome_completo" class="main-input" required></div>
                <div class="input-group"><label>Data de Nascimento</label><input type="date" name="data_nascimento" class="main-input" required></div>
                <div class="input-group"><label>Sexo</label><select name="sexo" class="main-input" required><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Outro">Outro</option></select></div>
                <div class="input-group"><label>Cidade</label><input type="text" name="cidade" class="main-input" required></div>
                <div class="input-group"><label>Início da Carreira</label><input type="date" name="data_inicio_carreira" class="main-input" required></div>
            `;
        }
    }

    formDadosFinais.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        if(containerErro) {
            containerErro.style.display = "none";
            containerErro.textContent = "";
        }

        const formData = new FormData(formDadosFinais);
        const dadosParaEnviar = {};
        
        formData.forEach((value, key) => {
            dadosParaEnviar[key] = value;
        });

        // Junta explicitamente o tipo de perfil no payload para o backend processar
        dadosParaEnviar["tipo_utilizador"] = categoriaSelecionada;

        // Define a rota alvo correspondente ao perfil que está a ser registado
        let rotaUrl = '/mngr/guardar-detalhes-perfil'; 
        if (categoriaSelecionada === 'gestor') {
            rotaUrl = '/mngr/guardar-detalhes-gestor';
        } else if (categoriaSelecionada === 'atleta') {
            rotaUrl = '/mngr/guardar-detalhes-atleta'; 
        } else if (categoriaSelecionada === 'treinador') {
            rotaUrl = '/mngr/guardar-detalhes-treinador'; // 🌟 ROTA NOVA PARA O TREINADOR!
        }

        try {
            const resposta = await fetch(rotaUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosParaEnviar)
            });

            const resultado = await resposta.json();

            if (resposta.ok && resultado.success) {
                window.location.href = resultado.redirectTo;
            } else {
                if (containerErro) {
                    containerErro.style.display = "block";
                    containerErro.textContent = resultado.message || "Ocorreu um erro ao processar os dados.";
                } else {
                    alert(resultado.message || "Erro ao gravar dados.");
                }
            }
        } catch (err) {
            console.error("Erro na comunicação:", err);
            if (containerErro) {
                containerErro.style.display = "block";
                containerErro.textContent = "Incapaz de estabelecer comunicação estável com o servidor de destino.";
            } else {
                alert("Erro ao conectar com o servidor.");
            }
        }
    });
});e