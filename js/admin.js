// js/admin.js - ARQUIVO UNIFICADO E CORRIGIDO

import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const configRef = doc(db, "lojas", ID_LOJA);

// --- 0. INICIALIZAÇÃO SEGURA (ESPERA A PÁGINA CARREGAR) ---
window.onload = function() {
    // 1. Ativa o Botão de Login
    const btnEntrar = document.getElementById('btn-entrar');
    if(btnEntrar) {
        btnEntrar.addEventListener('click', fazerLogin);
    }

    // 2. Ativa o Menu Secreto (v1.0)
    configurarMenuSecreto();

    // 3. Ativa o Menu Hamburguer e Navegação
    configurarMenuNavegacao();

    // 4. Se já estiver logado, carrega direto
    verificarLoginSalvo();
};

// --- 1. LÓGICA DO MENU SECRETO ---
function configurarMenuSecreto() {
    let clicksSecretos = 0;
    const elementoSecreto = document.getElementById('dev-secret');
    
    if(elementoSecreto) {
        elementoSecreto.addEventListener('click', () => {
            clicksSecretos++;
            if (clicksSecretos === 3) { 
                const senha = prompt("Acesso Mestre:");
                if(senha === "mestre123") { 
                     window.location.href = "dev.html";
                } else {
                    clicksSecretos = 0; 
                }
            }
            setTimeout(() => { clicksSecretos = 0; }, 2000); // Reseta se demorar
        });
    }
}

// --- 2. LÓGICA DE LOGIN ---
async function fazerLogin() {
    const senhaDigitada = document.getElementById('input-senha-login').value;
    const btn = document.getElementById('btn-entrar');
    
    if(!senhaDigitada) return alert("Digite a senha.");
    btn.innerText = "Verificando...";
    
    try {
        const docSnap = await getDoc(configRef);
        if(docSnap.exists()) {
            const dados = docSnap.data();

            // Aplica fundo
            if(typeof aplicarBackground === 'function') aplicarBackground(dados.fotoFundo);
            else document.documentElement.style.setProperty('--bg-loja', `url('${dados.fotoFundo || IMAGEM_PADRAO}')`);

            // VERIFICA BLOQUEIO
            if (dados.ativa === false) {
                mostrarTelaBloqueio();
                return;
            }

            // VERIFICA SENHA
            if (dados.senhaAdmin === senhaDigitada) {
                document.getElementById('modal-login').style.display = 'none';
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                carregarAgenda();
                carregarConfiguracoesAdmin();
            } else {
                alert("Senha incorreta!");
                btn.innerText = "ENTRAR";
            }
        } else {
            alert("Loja não encontrada.");
            btn.innerText = "ENTRAR";
        }
    } catch (e) {
        alert("Erro ao conectar: " + e.message);
        btn.innerText = "ENTRAR";
    }
}

function verificarLoginSalvo() {
    if(sessionStorage.getItem("logado_loja_" + ID_LOJA) === "sim") {
        document.getElementById('modal-login').style.display = 'none';
        carregarAgenda();
        carregarConfiguracoesAdmin();
    }
}

function mostrarTelaBloqueio() {
    const loginBox = document.querySelector('.login-box');
    loginBox.innerHTML = `
        <div style="font-size:3rem; margin-bottom:10px">⛔</div>
        <h2 style="color:#d9534f; margin-bottom:15px;">Acesso Suspenso</h2>
        <p style="color:#ccc; font-size:0.95rem;">Sua assinatura está pendente.</p>
        <a href="https://wa.me/5511999999999" target="_blank" 
           style="display:block; margin-top:20px; padding:12px; background:#25D366; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">
           🟢 Regularizar Agora
        </a>
    `;
}

