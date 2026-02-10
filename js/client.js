// js/client.js

import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// VARIÁVEIS GLOBAIS
let servicoSelecionado = null;
let horarioSelecionado = null;
let LOJA_CONFIG = null;

// ELEMENTOS DOM
const elData = document.getElementById('data-agendamento');
const elModal = document.getElementById('modal-agendamento');

// --- 1. INICIALIZAÇÃO ---
window.onload = iniciarApp;

async function iniciarApp() {
    if (!ID_LOJA) {
        document.body.innerHTML = "<h1 style='color:white; text-align:center; margin-top:50px'>⚠️ Link Inválido</h1>";
        return;
    }

    try {
        const docRef = doc(db, "lojas", ID_LOJA);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            LOJA_CONFIG = docSnap.data();

            if (LOJA_CONFIG.ativa === false) {
                document.body.innerHTML = "<h1 style='color:white; text-align:center; margin-top:50px'>🚫 Barbearia Bloqueada</h1>";
                return;
            }

            // Aplica Visual
            const img = LOJA_CONFIG.fotoFundo || IMAGEM_PADRAO;
            document.documentElement.style.setProperty('--bg-loja', `url('${img}')`);
            document.getElementById('nome-barbearia').innerText = LOJA_CONFIG.nome || "Barbearia";
            
            // Carrega Conteúdo
            renderizarServicos();
            
            elData.min = new Date().toISOString().split("T")[0];
            elData.addEventListener('change', carregarHorarios);

            // Animação Entrada
            document.getElementById('conteudo-principal').classList.add('ativo');
            
            // Recupera dados salvos
            const clienteSalvo = localStorage.getItem('cliente_barbearia');
            if(clienteSalvo) {
                const c = JSON.parse(clienteSalvo);
                document.getElementById('cliente-nome').value = c.nome;
                document.getElementById('cliente-zap').value = c.zap;
            }

        } else {
            alert("Loja não encontrada!");
        }
    } catch (error) {
        console.error(error);
        alert("Erro de conexão.");
    }
}

// --- 2. FUNÇÕES AUXILIARES ---

function renderizarServicos() {
    const div = document.getElementById('lista-servicos');
    div.innerHTML = '';
    
    if(!LOJA_CONFIG.servicos) return;

    LOJA_CONFIG.servicos.forEach(serv => {
        const el = document.createElement('div');
        el.className = 'servico-card';
        el.innerHTML = `<div><h3>${serv.nome}</h3><p>${serv.preco}</p></div><div>✂️</div>`;
        
        el.onclick = () => {
            document.querySelectorAll('.servico-card').forEach(e => e.classList.remove('selecionado'));
            el.classList.add('selecionado');
            servicoSelecionado = serv;
            atualizarBotao();
        };
        div.appendChild(el);
    });
}

async function carregarHorarios() {
    const data = elData.value;
    const divHorarios = document.getElementById('grade-horarios');
    
    if (!data) return;
    
    divHorarios.innerHTML = '<p style="grid-column:span 4; text-align:center">Carregando...</p>';
    horarioSelecionado = null;
    atualizarBotao();

    // Gera horários
    let horarios = [];
    let atual = LOJA_CONFIG.horarioInicio * 60;
    const fim = LOJA_CONFIG.horarioFim * 60;
    
    while (atual < fim) {
        const h = Math.floor(atual / 60).toString().padStart(2, '0');
        const m = (atual % 60).toString().padStart(2, '0');
        horarios.push(`${h}:${m}`);
        atual += LOJA_CONFIG.intervaloMinutos;
    }
    
    // Busca ocupados
    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("data", "==", data));
    const snap = await getDocs(q);
    const ocupados = snap.docs.map(doc => doc.data().horario);
    
    divHorarios.innerHTML = '';
    horarios.forEach(hora => {
        const btn = document.createElement('div');
        btn.className = 'horario-btn';
        btn.innerText = hora;
        
        if (ocupados.includes(hora)) {
            btn.classList.add('ocupado');
        } else {
            btn.onclick = () => {
                document.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('selecionado'));
                btn.classList.add('selecionado');
                horarioSelecionado = hora;
                atualizarBotao();
            };
        }
        divHorarios.appendChild(btn);
    });
}

function atualizarBotao() {
    const btn = document.getElementById('btn-finalizar');
    if (servicoSelecionado && horarioSelecionado && elData.value) {
        btn.classList.add('ativo');
        btn.style.opacity = '1';
    } else {
        btn.classList.remove('ativo');
        btn.style.opacity = '0.3';
    }
}

// --- 3. EVENTOS DE CLIQUE (Aqui conectamos os botões) ---

// Botão AGENDAR (Abre Modal)
document.getElementById('btn-finalizar').onclick = () => {
    if (!servicoSelecionado || !horarioSelecionado || !elData.value) {
        return mostrarToast("Selecione serviço, data e horário!", "erro");
    }
    elModal.classList.add('aberto'); // Adiciona classe para abrir
};

// Botão CONFIRMAR (Dentro do Modal)
document.getElementById('btn-confirmar-modal').onclick = async () => {
    const nome = document.getElementById('cliente-nome').value;
    const zap = document.getElementById('cliente-zap').value;
    const btn = document.getElementById('btn-confirmar-modal');

    if (!nome || !zap) return alert("Preencha seu nome e WhatsApp!");

    btn.innerText = "AGENDANDO...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "lojas", ID_LOJA, "agendamentos"), {
            data: elData.value,
            horario: horarioSelecionado,
            servico: servicoSelecionado.nome,
            preco: servicoSelecionado.preco,
            cliente_nome: nome,
            cliente_zap: zap,
            criadoEm: new Date()
        });

        localStorage.setItem('cliente_barbearia', JSON.stringify({ nome, zap }));

        fecharModal();
        mostrarToast("Agendamento Confirmado! ✅", "sucesso");
        
        setTimeout(() => location.reload(), 2000);

    } catch (e) {
        console.error(e);
        alert("Erro ao agendar: " + e.message);
        btn.innerText = "✅ CONFIRMAR";
        btn.disabled = false;
    }
};

// Fecha Modal
window.fecharModal = function() {
    elModal.classList.remove('aberto');
}

// Menu e Toast
window.toggleMenu = () => {
    document.getElementById('sidebar').classList.toggle('aberto');
    document.getElementById('overlay-menu').classList.toggle('aberto');
};

function mostrarToast(msg, tipo) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.className = `toast show ${tipo}`;
    setTimeout(() => t.className = 'toast', 3000);
}

window.verMeusAgendamentos = async () => {
    const zap = prompt("Digite seu WhatsApp para buscar:");
    if(!zap) return;
    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("cliente_zap", "==", zap));
    const snap = await getDocs(q);
    if(snap.empty) {
        alert("Nenhum agendamento encontrado.");
    } else {
        let msg = "Seus Agendamentos:\n\n";
        snap.forEach(d => {
            const ag = d.data();
            msg += `${ag.data} às ${ag.horario} - ${ag.servico}\n`;
        });
        alert(msg);
    }
};