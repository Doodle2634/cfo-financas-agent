const axios = require('axios');

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

module.exports = async (req, res) => {
  try {
    const token = await getAccessToken();
    
    const siteResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/csprojeto.sharepoint.com:/sites/${process.env.SHAREPOINT_SITE}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const siteId = siteResponse.data.id;
    
    const filesResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/search(q='dados-financeiros')`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    res.json({
      site: siteResponse.data.displayName,
      files: filesResponse.data.value.map(f => ({
        name: f.name,
        id: f.id,
        webUrl: f.webUrl,
        path: f.parentReference.path
      }))
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};