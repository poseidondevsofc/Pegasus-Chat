(async function(){
/* Pegasus Chat — Versão 2.1 (Design Renovado, Correção de Imagem, Extração Total, Clonagem Agressiva, Resposta Automática)

Texto, imagens (via instrução de tool), código, gerar projeto, gerar scripts de clonagem.
Design e Nome Atualizados.

AVISO: Use apenas em sites públicos ou com permissão expressa.
*/

// --- Configurações ---
const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const GEMINI_IMAGE_MODEL = "gemini-1.5-pro"; // Mantido, mas usado apenas na chamada de texto
let GEMINI_API_KEY = sessionStorage.getItem("pegasus_gemini_token_v1") || "";
const LOGO_URL = "https://raw.githubusercontent.com/poseidondevsofc/Pegasus-Chat/fdc6c5e434f3b1577298b7ba3f5bea5ec5f36654/PegasusIcon.png";

if(!GEMINI_API_KEY){
  GEMINI_API_KEY = prompt("Pegasus Chat — Cole sua Google Gemini API Key (será salva em sessionStorage):");
  if(!GEMINI_API_KEY){
    alert("API Key necessária.");
    return;
  }
  sessionStorage.setItem("pegasus_gemini_token_v1", GEMINI_API_KEY);
}

// --- helpers ---
function el(html){ const div = document.createElement('div'); div.innerHTML = html; return div.firstElementChild;}
function blobDownload(filename, content, mime='text/plain'){ const b = new Blob([content], {type: mime}); const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function createCodeBlock(code, lang='') {
  const pre = document.createElement('pre');
  const codeEl = document.createElement('code');
  codeEl.textContent = code;
  pre.appendChild(codeEl);
  const wrap = document.createElement('div');
  wrap.style.position = 'relative'; wrap.style.margin='8px 0';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copiar';
  copyBtn.style.cssText = 'position:absolute; right:6px; top:6px; padding:4px 8px; border-radius:4px; background:#333; color:#fff; border:1px solid #555; cursor:pointer; font-size:12px;';
  copyBtn.onclick = ()=>{ navigator.clipboard.writeText(code).then(()=>{ copyBtn.textContent='Copiado!'; setTimeout(()=>copyBtn.textContent='Copiar',1200); }); };
  wrap.appendChild(copyBtn); wrap.appendChild(pre);
  return wrap;
}
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }
function addBotTextRaw(text){ 
  const d=document.createElement('div'); d.style.textAlign='left'; d.style.margin='8px 0'; 
  d.innerHTML=`<div style="display:inline-block;background:#293729;color:#e6ffe6;padding:10px 12px;border-radius:12px;max-width:86%;white-space:pre-wrap;word-break:break-all; box-shadow:0 2px 4px rgba(0,0,0,0.2)">${text}</div>`; 
  chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight;
}

// --- UI overlay (Novo Estilo) ---
if(document.getElementById('pegasus-tarefas-overlay')) {
  document.getElementById('pegasus-tarefas-overlay').remove();
  document.getElementById('pegasus-tarefas-float')?.remove();
}
const overlay = document.createElement('div');
overlay.id = 'pegasus-tarefas-overlay';
overlay.style.cssText = [
  'position:fixed','right:30px','bottom:90px','width:480px','max-height:80vh',
  'background:#1c1c1c','color:#e6ffe6','border:1px solid #333',
  'border-radius:16px','z-index:9999999','box-shadow:0 10px 30px rgba(0,0,0,0.5)',
  'display:flex','flex-direction:column','overflow:hidden','font-family:Inter, Arial, sans-serif'
].join(';');

overlay.innerHTML = `
  <div id="pegasus-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#282828;border-bottom:1px solid #333;cursor:grab;">
    <div style="display:flex;gap:10px;align-items:center;">
      <img src="${LOGO_URL}" style="width:30px;height:30px;border-radius:4px;object-fit:cover" />
      <div style="font-weight:700;color:#0f0;font-size:16px;">Pegasus Chat</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button id="pegasus-hide" style="background:transparent;color:#bbb;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px">X</button>
    </div>
  </div>
  <div id="pegasus-chat" style="padding:15px; overflow-y:auto; flex:1; font-size:14px; background:#1c1c1c;"></div>
  <div style="padding:12px 16px;border-top:1px solid #333;display:flex;flex-direction:column;gap:10px;background:#282828">
    <input id="pegasus-prompt" placeholder="Digite seu comando, solicite código, ou pergunte algo..." style="padding:12px;border-radius:10px;border:1px solid #444;background:#111;color:#fff;font-size:14px; outline:none;" />
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button id="pegasus-send" style="flex:1;padding:10px;border-radius:10px;background:#0f0;color:#000;font-weight:700;cursor:pointer; border:none;">Enviar</button>
      <button id="pegasus-img" style="padding:10px;border-radius:10px;background:#00bcd4;color:#fff;font-weight:700;cursor:pointer; border:none;">Imagem</button>
      <button id="pegasus-proj" style="padding:10px;border-radius:10px;background:#ff9800;color:#000;font-weight:700;cursor:pointer; border:none;">Projeto</button>
      <button id="pegasus-clone" style="padding:10px;border-radius:10px;background:#f44336;color:#fff;font-weight:700;cursor:pointer; border:none;">Clonar</button>
      <button id="pegasus-extract" style="padding:10px;border-radius:10px;background:#9c27b0;color:#fff;font-weight:700;cursor:pointer; border:none;">Extrair Tudo</button>
      <button id="pegasus-qna" style="padding:10px;border-radius:10px;background:#2196f3;color:#fff;font-weight:700;cursor:pointer; border:none;">Auto Resposta</button>
    </div>
    <div style="font-size:11px;color:#888">Modo: Completo — Gemini pode gerar texto, código e pode instruir geração de imagem.</div>
  </div>
`;
document.body.appendChild(overlay);

// floating toggle button
const floatBtn = document.createElement('button');
floatBtn.id = 'pegasus-tarefas-float';
floatBtn.textContent = '🤖 Pegasus Chat';
floatBtn.style.cssText = 'position:fixed;right:20px;bottom:20px;padding:12px 18px;border-radius:30px;background:#0f0;color:#000;border:none;font-weight:700;z-index:99999999;cursor:pointer;box-shadow:0 4px 12px rgba(0,255,0,0.4)';
floatBtn.onclick = ()=> overlay.style.display = overlay.style.display==='none'?'flex':'none';
document.body.appendChild(floatBtn);

// close
document.getElementById('pegasus-hide').onclick = ()=> overlay.style.display='none';

// chat helpers
const chatBox = document.getElementById('pegasus-chat');
function addUserMsg(text){ 
  const d=document.createElement('div'); d.style.textAlign='right'; d.style.margin='8px 0'; 
  d.innerHTML=`<div style="display:inline-block;background:#00695c;color:#fff;padding:10px 12px;border-radius:12px;max-width:86%; box-shadow:0 2px 4px rgba(0,0,0,0.2)">${escapeHtml(text)}</div>`; 
  chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight;
}
function addBotText(text){ 
  const d=document.createElement('div'); d.style.textAlign='left'; d.style.margin='8px 0'; 
  d.innerHTML=`<div style="display:inline-block;background:#293729;color:#e6ffe6;padding:10px 12px;border-radius:12px;max-width:86%; box-shadow:0 2px 4px rgba(0,0,0,0.2)">${escapeHtml(text)}</div>`; 
  chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight;
}
function addBotHtml(html){ 
  const d=document.createElement('div'); d.style.textAlign='left'; d.style.margin='8px 0'; 
  const box=document.createElement('div'); 
  box.style.background='#293729'; box.style.color='#b8ffb8'; box.style.padding='10px 12px'; 
  box.style.borderRadius='12px'; box.style.maxWidth='92%'; box.innerHTML=html; 
  box.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  d.appendChild(box); chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight;
}
function addCodeBlock(code, filename){ 
  const wrapper=createCodeBlock(code); 
  const dlBtn=document.createElement('button'); 
  dlBtn.textContent='Baixar'; 
  dlBtn.style.cssText = 'padding:6px 12px; border-radius:6px; background:#00796b; color:#fff; border:none; margin-left:8px; cursor:pointer; font-size:13px;';
  dlBtn.onclick=()=>blobDownload(filename||'code.txt',code,'text/plain'); 
  const container=document.createElement('div'); container.style.margin='8px 0'; container.appendChild(wrapper); container.appendChild(dlBtn); 
  chatBox.appendChild(container); chatBox.scrollTop=chatBox.scrollHeight; 
}

// --- Gemini API calls ---
async function callTextAPI(promptText){
  const system = 'Você é Pegasus Chat — responda no modo COMPLETO multimodal, podendo gerar texto, código ou instruções de forma prática. Para código, use ```linguagem\n código\n```. Gere sempre respostas diretas e no formato solicitado. Para gerar imagens, instrua o usuário ou use a ferramenta de geração e retorne o URI/Base64 se disponível.';
  const body = { contents: [{ role:"user", parts:[{ text:system }] }, { role:"user", parts:[{ text:promptText }] }] };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent`, {
    method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':GEMINI_API_KEY}, body:JSON.stringify(body)
  });
  const j = await res.json();
  if(j.error) throw new Error(j.error.message||JSON.stringify(j.error));
  return j?.candidates?.[0]?.content?.parts?.[0]?.text||'';
}

// CORREÇÃO V2.1: Função de imagem revertida para usar a callTextAPI, instruindo o modelo
async function callImageAPI(promptText){
  const system = 'Você é um gerador de imagens. Dada a descrição, use a sua ferramenta interna para criar uma imagem e retornar a URL ou o Base64. Se não puder, diga que não é possível e gere uma descrição detalhada para o DALL-E.';
  const body = { contents: [{ role:"user", parts:[{ text:system }] }, { role:"user", parts:[{ text:`Gere uma imagem com base nesta descrição: ${promptText}` }] }] };
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`, { // Usa o modelo 'pro'
    method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':GEMINI_API_KEY}, body:JSON.stringify(body)
  });
  
  const j = await res.json();
  if(j.error) throw new Error(j.error.message||JSON.stringify(j.error));
  
  const textResponse = j?.candidates?.[0]?.content?.parts?.[0]?.text||'';
  
  // Tenta extrair a URL diretamente (se o modelo a forneceu)
  const urlMatch = textResponse.match(/(http[s]?:\/\/[^\s]+)/i);
  const base64Match = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  return { 
    base64: base64Match, 
    url: urlMatch ? urlMatch[0] : null, 
    raw: j,
    text: textResponse
  };
}

// --- Parse and render code/text ---
function extractCodeBlocks(text){
  const re=/```(\w*)\n([\s\S]*?)```/g, blocks=[]; let m;
  while((m=re.exec(text))!==null) blocks.push({lang:m[1]||'', code:m[2].trim()});
  return blocks;
}
function renderMixedResponse(text){
  const blocks = extractCodeBlocks(text);
  if(blocks.length===0){ addBotText(text.trim()); return; }
  const fenceRe=/```(\w*)\n([\s\S]*?)```/g;
  let lastIndex=0, m, parts=[];
  while((m=fenceRe.exec(text))!==null){
    const preText=text.slice(lastIndex,m.index).trim();
    if(preText) parts.push({type:'text', content:preText});
    parts.push({type:'code', lang:m[1]||'', content:m[2].trim()});
    lastIndex=fenceRe.lastIndex;
  }
  const tail=text.slice(lastIndex).trim(); if(tail) parts.push({type:'text', content:tail});
  parts.forEach(p=>{
    if(p.type==='text') addBotText(p.content);
    else { const filename=p.lang==='html'?'index.html':p.lang==='css'?'style.css':p.lang.includes('js')?'script.js':'file.txt'; addCodeBlock(p.content,filename); }
  });
}

// --- Button handlers ---
// Enviar
document.getElementById('pegasus-send').onclick = async ()=>{
  const prompt=document.getElementById('pegasus-prompt').value.trim(); if(!prompt){ alert('Digite algo.'); return; }
  addUserMsg(prompt); addBotText('⏳ Processando...');
  try{ const text=await callTextAPI(prompt); chatBox.lastChild.remove(); renderMixedResponse(text); }
  catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro: '+e.message); console.error(e); }
  document.getElementById('pegasus-prompt').value='';
};
// Gerar imagem
document.getElementById('pegasus-img').onclick=async()=>{
  const prompt=document.getElementById('pegasus-prompt').value.trim(); if(!prompt){ alert('Digite descrição da imagem.'); return; }
  addUserMsg('[Imagem] '+prompt); addBotText('⏳ Solicitando geração de imagem...');
  try{
    const r=await callImageAPI(prompt); chatBox.lastChild.remove();

    if(r.base64 || r.url){
        const img=document.createElement('img'); img.style.maxWidth='100%'; img.style.borderRadius='8px'; img.style.margin='6px 0';
        if(r.base64) img.src='data:image/png;base64,'+r.base64; else if(r.url) img.src=r.url;
        addBotText('✅ Imagem gerada:');
        chatBox.appendChild(img); 
    } else {
        // Se a imagem não for retornada, mostra a resposta do modelo (descrição, erro, etc.)
        addBotText('A Gemini API não retornou o Base64/URL da imagem diretamente.');
        addBotText(r.text || 'Resposta da API curta (checar console para detalhes): ' + JSON.stringify(r.raw).slice(0,200));
    }
    chatBox.scrollTop=chatBox.scrollHeight;
  }catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro: '+e.message); console.error(e); }
  document.getElementById('pegasus-prompt').value='';
};
// Gerar projeto
document.getElementById('pegasus-proj').onclick=async()=>{
  const prompt=document.getElementById('pegasus-prompt').value.trim()||'Crie um site simples com index.html, style.css, script.js.';
  addUserMsg('[Gerar Projeto] '+prompt); addBotText('⏳ Gerando projeto...');
  try{
    const text=await callTextAPI(`Por favor gere arquivos separados em blocos \`\`\`html\`, \`\`\`css\` e \`\`\`js\` conforme pedido: ${prompt}`); 
    chatBox.lastChild.remove(); renderMixedResponse(text); addBotText('Arquivos acima — use “Copiar” ou “Baixar”.'); 
  }catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro: '+e.message); } 
  document.getElementById('pegasus-prompt').value=''; 
};
// Gerar script clonar
document.getElementById('pegasus-clone').onclick=async()=>{
  const target=prompt("URL do site público para clonar (HTML, CSS, JS, Imagens, TUDO):"); if(!target) return;
  if(!confirm("⚠️ AVISO: A clonagem é uma extração agressiva. Só use com permissão expressa do proprietário do site. Continuar?")) return;
  addUserMsg('[Clonar Site - TUDO] '+target); addBotText('⏳ Gerando scripts de clonagem (Wget, HTTrack, Node.js/Puppeteer)...');
  try{
    const url=new URL(target), domain=url.hostname;
    const prompt=`Gere comandos wget, httrack e um script Puppeteer/Playwright (Node.js) para CLONAGEM TOTAL E RECURSIVA de ${target}, incluindo HTML, CSS, JavaScript, imagens e outros recursos. Forneça apenas blocos de código com a linguagem identificada.`;
    const text=await callTextAPI(prompt); chatBox.lastChild.remove(); renderMixedResponse(text);
  }catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro: '+e.message); }
};

// --- Extrair e Enviar Tudo
document.getElementById('pegasus-extract').onclick=async()=>{
  if(!confirm("⚠️ AVISO: Extração TOTAL. Só use com permissão expressa em páginas públicas. Continuar?")) return;
  addUserMsg('[Extrair TUDO]');
  addBotText('⏳ Extraindo HTML, Texto, Imagens e Links...');
  try{
    // HTML COMPLETO (Amostra limitada a 50k caracteres)
    let htmlContent=document.documentElement.outerHTML.substring(0, 50000); 
    let textContent=document.body.innerText||'';
    let imgs = Array.from(document.images).map(img=>img.src).filter(Boolean);
    let links = Array.from(document.querySelectorAll('a')).map(a=>a.href).filter(h=>h.startsWith('http'));

    let promptText=`Extrair e analisar o máximo de informação desta página:\nURL: ${location.href}\n\nHTML (Amostra):\n${htmlContent}\n\nTexto Visível:\n${textContent}\n\nImagens Encontradas:\n${imgs.join('\n')}\n\nLinks Encontrados:\n${links.join('\n')}\n\nGere sugestões de código, resumos, insights e qualquer saída multimodal que achar útil.`;
    addBotTextRaw('Conteúdo extraído (amostra do HTML, texto completo, imagens e links) enviado para análise.');
    const text=await callTextAPI(promptText);
    chatBox.lastChild.remove();
    renderMixedResponse(text);
  }catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro: '+e.message); console.error(e); }
};

// --- Extrair Perguntas/Resposta Automática
document.getElementById('pegasus-qna').onclick=async()=>{
  if(!confirm("⚠️ AVISO: Extrai o conteúdo e tenta responder automaticamente. Só use para fins educativos e com permissão. Continuar?")) return;
  addUserMsg('[Extrair Perguntas e Responder Automaticamente]');
  addBotText('⏳ Extraindo conteúdo da página e buscando respostas...');
  try{
    let htmlContent=document.documentElement.outerHTML.substring(0, 50000); 
    let textContent=document.body.innerText||'';

    let promptText=`
A página atual é: ${location.href}
TEXTO: ${textContent}
HTML: ${htmlContent}

Sua tarefa é analisar o conteúdo acima (questionários, formulários, alternativas, campos de entrada, etc.).
1.  **Responda** às perguntas encontradas com base no seu conhecimento, gerando as respostas.
2.  **Gere um script JavaScript completo** (\`\`\`js\`) para ser executado no console, que irá **automaticamente preencher ou selecionar as respostas corretas/sugeridas** na página. O script deve ser robusto, usando seletores CSS ou XPath e deve incluir comentários explicando o que está sendo preenchido/selecionado.

Priorize gerar o script de preenchimento de forma funcional.
`;
    addBotTextRaw('Conteúdo de perguntas e formulários extraído para análise de resposta e geração de script de preenchimento automático.');
    const text=await callTextAPI(promptText);
    chatBox.lastChild.remove();
    renderMixedResponse(text);
    addBotText('As respostas e o script de preenchimento automático foram gerados. **Use o script com cautela e sob sua total responsabilidade.**');
  }catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro: '+e.message); console.error(e); }
};

// Enter para enviar
document.getElementById('pegasus-prompt').addEventListener('keydown', function(e){
  if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); document.getElementById('pegasus-send').click(); }
});

