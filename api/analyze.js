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
    'https://graph.microsoft.com/v1.0/drives/b!c5nalfkfTE23uBLQOh11Si1LIbAMswVIljZDXavttxJIfa4qV9uCT53W5KhUUQP-/items/01RQGAZ7JWK6JLH25XVNEI4TCZETB3QZOY/workbook/worksheets/f_FluxoDeCaixaProjetado/usedRange',
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  if (!dataRes.ok) throw new Error(`SharePoint fetch failed: ${dataRes.status}`);
  const { values } = await dataRes.json();
  return values;
}

function filterFinancialData(allRows, month, year, movementType = 'Recebimentos') {
  const monthMap = {
    'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4, 'maio': 5, 'junho': 6,
    'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
  };
  const monthNumber = monthMap[month.toLowerCase()] || parseInt(month);
  
  const filtered = [];
  let totalValue = 0;

  const headerRow = allRows[0] || [];
  const dateColIdx = headerRow.findIndex(h => h && String(h).toLowerCase().includes('previsão'));
  const valueColIdx = headerRow.findIndex(h => h && String(h).toLowerCase().includes('valor'));
  const movementColIdx = headerRow.findIndex(h => h && String(h).toLowerCase().includes('movimento'));

  if (dateColIdx === -1 || valueColIdx === -1 || movementColIdx === -1) {
    console.warn('⚠️ Headers não encontrados:', { dateColIdx, valueColIdx, movementColIdx });
    return { filtered: [], total: 0, count: 0 };
  }

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const dateCell = row[dateColIdx];
    const valueCell = row[valueColIdx];
    const movementCell = row[movementColIdx];

    let rowDate = null;
    if (dateCell instanceof Date) {
      rowDate = dateCell;
    } else if (typeof dateCell === 'string') {
      rowDate = new Date(dateCell);
    } else if (typeof dateCell === 'number') {
      rowDate = new Date((dateCell - 25569) * 86400 * 1000);
    }

    const rowValue = typeof valueCell === 'string' ? parseFloat(valueCell.replace(/[^\d.,]/g, '').replace(',', '.')) : parseFloat(valueCell);

    if (!rowDate || isNaN(rowDate.getTime()) || rowDate.getMonth() + 1 !== monthNumber || rowDate.getFullYear() !== parseInt(year)) {
      continue;
    }

    if (!movementCell || !String(movementCell).toLowerCase().includes(movementType.toLowerCase())) {
      continue;
    }

    if (!rowValue || isNaN(rowValue) || rowValue === 0) {
      continue;
    }

    filtered.push({ date: rowDate.toISOString().split('T')[0], value: Math.abs(rowValue), movement: movementCell });
    totalValue += Math.abs(rowValue);
  }

  return { filtered, total: totalValue, count: filtered.length };
}

function calculateKPIs(allRows, month, year) {
  const recebimentos = filterFinancialData(allRows, month, year, 'Recebimentos');
  const pagamentos = filterFinancialData(allRows, month, year, 'Pagamentos');

  const totalRec = recebimentos.total;
  const totalPag = pagamentos.total;
  const saldo = totalRec - totalPag;

  const formatCurrency = (value) => {
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const formatted = absValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNegative ? `-R$ ${formatted}` : `R$ ${formatted}`;
  };

  return {
    saldo: formatCurrency(saldo),
    recebimentos: formatCurrency(totalRec),
    pagamentos: formatCurrency(totalPag),
    gap: formatCurrency(saldo),
    debug: { recebimentos_count: recebimentos.count, pagamentos_count: pagamentos.count, totalRec_raw: totalRec, totalPag_raw: totalPag }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, month, year, audience, company } = req.body;

  try {
    const data = await getSharePointData();
    console.log(`✅ SharePoint conectado: ${data.length} linhas retornadas`);

    const kpis = calculateKPIs(data, month, year);
    console.log(`📊 KPIs calculados:`, kpis);

    const headers = data[0] || [];
    const rows = data.slice(1, 200);
    const sample = rows.slice(0, 50).map(r => headers.map((h, i) => `${h}: ${r[i]}`).join(' | ')).join('\n');

    const systemPrompt = `Você é o CFO Finanças da ${company}. Hoje é ${new Date().toLocaleDateString('pt-BR')}. Responda em português. Público: ${audience}. Contexto: ${month}/${year}. REGRAS: JSON válido. KPIs em R$ X.XXX.XXX,XX.`;
    const userPrompt = `Dados ${month}/${year}:\n${sample}\n\nPergunta: ${question}\n\nRetorne JSON com análise.`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt
    });

    const text = response.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    let parsed;

    try {
      parsed = JSON.parse(clean);
      parsed.kpis = kpis;
    } catch (parseErr) {
      parsed = { analysis: `Análise: ${clean.substring(0, 200)}`, kpis: kpis };
    }

    return res.status(200).json({
      ...parsed,
      sharepoint_connected: true,
      filtered_context: { month, year, recebimentos_found: kpis.debug.recebimentos_count, pagamentos_found: kpis.debug.pagamentos_count }
    });

  } catch (err) {
    console.error('❌ Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}