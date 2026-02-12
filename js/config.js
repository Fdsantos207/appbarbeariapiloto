// js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- COLOQUE SUAS CHAVES DO FIREBASE AQUI ---
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

// Lógica para pegar o ID da Loja
const params = new URLSearchParams(window.location.search);
let lojaId = params.get('loja');

// Imagem Padrão (Caso a barbearia não tenha foto)
const IMAGEM_PADRAO = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=1080&auto=format&fit=crop";

if (!lojaId) {
    lojaId = localStorage.getItem('ultimo_id_loja');
} else {
    localStorage.setItem('ultimo_id_loja', lojaId);
}

const ID_LOJA = lojaId;

export { db, ID_LOJA, IMAGEM_PADRAO };