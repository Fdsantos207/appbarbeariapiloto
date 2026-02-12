// js/admin.js - VERSÃO COMPLETA COM LOGIN E BLOQUEIO
import { db, ID_LOJA } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const SENHA_MESTRA = "mestre123";

window.onload = function() {
    // 1. Carrega o visual primeiro
    carregarFundoLoja();

    // 2. Configura o botão de Login
    const btnLogin = document.getElementById('btn-entrar-painel');
    if(btnLogin) btnLogin.onclick = fazerLogin;

    // 3. Configura Menu e Navegação
    document.getElementById('btn-abrir-menu-admin').onclick = toggleMenu;
    document.getElementById('overlay').onclick = toggleMenu;
    
    ['agenda', 'financeiro', 'config', 'senha'].forEach(m => {
        const el = document.getElementById(`menu-${m}`);
        if(el) el.onclick = () => mudarTela(m);
    });
    
    // 4. Configura Ações da Agenda e Configurações
    document.getElementById('filtro-data').onchange = carregarAgenda;
    document.getElementById('btn-bloquear-modal').onclick = bloquearHorario;
    document.getElementById('btn-add-servico').onclick = () => adicionarCampoServico();
    document.getElementById('btn-salvar-conf').onclick = salvarConfiguracoes;
    document.getElementById('btn-salvar-senha').onclick = salvarNovaSenha;

    // 5. Verifica se já está logado
    if(sessionStorage.getItem("logado_loja_" + ID_LOJA) === "sim") {
        document.getElementById('modal-login').style.display = 'none';
        iniciarPainel();
    }
};

// --- FUNÇÃO DE LOGIN (CORRIGIDA) ---
async function fazerLogin() {
    const inputSenha = document.getElementById('input-senha-login');
    const btn = document.getElementById('btn-entrar-painel');
    const senhaDigitada = inputSenha.value.trim();
    
    if(!senhaDigitada) return alert("Por favor, digite a senha.");
    
    btn.innerText = "VERIFICANDO...";
    btn.disabled = true;
    
    try {
        const docRef = doc(db, "lojas", ID_LOJA); // Busca na coleção lojas (minúsculo)
        const docSnap = await getDoc(docRef);
        
        if(docSnap.exists()) {
            const dados = docSnap.data();
            const senhaBanco = String(dados.senhaAdmin || "").trim();
            
            if (senhaDigitada === senhaBanco || senhaDigitada === SENHA_MESTRA) {
                document.getElementById('modal-login').style.display = 'none';
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                iniciarPainel();
            } else {
                alert("Senha incorreta!");
                btn.innerText = "ENTRAR";
                btn.disabled = false;
            }
        } else {
            alert("Erro: Loja não encontrada no sistema.");
            btn.innerText = "ENTRAR";
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão: " + e.message);
        btn.innerText = "ENTRAR";
        btn.disabled = false;
    }
}

// --- FUNÇÃO PARA BLOQUEAR HORÁRIO ---
async function bloquearHorario() {
    const data = document.getElementById('filtro-data').value;
    if(!data) return alert("Selecione uma data primeiro!");

    const hora = prompt("Qual horário deseja bloquear? (Exemplo: 14:30)");
    if(!hora) return;

    try {
        await addDoc(collection(db, "lojas", ID_LOJA, "agendamentos"), {
            data: data,
            horario: hora,
            cliente_nome: "🚫 BLOQUEADO",
            cliente_zap: "00000000000",
            servico: "BLOQUEIO ADMINISTRATIVO",
            preco: "R$ 0,00",
            tipo: "bloqueio"
        });
        alert("Horário bloqueado! Agora ele aparecerá como ocupado para os clientes.");
        carregarAgenda();
    } catch(e) { alert("Erro ao bloquear: " + e.message); }
}

function iniciarPainel() {
    carregarAgenda(); 
    carregarFinanceiro(); 
    carregarConfiguracoesAdmin();
}

async function carregarFundoLoja() {
    try {
        const snap = await getDoc(doc(db, "lojas", ID_LOJA));
        if(snap.exists() && snap.data().fotoFundo) {
            document.documentElement.style.setProperty('--bg-loja', `url('${snap.data().fotoFundo}')`);
        }
    } catch(e) { console.log("Erro ao carregar fundo:", e); }
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('aberto');
    document.getElementById('overlay').classList.toggle('aberto');
}

function mudarTela(tela) {
    document.querySelectorAll('.conteudo-tela').forEach(e => e.style.display = 'none');
    document.getElementById(`tela-${tela}`).style.display = 'block';
    
    // Estilo do menu ativo
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('ativo'));
    document.getElementById(`menu-${tela}`).classList.add('ativo');
    
    toggleMenu();
    if(tela === 'financeiro') carregarFinanceiro();
}

