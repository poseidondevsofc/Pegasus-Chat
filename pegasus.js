javascript:(async function(){
    // --- ESTADO GLOBAL E CONFIGURAÇÃO ---
    let conversationHistory = []; // Armazena o histórico da conversa
    const GEMINI_MODEL = "gemini-2.5-flash"; // Modelo poderoso e multimodal
    
    async function getToken() {
        let token = sessionStorage.getItem("pegasus_gemini_token_v1");
        while (!token) {
            token = prompt("⚠️ Informe sua Google Gemini API Key. Esta chave será salva na sessão do navegador (sessionStorage):");
            if (!token) alert("❌ A chave é obrigatória!");
        }
        sessionStorage.setItem("pegasus_gemini_token_v1", token);
        return token;
    }

    const geminiToken = await getToken();

    function extractPageText() {
        const clone = document.body.cloneNode(true);
        // Remove scripts, estilos e elementos estruturais para extrair texto limpo
        const toRemove = clone.querySelectorAll("script, style, nav, header, footer, #pegasus-overlay, #pegasus-float");
        toRemove.forEach(el => el.remove());
        // Limita o texto para evitar exceder o limite de token de contexto
        return clone.innerText.replace(/\s+/g, " ").trim().slice(0, 4000);
    }
    
    function formatMarkdown(text) {
        // Substitui **negrito** por <b>negrito</b>
        text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        // Substitui *itálico* por <i>itálico</i> (Cuidado com listas, mas geralmente resolve)
        text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');
        // Substitui newlines por <br> para formatação no HTML
        text = text.replace(/\n/g, '<br>');
        
        // Adiciona um texto inicial mais amigável
        if (!text.startsWith("✅")) {
             text = "🤖 Olá! " + text;
        }
        return text;
    }

    function appendMessage(role, text) {
        const chatBox = document.getElementById("pegasus-chat");
        const msg = document.createElement("div");
        
        // Estilização diferenciada para usuário e modelo
        if (role === 'user') {
            msg.style.textAlign = 'right';
            msg.style.background = '#004d40'; // Verde escuro para usuário
            msg.style.color = '#fff';
            msg.textContent = text;
        } else { // role === 'model'
            msg.style.textAlign = 'left';
            msg.style.background = '#222'; // Cinza escuro para modelo
            msg.style.color = '#0f0';
            msg.innerHTML = formatMarkdown(text);
        }
        
        msg.style.padding = '8px 12px';
        msg.style.borderRadius = '8px';
        msg.style.margin = '6px 0';
        msg.style.maxWidth = '85%';
        msg.style.display = 'inline-block';
        
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = role === 'user' ? 'flex-end' : 'flex-start';
        wrapper.appendChild(msg);
        chatBox.appendChild(wrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    async function callGeminiAPI(messageParts) {
        const chatBox = document.getElementById("pegasus-chat");
        const sendBtn = document.getElementById("sendButton");
        const inputField = document.getElementById("userInput");

        // Adicionar mensagem de carregamento
        const loadingMsg = document.createElement("div");
        loadingMsg.innerHTML = `<span style="color:#0f0;">⏳ Gemini está digitando...</span>`;
        loadingMsg.style.margin = '6px 0';
        chatBox.appendChild(loadingMsg);
        chatBox.scrollTop = chatBox.scrollHeight;

        sendBtn.disabled = true;
        inputField.disabled = true;

        // Adiciona a mensagem atual ao histórico ANTES de enviar
        conversationHistory.push({
            role: "user",
            parts: messageParts
        });

        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": geminiToken
                },
                body: JSON.stringify({
                    // Envia todo o histórico para manter o contexto
                    contents: conversationHistory 
                })
            });

            const data = await resp.json();
            
            // Tratamento de erro da API (Ex: Chave inválida ou conteúdo bloqueado)
            if (data.error) {
                 throw new Error(`API Error: ${data.error.message}`);
            }

            const modelResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "❌ Não foi possível gerar uma resposta válida. Tente um prompt diferente.";
            
            // Remove a mensagem de carregamento
            loadingMsg.remove(); 
            
            // Exibe e salva a resposta do modelo
            appendMessage('model', modelResponseText);
            conversationHistory.push({
                role: "model",
                parts: [{ text: modelResponseText }]
            });

        } catch (e) {
            loadingMsg.innerHTML = `<span style="color:#f00;">❌ Erro: ${e.message}</span>`;
        } finally {
            sendBtn.disabled = false;
            inputField.disabled = false;
            inputField.value = '';
            inputField.focus();
        }
    }
    
    // --- FUNÇÕES DE EVENTOS ---
    
    function handleSendMessage() {
        const inputField = document.getElementById("userInput");
        const userMessage = inputField.value.trim();

        if (userMessage) {
            // A interface do usuário já mostra a mensagem através da função 'appendMessage' dentro do callGeminiAPI
            // Mas precisamos enviar a mensagem como um array de partes
            callGeminiAPI([{ text: userMessage }]);
        }
    }

    function handleScanPage() {
        const pageContent = extractPageText();
        const initialPrompt = `Analise o conteúdo desta página e identifique perguntas ou listas de tarefas. Use este contexto para futuras perguntas. Responda com um breve "Contexto da página carregado com sucesso! No que posso ajudar com base neste conteúdo?"\n\n[CONTEXTO DA PÁGINA]:\n${pageContent}`;
        
        // Simula a mensagem inicial do usuário (embora seja um prompt de contexto)
        appendMessage('user', 'Carregando contexto da página...');
        
        // Define o primeiro turno da conversa
        conversationHistory = [];
        callGeminiAPI([{ text: initialPrompt }]);
    }
    
    function createOverlay() {
        if (document.getElementById("pegasus-overlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "pegasus-overlay";
        overlay.style.position = "fixed";
        overlay.style.bottom = "100px";
        overlay.style.right = "40px";
        overlay.style.width = "400px"; /* Ligeiramente maior */
        overlay.style.padding = "0";
        overlay.style.background = "rgba(25,25,25,0.98)";
        overlay.style.color = "#fff";
        overlay.style.border = "2px solid #0f0";
        overlay.style.borderRadius = "14px";
        overlay.style.fontFamily = "Inter, Arial, sans-serif";
        overlay.style.zIndex = "999999";
        overlay.style.boxShadow = "0 4px 20px rgba(0,0,0,0.8)";
        overlay.style.display = "none"; // Começa fechado
        
        // Logo
        const logoUrl = "https://raw.githubusercontent.com/poseidondevsofc/Pegasus-Tarefas-/678cf42e44d3c306bcc0172b28b2f4d6cdfbe8a5/pegasus-estava-coberto-de-chamas-azuis-inteligencia-artificial_886951-363.jpg";

        overlay.innerHTML = `
            <div id="drag-handle" style="padding:12px; border-bottom:1px solid #0f0; display:flex; align-items:center; justify-content:space-between; cursor:move;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${logoUrl}" style="width:30px; height:30px; object-fit:cover; border-radius:6px;" />
                    <h2 style="margin:0; font-size:16px; color:#0f0;">Pegasus Tarefas (Gemini)</h2>
                </div>
                <span id="closePegasus" style="cursor:pointer; font-size:18px; color:#f00;">&times;</span>
            </div>
            
            <div id="pegasus-chat" style="padding:10px; background:#111; font-size:14px; max-height:300px; overflow-y:auto; overflow-x:hidden;">
                <div style="padding:10px; text-align:center; color:#aaa;">Bem-vindo ao Pegasus Chat. Clique em "Ler Contexto" para começar.</div>
            </div>

            <div style="padding:10px; border-top:1px solid #333;">
                <button id="scanPage" style="width:100%; padding:8px; margin-bottom: 10px; background:#00d4ff; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">1. Ler Contexto da Página</button>
                <div style="display:flex; gap:5px;">
                    <input type="text" id="userInput" placeholder="2. Pergunte ou envie uma tarefa..." style="flex:1; padding:10px; border-radius:8px; border:1px solid #0f0; background:#000; color:#fff;" />
                    <button id="sendButton" style="padding:10px 15px; background:#0f0; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Enviar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        
        // Botão flutuante (Toggle)
        const floatBtn = document.createElement("button");
        floatBtn.id = "pegasus-float";
        floatBtn.textContent = "📒 Pegasus Chat";
        floatBtn.style.position = "fixed";
        floatBtn.style.bottom = "20px";
        floatBtn.style.right = "20px";
        floatBtn.style.padding = "12px 18px";
        floatBtn.style.background = "#0f0";
        floatBtn.style.color = "#000";
        floatBtn.style.fontWeight = "bold";
        floatBtn.style.border = "none";
        floatBtn.style.borderRadius = "50px";
        floatBtn.style.cursor = "pointer";
        floatBtn.style.zIndex = "999999";
        floatBtn.onclick = () => {
            overlay.style.display = overlay.style.display === "none" ? "block" : "none";
        };
        document.body.appendChild(floatBtn);

        // --- Adicionar Listeners ---
        document.getElementById("closePegasus").onclick = () => overlay.style.display = "none";
        document.getElementById("scanPage").onclick = handleScanPage;
        document.getElementById("sendButton").onclick = handleSendMessage;
        
        // Permite enviar mensagem pressionando Enter
        document.getElementById("userInput").addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSendMessage();
            }
        });
        
        // --- Funcionalidade de Arrastar (Drag) ---
        let isDragging = false, offsetX = 0, offsetY = 0;
        const dragHandle = document.getElementById("drag-handle");
        
        dragHandle.addEventListener("mousedown", e => {
            isDragging = true;
            offsetX = e.clientX - overlay.getBoundingClientRect().left;
            offsetY = e.clientY - overlay.getBoundingClientRect().top;
        });
        
        document.addEventListener("mousemove", e => {
            if (isDragging) {
                overlay.style.left = (e.clientX - offsetX) + "px";
                overlay.style.top = (e.clientY - offsetY) + "px";
                overlay.style.right = "auto";
                overlay.style.bottom = "auto";
            }
        });
        document.addEventListener("mouseup", () => isDragging = false);
    }

    createOverlay();
})()
