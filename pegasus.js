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
    const clone = document.body.cloneNode(true);
    const toRemove = clone.querySelectorAll("script, style, nav, header, footer");
    toRemove.forEach(el => el.remove());
    return clone.innerText.replace(/\s+/g, " ").trim().slice(0, 4000);
  }

  function createOverlay() {
    if (document.getElementById("pegasus-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "pegasus-overlay";
    overlay.style.position = "fixed";
    overlay.style.bottom = "100px";
    overlay.style.right = "40px";
    overlay.style.width = "380px";
    overlay.style.padding = "0";
    overlay.style.background = "rgba(25,25,25,0.97)";
    overlay.style.color = "#fff";
    overlay.style.border = "2px solid #0f0";
    overlay.style.borderRadius = "14px";
    overlay.style.fontFamily = "Arial,sans-serif";
    overlay.style.zIndex = "999999";
    overlay.style.boxShadow = "0 4px 12px rgba(0,0,0,0.5)";
    overlay.style.cursor = "move";

    // A URL raw da imagem no GitHub (raw) é preferível para uso direto
    const logoUrl = "https://raw.githubusercontent.com/poseidondevsofc/Pegasus-Tarefas-/678cf42e44d3c306bcc0172b28b2f4d6cdfbe8a5/pegasus-estava-coberto-de-chamas-azuis-inteligencia-artificial_886951-363.jpg";

    overlay.innerHTML = `
      <div style="padding:12px; border-bottom:1px solid #0f0; display:flex; align-items:center; gap:10px; cursor:move;">
        <img src="${logoUrl}" style="width:30px; height:30px; object-fit:cover; border-radius:6px;" />
        <h2 style="margin:0; font-size:16px; color:#0f0;">Pegasus Tarefas 📒</h2>
      </div>
      <div style="padding:10px; font-size:13px; color:#ccc;">Extraia respostas automaticamente da página</div>
      <div style="padding:10px; display:flex; justify-content:space-between;">
        <button id="scanPage" style="flex:1; padding:8px; background:#0f0; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Ler Página</button>
        <button id="closePegasus" style="margin-left:10px; padding:8px 12px; background:#900; color:#fff; border:none; border-radius:8px; cursor:pointer;">Fechar</button>
      </div>
      <div id="pegasus-chat" style="margin:10px; background:#111; padding:10px; border-radius:8px; font-size:13px; max-height:280px; overflow:auto;"></div>
    `;

    document.body.appendChild(overlay);

    // Botão flutuante
    const floatBtn = document.createElement("button");
    floatBtn.id = "pegasus-float";
    floatBtn.textContent = "📒 Pegasus";
    floatBtn.style.position = "fixed";
    floatBtn.style.bottom = "20px";
    floatBtn.style.right = "20px";
    floatBtn.style.padding = "10px 14px";
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

    document.getElementById("scanPage").onclick = async () => {
      const chatBox = document.getElementById("pegasus-chat");
      const botMsg = document.createElement("div");
      botMsg.style.background = "#222";
      botMsg.style.color = "#0f0";
      botMsg.style.padding = "8px 12px";
      botMsg.style.borderRadius = "8px";
      botMsg.style.margin = "6px 0";
      botMsg.style.fontWeight = "bold";
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
                text: `Analise o seguinte conteúdo e devolva apenas as respostas corretas, destacando claramente as alternativas certas:\n\n${extractPageText()}`
              }]
            }]
          })
        });

        const data = await resp.json();
        const resposta = data?.candidates?.[0]?.content?.parts?.[0]?.text || "❌ Nenhuma resposta encontrada.";

        botMsg.style.background = "#0f0";
        botMsg.style.color = "#000";
        botMsg.style.fontWeight = "normal";
        botMsg.innerHTML = `<b>✅ Resposta:</b><br>${resposta.replace(/\n/g, "<br>")}`;
      } catch (e) {
        botMsg.style.background = "#900";
        botMsg.style.color = "#fff";
        botMsg.textContent = "❌ Erro: " + e.message;
      }
    };

    let isDragging = false, offsetX = 0, offsetY = 0;
    overlay.addEventListener("mousedown", e => {
      // só inicia arrasto se clicar na parte do cabeçalho
      const headerArea = e.target.closest("h2") || e.target.closest("img") || e.target.closest("div[style*='cursor:move']");
      if (headerArea) {
        isDragging = true;
        offsetX = e.clientX - overlay.getBoundingClientRect().left;
        offsetY = e.clientY - overlay.getBoundingClientRect().top;
      }
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
})();    return;
  }

  // 🔎 Função auxiliar: manda questão pro Gemini
  async function askGemini(question, options) {
    const prompt = `Pergunta: ${question}\nOpções: ${options.join(", ")}\nResponda apenas com a alternativa correta.`;

    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const result = await resp.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  // 📌 Itera pelas questões do JSON
  if (Array.isArray(data.questions || data.quests)) {
    const questions = data.questions || data.quests;

    for (let q of questions) {
      const enunciado = q.pergunta || q.enunciado || "";
      const alternativas = q.alternativas || q.options || [];
      let resposta = q.resposta_correta || q.answer || "";

      if (!resposta && alternativas.length) {
        console.log("🤖 Perguntando ao Gemini...");
        resposta = await askGemini(enunciado, alternativas);
      }

      console.log("🔎 Pergunta:", enunciado);
      console.log("✅ Resposta:", resposta);

      // Marca automaticamente no DOM
      document.querySelectorAll("label, option").forEach(el => {
        if (resposta.includes(el.innerText.trim())) {
          if (el.tagName === "LABEL") {
            const input = el.querySelector("input");
            if (input) input.checked = true;
          } else if (el.tagName === "OPTION") {
            el.selected = true;
          }
        }
      });
    }

    alert("✅ Respostas aplicadas automaticamente!");
  } else {
    alert("⚠️ O JSON não contém lista de questões.");
  }
})();
