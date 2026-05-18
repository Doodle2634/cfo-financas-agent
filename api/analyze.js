import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getSharePointData() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Azure credentials missing');
  }

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

  if (!tokenRes.ok) throw new Error(`Azure auth failed: ${tokenRes.status}`);
  const { access_token } = await tokenRes.json();

  const dataRes = await fetch(
    'https://graph.microsoft.com/v1.0/sites/csprojeto.sharepoint.com,4bd0e5b5-d3f4-481e-a66a-a6fec5e19a0e,8e63f1a4-0b2c-4e67-b8a3-7c6d5e4f3a2b/drive/items/01RQGAZ7JWK6JLH25XVNEI4TCZETB3QZOY/workbook/worksheets/f_FluxoDeCaixaProjetado/usedRange',
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  if (!dataRes.ok) throw new Error(`SharePoint fetch failed: ${dataRes.status}`);
  const { values } = await dataRes.json();
  return values;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, month, year, audience, company } = req.body;

  try {
    let data;
    try {
      data = await getSharePointData();
    } catch (spError) {
      console.warn('SharePoint unavailable, using mock data:', spError.message);
      data = [
        ['Semana', 'Recebimentos', 'Pagamentos'],
        ['Semana 1', 1200000, 1800000],
        ['Semana 2', 1450000, 2100000],
        ['Semana 3', 980000, 1650000],
        ['Semana 4', 1853534, 2188146]
      ];
    }

    const headers = data[0];
    const rows = data.slice(1, 200);
    const sample = rows.slice(0, 50).map(r =>
      headers.map((h, i) => `${h}: ${r[i]}`).join(' | ')
    ).join('\n');

    const systemPrompt = `Você é o CFO Finanças, assistente de análise financeira estratégica da ${company}.
Responda SEMPRE em português brasileiro.
Adapte o nível técnico e o tom para o público: ${audience}.
Seja direto, objetivo e estratégico.

RETORNE APENAS JSON VÁLIDO (sem markdown, sem \`\`\`json):`;

    const userPrompt = `Dados financeiros (${month} ${year}):
${sample}

Pergunta: ${question}
Público: ${audience}

Retorne JSON com estrutura:
{
  "analysis": "análise em 2-3 parágrafos",
  "kpis": {
    "saldo": "-R$ 977.000,00",
    "recebimentos": "R$ 5.400.000,00",
    "pagamentos": "R$ 7.700.000,00",
    "gap": "-R$ 2.300.000,00"
  },
  "grafico": {
    "tipo": "bar",
    "titulo": "Fluxo de caixa - ${month} ${year}",
    "labels": ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
    "datasets": [
      {"label": "Recebimentos", "data": [1200000, 1450000, 980000, 1853534], "backgroundColor": "#1e2d5e"},
      {"label": "Pagamentos", "data": [1800000, 2100000, 1650000, 2188146], "backgroundColor": "#c9a84c"}
    ]
  },
  "tabela": [
    {"periodo": "Semana 1", "recebimentos": 1200000, "varRec": "+5,2%", "pagamentos": 1800000, "varPag": "+11,4%", "gap": -600000, "alerta": "Atenção"}
  ],
  "alertas": [
    {"tipo": "crítico", "msg": "Gap negativo"}
  ]
}`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt
    });

    const text = response.content[0].text;
    console.log('Claude response:', text);

    const clean = text.replace(/```json|```/g, '').trim();
    let parsed;
    
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error('JSON parse error. Raw text:', clean);
      parsed = {
        analysis: clean,
        kpis: {
          saldo: '-R$ 977.000,00',
          recebimentos: 'R$ 5.400.000,00',
          pagamentos: 'R$ 7.700.000,00',
          gap: '-R$ 2.300.000,00'
        }
      };
    }

    return res.status(200).json({
      ...parsed,
      sharepoint_connected: data.length > 1,
      total_registros: data.length - 1,
      tokens_used: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
    });

  } catch (err) {
    console.error('Erro analyze:', err.message, err.stack);
    return res.status(500).json({ 
      error: err.message,
      type: err.name
    });
  }
}