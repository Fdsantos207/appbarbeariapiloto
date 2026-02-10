// js/client.js
// VERSÃO: AGENDAMENTO ISOLADO (SUB-COLEÇÃO)

import { db, ID_LOJA } from "./config.js";
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let LOJA_CONFIG = {}; 
let selecao = { servico: null, data: null, horario: null };

window.mostrarToast = function(msg, tipo) {
    const x = document.getElementById("toast-box");
    x.innerText = msg;
    x.className = "toast show " + (tipo || "");
    setTimeout(() => x.className = "toast", 3000);
}

// --- 1. INICIALIZAÇÃO ---
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

// --- NOVA FUNÇÃO: TELA DE BLOQUEIO ---
function renderizarTelaBloqueio() {
    // Esconde tudo e mostra aviso
    document.body.innerHTML = `
        <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; text-align:center; padding:20px; background:#121212; color:white;">
            <div style="font-size:4rem; margin-bottom:20px;">🚫</div>
            <h1 style="color:#d9534f; margin-bottom:10px;">Acesso Suspenso</h1>
            <p style="color:#aaa; font-size:1.1rem;">O aplicativo desta barbearia está temporariamente indisponível.</p>
            <p style="margin-top:20px; font-size:0.9rem; color:#666;">Código: 402 - Payment Required</p>
        </div>
    `;
}

function renderizarApp() {
    const titulo = document.getElementById('nome-barbearia');
    if(titulo) titulo.innerText = LOJA_CONFIG.nome || "Barbearia"; 
    
    document.getElementById('conteudo-principal').classList.add('ativo');
    const container = document.getElementById('lista-servicos');
    container.innerHTML = '';
    
    if(LOJA_CONFIG.servicos && LOJA_CONFIG.servicos.length > 0) {
        LOJA_CONFIG.servicos.forEach(serv => {
            const div = document.createElement('div');
            div.className = 'servico-card';
            div.innerHTML = `<div><h3>${serv.nome}</h3><p style="color:var(--cor-dourado-solido)">${serv.preco}</p></div><div>✂️</div>`;
            div.onclick = () => {
                document.querySelectorAll('.servico-card').forEach(e => e.classList.remove('selecionado'));
                div.classList.add('selecionado');
                selecao.servico = serv;
                atualizarBotao();
            };
            container.appendChild(div);
        });
    } else {
        container.innerHTML = '<p style="text-align:center; color:orange">Nenhum serviço cadastrado.</p>';
    }
}

// --- 2. BUSCA DE HORÁRIOS (ISOLADA) ---
const inputData = document.getElementById('data-agendamento');
inputData.min = new Date().toISOString().split("T")[0];

inputData.addEventListener('change', async (e) => {
    selecao.data = e.target.value;
    const container = document.getElementById('lista-horarios');
    container.innerHTML = '<p style="grid-column: span 4; text-align: center;">Verificando agenda...</p>';
    
    // MUDANÇA AQUI: Entra na pasta da loja especifica
    const agendamentosRef = collection(db, "lojas", ID_LOJA, "agendamentos");
    // Não precisa mais filtrar por loja_id, pois já estamos dentro da loja certa
    const q = query(agendamentosRef, where("data", "==", selecao.data));
    
    const snapshot = await getDocs(q);
    const ocupados = [];
    snapshot.forEach(doc => ocupados.push(doc.data().horario));

    gerarGradeHorarios(ocupados);
    atualizarBotao();
});

function gerarGradeHorarios(ocupados) {
    const container = document.getElementById('lista-horarios');
    container.innerHTML = '';
    
    let hora = LOJA_CONFIG.horarioInicio || 9;
    let min = 0;
    const fim = LOJA_CONFIG.horarioFim || 19;
    const intervalo = LOJA_CONFIG.intervaloMinutos || 45;

    while (hora < fim) {
        const horarioStr = `${hora.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`;
        const btn = document.createElement('button');
        btn.className = 'horario-btn';
        btn.innerText = horarioStr;

        if (ocupados.includes(horarioStr)) {
            btn.classList.add('ocupado');
            btn.onclick = () => mostrarToast(`Horário ${horarioStr} indisponível`, "erro");
        } else {
            btn.onclick = () => {
                document.querySelectorAll('.horario-btn').forEach(e => e.classList.remove('selecionado'));
                btn.classList.add('selecionado');
                selecao.horario = horarioStr;
                atualizarBotao();
            };
        }
        container.appendChild(btn);
        min += intervalo;
        if(min >= 60) { hora++; min -= 60; }
    }
}

