// public/mngr/js/register.js

// =========================================================================
// 1. INICIALIZAÇÃO DO SDK OFICIAL DO FACEBOOK
// =========================================================================
window.fbAsyncInit = function() {
    FB.init({
        appId      : '1532950178439509',
        cookie     : true,                     
        xfbml      : true,                     
        version    : 'v18.0'                   
    });
};

// Carregar o script do Facebook de forma assíncrona
(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/pt_PT/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));


// =========================================================================
// 2. SUBMISSÃO DO FORMULÁRIO MANUAL (VIA FETCH ASSÍNCRONO)
// =========================================================================
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const errorContainer = document.getElementById('errorContainer');
    const errorList = document.getElementById('errorList');
    
    errorContainer.style.display = 'none';
    errorList.innerHTML = '';
    document.querySelectorAll('.input-group').forEach(el => el.classList.remove('input-error-border'));

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const resposta = await fetch('/mngr/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, password })
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.success) {
            window.location.href = dados.redirectTo; 
        } else {
            errorContainer.style.display = 'block';
            const li = document.createElement('li');
            li.innerText = dados.message || 'Ocorreu um erro no registo.';
            errorList.appendChild(li);

            if (dados.field) {
                const inputErrado = document.getElementById(dados.field);
                if (inputErrado) {
                    inputErrado.closest('.input-group').classList.add('input-error-border');
                }
            }
        }
    } catch (err) {
        console.error('Erro na comunicação:', err);
        errorContainer.style.display = 'block';
        errorList.innerHTML = '<li>Não foi possível conectar ao servidor. Tente novamente.</li>';
    }
});


// =========================================================================
// 3. CALLBACK SEGURO DO GOOGLE AUTH (CAPTURA OS DADOS DO BOTÃO INVISÍVEL)
// =========================================================================
// Nota: Esta função TEM de ser anexada ao objeto global 'window' para que
// a biblioteca nativa da Google (g_id_onload) a consiga encontrar e executar.
window.handleCredentialResponse = async (response) => {
    const errorContainer = document.getElementById('errorContainer');
    const errorList = document.getElementById('errorList');
    
    try {
        // Descodifica o token JWT (JSON Web Token) enviado de forma segura pela Google
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const googleUser = JSON.parse(jsonPayload);
        
        const nomeReal = googleUser.name;
        const emailReal = googleUser.email;

        console.log(`[Google] A enviar dados: ${nomeReal} - ${emailReal}`);
        // Envia para o teu MainController guardar no Postgres e ativar a sessão!
        await enviarRegistoSocial(nomeReal, emailReal, "Google");

    } catch (err) {
        console.error('Erro ao processar Google Auth:', err);
        errorContainer.style.display = 'block';
        errorList.innerHTML = '<li>Falha ao ler os dados da sua conta Google.</li>';
    }
};


// =========================================================================
// 4. DISPARAR JANELA POPUP REAL DO FACEBOOK (OPEN AUTH)
// =========================================================================
document.getElementById('btnFacebook').addEventListener('click', (e) => {
    e.preventDefault();
    const errorContainer = document.getElementById('errorContainer');
    const errorList = document.getElementById('errorList');

    // Abre a aba pop-up nativa do Facebook
    FB.login(function(response) {
        if (response.authResponse) {
            // Pedimos o name, id e email.
            FB.api('/me', { fields: 'id,name,email' }, async function(userInfo) {
                
                // Se o email não vier devido a restrições de privacidade da conta Meta, 
                // geramos um email único baseado no ID deles para evitar erros de BD.
                const emailFinal = userInfo.email || `${userInfo.id}@facebook.mngr.com`;

                if (userInfo.name) {
                    console.log(`[Facebook] A enviar dados: ${userInfo.name} - ${emailFinal}`);
                    await enviarRegistoSocial(userInfo.name, emailFinal, "Facebook");
                } else {
                    errorContainer.style.display = 'block';
                    errorList.innerHTML = '<li>Não foi possível obter os dados do seu perfil do Facebook.</li>';
                }
            });
        } else {
            console.log('Utilizador cancelou o login ou não autorizou a aplicação.');
        }
    }, { scope: 'email', return_scopes: true }); 
});


// =========================================================================
// 5. FUNÇÃO AUXILIAR DE ENVIO REDE SOCIAL -> BACKEND
// =========================================================================
async function enviarRegistoSocial(nomeSocial, emailSocial, plataforma) {
    const errorContainer = document.getElementById('errorContainer');
    const errorList = document.getElementById('errorList');

    try {
        const respuesta = await fetch('/mngr/register-social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nomeSocial, email: emailSocial, redeSocial: plataforma })
        });

        const dados = await respuesta.json();

        if (respuesta.ok && dados.success) {
            window.location.href = dados.redirectTo;
        } else {
            errorContainer.style.display = 'block';
            errorList.innerHTML = `<li>Erro com ${plataforma}: ${dados.message}</li>`;
        }
    } catch (err) {
        console.error('Erro de ligação:', err);
        errorContainer.style.display = 'block';
        errorList.innerHTML = '<li>Erro de ligação ao servidor ao processar login social.</li>';
    }
}