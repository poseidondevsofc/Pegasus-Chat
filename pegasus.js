javascript:(async function(){
/* Pegasus Chat — Versão 1.1 — Atualizado: relógio em tempo real, "notebook" com truque de invisibilidade, clone gera HTML completo, extract pergunta ao usuário, projeto pergunta preferências */

// --- Configurações ---
const APP_VERSION = "1.1";
let GEMINI_API_KEY = sessionStorage.getItem("pegasus_gemini_token_v1") || "";
const LOGO_URL = "https://raw.githubusercontent.com/poseidondevsofc/Pegasus-Chat/fdc6c5e434f3b1577298b7ba3f5bea5ec5f36654/PegasusIcon.png";
const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const IMAGEN_MODEL = "imagen-4.0-generate-001";
const IMAGEN_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict`;

// pede API key se não existir
if(!GEMINI_API_KEY){
  GEMINI_API_KEY = prompt("Pegasus Chat — Cole sua Google Gemini API Key (será salva em sessionStorage):");
  if(!GEMINI_API_KEY){ alert("API Key necessária."); return; }
  sessionStorage.setItem("pegasus_gemini_token_v1", GEMINI_API_KEY);
}

// --- helpers ---
function blobDownload(filename,content,mime='text/plain'){const b=new Blob([content],{type:mime});const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function createCodeBlock(code,lang=''){const pre=document.createElement('pre');const codeEl=document.createElement('code');codeEl.textContent=code;pre.appendChild(codeEl);const wrap=document.createElement('div');wrap.style.position='relative';wrap.style.margin='8px 0';const copyBtn=document.createElement('button');copyBtn.textContent='Copiar';copyBtn.style.cssText='position:absolute; right:6px; top:6px; padding:4px 8px; border-radius:4px; background:#333; color:#fff; border:1px solid #555; cursor:pointer; font-size:12px;';copyBtn.onclick=()=>{navigator.clipboard.writeText(code).then(()=>{copyBtn.textContent='Copiado!';setTimeout(()=>copyBtn.textContent='Copiar',1200)});};wrap.appendChild(copyBtn);wrap.appendChild(pre);return wrap}
function escapeHtml(s){return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}
function addBotTextRaw(text){const d=document.createElement('div');d.style.textAlign='left';d.style.margin='8px 0';d.innerHTML=`<div style="display:inline-block;background:#293729;color:#e6ffe6;padding:10px 12px;border-radius:12px;max-width:86%;white-space:pre-wrap;word-break:break-all; box-shadow:0 2px 4px rgba(0,0,0,0.2)">${text}</div>`;chatBox.appendChild(d);chatBox.scrollTop=chatBox.scrollHeight}

// remove overlays antigos
if(document.getElementById('pegasus-tarefas-overlay')) { document.getElementById('pegasus-tarefas-overlay').remove(); document.getElementById('pegasus-tarefas-float')?.remove(); }

// --- UI overlay ---
const overlay = document.createElement('div');
overlay.id = 'pegasus-tarefas-overlay';
overlay.style.cssText = [
  'position:fixed','right:30px','bottom:90px','width:520px','max-height:80vh',
  'background:#1c1c1c','color:#e6ffe6','border:1px solid #333',
  'border-radius:16px','z-index:9999999','box-shadow:0 10px 30px rgba(0,0,0,0.5)',
  'display:flex','flex-direction:column','overflow:hidden','font-family:Inter, Arial, sans-serif'
].join(';');

overlay.innerHTML = `
  <div id="pegasus-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#282828;border-bottom:1px solid #333;cursor:grab;">
    <div style="display:flex;gap:10px;align-items:center;">
      <img id="pegasus-logo" src="${LOGO_URL}" style="width:30px;height:30px;border-radius:4px;object-fit:cover" />
      <div style="font-weight:700;color:#0f0;font-size:16px;">Pegasus Chat <span id="pegasus-ver" style="font-size:12px; font-weight:400; color:#999;">V${APP_VERSION} (--:--)</span></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button id="pegasus-notebook-toggle" title="Abrir/Fechar Notebook" style="padding:6px;border-radius:6px;background:#444;color:#fff;border:none;cursor:pointer;font-size:12px">Notebook</button>
      <button id="pegasus-hide" style="background:transparent;color:#bbb;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px">X</button>
    </div>
  </div>
  <div id="pegasus-main" style="display:flex;gap:8px;flex-direction:column;flex:1;overflow:hidden"> 
    <div style="display:flex;gap:8px;padding:12px;align-items:center;background:#151515;border-bottom:1px solid #222">
      <input id="pegasus-prompt" placeholder="Digite seu comando, solicite código, ou pergunte algo..." style="flex:1;padding:10px;border-radius:10px;border:1px solid #444;background:#111;color:#fff;font-size:14px; outline:none;" />
      <button id="pegasus-send" style="padding:10px;border-radius:10px;background:#0f0;color:#000;font-weight:700;cursor:pointer; border:none;">Enviar</button>
    </div>
    <div id="pegasus-chat" style="padding:12px; overflow-y:auto; flex:1; font-size:14px; background:#1c1c1c;"></div>
    <div style="padding:12px 16px;border-top:1px solid #333;display:flex;flex-direction:column;gap:10px;background:#282828">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="pegasus-img" style="padding:10px;border-radius:10px;background:#00bcd4;color:#fff;font-weight:700;cursor:pointer; border:none;">Imagem</button>
        <button id="pegasus-proj" style="padding:10px;border-radius:10px;background:#ff9800;color:#000;font-weight:700;cursor:pointer; border:none;">Projeto</button>
        <button id="pegasus-clone" style="padding:10px;border-radius:10px;background:#f44336;color:#fff;font-weight:700;cursor:pointer; border:none;">Clonar (HTML)</button>
        <button id="pegasus-extract" style="padding:10px;border-radius:10px;background:#9c27b0;color:#fff;font-weight:700;cursor:pointer; border:none;">Extrair Tudo</button>
        <button id="pegasus-qna" style="padding:10px;border-radius:10px;background:#2196f3;color:#fff;font-weight:700;cursor:pointer; border:none;">Auto Resposta</button>
      </div>
      <div style="font-size:11px;color:#888">Modelo de Texto: **${GEMINI_TEXT_MODEL}** | Modelo de Imagem: **${IMAGEN_MODEL}**</div>
    </div>
  </div>
`;

document.body.appendChild(overlay);

// floating toggle button
const floatBtn = document.createElement('button');
floatBtn.id = 'pegasus-tarefas-float';
floatBtn.textContent = `🤖 Pegasus Chat V${APP_VERSION}`;
floatBtn.style.cssText = 'position:fixed;right:20px;bottom:20px;padding:12px 18px;border-radius:30px;background:#0f0;color:#000;border:none;font-weight:700;z-index:99999999;cursor:pointer;box-shadow:0 4px 12px rgba(0,255,0,0.4)';
floatBtn.onclick = ()=> overlay.style.display = overlay.style.display==='none'?'flex':'flex';
document.body.appendChild(floatBtn);

document.getElementById('pegasus-hide').onclick = ()=> overlay.style.display='none';

// chat helpers
const chatBox = document.getElementById('pegasus-chat');
function addUserMsg(text){ const d=document.createElement('div'); d.style.textAlign='right'; d.style.margin='8px 0'; d.innerHTML=`<div style="display:inline-block;background:#00695c;color:#fff;padding:10px 12px;border-radius:12px;max-width:86%; box-shadow:0 2px 4px rgba(0,0,0,0.2)">${escapeHtml(text)}</div>`; chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight; }
function addBotText(text){ const d=document.createElement('div'); d.style.textAlign='left'; d.style.margin='8px 0'; d.innerHTML=`<div style="display:inline-block;background:#293729;color:#e6ffe6;padding:10px 12px;border-radius:12px;max-width:86%; box-shadow:0 2px 4px rgba(0,0,0,0.2)">${escapeHtml(text)}</div>`; chatBox.appendChild(d); chatBox.scrollTop=chatBox.scrollHeight; }
function addCodeBlock(code, filename){ const wrapper=createCodeBlock(code); const dlBtn=document.createElement('button'); dlBtn.textContent='Baixar'; dlBtn.style.cssText = 'padding:6px 12px; border-radius:6px; background:#00796b; color:#fff; border:none; margin-left:8px; cursor:pointer; font-size:13px;'; dlBtn.onclick=()=>blobDownload(filename||'code.txt',code,'text/plain'); const container=document.createElement('div'); container.style.margin='8px 0'; container.appendChild(wrapper); container.appendChild(dlBtn); chatBox.appendChild(container); chatBox.scrollTop=chatBox.scrollHeight; }

// --- Relógio em tempo real (hora e minuto) ---
function updateClock(){
  const now = new Date();
  const hh = now.getHours().toString().padStart(2,'0');
  const mm = now.getMinutes().toString().padStart(2,'0');
  const el = document.getElementById('pegasus-ver');
  if(el) el.textContent = `V${APP_VERSION} (${hh}:${mm})`;
}
updateClock();
setInterval(updateClock, 30*1000); // atualiza a cada 30s para pegar mudança de minuto

// --- Notebook com truque de invisibilidade/visível ---
const notebookBtn = document.getElementById('pegasus-notebook-toggle');
let notebookPanel = null;
notebookBtn.addEventListener('click', ()=>{
  if(notebookPanel){ notebookPanel.style.display = notebookPanel.style.display === 'none' ? 'flex' : 'none'; return; }
  notebookPanel = document.createElement('div');
  notebookPanel.id = 'pegasus-notebook';
  notebookPanel.style.cssText = 'position:fixed;right:560px;bottom:90px;width:360px;height:300px;background:#0e0e0e;border:1px solid #222;color:#dfe;z-index:999999999;padding:10px;border-radius:12px;display:flex;flex-direction:column;gap:8px;';
  const ta = document.createElement('textarea'); ta.placeholder='Notas rápidas... (duplo clique para esconder/mostrar)'; ta.style.cssText='flex:1;background:#050505;color:#dfd;padding:10px;border-radius:8px;border:1px solid #222;outline:none;resize:none;font-family:monospace;font-size:13px';
  // truque: duplo clique alterna visibilidade (invisível/visível), e uma tecla rápida Ctrl+Shift+N também
  ta.addEventListener('dblclick', ()=>{ ta.style.display = ta.style.display === 'none' ? 'block' : 'none'; });
  notebookPanel.appendChild(ta);
  const ctrls = document.createElement('div'); ctrls.style.cssText='display:flex;gap:8px;';
  const eye = document.createElement('button'); eye.textContent='👁️ Invisível/Visível'; eye.style.cssText='padding:6px;border-radius:6px;background:#333;color:#fff;border:none;cursor:pointer';
  eye.onclick = ()=>{ ta.style.visibility = ta.style.visibility === 'hidden' ? 'visible' : 'hidden'; };
  const saveBtn = document.createElement('button'); saveBtn.textContent='Salvar (session)'; saveBtn.style.cssText='padding:6px;border-radius:6px;background:#00796b;color:#fff;border:none;cursor:pointer';
  saveBtn.onclick = ()=>{ sessionStorage.setItem('pegasus_notebook', ta.value); saveBtn.textContent='Salvo!'; setTimeout(()=>saveBtn.textContent='Salvar (session)',1200) };
  const loadBtn = document.createElement('button'); loadBtn.textContent='Carregar'; loadBtn.style.cssText='padding:6px;border-radius:6px;background:#444;color:#fff;border:none;cursor:pointer';
  loadBtn.onclick = ()=>{ ta.value = sessionStorage.getItem('pegasus_notebook')||''; };
  ctrls.appendChild(eye); ctrls.appendChild(saveBtn); ctrls.appendChild(loadBtn);
  notebookPanel.appendChild(ctrls);
  document.body.appendChild(notebookPanel);
});
// atalho teclado para alternar notebook (Ctrl+Shift+N)
window.addEventListener('keydown',(e)=>{ if(e.ctrlKey && e.shiftKey && e.key.toLowerCase()==='n'){ if(!document.getElementById('pegasus-notebook')) notebookBtn.click(); else document.getElementById('pegasus-notebook').style.display = document.getElementById('pegasus-notebook').style.display === 'none' ? 'flex' : 'none'; }});

// --- Gemini API calls (mesmas funções) ---
async function callTextAPI(promptText){
  const system = 'Você é Pegasus Chat — responda no modo COMPLETO multimodal, podendo gerar texto, código ou instruções de forma prática. Para código, use ```linguagem\n código\n```. Gere sempre respostas diretas e no formato solicitado.';
  const body = { contents: [{ role:"user", parts:[{ text:system }] }, { role:"user", parts:[{ text:promptText }] }] };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent`, {
    method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':GEMINI_API_KEY}, body:JSON.stringify(body)
  });
  const j = await res.json(); if(j.error) throw new Error(j.error.message||JSON.stringify(j.error));
  return j?.candidates?.[0]?.content?.parts?.[0]?.text||'';
}
async function callImageAPI(promptText){
  const body = { instances:[{ prompt: promptText }], parameters:{ sampleCount:1 } };
  const res = await fetch(IMAGEN_ENDPOINT, { method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':GEMINI_API_KEY}, body:JSON.stringify(body) });
  const j = await res.json(); if(j.error) throw new Error(j.error.message||JSON.stringify(j.error));
  const generatedImage = j?.generatedImages?.[0];
  if (generatedImage && generatedImage.image && generatedImage.image.imageBytes) return { base64: generatedImage.image.imageBytes, url: null, raw: j, text: "" };
  throw new Error("A API Imagen não retornou dados de imagem válidos. O prompt pode ter violado as políticas de segurança.");
}

// --- Parse and render code/text ---
function extractCodeBlocks(text){ const re=/```(\w*)\n([\s\S]*?)```/g,blocks=[];let m; while((m=re.exec(text))!==null)blocks.push({lang:m[1]||'',code:m[2].trim()}); return blocks }
function renderMixedResponse(text){ const blocks=extractCodeBlocks(text); if(blocks.length===0){ addBotText(text.trim()); return } const fenceRe=/```(\w*)\n([\s\S]*?)```/g; let lastIndex=0,m,parts=[]; while((m=fenceRe.exec(text))!==null){ const preText=text.slice(lastIndex,m.index).trim(); if(preText) parts.push({type:'text',content:preText}); parts.push({type:'code',lang:m[1]||'',content:m[2].trim()}); lastIndex=fenceRe.lastIndex } const tail=text.slice(lastIndex).trim(); if(tail) parts.push({type:'text',content:tail}); parts.forEach(p=>{ if(p.type==='text') addBotText(p.content); else{ const filename=p.lang==='html'?'index.html':p.lang==='css'?'style.css':p.lang.includes('js')?'script.js':'file.txt'; addCodeBlock(p.content,filename) } }) }

// --- Handlers ---
document.getElementById('pegasus-send').onclick=async()=>{
  const prompt=document.getElementById('pegasus-prompt').value.trim(); if(!prompt){ alert('Digite algo.'); return }
  addUserMsg(prompt); addBotText('⏳ Processando...');
  try{ const text = await callTextAPI(prompt); chatBox.lastChild.remove(); renderMixedResponse(text) }
  catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro: '+e.message); console.error(e) }
  document.getElementById('pegasus-prompt').value=''
};

// imagem
document.getElementById('pegasus-img').onclick=async()=>{
  const prompt=document.getElementById('pegasus-prompt').value.trim(); if(!prompt){ alert('Digite descrição da imagem.'); return }
  addUserMsg('[Imagem] '+prompt); addBotText('⏳ Solicitando geração de imagem com Imagen...');
  try{ const r = await callImageAPI(prompt); chatBox.lastChild.remove(); if(r.base64){ const img=document.createElement('img'); img.style.maxWidth='100%'; img.style.borderRadius='8px'; img.style.margin='6px 0'; img.src='data:image/png;base64,'+r.base64; addBotText('✅ Imagem gerada:'); chatBox.appendChild(img); } else addBotText('Resposta Inesperada da API Imagen. Checar console para detalhes.'); chatBox.scrollTop=chatBox.scrollHeight; }
  catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro: '+e.message); console.error(e) }
  document.getElementById('pegasus-prompt').value=''
};

// projeto: agora pergunta como o usuário quer
document.getElementById('pegasus-proj').onclick=async()=>{
  const userPref = prompt('Como você quer o projeto? (ex: single-page, landing, blog, com TypeScript, responsivo, etc.)');
  const prompt = (userPref && userPref.trim().length) ? `Crie um projeto conforme: ${userPref}` : 'Crie um site simples com index.html, style.css, script.js.';
  addUserMsg('[Gerar Projeto] '+prompt); addBotText('⏳ Gerando projeto...');
  try{ const text = await callTextAPI(`Por favor gere arquivos separados em blocos ```html```, ```css``` e ```js``` conforme pedido: ${prompt}`); chatBox.lastChild.remove(); renderMixedResponse(text); addBotText('Arquivos acima — use “Copiar” ou “Baixar”.'); }
  catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro: '+e.message) }
  document.getElementById('pegasus-prompt').value=''
};

// clonar: gera HTML completo (cliente) que baixa e inlining de recursos (melhor esforço)
document.getElementById('pegasus-clone').onclick=async()=>{
  const target = prompt('URL do site público para clonar (será gerado um conjunto index.html + script para tentar baixar e inline recursos):'); if(!target) return;
  if(!confirm('⚠️ AVISO: A clonagem copia conteúdo. Só opere com permissão do proprietário. Continuar?')) return;
  addUserMsg('[Clonar Site - HTML completo] '+target); addBotText('⏳ Gerando arquivos HTML/CSS/JS que tentam baixar e inline recursos (melhor esforço)...');
  try{
    // Geramos três blocos: index.html, inline-assets.js, style.css — o index inclui um script que tenta "incluir" recursos via fetch e transformar em data:urls
    const indexHtml = `<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>Clone de ${target}</title>\n<link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n<h1>Clone gerado (melhor esforço)</h1>\n<div id=\"content\">Carregando conteúdo do site...</div>\n<script src=\"inline-assets.js\"></script>\n</body>\n</html>`;

    const inlineJs = `// inline-assets.js — tenta buscar a página e substituir links por data:urls (sujeito a CORS).\n(async function(){\n  const target='${target}';\n  try{\n    const res = await fetch(target);\n    const text = await res.text();\n    // insere HTML bruto na div (útil quando CORS permite)\n    document.getElementById('content').innerText = '';\n    const frag = document.createRange().createContextualFragment(text);\n    document.getElementById('content').appendChild(frag);\n    // tentativa de inlining de imagens: converte imagens com fetch para data URLs\n    const imgs = Array.from(document.getElementById('content').querySelectorAll('img')).map(i=>i.src);
    for(const src of imgs){ try{ const r=await fetch(src); const b=await r.blob(); const reader=new FileReader(); reader.onloadend = ()=>{ const el = document.querySelector(`#content img[src=\\"${src.replace(/\"/g,'\\\\\"')}\\"]`); if(el) el.src = reader.result; }; reader.readAsDataURL(b); }catch(e){ console.warn('não conseguiu inlining',src,e) }}
  }catch(e){ document.getElementById('content').innerText = 'Erro ao buscar o site — provável bloqueio CORS. Veja instruções no arquivo README.'; console.error(e) }
})();`;

    const styleCss = `/* style.css — base para o clone */\nbody{font-family:Arial, sans-serif;background:#fff;color:#111;padding:20px}\n#content{border:1px solid #ddd;padding:12px;border-radius:8px}\nimg{max-width:100%;height:auto}`;

    chatBox.lastChild.remove(); addCodeBlock(indexHtml,'index.html'); addCodeBlock(styleCss,'style.css'); addCodeBlock(inlineJs,'inline-assets.js'); addBotText('✅ Arquivos gerados. Se quiser, clique em "Baixar" para cada arquivo. Observação: o inlining depende de CORS; para clonagem completa use ferramentas server-side ou permissões apropriadas.');
  }catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro: '+e.message); console.error(e) }
};

