// js/admin.js - CORRIGIDO E CONECTADO

import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Senha Mestra (Abre qualquer loja)
const SENHA_MESTRA = "mestre123";

// --- INICIALIZAÇÃO AUTOMÁTICA ---
window.onload = function() {
    
    // 1. Configurar Botões (Substitui o onclick do HTML)
    document.getElementById('btn-entrar-painel').addEventListener('click', fazerLogin);
    
    document.getElementById('btn-abrir-menu-admin').addEventListener('click', toggleMenu);
    document.getElementById('overlay').addEventListener('click', toggleMenu);
    
    document.getElementById('menu-agenda').addEventListener('click', () => mudarTela('agenda'));
    document.getElementById('menu-financeiro').addEventListener('click', () => mudarTela('financeiro'));
    document.getElementById('menu-config').addEventListener('click', () => mudarTela('config'));
    document.getElementById('menu-senha').addEventListener('click', () => mudarTela('senha'));
    
    document.getElementById('filtro-data').addEventListener('change', carregarAgenda);
    document.getElementById('btn-atualizar-fin').addEventListener('click', carregarFinanceiro);
    
    document.getElementById('btn-add-servico').addEventListener('click', () => adicionarCampoServico());
    document.getElementById('btn-salvar-conf').addEventListener('click', salvarConfiguracoes);
    document.getElementById('btn-salvar-senha').addEventListener('click', salvarNovaSenha);

    // 2. Verifica se já está logado
    if(sessionStorage.getItem("logado_loja_" + ID_LOJA) === "sim") {
        document.getElementById('modal-login').style.display = 'none';
        iniciarPainel();
    }
};

// --- FUNÇÃO DE LOGIN ---
async function fazerLogin() {
    const inputSenha = document.getElementById('input-senha-login');
    const btn = document.getElementById('btn-entrar-painel');
    
    const senhaDigitada = inputSenha.value.trim(); 
    
    if(!senhaDigitada) return alert("Digite a senha.");
    
    btn.innerText = "Verificando...";
    btn.disabled = true;
    
    try {
        const docRef = doc(db, "lojas", ID_LOJA);
        const docSnap = await getDoc(docRef);

        if(docSnap.exists()) {
            const dados = docSnap.data();
            const senhaBanco = String(dados.senhaAdmin).trim();

            // Verifica Senha Normal OU Senha Mestra
            if (senhaDigitada === senhaBanco || senhaDigitada === SENHA_MESTRA) {
                
                document.getElementById('modal-login').style.display = 'none';
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                
                iniciarPainel(); // Carrega tudo

            } else {
                alert("Senha incorreta!");
                btn.innerText = "ENTRAR";
                btn.disabled = false;
            }
        } else {
            alert("Loja não encontrada.");
            btn.innerText = "ENTRAR";
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Erro: " + e.message);
        btn.innerText = "ENTRAR";
        btn.disabled = false;
    }
}

function iniciarPainel() {
    carregarAgenda();
    carregarFinanceiro();
    carregarConfiguracoesAdmin();
    
    // Carrega Fundo
    getDoc(doc(db, "lojas", ID_LOJA)).then(snap => {
        if(snap.exists() && snap.data().fotoFundo) {
            document.body.style.backgroundImage = `url('${snap.data().fotoFundo}')`;
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundAttachment = "fixed";
        }
    });
}

// --- FUNÇÕES DE TELA ---
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('aberto');
    document.getElementById('overlay').classList.toggle('aberto');
}

function mudarTela(tela) {
    document.querySelectorAll('.conteudo-tela').forEach(e => e.style.display = 'none');
    document.getElementById(`tela-${tela}`).style.display = 'block';
    toggleMenu(); // Fecha menu ao clicar
    
    if(tela === 'financeiro') carregarFinanceiro();
}

// --- AGENDA ---
async function carregarAgenda() {
    const inputData = document.getElementById('filtro-data');
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
            <div class="card-cliente">
                <div style="background:#222; padding:15px; margin-bottom:10px; border-radius:8px; border-left:4px solid #D4AF37; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span style="font-size:1.2rem; font-weight:bold; color:white; margin-right:10px">${item.horario}</span>
                        <span style="color:white;">${item.cliente_nome}</span> <br>
                        <small style="color:#888">${item.servico}</small>
                    </div>
                    <a href="https://wa.me/55${zapLink}" target="_blank" style="background:#25D366; color:white; padding:8px 12px; border-radius:50%; text-decoration:none;">📱</a>
                </div>
            </div>`;
    });
    if(html) container.innerHTML = html;
    
    const resumo = document.getElementById('resumo-dia');
    if(resumo) resumo.innerText = `${lista.length} Clientes Hoje`;
}

// --- FINANCEIRO ---
async function carregarFinanceiro() {
    const snapshot = await getDocs(collection(db, "lojas", ID_LOJA, "agendamentos"));
    let totalMes = 0; let totalHoje = 0; let qtdMes = 0;
    const hoje = new Date().toISOString().split("T")[0];
    const mesAtual = hoje.slice(0, 7);

    snapshot.forEach(doc => {
        const item = doc.data();
        let valorString = item.preco || "0";
        let valor = parseFloat(valorString.replace('R$', '').replace('.', '').replace(',', '.').trim());
        if (isNaN(valor)) valor = 0;

        if (item.data.startsWith(mesAtual)) {
            totalMes += valor; qtdMes++;
            if (item.data === hoje) totalHoje += valor;
        }
    });

    if(document.getElementById('fin-mes')) document.getElementById('fin-mes').innerText = totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if(document.getElementById('fin-hoje')) document.getElementById('fin-hoje').innerText = totalHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if(document.getElementById('fin-qtd')) document.getElementById('fin-qtd').innerText = qtdMes;
}

// --- CONFIGURAÇÕES ---
async function carregarConfiguracoesAdmin() {
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

function adicionarCampoServico(nome="", preco="") {
    const div = document.createElement('div');
    div.className = 'item-servico';
    div.style.cssText = "display:flex; gap:10px; margin-bottom:10px;";
    div.innerHTML = `
        <input type="text" placeholder="Serviço" value="${nome}" class="serv-nome" style="flex:1">
        <input type="text" placeholder="Valor" value="${preco}" class="serv-preco" style="width:80px">
        <button class="btn-remove" style="background:#da3633; border:none; color:white; border-radius:5px; cursor:pointer;">X</button>`;
    
    // Adiciona evento de remover no botão X
    div.querySelector('.btn-remove').addEventListener('click', () => div.remove());
    
    document.getElementById('lista-servicos-inputs').appendChild(div);
}

async function salvarConfiguracoes() {
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

async function salvarNovaSenha() {
    const novaSenha = document.getElementById('nova-senha').value;
    if(!novaSenha) return alert("Digite uma senha!");

    if(confirm("Tem certeza que deseja mudar a senha?")) {
        try {
            await setDoc(doc(db, "lojas", ID_LOJA), { senhaAdmin: novaSenha }, { merge: true });
            alert("Senha alterada!");
            document.getElementById('nova-senha').value = "";
        } catch (e) { alert("Erro: " + e.message); }
    }
}