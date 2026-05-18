const jwt = require('jsonwebtoken');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  const VALID_EMAIL = 'cfo@csprojetos.com';
  const VALID_PASSWORD = 'Cfo@2026Brasil!%$#97514*';

  if (email === VALID_EMAIL && password === VALID_PASSWORD) {
    const token = jwt.sign(
      { email, role: 'admin' },
      process.env.JWT_SECRET || 'cfo-secret-key-2026',
      { expiresIn: '24h' }
    );
    return res.status(200).json({ token });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
};