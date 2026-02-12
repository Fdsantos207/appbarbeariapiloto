// js/client.js
import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variáveis Globais
let servicoSelecionado = null;
let horarioSelecionado = null;
let LOJA_CONFIG = null;

// Elementos Principais
const elData = document.getElementById('data-agendamento');
const modalCadastro = document.getElementById('modal-cadastro');

// --- INICIALIZAÇÃO ---
window.onload = async function() {
    console.log("Iniciando App para Loja ID:", ID_LOJA);
    
    // 1. LIGA OS BOTÕES PRIMEIRO (Assim o menu funciona sempre)
    configurarBotoes();

    // 2. VERIFICA O ID
    if (!ID_LOJA) {
        // Se não tiver ID, tenta usar 'barbearia' como padrão ou avisa
        if(confirm("Link incorreto. Deseja ir para a barbearia padrão?")) {
            window.location.href = window.location.pathname + "?loja=barbearia";
        } else {
            alert("Erro: Link sem ID da loja.");
        }
        return;
    }

    try {
        const docRef = doc(db, "lojas", ID_LOJA);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            LOJA_CONFIG = docSnap.data();
            
            // Loja Bloqueada?
            if (LOJA_CONFIG.ativa === false) {
                document.body.innerHTML = "<h1 style='color:white; padding:50px; text-align:center'>Loja Bloqueada</h1>";
                return;
            }

            // Sucesso: Preenche a tela
            document.getElementById('nome-barbearia').innerText = LOJA_CONFIG.nome;
            
            // Fundo
            const bg = LOJA_CONFIG.fotoFundo || IMAGEM_PADRAO;
            document.body.style.backgroundImage = `url('${bg}')`;
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundAttachment = "fixed";
            
            // Overlay escuro para ler melhor
            if(!document.getElementById('bg-overlay')) {
                const ov = document.createElement('div');
                ov.id = 'bg-overlay';
                ov.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:-1;";
                document.body.appendChild(ov);
            }

            renderizarServicos();
            
            elData.min = new Date().toISOString().split("T")[0];
            elData.addEventListener('change', carregarHorarios);

            const cliente = localStorage.getItem('cliente_barbearia');
            if(cliente) {
                const c = JSON.parse(cliente);
                document.getElementById('cliente-nome').value = c.nome;
                document.getElementById('cliente-zap').value = c.zap;
            }

        } else {
            // Se não achou a loja, avisa mas não mata o menu
            document.getElementById('nome-barbearia').innerText = "Loja não encontrada";
            alert(`A loja "${ID_LOJA}" não existe no banco de dados.\n\nUse o painel Dev.html para criá-la.`);
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão: " + e.message);
    }
};

// --- CONFIGURAÇÃO DOS BOTÕES ---
function configurarBotoes() {
    // Menu Hamburguer
    const btnAbrir = document.getElementById('btn-abrir-menu');
    const btnFechar = document.getElementById('btn-fechar-menu');
    const overlay = document.getElementById('overlay');

    if(btnAbrir) btnAbrir.addEventListener('click', toggleMenu);
    if(btnFechar) btnFechar.addEventListener('click', toggleMenu);
    if(overlay) overlay.addEventListener('click', toggleMenu);
    
    // Agendar
    const btnFinalizar = document.getElementById('btn-finalizar');
    if(btnFinalizar) {
        btnFinalizar.addEventListener('click', () => {
            if(!servicoSelecionado || !horarioSelecionado || !elData.value) {
                return mostrarToast("⚠️ Selecione Serviço, Data e Horário");
            }
            modalCadastro.style.display = 'flex';
            setTimeout(() => modalCadastro.classList.add('aberto'), 10);
        });
    }

    // Cancelar Modal
    const btnCancelar = document.getElementById('btn-cancelar-cadastro');
    if(btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            modalCadastro.classList.remove('aberto');
            setTimeout(() => modalCadastro.style.display = 'none', 300);
        });
    }

    // Confirmar
    const btnConfirma = document.getElementById('btn-confirma-agendamento');
    if(btnConfirma) btnConfirma.addEventListener('click', finalizarAgendamento);

    // Meus Agendamentos
    const btnMeus = document.getElementById('btn-meus-agendamentos'); // Se for 'a' tag, use o ID correto do HTML
    // No seu HTML anterior era 'link-meus-agendamentos' ou algo assim. 
    // Vou garantir pegando pelo seletor de navegação se o ID falhar
    if(btnMeus) {
        btnMeus.addEventListener('click', () => {
            toggleMenu();
            verMeusAgendamentos();
        });
    } else {
        // Fallback se o ID mudou
        const links = document.querySelectorAll('nav a');
        if(links[0]) links[0].addEventListener('click', () => { toggleMenu(); verMeusAgendamentos(); });
    }
}

