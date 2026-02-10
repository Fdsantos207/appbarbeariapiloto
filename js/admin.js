// js/admin.js

import { db, ID_LOJA } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const configRef = doc(db, "lojas", ID_LOJA);

// --- 1. LOGIN ---
window.fazerLogin = async function() {
    const senhaDigitada = document.getElementById('input-senha-login').value;
    const btn = document.querySelector('#modal-login button');
    
    if(!senhaDigitada) return alert("Digite a senha.");
    btn.innerText = "Verificando...";
    
    try {
        const docSnap = await getDoc(configRef);
        if(docSnap.exists()) {
            const dados = docSnap.data();
            if (dados.senhaAdmin === senhaDigitada) {
                document.getElementById('modal-login').style.display = 'none';
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                carregarAgenda();
                carregarConfiguracoesAdmin();
            } else {
                alert("Senha incorreta!");
            }
        } else {
            alert("Loja não encontrada.");
        }
    } catch (e) {
        alert("Erro ao conectar: " + e.message);
    }
    btn.innerText = "ENTRAR";
}

if(sessionStorage.getItem("logado_loja_" + ID_LOJA) === "sim") {
    document.getElementById('modal-login').style.display = 'none';
    carregarAgenda();
    carregarConfiguracoesAdmin();
}

// --- 2. AGENDA ---
const inputData = document.getElementById('filtro-data');
inputData.value = new Date().toISOString().split("T")[0];
inputData.addEventListener('change', () => carregarAgenda());

async function carregarAgenda() {
    const data = inputData.value;
    const container = document.getElementById('container-lista');
    container.innerHTML = '<p style="text-align:center">Buscando...</p>';

    const agendamentosRef = collection(db, "lojas", ID_LOJA, "agendamentos");
    const q = query(agendamentosRef, where("data", "==", data));
    
    const snapshot = await getDocs(q);
    let html = "";
    let lista = [];
    snapshot.forEach(doc => lista.push(doc.data()));
    lista.sort((a, b) => a.horario.localeCompare(b.horario));
    
    if(lista.length === 0) container.innerHTML = '<p style="text-align:center; padding:20px; color:#555">Sem cortes hoje.</p>';
    
    lista.forEach(item => {
        const zapLink = item.cliente_zap.replace(/\D/g, ''); 
        html += `
            <div class="card-cliente">
                <div>
                    <span style="font-size:1.2rem; font-weight:bold; margin-right:10px">${item.horario}</span>
                    <span>${item.cliente_nome}</span> <br>
                    <small style="color:#888">${item.servico}</small>
                </div>
                <a href="https://wa.me/55${zapLink}" target="_blank" class="btn-zap">📱</a>
            </div>`;
    });
    if(html) container.innerHTML = html;
    document.getElementById('resumo-dia').innerText = `${lista.length} Clientes Hoje`;
}

// --- 3. FINANCEIRO (NOVO) ---
window.carregarFinanceiro = async function() {
    // Busca TODOS os agendamentos da loja (ideal seria filtrar por mês no banco, mas faremos no front pra simplificar)
    const agendamentosRef = collection(db, "lojas", ID_LOJA, "agendamentos");
    const snapshot = await getDocs(agendamentosRef);
    
    let totalMes = 0;
    let totalHoje = 0;
    let qtdMes = 0;
    
    const hoje = new Date().toISOString().split("T")[0]; // "2023-10-25"
    const mesAtual = hoje.slice(0, 7); // "2023-10"

    // Busca tabela de preços atual pra referência
    let precosMap = {};
    const configSnap = await getDoc(configRef);
    if(configSnap.exists()) {
        configSnap.data().servicos.forEach(s => {
            // Tenta limpar o preço pra numero: "R$ 35,00" -> 35.00
            let valorNumerico = parseFloat(s.preco.replace('R$', '').replace(',', '.').trim());
            if(!isNaN(valorNumerico)) precosMap[s.nome] = valorNumerico;
        });
    }

    snapshot.forEach(doc => {
        const item = doc.data();
        
        // Tenta descobrir o preço desse corte
        // 1. Se salvou o preço no agendamento (ideal), usa ele. 
        // 2. Se não, tenta achar pelo nome na tabela atual.
        let valor = precosMap[item.servico] || 0; 

        // Se o agendamento é deste mês
        if (item.data.startsWith(mesAtual)) {
            totalMes += valor;
            qtdMes++;
            
            // Se também é de hoje
            if (item.data === hoje) {
                totalHoje += valor;
            }
        }
    });

    // Atualiza na tela
    document.getElementById('fin-mes').innerText = totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('fin-hoje').innerText = totalHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('fin-qtd').innerText = qtdMes;
}


// --- 4. CONFIGURAÇÕES E SENHA ---
async function carregarConfiguracoesAdmin() {
    const docSnap = await getDoc(configRef);
    if (docSnap.exists()) {
        const dados = docSnap.data();
        document.getElementById('conf-nome').value = dados.nome || ""; 
        document.getElementById('conf-inicio').value = dados.horarioInicio;
        document.getElementById('conf-fim').value = dados.horarioFim;
        document.getElementById('conf-intervalo').value = dados.intervaloMinutos;
        
        const containerServ = document.getElementById('lista-servicos-inputs');
        containerServ.innerHTML = '';
        if (dados.servicos) {
            dados.servicos.forEach(serv => adicionarCampoServico(serv.nome, serv.preco));
        }
    }
}

window.adicionarCampoServico = function(nome="", preco="") {
    const div = document.createElement('div');
    div.className = 'item-servico';
    div.innerHTML = `
        <input type="text" placeholder="Serviço" value="${nome}" class="serv-nome">
        <input type="text" placeholder="Valor" value="${preco}" class="serv-preco" style="width:80px">
        <button onclick="this.parentElement.remove()" style="background:#d9534f; border:none; color:white;">X</button>`;
    document.getElementById('lista-servicos-inputs').appendChild(div);
}

window.salvarConfiguracoes = async function() {
    const nome = document.getElementById('conf-nome').value;
    const inicio = Number(document.getElementById('conf-inicio').value);
    const fim = Number(document.getElementById('conf-fim').value);
    const intervalo = Number(document.getElementById('conf-intervalo').value);
    
    const servicosDOM = document.querySelectorAll('.item-servico');
    let servicos = [];
    servicosDOM.forEach((item, index) => {
        const n = item.querySelector('.serv-nome').value;
        const p = item.querySelector('.serv-preco').value;
        if(n && p) servicos.push({ id: index, nome: n, preco: p });
    });

    try {
        await setDoc(configRef, {
            nome: nome, horarioInicio: inicio, horarioFim: fim, intervaloMinutos: intervalo, servicos: servicos
        }, { merge: true });
        alert("Salvo com sucesso!");
    } catch (e) { alert("Erro: " + e.message); }
}

window.salvarNovaSenha = async function() {
    const novaSenha = document.getElementById('nova-senha').value;
    if(!novaSenha) return alert("Digite uma senha!");

    if(confirm("Tem certeza que deseja mudar a senha?")) {
        try {
            await setDoc(configRef, { senhaAdmin: novaSenha }, { merge: true });
            alert("Senha alterada!");
            document.getElementById('nova-senha').value = "";
        } catch (e) { alert("Erro: " + e.message); }
    }
}