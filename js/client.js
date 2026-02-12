import { db, ID_LOJA } from "./config.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let servicoSelecionado = null;
let horarioSelecionado = null;
let LOJA_CONFIG = null;

window.onload = async function() {
    // Verifica se o ID da loja existe na URL (?loja=barbearia)
    if (!ID_LOJA) {
        alert("Erro: Link sem ID da loja. Use ?loja=nome-da-loja");
        return;
    }

    try {
        // CORREÇÃO: Coleção "lojas" em minúsculo
        const docSnap = await getDoc(doc(db, "lojas", ID_LOJA));

        if (docSnap.exists()) {
            LOJA_CONFIG = docSnap.data();
            document.getElementById('nome-barbearia').innerText = LOJA_CONFIG.nome;
            
            if(LOJA_CONFIG.fotoFundo) {
                document.documentElement.style.setProperty('--bg-loja', `url('${LOJA_CONFIG.fotoFundo}')`);
            }

            renderizarServicos();
            
            const elData = document.getElementById('data-agendamento');
            elData.min = new Date().toISOString().split("T")[0];
            elData.addEventListener('change', carregarHorarios);

        } else {
            alert("Loja não encontrada! Verifique o ID no Firebase.");
        }
    } catch (e) {
        console.error("Erro ao carregar loja:", e);
    }
    
    configurarCliques();
};

function configurarCliques() {
    document.getElementById('btn-abrir-menu').onclick = toggleMenu;
    document.getElementById('btn-fechar-menu').onclick = toggleMenu;
    document.getElementById('overlay').onclick = toggleMenu;

    document.getElementById('btn-finalizar').onclick = () => {
        if(servicoSelecionado && horarioSelecionado) {
            document.getElementById('modal-cadastro').classList.add('aberto');
        } else {
            alert("Selecione o serviço e o horário primeiro!");
        }
    };

    document.getElementById('btn-cancelar-cadastro').onclick = () => {
        document.getElementById('modal-cadastro').classList.remove('aberto');
    };

    document.getElementById('btn-confirma-agendamento').onclick = finalizarAgendamento;
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('aberto');
    document.getElementById('overlay').classList.toggle('aberto');
}

function renderizarServicos() {
    const div = document.getElementById('lista-servicos');
    div.innerHTML = "";
    if(!LOJA_CONFIG.servicos) return;

    LOJA_CONFIG.servicos.forEach(serv => {
        const el = document.createElement('div');
        el.className = 'servico-card';
        el.innerHTML = `<h3>${serv.nome}</h3><p>${serv.preco}</p>`;
        el.onclick = () => {
            document.querySelectorAll('.servico-card').forEach(c => c.classList.remove('selecionado'));
            el.classList.add('selecionado');
            servicoSelecionado = serv;
            atualizarBotao();
        };
        div.appendChild(el);
    });
}

async function carregarHorarios() {
    const data = document.getElementById('data-agendamento').value;
    const div = document.getElementById('lista-horarios');
    div.innerHTML = "<p style='grid-column: span 4; text-align:center;'>Buscando horários...</p>";

    // CORREÇÃO: Coleção "lojas" em minúsculo
    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("data", "==", data));
    const snap = await getDocs(q);
    const ocupados = snap.docs.map(d => d.data().horario);

    div.innerHTML = "";
    let atual = LOJA_CONFIG.horarioInicio * 60;
    while(atual < LOJA_CONFIG.horarioFim * 60) {
        const h = Math.floor(atual/60).toString().padStart(2,'0');
        const m = (atual%60).toString().padStart(2,'0');
        const hora = `${h}:${m}`;
        
        const btn = document.createElement('div');
        btn.className = 'horario-btn';
        btn.innerText = hora;
        
        if(ocupados.includes(hora)) btn.classList.add('ocupado');
        else {
            btn.onclick = () => {
                document.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('selecionado'));
                btn.classList.add('selecionado');
                horarioSelecionado = hora;
                atualizarBotao();
            };
        }
        div.appendChild(btn);
        atual += LOJA_CONFIG.intervaloMinutos;
    }
}

function atualizarBotao() {
    const btn = document.getElementById('btn-finalizar');
    if(servicoSelecionado && horarioSelecionado) btn.classList.add('ativo');
}

async function finalizarAgendamento() {
    const nome = document.getElementById('cliente-nome').value;
    const zap = document.getElementById('cliente-zap').value;
    if(!nome || !zap) return alert("Preencha seu nome e WhatsApp!");

    try {
        // CORREÇÃO: Coleção "lojas" em minúsculo
        await addDoc(collection(db, "lojas", ID_LOJA, "agendamentos"), {
            cliente_nome: nome,
            cliente_zap: zap,
            data: document.getElementById('data-agendamento').value,
            horario: horarioSelecionado,
            servico: servicoSelecionado.nome,
            preco: servicoSelecionado.preco,
            criadoEm: new Date()
        });
        alert("Agendado com sucesso! ✅");
        location.reload();
    } catch(e) { 
        console.error(e);
        alert("Erro ao realizar agendamento."); 
    }
}