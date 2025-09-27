(function(){
  if(!window.puter){
    var s=document.createElement("script");
    s.src="https://js.puter.com/v2/";
    s.onload=startPegasus;
    document.body.appendChild(s);
  } else { startPegasus(); }

  function startPegasus(){
    if(document.getElementById("pegasus-overlay")) return;

    let overlay=document.createElement("div");
    overlay.id="pegasus-overlay";
    Object.assign(overlay.style,{
      position:"fixed",top:"0",left:"0",width:"100%",height:"100%",
      background:"rgba(0,0,0,0.6)",zIndex:"999999",display:"flex",
      justifyContent:"center",alignItems:"center"
    });

    let menu=document.createElement("div");
    Object.assign(menu.style,{
      background:"white",color:"#333",borderRadius:"15px",padding:"25px",
      width:"420px",textAlign:"center",boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
      fontFamily:"Arial, sans-serif"
    });

    menu.innerHTML=`
      <h2 style="color:#5563DE;margin:0 0 12px 0">Pegasus Tarefas 📒</h2>
      <textarea id="pegasus-pergunta" rows="6" style="width:100%;padding:10px;border-radius:10px;border:1px solid #ccc;font-size:14px;resize:none;" placeholder="Cole aqui a questão com as alternativas"></textarea>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
        <button id="pegasus-btn" style="padding:10px 14px;background:#5563DE;color:white;border:none;border-radius:8px;cursor:pointer">Enviar para IA</button>
        <button id="pegasus-auto" style="padding:10px 14px;background:#6c757d;color:white;border:none;border-radius:8px;cursor:pointer">Extrair da página</button>
        <button id="pegasus-fechar" style="padding:10px 14px;background:#ddd;color:#333;border:none;border-radius:8px;cursor:pointer">Fechar</button>
      </div>
      <div id="pegasus-resposta" style="margin-top:14px;padding:12px;border-radius:8px;background:#f8f9fa;color:#222;min-height:60px;text-align:left;white-space:pre-wrap"></div>
      <div style="font-size:12px;color:#666;margin-top:8px">Nota: a IA somente *sugere* respostas — revise antes.</div>
    `;

    overlay.appendChild(menu);
    document.body.appendChild(overlay);

    const respostaBox = () => document.getElementById("pegasus-resposta");

    document.getElementById("pegasus-fechar").onclick = ()=> overlay.remove();

    document.getElementById("pegasus-btn").onclick = async ()=>{
      const pergunta = document.getElementById("pegasus-pergunta").value.trim();
      if(!pergunta){ respostaBox().innerText = "⚠️ Digite a questão!"; return; }
      respostaBox().innerText = "⏳ Consultando IA...";
      try{
        const resp = await puter.ai.chat(
          "Leia a pergunta abaixo com alternativas e devolva apenas a alternativa correta (o texto completo, não a letra):\n\n" + pergunta,
          { model: "gpt-5-nano" }
        );
        respostaBox().innerText = "✅ Resposta sugerida:\n\n" + resp;
      }catch(e){
        respostaBox().innerText = "⚠️ Erro ao chamar IA: " + (e.message||e);
      }
    };

    // tenta extrair perguntas diretamente da página para o textarea
    document.getElementById("pegasus-auto").onclick = ()=>{
      // seletores comuns; ajuste conforme o DOM da Sala do Futuro
      let nodes = document.querySelectorAll('.questao, .pergunta, .question, .enunciado, .atividade');
      if(!nodes.length){
        // fallback pega seleção do usuário
        const sel = window.getSelection().toString().trim();
        if(sel) { document.getElementById("pegasus-pergunta").value = sel; respostaBox().innerText = "Texto preenchido a partir da seleção."; return; }
        respostaBox().innerText = "Nenhuma questão encontrada automaticamente. Você pode selecionar o texto manualmente e clicar em Extrair.";
        return;
      }
      let out = [];
      nodes.forEach(n=>{
        // tenta também pegar alternativas dentro do bloco
        let alt = Array.from(n.querySelectorAll('.alternativa, .option, li, .resp, .alternativas'))
                    .map(x=>x.innerText.trim()).filter(Boolean);
        const text = n.innerText.trim();
        if(alt.length) out.push(text.split('\\n')[0] + "\\n- " + alt.join("\\n- "));
        else out.push(text);
      });
      document.getElementById("pegasus-pergunta").value = out.join("\\n\\n");
      respostaBox().innerText = "Preenchido com " + out.length + " bloco(s) detectado(s).";
    };
  }
})();
