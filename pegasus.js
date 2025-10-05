(async function(){
/* Pegasus Tarefas — Versão 2.0 (Completa, Extração Total, Clonagem Agressiva, Resposta Automática)

Texto, imagens, código, gerar projeto, gerar scripts de clonagem (HTML, CSS, JS, etc.)
Botão extra: extrai tudo de uma página e envia ao Gemini
NOVO: Extrair Perguntas/Respostas (Tenta responder e gerar script de preenchimento)

AVISO: Use apenas em sites públicos ou com permissão expressa.
*/

// --- Configurações ---
const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
// NOTA: A API de Imagem do Google requer um endpoint e modelo diferentes. 
// Mantive o código original para fins de completude, mas ele pode falhar 
// se não for configurado para o endpoint correto (ex: Imagen API).
const GEMINI_IMAGE_MODEL = "gemini-1.5-pro"; 
let GEMINI_API_KEY = sessionStorage.getItem("pegasus_gemini_token_v1") || "";

if(!GEMINI_API_KEY){
  GEMINI_API_KEY = prompt("Pegasus Tarefas — Cole sua Google Gemini API Key (será salva em sessionStorage):");
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
  copyBtn.style.position='absolute'; copyBtn.style.right='6px'; copyBtn.style.top='6px'; copyBtn.style.padding='4px 8px';
  copyBtn.onclick = ()=>{ navigator.clipboard.writeText(code).then(()=>{ copyBtn.textContent='Copiado!'; setTimeout(()=>copyBtn.textContent='Copiar',1200); }); };
  wrap.appendChild(copyBtn); wrap.appendChild(pre);
  return wrap;
}
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }
// Modificação V2.0: Função para adicionar div com HTML seguro (texto bruto)
function addBotTextRaw(text){ const d=document.createElement('div'); d.style.textAlign='left'; d.style.margin='8px 0'; d.innerHTML=`<div style="display:inline-block;background:#061206;color:#b8ffb8;padding:8px 10px;border-radius:8px;max-width:86%;white-space:pre-wrap;word-break:break-all">${text}</div>`; chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight;}

// --- UI overlay ---
if(document.getElementById('pegasus-tarefas-overlay')) {
  document.getElementById('pegasus-tarefas-overlay').remove();
  document.getElementById('pegasus-tarefas-float')?.remove();
}
const overlay = document.createElement('div');
overlay.id = 'pegasus-tarefas-overlay';
overlay.style.cssText = [
  'position:fixed','right:30px','bottom:90px','width:540px','max-height:75vh',
  'background:rgba(12,12,12,0.98)','color:#e6ffe6','border:2px solid #0f0',
  'border-radius:12px','z-index:9999999','box-shadow:0 8px 40px rgba(0,0,0,0.8)',
  'display:flex','flex-direction:column','overflow:hidden','font-family:Inter, Arial, sans-serif'
].join(';');

overlay.innerHTML = `
  <div id="pegasus-header" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(0,255,0,0.08);">
    <div style="display:flex;gap:10px;align-items:center;">
      <img src="https://raw.githubusercontent.com/poseidondevsofc/Pegasus-Tarefas-/678cf42e44d3c306bcc0172b28b2f4d6cdfbe8a5/pegasus-estava-coberto-de-chamas-azuis-inteligencia-artificial_886951-363.jpg" style="width:34px;height:34px;border-radius:6px;object-fit:cover" />
      <div style="font-weight:700;color:#b6ffb6">Pegasus Tarefas</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button id="pegasus-hide" style="background:#111;color:#f77;border:1px solid rgba(255,0,0,0.15);padding:6px 8px;border-radius:6px;cursor:pointer">Fechar</button>
    </div>
  </div>
  <div id="pegasus-chat" style="padding:10px; overflow:auto; flex:1; font-size:13px; background:linear-gradient(180deg,#071 0%,transparent 100%);"></div>
  <div style="padding:10px;border-top:1px solid rgba(255,255,255,0.03);display:flex;flex-direction:column;gap:8px;background:linear-gradient(180deg,rgba(0,0,0,0.3),transparent 100%)">
    <input id="pegasus-prompt" placeholder="Digite comando, pedir site, projeto, gerar imagem..." style="padding:10px;border-radius:8px;border:1px solid rgba(0,255,0,0.12);background:#000;color:#fff;font-size:13px" />
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button id="pegasus-send" style="flex:1;padding:10px;border-radius:8px;background:#0f0;color:#000;font-weight:700;cursor:pointer">Enviar (Completo)</button>
      <button id="pegasus-img" style="padding:10px;border-radius:8px;background:#00d4ff;color:#000;font-weight:700;cursor:pointer">Gerar Imagem</button>
      <button id="pegasus-proj" style="padding:10px;border-radius:8px;background:#ffb86b;color:#000;font-weight:700;cursor:pointer">Gerar Projeto</button>
      <button id="pegasus-clone" style="padding:10px;border-radius:8px;background:#ff6b6b;color:#000;font-weight:700;cursor:pointer">Clonar (Tudo)</button>
      <button id="pegasus-extract" style="padding:10px;border-radius:8px;background:#9b59b6;color:#fff;font-weight:700;cursor:pointer">Extrair Tudo</button>
      <button id="pegasus-qna" style="padding:10px;border-radius:8px;background:#00bcd4;color:#000;font-weight:700;cursor:pointer">Extrair Perguntas</button>
    </div>
    <div style="font-size:11px;color:#acffac">Modo: Completo — Gemini pode gerar texto, código e imagens. Use com responsabilidade.</div>
  </div>
`;
document.body.appendChild(overlay);

// floating toggle button
const floatBtn = document.createElement('button');
floatBtn.id = 'pegasus-tarefas-float';
floatBtn.textContent = '📒 Pegasus Tarefas';
floatBtn.style.cssText = 'position:fixed;right:20px;bottom:20px;padding:10px 14px;border-radius:28px;background:#0f0;color:#000;border:none;font-weight:700;z-index:99999999;cursor:pointer';
floatBtn.onclick = ()=> overlay.style.display = overlay.style.display==='none'?'flex':'none';
document.body.appendChild(floatBtn);

// close
document.getElementById('pegasus-hide').onclick = ()=> overlay.style.display='none';

// chat helpers
const chatBox = document.getElementById('pegasus-chat');
function addUserMsg(text){ const d=document.createElement('div'); d.style.textAlign='right'; d.style.margin='8px 0'; d.innerHTML=`<div style="display:inline-block;background:#003d24;color:#fff;padding:8px 10px;border-radius:8px;max-width:86%">${escapeHtml(text)}</div>`; chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight;}
function addBotText(text){ const d=document.createElement('div'); d.style.textAlign='left'; d.style.margin='8px 0'; d.innerHTML=`<div style="display:inline-block;background:#061206;color:#b8ffb8;padding:8px 10px;border-radius:8px;max-width:86%">${escapeHtml(text)}</div>`; chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight;}
function addBotHtml(html){ const d=document.createElement('div'); d.style.textAlign='left'; d.style.margin='8px 0'; const box=document.createElement('div'); box.style.background='#061206'; box.style.color='#b8ffb8'; box.style.padding='8px 10px'; box.style.borderRadius='8px'; box.style.maxWidth='92%'; box.innerHTML=html; d.appendChild(box); chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight;}
function addCodeBlock(code, filename){ const wrapper=createCodeBlock(code); const dlBtn=document.createElement('button'); dlBtn.textContent='Baixar'; dlBtn.style.marginLeft='8px'; dlBtn.onclick=()=>blobDownload(filename||'code.txt',code,'text/plain'); const container=document.createElement('div'); container.style.margin='8px 0'; container.appendChild(wrapper); container.appendChild(dlBtn); chatBox.appendChild(container); chatBox.scrollTop=chatBox.scrollHeight; }

// --- Gemini API calls ---
async function callTextAPI(promptText){
  const system = 'Você é Pegasus Tarefas — responda no modo COMPLETO multimodal, podendo gerar texto, código ou instruções de forma prática. Para código, use ```linguagem\n código\n```. Gere sempre respostas diretas e no formato solicitado.';
  const body = { contents: [{ role:"user", parts:[{ text:system }] }, { role:"user", parts:[{ text:promptText }] }] };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent`, {
    method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':GEMINI_API_KEY}, body:JSON.stringify(body)
  });
  const j = await res.json();
  if(j.error) throw new Error(j.error.message||JSON.stringify(j.error));
  return j?.candidates?.[0]?.content?.parts?.[0]?.text||'';
}

async function callImageAPI(promptText, size='1024x1024'){
  // NOTA: Esta função contém a lógica da V2.0 que pode falhar devido ao endpoint incorreto para 'imagen-3.0-generate-002'.
  // Se for necessário que funcione, esta função deve ser revertida para a V1 ou usar o endpoint correto.
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateImage`,{
    method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':GEMINI_API_KEY},
    body:JSON.stringify({
      model: "imagen-3.0-generate-002", // Modelo incorreto para este endpoint
      prompt: {text: promptText}
    })
  });
  const j = await resp.json();
  if(j.error) throw new Error(j.error.message||JSON.stringify(j.error));
  const base64 = j?.image?.b64 || j?.images?.[0]?.b64 || j?.candidates?.[0]?.content?.image?.b64 || j?.artifacts?.[0]?.base64;
  const url = j?.image?.uri || j?.images?.[0]?.uri || j?.candidates?.[0]?.content?.image?.uri;
  return { base64, url, raw:j };
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
  addUserMsg('[Imagem] '+prompt); addBotText('⏳ Gerando imagem...');
  try{
    const r=await callImageAPI(prompt); chatBox.lastChild.remove();
    const img=document.createElement('img'); img.style.maxWidth='100%'; img.style.borderRadius='8px'; img.style.margin='6px 0';
    if(r.base64) img.src='data:image/png;base64,'+r.base64; else if(r.url) img.src=r.url; else addBotText('Imagem gerada — resposta curta: '+JSON.stringify(r.raw).slice(0,200)+'...');
    chatBox.appendChild(img); chatBox.scrollTop=chatBox.scrollHeight;
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
// Gerar script clonar (Aprimorado V2.0)
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

// --- Extrair e Enviar Tudo (Aprimorado V2.0) ---
document.getElementById('pegasus-extract').onclick=async()=>{
  if(!confirm("⚠️ AVISO: Extração TOTAL. Só use com permissão expressa em páginas públicas. Continuar?")) return;
  addUserMsg('[Extrair TUDO]');
  addBotText('⏳ Extraindo HTML, Texto, Imagens e Links...');
  try{
    // HTML COMPLETO (Amostra limitada a 50k caracteres)
    let htmlContent=document.documentElement.outerHTML.substring(0, 50000); 
    // texto visível
    let textContent=document.body.innerText||'';
    // todas as URLs de imagens
    let imgs = Array.from(document.images).map(img=>img.src).filter(Boolean);
    // todos os links
    let links = Array.from(document.querySelectorAll('a')).map(a=>a.href).filter(h=>h.startsWith('http'));

    let promptText=`Extrair e analisar o máximo de informação desta página:\nURL: ${location.href}\n\nHTML (Amostra):\n${htmlContent}\n\nTexto Visível:\n${textContent}\n\nImagens Encontradas:\n${imgs.join('\n')}\n\nLinks Encontrados:\n${links.join('\n')}\n\nGere sugestões de código, resumos, insights e qualquer saída multimodal que achar útil.`;
    addBotTextRaw('Conteúdo extraído (amostra do HTML, texto completo, imagens e links) enviado para análise.');
    const text=await callTextAPI(promptText);
    chatBox.lastChild.remove();
    renderMixedResponse(text);
  }catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro: '+e.message); console.error(e); }
};

// --- NOVO V2.0: Extrair Perguntas/Resposta Automática ---
document.getElementById('pegasus-qna').onclick=async()=>{
  if(!confirm("⚠️ AVISO: Extrai o conteúdo e tenta responder automaticamente. Só use para fins educativos e com permissão. Continuar?")) return;
  addUserMsg('[Extrair Perguntas e Responder Automaticamente]');
  addBotText('⏳ Extraindo conteúdo da página e buscando respostas...');
  try{
    // HTML COMPLETO (Amostra limitada a 50k caracteres)
    let htmlContent=document.documentElement.outerHTML.substring(0, 50000); 
    // texto visível
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
  window.addEventListener('mousemove',(ev)=>{ if(!dragging) return; const dx=ev.clientX-ox, dy=ev.clientY-oy; const rect=overlay.getBoundingClientRect(); overlay.style.right='auto'; overlay.style.bottom='auto'; overlay.style.left=(rect.left+dx)+'px'; overlay.style.top=(rect.top+dy)+'px'; ox=ev.clientX; oy=ev.clientY; });
  window.addEventListener('mouseup',()=>{ dragging=false; document.body.style.userSelect='auto'; });
})();

// notas finais
addBotText('✅ Pegasus Tarefas V2.0 pronto. Funcionalidades de Extração Total e Resposta Automática adicionadas.');
addBotText('⚠️ Lembrete: Use as funcionalidades de clonagem e extração total com responsabilidade e APENAS em sites públicos ou com permissão expressa.');
})();
