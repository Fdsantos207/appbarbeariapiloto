// js/config.js
// VERSÃO FINAL: Multi-Lojas + Memória

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- ÁREA DE CONFIGURAÇÃO (COLE SUAS CHAVES REAIS AQUI) ---
// Apague este bloco de exemplo e coloque o seu verdadeiro!
const firebaseConfig = {
  apiKey: "AIzaSyCEAeMxXbX047DhHYyAI-r4I_4eqlGA4W0",
  authDomain: "appbarbeariapiloto.firebaseapp.com",
  projectId: "appbarbeariapiloto",
  storageBucket: "appbarbeariapiloto.firebasestorage.app",
  messagingSenderId: "132643765315",
  appId: "1:132643765315:web:60568343cecfa5720268f6"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- LÓGICA INTELIGENTE DE LOJAS ---

// 1. Tenta pegar o ID da URL (ex: site.com?loja=barbearia_do_ze)
const urlParams = new URLSearchParams(window.location.search);
let lojaId = urlParams.get('loja');

// 2. SISTEMA DE MEMÓRIA (LocalStorage)
// Se veio um ID novo na URL, salvamos ele na memória do celular
if (lojaId) {
    localStorage.setItem('barbearia_id_ativa', lojaId);
} 
// Se NÃO veio ID na URL, tentamos lembrar qual foi a última usada
else {
    lojaId = localStorage.getItem('barbearia_id_ativa');
}

// 3. SEGURANÇA (Fallback)
// Se é a primeira vez e não tem link nenhum, usamos sua loja padrão
if (!lojaId) {
    lojaId = "barbearia_central_01"; // ID da sua loja modelo
}

// Define o ID final que será usado no site todo
const ID_LOJA = lojaId;

console.log("Conectado na loja:", ID_LOJA); 

// Exporta para os outros arquivos usarem
export { db, ID_LOJA };