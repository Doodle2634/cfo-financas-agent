const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const app = express();
app.use(express.json());

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Credenciais Azure/SharePoint
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SHAREPOINT_SITE = process.env.SHAREPOINT_SITE;

// System prompt CFO Finanças
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
6. Recomendações acionáveis
7. Perguntas para o board

Seja transparente mesmo com más notícias. Conecte resultados à governança e perenidade da empresa.`;

// Função para obter access token do Azure
async function getAccessToken() {
  try {
    const response = await axios.post(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default'
      })
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Erro ao obter token:', error.message);
    throw new Error('Falha na autenticação do SharePoint');
  }
}

// Função para buscar arquivo do SharePoint
async function getSharePointFile() {
  try {
    const token = await getAccessToken();
    
    // Buscar site
    const siteResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/csprojeto.sharepoint.com:/sites/${SHAREPOINT_SITE}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const siteId = siteResponse.data.id;
    
    // Buscar arquivo (simulado para teste)
    return {
      data: 'Arquivo do SharePoint carregado com sucesso',
      timestamp: new Date().toISOString(),
      site: SHAREPOINT_SITE
    };
  } catch (error) {
    console.error('Erro ao buscar arquivo:', error.message);
    return { error: 'Não foi possível conectar ao SharePoint' };
  }
}

// Endpoint de análise financeira
app.post('/api/analyze', async (req, res) => {
  try {
    const { question, context, month, year, audience, company } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Pergunta é obrigatória' });
    }

    // Buscar dados do SharePoint
    const sharePointData = await getSharePointFile();

    // Montar prompt completo
    const fullPrompt = `
CONTEXTO:
- Período: ${month}/${year}
- Empresa: ${company || 'C&S Projetos e Mercado'}
- Público: ${audience || 'Diretoria Executiva'}
- Dados do SharePoint: ${JSON.stringify(sharePointData)}

PERGUNTA DO USUÁRIO:
${question}

${context ? `CONTEXTO ADICIONAL:\n${context}` : ''}

Responda como CFO Finanças, com profundidade analítica.
`;

    // Chamar Claude
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: fullPrompt }
      ]
    });

    const response = message.content[0].type === 'text' ? message.content[0].text : '';

    res.json({
      success: true,
      response: response,
      metadata: {
        timestamp: new Date().toISOString(),
        model: 'claude-sonnet-4-20250514',
        tokens_used: message.usage.input_tokens + message.usage.output_tokens,
        sharepoint_connected: !sharePointData.error
      }
    });
  } catch (error) {
    console.error('Erro na análise:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao processar análise'
    });
  }
});

// Endpoint de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CFO Finanças Agent',
    company: 'C&S Projetos e Mercado',
    timestamp: new Date().toISOString(),
    sharepoint_configured: !!SHAREPOINT_SITE,
    anthropic_configured: !!process.env.ANTHROPIC_API_KEY
  });
});

// Servir interface (se existir)
app.use(express.static('public'));

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CFO Finanças Agent rodando na porta ${PORT}`);
  console.log(`Serviço: C&S Projetos e Mercado`);
  console.log(`SharePoint Site: ${SHAREPOINT_SITE}`);
});

module.exports = app;
