javascript:(async function(){
  async function getToken() {
    let token = sessionStorage.getItem("pegasus_gemini_token_v1");
    while (!token) {
      token = prompt("⚠️ Informe sua Google Gemini API Key:");
      if (!token) alert("❌ A chave é obrigatória!");
    }
    sessionStorage.setItem("pegasus_gemini_token_v1", token);
    return token;
  }

  const geminiToken = await getToken();

  function extractPageText() {
    // Remove menus e scripts
    const clone = document.body.cloneNode(true);
    const toRemove = clone.querySelectorAll("script, style, nav, header, footer");
    toRemove.forEach(el => el.remove());

    // Pega apenas texto visível
    return clone.innerText
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000); // limite de caracteres pro Gemini
  }

  function createOverlay() {
    if (document.getElementById("pegasus-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "pegasus-overlay";
    overlay.style.position = "fixed";
    overlay.style.bottom = "80px";
    overlay.style.right = "20px";
    overlay.style.width = "360px";
    overlay.style.padding = "15px";
    overlay.style.background = "rgba(20,20,20,0.95)";
    overlay.style.color = "#fff";
    overlay.style.border = "2px solid #0f0";
    overlay.style.borderRadius = "14px";
    overlay.style.fontFamily = "Arial,sans-serif";
    overlay.style.zIndex = "999999";

    overlay.innerHTML = `
      <h2 style="margin:0 0 10px; color:#0f0;">Pegasus 🪶</h2>
      <p style="font-size:13px; color:#ccc;">Extraia perguntas automaticamente da página</p>
      <div style="margin-top:10px; display:flex; justify-content:space-between;">
        <button id="scanPage" style="flex:1; padding:8px; background:#0f0; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Ler Página</button>
        <button id="closePegasus" style="margin-left:10px; padding:8px 12px; background:#900; color:#fff; border:none; border-radius:8px; cursor:pointer;">Fechar</button>
      </div>
      <div id="pegasus-chat" style="margin-top:12px; background:#111; padding:10px; border-radius:8px; font-size:13px; max-height:250px; overflow:auto;"></div>
    `;

    document.body.appendChild(overlay);

    // Botão flutuante
    const floatBtn = document.createElement("button");
    floatBtn.id = "pegasus-float";
    floatBtn.textContent = "🪶 Pegasus";
    floatBtn.style.position = "fixed";
    floatBtn.style.bottom = "20px";
    floatBtn.style.right = "20px";
    floatBtn.style.padding = "10px 14px";
    floatBtn.style.background = "#0f0";
    floatBtn.style.color = "#000";
    floatBtn.style.border = "none";
    floatBtn.style.borderRadius = "50px";
    floatBtn.style.cursor = "pointer";
    floatBtn.style.zIndex = "999999";
    floatBtn.onclick = () => {
      overlay.style.display = overlay.style.display === "none" ? "block" : "none";
    };
    document.body.appendChild(floatBtn);

    // Fechar
    document.getElementById("closePegasus").onclick = () => overlay.style.display = "none";

    // Ler página e mandar pro Gemini
    document.getElementById("scanPage").onclick = async () => {
      const chatBox = document.getElementById("pegasus-chat");
      const pageText = extractPageText();

      const botMsg = document.createElement("div");
      botMsg.style.background = "#333";
      botMsg.style.color = "#fff";
      botMsg.style.padding = "6px 10px";
      botMsg.style.borderRadius = "8px";
      botMsg.style.margin = "6px 0";
      botMsg.textContent = "⏳ Enviando tarefa para o Gemini...";
      chatBox.appendChild(botMsg);
      chatBox.scrollTop = chatBox.scrollHeight;

      try {
        const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiToken
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Analise o seguinte conteúdo de uma tarefa e devolva apenas as respostas corretas, destacando as alternativas certas:\n\n${pageText}`
              }]
            }]
          })
        });

        const data = await resp.json();
        const resposta = data?.candidates?.[0]?.content?.parts?.[0]?.text || "❌ Nenhuma resposta encontrada.";
        botMsg.textContent = resposta;
      } catch (e) {
        botMsg.textContent = "❌ Erro: " + e.message;
      }
    };
  }

  createOverlay();
})();
