// js/client.js
import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variáveis
let servicoSelecionado = null;
let horarioSelecionado = null;
let LOJA_CONFIG = null;

const elData = document.getElementById('data-agendamento');
const elModal = document.getElementById('modal-agendamento');

// INÍCIO
window.onload = async function() {
    if (!ID_LOJA) {
        alert("Link inválido! Use o link gerado no painel.");
        return;
    }

    try {
        const docRef = doc(db, "lojas", ID_LOJA);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            LOJA_CONFIG = docSnap.data();

            if (LOJA_CONFIG.ativa === false) {
                document.body.innerHTML = "<h1 style='color:white;text-align:center;padding:50px'>Barbearia Indisponível</h1>";
                return;
            }

            // Aplica foto e nome
            const img = LOJA_CONFIG.fotoFundo || IMAGEM_PADRAO;
            document.documentElement.style.setProperty('--bg-loja', `url('${img}')`);
            document.getElementById('nome-barbearia').innerText = LOJA_CONFIG.nome;

            // Renderiza
            renderizarServicos();
            
            // Configura Data
            elData.min = new Date().toISOString().split("T")[0];
            elData.addEventListener('change', carregarHorarios);

            // Mostra tela
            document.getElementById('conteudo-principal').classList.add('ativo');

            // Recupera dados antigos
            const salvo = localStorage.getItem('cliente_barbearia');
            if(salvo) {
                const c = JSON.parse(salvo);
                document.getElementById('cliente-nome').value = c.nome;
                document.getElementById('cliente-zap').value = c.zap;
            }

        } else {
            alert("Barbearia não encontrada!");
        }
    } catch (e) {
        console.error(e);
        alert("Erro ao carregar: " + e.message);
    }
};

// FUNÇÕES
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
    const div = document.getElementById('grade-horarios');
    
    if(!data) return;
    div.innerHTML = '<p style="grid-column:span 4; text-align:center; color:#888">Buscando...</p>';
    
    horarioSelecionado = null;
    atualizarBotao();

    // Calcula horários
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
            btn.onclick = () => {
                document.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('selecionado'));
                btn.classList.add('selecionado');
                horarioSelecionado = hora;
                atualizarBotao();
            }
        }
        div.appendChild(btn);
    });
}

function atualizarBotao() {
    const btn = document.getElementById('btn-finalizar');
    if(servicoSelecionado && horarioSelecionado && elData.value) {
        btn.classList.add('ativo');
        btn.style.opacity = '1';
    } else {
        btn.classList.remove('ativo');
        btn.style.opacity = '0.3';
    }
}

// EVENTOS DE BOTÃO
document.getElementById('btn-finalizar').onclick = () => {
    if(!servicoSelecionado || !horarioSelecionado || !elData.value) {
        return alert("Selecione Serviço, Data e Horário!");
    }
    elModal.classList.add('aberto');
};

document.getElementById('btn-confirmar-modal').onclick = async () => {
    const nome = document.getElementById('cliente-nome').value;
    const zap = document.getElementById('cliente-zap').value;
    const btn = document.getElementById('btn-confirmar-modal');

    if(!nome || !zap) return alert("Preencha todos os dados!");

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
        
        alert("Agendamento realizado com sucesso! ✅");
        location.reload();

    } catch(e) {
        alert("Erro: " + e.message);
        btn.innerText = "TENTAR NOVAMENTE";
        btn.disabled = false;
    }
};

window.fecharModal = function() {
    elModal.classList.remove('aberto');
};

window.toggleMenu = function() {
    document.getElementById('sidebar').classList.toggle('aberto');
    document.getElementById('overlay-menu').classList.toggle('aberto');
};

window.verMeusAgendamentos = async function() {
    const zap = prompt("Seu WhatsApp:");
    if(!zap) return;
    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("cliente_zap", "==", zap));
    const snap = await getDocs(q);
    if(snap.empty) return alert("Nenhum agendamento.");
    let msg = "Seus horários:\n";
    snap.forEach(d => { const a = d.data(); msg += `${a.data} - ${a.horario}\n` });
    alert(msg);
};