function toggleMenu() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('overlay');
    if(sb) sb.classList.toggle('aberto');
    if(ov) ov.classList.toggle('aberto');
}

// --- FUNÇÕES DE LÓGICA ---

function renderizarServicos() {
    const div = document.getElementById('lista-servicos');
    div.innerHTML = "";
    if(!LOJA_CONFIG.servicos) return;

    LOJA_CONFIG.servicos.forEach(serv => {
        const el = document.createElement('div');
        el.className = 'servico-card';
        el.innerHTML = `<div><h3>${serv.nome}</h3><p>${serv.preco}</p></div><div>✂️</div>`;
        
        el.addEventListener('click', () => {
            document.querySelectorAll('.servico-card').forEach(e => e.classList.remove('selecionado'));
            el.classList.add('selecionado');
            servicoSelecionado = serv;
            atualizarStatusBotao();
        });
        div.appendChild(el);
    });
}

async function carregarHorarios() {
    const data = elData.value;
    const div = document.getElementById('lista-horarios');
    if(!data) return;
    
    div.innerHTML = '<p style="grid-column:span 4; text-align:center">Buscando...</p>';
    horarioSelecionado = null;
    atualizarStatusBotao();

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

    div.innerHTML = "";
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
                atualizarStatusBotao();
            });
        }
        div.appendChild(btn);
    });
}

function atualizarStatusBotao() {
    const btn = document.getElementById('btn-finalizar');
    if(servicoSelecionado && horarioSelecionado && elData.value) {
        btn.classList.add('ativo');
        btn.style.opacity = '1';
    } else {
        btn.classList.remove('ativo');
        btn.style.opacity = '0.4';
    }
}

async function finalizarAgendamento() {
    const nome = document.getElementById('cliente-nome').value;
    const zap = document.getElementById('cliente-zap').value;
    const btn = document.getElementById('btn-confirma-agendamento');

    if(!nome || !zap) return alert("Preencha Nome e WhatsApp");

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
        
        modalCadastro.classList.remove('aberto');
        setTimeout(() => modalCadastro.style.display = 'none', 300);
        
        mostrarToast("✅ Agendamento Confirmado!");
        
        setTimeout(() => location.reload(), 2000);

    } catch(e) {
        console.error(e);
        alert("Erro: " + e.message);
        btn.innerText = "TENTAR NOVAMENTE";
        btn.disabled = false;
    }
}

function mostrarToast(msg) {
    const t = document.getElementById('toast-box');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

async function verMeusAgendamentos() {
    const zap = prompt("Confirme seu WhatsApp:");
    if(!zap) return;
    
    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("cliente_zap", "==", zap));
    const snap = await getDocs(q);
    
    if(snap.empty) return alert("Nenhum agendamento encontrado.");
    
    let texto = "Seus Agendamentos:\n";
    snap.forEach(d => {
        const a = d.data();
        texto += `\n📅 ${a.data} às ${a.horario}\n✂️ ${a.servico}\n`;
    });
    alert(texto);
}