// js/admin.js
import { db, ID_LOJA } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("🚀 PAINEL CARREGADO - Loja:", ID_LOJA); // TESTE DE VIDA

const SENHA_MESTRA = "mestre123";

// USAMOS addEventListener para garantir que o clique seja registrado
window.addEventListener('load', () => {
    const btnLogin = document.getElementById('btn-entrar-painel');
    
    if (btnLogin) {
        console.log("✅ Botão de login encontrado e pronto!");
        btnLogin.addEventListener('click', fazerLogin);
    } else {
        console.error("❌ Erro: O botão 'btn-entrar-painel' não foi encontrado no HTML.");
    }
});

async function fazerLogin() {
    console.log("🔑 Tentando login...");
    const inputSenha = document.getElementById('input-senha-login');
    const btn = document.getElementById('btn-entrar-painel');
    const senhaDigitada = inputSenha.value.trim();
    
    if(!senhaDigitada) {
        alert("Por favor, digite a senha.");
        return;
    }
    
    btn.innerText = "VERIFICANDO...";
    btn.disabled = true;
    
    try {
        const docSnap = await getDoc(doc(db, "lojas", ID_LOJA));
        
        if(docSnap.exists()) {
            const dados = docSnap.data();
            const senhaBanco = String(dados.senhaAdmin || "").trim();
            
            if (senhaDigitada === senhaBanco || senhaDigitada === SENHA_MESTRA) {
                console.log("✅ Senha correta!");
                document.getElementById('modal-login').style.display = 'none';
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                iniciarPainel();
            } else {
                alert("Senha incorreta!");
                btn.innerText = "ENTRAR";
                btn.disabled = false;
            }
        } else {
            alert("Loja não encontrada no banco de dados.");
            btn.innerText = "ENTRAR";
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão: " + e.message);
        btn.innerText = "ENTRAR";
        btn.disabled = false;
    }
}

// Funções do Painel (Agenda, Bloqueio, etc)
function iniciarPainel() {
    carregarAgenda();
    carregarFinanceiro();
    configurarNavegacao();
}

function configurarNavegacao() {
    document.getElementById('btn-abrir-menu-admin').onclick = toggleMenu;
    document.getElementById('overlay').onclick = toggleMenu;
    
    ['agenda', 'financeiro', 'config', 'senha'].forEach(m => {
        document.getElementById(`menu-${m}`).onclick = () => mudarTela(m);
    });

    document.getElementById('filtro-data').onchange = carregarAgenda;
    document.getElementById('btn-bloquear-modal').onclick = bloquearHorario;
}

// ... (Mantenha as outras funções de carregarAgenda e bloquearHorario que enviamos antes)