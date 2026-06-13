// public/mngr/js/login.js

window.fbAsyncInit = function() {
    FB.init({
        appId      : '1532950178439509',
        cookie     : true,                     
        xfbml      : true,                     
        version    : 'v18.0'                   
    });
};

(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "https://connect.facebook.net/pt_PT/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const errorContainer = document.getElementById('errorContainer');
    const errorList = document.getElementById('errorList');
    
    errorContainer.style.display = 'none';
    errorList.innerHTML = '';
    document.querySelectorAll('.input-group').forEach(el => el.classList.remove('input-error-border'));

    if (!localStorage.getItem("cookiesAceites")) {
        errorContainer.style.display = 'block';
        errorList.innerHTML = '<li>O uso de cookies é obrigatório para manter a sua sessão iniciada com segurança.</li>';
        return;
    }

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const resposta = await fetch('/mngr/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const dados = await resposta.json();

        if (resposta.ok && dados.success) {
            window.location.href = dados.redirectTo; 
        } else {
            errorContainer.style.display = 'block';
            const li = document.createElement('li');
            li.innerText = dados.message || 'Credenciais inválidas.';
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

window.handleCredentialResponse = async (response) => {
    const errorContainer = document.getElementById('errorContainer');
    const errorList = document.getElementById('errorList');
    
    if (!localStorage.getItem("cookiesAceites")) {
        errorContainer.style.display = 'block';
        errorList.innerHTML = '<li>O uso de cookies é obrigatório para processar a autenticação com a Google.</li>';
        return;
    }

    try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const googleUser = JSON.parse(jsonPayload);
        
        // 🌟 PASSAGEM SEGURA: Enviamos o nome real (ou gerado) do payload da Google
        const nomeFinal = googleUser.name || googleUser.email.split('@')[0];
        await enviarLoginSocial(nomeFinal, googleUser.email, "Google");

    } catch (err) {
        console.error('Erro ao processar Google Auth:', err);
        errorContainer.style.display = 'block';
        errorList.innerHTML = '<li>Falha ao ler os dados da sua conta Google.</li>';
    }
};

document.getElementById('btnFacebook').addEventListener('click', (e) => {
    e.preventDefault();
    const errorContainer = document.getElementById('errorContainer');
    const errorList = document.getElementById('errorList');

    if (!localStorage.getItem("cookiesAceites")) {
        errorContainer.style.display = 'block';
        errorList.innerHTML = '<li>O uso de cookies é obrigatório para processar a autenticação com o Facebook.</li>';
        return;
    }

    FB.login(function(response) {
        if (response.authResponse) {
            FB.api('/me', { fields: 'id,name,email' }, async function(userInfo) {
                const emailFinal = userInfo.email || `${userInfo.id}@facebook.mngr.com`;
                const nomeFinal = userInfo.name || emailFinal.split('@')[0];

                if (emailFinal) {
                    await enviarLoginSocial(nomeFinal, emailFinal, "Facebook");
                } else {
                    errorContainer.style.display = 'block';
                    errorList.innerHTML = '<li>Não foi possível obter o e-mail associado ao Facebook.</li>';
                }
            });
        }
    }, { scope: 'email', return_scopes: true }); 
});

async function enviarLoginSocial(nomeSocial, emailSocial, plataforma) {
    const errorContainer = document.getElementById('errorContainer');
    const errorList = document.getElementById('errorList');

    errorContainer.style.display = 'none';
    errorList.innerHTML = '';

    try {
        const resposta = await fetch('/mngr/register-social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: nomeSocial, email: emailSocial, redeSocial: plataforma })
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.success) {
            window.location.href = dados.redirectTo;
        } else {
            errorContainer.style.display = 'block';
            errorList.innerHTML = `<li>${dados.message}</li>`;
        }
    } catch (err) {
        console.error('Erro de ligação:', err);
        errorContainer.style.display = 'block';
        errorList.innerHTML = '<li>Erro de ligação ao servidor ao validar login social.</li>';
    }
}