const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const SYSTEM_PROMPT = `Você é o agente CFO Finanças da C&S Projetos e Mercado. Fundada em 1975, ISO 9001 Bureau Veritas.

Propósito: "Gerar valor fazendo o bem, marcando história por onde passamos."

ESTRUTURA DE ANÁLISE:
1. Leitura do período
2. Geração de valor / destruição
3. Destaques positivos
4. Alertas e riscos
5. Variações e números
6. Recomendações acionáveis
7. Perguntas para o board

Seja transparente mesmo com más notícias. Conecte resultados à governança e perenidade da empresa.`;

async function getAccessToken() {
  const response = await axios.post(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default'
    })
  );
  return response.data.access_token;
}

async function getSharePointData() {
  try {
    const token = await getAccessToken();
    const siteResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/csprojeto.sharepoint.com:/sites/${process.env.SHAREPOINT_SITE}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { connected: true, site: siteResponse.data.displayName };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, context, month, year, audience, company } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Pergunta é obrigatória' });
  }

  const sharePointData = await getSharePointData();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const fullPrompt = `
CONTEXTO:
- Período: ${month}/${year}
- Empresa: ${company || 'C&S Projetos e Mercado'}
- Público: ${audience || 'Diretoria Executiva'}
- SharePoint: ${JSON.stringify(sharePointData)}

PERGUNTA:
${question}

${context ? `CONTEXTO ADICIONAL:\n${context}` : ''}
`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: fullPrompt }]
  });

  const response = message.content[0].text;

  res.json({
    success: true,
    response,
    metadata: {
      timestamp: new Date().toISOString(),
      model: 'claude-sonnet-4-20250514',
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
      sharepoint_connected: sharePointData.connected
    }
  });
};