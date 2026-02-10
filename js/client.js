<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Barbearia</title>
    
    <meta name="theme-color" content="#121212">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-capable" content="yes">
    
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style-client.css">
</head>
<body>

    <div id="overlay-menu" class="overlay" onclick="toggleMenu()"></div>
    <div id="sidebar" class="sidebar">
        <div class="sidebar-header">
            <h3>Menu</h3>
            <button onclick="toggleMenu()">✕</button>
        </div>
        <nav>
            <a href="#" onclick="verMeusAgendamentos(); toggleMenu()">📜 Meus Agendamentos</a>
            <hr style="border:0; border-top:1px solid #333; margin:10px 0;">
            <a href="admin.html">💼 Área do Parceiro</a>
        </nav>
    </div>

    <header>
        <h1 id="nome-barbearia">Carregando...</h1>
        <div onclick="toggleMenu()" style="font-size:1.5rem; color:#D4AF37; cursor:pointer;">☰</div>
    </header>

    <div id="conteudo-principal" class="container">
        
        <div class="section-title">1. Escolha o serviço</div>
        <div id="lista-servicos">
            <p style="text-align:center; color:#666">Carregando serviços...</p>
        </div>

        <div class="section-title">2. Escolha a data</div>
        <input type="date" id="data-agendamento">

        <div class="section-title">3. Escolha o horário</div>
        <div id="grade-horarios" class="grade-horarios">
            <p style="grid-column: span 4; text-align:center; color:#666; font-size:0.9rem;">Selecione uma data acima</p>
        </div>
        
        <div style="height:100px;"></div>
    </div>

    <div class="fab-container">
        <button id="btn-finalizar" class="btn-agendar">💈 AGENDAR</button>
    </div>

    <div id="modal-agendamento" class="modal">
        <div class="modal-content">
            <h3 style="color:#D4AF37; margin-bottom:15px">Finalizar Agendamento</h3>
            
            <input type="text" id="cliente-nome" placeholder="Seu Nome Completo" autocomplete="off">
            <input type="tel" id="cliente-zap" placeholder="Seu WhatsApp (DDD + Número)" autocomplete="off">
            
            <button id="btn-confirmar-modal" class="btn-confirmar">✅ CONFIRMAR</button>
            <button onclick="fecharModal()" style="background:transparent; color:#666; border:none; margin-top:15px; padding:10px; width:100%; cursor:pointer;">Cancelar</button>
        </div>
    </div>

    <div id="toast" class="toast"></div>

    <script type="module" src="js/client.js"></script>
</body>
</html>