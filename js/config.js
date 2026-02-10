// js/config.js
// Importa as ferramentas do Firebase que vamos usar
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- ÁREA DE CONFIGURAÇÃO (COLE SUAS CHAVES REAIS AQUI) ---
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ID da Loja (Usado para identificar sua barbearia no banco de dados)
const ID_LOJA = "barbearia_central_01";

// Exporta o banco de dados (db) e o ID para os outros arquivos usarem
export { db, ID_LOJA };