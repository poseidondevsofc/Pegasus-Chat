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
    overlay.style.position="fixed";
    overlay.style.top="0";
    overlay.style.left="0";
    overlay.style.width="100%";
    overlay.style.height="100%";
    overlay.style.background="rgba(0,0,0,0.6)";
    overlay.style.zIndex="999999";
    overlay.style.display="flex";
    overlay.style.justifyContent="center";
    overlay.style.alignItems="center";

    let menu=document.createElement("div");
    menu.style.background="white";
    menu.style.color="#333";
    menu.style.borderRadius="15px";
    menu.style.padding="25px";
    menu.style.width="400px";
    menu.style.textAlign="center";
    menu.style.boxShadow="0 4px 20px rgba(0,0,0,0.3)";
    menu.innerHTML=`
      <h2 style="color:#5563DE;">Pegasus Tarefas 📒</h2>
      <textarea id="pegasus-pergunta" rows="6" style="width:100%;padding:10px;border-radius:10px;border:1px solid #ccc;font-size:14px;resize:none;" placeholder="Cole aqui a questão com as alternativas"></textarea>
      <br><br>
      <button id="pegasus-btn" style="padding:12px 20px;background:#5563DE;color:white;border:none;border-radius:10px;font-size:16px;cursor:pointer;">Enviar para IA</button>
      <div id="pegasus-resposta" style="margin-top:20px;padding:15px;border-radius:10px;background:#f0f0f0;color:#333;font-weight:bold;min-height:50px;">Aguardando questão...</div>
      <br>
      <button id="pegasus-fechar" style="padding:8px 15px;background:#ccc;border:none;border-radius:8px;cursor:pointer;">Fechar</button>
    `;

    overlay.appendChild(menu);
    document.body.appendChild(overlay);

    document.getElementById("pegasus-btn").onclick=async ()=>{
      let pergunta=document.getElementById("pegasus-pergunta").value;
      let respostaBox=document.getElementById("pegasus-resposta");

      if(!pergunta.trim()){respostaBox.innerHTML="⚠️ Digite a questão!";return;}
      respostaBox.innerHTML="⏳ Consultando a IA...";

      try {
        const resposta=await puter.ai.chat(
          "Leia a pergunta abaixo com alternativas e devolva apenas a alternativa correta (o texto completo, não a letra):\\n\\n"+pergunta,
          { model: "gpt-5-nano" }
        );
        respostaBox.innerHTML="✅ <u>Resposta sugerida:</u><br><br>"+resposta;
      } catch(e){
        respostaBox.innerHTML="⚠️ Erro: "+e.message;
      }
    };

    document.getElementById("pegasus-fechar").onclick=()=>{
      overlay.remove();
    };
  }
})();
