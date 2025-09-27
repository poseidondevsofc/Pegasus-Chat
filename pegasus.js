(async () => {
  async function getKey() {
    let key = sessionStorage.getItem("pegasus_gemini_key");
    while (!key) {
      key = prompt("⚠️ Informe sua Google Gemini API Key:");
      if (!key) alert("❌ A chave é obrigatória!");
    }
    sessionStorage.setItem("pegasus_gemini_key", key);
    return key;
  }
  const API_KEY = await getKey();

  function log(msg) {
    const box = document.getElementById("pegasus-log");
    if (box) {
      const line = document.createElement("div");
      line.textContent = msg;
      line.style.marginBottom = "4px";
      box.appendChild(line);
      box.scrollTop = box.scrollHeight;
    }
  }

  function getQuestions() {
    let questions = [];
    // Possíveis seletores usados na Sala do Futuro
    const containers = document.querySelectorAll(
      ".questao, .pergunta, .question, .question-container, .campo-questao, .question-wrapper"
    );

    containers.forEach((q) => {
      const enunciadoEl =
        q.querySelector("p, .enunciado, h2, h3, .question-text, .statement");
      const enunciado = enunciadoEl?.innerText.trim() || q.innerText.trim().split("\n")[0] || "";

      let alternativas = [];

      // Capturar alternativas comuns
      q.querySelectorAll("label").forEach(label => {
        const text = label.innerText.trim();
        if (text) alternativas.push(text);
      });

      // Opções de selects
      q.querySelectorAll("select").forEach(sel => {
        [...sel.querySelectorAll("option")].forEach(opt => {
          const text = opt.innerText.trim();
          if (text) alternativas.push(text);
        });
      });

      // Capturar inputs de radio/checkbox sem label-text
      q.querySelectorAll("input[type=radio], input[type=checkbox]").forEach(inp => {
        const label = inp.nextElementSibling;
        if (label && (label.innerText || label.textContent)) {
          const text = label.innerText.trim() || label.textContent.trim();
          if (text) alternativas.push(text);
        }
      });

      // Filtrar duplicadas
      alternativas = Array.from(new Set(alternativas));

      if (enunciado && alternativas.length >= 2) {
        questions.push({ enunciado, alternativas, el: q });
      }
    });

    return questions;
  }

  function createOverlay() {
    if (document.getElementById("pegasus-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "pegasus-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "20px";
    overlay.style.right = "20px";
    overlay.style.width = "360px";
    overlay.style.padding = "15px";
    overlay.style.background = "rgba(20,20,20,0.95)";
    overlay.style.color = "#fff";
    overlay.style.border = "2px solid #0f0";
    overlay.style.borderRadius = "14px";
    overlay.style.fontFamily = "Arial,sans-serif";
    overlay.style.zIndex = "999999";
    overlay.style.maxHeight = "70vh";
    overlay.style.overflowY = "auto";

    overlay.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="https://raw.githubusercontent.com/poseidondevsofc/Pegasus-Tarefas-/main/pegasus-estava-coberto-de-chamas-azuis-inteligencia-artificial_886951-363.jpg" width="32" height="32" style="border-radius:4px;">
        <h2 style="margin:0;font-size:20px;color:#0f0;">Pegasus 🪶</h2>
      </div>
      <p style="font-size:13px; color:#ccc;">Buscando questões na página...</p>
      <div id="pegasus-log" style="margin-top:10px; font-size:13px; background:#111; padding:8px; border-radius:8px;"></div>
    `;

    document.body.appendChild(overlay);
  }
  createOverlay();

  const questions = getQuestions();
  if (!questions.length) {
    log("❌ Nenhuma questão encontrada com os seletores padrão. Tentando tudo...");
  } else {
    log(`✅ ${questions.length} questão(ões) identificada(s).`);
  }

  for (let q of questions) {
    log("🔎 Pergunta: " + q.enunciado);

    const promptText = `Pergunta: ${q.enunciado}\nOpções: ${q.alternativas.join(", ")}\nResponda apenas com a alternativa correta.`;

    try {
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        }
      );

      const data = await resp.json();
      const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      log("🤖 Gemini respondeu: " + resposta);

      // Marca alternativas
      q.el.querySelectorAll("label").forEach(label => {
        if (resposta.includes(label.innerText.trim())) {
          const input = label.querySelector("input");
          if (input) input.checked = true;
        }
      });

      // Preenche selects
      q.el.querySelectorAll("select").forEach(sel => {
        [...sel.options].forEach(opt => {
          if (resposta.includes(opt.innerText.trim())) {
            sel.value = opt.value;
          }
        });
      });

    } catch (e) {
      log("❌ Erro ao consultar Gemini: " + e.message);
    }
  }

  log("✅ Fim da verificação!");
})();