function atualizarBotao() {
    const btn = document.getElementById('btn-finalizar');
    if(selecao.servico && selecao.data && selecao.horario) {
        btn.classList.add('ativo');
        btn.innerText = `AGENDAR (${selecao.horario})`;
    } else {
        btn.classList.remove('ativo');
        btn.innerText = "AGENDAR";
    }
}

document.getElementById('btn-finalizar').addEventListener('click', () => {
    if(document.getElementById('btn-finalizar').classList.contains('ativo')) {
        document.getElementById('modal-cadastro').style.display = 'flex';
    }
});

window.addEventListener('load', () => {
    if(localStorage.getItem('user_nome')) document.getElementById('cliente-nome').value = localStorage.getItem('user_nome');
    if(localStorage.getItem('user_zap')) document.getElementById('cliente-zap').value = localStorage.getItem('user_zap');
    iniciarApp();
});

// --- 3. FINALIZAR AGENDAMENTO (SALVAR ISOLADO) ---
window.finalizarAgendamento = async function() {
    const nome = document.getElementById('cliente-nome').value;
    const zap = document.getElementById('cliente-zap').value;
    
    if(!nome || !zap) return mostrarToast("Preencha todos os campos!", "erro");

    localStorage.setItem('user_nome', nome);
    localStorage.setItem('user_zap', zap);
    document.querySelector('.btn-confirmar').innerText = "Agendando...";

    try {
        // MUDANÇA AQUI: Salva DENTRO da loja
        const agendamentosRef = collection(db, "lojas", ID_LOJA, "agendamentos");

        await addDoc(agendamentosRef, {
            data: selecao.data,
            horario: selecao.horario,
            servico: selecao.servico.nome,
            cliente_nome: nome,
            cliente_zap: zap,
            criado_em: new Date()
        });
        
        mostrarToast("Agendado com Sucesso!", "sucesso");
        setTimeout(() => location.reload(), 2000);
    } catch (e) {
        console.error(e);
        mostrarToast("Erro ao agendar.", "erro");
        document.querySelector('.btn-confirmar').innerText = "TENTAR NOVAMENTE";
    }
}

// --- 4. MEUS AGENDAMENTOS (BUSCA ISOLADA) ---
window.verMeusAgendamentos = async function() {
    const zapSalvo = localStorage.getItem('user_zap');
    if (!zapSalvo) return mostrarToast("Você ainda não fez agendamentos.", "erro");

    document.getElementById('modal-historico').style.display = 'flex';
    const listaDiv = document.getElementById('lista-historico');
    listaDiv.innerHTML = '<p style="text-align:center; color:#888; margin-top:20px">Buscando sua ficha...</p>';

    try {
        // MUDANÇA AQUI: Busca DENTRO da loja
        const agendamentosRef = collection(db, "lojas", ID_LOJA, "agendamentos");
        const q = query(agendamentosRef, where("cliente_zap", "==", zapSalvo));
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            listaDiv.innerHTML = '<p style="text-align:center; margin-top:20px">Nenhum agendamento nesta loja.</p>';
            return;
        }

        let html = "";
        const lista = [];
        snapshot.forEach(doc => lista.push(doc.data()));
        lista.sort((a,b) => (a.data + a.horario).localeCompare(b.data + b.horario));

        lista.forEach(item => {
            const dataFormatada = item.data.split('-').reverse().slice(0,2).join('/');
            html += `
                <div style="background:#222; padding:12px; margin-bottom:10px; border-radius:8px; border-left: 3px solid var(--cor-dourado-solido);">
                    <div style="display:flex; justify-content:space-between;">
                        <span style="font-weight:bold; color:#fff">${dataFormatada} às ${item.horario}</span>
                        <span style="color:var(--cor-dourado-solido); font-size:0.8rem">Agendado</span>
                    </div>
                    <div style="color:#aaa; font-size:0.9rem; margin-top:5px;">${item.servico}</div>
                </div>`;
        });
        listaDiv.innerHTML = html;
    } catch (e) {
        console.error(e);
        listaDiv.innerHTML = `<p style="color:red; text-align:center">Erro ao buscar.</p>`;
    }
}