// js/admin.js

import { db, ID_LOJA } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- SEGURANÇA BÁSICA ---
const SENHA_MESTRE = "admin123"; 
if (sessionStorage.getItem("logado") !== "sim") {
    const tentativa = prompt("🔒 Área Restrita.\nDigite a senha:");
    if (tentativa === SENHA_MESTRE) sessionStorage.setItem("logado", "sim");
    else { alert("Senha incorreta!"); window.location.href = "index.html"; }
}

// --- CONTROLE DE ABAS ---
window.mudarAba = function(aba) {
    document.querySelectorAll('.conteudo-aba').forEach(e => e.classList.remove('ativo'));
    document.querySelectorAll('.tab-btn').forEach(e => e.classList.remove('ativo'));
    document.getElementById(`aba-${aba}`).classList.add('ativo');
    event.target.classList.add('ativo');
}

// --- FUNÇÃO 1: Carregar Agenda ---
const inputData = document.getElementById('filtro-data');
inputData.value = new Date().toISOString().split("T")[0]; // Data de hoje
inputData.addEventListener('change', () => carregarAgenda());

async function carregarAgenda() {
    const data = inputData.value;
    const container = document.getElementById('container-lista');
    container.innerHTML = '<p style="text-align:center">Buscando...</p>';

    // Busca no Firebase
    const q = query(collection(db, "agendamentos"), where("loja_id", "==", ID_LOJA), where("data", "==", data));
    const snapshot = await getDocs(q);
    
    let html = "";
    let lista = [];

    snapshot.forEach(doc => lista.push(doc.data()));
    lista.sort((a, b) => a.horario.localeCompare(b.horario)); // Ordena por hora
    
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
            </div>
        `;
    });
    if(html) container.innerHTML = html;
    document.getElementById('resumo-dia').innerText = `${lista.length} Clientes Hoje`;
}

// Inicia carregando a agenda
carregarAgenda();

// --- FUNÇÃO 2: Configurações da Loja ---
const configRef = doc(db, "lojas", ID_LOJA);

// Carrega as configs atuais para preencher os campos
async function carregarConfiguracoesAdmin() {
    const docSnap = await getDoc(configRef);
    if (docSnap.exists()) {
        const dados = docSnap.data();
        document.getElementById('conf-inicio').value = dados.horarioInicio;
        document.getElementById('conf-fim').value = dados.horarioFim;
        document.getElementById('conf-intervalo').value = dados.intervaloMinutos;
        
        // Limpa e recria os campos de serviço
        const containerServ = document.getElementById('lista-servicos-inputs');
        containerServ.innerHTML = '';
        if (dados.servicos) {
            dados.servicos.forEach(serv => adicionarCampoServico(serv.nome, serv.preco));
        }
    } else {
        adicionarCampoServico("Corte Cabelo", "R$ 35,00"); // Padrão se não existir
    }
}
carregarConfiguracoesAdmin();

// Adiciona um novo campo visualmente na tela
window.adicionarCampoServico = function(nome="", preco="") {
    const div = document.createElement('div');
    div.className = 'item-servico';
    div.innerHTML = `
        <input type="text" placeholder="Nome Serviço" value="${nome}" class="serv-nome">
        <input type="text" placeholder="Preço" value="${preco}" class="serv-preco" style="width:100px">
        <button onclick="this.parentElement.remove()" style="background:#d9534f; color:white; border:none; border-radius:5px;">X</button>
    `;
    document.getElementById('lista-servicos-inputs').appendChild(div);
}

// Salva tudo no Firebase
window.salvarConfiguracoes = async function() {
    const inicio = Number(document.getElementById('conf-inicio').value);
    const fim = Number(document.getElementById('conf-fim').value);
    const intervalo = Number(document.getElementById('conf-intervalo').value);

    // Pega todos os serviços listados
    const servicosDOM = document.querySelectorAll('.item-servico');
    let servicos = [];
    servicosDOM.forEach((item, index) => {
        const nome = item.querySelector('.serv-nome').value;
        const preco = item.querySelector('.serv-preco').value;
        if(nome && preco) servicos.push({ id: index, nome: nome, preco: preco });
    });

    const btn = document.querySelector('.btn-salvar');
    btn.innerText = "Salvando...";
    
    try {
        await setDoc(configRef, {
            nome: "Barbearia do Parceiro",
            horarioInicio: inicio,
            horarioFim: fim,
            intervaloMinutos: intervalo,
            servicos: servicos
        }, { merge: true });
        
        alert("Configurações atualizadas com sucesso!");
        btn.innerText = "SALVAR ALTERAÇÕES";
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar: " + error.message);
        btn.innerText = "SALVAR ALTERAÇÕES";
    }
}