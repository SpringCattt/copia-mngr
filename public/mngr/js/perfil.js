// public/mngr/js/perfil.js
async function carregarDadosPerfil() {
    try {
        const resposta = await fetch('/mngr/perfil/dados', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }); 
        
        if (!resposta.ok) {
            const erroDados = await resposta.json();
            throw new Error(erroDados.error || "Não foi possível carregar os dados do perfil.");
        }

        const utilizador = await resposta.json();
        console.log("Dados recebidos do backend com sucesso:", utilizador);

        // Preenchimento dos inputs
        const inputNomeCompleto = document.getElementById("perfil-nome-completo");
        const inputNome = document.getElementById("perfil-nome");
        const inputEmail = document.getElementById("perfil-email");
        const inputTipo = document.getElementById("perfil-tipo");
        const inputCriadoEm = document.getElementById("perfil-criado-em");

        if (inputNomeCompleto) inputNomeCompleto.value = utilizador.nome_completo || "";
        if (inputNome) inputNome.value = utilizador.nome || "";
        if (inputEmail) inputEmail.value = utilizador.email || "";
        if (inputTipo) inputTipo.value = utilizador.tipo_utilizador || "Utilizador";
        
        if (inputCriadoEm && utilizador.criado_em) {
            const dataObj = new Date(utilizador.criado_em);
            inputCriadoEm.value = dataObj.toLocaleDateString('pt-PT') + ' às ' + dataObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        }

        // Atualização dos elementos informativos superiores
        const headerNome = document.getElementById("header-nome-completo");
        const headerTipo = document.getElementById("header-tipo-utilizador");
        const headerEstado = document.getElementById("header-estado");
        const zonaCliqueAvatar = document.getElementById("zona-clique-avatar");
        const avatarIniciaisElement = document.getElementById("avatar-iniciais");

        if (headerNome) headerNome.textContent = utilizador.nome;
        if (headerTipo) headerTipo.textContent = utilizador.tipo_utilizador || "Utilizador";
        
        if (headerEstado) {
            headerEstado.textContent = utilizador.ativo ? "Conta Ativa" : "Conta Inativa";
            headerEstado.className = utilizador.ativo ? "status-ativo" : "status-inativo";
        }

        // 🌟 LÓGICA DE RENDERIZAÇÃO AUTOMÁTICA DA FOTO OU INICIAIS
        if (utilizador.url_imagem) {
            if (zonaCliqueAvatar) zonaCliqueAvatar.style.backgroundImage = `url('${utilizador.url_imagem}')`;
            if (avatarIniciaisElement) avatarIniciaisElement.style.display = 'none'; // Esconde o texto das iniciais
        } else {
            if (zonaCliqueAvatar) zonaCliqueAvatar.style.backgroundImage = 'none';
            if (avatarIniciaisElement) {
                avatarIniciaisElement.style.display = 'block'; // Mostra as iniciais se não houver foto
                
                // Geração das iniciais dinâmicas para o avatar
                if (utilizador.nome_completo) {
                    const partesNome = utilizador.nome_completo.trim().split(" ");
                    let iniciais = partesNome[0].charAt(0);
                    if (partesNome.length > 1) {
                        iniciais += partesNome[partesNome.length - 1].charAt(0);
                    }
                    avatarIniciaisElement.textContent = iniciais.toUpperCase();
                } else {
                    avatarIniciaisElement.textContent = utilizador.nome ? utilizador.nome.charAt(0).toUpperCase() : "U";
                }
            }
        }

    } catch (error) {
        console.error("=== [FRONTEND ERRO] ===", error.message);
    }
}

function inicializarUploadAvatar() {
    const zonaClique = document.getElementById("zona-clique-avatar");
    const inputEscondido = document.getElementById("input-avatar-escondido");

    if (!zonaClique || !inputEscondido) return;

    // Quando clica no círculo do avatar, abre o seletor de ficheiros
    zonaClique.addEventListener("click", () => {
        inputEscondido.click();
    });

    // Quando o utilizador escolhe uma foto, envia para o backend
    inputEscondido.addEventListener("change", async (event) => {
        const ficheiro = event.target.files[0];
        if (!ficheiro) return;

        const formData = new FormData();
        formData.append("avatar", ficheiro);

        try {
            const avatarIniciais = document.getElementById("avatar-iniciais");
            if (avatarIniciais) {
                avatarIniciais.style.display = 'block';
                avatarIniciais.textContent = "..."; // Feedback visual de carregamento
            }

            const resposta = await fetch('/mngr/perfil/alteraravatar', {
                method: 'POST',
                body: formData
            });

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(resultado.message || "Erro ao atualizar a foto de perfil.");
            }

            mostrarAlerta("Foto de perfil atualizada com sucesso!","sucesso");
            
            // Recarrega os dados para pintar o novo fundo imediatamente
            await carregarDadosPerfil(); 

            // Opcional: Se tiveres uma foto pequena na Navbar da SPA, atualiza-a aqui:
            const miniAvatarNavbar = document.getElementById("navbar-avatar-img");
            if (miniAvatarNavbar) miniAvatarNavbar.src = resultado.url_imagem;

        } catch (err) {
            console.error("Erro no upload do avatar:", err);
            mostrarAlerta(err.message, "erro");
            carregarDadosPerfil(); // Faz reset ao estado visual das iniciais
        }
    });
}

// 🌟 INICIALIZAR FORMULÁRIO DE TROCAR PASSWORD
function inicializarAlterarPassword() {
    const formPassword = document.getElementById("form-alterar-password");
    const btnSubmit = document.getElementById("btn-submit-password");

    if (!formPassword) return;

    formPassword.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const passAtual = document.getElementById("pass-atual").value;
        const passNova = document.getElementById("pass-nova").value;
        const passConfirmar = document.getElementById("pass-confirmar").value;

        // 1. Validação no Frontend: Confirmar se a nova password é igual à confirmação
        if (passNova !== passConfirmar) {
            mostrarAlerta("A nova palavra-passe e a confirmação não coincidem.", "aviso");
            return;
        }

        // 2. Preparar dados e interface para envio
        btnSubmit.disabled = true;
        btnSubmit.textContent = "A atualizar...";

        try {
            const resposta = await fetch('/mngr/perfil/alterar-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senhaAtual: passAtual,
                    novaSenha: passNova
                })
            });

            const resultado = await resposta.json();

            if (resposta.ok && resultado.success) {
                mostrarAlerta("Palavra-passe atualizada com sucesso!", "sucesso");
                formPassword.reset(); // Limpa os campos
            } else {
                mostrarAlerta(resultado.message || "Erro ao atualizar a palavra-passe.", "erro");
            }
        } catch (err) {
            console.error("Erro na comunicação:", err);
            mostrarAlerta("Erro ao conectar com o servidor.", "erro");
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Atualizar Palavra-passe";
        }
    });
}

// Inicializar funções
carregarDadosPerfil();
inicializarUploadAvatar();
inicializarAlterarPassword();