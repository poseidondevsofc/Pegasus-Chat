(async () => {
  const activityId = window.location.pathname.split("/").pop(); 
  console.log("📌 Atividade ID:", activityId);

  // 🔑 Pega a chave Gemini
  let geminiKey = sessionStorage.getItem("pegasus_gemini_key");
  while (!geminiKey) {
    geminiKey = prompt("⚠️ Informe sua API Key do Gemini:");
    if (!geminiKey) alert("❌ A chave é obrigatória!");
  }
  sessionStorage.setItem("pegasus_gemini_key", geminiKey);

  // 🔍 Possíveis padrões de URL do JSON
  const urls = [
    `/task_${activityId}.json`,
    `/atividade/${activityId}/task.json`,
    `/api/task_${activityId}.json`,
    `/api/task/${activityId}`
  ];

  let data = null;
  for (let url of urls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        data = await resp.json();
        console.log("✅ JSON encontrado:", url, data);
        break;
      }
    } catch (e) {
      console.warn("❌ Falha em", url);
    }
  }

  if (!data) {
    alert("❌ Nenhum JSON de atividade encontrado.");
    return;
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
