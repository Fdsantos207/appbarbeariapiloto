import { db, ID_LOJA } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const SENHA_MESTRA = "mestre123";

window.onload = function() {
    carregarFundoLoja();
    document.getElementById('btn-entrar-painel').onclick = fazerLogin;
    document.getElementById('btn-abrir-menu-admin').onclick = toggleMenu;
    document.getElementById('overlay').onclick = toggleMenu;
    
    // Navegação
    ['agenda', 'financeiro', 'config', 'senha'].forEach(m => {
        document.getElementById(`menu-${m}`).onclick = () => mudarTela(m);
    });
    
    document.getElementById('filtro-data').onchange = carregarAgenda;
    document.getElementById('btn-bloquear-modal').onclick = bloquearHorario;
    document.getElementById('btn-add-servico').onclick = () => adicionarCampoServico();
    document.getElementById('btn-salvar-conf').onclick = salvarConfiguracoes;

    if(sessionStorage.getItem("logado_loja_" + ID_LOJA) === "sim") {
        document.getElementById('modal-login').style.display = 'none';
        iniciarPainel();
    }
};

// --- FUNÇÃO PARA BLOQUEAR HORÁRIO ---
async function bloquearHorario() {
    const data = document.getElementById('filtro-data').value;
    const hora = prompt("Qual horário deseja bloquear? (Ex: 13:00)");
    
    if(!hora) return;

    try {
        await addDoc(collection(db, "lojas", ID_LOJA, "agendamentos"), {
            data: data,
            horario: hora,
            cliente_nome: "🚫 BLOQUEADO",
            cliente_zap: "00000000000",
            servico: "BLOQUEIO",
            preco: "R$ 0,00",
            tipo: "bloqueio" // Marcador para sabermos que é um bloqueio
        });
        alert("Horário bloqueado com sucesso!");
        carregarAgenda();
    } catch(e) { alert("Erro ao bloquear: " + e.message); }
}

async function carregarAgenda() {
    const inputData = document.getElementById('filtro-data');
    const data = inputData.value || new Date().toISOString().split("T")[0];
    inputData.value = data;
    const container = document.getElementById('container-lista');
    container.innerHTML = '<p style="text-align:center">Buscando...</p>';

    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("data", "==", data));
    const snapshot = await getDocs(q);
    
    let lista = [];
    snapshot.forEach(doc => { lista.push({ id: doc.id, ...doc.data() }); });
    lista.sort((a, b) => a.horario.localeCompare(b.horario));
    
    if(lista.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#555">Nenhum evento para hoje.</p>';
        return;
    }

    let html = ""; 
    lista.forEach(item => {
        const isBloqueio = item.tipo === "bloqueio";
        const zapLink = item.cliente_zap.replace(/\D/g, ''); 
        
        html += `
            <div class="card-cliente" style="${isBloqueio ? 'border-left-color: #555; opacity: 0.8;' : ''}">
                <div style="flex:1;">
                    <span style="font-size:1.1rem; font-weight:bold; color:${isBloqueio ? '#888' : 'white'}; margin-right:10px">${item.horario}</span>
                    <span style="color:white; font-weight:600;">${item.cliente_nome}</span> <br>
                    <small style="color:#666">${item.servico}</small>
                </div>
                
                <div style="display:flex; gap:10px;">
                    ${!isBloqueio ? `
                        <a href="https://wa.me/55${zapLink}" target="_blank" style="background:#25D366; color:white; width:35px; height:35px; border-radius:50%; display:flex; align-items:center; justify-content:center; text-decoration:none;">📱</a>
                    ` : ''}
                    <button onclick="window.deletarAgendamento('${item.id}')" style="background:#d9534f; color:white; width:35px; height:35px; border:none; border-radius:50%; cursor:pointer;">🗑️</button>
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

// Torna a função global para o onclick funcionar
window.deletarAgendamento = async function(id) {
    if(confirm("Deseja remover este item (Agendamento ou Bloqueio)?")) {
        await deleteDoc(doc(db, "lojas", ID_LOJA, "agendamentos", id));
        carregarAgenda();
    }
};

// ... Restante das funções (fazerLogin, carregarFinanceiro, etc) mantêm-se iguais