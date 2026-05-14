const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const SYSTEM_PROMPT = `Você é o agente CFO Finanças da C&S Projetos e Mercado. Fundada em 1975, ISO 9001 Bureau Veritas.
Propósito: "Gerar valor fazendo o bem, marcando história por onde passamos."

Valores:
1. GERAR VALOR REAL — análises acionáveis
2. FAZER O BEM — transparência total
3. MARCAR HISTÓRIA — impacto de longo prazo
4. GOVERNANÇA COMO ESTRATÉGIA — finanças conectadas a riscos
5. HUMANIDADE E CONTEXTO — entender antes de falar
6. MULTIDISCIPLINARIDADE — além das finanças

ESTRUTURA DE ANÁLISE:
1. Leitura do período
2. Geração de valor / destruição
3. Destaques positivos
4. Alertas e riscos
5. Variações e números
6. Recomendações acionáveis (3-5 com responsável e prazo)
7. Perguntas para o board

Use SEMPRE os dados reais fornecidos. Seja transparente mesmo com más notícias.
Connecte resultados à governança e perenidade da empresa.

AGING REFERENCE:
1 = até 15 dias | 2 = 16-30 dias | 3 = 31-60 dias | 4 = 61-90 dias
5 = 91-120 dias | 6 = 121-180 dias | 7 = 181-360 dias | 8 = acima 360 dias`;

