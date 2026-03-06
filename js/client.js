import { db, ID_LOJA } from "./config.js";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- VARIÁVEIS DE CONTROLE ---
let servicoSelecionado = null;
let horarioSelecionado = null;
let LOJA_CONFIG = null;
let categoriaAtual = "servico"; 
let gatilhoInstalacao = null; // Para o botão de instalar

// --- ATIVAÇÃO DO SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('PWA ativado!', reg.scope))
            .catch(err => console.log('Erro PWA:', err));
    });
}

// Escuta o evento de instalação para mostrar o seu botão dourado
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    gatilhoInstalacao = e;
    const container = document.getElementById('container-instalacao');
    if (container) container.style.display = 'block';
});

window.onload = async function() {
    try {
        const docSnap = await getDoc(doc(db, "lojas", ID_LOJA)); 
        if (docSnap.exists()) {
            LOJA_CONFIG = docSnap.data();
            
            // --- LOGOMARCA OU TEXTO ---
            const elTexto = document.getElementById('nome-barbearia');
            const elLogo = document.getElementById('img-logo-barbearia');
            if (LOJA_CONFIG.logoUrl) {
                elLogo.src = LOJA_CONFIG.logoUrl;
                elLogo.style.display = 'block';
                elTexto.style.display = 'none';
            } else {
                elTexto.innerText = LOJA_CONFIG.nome;
            }

            // --- CONFIGURAÇÃO DO GPS ---
            if (LOJA_CONFIG.endereco) {
                const btnGPS = document.getElementById('btn-como-chegar');
                btnGPS.style.display = 'block';
                btnGPS.onclick = (e) => {
                    e.preventDefault();
                    const endereco = encodeURIComponent(LOJA_CONFIG.endereco);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${endereco}`, '_blank');
                };
            }
            
            renderizarServicos();
            
            const elData = document.getElementById('data-agendamento');
            elData.min = new Date().toISOString().split("T")[0];
            elData.addEventListener('change', carregarHorarios);
        } else {
            alert("Erro: Loja não encontrada.");
        }
    } catch (e) { console.error("Erro ao carregar:", e); }
    
    configurarCliques();
};

function configurarCliques() {
    // Menu lateral
    document.getElementById('btn-abrir-menu').onclick = toggleMenu;
    document.getElementById('btn-fechar-menu').onclick = toggleMenu;
    document.getElementById('overlay').onclick = toggleMenu;

    // Abas
    document.getElementById('tab-servicos').onclick = () => alternarCategoria("servico");
    document.getElementById('tab-combos').onclick = () => alternarCategoria("combo");

    // Instalação do App
    const btnInstalar = document.getElementById('btn-instalar-app');
    if (btnInstalar) {
        btnInstalar.onclick = async () => {
            if (!gatilhoInstalacao) return;
            gatilhoInstalacao.prompt();
            const { outcome } = await gatilhoInstalacao.userChoice;
            if (outcome === 'accepted') document.getElementById('container-instalacao').style.display = 'none';
            gatilhoInstalacao = null;
        };
    }

    // Finalização
    document.getElementById('btn-meus-agendamentos').onclick = (e) => { e.preventDefault(); toggleMenu(); verMeusAgendamentos(); };
    document.getElementById('btn-finalizar').onclick = () => {
        if(servicoSelecionado && horarioSelecionado) document.getElementById('modal-cadastro').classList.add('aberto');
        else alert("Selecione serviço e horário!");
    };
    document.getElementById('btn-cancelar-cadastro').onclick = () => document.getElementById('modal-cadastro').classList.remove('aberto');
    document.getElementById('btn-confirma-agendamento').onclick = finalizarAgendamento;
}

function alternarCategoria(novaCategoria) {
    categoriaAtual = novaCategoria;
    document.getElementById('tab-servicos').classList.toggle('ativo', novaCategoria === "servico");
    document.getElementById('tab-combos').classList.toggle('ativo', novaCategoria === "combo");
    servicoSelecionado = null;
    document.getElementById('btn-finalizar').classList.remove('ativo');
    renderizarServicos(); 
}

function renderizarServicos() {
    const div = document.getElementById('lista-servicos');
    div.innerHTML = "";
    if(!LOJA_CONFIG.servicos) return;

    const itensFiltrados = LOJA_CONFIG.servicos.filter(s => {
        return s.categoria === categoriaAtual || (!s.categoria && categoriaAtual === "servico");
    });

    if(itensFiltrados.length === 0) {
        div.innerHTML = `<p style="text-align:center; color:#555; padding:20px;">Nenhum item nesta categoria.</p>`;
        return;
    }

    itensFiltrados.forEach(serv => {
        const el = document.createElement('div');
        el.className = 'servico-card';
        const icone = categoriaAtual === "combo" ? "🔥 " : "✂️ ";
        el.innerHTML = `
            <div>
                <h3>${icone}${serv.nome}</h3>
                ${categoriaAtual === "combo" ? '<span class="badge-combo">ECONOMIZE</span>' : ''}
            </div>
            <p>${serv.preco}</p>
        `;
        el.onclick = () => {
            document.querySelectorAll('.servico-card').forEach(c => c.classList.remove('selecionado'));
            el.classList.add('selecionado');
            servicoSelecionado = serv;
            atualizarBotao();
        };
        div.appendChild(el);
    });
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('aberto');
    document.getElementById('overlay').classList.toggle('aberto');
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
    if(servicoSelecionado && horarioSelecionado) document.getElementById('btn-finalizar').classList.add('ativo');
}

async function finalizarAgendamento() {
    const nome = document.getElementById('cliente-nome').value;
    const zap = document.getElementById('cliente-zap').value;
    if(!nome || !zap) return alert("Preencha seu nome e zap!");
    
    // --- LÓGICA DE WHATSAPP (CONFIRMAÇÃO) ---
    const msg = `Olá! Acabei de agendar:\n✂️ ${servicoSelecionado.nome}\n📅 ${document.getElementById('data-agendamento').value}\n⏰ ${horarioSelecionado}`;
    const zapLink = `https://wa.me/55${zap}?text=${encodeURIComponent(msg)}`;

    await addDoc(collection(db, "lojas", ID_LOJA, "agendamentos"), {
        cliente_nome: nome, cliente_zap: zap, data: document.getElementById('data-agendamento').value,
        horario: horarioSelecionado, servico: servicoSelecionado.nome, preco: servicoSelecionado.preco
    });
    
    alert("Agendado com sucesso! ✅ Redirecionando para o WhatsApp...");
    window.open(zapLink, '_blank');
    location.reload();
}

async function verMeusAgendamentos() {
    const zap = prompt("Confirme seu WhatsApp:");
    if(!zap) return;
    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("cliente_zap", "==", zap));
    const snap = await getDocs(q);
    if(snap.empty) return alert("Nenhum agendamento encontrado.");
    let texto = "Seus Agendamentos:\n";
    snap.forEach(d => { const a = d.data(); texto += `\n📅 ${a.data} às ${a.horario}\n✂️ ${a.servico}\n`; });
    alert(texto);
}