// js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// SUAS CHAVES AQUI
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI", // <--- COLE SUA CHAVE
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- LÓGICA MULTI-LOJAS (O CÉREBRO) ---

// 1. Tenta pegar o ID da URL (ex: ?loja=barbearia_do_ze)
const urlParams = new URLSearchParams(window.location.search);
let lojaId = urlParams.get('loja');

// 2. SISTEMA DE MEMÓRIA (LocalStorage)
// Se veio um ID novo na URL, salvamos ele na memória para sempre
if (lojaId) {
    localStorage.setItem('barbearia_id_ativa', lojaId);
} 
// Se NÃO veio ID na URL, tentamos lembrar qual foi a última usada
else {
    lojaId = localStorage.getItem('barbearia_id_ativa');
}

// 3. FALLBACK (Segurança)
// Se é a primeira vez e não tem link, usamos uma loja de demonstração
if (!lojaId) {
    lojaId = "barbearia_central_01"; // ID da sua loja modelo
}

// Exporta o ID final para o resto do site usar
const ID_LOJA = lojaId;

console.log("Conectado na loja:", ID_LOJA); // Para você ver no console

export { db, ID_LOJA };