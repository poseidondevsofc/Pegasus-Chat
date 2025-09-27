(function(){
  // --- Config: escolha o modelo HF ---
  const HF_MODEL = "google/flan-t5-small"; // trocar se quiser outro modelo

  // --- util: pega token do sessionStorage ou pede via prompt ---
  async function ensureToken() {
    // tenta sessionStorage primeiro
    const keyName = "pegasus_hf_token_v1";
    let token = sessionStorage.getItem(keyName);
    if (token && token.startsWith("hf_")) return token;

    // pedir ao usuário (input simples)
    token = prompt("Cole sua HuggingFace token (começa com hf_) — deixe vazio para cancelar:");
    if (!token) return null;

    const remember = confirm("Lembrar token somente para esta sessão? (OK = sim, Cancel = não)");
    if (remember) sessionStorage.setItem(keyName, token);
    return token;
  }

  // --- util: limpar token (exposto no overlay) ---
  function clearTokenFromSession() {
    sessionStorage.removeItem("pegasus_hf_token_v1");
  }

  // --- chamada à HF Inference API (POST) ---
  async function callHF(token, promptText) {
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: promptText })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // costuma retornar array com generated_text em data[0].generated_text
      if (Array.isArray(data) && data[0] && (data[0].generated_text || data[0].summary_text)) {
        return data[0].generated_text || data[0].summary_text;
      }
      // fallback: stringify
      return JSON.stringify(data);
    } catch (e) {
      throw e;
    }
  }

  // --- cria overlay (menu) ---
  if (document.getElementById("pegasus-overlay")) {
    // já aberto
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "pegasus-overlay";
  Object.assign(overlay.style, {
    position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
    background: "rgba(0,0,0,0.6)", zIndex: "999999", display: "flex",
    justifyContent: "center", alignItems: "center", fontFamily: "Arial, sans-serif"
  });

  const menu = document.createElement("div");
  Object.assign(menu.style, {
    background: "white", color: "#222", borderRadius: "12px", padding: "18px",
    width: "480px", maxWidth: "94%", boxShadow: "0 6px 24px rgba(0,0,0,0.35)"
  });

  menu.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <strong style="font-size:18px">Pegasus Tarefas 📒</strong>
      <div>
        <button id="pegasus-clear-token" style="margin-right:8px;padding:6px;border-radius:6px;border:none;background:#f0f0f0;cursor:pointer">Limpar Token</button>
        <button id="pegasus-close" style="padding:6px;border-radius:6px;border:none;background:#ff5c5c;color:white;cursor:pointer">Fechar</button>
      </div>
    </div>

    <textarea id="pegasus-input" rows="6" placeholder="Cole a questão com alternativas aqui (ou use 'Extrair da página')" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;resize:vertical;"></textarea>

    <div style="display:flex;gap:8px;margin-top:10px">
      <button id="pegasus-send" style="flex:1;padding:10px;border-radius:8px;border:none;background:#5563DE;color:white;cursor:pointer">Enviar para IA (HuggingFace)</button>
      <button id="pegasus-extract" style="flex:1;padding:10px;border-radius:8px;border:none;background:#6c757d;color:white;cursor:pointer">Extrair da página</button>
    </div>

    <div id="pegasus-output" style="margin-top:12px;padding:10px;border-radius:8px;background:#f8f9fa;min-height:80px;white-space:pre-wrap;color:#111"></div>

    <div style="font-size:12px;color:#666;margin-top:8px">Nota: token não é armazenado permanentemente. Use em páginas confiáveis.</div>
  `;

  overlay.appendChild(menu);
  document.body.appendChild(overlay);

  // botões
  document.getElementById("pegasus-close").onclick = () => overlay.remove();
  document.getElementById("pegasus-clear-token").onclick = () => {
    clearTokenFromSession();
    document.getElementById("pegasus-output").innerText = "Token removido da sessão.";
  };

  // extrair blocos comuns da página (heurística)
  document.getElementById("pegasus-extract").onclick = () => {
    // seletores a ajustar conforme o site; tenta vários
    const nodes = document.querySelectorAll('.questao, .pergunta, .question, .enunciado, .atividade, .task, .question-text');
    let out = [];
    if (nodes.length) {
      nodes.forEach(n => {
        // tenta extrair alternativas internas (li, .alternativa, .option)
        const alts = Array.from(n.querySelectorAll('li, .alternativa, .option, .resp, .alternativas'))
                       .map(a => a.innerText.trim()).filter(Boolean);
        const text = n.innerText.trim();
        if (alts.length) out.push(text.split('\\n')[0] + "\\n- " + alts.join("\\n- "));
        else out.push(text);
      });
      document.getElementById("pegasus-input").value = out.join("\\n\\n");
      document.getElementById("pegasus-output").innerText = `Detectado ${out.length} bloco(s) e copiado para o campo.`;
      return;
    }

    // fallback: pegar seleção do usuário
    const sel = window.getSelection().toString().trim();
    if (sel) {
      document.getElementById("pegasus-input").value = sel;
      document.getElementById("pegasus-output").innerText = "Texto preenchido a partir da seleção do usuário.";
      return;
    }

    document.getElementById("pegasus-output").innerText = "Nenhuma questão encontrada automaticamente. Selecione o texto manualmente e clique em 'Extrair da página'.";
  };

  // enviar para HF
  document.getElementById("pegasus-send").onclick = async () => {
    const text = document.getElementById("pegasus-input").value.trim();
    const out = document.getElementById("pegasus-output");
    if (!text) { out.innerText = "⚠️ Coloque a questão + alternativas no campo."; return; }

    // pedir token/usar session
    const token = await ensureToken();
    if (!token) { out.innerText = "⚠️ Operação cancelada — sem token."; return; }

    out.innerText = "⏳ Enviando para HuggingFace...";

    // prompt apropriado para o modelo
    const promptForHF = "Leia a questão com alternativas abaixo e devolva apenas a alternativa correta (texto completo, não só a letra). Se houver múltiplas questões, devolva cada resposta em nova linha, no formato: Q1: <alternativa>\\nQ2: <alternativa>\\n\\nQuestões:\\n\\n" + text;

    try {
      const ans = await callHF(token, promptForHF);
      out.innerText = "✅ Resposta da IA (HuggingFace):\\n\\n" + ans;
    } catch (e) {
      out.innerText = "⚠️ Erro ao chamar HF: " + (e.message || e);
    }
  };

})();
