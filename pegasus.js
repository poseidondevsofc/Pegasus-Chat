javascript:(async function(){
    let conversationHistory = []; 
    const GEMINI_MODEL = "gemini-2.5-flash"; 
    let mode = "direct"; // direct = só resposta / full = explicação completa
    
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
        const toRemove = clone.querySelectorAll("script, style, nav, header, footer, #pegasus-overlay, #pegasus-float");
        toRemove.forEach(el => el.remove());
        return clone.innerText.replace(/\s+/g, " ").trim().slice(0, 4000);
    }

    function appendMessage(role, text) {
        const chatBox = document.getElementById("pegasus-chat");
        const msg = document.createElement("div");
        msg.style.padding = '8px 12px';
        msg.style.borderRadius = '8px';
        msg.style.margin = '6px 0';
        msg.style.maxWidth = '85%';
        msg.style.display = 'inline-block';

        if (role === 'user') {
            msg.style.textAlign = 'right';
            msg.style.background = '#004d40';
            msg.style.color = '#fff';
            msg.textContent = text;
        } else {
            msg.style.textAlign = 'left';
            msg.style.background = '#222';
            msg.style.color = '#0f0';
            msg.textContent = text;
        }
        
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

        const loadingMsg = document.createElement("div");
        loadingMsg.textContent = "⏳ Gemini está digitando...";
        loadingMsg.style.color = "#0f0";
        loadingMsg.style.margin = '6px 0';
        chatBox.appendChild(loadingMsg);
        chatBox.scrollTop = chatBox.scrollHeight;

        sendBtn.disabled = true;
        inputField.disabled = true;

        conversationHistory.push({ role: "user", parts: messageParts });

        let systemPrompt = "";
        if (mode === "direct") {
            systemPrompt = "Responda somente com a resposta correta, sem explicações, sem formatação.";
        } else {
            systemPrompt = "Responda com a resposta correta e também explicações detalhadas e exemplos.";
        }

        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": geminiToken
                },
                body: JSON.stringify({
                    contents: [
                        { role: "user", parts: [{ text: systemPrompt }] },
                        ...conversationHistory
                    ]
                })
            });

            const data = await resp.json();
            if (data.error) throw new Error(`API Error: ${data.error.message}`);

            let modelResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "❌ Sem resposta.";
            loadingMsg.remove(); 
            appendMessage('model', modelResponseText.trim());
            conversationHistory.push({ role: "model", parts: [{ text: modelResponseText.trim() }] });

        } catch (e) {
            loadingMsg.textContent = `❌ Erro: ${e.message}`;
            loadingMsg.style.color = "#f00";
        } finally {
            sendBtn.disabled = false;
            inputField.disabled = false;
            inputField.value = '';
            inputField.focus();
        }
    }
    
    function handleSendMessage() {
        const inputField = document.getElementById("userInput");
        const userMessage = inputField.value.trim();
        if (userMessage) callGeminiAPI([{ text: userMessage }]);
    }

    function handleScanPage() {
        const pageContent = extractPageText();
        appendMessage('user', 'Carregando contexto da página...');
        conversationHistory = [];
        callGeminiAPI([{ text: "Use este conteúdo como contexto:\n" + pageContent }]);
    }
    
    function createOverlay() {
        if (document.getElementById("pegasus-overlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "pegasus-overlay";
        overlay.style.position = "fixed";
        overlay.style.bottom = "100px";
        overlay.style.right = "40px";
        overlay.style.width = "420px"; 
        overlay.style.background = "rgba(25,25,25,0.98)";
        overlay.style.color = "#fff";
        overlay.style.border = "2px solid #0f0";
        overlay.style.borderRadius = "14px";
        overlay.style.fontFamily = "Inter, Arial, sans-serif";
        overlay.style.zIndex = "999999";
        overlay.style.boxShadow = "0 4px 20px rgba(0,0,0,0.8)";
        overlay.style.display = "none";
        
        overlay.innerHTML = `
            <div id="drag-handle" style="padding:12px; border-bottom:1px solid #0f0; display:flex; align-items:center; justify-content:space-between; cursor:move;">
                <h2 style="margin:0; font-size:16px; color:#0f0;">Pegasus Chat (Gemini)</h2>
                <span id="closePegasus" style="cursor:pointer; font-size:18px; color:#f00;">&times;</span>
            </div>
            
            <div id="pegasus-chat" style="padding:10px; background:#111; font-size:14px; max-height:300px; overflow-y:auto;"></div>

            <div style="padding:10px; border-top:1px solid #333;">
                <button id="scanPage" style="width:100%; padding:8px; margin-bottom:10px; background:#00d4ff; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">1. Ler Contexto da Página</button>
                <div style="display:flex; gap:5px; margin-bottom:5px;">
                    <input type="text" id="userInput" placeholder="2. Pergunte ou envie uma tarefa..." style="flex:1; padding:10px; border-radius:8px; border:1px solid #0f0; background:#000; color:#fff;" />
                    <button id="sendButton" style="padding:10px 15px; background:#0f0; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Enviar</button>
                </div>
                <div style="display:flex; gap:5px;">
                    <button id="directMode" style="flex:1; padding:8px; background:#ff9800; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Resposta Direta</button>
                    <button id="fullMode" style="flex:1; padding:8px; background:#4caf50; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Explicação Completa</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

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

        document.getElementById("closePegasus").onclick = () => overlay.style.display = "none";
        document.getElementById("scanPage").onclick = handleScanPage;
        document.getElementById("sendButton").onclick = handleSendMessage;

        // troca de modos
        document.getElementById("directMode").onclick = () => { mode = "direct"; appendMessage("model", "✅ Modo ajustado: Resposta Direta"); };
        document.getElementById("fullMode").onclick = () => { mode = "full"; appendMessage("model", "✅ Modo ajustado: Explicação Completa"); };

        document.getElementById("userInput").addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleSendMessage();
        });

        // arrastar janela
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