// extrair tudo: pergunta ao usuário o que procurar e tenta varrer links do site (melhor esforço)
document.getElementById('pegasus-extract').onclick=async()=>{
  const userWant = prompt('O que você quer extrair do site? (ex: imagens, links, texto, meta, todos). Para varrer o site, digite "site" ou "tudo" — isso tentará seguir links do mesmo domínio (pode falhar por CORS).');
  if(!userWant) return;
  if(!confirm('⚠️ AVISO: Extração pode acessar várias páginas. Use apenas em sites públicos com permissão. Continuar?')) return;
  addUserMsg('[Extrair Tudo] '+userWant); addBotText('⏳ Extraindo (melhor esforço)...');
  try{
    const origin = location.origin;
    const collected = { url: location.href, images:[], links:[], text: document.body.innerText || '', meta: {} };
    // meta
    (document.querySelectorAll('meta')).forEach(m=>{ if(m.name) collected.meta[m.name]=m.content; if(m.property) collected.meta[m.property]=m.content; });

    // simple collectors from current page
    collected.images = Array.from(document.images).map(i=>i.src).filter(Boolean);
    collected.links = Array.from(document.querySelectorAll('a')).map(a=>a.href).filter(h=>h.startsWith('http'));

    // if user asked for site or tudo, tente seguir links do mesmo domínio (limite para evitar loop)
    if(/site|tudo/i.test(userWant)){
      addBotText('⏳ Tentando varrer links do mesmo domínio (limite 20). Pode sofrer bloqueio por CORS.');
      const sameOriginLinks = collected.links.filter(l=>{ try{ return new URL(l).origin===origin }catch(e){return false} }).slice(0,20);
      for(const l of sameOriginLinks){
        try{
          const r = await fetch(l); // pode falhar por CORS
          const html = await r.text();
          const tmp = document.createElement('div'); tmp.innerHTML = html;
          const imgs = Array.from(tmp.querySelectorAll('img')).map(i=>i.src).filter(Boolean);
          const texts = tmp.innerText || '';
          collected.images.push(...imgs);
          collected.text += '\n\n-----\nConteúdo de: '+l+'\n'+texts.slice(0,20000);
          collected.links.push(l);
        }catch(e){ console.warn('não conseguiu fetch',l,e) }
      }
    }

    // filtrar e deduplicar
    collected.images = Array.from(new Set(collected.images)).slice(0,200);
    collected.links = Array.from(new Set(collected.links)).slice(0,500);

    chatBox.lastChild.remove(); addBotText('✅ Extração concluída — resumo:');
    addBotText(`URL: ${collected.url}`);
    addBotText(`Imagens encontradas: ${collected.images.length}`);
    addBotText(`Links encontrados: ${collected.links.length}`);
    addBotText(`Trecho do texto (primeiros 2000 caracteres):\n${collected.text.slice(0,2000)}`);

    // botões para baixar/listar
    const wrap = document.createElement('div'); wrap.style.margin='8px 0';
    const dl1 = document.createElement('button'); dl1.textContent='📥 Baixar JSON (extracao.json)'; dl1.style.cssText='padding:8px;border-radius:8px;background:#2196f3;color:#fff;border:none;cursor:pointer;margin-right:8px'; dl1.onclick=()=>blobDownload('extracao.json',JSON.stringify(collected,null,2),'application/json');
    const dl2 = document.createElement('button'); dl2.textContent='🔗 Listar imagens'; dl2.style.cssText='padding:8px;border-radius:8px;background:#00796b;color:#fff;border:none;cursor:pointer'; dl2.onclick=()=>{ const list = collected.images.join('\n'); blobDownload('imagens.txt',list,'text/plain'); };
    wrap.appendChild(dl1); wrap.appendChild(dl2); chatBox.appendChild(wrap);
  }catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro na extração: '+e.message); console.error(e) }
};

