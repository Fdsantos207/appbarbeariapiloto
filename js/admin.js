// js/admin.js - CORRIGIDO PARA LOGIN
import { db, ID_LOJA, IMAGEM_PADRAO } from "./config.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. LOGIN ROBUSTO ---
window.fazerLogin = async function() {
    const inputSenha = document.getElementById('input-senha-login');
    const btn = document.querySelector('button[onclick="fazerLogin()"]');
    
    // .trim() remove espaços acidentais antes e depois
    const senhaDigitada = inputSenha.value.trim(); 
    
    if(!senhaDigitada) return alert("Digite a senha.");
    
    btn.innerText = "Verificando...";
    btn.disabled = true;
    
    try {
        console.log("Tentando logar na loja ID:", ID_LOJA); // Para você conferir no F12

        const docRef = doc(db, "lojas", ID_LOJA);
        const docSnap = await getDoc(docRef);

        if(docSnap.exists()) {
            const dados = docSnap.data();

            // VERIFICA SE A SENHA BATE (Mostra no console para você debugar se precisar)
            console.log("Senha no Banco:", dados.senhaAdmin);
            console.log("Senha Digitada:", senhaDigitada);

            if (dados.senhaAdmin === senhaDigitada) {
                // SUCESSO!
                document.getElementById('modal-login').style.display = 'none';
                sessionStorage.setItem("logado_loja_" + ID_LOJA, "sim");
                
                // Carrega o resto do painel
                carregarAgenda();
                carregarFinanceiro(); // Carrega financeiro ao logar também
                carregarConfiguracoesAdmin();
                
                // Aplica fundo
                if(dados.fotoFundo) {
                    document.body.style.backgroundImage = `url('${dados.fotoFundo}')`;
                    document.body.style.backgroundSize = "cover";
                }

            } else {
                alert("Senha incorreta!");
                btn.innerText = "ENTRAR";
                btn.disabled = false;
            }
        } else {
            alert("Erro: Loja ID '" + ID_LOJA + "' não encontrada no banco.");
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

// --- 2. VERIFICA SE JÁ ESTAVA LOGADO ---
window.onload = function() {
    // Verifica se já tem o "sim" salvo para ESSA loja específica
    if(sessionStorage.getItem("logado_loja_" + ID_LOJA) === "sim") {
        document.getElementById('modal-login').style.display = 'none';
        carregarAgenda();
        carregarFinanceiro();
        carregarConfiguracoesAdmin();
        
        // Puxa o fundo mesmo já logado
        getDoc(doc(db, "lojas", ID_LOJA)).then(snap => {
            if(snap.exists() && snap.data().fotoFundo) {
                document.body.style.backgroundImage = `url('${snap.data().fotoFundo}')`;
                document.body.style.backgroundSize = "cover";
            }
        });
    }
}


// --- 3. DEMAIS FUNÇÕES (Agenda, Financeiro, Config) ---

// AGENDA
window.carregarAgenda = async function() {
    const inputData = document.getElementById('filtro-data');
    // Se não tiver data selecionada, pega hoje
    const data = inputData.value || new Date().toISOString().split("T")[0];
    inputData.value = data; // Garante que o input mostre a data

    const container = document.getElementById('container-lista');
    container.innerHTML = '<p style="text-align:center">Buscando...</p>';

    const q = query(collection(db, "lojas", ID_LOJA, "agendamentos"), where("data", "==", data));
    const snapshot = await getDocs(q);
    
    let html = "";
    let lista = [];
    snapshot.forEach(doc => lista.push(doc.data()));
    
    // Ordena por horário
    lista.sort((a, b) => a.horario.localeCompare(b.horario));
    
    if(lista.length === 0) container.innerHTML = '<p style="text-align:center; padding:20px; color:#555">Sem cortes hoje.</p>';
    
    lista.forEach(item => {
        const zapLink = item.cliente_zap.replace(/\D/g, ''); 
        html += `
            <div class="card-cliente"> <div style="background:#222; padding:15px; margin-bottom:10px; border-radius:8px; border-left:4px solid #D4AF37; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span style="font-size:1.2rem; font-weight:bold; color:white; margin-right:10px">${item.horario}</span>
                        <span style="color:white;">${item.cliente_nome}</span> <br>
                        <small style="color:#888">${item.servico} - ${item.preco}</small>
                    </div>
                    <a href="https://wa.me/55${zapLink}" target="_blank" style="background:#25D366; color:white; padding:8px 12px; border-radius:50%; text-decoration:none;">📱</a>
                </div>
            </div>`;
    });
    if(html) container.innerHTML = html;
    
    // Atualiza resumo do dia (se existir o elemento)
    const resumo = document.getElementById('resumo-dia');
    if(resumo) resumo.innerText = `${lista.length} Clientes Hoje`;
}

// O input de data precisa recarregar a agenda quando mudar
document.getElementById('filtro-data').addEventListener('change', window.carregarAgenda);


// FINANCEIRO
window.carregarFinanceiro = async function() {
    const snapshot = await getDocs(collection(db, "lojas", ID_LOJA, "agendamentos"));
    let totalMes = 0; 
    let totalHoje = 0; 
    let qtdMes = 0;
    
    const hoje = new Date().toISOString().split("T")[0];
    const mesAtual = hoje.slice(0, 7); // Ex: "2023-10"

    // Busca configurações para saber o preço "real" (caso tenha mudado)
    // Mas para simplificar, vamos tentar pegar o preço salvo no agendamento primeiro
    // Se o preço foi salvo como "R$ 35,00", precisamos limpar pra somar.

    snapshot.forEach(doc => {
        const item = doc.data();
        
        // Limpa o valor para virar numero (tira R$, tira espaço, troca virgula por ponto)
        let valorString = item.preco || "0";
        let valor = parseFloat(valorString.replace('R$', '').replace('.', '').replace(',', '.').trim());
        
        if (isNaN(valor)) valor = 0;

        // Verifica Mês
        if (item.data.startsWith(mesAtual)) {
            totalMes += valor; 
            qtdMes++;
            
            // Verifica Hoje
            if (item.data === hoje) {
                totalHoje += valor;
            }
        }
    });

    if(document.getElementById('fin-mes')) document.getElementById('fin-mes').innerText = totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if(document.getElementById('fin-hoje')) document.getElementById('fin-hoje').innerText = totalHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if(document.getElementById('fin-qtd')) document.getElementById('fin-qtd').innerText = qtdMes;
}


// CONFIGURAÇÕES
window.carregarConfiguracoesAdmin = async function() {
    const docSnap = await getDoc(doc(db, "lojas", ID_LOJA));
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
    div.className = 'item-servico'; // Garanta que tem CSS pra isso ou use style inline
    div.style.cssText = "display:flex; gap:10px; margin-bottom:10px;";
    
    div.innerHTML = `
        <input type="text" placeholder="Serviço" value="${nome}" class="serv-nome" style="flex:1">
        <input type="text" placeholder="Valor" value="${preco}" class="serv-preco" style="width:80px">
        <button onclick="this.parentElement.remove()" style="background:#da3633; border:none; color:white; border-radius:5px; cursor:pointer;">X</button>`;
    document.getElementById('lista-servicos-inputs').appendChild(div);
}

window.salvarConfiguracoes = async function() {
    const nome = document.getElementById('conf-nome').value;
    const inicio = Number(document.getElementById('conf-inicio').value);
    const fim = Number(document.getElementById('conf-fim').value);
    const intervalo = Number(document.getElementById('conf-intervalo').value);
    
    const servicosDOM = document.querySelectorAll('#lista-servicos-inputs > div');
    let servicos = [];
    servicosDOM.forEach((item, index) => {
        const n = item.querySelector('.serv-nome').value;
        const p = item.querySelector('.serv-preco').value;
        if(n && p) servicos.push({ id: index, nome: n, preco: p });
    });

    try {
        await setDoc(doc(db, "lojas", ID_LOJA), {
            nome: nome, horarioInicio: inicio, horarioFim: fim, intervaloMinutos: intervalo, servicos: servicos
        }, { merge: true });
        alert("Configurações Salvas!");
    } catch (e) { alert("Erro: " + e.message); }
}

window.salvarNovaSenha = async function() {
    const novaSenha = document.getElementById('nova-senha').value;
    if(!novaSenha) return alert("Digite uma senha!");

    if(confirm("Tem certeza que deseja mudar a senha?")) {
        try {
            await setDoc(doc(db, "lojas", ID_LOJA), { senhaAdmin: novaSenha }, { merge: true });
            alert("Senha alterada! Use a nova senha no próximo login.");
            document.getElementById('nova-senha').value = "";
        } catch (e) { alert("Erro: " + e.message); }
    }
}