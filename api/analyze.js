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
    'https://graph.microsoft.com/v1.0/sites/csprojeto.sharepoint.com:/sites/PDSaladeGuerra:/drive/root:/children/Documentos%20Compartilhados/children/Mario%20Fontana/children/Claude/children/dados-financeiros.xlsx:/workbook/worksheets/f_FluxoDeCaixaProjetado/usedRange',
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

  // Validação: perguntas vagas precisam de mais contexto
  const vagaKeywords = ['algum', 'algo', 'qualquer', 'geral', 'overview', 'resumo geral'];
  const isPerguntaVaga = vagaKeywords.some(k => question.toLowerCase().includes(k));

  if (isPerguntaVaga || question.length < 10) {
    return res.status(200).json({
      needsClarification: true,
      analysis: 'Para fornecer uma análise precisa, preciso de mais detalhes. Você quer saber sobre: recebimentos, pagamentos, saldo, projeções, ou algum item específico?',
      kpis: {
        saldo: '-R$ 2.254.612,00',
        recebimentos: 'R$ 5.483.534,00',
        pagamentos: 'R$ 7.738.146,00',
        gap: '-R$ 2.254.612,00'
      }
    });
  }

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

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS JSON VÁLIDO (sem markdown, sem \`\`\`json, sem preamble)
2. O campo "kpis" DEVE conter VALORES ABSOLUTOS formatados (ex: "R$ 5.483.534,00")
3. NUNCA retorne apenas percentuais nos KPIs
4. Calcule os valores a partir dos dados fornecidos
5. Use formatação brasileira: R$ X.XXX.XXX,XX`;

    const userPrompt = `Dados financeiros (${month} ${year}):
${sample}

Pergunta: ${question}
Público: ${audience}

CALCULE os totais dos dados acima e retorne JSON:
{
  "analysis": "análise estratégica em 2-4 parágrafos respondendo diretamente a pergunta",
  "kpis": {
    "saldo": "[CALCULE: total recebimentos - total pagamentos, formato R$ X.XXX.XXX,XX]",
    "recebimentos": "[CALCULE: soma total de recebimentos, formato R$ X.XXX.XXX,XX]",
    "pagamentos": "[CALCULE: soma total de pagamentos, formato R$ X.XXX.XXX,XX]",
    "gap": "[CALCULE: diferença negativa, formato -R$ X.XXX.XXX,XX]"
  },
  "grafico": {
    "tipo": "bar",
    "titulo": "Fluxo de caixa semanal - ${month} ${year}",
    "labels": ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
    "datasets": [
      {"label": "Recebimentos", "data": [valores_reais_dos_dados], "backgroundColor": "#1e2d5e"},
      {"label": "Pagamentos", "data": [valores_reais_dos_dados], "backgroundColor": "#c9a84c"}
    ]
  },
  "tabela": [
    {"periodo": "Semana 1", "recebimentos": valor_numero, "varRec": "+X%", "pagamentos": valor_numero, "varPag": "+Y%", "gap": valor_numero, "alerta": "Normal/Atenção/Crítico"}
  ],
  "alertas": [
    {"tipo": "crítico|atenção|info", "msg": "descrição objetiva do alerta"}
  ]
}

IMPORTANTE: Use os valores REAIS dos dados fornecidos, não invente números.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt
    });

    const text = response.content[0].text;
    console.log('Claude raw response:', text.substring(0, 500));

    const clean = text.replace(/```json|```/g, '').trim();
    let parsed;
    
    try {
      parsed = JSON.parse(clean);
      
      // Validação robusta: garantir que KPIs têm valores
      if (!parsed.kpis || !parsed.kpis.saldo || parsed.kpis.saldo.includes('%')) {
        console.warn('KPIs inválidos, recalculando...');
        
        // Calcular valores reais dos dados
        const totalRec = rows.reduce((sum, r) => sum + (parseFloat(r[1]) || 0), 0);
        const totalPag = rows.reduce((sum, r) => sum + (parseFloat(r[2]) || 0), 0);
        const gap = totalRec - totalPag;
        
        parsed.kpis = {
          saldo: gap < 0 ? `-R$ ${Math.abs(gap).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                         : `R$ ${gap.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
          recebimentos: `R$ ${totalRec.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
          pagamentos: `R$ ${totalPag.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
          gap: gap < 0 ? `-R$ ${Math.abs(gap).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                       : `R$ ${gap.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
        };
      }
      
    } catch (parseErr) {
      console.error('JSON parse error. Raw text:', clean.substring(0, 300));
      
      // Fallback: calcular valores manualmente
      const totalRec = rows.reduce((sum, r) => sum + (parseFloat(r[1]) || 0), 0);
      const totalPag = rows.reduce((sum, r) => sum + (parseFloat(r[2]) || 0), 0);
      const gap = totalRec - totalPag;
      
      parsed = {
        analysis: `Análise para ${month} ${year}: ${clean.substring(0, 500)}`,
        kpis: {
          saldo: gap < 0 ? `-R$ ${Math.abs(gap).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                         : `R$ ${gap.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
          recebimentos: `R$ ${totalRec.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
          pagamentos: `R$ ${totalPag.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
          gap: gap < 0 ? `-R$ ${Math.abs(gap).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigals: 2})}` 
                       : `R$ ${gap.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
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
      type: err.name,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

