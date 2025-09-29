javascript:(async function(){
/* Pegasus Tarefas — Versão multimodal completa
   - Texto (completas), imagens (generateImage), código (blocos/copy), gerar projeto, gerar scripts de clonagem (wget/puppeteer).
   - Use apenas em sites públicos ou com permissão. Não contorne autenticações.
*/

const GEMINI_TEXT_MODEL = "gemini-2.5-flash"; // modelo para texto
const GEMINI_IMAGE_MODEL = "gemini-1.5-pro";  // modelo para imagens (endpoint :generateImage)
let GEMINI_API_KEY = sessionStorage.getItem("pegasus_gemini_token_v1") || "";

if(!GEMINI_API_KEY){
  GEMINI_API_KEY = prompt("Pegasus Tarefas — Cole sua Google Gemini API Key (será salva em sessionStorage):");
  if(!GEMINI_API_KEY){
    alert("É necessário informar a API Key para usar o Pegasus Tarefas.");
    return;
  }
  sessionStorage.setItem("pegasus_gemini_token_v1", GEMINI_API_KEY);
}

// helpers
function el(html){ const div = document.createElement('div'); div.innerHTML = html; return div.firstElementChild;}
function blobDownload(filename, content, mime='text/plain'){ const b = new Blob([content], {type: mime}); const url = URL.createObjectURL(b); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function createCodeBlock(code, lang='') {
  const pre = document.createElement('pre');
  const codeEl = document.createElement('code');
  codeEl.textContent = code;
  pre.appendChild(codeEl);
  // copy button
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.style.margin = '8px 0';
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copiar';
  copyBtn.style.position = 'absolute';
  copyBtn.style.right = '6px';
  copyBtn.style.top = '6px';
  copyBtn.style.padding = '4px 8px';
  copyBtn.onclick = ()=>{ navigator.clipboard.writeText(code).then(()=>{ copyBtn.textContent = 'Copiado!'; setTimeout(()=>copyBtn.textContent='Copiar',1200); }); };
  wrap.appendChild(copyBtn);
  wrap.appendChild(pre);
  return wrap;
}

// create UI overlay
if(document.getElementById('pegasus-tarefas-overlay')) {
  document.getElementById('pegasus-tarefas-overlay').remove();
  document.getElementById('pegasus-tarefas-float')?.remove();
}
const overlay = document.createElement('div');
overlay.id = 'pegasus-tarefas-overlay';
overlay.style.cssText = [
  'position:fixed','right:30px','bottom:90px','width:520px','max-height:75vh',
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
    <input id="pegasus-prompt" placeholder="Digite sua pergunta, peça site, peça projeto, diga: gerar imagem / clonar site / gerar projeto..." style="padding:10px;border-radius:8px;border:1px solid rgba(0,255,0,0.12);background:#000;color:#fff;font-size:13px" />
    <div style="display:flex;gap:8px">
      <button id="pegasus-send" style="flex:1;padding:10px;border-radius:8px;background:#0f0;color:#000;font-weight:700;cursor:pointer">Enviar (Completo)</button>
      <button id="pegasus-img" style="padding:10px;border-radius:8px;background:#00d4ff;color:#000;font-weight:700;cursor:pointer">Gerar Imagem</button>
      <button id="pegasus-proj" style="padding:10px;border-radius:8px;background:#ffb86b;color:#000;font-weight:700;cursor:pointer">Gerar Projeto</button>
      <button id="pegasus-clone" style="padding:10px;border-radius:8px;background:#ff6b6b;color:#000;font-weight:700;cursor:pointer">Gerar Script Clonar</button>
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
floatBtn.onclick = ()=> overlay.style.display = overlay.style.display === 'none' ? 'flex' : 'none';
document.body.appendChild(floatBtn);

// close
document.getElementById('pegasus-hide').onclick = ()=> overlay.style.display='none';

// chat helpers
const chatBox = document.getElementById('pegasus-chat');
function addUserMsg(text){ const d = document.createElement('div'); d.style.textAlign='right'; d.style.margin='8px 0'; d.innerHTML = `<div style="display:inline-block;background:#003d24;color:#fff;padding:8px 10px;border-radius:8px;max-width:86%">${escapeHtml(text)}</div>`; chatBox.appendChild(d); chatBox.scrollTop = chatBox.scrollHeight;}
function addBotText(text){ const d = document.createElement('div'); d.style.textAlign='left'; d.style.margin='8px 0'; d.innerHTML = `<div style="display:inline-block;background:#061206;color:#b8ffb8;padding:8px 10px;border-radius:8px;max-width:86%">${escapeHtml(text)}</div>`; chatBox.appendChild(d); chatBox.scrollTop = chatBox.scrollHeight;}
function addBotHtml(html){ const d = document.createElement('div'); d.style.textAlign='left'; d.style.margin='8px 0'; const box = document.createElement('div'); box.style.background='#061206'; box.style.color='#b8ffb8'; box.style.padding='8px 10px'; box.style.borderRadius='8px'; box.style.maxWidth='92%'; box.innerHTML = html; d.appendChild(box); chatBox.appendChild(d); chatBox.scrollTop = chatBox.scrollHeight;}
function addCodeBlock(code, filename){ const wrapper = createCodeBlock(code); const dlBtn = document.createElement('button'); dlBtn.textContent = 'Baixar'; dlBtn.style.marginLeft='8px'; dlBtn.onclick = ()=> blobDownload(filename||'code.txt', code, 'text/plain'); wrapper.style.background='rgba(0,0,0,0.06)'; addBotHtml(''); const container = document.createElement('div'); container.style.margin='8px 0'; container.appendChild(wrapper); container.appendChild(dlBtn); chatBox.appendChild(container); chatBox.scrollTop = chatBox.scrollHeight; }

// escape html for safe display
function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }

// API calls
async function callTextAPI(promptText){
  const system = `Você é Pegasus Tarefas — responda no modo COMPLETO. Gere respostas técnicas, código, ou instruções quando solicitado. Se gerar código, entregue somente o código em blocos claros. Se gerar instruções para clonar, forneça comandos e um script Puppeteer pronto para uso. Mencione sempre avisos de ética quando relevante.`;
  const body = {
    contents: [
      { role: "user", parts: [{ text: system }] },
      { role: "user", parts: [{ text: promptText }] }
    ]
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify(body)
  });
  const j = await res.json();
  if(j.error) throw new Error(j.error.message || JSON.stringify(j.error));
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

async function callImageAPI(promptText, size='1024x1024'){
  // NOTE: API response structure may vary by account/region.
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateImage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      prompt: { text: promptText },
      // optional params may be accepted by your account (size, format)
      // size: size
    })
  });
  const j = await resp.json();
  if(j.error) throw new Error(j.error.message || JSON.stringify(j.error));
  // try common fields: samples[0].image or data? or imageBase64
  const base64 = j?.image?.b64 || j?.images?.[0]?.b64 || j?.candidates?.[0]?.content?.image?.b64 || j?.artifacts?.[0]?.base64;
  const url = j?.image?.uri || j?.images?.[0]?.uri || j?.candidates?.[0]?.content?.image?.uri;
  return { base64, url, raw: j };
}

