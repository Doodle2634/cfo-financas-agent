import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import API from '../utils/api';
import { getToken, removeToken } from '../utils/auth';

Chart.register(...registerables);

const meses = ['Janeiro', 'Fevereiro', 'MarÃ§o', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const gerarAnos = () => {
  const agora = new Date().getFullYear();
  const anos = [];
  for (let i = agora - 5; i <= agora + 5; i++) anos.push(i);
  return anos;
};

const fmtMoeda = (v) => {
  if (typeof v !== 'number') return v;
  const sinal = v < 0 ? '-R$ ' : 'R$ ';
  const abs = Math.abs(v);
  return sinal + abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function DashboardPage() {
  const [question, setQuestion] = useState('');
  const [month, setMonth] = useState('Maio');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [audience, setAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [kpis, setKpis] = useState({
    saldo: 'R$ 0,00',
    recebimentos: 'R$ 0,00',
    pagamentos: 'R$ 0,00',
    gap: 'R$ 0,00'
  });
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const navigate = useNavigate();
  const anos = gerarAnos();

  useEffect(() => {
    if (!getToken()) navigate('/login');
  }, []);

  /* COMENTADO - renderiza apenas após análise
  
  */

  const renderChart = (chartData) => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    chartInstance.current = new Chart(chartRef.current, {
      type: chartData.tipo === 'linha' ? 'line' : chartData.tipo === 'pizza' ? 'doughnut' : 'bar',
      data: {
        labels: chartData.labels,
        datasets: chartData.datasets.map(d => ({
          ...d,
          borderRadius: 3,
          tension: 0.3,
          fill: chartData.tipo === 'area',
          borderColor: d.backgroundColor,
          borderWidth: chartData.tipo === 'linha' || chartData.tipo === 'area' ? 2 : 0,
          pointRadius: chartData.tipo === 'linha' ? 4 : 0,
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: chartData.horizontal ? 'y' : 'x',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const v = Math.abs(ctx.raw);
                return ' ' + fmtMoeda(v);
              }
            }
          }
        },
        scales: chartData.tipo === 'pizza' ? {} : {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#888' } },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              font: { size: 10 }, color: '#888',
              callback: v => {
                const a = Math.abs(v);
                const s = v < 0 ? '-' : '';
                return s + 'R$' + (a >= 1000000 ? (a/1000000).toFixed(1)+'M' : (a/1000).toFixed(0)+'k');
              }
            }
          }
        }
      }
    });
  };

  const handleReset = () => {
    setResult(null);
    setQuestion('');
    setKpis({
      saldo: 'R$ 0,00',
      recebimentos: 'R$ 0,00',
      pagamentos: 'R$ 0,00',
      gap: 'R$ 0,00'
    });
  };

  const handleAnalyze = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const response = await API.post('/api/analyze', {
        question,
        month,
        year,
        audience: audience || 'Diretoria',
        company: 'C&S Projetos e Mercado'
      });

      const data = response.data;
      setResult(data);

      if (data.grafico) renderChart(data.grafico);
      if (data.kpis) setKpis(data.kpis);

      setHistory(prev => [
        { question, time: 'agora', result: data },
        ...prev.slice(0, 4)
      ]);

    } catch (err) {
      setResult({ analysis: 'Erro ao conectar com a IA. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  const tableData = result?.tabela || [
    { periodo: 'Semana 1', recebimentos: 1200000, varRec: '+5,2%', pagamentos: 1800000, varPag: '+11,4%', gap: -600000, alerta: 'AtenÃ§Ã£o' },
    { periodo: 'Semana 2', recebimentos: 1450000, varRec: '+8,1%', pagamentos: 2100000, varPag: '+16,7%', gap: -650000, alerta: 'CrÃ­tico' },
    { periodo: 'Semana 3', recebimentos: 980000, varRec: '-3,4%', pagamentos: 1650000, varPag: '-4,2%', gap: -670000, alerta: 'AtenÃ§Ã£o' },
    { periodo: 'Semana 4', recebimentos: 1853534, varRec: '+18,9%', pagamentos: 2188146, varPag: '+2,1%', gap: -334612, alerta: 'Normal' },
  ];

  const badgeStyle = (alerta) => {
    if (alerta === 'Normal') return { background: '#eaf3de', color: '#3B6D11' };
    if (alerta === 'CrÃ­tico') return { background: '#FCEBEB', color: '#A32D2D' };
    return { background: '#FAEEDA', color: '#854F0B' };
  };

  const varColor = (v) => {
    if (typeof v === 'string') return v.startsWith('-') ? '#A32D2D' : '#3B6D11';
    return v < 0 ? '#A32D2D' : '#3B6D11';
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f5f0', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>

      {/* HEADER */}
      <header style={{ width: '100%', padding: '16px 48px', backgroundColor: 'white', borderBottom: '1px solid #e8e8e3', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/assets/Icon CS 2026 Branco EST1975.png" alt="C&S" style={{ height: '48px' }} />
          <div style={{ width: '1px', height: '28px', background: '#dadad2' }}></div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e2d5e', letterSpacing: '0.5px' }}>CFO FINANÃ‡AS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '13px', color: '#888' }}>InÃ­cio</span>
          <span style={{ fontSize: '13px', color: '#888' }}>AnÃ¡lises</span>
          <span style={{ fontSize: '13px', color: '#888' }}>RelatÃ³rios</span>
          <div style={{ width: '1px', height: '20px', background: '#dadad2' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1e2d5e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', color: 'white', fontWeight: '600' }}>CF</span>
            </div>
            <span style={{ fontSize: '12px', color: '#555' }}>cfo@csprojetos.com</span>
          </div>
          <button onClick={handleLogout} style={{ border: '1px solid #dadad2', borderRadius: '5px', padding: '6px 14px', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#888' }}>
            Sair
          </button>
        </div>
      </header>

      {/* LINHA DOURADA */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, #c9a84c 0%, #e8d9a0 50%, #c9a84c 100%)', width: '100%' }}></div>

      {/* FAIXA NAVY COM KPIs */}
      <div style={{ background: '#1e2d5e', padding: '22px 48px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', letterSpacing: '2px', marginBottom: '14px' }}>
          INDICADORES FINANCEIROS Â· {month.toUpperCase()} {year}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'SALDO ATUAL', valor: kpis.saldo, trend: '', up: false },
            { label: 'RECEBIMENTOS', valor: kpis.recebimentos, trend: '<div key={i} style={{ background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.18)', borderRadius: '8px', padding: '16px 20px' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>{k.label}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'white', lineHeight: '1' }}>{k.valor}</div>
              <div style={{ fontSize: '10px', color: k.up ? '#9FE1CB' : '#f09595', marginTop: '5px' }}>{k.trend}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CONTEÃšDO PRINCIPAL */}
      <main style={{ flex: 1, padding: '20px 48px', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>

        {/* COLUNA ESQUERDA â€” GrÃ¡fico + Resumo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* GRÃFICO */}
          <div style={{ background: 'white', borderRadius: '8px', border: '0.5px solid #e0e0d8', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '0.5px solid #f0efe9' }}>
              <div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '2px', marginBottom: '4px' }}>VISUALIZAÃ‡ÃƒO DINÃ‚MICA</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e2d5e' }}>
                {result?.grafico?.titulo || `Fluxo de caixa â€” ${month} ${year}`}
              </div>
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>Atualiza automaticamente com cada anÃ¡lise</div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#666' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#1e2d5e', display: 'inline-block' }}></span>Recebimentos
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#666' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#c9a84c', display: 'inline-block' }}></span>Pagamentos
                </span>
              </div>
            </div>
            <div style={{ padding: '16px 20px', flex: 1 }}>
              <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                <canvas ref={chartRef}></canvas>
              </div>
            </div>
          </div>

          {/* RESUMO EXECUTIVO */}
          <div style={{ background: 'white', borderRadius: '8px', border: '0.5px solid #e0e0d8', overflow: 'hidden', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '2px', marginBottom: '12px' }}>RESUMO EXECUTIVO</div>
            <div style={{ fontSize: '13px', color: '#1e2d5e', fontWeight: '600', marginBottom: '12px' }}>AnÃ¡lise estratÃ©gica do perÃ­odo</div>
            
            {result?.analysis ? (
              <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#555', marginBottom: '16px' }}>
                {result.analysis}
              </div>
            ) : (
              <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#aaa', marginBottom: '16px' }}>
                Execute uma anÃ¡lise para visualizar o resumo estratÃ©gico com desvios, alertas e recomendaÃ§Ãµes.
              </div>
            )}

            {result?.alertas && (
              <div style={{ borderTop: '0.5px solid #f0efe9', paddingTop: '12px' }}>
                <div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1px', marginBottom: '8px' }}>ALERTAS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.alertas.map((a, i) => (
                    <div key={i} style={{ fontSize: '11px', padding: '6px 10px', background: '#f8f7f3', borderRadius: '5px', borderLeft: `3px solid ${a.tipo === 'crÃ­tico' ? '#A32D2D' : a.tipo === 'atenÃ§Ã£o' ? '#854F0B' : '#3B6D11'}`, color: '#555' }}>
                      {a.msg}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA â€” PAINEL IA */}
        <div style={{ background: 'white', borderRadius: '8px', border: '0.5px solid #e0e0d8', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#1e2d5e', padding: '16px 20px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', letterSpacing: '2px', marginBottom: '5px' }}>ANÃLISE COM IA</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>FaÃ§a sua pergunta</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>Claude AI Â· SharePoint Â· 4.004 registros</div>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>

            <div>
              <label style={{ fontSize: '11px', color: '#888', marginBottom: '5px', display: 'block' }}>MÃªs</label>
              <select value={month} onChange={e => setMonth(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '0.5px solid #dadad2', background: 'white', fontSize: '13px', color: '#1e2d5e', fontFamily: 'inherit', cursor: 'pointer', boxSizing: 'border-box' }}>
                {meses.map((m, i) => <option key={i} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#888', marginBottom: '5px', display: 'block' }}>Ano</label>
              <select value={year} onChange={e => setYear(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '0.5px solid #dadad2', background: 'white', fontSize: '13px', color: '#1e2d5e', fontFamily: 'inherit', cursor: 'pointer', boxSizing: 'border-box' }}>
                {anos.map((a, i) => <option key={i} value={a.toString()}>{a}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#888', marginBottom: '5px', display: 'block' }}>PÃºblico</label>
              <select value={audience} onChange={e => setAudience(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '0.5px solid #dadad2', background: 'white', fontSize: '13px', color: audience ? '#1e2d5e' : '#bbb', fontFamily: 'inherit', cursor: 'pointer', boxSizing: 'border-box' }}>
                <option value="">Selecione o pÃºblico</option>
                <option value="Diretoria">Diretoria</option>
                <option value="Conselho Administrativo">Conselho Administrativo</option>
                <option value="Gestores">Gestores</option>
                <option value="Equipe Financeira">Equipe Financeira</option>
                <option value="Cliente">Cliente</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#888', marginBottom: '5px', display: 'block' }}>Sua pergunta</label>
              <textarea value={question} onChange={e => setQuestion(e.target.value)}
                placeholder="Ex: Qual o saldo atual? Quais os maiores pagamentos do mÃªs?"
                rows={3}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '0.5px solid #dadad2', background: 'white', fontSize: '13px', color: '#1e2d5e', fontFamily: 'inherit', resize: 'none', lineHeight: '1.5', boxSizing: 'border-box' }}
              />
            </div>

            <button onClick={handleAnalyze} disabled={loading || !question.trim()}
              style={{ background: loading ? '#9ca3af' : '#1e2d5e', borderRadius: '6px', padding: '11px 16px', textAlign: 'center', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', transition: 'background 0.2s' }}
              onMouseEnter={e => !loading && (e.target.style.background = '#162248')}
              onMouseLeave={e => !loading && (e.target.style.background = '#1e2d5e')}
            >
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>
                {loading ? 'Analisando...' : 'Analisar'}
              </span>
            </button>

            {history.length > 0 && (
              <div style={{ borderTop: '0.5px solid #e8e8e3', paddingTop: '10px' }}>
                <div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '1px', marginBottom: '8px' }}>HISTÃ“RICO</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {history.map((h, i) => (
                    <div key={i} onClick={() => setResult(h.result)}
                      style={{ fontSize: '11px', color: '#1e2d5e', padding: '7px 10px', background: '#f5f5f0', borderRadius: '5px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{h.question}</span>
                      <span style={{ color: '#bbb', fontSize: '10px', flexShrink: 0 }}>{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* TABELA */}
      <div style={{ padding: '20px 48px 0', boxSizing: 'border-box' }}>
        <div style={{ background: 'white', borderRadius: '8px', border: '0.5px solid #e0e0d8', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #f0efe9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#aaa', letterSpacing: '2px', marginBottom: '3px' }}>TABELA DE APOIO</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e2d5e' }}>Detalhamento semanal</div>
            </div>
            <span style={{ fontSize: '11px', color: '#aaa' }}>valores Â· variaÃ§Ãµes Â· alertas</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f8f7f3', borderBottom: '0.5px solid #e8e8e3' }}>
                {['PerÃ­odo', 'Recebimentos', 'Var.%', 'Pagamentos', 'Var.%', 'Gap', 'Alerta'].map((h, i) => (
                  <th key={i} style={{ padding: '9px 12px', color: '#888', fontWeight: '500', textAlign: i === 0 ? 'left' : i === 6 ? 'center' : 'right', paddingLeft: i === 0 ? '20px' : '12px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} style={{ borderBottom: '0.5px solid #f0efe9', background: i % 2 === 1 ? '#f8f7f3' : 'white' }}>
                  <td style={{ padding: '9px 20px', color: '#1e2d5e', fontWeight: '500' }}>{row.periodo}</td>
                  <td style={{ textAlign: 'right', padding: '9px 12px', color: '#333' }}>{fmtMoeda(row.recebimentos)}</td>
                  <td style={{ textAlign: 'right', padding: '9px 12px', color: varColor(row.varRec) }}>{row.varRec}</td>
                  <td style={{ textAlign: 'right', padding: '9px 12px', color: '#333' }}>{fmtMoeda(row.pagamentos)}</td>
                  <td style={{ textAlign: 'right', padding: '9px 12px', color: varColor(row.varPag) }}>{row.varPag}</td>
                  <td style={{ textAlign: 'right', padding: '9px 12px', color: '#A32D2D' }}>{fmtMoeda(row.gap)}</td>
                  <td style={{ textAlign: 'center', padding: '9px 12px' }}>
                    <span style={{ ...badgeStyle(row.alerta), borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: '500' }}>{row.alerta}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#1e2d5e' }}>
                <td style={{ padding: '9px 20px', color: 'white', fontWeight: '600' }}>Total</td>
                <td style={{ textAlign: 'right', padding: '9px 12px', color: 'white', fontWeight: '500' }}>R$ 5.480.000,00</td>
                <td style={{ textAlign: 'right', padding: '9px 12px', color: '#9FE1CB', fontSize: '11px' }}>+8,0%</td>
                <td style={{ textAlign: 'right', padding: '9px 12px', color: 'white', fontWeight: '500' }}>R$ 7.740.000,00</td>
                <td style={{ textAlign: 'right', padding: '9px 12px', color: '#f09595', fontSize: '11px' }}>+12,0%</td>
                <td style={{ textAlign: 'right', padding: '9px 12px', color: '#f09595', fontWeight: '500' }}>-R$ 2.260.000,00</td>
                <td style={{ textAlign: 'center', padding: '9px 12px' }}>
                  <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: '4px', padding: '2px 7px', fontSize: '10px' }}>Gap</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ width: '100%', padding: '16px 48px', marginTop: '20px', borderTop: '1px solid #e8e8e3', backgroundColor: 'white', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '20px', fontSize: '11px', color: '#a0a098' }}>
          <span>Â© 2026 C&S Projetos e Mercado</span>
          <span style={{ color: '#d4d4cc' }}>|</span>
          <span>ISO 9001:2015 Bureau Veritas</span>
          <span style={{ color: '#d4d4cc' }}>|</span>
          <span>Est. 1975</span>
        </div>
      </footer>
    </div>
  );
}





