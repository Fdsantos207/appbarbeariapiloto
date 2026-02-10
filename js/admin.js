// js/admin.js
// ... (imports e variaveis continuam iguais)

window.fazerLogin = async function() {
    const senhaDigitada = document.getElementById('input-senha-login').value;
    const btn = document.querySelector('#modal-login button');
    
    if(!senhaDigitada) return alert("Digite a senha.");
    btn.innerText = "Verificando...";
    
    try {
        const docSnap = await getDoc(configRef);
        if(docSnap.exists()) {
            const dados = docSnap.data();

            // --- BLOQUEIO AQUI ---
            if (dados.ativa === false) {
                alert("ACESSO BLOQUEADO.\n\nSua assinatura está pendente.\nEntre em contato com o suporte para regularizar.");
                btn.innerText = "ENTRAR";
                return; // Impede o login
            }
            // ---------------------

            if (dados.senhaAdmin === senhaDigitada) {
                document.getElementById('modal-login').style.display = 'none';
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                // ... carrega o resto
                if(typeof aplicarBackground === "function") aplicarBackground(dados.fotoFundo); // Segurança
                carregarAgenda();
                carregarConfiguracoesAdmin();
            } else {
                alert("Senha incorreta!");
            }
        } else {
            alert("Loja não encontrada.");
        }
    } catch (e) {
        alert("Erro ao conectar: " + e.message);
    }
    btn.innerText = "ENTRAR";
}

// ... (o resto do código continua igual)