// BUTTON handlers
document.getElementById('pegasus-send').onclick = async ()=>{
  const prompt = document.getElementById('pegasus-prompt').value.trim();
  if(!prompt){ alert('Digite sua pergunta ou comando.'); return; }
  addUserMsg(prompt);
  addBotText('⏳ Processando...');
  try{
    const text = await callTextAPI(prompt);
    chatBox.lastChild.remove(); // remove loading
    // show as text, but if code fences exist, parse and show blocks
    renderMixedResponse(text);
  }catch(e){
    chatBox.lastChild.remove();
    addBotText('❌ Erro: ' + e.message);
    console.error(e);
  }
  document.getElementById('pegasus-prompt').value='';
};

document.getElementById('pegasus-img').onclick = async ()=>{
  const prompt = document.getElementById('pegasus-prompt').value.trim();
  if(!prompt){ alert('Digite a descrição da imagem no campo.'); return; }
  addUserMsg('[Imagem] ' + prompt);
  addBotText('⏳ Gerando imagem...');
  try{
    const r = await callImageAPI(prompt);
    chatBox.lastChild.remove();
    if(r.base64){
      const img = document.createElement('img');
      img.src = 'data:image/png;base64,' + r.base64;
      img.style.maxWidth = '100%'; img.style.borderRadius='8px'; img.style.margin='6px 0';
      addBotHtml('<div style="padding:6px;background:#081108;border-radius:8px">'+
        `<div style="font-size:12px;color:#9ff; margin-bottom:6px">Imagem gerada:</div></div>`);
      chatBox.appendChild(img);
      chatBox.scrollTop = chatBox.scrollHeight;
    } else if(r.url){
      const img = document.createElement('img');
      img.src = r.url;
      img.style.maxWidth = '100%'; img.style.borderRadius='8px'; img.style.margin='6px 0';
      chatBox.appendChild(img);
      chatBox.scrollTop = chatBox.scrollHeight;
    } else {
      addBotText('Imagem gerada — resposta: ' + JSON.stringify(r.raw).slice(0,200) + '...');
    }
  }catch(e){
    chatBox.lastChild.remove();
    addBotText('❌ Erro ao gerar imagem: ' + e.message);
    console.error(e);
  }
  document.getElementById('pegasus-prompt').value='';
};

