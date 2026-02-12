// js/client.js
import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variáveis de Estado
let servicoSelecionado = null;
let horarioSelecionado = null;
let LOJA_CONFIG = null;

// Elementos da Tela
const elData = document.getElementById('data-agendamento');
const elModal = document.getElementById('modal-agendamento');
const btnAgendar = document.getElementById('btn-abrir-modal');

// --- 1. INICIALIZAÇÃO DO APP ---
window.onload = async function() {
    if (!ID_LOJA) {
        alert("Erro: Link sem ID da loja. Use o link do painel.");
        return;
    }

    try {
        const docRef = doc(db, "lojas", ID_LOJA);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            LOJA_CONFIG = docSnap.data();

            if (LOJA_CONFIG.ativa === false) {
                document.body.innerHTML = "<h1 style='color:white;text-align:center;padding:50px'>Loja Bloqueada</h1>";
                return;
            }

            // Configura Visual
            const img = LOJA_CONFIG.fotoFundo || IMAGEM_PADRAO;
            document.documentElement.style.setProperty('--bg-loja', `url('${img}')`);
            document.getElementById('nome-barbearia').innerText = LOJA_CONFIG.nome;

            // Carrega Serviços
            renderizarServicos();

            // Configura Data (Hoje em diante)
            elData.min = new Date().toISOString().split("T")[0];
            elData.addEventListener('change', carregarHorarios);

            // Mostra tela
            document.getElementById('conteudo-principal').classList.add('ativo');

            // Preenche dados salvos
            const clienteSalvo = localStorage.getItem('cliente_barbearia');
            if(clienteSalvo) {
                const c = JSON.parse(clienteSalvo);
                document.getElementById('cliente-nome').value = c.nome;
                document.getElementById('cliente-zap').value = c.zap;
            }

        } else {
            alert("Barbearia não encontrada!");
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão: " + e.message);
    }
    
    // Configura os cliques dos botões (ISSO RESOLVE O PROBLEMA DO MODAL)
    configurarCliques();
};

// --- 2. CONFIGURAÇÃO DOS CLIQUES (Sem usar onclick no HTML) ---
function configurarCliques() {
    
    // Botão Principal "AGENDAR"
    btnAgendar.addEventListener('click', () => {
        if (!servicoSelecionado || !horarioSelecionado || !elData.value) {
            mostrarToast("⚠️ Selecione serviço, data e horário!");
            return;
        }
        elModal.classList.add('aberto');
    });

    // Botão "CONFIRMAR" dentro do Modal
    document.getElementById('btn-salvar-agendamento').addEventListener('click', salvarNoFirebase);

    // Botão Cancelar Modal
    document.getElementById('btn-cancelar-modal').addEventListener('click', () => {
        elModal.classList.remove('aberto');
    });

    // Menu Hamburguer
    document.getElementById('btn-abrir-menu').addEventListener('click', toggleMenu);
    document.getElementById('btn-fechar-menu').addEventListener('click', toggleMenu);
    document.getElementById('overlay-menu').addEventListener('click', toggleMenu);
    
    // Link Meus Agendamentos
    document.getElementById('link-meus-agendamentos').addEventListener('click', () => {
        toggleMenu();
        verMeusAgendamentos();
    });
}

// --- 3. FUNÇÕES LÓGICAS ---

function renderizarServicos() {
    const div = document.getElementById('lista-servicos');
    div.innerHTML = '';
    
    if(!LOJA_CONFIG.servicos) return;

    LOJA_CONFIG.servicos.forEach(serv => {
        const el = document.createElement('div');
        el.className = 'servico-card';
        el.innerHTML = `<div><h3>${serv.nome}</h3><p>${serv.preco}</p></div><div>✂️</div>`;
        
        el.addEventListener('click', () => {
            document.querySelectorAll('.servico-card').forEach(e => e.classList.remove('selecionado'));
            el.classList.add('selecionado');
            servicoSelecionado = serv;
            atualizarBotao();
        });
        div.appendChild(el);
    });
}

async function carregarHorarios() {
    const data = elData.value;
    const div = document.getElementById('grade-horarios');
    
    if(!data) return;
    div.innerHTML = '<p style="grid-column:span 4; text-align:center; color:#888">Buscando...</p>';
    
    horarioSelecionado = null;
    atualizarBotao();

    // Gera horários
    let horarios = [];
    let atual = LOJA_CONFIG.horarioInicio * 60;
    const fim = LOJA_CONFIG.horarioFim * 60;
    
    while(atual < fim) {
        const h = Math.floor(atual / 60).toString().padStart(2, '0');
        const m = (atual % 60).toString().padStart(2, '0');
        horarios.push(`${h}:${m}`);
        atual += LOJA_CONFIG.intervaloMinutos;
    }

    // Busca Ocupados
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
            btn.addEventListener('click', () => {
                document.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('selecionado'));
                btn.classList.add('selecionado');
                horarioSelecionado = hora;
                atualizarBotao();
            });
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
        alert("Por favor, preencha seu Nome e WhatsApp.");
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

        // Salva localmente
        localStorage.setItem('cliente_barbearia', JSON.stringify({ nome, zap }));

        elModal.classList.remove('aberto');
        mostrarToast("Agendamento realizado com sucesso! ✅");
        
        setTimeout(() => location.reload(), 2000);

    } catch(e) {
        console.error(e);
        alert("Erro ao agendar: " + e.message);
        btn.innerText = "TENTAR NOVAMENTE";
        btn.disabled = false;
    }
}

// --- FUNÇÕES EXTRAS ---
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('aberto');
    document.getElementById('overlay-menu').classList.toggle('aberto');
}

function mostrarToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.className = "toast show";
    setTimeout(() => t.className = "toast", 3000);
}

async function verMeusAgendamentos() {
    const zap = prompt("Confirme seu WhatsApp:");
    if(!zap) return;
    
    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("cliente_zap", "==", zap));
    const snap = await getDocs(q);
    
    if(snap.empty) {
        alert("Você não tem agendamentos.");
    } else {
        let texto = "Seus Agendamentos:\n";
        snap.forEach(d => {
            const a = d.data();
            texto += `\n📅 ${a.data} às ${a.horario}\n✂️ ${a.servico}\n`;
        });
        alert(texto);
    }
}