// --- drag support ---
(function(){
  const header=document.getElementById('pegasus-header'); let dragging=false, ox=0, oy=0;
  header.addEventListener('mousedown',(ev)=>{ dragging=true; ox=ev.clientX; oy=ev.clientY; document.body.style.userSelect='none'; });
  window.addEventListener('mousemove',(ev)=>{ 
    if(!dragging) return; 
    const dx=ev.clientX-ox, dy=ev.clientY-oy; 
    const rect=overlay.getBoundingClientRect(); 
    // Mude a posição baseada em 'right' e 'bottom' para 'left' e 'top' para permitir o arrasto
    overlay.style.right='auto'; overlay.style.bottom='auto'; 
    overlay.style.left=(rect.left+dx)+'px'; 
    overlay.style.top=(rect.top+dy)+'px'; 
    ox=ev.clientX; oy=ev.clientY; 
  });
  window.addEventListener('mouseup',()=>{ dragging=false; document.body.style.userSelect='auto'; });
})();

// notas finais
addBotText('✅ Pegasus Chat V2.1 pronto. Design renovado e correção na chamada de imagem aplicada.');
addBotText('⚠️ Lembrete: Use as funcionalidades de clonagem e extração total com responsabilidade e APENAS em sites públicos ou com permissão expressa.');
})();