async function getAccessToken() {
  try {
    console.log('🔐 Obtendo token Azure...');
    const response = await axios.post(
      `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AZURE_CLIENT_ID,
        client_secret: process.env.AZURE_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default'
      })
    );
    console.log('✅ Token obtido com sucesso');
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Erro ao obter token:', error.message);
    throw error;
  }
}

async function getFinancialData() {
  try {
    console.log('📊 Iniciando leitura de dados financeiros...');
    const token = await getAccessToken();

    console.log('🔍 Buscando site SharePoint:', process.env.SHAREPOINT_SITE);
    const siteResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/csprojeto.sharepoint.com:/sites/${process.env.SHAREPOINT_SITE}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Site encontrado:', siteResponse.data.displayName);
    const siteId = siteResponse.data.id;

    console.log('📁 Buscando arquivo Excel...');
    const rangeResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root::/dados-financeiros.xlsx:/workbook/worksheets/f_FluxoDeCaixaProjetado/usedRange`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Arquivo Excel lido com sucesso');

    const values = rangeResponse.data.values;
    if (!values || values.length < 2) {
      console.warn('⚠️ Dados vazios no Excel');
      return { connected: false, error: 'Dados vazios' };
    }

    console.log(`✅ ${values.length - 1} registros lidos do Excel`);

    const headers = values[0];
    const rows = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    });

    // Separar por movimento
    const pagamentos = rows.filter(r => r['Movimento'] === 'Pagamentos');
    const recebimentos = rows.filter(r => r['Movimento'] === 'Recebimentos');
    const saldos = rows.filter(r => r['Movimento'] === 'Saldo Alocação Caixa');

    console.log(`📋 Pagamentos: ${pagamentos.length} | Recebimentos: ${recebimentos.length} | Saldos: ${saldos.length}`);

    // Totais
    const totalPagamentos = pagamentos.reduce((s, r) => s + (parseFloat(r['Valor Aberto']) || 0), 0);
    const totalRecebimentos = recebimentos.reduce((s, r) => s + (parseFloat(r['Valor Aberto']) || 0), 0);

    console.log(`💰 Total Pagamentos: R$ ${Math.abs(totalPagamentos).toFixed(2)} | Total Recebimentos: R$ ${totalRecebimentos.toFixed(2)}`);

    // Vencidos
    const pagamentosVencidos = pagamentos.filter(r =>
      r['Status Vencimento_Previsao'] && r['Status Vencimento_Previsao'].toString().includes('Vencido')
    );
    const recebimentosVencidos = recebimentos.filter(r =>
      r['Status Vencimento_Previsao'] && r['Status Vencimento_Previsao'].toString().includes('Vencido')
    );

    console.log(`⚠️ Pagamentos Vencidos: ${pagamentosVencidos.length} | Recebimentos Vencidos: ${recebimentosVencidos.length}`);

    // Top categorias pagamento
    const catPag = {};
    pagamentos.forEach(r => {
      const cat = r['Categoria'] || 'Outros';
      catPag[cat] = (catPag[cat] || 0) + (parseFloat(r['Valor Aberto']) || 0);
    });
    const topCategorias = Object.entries(catPag)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 5);

    // Top recebimentos vencidos por razão social
    const recVencPorCliente = {};
    recebimentosVencidos.forEach(r => {
      const nome = r['Razão Social'] || 'Desconhecido';
      recVencPorCliente[nome] = (recVencPorCliente[nome] || 0) + (parseFloat(r['Valor Aberto']) || 0);
    });
    const topRecVencidos = Object.entries(recVencPorCliente)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Saldo atual
    const saldoAtual = saldos.length > 0 ? parseFloat(saldos[0]['Valor Aberto']) || 0 : 0;

    console.log(`💳 Saldo Atual: R$ ${saldoAtual.toFixed(2)}`);

    // Próximos 7 dias
    const hoje = Math.floor(Date.now() / 86400000) + 25569;
    const em7dias = hoje + 7;
    const pagProximos7 = pagamentos.filter(r => {
      const d = parseFloat(r['Previsão']);
      return d >= hoje && d <= em7dias;
    });
    const recProximos7 = recebimentos.filter(r => {
      const d = parseFloat(r['Previsão']);
      return d >= hoje && d <= em7dias;
    });

    console.log(`📅 Próximos 7 dias: ${pagProximos7.length} pagamentos | ${recProximos7.length} recebimentos`);

    console.log('✅ Dados financeiros processados com sucesso');

    return {
      connected: true,
      total_registros: rows.length,
      resumo: {
        total_pagamentos: Math.abs(totalPagamentos).toFixed(2),
        total_recebimentos: totalRecebimentos.toFixed(2),
        gap_liquido: (totalRecebimentos + totalPagamentos).toFixed(2),
        saldo_atual: saldoAtual.toFixed(2),
        qtd_pagamentos: pagamentos.length,
        qtd_recebimentos: recebimentos.length
      },
      pagamentos_vencidos: {
        quantidade: pagamentosVencidos.length,
        total: Math.abs(pagamentosVencidos.reduce((s, r) => s + (parseFloat(r['Valor Aberto']) || 0), 0)).toFixed(2),
        detalhes: pagamentosVencidos.slice(0, 10).map(r => ({
          razao_social: r['Razão Social'],
          categoria: r['Categoria'],
          valor: r['Valor Aberto'],
          previsao: r['Previsão'],
          aging: r['Ordem Aging']
        }))
      },
      recebimentos_vencidos: {
        quantidade: recebimentosVencidos.length,
        total: recebimentosVencidos.reduce((s, r) => s + (parseFloat(r['Valor Aberto']) || 0), 0).toFixed(2),
        top_clientes: topRecVencidos
      },
      top_categorias_pagamento: topCategorias,
      proximos_7_dias: {
        pagamentos: pagProximos7.slice(0, 10).map(r => ({
          razao_social: r['Razão Social'],
          valor: r['Valor Aberto'],
          previsao: r['Previsão'],
          categoria: r['Categoria']
        })),
        recebimentos: recProximos7.slice(0, 10).map(r => ({
          razao_social: r['Razão Social'],
          valor: r['Valor Aberto'],
          previsao: r['Previsão']
        }))
      }
    };

  } catch (error) {
    console.error('❌ Erro ao ler dados financeiros:', error.message);
    console.error('Stack:', error.stack);
    return { connected: false, error: error.message };
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, context, month, year, audience, company } = req.body;
  if (!question) return res.status(400).json({ error: 'Pergunta é obrigatória' });

  console.log('📥 Requisição recebida:', question);

  const financialData = await getFinancialData();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const fullPrompt = `
CONTEXTO:
- Período: ${month}/${year}
- Empresa: ${company || 'C&S Projetos e Mercado'}
- Público: ${audience || 'Diretoria Executiva'}
- Data de hoje: ${new Date().toLocaleDateString('pt-BR')}

DADOS REAIS DO SHAREPOINT:
${JSON.stringify(financialData, null, 2)}

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

  res.json({
    success: true,
    response: message.content[0].text,
    metadata: {
      timestamp: new Date().toISOString(),
      model: 'claude-haiku-4-5-20251001',
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
      sharepoint_connected: financialData.connected,
      total_registros: financialData.total_registros || 0
    }
  });
};