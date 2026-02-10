// js/config.js
// Importa as ferramentas do Firebase que vamos usar
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- ÁREA DE CONFIGURAÇÃO (COLE SUAS CHAVES REAIS AQUI) ---
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

// ID da Loja (Usado para identificar sua barbearia no banco de dados)
const ID_LOJA = "novo_stylo";

// Exporta o banco de dados (db) e o ID para os outros arquivos usarem
export { db, ID_LOJA };