import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { setToken } from '../utils/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/api/auth/login', { email, password });
      setToken(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError('Email ou senha incorretos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    }}>

      <header style={{
        width: '100%',
        padding: '20px 48px',
        backgroundColor: 'white',
        boxSizing: 'border-box',
        borderBottom: '1px solid #e8e8e3'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <img
            src="/assets/Icon CS 2026 Branco EST1975.png"
            alt="C&S Projetos e Mercado"
            style={{ height: '52px' }}
          />
          <div style={{
            width: '1px',
            height: '32px',
            backgroundColor: '#dadad2'
          }}></div>
          <span style={{
            fontSize: '15px',
            fontWeight: '600',
            color: '#c9a84c',
            letterSpacing: '2px'
          }}>
            CFO FINANÇAS
          </span>
        </div>
      </header>

      <div style={{
        width: '100%',
        height: '2px',
        background: 'linear-gradient(90deg, #c9a84c 0%, #e8d9a0 50%, #c9a84c 100%)'
      }}></div>

      <main style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        boxSizing: 'border-box'
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h1 style={{
              fontSize: '26px',
              fontWeight: '700',
              color: '#1a1f6e',
              marginBottom: '8px',
              lineHeight: '1.3',
              letterSpacing: '-0.3px'
            }}>
              Bem-vindo ao CFO Finanças
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#7a7a72',
              lineHeight: '1.5'
            }}>
              Acesse sua plataforma de análise financeira
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '36px 32px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: '1px solid #e0e0d8'
          }}>

            <form onSubmit={handleLogin}>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1a1f6e',
                  marginBottom: '6px',
                  letterSpacing: '0.3px'
                }}>
                  Email corporativo
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@csprojetos.com"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    border: '1.5px solid #d4d4cc',
                    borderRadius: '8px',
                    outline: 'none',
                    backgroundColor: '#fafaf7',
                    color: '#202124',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1a1f6e';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(26,31,110,0.08)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d4d4cc';
                    e.target.style.backgroundColor = '#fafaf7';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}>
                  <label style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1a1f6e',
                    letterSpacing: '0.3px'
                  }}>
                    Senha
                  </label>
                  <span style={{
                    fontSize: '12px',
                    color: '#9a9a92',
                    cursor: 'pointer'
                  }}>
                    Esqueceu a senha?
                  </span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    border: '1.5px solid #d4d4cc',
                    borderRadius: '8px',
                    outline: 'none',
                    backgroundColor: '#fafaf7',
                    color: '#202124',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1a1f6e';
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 3px rgba(26,31,110,0.08)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d4d4cc';
                    e.target.style.backgroundColor = '#fafaf7';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '20px',
                  backgroundColor: '#fef2f0',
                  border: '1px solid #f5c6c0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#c5221f',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'white',
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #1a1f6e 0%, #2d3580 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 2px 8px rgba(26,31,110,0.25)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.3px'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.boxShadow = '0 4px 12px rgba(26,31,110,0.35)';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.boxShadow = '0 2px 8px rgba(26,31,110,0.25)';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? 'Autenticando...' : 'Entrar'}
              </button>
            </form>
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: '28px',
            fontSize: '13px',
            color: '#9a9a92'
          }}>
            <p>Problemas para acessar? <a href="https://wa.me/5519994363644?text=Ola%20tenho%20uma%20duvida%20sobre%20o%20CFO%20Financas" target="_blank" rel="noopener noreferrer" style={{ color: '#1a1f6e', fontWeight: '500', textDecoration: 'none' }}>Fale com o suporte</a></p>
          </div>
        </div>
      </main>

      <footer style={{
        width: '100%',
        padding: '20px 48px',
        borderTop: '1px solid #e8e8e3',
        backgroundColor: 'white',
        boxSizing: 'border-box'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          fontSize: '11px',
          color: '#a0a098',
          letterSpacing: '0.2px'
        }}>
          <span>© 2026 C&S Projetos e Mercado</span>
          <span style={{ color: '#d4d4cc' }}>|</span>
          <span>ISO 9001:2015 Bureau Veritas</span>
          <span style={{ color: '#d4d4cc' }}>|</span>
          <span>Est. 1975</span>
          <span style={{ color: '#d4d4cc' }}>|</span>
          <a href="#" style={{ color: '#a0a098', textDecoration: 'none' }}>Privacidade</a>
          <span style={{ color: '#d4d4cc' }}>|</span>
          <a href="#" style={{ color: '#a0a098', textDecoration: 'none' }}>Termos</a>
        </div>
      </footer>
    </div>
  );
}