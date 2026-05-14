module.exports = (req, res) => {
  res.json({
    status: 'ok',
    service: 'CFO Financas Agent',
    company: 'C&S Projetos e Mercado',
    timestamp: new Date().toISOString(),
    sharepoint_configured: !!process.env.SHAREPOINT_SITE,
    anthropic_configured: !!process.env.ANTHROPIC_API_KEY
  });
};