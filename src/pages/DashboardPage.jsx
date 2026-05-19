import { useState } from 'react';
import { Send, TrendingUp, TrendingDown, DollarSign, AlertCircle, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const [month, setMonth] = useState('Maio');
  const [year, setYear] = useState('2026');
  const [audience, setAudience] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const monthMap = { Janeiro: '1', Fevereiro: '2', Março: '3', Abril: '4', Maio: '5', Junho: '6', Julho: '7', Agosto: '8', Setembro: '9', Outubro: '10', Novembro: '11', Dezembro: '12' };

  const handleAnalyze = async () => {
    if (!question.trim() || !audience) return;
    setLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, month: monthMap[month], year, audience, company: 'C&S Projetos e Mercado' })
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setQuestion('');
  };

  const kpis = analysis?.kpis || { saldo: 'R$ 0,00', recebimentos: 'R$ 0,00', pagamentos: 'R$ 0,00', gap: 'R$ 0,00' };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#1e2d5e] rounded flex items-center justify-center text-white font-bold text-xl">C&S</div>
          <h1 className="text-xl font-semibold text-gray-900">CFO FINANÇAS</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-600 hover:text-gray-900">Início</button>
          <button className="text-gray-600 hover:text-gray-900">Análises</button>
          <button className="text-gray-600 hover:text-gray-900">Relatórios</button>
          <div className="w-10 h-10 bg-[#1e2d5e] rounded-full flex items-center justify-center text-white font-semibold">G</div>
        </div>
      </header>

      <div className="px-6 py-8">
        <h2 className="text-sm font-medium text-gray-500 mb-4">INDICADORES FINANCEIROS - {month.toUpperCase()} {year}</h2>
        
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1e2d5e] text-white p-6 rounded-lg">
            <div className="text-sm opacity-80 mb-2">SALDO ATUAL</div>
            <div className="text-2xl font-bold">{kpis.saldo}</div>
            <div className="text-xs opacity-60 mt-2">Queda desde Jan</div>
          </div>
          <div className="bg-[#1e2d5e] text-white p-6 rounded-lg">
            <div className="text-sm opacity-80 mb-2">RECEBIMENTOS</div>
            <div className="text-2xl font-bold">{kpis.recebimentos}</div>
            <div className="text-xs opacity-60 mt-2">+5% vs mês ant.</div>
          </div>
          <div className="bg-[#1e2d5e] text-white p-6 rounded-lg">
            <div className="text-sm opacity-80 mb-2">PAGAMENTOS</div>
            <div className="text-2xl font-bold">{kpis.pagamentos}</div>
            <div className="text-xs opacity-60 mt-2">+12% vs mês ant.</div>
          </div>
          <div className="bg-[#1e2d5e] text-white p-6 rounded-lg">
            <div className="text-sm opacity-80 mb-2">GAP LÍQUIDO</div>
            <div className="text-2xl font-bold">{kpis.gap}</div>
            <div className="text-xs opacity-60 mt-2">Atenção necessária</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {analysis?.grafico && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-4">VISUALIZAÇÃO DINÂMICA</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analysis.grafico.datasets[0].data.map((v, i) => ({ name: analysis.grafico.labels[i], Recebimentos: v, Pagamentos: analysis.grafico.datasets[1].data[i] }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Recebimentos" fill="#1e2d5e" />
                    <Bar dataKey="Pagamentos" fill="#c9a84c" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {analysis?.analysis && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-4">RESUMO EXECUTIVO</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{analysis.analysis}</p>
              </div>
            )}
          </div>

          <div className="bg-[#1e2d5e] text-white p-6 rounded-lg">
            <h3 className="font-semibold mb-4">Faça sua pergunta</h3>
            <p className="text-sm opacity-80 mb-4">Claude AI - SharePoint - 4.004 registros</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs opacity-80">Mês</label>
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full mt-1 bg-white text-gray-900 rounded px-3 py-2">
                  {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs opacity-80">Ano</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full mt-1 bg-white text-gray-900 rounded px-3 py-2">
                  <option>2024</option>
                  <option>2025</option>
                  <option>2026</option>
                </select>
              </div>

              <div>
                <label className="text-xs opacity-80">Público</label>
                <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full mt-1 bg-white text-gray-900 rounded px-3 py-2">
                  <option value="">Selecione o público</option>
                  <option value="Diretoria">Diretoria</option>
                  <option value="Gerência">Gerência</option>
                  <option value="Operacional">Operacional</option>
                </select>
              </div>

              <div>
                <label className="text-xs opacity-80">Sua pergunta</label>
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full mt-1 bg-white text-gray-900 rounded px-3 py-2 h-24" placeholder="Ex: Qual o saldo atual? Quais os maiores pagamentos do mês?" />
              </div>

              <div className="flex gap-2">
                <button onClick={handleAnalyze} disabled={loading || !audience} className="flex-1 bg-white text-[#1e2d5e] px-4 py-3 rounded font-semibold hover:bg-gray-100 disabled:opacity-50">
                  {loading ? 'Analisando...' : 'Analisar'}
                </button>
                {analysis && (
                  <button onClick={handleReset} className="bg-gray-700 text-white p-3 rounded hover:bg-gray-600">
                    <RotateCcw size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
