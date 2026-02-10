// js/config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- SUAS CHAVES ---
const firebaseConfig = {
  apiKey: "AIzaSyCEAeMxXbX047DhHYyAI-r4I_4eqlGA4W0",
  authDomain: "appbarbeariapiloto.firebaseapp.com",
  projectId: "appbarbeariapiloto",
  storageBucket: "appbarbeariapiloto.firebasestorage.app",
  messagingSenderId: "132643765315",
  appId: "1:132643765315:web:60568343cecfa5720268f6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- A MÁGICA DO MULTI-LOJAS ---

// 1. Tenta pegar o ID da URL (ex: site.com?loja=barbearia_ze)
const urlParams = new URLSearchParams(window.location.search);
let lojaUrl = urlParams.get('loja');

// 2. Se não tiver na URL, tenta pegar da memória do navegador (se o cliente já entrou antes)
if (!lojaUrl) {
    lojaUrl = localStorage.getItem('loja_ativa');
}

// 3. Se achou uma loja, salva na memória para não perder se ele atualizar a página
if (lojaUrl) {
    localStorage.setItem('loja_ativa', lojaUrl);
} else {
    // 4. Se não achou NADA (é a primeira vez e sem link), usa uma loja padrão ou avisa erro
    // Sugestão: Deixe 'barbearia_central_01' como fallback ou redirecione para uma página de erro
    lojaUrl = "barbearia_central_01"; 
    // console.warn("Nenhuma loja especificada. Usando padrão.");
}

const ID_LOJA = lojaUrl;

// Exporta
export { db, ID_LOJA };