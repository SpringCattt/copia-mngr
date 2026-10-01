// public/mngr/js/maisdetalhes.js

document.addEventListener("DOMContentLoaded", async () => {

    // =========================================================================
    // 🌟 CORREÇÃO 3: O dicionário geográfico tem de vir ANTES de tudo!
    // Assim garantimos que a lista já existe na memória quando o formulário for gerado.
    // =========================================================================
   const baseGeografica = {
        // ==========================================
        // Países de Língua Oficial Portuguesa (CPLP)
        // ==========================================
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
        "Angola": [
            "Bengo", "Benguela", "Bié", "Cabinda", "Quando-Cubango", "Cuanza Norte", 
            "Cuanza Sul", "Cunene", "Huambo", "Huíla", "Luanda", "Lunda Norte", 
            "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire"
        ],
        "Moçambique": [
            "Cabo Delgado", "Gaza", "Inhambane", "Manica", "Maputo", "Nampula", 
            "Niassa", "Sofala", "Tete", "Zambézia"
        ],
        "Cabo Verde": [
            "Boa Vista", "Brava", "Fogo", "Maio", "Sal", "Santiago", "Santo Antão", "São Nicolau", "São Vicente"
        ],
        "São Tomé e Príncipe": [
            "Ilha de São Tomé", "Ilha do Príncipe"
        ],
        "Guiné-Bissau": [
            "Bafatá", "Biombo", "Bissau", "Bolama", "Cacheu", "Gabú", "Oio", "Quinara", "Tombali"
        ],
        "Timor-Leste": [
            "Aileu", "Ainaro", "Baucau", "Bobonaro", "Covalima", "Díli", "Ermera", "Lautém", "Liquiçá", "Manatuto", "Manufahi", "Viqueque", "Oecusse"
        ],

        // ==========================================
        // Europa (Completos)
        // ==========================================
        "Espanha": [
            "Andaluzia", "Aragão", "Astúrias", "Baleares", "Canárias", "Cantábria", 
            "Castela-Mancha", "Castela e Leão", "Catalunha", "Comunidade Valenciana", 
            "Estremadura", "Galiza", "La Rioja", "Madrid", "Múrcia", "Navarra", "País Basco", "Ceuta", "Melilha"
        ],
        "França": [
            "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretanha", "Centro-Vale do Loire", 
            "Córsega", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandia", 
            "Nova Aquitânia", "Occitânia", "País do Loire", "Provença-Alpes-Costa Azul", 
            "Guadalupe", "Martinica", "Guiana Francesa", "Reunião", "Mayotte"
        ],
        "Itália": [
            "Abruzzo", "Basilicata", "Calábria", "Campânia", "Emília-Romanha", "Friuli-Veneza Júlia", 
            "Lácio", "Ligúria", "Lombardia", "Marcas", "Molise", "Piemonte", "Puglia", 
            "Sardenha", "Sicília", "Toscana", "Trentino-Alto Ádige", "Úmbria", "Vale de Aosta", "Vêneto"
        ],
        "Alemanha": [
            "Baden-Württemberg", "Baviera", "Berlim", "Brandemburgo", "Bremen", "Hamburgo", 
            "Hesse", "Mecklemburgo-Pomerânia Ocidental", "Baixa Saxônia", "Renânia do Norte-Vestfália", 
            "Renânia-Palatinado", "Sarre", "Saxônia", "Saxônia-Anhalt", "Schleswig-Holstein", "Turíngia"
        ],
        "Reino Unido": [
            "Inglaterra", "Escócia", "País de Gales", "Irlanda do Norte", "Gibraltar", "Ilha de Man"
        ],
        "Suíça": [
            "Appenzell Exterior", "Appenzell Interior", "Argóvia", "Basileia-Campo", "Basileia-Cidade", 
            "Berna", "Friburgo", "Genebra", "Glarus", "Grisões", "Jura", "Lucerna", "Neuchâtel", 
            "Nidwalden", "Obwalden", "Schaffhausen", "Schwyz", "Soleura", "São Galo", "Ticino", 
            "Turgóvia", "Uri", "Valais", "Vaud", "Zug", "Zurique"
        ],
        "Holanda": [
            "Drenthe", "Flevolândia", "Frísia", "Guéldria", "Groninga", "Limburgo", "Brabante do Norte", 
            "Holanda do Norte", "Holanda do Sul", "Overijssel", "Utrecht", "Zelândia"
        ],
        "Bélgica": [
            "Antuérpia", "Brabante Flamengo", "Brabante Valão", "Flandres Ocidental", "Flandres Oriental", 
            "Hainaut", "Liège", "Limburgo", "Luxemburgo", "Namur", "Região de Bruxelas"
        ],
        "Suécia": [
            "Estocolmo", "Västerbotten", "Norrbotten", "Uppsala", "Södermanland", "Östergötland", "Jönköping", 
            "Kronoberg", "Kalmar", "Gotlândia", "Blekinge", "Skåne", "Halland", "Västra Götaland", 
            "Värmland", "Örebro", "Västmanland", "Dalarna", "Gävleborg", "Västernorrland", "Jämtland"
        ],
        "Dinamarca": [
            "Região da Capital", "Zelândia", "Dinamarca do Sul", "Jutlândia Central", "Jutlândia do Norte"
        ],

        // ==========================================
        // Ásia e Médio Oriente (Completos)
        // ==========================================
        "Japão": [
            "Aichi", "Akita", "Aomori", "Chiba", "Ehime", "Fukui", "Fukuoka", "Fukushima", "Gifu", 
            "Gunma", "Hiroshima", "Hokkaido", "Hyogo", "Ibaraki", "Ishikawa", "Iwate", "Kagawa", 
            "Kagoshima", "Kanagawa", "Kochi", "Kumamoto", "Kyoto", "Mie", "Miyagi", "Miyazaki", 
            "Nagano", "Nagasaki", "Nara", "Niigata", "Oita", "Okayama", "Okinawa", "Osaka", "Saga", 
            "Saitama", "Shiga", "Shimane", "Shizuoka", "Tochigi", "Tokushima", "Tokyo", "Tottori", 
            "Toyama", "Wakayama", "Yamagata", "Yamaguchi", "Yamanashi"
        ],
        "China": [
            "Anhui", "Pequim", "Chongqing", "Fujian", "Gansu", "Guangdong", "Guangxi", "Guizhou", 
            "Hainan", "Hebei", "Heilongjiang", "Henan", "Hubei", "Hunan", "Mongólia Interior", 
            "Jiangsu", "Jiangxi", "Jilin", "Liaoning", "Ningxia", "Qinghai", "Shaanxi", "Shandong", 
            "Xangai", "Shanxi", "Sichuan", "Tianjin", "Tibete", "Xinjiang", "Yunnan", "Zhejiang", "Hong Kong", "Macau"
        ],
        "Emirados Árabes Unidos": [
            "Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm al-Quwain", "Ras al-Khaimah", "Fujairah"
        ],

        // ==========================================
        // Américas (Exaustivo)
        // ==========================================
        "Estados Unidos": [
            "Alabama", "Alasca", "Arizona", "Arkansas", "Califórnia", "Carolina do Norte", "Carolina do Sul", 
            "Colorado", "Connecticut", "Dakota do Norte", "Dakota do Sul", "Delaware", "Flórida", "Geórgia", 
            "Havaí", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", 
            "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", 
            "Nebraska", "Nevada", "New Hampshire", "Nova Jérsia", "Novo México", "Nova Iorque", "Ohio", 
            "Oklahoma", "Oregon", "Pensilvânia", "Rhode Island", "Tennessee", "Texas", "Utah", "Vermont", 
            "Virgínia", "Virgínia Ocidental", "Washington", "Wisconsin", "Wyoming", "Distrito de Colúmbia"
        ],
        "Canadá": [
            "Alberta", "Colúmbia Britânica", "Ilha do Príncipe Eduardo", "Manitoba", "Nova Brunswick", 
            "Nova Escócia", "Nunavut", "Ontário", "Quebeque", "Saskatchewan", "Terra Nova e Labrador",
            "Territórios do Noroeste", "Yukon"
        ],
        "México": [
            "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", 
            "Cidade do México", "Coahuila", "Colima", "Durango", "Estado do México", "Guanajuato", "Guerrero", 
            "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", 
            "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", 
            "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
        ],
        "Argentina": [
            "Buenos Aires (Província)", "Cidade Autónoma de Buenos Aires", "Catamarca", "Chaco", "Chubut", 
            "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", 
            "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", 
            "Santiago do Estero", "Terra do Fogo", "Tucumán"
        ],
        "Colômbia": [
            "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá", "Bolívar", "Boyacá", "Caldas", "Caquetá", 
            "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare", "Huila", 
            "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", 
            "Risaralda", "San Andrés e Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada"
        ],

        // ==========================================
        // Oceânia
        // ==========================================
        "Austrália": [
            "Austrália Ocidental", "Austrália Meridional", "Nova Gales do Sul", "Queensland", "Tasmânia", 
            "Vitória", "Território da Capital Australiana", "Território do Norte"
        ],
        "Nova Zelândia": [
            "Auckland", "Wellington", "Canterbury", "Waikato", "Bay of Plenty", "Otago", "Manawatu-Wanganui",
            "Gisborne", "Hawke's Bay", "Marlborough", "Nelson", "Northland", "Southland", "Taranaki", "Tasman", "West Coast"
        ]
    };

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

    // 🌟 BLOCO DE VERIFICAÇÃO AUTOMÁTICA CORRIGIDO
    try {
        const res = await fetch('/mngr/perfil/dados');
        if (res.ok) {
            const utilizador = await res.json();
            
            // Se o Gestor já lhe deu um cargo (ex: "ATLETA" ou "TREINADOR")
            if (utilizador.tipo_utilizador && utilizador.tipo_utilizador.trim() !== '') {
                categoriaSelecionada = utilizador.tipo_utilizador.toLowerCase();
                selectCategoria.value = categoriaSelecionada;
                
                card.classList.add("card-modo-largo");
                passoCategoria.style.display = "none";
                passoDetalhes.style.display = "block";
                if (btnVoltar) btnVoltar.style.display = 'none';

                gerarCamposEspecificos(categoriaSelecionada);

                // Buscar dados adicionais do perfil (data_nascimento, etc.)
                try {
                    const resExtra = await fetch('/mngr/api/dados-pre-registo');
                    if (resExtra.ok) {
                        const extra = await resExtra.json();
                        if (extra.success) {
                            if (extra.data_nascimento) {
                                const inputData = contentorCampos.querySelector('[name="data_nascimento"]');
                                if (inputData) {
                                    const dataFormatada = new Date(extra.data_nascimento).toISOString().split('T')[0];
                                    inputData.value = dataFormatada;
                                    inputData.readOnly = true;
                                    inputData.style.background = '#f1f5f9';
                                    inputData.style.cursor = 'not-allowed';
                                    inputData.title = 'Data de nascimento definida pelo gestor — não pode ser alterada';
                                }
                            }
                            if (extra.id_genero) {
                                const selectGen = contentorCampos.querySelector('[name="id_genero"]');
                                if (selectGen) {
                                    const tentarSelecionar = () => {
                                        const opt = selectGen.querySelector(`option[value="${extra.id_genero}"]`);
                                        if (opt) {
                                            selectGen.value = extra.id_genero;
                                            selectGen.disabled = true;
                                            selectGen.title = 'Género definido pelo gestor — não pode ser alterado';
                                            const hidden = document.createElement('input');
                                            hidden.type = 'hidden';
                                            hidden.name = 'id_genero';
                                            hidden.value = extra.id_genero;
                                            selectGen.parentNode.appendChild(hidden);
                                        } else {
                                            setTimeout(tentarSelecionar, 100);
                                        }
                                    };
                                    tentarSelecionar();
                                }
                            }
                            if (extra.id_desporto) {
                                const selectMod = contentorCampos.querySelector('[name="id_desporto"]');
                                if (selectMod) {
                                    const tentarSelecionar = () => {
                                        const opt = selectMod.querySelector(`option[value="${extra.id_desporto}"]`);
                                        if (opt) {
                                            selectMod.value = extra.id_desporto;
                                            selectMod.disabled = true;
                                            selectMod.title = 'Modalidade definida pelo gestor — não pode ser alterada';
                                            const hidden = document.createElement('input');
                                            hidden.type = 'hidden';
                                            hidden.name = 'id_desporto';
                                            hidden.value = extra.id_desporto;
                                            selectMod.parentNode.appendChild(hidden);
                                        } else {
                                            setTimeout(tentarSelecionar, 100);
                                        }
                                    };
                                    tentarSelecionar();
                                }
                            }
                        }
                    }
                } catch (_) {}
            }
        }
    } catch (err) {
        console.error("Erro ao verificar o perfil existente:", err);
    }

    formEscolha.addEventListener("submit", (e) => {
        e.preventDefault();
        categoriaSelecionada = selectCategoria.value;

        if (!categoriaSelecionada) return;

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
                <div class="input-group"><label>Género</label><select id="genero_atleta" name="id_genero" class="main-input" required><option value="" disabled selected>A carregar...</option></select></div>
                <div class="input-group"><label>Altura (cm)</label><input type="number" name="altura" class="main-input" placeholder="Ex: 182" required></div>
                <div class="input-group"><label>Peso (kg)</label><input type="number" step="0.1" name="peso" class="main-input" placeholder="Ex: 75.5" required></div>
                <div class="input-group"><label for="pais">País *</label><select id="pais" name="pais" class="main-input" required><option value="">Selecione um país...</option></select></div>
                <div class="input-group"><label for="regiao">Região / Distrito *</label><select id="regiao" name="regiao" class="main-input" required disabled><option value="">Selecione primeiro o país...</option></select></div>
                <div class="input-group full-width"><label>Modalidade</label><select id="modalidade_atleta" name="id_desporto" class="main-input" required><option value="" disabled selected>A carregar desportos...</option></select></div>
            `;
            const selectGeneroAtleta = document.getElementById("genero_atleta");
            if (selectGeneroAtleta) {
                fetch('/mngr/api/generos')
                    .then(res => res.json())
                    .then(dados => {
                        if (dados.success && dados.generos) {
                            selectGeneroAtleta.innerHTML = '<option value="" disabled selected>Escolhe o Género...</option>';
                            dados.generos.forEach(g => {
                                selectGeneroAtleta.innerHTML += `<option value="${g.id}">${g.nome}</option>`;
                            });
                        } else {
                            selectGeneroAtleta.innerHTML = '<option value="">Erro ao carregar géneros</option>';
                        }
                    })
                    .catch(() => { selectGeneroAtleta.innerHTML = '<option value="">Erro ao ligar ao servidor</option>'; });
            }
            const selectModalidadeAtleta = document.getElementById("modalidade_atleta");
            if (selectModalidadeAtleta) {
                fetch('/mngr/api/desportos')
                    .then(res => res.json())
                    .then(dados => {
                        if (dados.success && dados.desportos) {
                            selectModalidadeAtleta.innerHTML = '<option value="" disabled selected>Escolhe a Modalidade...</option>';
                            dados.desportos.forEach(d => {
                                selectModalidadeAtleta.innerHTML += `<option value="${d.id}">${d.nome}</option>`;
                            });
                        } else {
                            selectModalidadeAtleta.innerHTML = '<option value="">Erro ao carregar desportos</option>';
                        }
                    })
                    .catch(() => { selectModalidadeAtleta.innerHTML = '<option value="">Erro ao ligar ao servidor</option>'; });
            }
        } 
        else if (perfil === "treinador") {
            tituloDinamico.textContent = "Ficha de Registo do Treinador";
            contentorCampos.innerHTML = `
                <div class="input-group full-width"><label>Nome Completo</label><input type="text" name="nome_completo" class="main-input" required></div>
                <div class="input-group"><label>Data de Nascimento</label><input type="date" id="data_nascimento_treinador" name="data_nascimento" class="main-input" required></div>
                <div class="input-group"><label>Sexo</label><select name="sexo" class="main-input" required><option value="M">Masculino</option><option value="F">Feminino</option><option value="Outro">Outro</option></select></div>
                <div class="input-group "><label>Grau de Treinador</label><input type="text" name="grau_treinador" class="main-input" placeholder="Ex: Grau II" required></div>
                <div class="input-group "><label>Modalidade</label><select id="modalidade_treinador" name="id_desporto" class="main-input" required><option value="" disabled selected>A carregar desportos...</option></select></div>
                <div class="input-group "><label for="pais">País *</label><select id="pais" name="pais" class="main-input" required><option value="">Selecione um país...</option></select></div>
                <div class="input-group"><label for="regiao">Região / Distrito *</label><select id="regiao" name="regiao" class="main-input" required disabled><option value="">Selecione primeiro o país...</option></select></div>
            `;

            const inputDataTreinador = document.getElementById("data_nascimento_treinador");
            if (inputDataTreinador) {
                const hoje = new Date();
                const maxDataValida = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate());
                inputDataTreinador.setAttribute("max", maxDataValida.toISOString().split("T")[0]);
            }

            const selectModalidade = document.getElementById("modalidade_treinador");
            if (selectModalidade) {
                fetch('/mngr/api/desportos')
                    .then(res => res.json())
                    .then(dados => {
                        if (dados.success && dados.desportos) {
                            selectModalidade.innerHTML = '<option value="" disabled selected>Escolhe a Modalidade...</option>';
                            dados.desportos.forEach(d => {
                                selectModalidade.innerHTML += `<option value="${d.id}">${d.nome}</option>`;
                            });
                        } else {
                            selectModalidade.innerHTML = '<option value="">Erro ao carregar desportos</option>';
                        }
                    })
                    .catch(err => {
                        selectModalidade.innerHTML = '<option value="">Erro ao ligar ao servidor</option>';
                    });
            }
        }
        else if (perfil === "gestor") {
            tituloDinamico.textContent = "Ficha de Registo do Gestor";
            contentorCampos.innerHTML = `
                <div class="input-group full-width"><label>Nome Completo</label><input type="text" name="nome_completo" class="main-input" required></div>
                <div class="input-group"><label>Data de Nascimento</label><input type="date" name="data_nascimento" class="main-input" required></div>
                <div class="input-group"><label>Sexo</label><select name="sexo" class="main-input" required><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Outro">Outro</option></select></div>
                <div class="input-group"><label for="pais">País *</label><select id="pais" name="pais" class="main-input" required><option value="">Selecione um país...</option></select></div>
                <div class="input-group"><label for="regiao">Região / Distrito *</label><select id="regiao" name="regiao" class="main-input" required disabled><option value="">Selecione primeiro o país...</option></select></div>
                <div class="input-group full-width"><label>Início da Carreira</label><input type="date" name="data_inicio_carreira" class="main-input" required></div>
            `;
        }

        const selectPaisDinamico = document.getElementById("pais");
        const selectRegiaoDinamico = document.getElementById("regiao");

        if (selectPaisDinamico && selectRegiaoDinamico) {
            Object.keys(baseGeografica).forEach(pais => {
                const option = document.createElement("option");
                option.value = pais;
                option.textContent = pais;
                selectPaisDinamico.appendChild(option);
            });

            selectPaisDinamico.addEventListener("change", (e) => {
                const paisSelecionado = e.target.value;
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

        if (dadosParaEnviar.regiao && dadosParaEnviar.pais) {
            dadosParaEnviar.cidade = `${dadosParaEnviar.regiao}, ${dadosParaEnviar.pais}`;
        }

        dadosParaEnviar["tipo_utilizador"] = categoriaSelecionada;

        let rotaUrl = '/mngr/guardar-detalhes-perfil'; 
        if (categoriaSelecionada === 'gestor') {
            rotaUrl = '/mngr/guardar-detalhes-gestor';
        } else if (categoriaSelecionada === 'atleta') {
            rotaUrl = '/mngr/guardar-detalhes-atleta'; 
        } else if (categoriaSelecionada === 'treinador') {
            rotaUrl = '/mngr/guardar-detalhes-treinador'; 
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
                    mostrarAlerta(resultado.message || "Erro ao gravar dados.");
                }
            }
        } catch (err) {
            console.error("Erro na comunicação:", err);
            if (containerErro) {
                containerErro.style.display = "block";
                containerErro.textContent = "Incapaz de estabelecer comunicação estável com o servidor de destino.";
            } else {
                mostrarAlerta("Erro ao conectar com o servidor.");
            }
        }
    });
});