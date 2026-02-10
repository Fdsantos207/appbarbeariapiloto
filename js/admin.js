// js/admin.js
// ATUALIZAÇÃO: MENSAGEM DE BLOQUEIO PROFISSIONAL

import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const configRef = doc(db, "lojas", ID_LOJA);

// Função auxiliar para aplicar o fundo (se existir)
function aplicarBackground(urlPersonalizada) {
    const imagemFinal = urlPersonalizada ? urlPersonalizada : IMAGEM_PADRAO;
    document.documentElement.style.setProperty('--bg-loja', `url('${imagemFinal}')`);
}

// --- 1. LOGIN COM BLOQUEIO VISUAL ---
window.fazerLogin = async function() {
    const senhaDigitada = document.getElementById('input-senha-login').value;
    const btn = document.querySelector('#modal-login button');
    
    if(!senhaDigitada) return alert("Digite a senha.");
    btn.innerText = "Verificando...";
    
    try {
        const docSnap = await getDoc(configRef);
        if(docSnap.exists()) {
            const dados = docSnap.data();

            // Aplica o fundo mesmo na tela de login pra ficar bonito
            aplicarBackground(dados.fotoFundo);

            // --- BLOQUEIO: AQUI ESTÁ A MUDANÇA ---
            if (dados.ativa === false) {
                // Substitui a caixinha de login por um AVISO
                const loginBox = document.querySelector('.login-box');
                loginBox.innerHTML = `
                    <div style="font-size:3rem; margin-bottom:10px">⛔</div>
                    <h2 style="color:#d9534f; margin-bottom:15px;">Acesso Suspenso</h2>
                    <p style="color:#ccc; font-size:0.95rem; line-height:1.5;">Sua assinatura mensal consta como pendente.</p>
                    <p style="color:#888; font-size:0.85rem; margin-top:5px;">O painel foi bloqueado temporariamente.</p>
                    
                    <a href="https://wa.me/5511951048327?text=Ola,%20minha%20barbearia%20esta%20bloqueada,%20quero%20regularizar." target="_blank" 
                       style="display:block; margin-top:20px; padding:12px; background:#25D366; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">
                       🟢 Regularizar Agora
                    </a>
                    
                    <button onclick="location.reload()" style="margin-top:15px; background:transparent; border:none; color:#666; cursor:pointer; font-size:0.8rem;">Tentar novamente</button>
                `;
                return; // Para o código aqui
            }
            // -------------------------------------

            if (dados.senhaAdmin === senhaDigitada) {
                document.getElementById('modal-login').style.display = 'none';
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                
                carregarAgenda();
                carregarConfiguracoesAdmin();
            } else {
                alert("Senha incorreta!");
            }
        } else {
            alert("Loja não encontrada. Verifique o link de acesso.");
        }
    } catch (e) {
        alert("Erro ao conectar: " + e.message);
    }
    btn.innerText = "ENTRAR";
}

// Verifica se já estava logado (e se não foi bloqueado nesse meio tempo)
if(sessionStorage.getItem("logado_loja_" + ID_LOJA) === "sim") {
    // Faz uma verificação rápida de segurança ao carregar
    getDoc(configRef).then(snap => {
        if(snap.exists() && snap.data().ativa === false) {
            sessionStorage.removeItem("logado_loja_" + ID_LOJA);
            location.reload(); // Chuta ele pra fora se foi bloqueado
        } else {
            // Se tá tudo ok, carrega o painel
            document.getElementById('modal-login').style.display = 'none';
            if(snap.exists()) aplicarBackground(snap.data().fotoFundo);
            carregarAgenda();
            carregarConfiguracoesAdmin();
        }
    });
}

// ... (O RESTANTE DO CÓDIGO: carregarAgenda, carregarFinanceiro, etc. CONTINUA IGUAL) ...
// (Mantenha o resto das funções abaixo igual estava antes)