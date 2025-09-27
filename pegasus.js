(async () => {
  async function getToken() {
    let token = sessionStorage.getItem("pegasus_gemini_token_v2");
    while (!token) {
      token = prompt("⚠️ Informe sua Google Gemini API Key:");
      if (!token) alert("❌ A chave é obrigatória!");
    }
    sessionStorage.setItem("pegasus_gemini_token_v2", token);
    return token;
  }

  const API_KEY = await getToken();

  // 🔍 Função para extrair questões do DOM e HTML bruto
  function getQuestions() {
    let questions = [];

    // Busca ampla no DOM
    document.querySelectorAll("div, section, article, table, li").forEach((q) => {
      const text = q.innerText?.trim() || "";

      // Encontra enunciados prováveis
      if (/quest(ão|ao)|pergunta|atividade|exercício/i.test(text)) {
        let alternativas = [];

        // Busca por alternativas em labels, listas, botões e spans
        q.querySelectorAll("label, li, td, button, span").forEach(el => {
          const t = el.innerText.trim();
          if (t.length > 0 && t.length < 120) alternativas.push(t);
        });

        // Busca em selects
        q.querySelectorAll("select").forEach(sel => {
          [...sel.options].forEach(opt => {
            if (opt.innerText.trim()) alternativas.push(opt.innerText.trim());
          });
        });

        if (text && alternativas.length) {
          questions.push({ enunciado: text, alternativas, el: q });
        }
      }
    });

    // Se não achar nada no DOM, pega HTML bruto
    if (!questions.length) {
      const html = document.body.innerHTML.slice(0, 8000); // corta pra não pesar
      questions.push({ enunciado: "Conteúdo bruto da página", alternativas: [], html });
    }

    return questions;
  }

  const questions = getQuestions();
  if (!questions.length) {
    alert("❌ Nenhuma questão encontrada.");
    return;
  }

  for (let q of questions) {
    const prompt = q.html
      ? `Analise o seguinte HTML e responda somente com a alternativa correta:\n\n${q.html}`
      : `Pergunta: ${q.enunciado}\nOpções: ${q.alternativas.join(", ")}\nResponda apenas com a alternativa correta.`;

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
      console.log("🔎 Pergunta:", q.enunciado.slice(0, 100));
      console.log("🤖 Gemini respondeu:", resposta);

      // Marca automaticamente
      q.el?.querySelectorAll("label, li, td, button, span").forEach(el => {
        if (resposta.includes(el.innerText.trim())) {
          el.style.background = "yellow"; // destaca visualmente
          const input = el.querySelector("input");
          if (input) input.checked = true;
        }
      });

      q.el?.querySelectorAll("select").forEach(sel => {
        [...sel.options].forEach(opt => {
          if (resposta.includes(opt.innerText.trim())) {
            sel.value = opt.value;
          }
        });
      });

    } catch (e) {
      console.error("❌ Erro ao consultar Gemini:", e);
    }
  }

  alert("✅ Respostas processadas automaticamente!");
})();