// auto resposta (qna) mantém comportamento, mas informa que faz perguntas e salva TXT
document.getElementById('pegasus-qna').onclick=async()=>{
  if(!confirm('⚠️ AVISO: Esta função EXTRAI o conteúdo da página para que o Gemini responda às perguntas encontradas. Use com cautela. Continuar?')) return;
  addUserMsg('[Auto Resposta - Respostas e Resumo]'); addBotText('⏳ Extraindo conteúdo da página e buscando respostas...');
  try{
    let htmlContent=document.documentElement.outerHTML.substring(0,50000);
    let textContent=document.body.innerText||'';
    let promptText=`\nA página atual é: ${location.href}\nTEXTO:\n${textContent}\nHTML (Amostra):\n${htmlContent}\n\nSua tarefa é analisar o conteúdo acima (incluindo perguntas, formulários, alternativas) e fornecer a melhor resposta ou resumo do conteúdo em formato de texto. Priorize a resposta a quaisquer perguntas ou a solução de exercícios que encontrar. Não gere nenhum código.`;
    addBotTextRaw('Conteúdo de perguntas e formulários enviado para análise.');
    const responseText = await callTextAPI(promptText);
    chatBox.lastChild.remove(); if(responseText){ addBotText('✅ Análise concluída. Resposta/Resumo:'); renderMixedResponse(responseText); const filename = 'pegasus-resposta-qna.txt'; const dlBtnWrapper = document.createElement('div'); const dlBtn = document.createElement('button'); dlBtn.textContent = `📥 Baixar Resposta Completa (${filename})`; dlBtn.style.cssText = 'padding:10px 15px; border-radius:8px; background:#2196f3; color:#fff; border:none; margin:10px 0; cursor:pointer; font-weight:700;'; dlBtn.onclick = () => blobDownload(filename, responseText, 'text/plain'); dlBtnWrapper.appendChild(dlBtn); chatBox.appendChild(dlBtnWrapper); } else { addBotText('❌ O modelo não retornou uma resposta válida. Tente um prompt mais específico.') }
  }catch(e){ chatBox.lastChild.remove(); addBotText('❌ Erro na API ou na extração: '+e.message); console.error(e) }
};

// Enter para enviar
document.getElementById('pegasus-prompt').addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); document.getElementById('pegasus-send').click() } });

// --- drag support ---
(function(){ const header=document.getElementById('pegasus-header'); let dragging=false,ox=0,oy=0; header.addEventListener('mousedown',(ev)=>{ dragging=true; ox=ev.clientX; oy=ev.clientY; document.body.style.userSelect='none' }); window.addEventListener('mousemove',(ev)=>{ if(!dragging) return; const dx=ev.clientX-ox, dy=ev.clientY-oy; const rect=overlay.getBoundingClientRect(); overlay.style.right='auto'; overlay.style.bottom='auto'; overlay.style.left=(rect.left+dx)+'px'; overlay.style.top=(rect.top+dy)+'px'; ox=ev.clientX; oy=ev.clientY }); window.addEventListener('mouseup',()=>{ dragging=false; document.body.style.userSelect='auto' }) })();

// notas finais
addBotText(`✅ Pegasus Chat V${APP_VERSION}`);
addBotText('⚠️ Lembrete: Use funções de clonagem/extração apenas com permissão do proprietário do site.');
})();
