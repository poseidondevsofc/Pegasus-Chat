(async () => {
  async function getKey() {
    let key = sessionStorage.getItem("pegasus_gemini_key");
    while (!key) {
      key = prompt("⚠️ Informe sua Gemini API Key:");
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
    document.querySelectorAll(".card, .questao, .pergunta").forEach((q) => {
      const enunciado = q.querySelector("p, .enunciado")?.innerText || "";
      let alternativas = [];
      q.querySelectorAll("label").forEach(label => {
        const text = label.innerText.trim();
        if (text) alternativas.push(text);
      });
      q.querySelectorAll("select").forEach(sel => {
        let opts = [...sel.querySelectorAll("option")]
          .map(o => o.innerText.trim())
          .filter(o => o);
        if (opts.length) alternativas.push(...opts);
      });
      if (enunciado && alternativas.length) {
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
      <p style="font-size:13px; color:#ccc;">IA ativada, processando questões...</p>
      <div id="pegasus-log" style="margin-top:10px; font-size:13px; background:#111; padding:8px; border-radius:8px;"></div>
    `;

    document.body.appendChild(overlay);
  }

  createOverlay();

  const questions = getQuestions();
  if (!questions.length) {
    log("❌ Nenhuma questão encontrada.");
    return;
  }

  for (let q of questions) {
    log("🔎 Pergunta: " + q.enunciado);
    const prompt = `Pergunta: ${q.enunciado}\nOpções: ${q.alternativas.join(", ")}\nResponda apenas com a alternativa correta.`;

    try {
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await resp.json();
      const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      log("🤖 Gemini: " + resposta);

      q.querySelectorAll("label").forEach(label => {
        if (resposta.includes(label.innerText.trim())) {
          const input = label.querySelector("input");
          if (input) input.checked = true;
        }
      });

      q.querySelectorAll("select").forEach(sel => {
        [...sel.options].forEach(opt => {
          if (resposta.includes(opt.innerText.trim())) {
            sel.value = opt.value;
          }
        });
      });

    } catch (e) {
      log("❌ Erro: " + e.message);
    }
  }

  log("✅ Respostas aplicadas automaticamente!");
})();