// --- 3. NAVEGAÇÃO E MENU ---
function configurarMenuNavegacao() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const btnMenu = document.getElementById('btn-menu');

    function toggleMenu() {
        sidebar.classList.toggle('aberto');
        overlay.classList.toggle('aberto');
    }

    if(btnMenu) btnMenu.addEventListener('click', toggleMenu);
    if(overlay) overlay.addEventListener('click', toggleMenu);

    // Botoes do Menu
    document.getElementById('menu-agenda').onclick = () => mudarTela('agenda');
    document.getElementById('menu-financeiro').onclick = () => mudarTela('financeiro');
    document.getElementById('menu-config').onclick = () => mudarTela('config');
    document.getElementById('menu-senha').onclick = () => mudarTela('senha');
    
    // Botão atualizar financeiro
    const btnFin = document.getElementById('btn-atualizar-fin');
    if(btnFin) btnFin.onclick = carregarFinanceiro;
}

function mudarTela(tela) {
    document.querySelectorAll('.conteudo-tela').forEach(e => e.style.display = 'none');
    document.getElementById(`tela-${tela}`).style.display = 'block';
    document.getElementById('sidebar').classList.remove('aberto');
    document.getElementById('overlay').classList.remove('aberto');
    
    if(tela === 'financeiro') carregarFinanceiro();
}

// --- 4. FUNÇÕES DE DADOS (Agenda, Financeiro, Config) ---
// ... (O resto das funções carregarAgenda, carregarFinanceiro, salvarConfiguracoes continuam iguais abaixo) ...

const inputData = document.getElementById('filtro-data');
if(inputData) {
    inputData.value = new Date().toISOString().split("T")[0];
    inputData.addEventListener('change', () => carregarAgenda());
}

async function carregarAgenda() {
    const data = inputData.value;
    const container = document.getElementById('container-lista');
    container.innerHTML = '<p style="text-align:center">Buscando...</p>';

    const agendamentosRef = collection(db, "lojas", ID_LOJA, "agendamentos");
    const q = query(agendamentosRef, where("data", "==", data));
    
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

// Mantenha aqui as funções carregarFinanceiro, carregarConfiguracoesAdmin, adicionarCampoServico e salvarConfiguracoes e salvarNovaSenha
// Se precisar que eu repita elas inteiras aqui, me avise. Mas elas não mudaram.
// Importante: Elas precisam estar no Window para o HTML antigo acessar SE tivesse onclick, 
// mas como removemos os oncliks, elas podem ficar aqui dentro do modulo.
// EXCEÇÃO: adicionarCampoServico e salvarConfiguracoes ainda sao chamadas pelo HTML na aba Config.
// ENTÃO VAMOS EXPORTAR ELAS PRO WINDOW:

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
        }, { merge: true });
        alert("Salvo com sucesso!");
    } catch (e) { alert("Erro: " + e.message); }
}

window.salvarNovaSenha = async function() {
    const novaSenha = document.getElementById('nova-senha').value;
    if(!novaSenha) return alert("Digite uma senha!");

    if(confirm("Tem certeza que deseja mudar a senha?")) {
        try {
            await setDoc(configRef, { senhaAdmin: novaSenha }, { merge: true });
            alert("Senha alterada!");
            document.getElementById('nova-senha').value = "";
        } catch (e) { alert("Erro: " + e.message); }
    }
}

window.carregarFinanceiro = async function() {
    const agendamentosRef = collection(db, "lojas", ID_LOJA, "agendamentos");
    const snapshot = await getDocs(agendamentosRef);
    
    let totalMes = 0; let totalHoje = 0; let qtdMes = 0;
    const hoje = new Date().toISOString().split("T")[0];
    const mesAtual = hoje.slice(0, 7);

    let precosMap = {};
    const configSnap = await getDoc(configRef);
    if(configSnap.exists()) {
        configSnap.data().servicos.forEach(s => {
            let valorNumerico = parseFloat(s.preco.replace('R$', '').replace(',', '.').trim());
            if(!isNaN(valorNumerico)) precosMap[s.nome] = valorNumerico;
        });
    }

    snapshot.forEach(doc => {
        const item = doc.data();
        let valor = precosMap[item.servico] || 0; 
        if (item.data.startsWith(mesAtual)) {
            totalMes += valor; qtdMes++;
            if (item.data === hoje) totalHoje += valor;
        }
    });

    document.getElementById('fin-mes').innerText = totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('fin-hoje').innerText = totalHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('fin-qtd').innerText = qtdMes;
}

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