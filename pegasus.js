javascript:(async function(){
  // 🔑 Sempre pede o token Gemini
  async function getToken() {
    let token = null;
    while (!token) {
      token = prompt("⚠️ Informe sua Google Gemini API Key:");
      if (!token) alert("❌ A chave é obrigatória!");
    }
    sessionStorage.setItem("pegasus_gemini_token_v1", token);
    return token;
  }

  const geminiToken = await getToken();

  // 🎨 Criar menu Pegasus
  function createOverlay() {
    if (document.getElementById("pegasus-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "pegasus-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "20px";
    overlay.style.right = "20px";
    overlay.style.width = "340px";
    overlay.style.padding = "15px";
    overlay.style.background = "rgba(20,20,20,0.95)";
    overlay.style.color = "#fff";
    overlay.style.border = "2px solid #0f0";
    overlay.style.borderRadius = "14px";
    overlay.style.boxShadow = "0 0 20px rgba(0,255,0,0.5)";
    overlay.style.fontFamily = "Arial, sans-serif";
    overlay.style.zIndex = "999999";

    overlay.innerHTML = `
      <h2 style="margin:0 0 10px 0; font-size:20px; color:#0f0;">Pegasus 🪶</h2>
      <p style="font-size:13px; color:#ccc;">Token válido ✔️</p>
      <textarea id="pegasus-question" 
        placeholder="Digite sua pergunta para o Gemini..." 
        style="width:100%; height:100px; border-radius:8px; border:none; padding:8px; margin-top:5px; font-size:13px;"></textarea>
      <button id="sendToIA" style="margin-top:10px; padding:8px 12px; background:#0f0; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Enviar para IA</button>
      <button id="closePegasus" style="margin-top:10px; margin-left:10px; padding:8px 12px; background:#900; color:#fff; border:none; border-radius:8px; cursor:pointer;">Fechar</button>
      <pre id="pegasus-response" style="margin-top:10px; background:#111; padding:8px; border-radius:8px; font-size:13px; max-height:200px; overflow:auto; white-space:pre-wrap;"></pre>
    `;

    document.body.appendChild(overlay);

    // Fechar menu
    document.getElementById("closePegasus").onclick = () => overlay.remove();

    // Enviar questão para IA
    document.getElementById("sendToIA").onclick = async () => {
      const question = document.getElementById("pegasus-question").value.trim();
      if (!question) {
        alert("⚠️ Escreva uma questão antes de enviar!");
        return;
      }

      const output = document.getElementById("pegasus-response");
      output.textContent = "⏳ Consultando Gemini...";

      try {
        const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiToken
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: question }]
            }]
          })
        });

        if (!resp.ok) {
          throw new Error("Erro HTTP " + resp.status);
        }

        const data = await resp.json();
        const resposta = data?.candidates?.[0]?.content?.parts?.[0]?.text || "❌ Nenhuma resposta gerada.";
        output.textContent = resposta;
      } catch (e) {
        output.textContent = "❌ Erro ao consultar Gemini: " + e.message;
      }
    };
  }

  createOverlay();
})();
