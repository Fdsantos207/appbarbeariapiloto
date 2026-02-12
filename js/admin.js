import { db, ID_LOJA } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const configRef = doc(db, "lojas", ID_LOJA);

// --- 1. LÓGICA DE LOGIN COM BANCO DE DADOS ---
window.fazerLogin = async function() {
    const senhaDigitada = document.getElementById('input-senha-login').value;
    const btn = document.querySelector('#modal-login button');
    
    if(!senhaDigitada) return alert("Digite a senha.");
    
    btn.innerText = "Verificando...";
    
    try {
        const docSnap = await getDoc(configRef);
        if(docSnap.exists()) {
            const dados = docSnap.data();
            // Verifica se a senha bate com a do banco
            if (dados.senhaAdmin === senhaDigitada) {
                document.getElementById('modal-login').style.display = 'none'; // Some o modal
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                carregarAgenda(); // Carrega os dados
                carregarConfiguracoesAdmin();
            } else {
                alert("Senha incorreta!");
            }
        } else {
            alert("Erro: Loja não encontrada.");
        }
    } catch (e) {
        alert("Erro ao conectar: " + e.message);
    }
    btn.innerText = "ENTRAR";
}

// Verifica se já estava logado antes (pra não pedir senha se der F5)
if(sessionStorage.getItem("logado_loja_" + ID_LOJA) === "sim") {
    document.getElementById('modal-login').style.display = 'none';
    carregarAgenda();
    carregarConfiguracoesAdmin();
}

// --- 2. CARREGAR AGENDA ---
const inputData = document.getElementById('filtro-data');
inputData.value = new Date().toISOString().split("T")[0];
inputData.addEventListener('change', () => carregarAgenda());

async function carregarAgenda() {
    const data = inputData.value;
    const container = document.getElementById('container-lista');
    container.innerHTML = '<p style="text-align:center">Buscando...</p>';

    const q = query(collection(db, "agendamentos"), where("loja_id", "==", ID_LOJA), where("data", "==", data));
    const snapshot = await getDocs(q);
    
    let html = "";
    let lista = [];
    snapshot.forEach(doc => lista.push(doc.data()));
    lista.sort((a, b) => a.horario.localeCompare(b.horario));
    
    if(lista.length === 0) container.innerHTML = '<p style="text-align:center; padding:20px; color:#555">Sem cortes hoje.</p>';
    
    lista.forEach(item => {
        const zapLink = item.cliente_zap.replace(/\D/g, ''); 
        html += `
            <div class="card-cliente">
                <div>
                    <span style="font-size:1.2rem; font-weight:bold; margin-right:10px">${item.horario}</span>
                    <span>${item.cliente_nome}</span> <br>
                    <small style="color:#888">${item.servico}</small>
                </div>
                <a href="https://wa.me/55${zapLink}" target="_blank" class="btn-zap">📱</a>
            </div>`;
    });
    if(html) container.innerHTML = html;
    document.getElementById('resumo-dia').innerText = `${lista.length} Clientes Hoje`;
}

// --- 3. CONFIGURAÇÕES E SENHA ---
async function carregarConfiguracoesAdmin() {
    const docSnap = await getDoc(configRef);
    if (docSnap.exists()) {
        const dados = docSnap.data();
        document.getElementById('conf-nome').value = dados.nome || ""; 
        document.getElementById('conf-inicio').value = dados.horarioInicio;
        document.getElementById('conf-fim').value = dados.horarioFim;
        document.getElementById('conf-intervalo').value = dados.intervaloMinutos;
        
        const containerServ = document.getElementById('lista-servicos-inputs');
        containerServ.innerHTML = '';
        if (dados.servicos) {
            dados.servicos.forEach(serv => adicionarCampoServico(serv.nome, serv.preco));
        }
    }
}

window.adicionarCampoServico = function(nome="", preco="") {
    const div = document.createElement('div');
    div.className = 'item-servico';
    div.innerHTML = `
        <input type="text" placeholder="Serviço" value="${nome}" class="serv-nome">
        <input type="text" placeholder="Valor" value="${preco}" class="serv-preco" style="width:80px">
        <button onclick="this.parentElement.remove()" style="background:#d9534f; border:none; color:white;">X</button>`;
    document.getElementById('lista-servicos-inputs').appendChild(div);
}

window.salvarConfiguracoes = async function() {
    const nome = document.getElementById('conf-nome').value;
    const inicio = Number(document.getElementById('conf-inicio').value);
    const fim = Number(document.getElementById('conf-fim').value);
    const intervalo = Number(document.getElementById('conf-intervalo').value);
    
    const servicosDOM = document.querySelectorAll('.item-servico');
    let servicos = [];
    servicosDOM.forEach((item, index) => {
        const n = item.querySelector('.serv-nome').value;
        const p = item.querySelector('.serv-preco').value;
        if(n && p) servicos.push({ id: index, nome: n, preco: p });
    });

    try {
        await setDoc(configRef, {
            nome: nome, horarioInicio: inicio, horarioFim: fim, intervaloMinutos: intervalo, servicos: servicos
        }, { merge: true }); // Merge true mantém a senha antiga e outros dados
        alert("Salvo com sucesso!");
    } catch (e) { alert("Erro: " + e.message); }
}

// --- 4. ALTERAR SENHA (NOVO) ---
window.salvarNovaSenha = async function() {
    const novaSenha = document.getElementById('nova-senha').value;
    if(!novaSenha) return alert("Digite uma senha!");

    if(confirm("Tem certeza que deseja mudar a senha?")) {
        try {
            await setDoc(configRef, { senhaAdmin: novaSenha }, { merge: true });
            alert("Senha alterada! Use a nova senha no próximo acesso.");
            document.getElementById('nova-senha').value = "";
        } catch (e) { alert("Erro: " + e.message); }
    }
}