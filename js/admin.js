// js/admin.js - VERSÃO BLINDADA

import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("ADMIN.JS INICIADO! Se você ler isso, o arquivo carregou.");

const configRef = doc(db, "lojas", ID_LOJA);

// --- FUNÇÕES GLOBAIS (Para o HTML conseguir chamar) ---

// 1. LOGIN
window.fazerLogin = async function() {
    console.log("Tentando logar...");
    const senhaDigitada = document.getElementById('input-senha-login').value;
    // Tenta pegar o botão pelo ID novo ou procura pelo seletor antigo
    const btn = document.getElementById('btn-entrar') || document.querySelector('#modal-login button');
    
    if(!senhaDigitada) return alert("Digite a senha.");
    if(btn) btn.innerText = "Verificando...";
    
    try {
        const docSnap = await getDoc(configRef);
        if(docSnap.exists()) {
            const dados = docSnap.data();

            // Aplica Fundo
            aplicarBackground(dados.fotoFundo);

            // VERIFICA BLOQUEIO
            if (dados.ativa === false) {
                mostrarTelaBloqueio();
                return;
            }

            // SENHA
            if (dados.senhaAdmin === senhaDigitada) {
                document.getElementById('modal-login').style.display = 'none';
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                carregarAgenda();
                carregarConfiguracoesAdmin();
            } else {
                alert("Senha incorreta!");
                if(btn) btn.innerText = "ENTRAR";
            }
        } else {
            alert("Loja não encontrada no Banco de Dados.");
            if(btn) btn.innerText = "ENTRAR";
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão: " + e.message);
        if(btn) btn.innerText = "ENTRAR";
    }
}

// 2. FUNÇÕES DE NAVEGAÇÃO
window.toggleMenu = function() {
    document.getElementById('sidebar').classList.toggle('aberto');
    document.getElementById('overlay').classList.toggle('aberto');
}

window.mudarTela = function(tela) {
    document.querySelectorAll('.conteudo-tela').forEach(e => e.style.display = 'none');
    document.getElementById(`tela-${tela}`).style.display = 'block';
    
    const sidebar = document.getElementById('sidebar');
    if(sidebar.classList.contains('aberto')) window.toggleMenu();
    
    if(tela === 'financeiro') carregarFinanceiro();
}

// 3. AUXILIARES
function aplicarBackground(url) {
    const img = url || IMAGEM_PADRAO;
    document.documentElement.style.setProperty('--bg-loja', `url('${img}')`);
}

function mostrarTelaBloqueio() {
    const loginBox = document.querySelector('.login-box');
    if(loginBox) {
        loginBox.innerHTML = `
            <div style="font-size:3rem; margin-bottom:10px">⛔</div>
            <h2 style="color:#d9534f; margin-bottom:15px;">Acesso Suspenso</h2>
            <p style="color:#ccc;">Assinatura pendente.</p>
            <a href="https://wa.me/5511999999999" target="_blank" style="display:block; margin-top:20px; padding:12px; background:#25D366; color:white; text-decoration:none; border-radius:5px;">Regularizar Agora</a>
        `;
    }
}

// --- INICIALIZAÇÃO AUTOMÁTICA ---
// Isso roda assim que a página carrega
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM Carregado - Configurando eventos...");

    // 1. Configurar MENU SECRETO (v1.0)
    const secretBtn = document.getElementById('dev-secret');
    if(secretBtn) {
        let clicks = 0;
        secretBtn.addEventListener('click', () => {
            clicks++;
            console.log("Clique secreto:", clicks);
            if(clicks === 3) {
                const pass = prompt("Acesso Mestre:");
                if(pass === "mestre123") window.location.href = "dev.html";
                clicks = 0;
            }
            setTimeout(() => { clicks = 0 }, 2000);
        });
    }

    // 2. Tentar vincular botão de entrar (caso não tenha onclick no HTML)
    const btnEntrar = document.getElementById('btn-entrar');
    if(btnEntrar) {
        btnEntrar.addEventListener('click', window.fazerLogin);
    }

    // 3. Verificar se já estava logado
    if(sessionStorage.getItem("logado_loja_" + ID_LOJA) === "sim") {
        const modal = document.getElementById('modal-login');
        if(modal) modal.style.display = 'none';
        
        // Puxa o background rapidinho pra não ficar preto
        getDoc(configRef).then(snap => {
            if(snap.exists()) aplicarBackground(snap.data().fotoFundo);
        });

        carregarAgenda();
        carregarConfiguracoesAdmin();
    }
});


// --- OUTRAS FUNÇÕES (Agenda, Financeiro) ---
// Precisam estar no window para os botões internos funcionarem

window.carregarAgenda = async function() {
    const inputData = document.getElementById('filtro-data');
    const data = inputData ? inputData.value : new Date().toISOString().split("T")[0];
    
    const container = document.getElementById('container-lista');
    if(container) container.innerHTML = '<p style="text-align:center">Buscando...</p>';

    try {
        const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("data", "==", data));
        const snapshot = await getDocs(q);
        
        let html = "";
        let lista = [];
        snapshot.forEach(doc => lista.push(doc.data()));
        lista.sort((a, b) => a.horario.localeCompare(b.horario));
        
        if(lista.length === 0) {
            if(container) container.innerHTML = '<p style="text-align:center; padding:20px; color:#555">Sem cortes hoje.</p>';
        } else {
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
            if(container) container.innerHTML = html;
        }
        const resumo = document.getElementById('resumo-dia');
        if(resumo) resumo.innerText = `${lista.length} Clientes Hoje`;
    } catch (e) { console.error(e); }
}

window.carregarFinanceiro = async function() {
    const snapshot = await getDocs(collection(db, "lojas", ID_LOJA, "agendamentos"));
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

    if(document.getElementById('fin-mes')) document.getElementById('fin-mes').innerText = totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if(document.getElementById('fin-hoje')) document.getElementById('fin-hoje').innerText = totalHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if(document.getElementById('fin-qtd')) document.getElementById('fin-qtd').innerText = qtdMes;
}

window.carregarConfiguracoesAdmin = async function() {
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