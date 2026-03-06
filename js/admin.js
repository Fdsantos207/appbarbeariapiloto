// js/admin.js - VERSÃO COMPLETA E ORGANIZADA
import { db, ID_LOJA } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const SENHA_MESTRA = "mestre123";

window.onload = function() {
    carregarFundoLoja();

    // LOGIN E ACESSO RÁPIDO
    document.getElementById('btn-entrar-painel').onclick = fazerLogin;
    
    // ATALHO SECRETO DEV (3 CLIQUES NO TÍTULO MENU)
    let contadorCliquesDev = 0;
    const tituloMenu = document.querySelector('.sidebar-header h3');
    if (tituloMenu) {
        tituloMenu.onclick = () => {
            contadorCliquesDev++;
            if (contadorCliquesDev === 3) {
                contadorCliquesDev = 0;
                const senhaMestreDigitada = prompt("🔐 MODO DEV: Digite a Senha Mestra");
                if (senhaMestreDigitada === SENHA_MESTRA) {
                    alert("Acesso Autorizado, Danilo!");
                    window.location.href = "dev.html";
                }
            }
            setTimeout(() => { contadorCliquesDev = 0; }, 2000);
        };
    }

    // NAVEGAÇÃO
    document.getElementById('btn-abrir-menu-admin').onclick = toggleMenu;
    document.getElementById('btn-fechar-menu').onclick = toggleMenu;
    document.getElementById('overlay').onclick = toggleMenu;
    
    ['agenda', 'financeiro', 'config', 'senha'].forEach(m => {
        const el = document.getElementById(`menu-${m}`);
        if(el) el.onclick = () => mudarTela(m);
    });
    
    // AÇÕES
    document.getElementById('filtro-data').onchange = carregarAgenda;
    document.getElementById('btn-bloquear-modal').onclick = bloquearHorario;
    document.getElementById('btn-add-servico').onclick = () => adicionarCampoServico();
    document.getElementById('btn-salvar-conf').onclick = salvarConfiguracoes;
    document.getElementById('btn-salvar-senha').onclick = salvarNovaSenha;
    document.getElementById('btn-atualizar-fin').onclick = carregarFinanceiro;

    // VERIFICA SESSÃO
    if(sessionStorage.getItem("logado_loja_" + ID_LOJA) === "sim") {
        document.getElementById('modal-login').style.display = 'none';
        iniciarPainel();
    }
};

// --- LOGIN ---
async function fazerLogin() {
    const inputSenha = document.getElementById('input-senha-login');
    const senhaDigitada = inputSenha.value.trim();
    if(!senhaDigitada) return alert("Digite a senha.");
    
    try {
        const docSnap = await getDoc(doc(db, "lojas", ID_LOJA));
        if(docSnap.exists()) {
            const senhaBanco = String(docSnap.data().senhaAdmin || "").trim();
            if (senhaDigitada === senhaBanco || senhaDigitada === SENHA_MESTRA) {
                document.getElementById('modal-login').style.display = 'none';
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                iniciarPainel();
            } else { alert("Senha incorreta!"); }
        }
    } catch (e) { alert("Erro de conexão."); }
}

// --- CONFIGURAÇÕES E SERVIÇOS ---
function adicionarCampoServico(nome="", preco="", categoria="servico") {
    const div = document.createElement('div');
    div.className = 'item-servico-config';
    div.style.cssText = "display: flex; gap: 8px; margin-bottom: 12px; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;";
    
    // Limpa o preço para mostrar apenas o número no input
    const precoLimpo = preco.replace(/[^\d,]/g, '').replace(',', '.');

    div.innerHTML = `
        <select class="serv-cat" style="width: 70px; background: #000; color: #D4AF37; border: 1px solid #333; border-radius: 5px; padding: 5px;">
            <option value="servico" ${categoria === 'servico' ? 'selected' : ''}>✂️</option>
            <option value="combo" ${categoria === 'combo' ? 'selected' : ''}>🔥</option>
        </select>
        <input type="text" placeholder="Serviço" value="${nome}" class="serv-nome" style="flex:1;">
        <div style="position: relative; width: 90px;">
            <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #D4AF37; font-size: 0.8rem;">R$</span>
            <input type="number" placeholder="20" value="${precoLimpo}" class="serv-preco" style="width: 100%; padding-left: 28px;">
        </div>
        <button class="btn-remove" style="background:#d9534f; border:none; color:white; padding: 10px; border-radius: 5px;">✕</button>
    `;
    div.querySelector('.btn-remove').onclick = () => div.remove();
    document.getElementById('lista-servicos-inputs').appendChild(div);
}

async function salvarConfiguracoes() {
    const btn = document.getElementById('btn-salvar-conf');
    btn.innerText = "SALVANDO...";
    
    let servicos = [];
    document.querySelectorAll('#lista-servicos-inputs > div').forEach((item) => {
        const n = item.querySelector('.serv-nome').value;
        const p = item.querySelector('.serv-preco').value;
        const c = item.querySelector('.serv-cat').value;
        
        if(n && p) {
            // FORMATAÇÃO AUTOMÁTICA PARA R$ 0,00
            const valorFormatado = parseFloat(p).toLocaleString('pt-br', { style: 'currency', currency: 'BRL' });
            servicos.push({ nome: n, preco: valorFormatado, categoria: c });
        }
    });
    
    try {
        await setDoc(doc(db, "lojas", ID_LOJA), { 
            nome: document.getElementById('conf-nome').value,
            endereco: document.getElementById('conf-endereco').value, //
            logoUrl: document.getElementById('conf-logo').value,
            horarioInicio: Number(document.getElementById('conf-inicio').value), 
            horarioFim: Number(document.getElementById('conf-fim').value), 
            intervaloMinutos: Number(document.getElementById('conf-intervalo').value), 
            servicos: servicos 
        }, { merge: true });
        alert("Configurações Salvas! ✅");
        location.reload();
    } catch (e) { alert("Erro ao salvar."); }
}

