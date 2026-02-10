// js/client.js
// ... (imports e variáveis continuam iguais)

// --- FUNÇÃO DE INICIALIZAÇÃO COM VERIFICAÇÃO DE BLOQUEIO ---
async function iniciarApp() {
    try {
        const docRef = doc(db, "lojas", ID_LOJA);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            LOJA_CONFIG = docSnap.data();

            // --- BLOQUEIO AQUI ---
            if (LOJA_CONFIG.ativa === false) {
                renderizarTelaBloqueio(); // Chama a tela de erro
                return; // Para tudo por aqui
            }
            // ---------------------

            renderizarApp();
        } else {
            document.getElementById('nome-barbearia').innerText = "Loja não encontrada";
            alert("Atenção: Esta loja não existe.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao conectar: " + error.message);
    }
}

// --- NOVA FUNÇÃO: TELA DE BLOQUEIO ---
function renderizarTelaBloqueio() {
    // Esconde tudo e mostra aviso
    document.body.innerHTML = `
        <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; text-align:center; padding:20px; background:#121212; color:white;">
            <div style="font-size:4rem; margin-bottom:20px;">🚫</div>
            <h1 style="color:#d9534f; margin-bottom:10px;">Acesso Suspenso</h1>
            <p style="color:#aaa; font-size:1.1rem;">O aplicativo desta barbearia está temporariamente indisponível.</p>
            <p style="margin-top:20px; font-size:0.9rem; color:#666;">Código: 402 - Payment Required</p>
        </div>
    `;
}

// ... (o resto do código renderizarApp, aplicarBackground, etc. continua igual)