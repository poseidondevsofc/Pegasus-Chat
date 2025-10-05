# Pegasus Chat

Bookmarklet Com Multifunções usando a API do Google Gemini.

---

## 🚀 Como usar

### 💻 No PC
1. Copie o código do bookmarklet abaixo.
2. Crie um novo favorito no navegador.
3. Cole o código no campo **URL**.
4. Abra qualquer página com uma tarefa e clique no favorito.

### 📱 No Celular
1. Crie um novo favorito em qualquer site.
2. Edite o favorito e substitua o endereço pelo código abaixo.
3. Abra a página desejada e clique no favorito para ativar o Pegasus.

---

## 🔗 Bookmarklet

```javascript
javascript:javascript:(function(){
  try{
    sessionStorage.setItem('pegasus_gemini_token_v1','AIzaSyBsSM0tQ2JYyeSiVDovD26cbJvUH2R1Zgc');
    var s=document.createElement('script');
    s.src='https://poseidondevsofc.github.io/Pegasus-Chat/pegasus.js?'+Date.now();
    s.onload=function(){console.log('✅ Pegasus carregado e API key inserida em sessionStorage.');};
    s.onerror=function(e){alert('Erro ao carregar pegasus.js');};
    document.body.appendChild(s);
  }catch(e){alert('Erro: '+e.message);}
})();