// --- AGENDA E FINANCEIRO ---
async function carregarAgenda() {
    const data = document.getElementById('filtro-data').value || new Date().toISOString().split("T")[0];
    document.getElementById('filtro-data').value = data;
    const container = document.getElementById('container-lista');
    container.innerHTML = '<p style="text-align:center;">Buscando...</p>';

    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("data", "==", data));
    const snap = await getDocs(q);
    let lista = [];
    snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
    lista.sort((a, b) => a.horario.localeCompare(b.horario));
    
    if(lista.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#555">Agenda livre.</p>';
        return;
    }

    container.innerHTML = lista.map(item => `
        <div class="card-cliente" style="${item.tipo === 'bloqueio' ? 'border-left-color: #555;' : ''}">
            <div style="flex:1;">
                <span style="font-weight:bold; color:#D4AF37;">${item.horario}</span> - 
                <span>${item.cliente_nome}</span><br>
                <small style="color:#666">${item.servico}</small>
            </div>
            <div style="display:flex; gap:8px;">
                ${item.tipo !== 'bloqueio' ? `<a href="https://wa.me/55${item.cliente_zap.replace(/\D/g,'')}" target="_blank" style="text-decoration:none;">📱</a>` : ''}
                <button onclick="window.deletarAgendamento('${item.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
            </div>
        </div>
    `).join('');
}

async function carregarFinanceiro() {
    const snap = await getDocs(collection(db, "lojas", ID_LOJA, "agendamentos"));
    let totalMes = 0, totalHoje = 0, qtdMes = 0;
    const hoje = new Date().toISOString().split("T")[0];
    const mes = hoje.slice(0, 7);

    snap.forEach(d => {
        const item = d.data();
        if(item.tipo === 'bloqueio') return;
        const valor = parseFloat(String(item.preco || "0").replace(/[^\d,]/g, '').replace(',', '.'));
        if(item.data.startsWith(mes)) {
            totalMes += valor;
            qtdMes++;
            if(item.data === hoje) totalHoje += valor;
        }
    });
    document.getElementById('fin-mes').innerText = totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('fin-hoje').innerText = totalHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('fin-qtd').innerText = qtdMes;
}

// --- UTILITÁRIOS ---
window.deletarAgendamento = async (id) => {
    if(confirm("Remover este item?")) {
        await deleteDoc(doc(db, "lojas", ID_LOJA, "agendamentos", id));
        carregarAgenda(); carregarFinanceiro();
    }
};

async function bloquearHorario() {
    const data = document.getElementById('filtro-data').value;
    const hora = prompt("Horário para bloquear (Ex: 15:00):");
    if(data && hora) {
        await addDoc(collection(db, "lojas", ID_LOJA, "agendamentos"), {
            data, horario: hora, cliente_nome: "🚫 BLOQUEADO", servico: "BLOQUEIO", preco: "0", tipo: "bloqueio"
        });
        carregarAgenda();
    }
}

function iniciarPainel() { carregarAgenda(); carregarFinanceiro(); carregarConfiguracoesAdmin(); }

async function carregarConfiguracoesAdmin() {
    const snap = await getDoc(doc(db, "lojas", ID_LOJA));
    if (snap.exists()) {
        const d = snap.data();
        document.getElementById('conf-nome').value = d.nome || "";
        document.getElementById('conf-endereco').value = d.endereco || "";
        document.getElementById('conf-logo').value = d.logoUrl || "";
        document.getElementById('conf-inicio').value = d.horarioInicio;
        document.getElementById('conf-fim').value = d.horarioFim;
        document.getElementById('conf-intervalo').value = d.intervaloMinutos;
        document.getElementById('lista-servicos-inputs').innerHTML = '';
        if(d.servicos) d.servicos.forEach(s => adicionarCampoServico(s.nome, s.preco, s.categoria));
    }
}

async function carregarFundoLoja() {
    const snap = await getDoc(doc(db, "lojas", ID_LOJA));
    if(snap.exists() && snap.data().fotoFundo) document.documentElement.style.setProperty('--bg-loja', `url('${snap.data().fotoFundo}')`);
}

function mudarTela(t) {
    document.querySelectorAll('.conteudo-tela').forEach(e => e.style.display = 'none');
    document.getElementById(`tela-${t}`).style.display = 'block';
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('ativo'));
    document.getElementById(`menu-${t}`).classList.add('ativo');
    toggleMenu();
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('aberto');
    document.getElementById('overlay').classList.toggle('aberto');
}

async function salvarNovaSenha() {
    const s = document.getElementById('nova-senha').value;
    if(s && confirm("Alterar senha?")) {
        await setDoc(doc(db, "lojas", ID_LOJA), { senhaAdmin: s }, { merge: true });
        alert("Senha atualizada!");
    }
}