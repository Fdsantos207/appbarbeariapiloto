// No js/client.js, substitua APENAS a função renderizarServicos por esta:

function renderizarServicos() {
    const div = document.getElementById('lista-servicos');
    div.innerHTML = "";
    if(!LOJA_CONFIG.servicos) return;

    // Ícone SVG de Tesoura/Máquina (Pode trocar por outro se quiser)
    const iconeSVG = `<svg class="servico-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.65 6.5L17.5 4.35C17.3 4.15 17 4.15 16.8 4.35L14.65 6.5C14.45 6.7 14.45 7 14.65 7.2L16.8 9.35C17 9.55 17.3 9.55 17.5 9.35L19.65 7.2C19.85 7 19.85 6.7 19.65 6.5ZM18.6 8.3L17.5 9.4L15.75 7.65L16.85 6.55L18.6 8.3ZM13 9H3V11H13V9ZM3 17H13V15H3V17ZM21 13H3V15H21V13ZM21 17H15V19H21V17ZM3 21H13V19H3V21ZM21 9H15V11H21V9ZM21 5H3V7H21V5Z"/></svg>`;

    LOJA_CONFIG.servicos.forEach(serv => {
        const el = document.createElement('div');
        el.className = 'servico-card';
        // Usando o ícone SVG aqui
        el.innerHTML = `<div><h3>${serv.nome}</h3><p>${serv.preco}</p></div><div>${iconeSVG}</div>`;
        
        el.addEventListener('click', () => {
            document.querySelectorAll('.servico-card').forEach(e => e.classList.remove('selecionado'));
            el.classList.add('selecionado');
            servicoSelecionado = serv;
            atualizarStatusBotao();
        });
        div.appendChild(el);
    });
}