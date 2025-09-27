(function(){
  async function chamarIA(pergunta) {
    try {
      const resp = await fetch("https://api-inference.huggingface.co/models/google/flan-t5-small", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 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",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: "Leia a questão com alternativas abaixo e devolva apenas a alternativa correta (texto completo, não só a letra):\n\n" + pergunta
        })
      });

      const data = await resp.json();
      if (data.error) return "⚠️ Erro HF: " + data.error;
      return data[0]?.generated_text || JSON.stringify(data);
    } catch (e) {
      return "⚠️ Falha: " + e.message;
    }
  }

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
      <button id="pegasus-fechar" style="padding:10px 14px;background:#ccc;border:none;border-radius:8px;cursor:pointer">Fechar</button>
    </div>
    <div id="pegasus-resposta" style="margin-top:14px;padding:12px;border-radius:8px;background:#f8f9fa;color:#222;min-height:60px;text-align:left;white-space:pre-wrap">Aguardando questão...</div>
  `;

  overlay.appendChild(menu);
  document.body.appendChild(overlay);

  const respostaBox = ()=>document.getElementById("pegasus-resposta");

  document.getElementById("pegasus-fechar").onclick=()=>overlay.remove();

  document.getElementById("pegasus-btn").onclick=async ()=>{
    const pergunta=document.getElementById("pegasus-pergunta").value.trim();
    if(!pergunta){ respostaBox().innerText="⚠️ Digite a questão!"; return; }
    respostaBox().innerText="⏳ Consultando IA (HuggingFace)...";
    respostaBox().innerText=await chamarIA(pergunta);
  };
})();
