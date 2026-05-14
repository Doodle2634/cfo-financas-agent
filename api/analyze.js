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

async function getExcelData() {
  try {
    const token = await getAccessToken();

    // Buscar site
    const siteResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/csprojeto.sharepoint.com:/sites/${process.env.SHAREPOINT_SITE}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const siteId = siteResponse.data.id;

    // Buscar arquivo
    const fileResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/Documentos Compartilhados/Mario Fontana/Claude/dados-financeiros.xlsx:/workbook/worksheets/f_FluxoDeCaixaProjetado/usedRange`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const values = fileResponse.data.values;
    if (!values || values.length === 0) {
      return { connected: true, data: null, error: 'Planilha vazia' };
    }

    // Pegar cabeçalhos e primeiras 100 linhas
    const headers = values[0];
    const rows = values.slice(1, 101).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });

    return {
      connected: true,
      total_records: values.length - 1,
      sample_data: rows,
      headers: headers
    };

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

  const excelData = await getExcelData();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const fullPrompt = `
CONTEXTO:
- Período: ${month}/${year}
- Empresa: ${company || 'C&S Projetos e Mercado'}
- Público: ${audience || 'Diretoria Executiva'}

DADOS DO SHAREPOINT (${excelData.total_records || 0} registros):
${JSON.stringify(excelData.sample_data || excelData.error)}

PERGUNTA:
${question}

${context ? `CONTEXTO ADICIONAL:\n${context}` : ''}
`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
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
      model: 'claude-haiku-4-5-20251001',
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
      sharepoint_connected: excelData.connected,
      total_records: excelData.total_records || 0
    }
  });
};