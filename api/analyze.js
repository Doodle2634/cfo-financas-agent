import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getSharePointData() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default'
    })
  });

  const { access_token } = await tokenRes.json();

  const dataRes = await fetch(
    'https://graph.microsoft.com/v1.0/sites/csprojeto.sharepoint.com,4bd0e5b5-d3f4-481e-a66a-a6fec5e19a0e,8e63f1a4-0b2c-4e67-b8a3-7c6d5e4f3a2b/drive/items/01RQGAZ7JWK6JLH25XVNEI4TCZETB3QZOY/workbook/worksheets/f_FluxoDeCaixaProjetado/usedRange',
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  const { values } = await dataRes.json();
  return values;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, month, year, audience, company } = req.body;

  try {
    const data = await getSharePointData();
    const headers = data[0];
    const rows = data.slice(1, 200);

    const sample = rows.slice(0, 50).map(r =>
      headers.map((h, i) => `${h}: ${r[i]}`).join(' | ')
    ).join('\n');

    const systemPrompt = `Você é o CFO Finanças, assistente de análise financeira estratégica da ${company}.
Você tem acesso aos dados reais do SharePoint da empresa.
Responda SEMPRE em português brasileiro.
Adapte o nível técnico e o tom para o público: ${audience}.
Seja direto, objetivo e estratégico.

IMPORTANTE: Responda APENAS com um JSON válido no seguinte formato:
{
  "analysis": "texto da análise financeira aqui (2-4 parágrafos)",
  "kpis": {
    "saldo": "valor formatado ex: -R$ 977k",
    "recebimentos": "valor formatado ex: R$ 5,4M",
    "pagamentos": "valor formatado ex: R$ 7,7M",
    "gap": "valor formatado ex: -R$ 2,3M"
  },
  "grafico": {
    "tipo": "bar | linha | pizza | area | barHorizontal",
    "titulo": "título do gráfico",
    "horizontal": false,
    "labels": ["label1", "label2"],
    "datasets": [
      {"label": "nome", "data": [1,2,3], "backgroundColor": "#1e2d5e"},
      {"label": "nome2", "data": [4,5,6], "backgroundColor": "#c9a84c"}
    ]
  },
  "tabela": [
    {"periodo": "Semana 1", "recebimentos": 1200000, "varRec": "+5%", "pagamentos": 1800000, "varPag": "+10%", "gap": -600000, "alerta": "Atenção"},
    {"periodo": "Total", "recebimentos": 5480000, "varRec": "+8%", "pagamentos": 7740000, "varPag": "+12%", "gap": -2260000, "alerta": "Crítico"}
  ]
}`;

    const userPrompt = `Dados financeiros (${month} ${year}):
${sample}

Pergunta: ${question}
Público: ${audience}
Período: ${month} ${year}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt
    });

    const text = response.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json({
      ...parsed,
      sharepoint_connected: true,
      total_registros: data.length - 1,
      tokens_used: response.usage?.input_tokens + response.usage?.output_tokens
    });

  } catch (err) {
    console.error('Erro analyze:', err);
    return res.status(500).json({ error: err.message });
  }
}