async function carregarAgenda() {
    const inputData = document.getElementById('filtro-data');
    const data = inputData.value || new Date().toISOString().split("T")[0];
    inputData.value = data;
    
    const container = document.getElementById('container-lista');
    container.innerHTML = '<p style="text-align:center; padding:20px;">Buscando agendamentos...</p>';

    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("data", "==", data));
    const snapshot = await getDocs(q);
    
    let lista = [];
    snapshot.forEach(doc => { lista.push({ id: doc.id, ...doc.data() }); });
    lista.sort((a, b) => a.horario.localeCompare(b.horario));
    
    if(lista.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:#555">Nenhum horário ocupado para este dia.</p>';
        return;
    }

    let html = ""; 
    lista.forEach(item => {
        const isBloqueio = item.tipo === "bloqueio";
        const zapLink = item.cliente_zap.replace(/\D/g, ''); 
        
        html += `
            <div class="card-cliente" style="${isBloqueio ? 'border-left-color: #555;' : ''}">
                <div style="flex:1;">
                    <span style="font-size:1.1rem; font-weight:bold; color:white; margin-right:10px">${item.horario}</span>
                    <span style="color:${isBloqueio ? '#888' : 'white'}; font-weight:600;">${item.cliente_nome}</span> <br>
                    <small style="color:#666">${item.servico}</small>
                </div>
                <div style="display:flex; gap:10px;">
                    ${!isBloqueio ? `<a href="https://wa.me/55${zapLink}" target="_blank" style="background:#25D366; color:white; width:35px; height:35px; border-radius:50%; display:flex; align-items:center; justify-content:center; text-decoration:none;">📱</a>` : ''}
                    <button onclick="window.deletarAgendamento('${item.id}')" style="background:#d9534f; color:white; width:35px; height:35px; border:none; border-radius:50%; cursor:pointer;">🗑️</button>
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

window.deletarAgendamento = async function(id) {
    if(confirm("Deseja remover este item (Agendamento ou Bloqueio)?")) {
        try {
            await deleteDoc(doc(db, "lojas", ID_LOJA, "agendamentos", id));
            carregarAgenda();
            carregarFinanceiro();
        } catch(e) { alert("Erro ao excluir."); }
    }
};

async function carregarFinanceiro() {
    const snapshot = await getDocs(collection(db, "lojas", ID_LOJA, "agendamentos"));
    let totalMes = 0; let totalHoje = 0; let qtdMes = 0;
    const hoje = new Date().toISOString().split("T")[0]; 
    const mesAtual = hoje.slice(0, 7);
    
    snapshot.forEach(doc => {
        const item = doc.data();
        if(item.tipo === "bloqueio") return; // Ignora bloqueios no financeiro
        
        let valor = parseFloat(String(item.preco || "0").replace('R$', '').replace('.', '').replace(',', '.').trim());
        if (isNaN(valor)) valor = 0;
        
        if (item.data.startsWith(mesAtual)) { 
            totalMes += valor; 
            qtdMes++; 
            if (item.data === hoje) totalHoje += valor; 
        }
    });
    document.getElementById('fin-mes').innerText = totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('fin-hoje').innerText = totalHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('fin-qtd').innerText = qtdMes;
}

async function carregarConfiguracoesAdmin() {
    const docSnap = await getDoc(doc(db, "lojas", ID_LOJA));
    if (docSnap.exists()) {
        const dados = docSnap.data();
        document.getElementById('conf-nome').value = dados.nome || ""; 
        document.getElementById('conf-inicio').value = dados.horarioInicio;
        document.getElementById('conf-fim').value = dados.horarioFim;
        document.getElementById('conf-intervalo').value = dados.intervaloMinutos;
        const containerServ = document.getElementById('lista-servicos-inputs');
        containerServ.innerHTML = '';
        if (dados.servicos) dados.servicos.forEach(serv => adicionarCampoServico(serv.nome, serv.preco));
    }
}

function adicionarCampoServico(nome="", preco="") {
    const div = document.createElement('div');
    div.className = 'item-servico';
    div.innerHTML = `<input type="text" placeholder="Serviço" value="${nome}" class="serv-nome" style="flex:1"><input type="text" placeholder="R$ 0,00" value="${preco}" class="serv-preco" style="width:100px"><button class="btn-remove">X</button>`;
    div.querySelector('.btn-remove').onclick = () => div.remove();
    document.getElementById('lista-servicos-inputs').appendChild(div);
}

async function salvarConfiguracoes() {
    const btn = document.getElementById('btn-salvar-conf');
    btn.innerText = "SALVANDO...";
    let servicos = [];
    document.querySelectorAll('#lista-servicos-inputs > div').forEach((item, index) => {
        const n = item.querySelector('.serv-nome').value;
        const p = item.querySelector('.serv-preco').value;
        if(n && p) servicos.push({ id: index, nome: n, preco: p });
    });
    
    try {
        await setDoc(doc(db, "lojas", ID_LOJA), { 
            nome: document.getElementById('conf-nome').value, 
            horarioInicio: Number(document.getElementById('conf-inicio').value), 
            horarioFim: Number(document.getElementById('conf-fim').value), 
            intervaloMinutos: Number(document.getElementById('conf-intervalo').value), 
            servicos: servicos 
        }, { merge: true });
        alert("Configurações atualizadas com sucesso!");
    } catch (e) { alert("Erro ao salvar."); }
    btn.innerText = "SALVAR TUDO";
}

async function salvarNovaSenha() {
    const novaSenha = document.getElementById('nova-senha').value.trim();
    if(!novaSenha) return alert("Digite a nova senha.");
    if(confirm("Deseja realmente alterar sua senha de acesso?")) {
        try { 
            await setDoc(doc(db, "lojas", ID_LOJA), { senhaAdmin: novaSenha }, { merge: true }); 
            alert("Senha alterada com sucesso!"); 
            document.getElementById('nova-senha').value = ""; 
        } catch (e) { alert("Erro ao mudar senha."); }
    }
}