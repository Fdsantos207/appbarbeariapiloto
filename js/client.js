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

// --- FUNÇÃO: TELA DE BLOQUEIO (VISÃO DO CLIENTE) ---
function renderizarTelaBloqueio() {
    // Esconde o conteúdo normal e mostra o aviso
    document.body.innerHTML = `
        <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:100vh; text-align:center; padding:30px; background:#121212; color:white; font-family: sans-serif;">
            
            <div style="font-size:4rem; margin-bottom:10px; opacity:0.8;">🛠️</div>
            
            <h2 style="color:#D4AF37; margin-bottom:15px;">Barbearia Indisponível</h2>
            
            <p style="color:#aaa; font-size:1rem; line-height:1.5; max-width:400px;">
                O sistema de agendamento desta barbearia está temporariamente suspenso para manutenção administrativa.
            </p>

            <div style="background:rgba(212, 175, 55, 0.1); border:1px solid #D4AF37; padding:20px; border-radius:12px; margin-top:30px; max-width:100%;">
                <p style="color:#D4AF37; font-weight:bold; margin-bottom:5px;">⚠️ Precisa agendar?</p>
                <p style="color:#ddd; font-size:0.9rem;">
                    Por favor, entre em contato diretamente com o barbeiro e 
                    <span style="text-decoration:underline;">informe que o aplicativo está bloqueado.</span>
                </p>
            </div>

            <p style="margin-top:40px; font-size:0.7rem; color:#444;">Código do erro: S-402 (Payment)</p>
        </div>
    `;
}

// ... (o resto do código renderizarApp, aplicarBackground, etc. continua igual)