document.getElementById('pegasus-proj').onclick = async ()=>{
  const prompt = document.getElementById('pegasus-prompt').value.trim() || 'Crie um site simples de landing page com header, seção de features e footer. Forneça três arquivos: index.html, style.css, script.js.';
  addUserMsg('[Gerar Projeto] ' + prompt);
  addBotText('⏳ Gerando projeto...');
  try{
    const combinePrompt = `Por favor gere os arquivos separados para um projeto web conforme pedido. Responda usando blocos de código com \`\`\`html\`, \`\`\`css\` e \`\`\`js\`. Não adicione explicações extras. Arquivos: index.html, style.css, script.js. Conteúdo: ${prompt}`;
    const text = await callTextAPI(combinePrompt);
    chatBox.lastChild.remove();
    renderMixedResponse(text, true);
    addBotText('Os arquivos aparecem acima — use “Copiar” ou “Baixar”.');
  }catch(e){
    chatBox.lastChild.remove();
    addBotText('❌ Erro: ' + e.message);
  }
  document.getElementById('pegasus-prompt').value='';
};

document.getElementById('pegasus-clone').onclick = async ()=>{
  const target = prompt("Informe a URL do site público que quer gerar scripts para clonar (ex: https://example.com). Use apenas em sites públicos ou com permissão:");
  if(!target) return;
  // confirm ethics
  const ok = confirm("Aviso: só gere esses scripts se você tem permissão para acessar/baixar esse site. Não use para contornar autenticação. Continuar?");
  if(!ok) return;
  addUserMsg('[Gerar Script Clonar] ' + target);
  addBotText('⏳ Gerando scripts de clonagem (wget, httrack, puppeteer)...');
  try{
    // prompt to generate puppeteer/wget content
    const prompt = `Gere três saídas para clonar/baixar o site ${target}:
1) Um comando wget para baixar o site inteiro para uso offline (com explicação mínima, apenas a linha de comando).
2) Um comando httrack equivalente.
3) Um script Puppeteer (Node.js) que abre a URL, aguarda carregamento completo (networkidle2), salva o HTML renderizado em 'page.html' e faz screenshot 'screenshot.png'. Forneça somente os blocos de código e os comandos, sem explicações longas.`;
    const text = await callTextAPI(prompt);
    chatBox.lastChild.remove();
    renderMixedResponse(text, true);

    // additionally, extract code fences to provide downloads
    const codeBlocks = extractCodeBlocks(text);
    codeBlocks.forEach((cb, idx)=>{
      const fn = cb.lang && cb.lang.includes('js') ? `puppeteer_clone.js` : (cb.lang==='bash' ? `clone_command_${idx+1}.sh` : `file_${idx+1}.txt`);
      addCodeBlock(cb.code, fn);
    });
    addBotText('Scripts prontos — copie ou baixe. Rode o script Puppeteer localmente (Node.js).');
  }catch(e){
    chatBox.lastChild.remove();
    addBotText('❌ Erro: ' + e.message);
  }
};

