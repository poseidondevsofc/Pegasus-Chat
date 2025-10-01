javascript:(async function(){
    /* Pegasus Tarefas — Versão multimodal completa - Texto (completas), imagens (generateImage), código (blocos/copy), ler e extrair dados da página, gerar scripts de clonagem (wget/puppeteer).
     * Use apenas em sites públicos ou com permissão. Não contorne autenticações.
     * Aviso de Ética: A extração de dados pode violar os termos de serviço de alguns sites e a privacidade do usuário ao enviar conteúdo da página para APIs externas. Use com responsabilidade.
     */
    const GEMINI_TEXT_MODEL = "gemini-2.5-flash"; // modelo para texto
    const GEMINI_IMAGE_MODEL = "gemini-1.5-pro"; // modelo para imagens (endpoint :generateContent)
    // NOTE: A URL "https://cse.google.com/cse?cx=..." fornecida NÃO é uma API de geração de imagens.
    // Ela é um motor de busca customizado do Google. Para gerar imagens, é necessária uma API de geração de imagens válida.
    // O Pegasus Tarefas manterá a API de geração de imagens do Gemini, pois é funcional e apropriada para o propósito.
    // Se a geração de imagens não está funcionando para você, por favor, verifique sua chave de API e acesso ao modelo Gemini 1.5 Pro ou use um serviço de geração de imagem dedicado.

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
        copyBtn.style.background = '#222';
        copyBtn.style.color = '#0f0';
        copyBtn.style.border = '1px solid #060';
        copyBtn.style.borderRadius = '4px';
        copyBtn.style.cursor = 'pointer';
        copyBtn.onclick = ()=>{
            navigator.clipboard.writeText(code).then(()=>{
                copyBtn.textContent = 'Copiado!';
                setTimeout(()=>copyBtn.textContent='Copiar',1200);
            });
        };
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
            <input id="pegasus-prompt" placeholder="Digite sua pergunta, peça extração da página, gerar imagem, clonar site..." style="padding:10px;border-radius:8px;border:1px solid rgba(0,255,0,0.12);background:#000;color:#fff;font-size:13px" />
            <div style="display:flex;gap:8px">
                <button id="pegasus-send" style="flex:1;padding:10px;border-radius:8px;background:#0f0;color:#000;font-weight:700;cursor:pointer">Enviar (Completo)</button>
                <button id="pegasus-img" style="padding:10px;border-radius:8px;background:#00d4ff;color:#000;font-weight:700;cursor:pointer">Gerar Imagem</button>
                <button id="pegasus-proj" style="padding:10px;border-radius:8px;background:#ffb86b;color:#000;font-weight:700;cursor:pointer">Extrair Página</button>
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
    function addCodeBlock(code, filename){
        const wrapper = createCodeBlock(code);
        const dlBtn = document.createElement('button');
        dlBtn.textContent = 'Baixar';
        dlBtn.style.marginLeft='8px';
        dlBtn.style.background = '#222';
        dlBtn.style.color = '#0f0';
        dlBtn.style.border = '1px solid #060';
        dlBtn.style.borderRadius = '4px';
        dlBtn.style.padding = '4px 8px';
        dlBtn.style.cursor = 'pointer';
        dlBtn.onclick = ()=> blobDownload(filename||'code.txt', code, 'text/plain');
        const container = document.createElement('div');
        container.style.margin='8px 0';
        container.appendChild(wrapper);
        container.appendChild(dlBtn);
        chatBox.appendChild(container);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

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
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify(body)
        });
        const j = await res.json();
        if(j.error) throw new Error(j.error.message || JSON.stringify(j.error));
        const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return text;
    }

    async function callImageAPI(promptText){
        // Mantendo a API do Gemini para geração de imagens, pois a URL fornecida não é uma API de imagens.
        // Adaptado para o endpoint 'generateContent' que pode gerar imagens via texto em modelos multimodais como Gemini 1.5 Pro.
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Gere uma imagem vívida e relevante com base nesta descrição: ${promptText}` }
                    ]
                }],
                generationConfig: {
                    // Para garantir que o modelo tente gerar uma imagem, embora a resposta possa variar.
                    // O Gemini 1.5 Pro pode retornar `inlineData` com imagens base64.
                    responseMimeType: "image/png" // Solicita uma resposta em formato de imagem PNG
                }
            })
        });
        const j = await resp.json();
        if(j.error) throw new Error(j.error.message || JSON.stringify(j.error));

        // Tentar extrair a imagem em base64 da resposta, que é o formato comum para Gemini via generateContent
        const base64 = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        const mimeType = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;

        if (base64 && mimeType) {
             return { base64, mimeType };
        }
        return { raw: j }; // Retorna a resposta bruta se não encontrar base64
    }

    // BUTTON handlers
    document.getElementById('pegasus-send').onclick = async ()=>{
        const prompt = document.getElementById('pegasus-prompt').value.trim();
        if(!prompt){
            alert('Digite sua pergunta ou comando.');
            return;
        }
        addUserMsg(prompt);
        addBotText('⏳ Processando...');
        try{
            const text = await callTextAPI(prompt);
            chatBox.lastChild.remove(); // remove loading
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
        if(!prompt){
            alert('Digite a descrição da imagem no campo.');
            return;
        }
        addUserMsg('[Imagem] ' + prompt);
        addBotText('⏳ Gerando imagem...');
        try{
            const r = await callImageAPI(prompt);
            chatBox.lastChild.remove();
            if(r.base64 && r.mimeType){
                const img = document.createElement('img');
                img.src = `data:${r.mimeType};base64,` + r.base64;
                img.style.maxWidth = '100%';
                img.style.borderRadius='8px';
                img.style.margin='6px 0';
                addBotHtml('<div style="padding:6px;background:#081108;border-radius:8px">'+ `<div style="font-size:12px;color:#9ff; margin-bottom:6px">Imagem gerada:</div></div>`);
                chatBox.appendChild(img);
                chatBox.scrollTop = chatBox.scrollHeight;
            } else {
                addBotText('❌ Não foi possível extrair a imagem da resposta da API. A API pode não ter gerado uma imagem ou o formato não foi reconhecido. Resposta bruta: ' + JSON.stringify(r.raw).slice(0,200) + '...');
                console.error('Image generation response did not contain expected base64 or URL:', r.raw);
            }
        }catch(e){
            chatBox.lastChild.remove();
            addBotText('❌ Erro ao gerar imagem: ' + e.message + ' Verifique sua API Key e acesso ao modelo Gemini 1.5 Pro.');
            console.error(e);
        }
        document.getElementById('pegasus-prompt').value='';
    };

    document.getElementById('pegasus-proj').onclick = async ()=>{ // Este é o botão 'Extrair Página'
        const currentUrl = window.location.href;
        let pageText = document.body.innerText;
        const MAX_PAGE_TEXT_LENGTH = 150000; // Limita o texto para evitar estouro de token e custos excessivos

        if (!pageText || pageText.trim().length === 0) {
             addBotText('❌ Não foi possível extrair texto desta página. A página pode estar vazia, ter conteúdo não textual ou não permitir leitura.');
             return;
        }

        let truncationWarning = '';
        if (pageText.length > MAX_PAGE_TEXT_LENGTH) {
            pageText = pageText.substring(0, MAX_PAGE_TEXT_LENGTH) + '\n\n... [Conteúdo truncado para economizar tokens e evitar limites. Parte do texto foi omitida.]';
            truncationWarning = ' (parte do conteúdo foi truncada devido ao tamanho)';
        }

        addUserMsg(`[Extrair Página] Analisar conteúdo da URL: ${currentUrl}${truncationWarning}`);
        addBotText('⚠️ **Aviso de Ética e Privacidade**: O conteúdo textual desta página será enviado para a API do Google Gemini para processamento. Certifique-se de que você tem permissão para extrair e enviar esses dados. Não use em informações sensíveis ou privadas sem consentimento explícito.');
        addBotText('⏳ Extraindo e analisando conteúdo da página...');

        try{
            const prompt = `Com base no **texto completo** desta página web (URL: ${currentUrl}), faça o seguinte:
1.  **Resuma** o conteúdo principal da página de forma concisa.
2.  **Liste 3 a 5 pontos-chave** ou informações importantes.
3.  **Formule 3 perguntas** que um usuário poderia ter sobre o conteúdo desta página.
4.  Para cada pergunta formulada, **forneça uma resposta direta e concisa** usando *apenas* as informações disponíveis no texto da página.

**Texto da Página para Análise:**
\`\`\`text
${pageText}
\`\`\`
`;
            const text = await callTextAPI(prompt);
            chatBox.lastChild.remove(); // remove loading
            addBotText(`✅ Análise da página ${currentUrl}${truncationWarning} concluída:`);
            renderMixedResponse(text);
            addBotText('As respostas acima foram geradas com base no conteúdo textual extraído desta página.');
            addBotText('⚠️ Lembrete: A extração da página se limita ao conteúdo exibido no momento. Para baixar um site completo, utilize a função "Gerar Script Clonar".');
        }catch(e){
            chatBox.lastChild.remove();
            addBotText('❌ Erro ao extrair página: ' + e.message);
            console.error(e);
        }
        document.getElementById('pegasus-prompt').value='';
    };

    document.getElementById('pegasus-clone').onclick = async ()=>{
        const target = prompt("Informe a URL do site público que quer gerar scripts para clonar (ex: https://example.com). Use apenas em sites públicos ou com permissão:");
        if(!target) return;
        // confirm ethics
        const ok = confirm("Aviso: só gere esses scripts se você tem permissão para acessar/baixar esse site. Não use para contornar autenticação ou violar termos de serviço. Continuar?");
        if(!ok) return;

        addUserMsg('[Clonar Site] ' + target);
        addBotText('⚠️ **Aviso de Ética**: O download de sites pode violar termos de serviço ou direitos autorais. Use com responsabilidade e apenas em sites públicos com permissão.');
        addBotText('⏳ Gerando scripts de clonagem (wget, httrack, puppeteer)...');
        try{
            const url = new URL(target);
            const domain = url.hostname; // Extrai o domínio da URL para usar nos comandos
            // prompt to generate puppeteer/wget content
            const prompt = `Gere três saídas para clonar/baixar o site ${target}:
1) Um comando wget para baixar o site inteiro para uso offline, incluindo CSS, JS e imagens, com links convertidos para uso local. Apenas a linha de comando.
\`\`\`bash
wget \\
--recursive \\
--no-clobber \\
--page-requisites \\
--html-extension \\
--convert-links \\
--restrict-file-names=windows \\
--domains ${domain} \\
--no-parent \\
${target}
\`\`\`
2) Um comando httrack equivalente para baixar o site inteiro.
\`\`\`bash
httrack ${target} -O "./cloned_site_${domain}" "+*.${domain}/*" -V %n%p -%v -c8
\`\`\`
3) Um script Puppeteer (Node.js) que abre a URL, aguarda carregamento completo (networkidle2), salva o HTML renderizado em 'page.html' e faz screenshot 'screenshot.png'. Forneça somente o bloco de código.
\`\`\`javascript
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  console.log('Navegando para ${target}...');
  await page.goto('${target}', { waitUntil: 'networkidle2', timeout: 60000 });
  const htmlContent = await page.content();
  fs.writeFileSync('page.html', htmlContent);
  console.log('HTML renderizado salvo em page.html');
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  console.log('Screenshot salvo em screenshot.png');
  await browser.close();
  console.log('Navegador fechado.');
})();
\`\`\` `;
            const text = await callTextAPI(prompt);
            chatBox.lastChild.remove();
            renderMixedResponse(text); // this will render the code blocks and text

            addBotText('Scripts prontos — copie ou baixe. Rode os comandos wget/httrack no seu terminal e o script Puppeteer localmente (com Node.js).');
        }catch(e){
            chatBox.lastChild.remove();
            addBotText('❌ Erro: ' + e.message);
            console.error(e);
        }
    };

    // parse and render mixed response: detect triple-backtick blocks and display as code
    function extractCodeBlocks(text){
        const re = /
