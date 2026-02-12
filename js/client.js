// js/client.js

// 1. SISTEMA ANTI-TRAVAMENTO (Mostra erro na tela se falhar)
window.onerror = function(msg, source, lineno) {
    document.body.innerHTML = `
        <div style="background:darkred; color:white; padding:20px; text-align:center; font-family:sans-serif; margin-top:50px;">
            <h2>❌ Ocorreu um Erro</h2>
            <p>${msg}</p>
            <p>Linha: ${lineno}</p>
            <button onclick="location.reload()" style="padding:10px; margin-top:10px;">Tentar Recarregar</button>
        </div>`;
};

import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variáveis Globais
let servicoSelecionado = null;
let horarioSelecionado = null;
let LOJA_CONFIG = null;

// Elementos
const elData = document.getElementById('data-agendamento');
const elModal = document.getElementById('modal-agendamento');
const btnAgendar = document.getElementById('btn-abrir-modal');

// INICIALIZAÇÃO
window.onload = async function() {
    console.log("Iniciando App...");

    if (!ID_LOJA) {
        throw new Error("Link sem ID da loja (ex: ?loja=nome)");
    }

    try {
        const docRef = doc(db, "lojas", ID_LOJA);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            LOJA_CONFIG = docSnap.data();

            if (LOJA_CONFIG.ativa === false) {
                document.body.innerHTML = "<h1 style='color:white;text-align:center;margin-top:50px'>Loja Bloqueada</h1>";
                return;
            }

            // Aplica Visual
            const img = LOJA_CONFIG.fotoFundo || IMAGEM_PADRAO;
            document.documentElement.style.setProperty('--bg-loja', `url('${img}')`);
            
            const titulo = document.getElementById('nome-barbearia');
            if(titulo) titulo.innerText = LOJA_CONFIG.nome;

            // Carrega Serviços
            renderizarServicos();

            // Configura Data
            if(elData) {
                elData.min = new Date().toISOString().split("T")[0];
                elData.addEventListener('change', carregarHorarios);
            }

            // Destrava a tela
            const container = document.getElementById('conteudo-principal');
            if(container) {
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
            }
            
            // Muda o texto de carregando
            if(titulo && titulo.innerText === "Carregando...") titulo.innerText = "Barbearia";

            // Recupera Cliente
            const salvo = localStorage.getItem('cliente_barbearia');
            if(salvo) {
                const c = JSON.parse(salvo);
                const inNome = document.getElementById('cliente-nome');
                const inZap = document.getElementById('cliente-zap');
                if(inNome) inNome.value = c.nome;
                if(inZap) inZap.value = c.zap;
            }

            // ATIVA OS BOTÕES
            ativarEventos();

        } else {
            throw new Error("Barbearia não encontrada no Banco de Dados.");
        }
    } catch (e) {
        throw e; // Joga para o tratador de erro lá em cima
    }
};

function ativarEventos() {
    // Botão Agendar (Abre Modal)
    if(btnAgendar) {
        btnAgendar.addEventListener('click', () => {
            if (!servicoSelecionado || !horarioSelecionado || !elData.value) {
                alert("Selecione Serviço, Data e Horário!");
                return;
            }
            if(elModal) {
                elModal.style.display = 'flex'; // Força abrir
                elModal.classList.add('aberto');
            }
        });
    }

    // Botão Confirmar (Salva)
    const btnSalvar = document.getElementById('btn-salvar-agendamento');
    if(btnSalvar) {
        btnSalvar.addEventListener('click', salvarNoFirebase);
    }

    // Botão Cancelar
    const btnCancelar = document.getElementById('btn-cancelar-modal');
    if(btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            if(elModal) elModal.style.display = 'none';
        });
    }

    // Menu
    const btnMenu = document.getElementById('btn-abrir-menu');
    if(btnMenu) btnMenu.addEventListener('click', toggleMenu);
    
    const btnFecharMenu = document.getElementById('btn-fechar-menu');
    if(btnFecharMenu) btnFecharMenu.addEventListener('click', toggleMenu);
    
    const overlay = document.getElementById('overlay-menu');
    if(overlay) overlay.addEventListener('click', toggleMenu);
}

// --- LÓGICA DO APP ---

function renderizarServicos() {
    const div = document.getElementById('lista-servicos');
    if(!div) return;
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
    const div = document.getElementById('grade-horarios');
    
    if(!data) return;
    div.innerHTML = '<p style="grid-column:span 4; text-align:center">Carregando...</p>';
    
    horarioSelecionado = null;
    atualizarBotao();

    let horarios = [];
    let atual = LOJA_CONFIG.horarioInicio * 60;
    const fim = LOJA_CONFIG.horarioFim * 60;
    
    while(atual < fim) {
        const h = Math.floor(atual / 60).toString().padStart(2, '0');
        const m = (atual % 60).toString().padStart(2, '0');
        horarios.push(`${h}:${m}`);
        atual += LOJA_CONFIG.intervaloMinutos;
    }

    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("data", "==", data));
    const snap = await getDocs(q);
    const ocupados = snap.docs.map(d => d.data().horario);

    div.innerHTML = '';
    horarios.forEach(hora => {
        const btn = document.createElement('div');
        btn.className = 'horario-btn';
        btn.innerText = hora;
        
        if(ocupados.includes(hora)) {
            btn.classList.add('ocupado');
        } else {
            btn.onclick = () => {
                document.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('selecionado'));
                btn.classList.add('selecionado');
                horarioSelecionado = hora;
                atualizarBotao();
            };
        }
        div.appendChild(btn);
    });
}

function atualizarBotao() {
    if(servicoSelecionado && horarioSelecionado && elData.value) {
        btnAgendar.classList.add('ativo');
        btnAgendar.style.opacity = '1';
    } else {
        btnAgendar.classList.remove('ativo');
        btnAgendar.style.opacity = '0.4';
    }
}

async function salvarNoFirebase() {
    const nome = document.getElementById('cliente-nome').value;
    const zap = document.getElementById('cliente-zap').value;
    const btn = document.getElementById('btn-salvar-agendamento');

    if(!nome || !zap) {
        alert("Preencha Nome e WhatsApp");
        return;
    }

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
        alert("Agendamento Confirmado! ✅");
        location.reload();

    } catch(e) {
        alert("Erro: " + e.message);
        btn.innerText = "TENTAR NOVAMENTE";
        btn.disabled = false;
    }
}

function toggleMenu() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('overlay-menu');
    if(sb) sb.classList.toggle('aberto');
    if(ov) {
        if(ov.style.display === 'block') ov.style.display = 'none';
        else ov.style.display = 'block';
    }
}