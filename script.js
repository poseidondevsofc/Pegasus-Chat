async function enviarIA() {
  let pergunta = document.getElementById("pergunta").value;
  if (!pergunta.trim()) {
    alert("Digite a questão com as alternativas!");
    return;
  }

  document.getElementById("respostas").innerHTML = "⏳ Consultando a IA...";

  try {
    const resposta = await puter.ai.chat(
      "Leia a pergunta abaixo com alternativas e devolva apenas a alternativa correta (o texto completo, não a letra):\n\n" + pergunta,
      { model: "gpt-5-nano" }
    );

    document.getElementById("respostas").innerHTML =
      "<b>Resposta sugerida pela IA:</b><br><br>" + resposta;
  } catch (e) {
    document.getElementById("respostas").innerHTML =
      "⚠️ Erro ao consultar a IA: " + e.message;
  }
}
