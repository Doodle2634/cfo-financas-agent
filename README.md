# CFO Finanças Agent — C&S Projetos e Mercado

Agente de análise financeira 360° conectado ao SharePoint e Claude AI.

## 🚀 Instalação Rápida

### 1. Clonar repositório
```bash
git clone https://github.com/Doodle2634/cfo-financas-agent.git
cd cfo-financas-agent
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
AZURE_TENANT_ID=f9ec1812-7cf1-41dc-a7e1-1e576edad3c0
AZURE_CLIENT_ID=2ec93c43-e40d-472d-a162-5181a4a4a7f4
AZURE_CLIENT_SECRET=BqH8Q~NWYxHZZnNLZQ_IKoTnwkW_mISMAXXxqbbO
SHAREPOINT_SITE=PDSaladeGuerra
```

### 4. Deploy no Vercel
```bash
vercel
```

## 📊 Uso

**POST /api/analyze**

```bash
curl -X POST https://seu-dominio.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Qual o saldo do banco hoje?",
    "month": "Maio",
    "year": "2026",
    "audience": "Board / Conselho de Administração",
    "company": "C&S Projetos e Mercado"
  }'
```

**GET /api/health**

Verifica status do serviço:
```bash
curl https://seu-dominio.vercel.app/api/health
```

## 🏗 Arquitetura

- **Backend:** Node.js + Express
- **IA:** Claude Sonnet 4.0 (Anthropic)
- **Integração:** Microsoft Graph API (SharePoint)
- **Deploy:** Vercel Serverless Functions

## 📋 Funcionalidades

✅ Análise financeira com profundidade CFO
✅ Conexão ao SharePoint para dados ao vivo
✅ Histórico de análises
✅ Recomendações acionáveis
✅ Alertas de risco
✅ Relatórios estruturados

## 🔐 Segurança

- Credenciais armazenadas em Environment Variables do Vercel
- Autenticação OAuth2 com Azure
- Sem exposição de chaves na base de código

## 📞 Suporte

C&S Projetos e Mercado
Est. 1975 | ISO 9001 Bureau Veritas
https://csprojetos.com

---

**Propósito:** "Gerar valor fazendo o bem, marcando história por onde passamos."