// parse and render mixed response: detect triple-backtick blocks and display as code
function extractCodeBlocks(text){
  const re = /```(\w*)\n([\s\S]*?)```/g;
  const blocks = [];
  let m;
  while((m = re.exec(text)) !== null){
    blocks.push({ lang: m[1]||'', code: m[2].trim() });
  }
  return blocks;
}

function renderMixedResponse(text, preferBlocks=false){
  // if contains ``` fences -> extract and render each in order with surrounding text
  const blocks = extractCodeBlocks(text);
  if(blocks.length===0){
    // no code fences: just print text (trim and show)
    addBotText(text.trim());
    return;
  }
  // split by fences to interleave text and blocks
  const parts = [];
  let lastIndex = 0;
  const fenceRe = /```(\w*)\n([\s\S]*?)```/g;
  let m;
  while((m = fenceRe.exec(text)) !== null){
    const start = m.index;
    const preText = text.slice(lastIndex, start).trim();
    if(preText) parts.push({type:'text', content:preText});
    parts.push({type:'code', lang: m[1]||'', content: m[2].trim()});
    lastIndex = fenceRe.lastIndex;
  }
  const tail = text.slice(lastIndex).trim();
  if(tail) parts.push({type:'text', content:tail});

  // render parts
  parts.forEach(p=>{
    if(p.type==='text'){
      addBotText(p.content);
    } else {
      const filename = (p.lang==='html'?'index.html':(p.lang==='css'?'style.css':(p.lang.includes('js')?'script.js':'file.txt')));
      addCodeBlock(p.content, filename);
    }
  });
}

// allow pressing Enter to send
document.getElementById('pegasus-prompt').addEventListener('keydown', function(e){
  if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); document.getElementById('pegasus-send').click(); }
});

// drag support
(function(){
  const header = document.getElementById('pegasus-header');
  let dragging=false, ox=0, oy=0;
  header.addEventListener('mousedown', (ev)=>{ dragging=true; ox=ev.clientX; oy=ev.clientY; document.body.style.userSelect='none'; });
  window.addEventListener('mousemove', (ev)=>{ if(!dragging) return; const dx=ev.clientX-ox, dy=ev.clientY-oy; const rect = overlay.getBoundingClientRect(); overlay.style.right='auto'; overlay.style.bottom='auto'; overlay.style.left = (rect.left + dx) + 'px'; overlay.style.top = (rect.top + dy) + 'px'; ox=ev.clientX; oy=ev.clientY; });
  window.addEventListener('mouseup', ()=>{ dragging=false; document.body.style.userSelect='auto'; });
})();

// final note in chat
addBotText('✅ Pegasus Tarefas pronto. Use o campo abaixo e escolha: Enviar (texto/código), Gerar Imagem (imagem no chat), Gerar Projeto (index/style/script) ou Gerar Script Clonar (wget/httrack/puppeteer).');

// ETHICS / REMINDERS (brief)
addBotText('⚠️ Lembrete: use essas ferramentas apenas em conteúdo público ou com permissão. Não auxilio em burlar autenticação, provas ou violar direitos autorais.');

})();
