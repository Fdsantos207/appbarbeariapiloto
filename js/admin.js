// js/admin.js - VERSÃO CORRIGIDA E BLINDADA

import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// SENHA MESTRA (Abre qualquer loja se precisar)
const SENHA_MESTRA = "mestre123"; 

// --- 1. A FUNÇÃO DE LOGIN (Conectada ao Window para o HTML achar) ---
window.fazerLogin = async function() {
    console.log("Iniciando login...");
    
    const inputSenha = document.getElementById('input-senha-login');
    const btn = document.querySelector('#modal-login button'); // Pega o botão
    
    // CORREÇÃO DE OURO: .trim() remove espaços antes e depois da senha!
    const senhaDigitada = inputSenha.value.trim(); 
    
    if(!senhaDigitada) return alert("Digite a senha.");
    
    btn.innerText = "Verificando...";
    btn.disabled = true;
    
    try {
        // Busca a loja no banco
        const docRef = doc(db, "lojas", ID_LOJA);
        const docSnap = await getDoc(docRef);

        if(docSnap.exists()) {
            const dados = docSnap.data();
            // Garante que a senha do banco também não tenha espaços e seja texto
            const senhaBanco = String(dados.senhaAdmin).trim();

            // Verifica se a senha bate (ou se é a mestra)
            if (senhaDigitada === senhaBanco || senhaDigitada === SENHA_MESTRA) {
                
                // SUCESSO!
                document.getElementById('modal-login').style.display = 'none';
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                
                // Carrega o painel
                iniciarPainel();
                
                // Aplica o fundo da barbearia
                if(dados.fotoFundo) {
                    document.body.style.backgroundImage = `url('${dados.fotoFundo}')`;
                    document.body.style.backgroundSize = "cover";
                    document.body.style.backgroundAttachment = "fixed";
                }

            } else {
                alert("Senha incorreta!");
                btn.innerText = "ENTRAR";
                btn.disabled = false;
            }
        } else {
            alert("Erro: Loja não encontrada no banco (ID: " + ID_LOJA + ")");
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

// --- 2. VERIFICA SE JÁ ESTAVA LOGADO ---
window.onload = function() {
    if(sessionStorage.getItem("logado_loja_" + ID_LOJA) === "sim") {
        document.getElementById('modal-login').style.display = 'none';
        iniciarPainel();
    }
}

function iniciarPainel() {
    if(window.carregarAgenda) window.carregarAgenda();
    if(window.carregarConfiguracoesAdmin) window.carregarConfiguracoesAdmin();
}

// --- 3. FUNÇÕES DO SISTEMA (Agenda e Config) ---

// AGENDA
window.carregarAgenda = async function() {
    const inputData = document.getElementById('filtro-data');
    if(!inputData) return;
    
    const data = inputData.value || new Date().toISOString().split("T")[0];
    inputData.value = data;

    const container = document.getElementById('container-lista');
    container.innerHTML = '<p style="text-align:center">Buscando...</p>';

    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("data", "==", data));
    const snapshot = await getDocs(q);
    
    let html = "";
    let lista = [];
    snapshot.forEach(doc => lista.push(doc.data()));
    lista.sort((a, b) => a.horario.localeCompare(b.horario));
    
    if(lista.length === 0) container.innerHTML = '<p style="text-align:center; padding:20px; color:#555">Sem cortes hoje.</p>';
    
    lista.forEach(item => {
        const zapLink = item.cliente_zap.replace(/\D/g, ''); 
        html += `
            <div style="background:#222; padding:15px; margin-bottom:10px; border-radius:8px; border-left:4px solid #D4AF37; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="font-size:1.2rem; font-weight:bold; color:white; margin-right:10px">${item.horario}</span>
                    <span style="color:white;">${item.cliente_nome}</span> <br>
                    <small style="color:#888">${item.servico}</small>
                </div>
                <a href="https://wa.me/55${zapLink}" target="_blank" style="background:#25D366; color:white; padding:8px 12px; border-radius:50%; text-decoration:none;">📱</a>
            </div>`;
    });
    if(html) container.innerHTML = html;
    
    const resumo = document.getElementById('resumo-dia');
    if(resumo) resumo.innerText = `${lista.length} Clientes Hoje`;
}

// Evento de mudança de data
const filtroData = document.getElementById('filtro-data');
if(filtroData) filtroData.addEventListener('change', window.carregarAgenda);

// CONFIGURAÇÕES
window.carregarConfiguracoesAdmin = async function() {
    const docSnap = await getDoc(doc(db, "lojas", ID_LOJA));
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
    div.style.cssText = "display:flex; gap:10px; margin-bottom:10px;";
    div.innerHTML = `
        <input type="text" placeholder="Serviço" value="${nome}" class="serv-nome" style="flex:1; padding:10px; background:#333; border:1px solid #444; color:white;">
        <input type="text" placeholder="$$" value="${preco}" class="serv-preco" style="width:80px; padding:10px; background:#333; border:1px solid #444; color:white;">
        <button onclick="this.parentElement.remove()" style="background:#da3633; border:none; color:white; border-radius:5px; cursor:pointer; padding:0 15px;">X</button>`;
    document.getElementById('lista-servicos-inputs').appendChild(div);
}

window.salvarConfiguracoes = async function() {
    const nome = document.getElementById('conf-nome').value;
    const inicio = Number(document.getElementById('conf-inicio').value);
    const fim = Number(document.getElementById('conf-fim').value);
    const intervalo = Number(document.getElementById('conf-intervalo').value);
    
    const servicosDOM = document.querySelectorAll('#lista-servicos-inputs > div');
    let servicos = [];
    servicosDOM.forEach((item, index) => {
        const n = item.querySelector('.serv-nome').value;
        const p = item.querySelector('.serv-preco').value;
        if(n && p) servicos.push({ id: index, nome: n, preco: p });
    });

    try {
        await setDoc(doc(db, "lojas", ID_LOJA), {
            nome: nome, horarioInicio: inicio, horarioFim: fim, intervaloMinutos: intervalo, servicos: servicos
        }, { merge: true });
        alert("Configurações Salvas!");
    } catch (e) { alert("Erro: " + e.message); }
}

window.salvarNovaSenha = async function() {
    const novaSenha = document.getElementById('nova-senha').value.trim();
    if(!novaSenha) return alert("Digite uma senha!");

    if(confirm("Tem certeza que deseja mudar a senha?")) {
        try {
            await setDoc(doc(db, "lojas", ID_LOJA), { senhaAdmin: novaSenha }, { merge: true });
            alert("Senha alterada!");
            document.getElementById('nova-senha').value = "";
        } catch (e) { alert("Erro: " + e.message); }
    }
}