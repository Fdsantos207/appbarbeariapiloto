import { db, ID_LOJA } from "./config.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let servicoSelecionado = null;
let horarioSelecionado = null;
let LOJA_CONFIG = null;

window.onload = async function() {
    try {
        // Busca a loja na coleção "lojas" (minúsculo)
        const docSnap = await getDoc(doc(db, "lojas", ID_LOJA)); 
        if (docSnap.exists()) {
            LOJA_CONFIG = docSnap.data();
            document.getElementById('nome-barbearia').innerText = LOJA_CONFIG.nome;
            renderizarServicos();
            document.getElementById('data-agendamento').addEventListener('change', carregarHorarios);
        } else {
            alert("Erro: Loja não cadastrada.");
        }
    } catch (e) { console.error(e); }
    
    // Liga as funções aos botões
    configurarCliques();
};

function configurarCliques() {
    // Menu Hamburguer
    document.getElementById('btn-abrir-menu').onclick = toggleMenu;
    document.getElementById('btn-fechar-menu').onclick = toggleMenu;
    document.getElementById('overlay').onclick = toggleMenu;

    // BOTÃO MEUS AGENDAMENTOS (A correção está aqui)
    document.getElementById('btn-meus-agendamentos').onclick = (e) => {
        e.preventDefault();
        toggleMenu(); // Fecha o menu primeiro
        verMeusAgendamentos(); // Chama a busca
    };

    // Finalizar Agendamento
    document.getElementById('btn-finalizar').onclick = () => {
        if(servicoSelecionado && horarioSelecionado) {
            document.getElementById('modal-cadastro').classList.add('aberto');
        } else {
            alert("Selecione serviço e horário!");
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

// --- FUNÇÃO PARA VER HISTÓRICO ---
async function verMeusAgendamentos() {
    const zap = prompt("Confirme seu WhatsApp (apenas números):");
    if(!zap) return;

    try {
        // Busca na subcoleção agendamentos
        const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("cliente_zap", "==", zap));
        const snap = await getDocs(q);

        if(snap.empty) {
            alert("Nenhum agendamento encontrado para este número.");
            return;
        }

        let msg = "Seus Agendamentos:\n";
        snap.forEach(d => {
            const a = d.data();
            msg += `\n📅 ${a.data} às ${a.horario}\n✂️ ${a.servico}\n`;
        });
        alert(msg);

    } catch (e) {
        console.error(e);
        alert("Erro ao buscar agendamentos.");
    }
}

function renderizarServicos() {
    const div = document.getElementById('lista-servicos');
    div.innerHTML = "";
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
    div.innerHTML = "Buscando...";

    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("data", "==", data));
    const snap = await getDocs(q);
    const ocupados = snap.docs.map(d => d.data().horario);

    div.innerHTML = "";
    let atual = LOJA_CONFIG.horarioInicio * 60;
    while(atual < LOJA_CONFIG.horarioFim * 60) {
        const hora = `${Math.floor(atual/60).toString().padStart(2,'0')}:${(atual%60).toString().padStart(2,'0')}`;
        const btn = document.createElement('div');
        btn.className = 'horario-btn' + (ocupados.includes(hora) ? ' ocupado' : '');
        btn.innerText = hora;
        if(!ocupados.includes(hora)) {
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
    if(servicoSelecionado && horarioSelecionado) {
        document.getElementById('btn-finalizar').classList.add('ativo');
    }
}

async function finalizarAgendamento() {
    const nome = document.getElementById('cliente-nome').value;
    const zap = document.getElementById('cliente-zap').value;
    if(!nome || !zap) return alert("Preencha tudo!");

    try {
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
    } catch(e) { alert("Erro ao agendar."); }
}