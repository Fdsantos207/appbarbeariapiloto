// js/client.js - VERSÃO COM DIAGNÓSTICO DE ERRO

import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// VARIÁVEIS GLOBAIS
let servicoSelecionado = null;
let horarioSelecionado = null;
let LOJA_CONFIG = null;

// ELEMENTOS DOM (Com verificação para não travar se não existirem)
const elData = document.getElementById('data-agendamento');
const elModal = document.getElementById('modal-agendamento');

// --- 1. INICIALIZAÇÃO ---
window.onload = function() {
    console.log("Sistema Iniciando...");
    
    // VERIFICAÇÃO DE SEGURANÇA 1: ID DA LOJA
    if (!ID_LOJA) {
        document.body.innerHTML = `
            <div style="color:white; text-align:center; padding:50px; font-family:sans-serif;">
                <h1>⚠️ Link Inválido</h1>
                <p>Não sei qual barbearia carregar.</p>
                <p>O link precisa ter o ID: <code>index.html?loja=NOME</code></p>
            </div>`;
        return;
    }

    iniciarApp();
};

async function iniciarApp() {
    try {
        console.log("Buscando loja:", ID_LOJA);
        const docRef = doc(db, "lojas", ID_LOJA);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            LOJA_CONFIG = docSnap.data();

            // Verifica Bloqueio
            if (LOJA_CONFIG.ativa === false) {
                renderizarTelaBloqueio();
                return;
            }

            // Aplica Fundo e Nome
            aplicarBackground(LOJA_CONFIG.fotoFundo);
            const titulo = document.getElementById('nome-barbearia');
            if(titulo) titulo.innerText = LOJA_CONFIG.nome || "Barbearia";
            
            // Carrega Serviços
            renderizarServicos();
            
            // Configura Data (Mínimo hoje)
            if(elData) {
                elData.min = new Date().toISOString().split("T")[0];
                elData.addEventListener('change', carregarHorarios);
            }

            // Animação de entrada
            const container = document.getElementById('conteudo-principal');
            if(container) container.classList.add('ativo');
            
            // Recupera cliente salvo
            const clienteSalvo = localStorage.getItem('cliente_barbearia');
            if(clienteSalvo) {
                const c = JSON.parse(clienteSalvo);
                const inNome = document.getElementById('cliente-nome');
                const inZap = document.getElementById('cliente-zap');
                if(inNome) inNome.value = c.nome;
                if(inZap) inZap.value = c.zap;
            }

        } else {
            alert("Loja não encontrada no banco de dados! Verifique o ID.");
        }
    } catch (error) {
        console.error(error);
        alert("Erro Crítico: " + error.message);
    }
}

// --- 2. FUNÇÕES VISUAIS ---
function aplicarBackground(url) {
    const img = url || IMAGEM_PADRAO;
    document.documentElement.style.setProperty('--bg-loja', `url('${img}')`);
}

function renderizarServicos() {
    const div = document.getElementById('lista-servicos');
    if(!div) return;
    
    div.innerHTML = '';
    
    if(!LOJA_CONFIG.servicos || LOJA_CONFIG.servicos.length === 0) {
        div.innerHTML = '<p>Nenhum serviço cadastrado.</p>';
        return;
    }

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

// --- 3. HORÁRIOS ---
async function carregarHorarios() {
    const data = elData.value;
    const divHorarios = document.getElementById('grade-horarios');
    
    if (!data) return;
    
    divHorarios.innerHTML = '<p style="grid-column:span 4; text-align:center">Carregando...</p>';
    horarioSelecionado = null;
    atualizarBotao();

    // Gera horários possíveis
    const horarios = gerarHorarios(LOJA_CONFIG.horarioInicio, LOJA_CONFIG.horarioFim, LOJA_CONFIG.intervaloMinutos);
    
    // Busca ocupados
    const ocupados = await buscarAgendamentos(data);
    
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

function gerarHorarios(inicio, fim, intervalo) {
    let lista = [];
    let atual = inicio * 60; // Converte para minutos
    const fimMinutos = fim * 60;
    
    while (atual < fimMinutos) {
        const h = Math.floor(atual / 60);
        const m = atual % 60;
        const horaFormatada = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        lista.push(horaFormatada);
        atual += intervalo;
    }
    return lista;
}

async function buscarAgendamentos(data) {
    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("data", "==", data));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().horario);
}

// --- 4. AGENDAMENTO E MODAL ---
function atualizarBotao() {
    const btn = document.getElementById('btn-finalizar');
    if(!btn) return;
    
    if (servicoSelecionado && horarioSelecionado && elData.value) {
        btn.classList.add('ativo');
        btn.style.opacity = '1';
    } else {
        btn.classList.remove('ativo');
        btn.style.opacity = '0.3';
    }
}

// EVENTOS DE CLIQUE (Adicionados de forma segura)
document.addEventListener('DOMContentLoaded', () => {
    
    // BOTÃO AGENDAR (Abre Modal)
    const btnAgendar = document.getElementById('btn-finalizar');
    if(btnAgendar) {
        btnAgendar.onclick = () => {
            if (!servicoSelecionado || !horarioSelecionado || !elData.value) {
                return mostrarToast("Selecione serviço, data e horário!", "erro");
            }
            if(elModal) elModal.classList.add('aberto');
        };
    }

    // BOTÃO CONFIRMAR (Salva)
    const btnConfirmar = document.getElementById('btn-confirmar-modal');
    if(btnConfirmar) {
        btnConfirmar.onclick = async () => {
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
    }
});

window.fecharModal = function() {
    if(elModal) elModal.classList.remove('aberto');
};

// --- EXTRAS ---
window.toggleMenu = () => {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('overlay-menu');
    if(sb) sb.classList.toggle('aberto');
    if(ov) ov.classList.toggle('aberto');
};

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

function renderizarTelaBloqueio() {
    document.body.innerHTML = `
        <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; text-align:center; padding:20px; background:#121212; color:white;">
            <div style="font-size:4rem; margin-bottom:20px;">🛠️</div>
            <h2 style="color:#D4AF37;">Barbearia Indisponível</h2>
            <p>Entre em contato com o estabelecimento.</p>
        </div>`;
}

function mostrarToast(msg, tipo) {
    const t = document.getElementById('toast');
    if(!t) return;
    t.innerText = msg;
    t.className = `toast show ${tipo}`;
    setTimeout(() => t.className = 'toast', 3000);
}