// js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- COLOQUE SUAS CHAVES AQUI ---
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

// --- LÓGICA DO ID (CORRIGIDA) ---
const params = new URLSearchParams(window.location.search);
let lojaId = params.get('loja');

// SE NÃO TIVER ID NO LINK, USA ESSE PADRÃO (Mude 'barbearia' pelo ID que você criou no Painel Dev)
if (!lojaId) {
    lojaId = localStorage.getItem('ultimo_id_loja') || "barbearia"; 
    
    // Opcional: Força atualizar a URL para ficar bonitinho
    if(!window.location.search.includes('loja=')) {
        const novaUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?loja=' + lojaId;
        window.history.replaceState({path: novaUrl}, '', novaUrl);
    }
} else {
    localStorage.setItem('ultimo_id_loja', lojaId);
}

const ID_LOJA = lojaId;

const IMAGEM_PADRAO = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1080&auto=format&fit=crop";

export { db, ID_LOJA, IMAGEM_PADRAO };