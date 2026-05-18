import { useState } from 'react';

export default function QuestionForm({ onSubmit, loading }) {
  const [question, setQuestion] = useState('');
  const [month, setMonth] = useState('Maio');
  const [year, setYear] = useState('2026');
  const [audience, setAudience] = useState('Board');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (question.trim()) {
      onSubmit(question, month, year, audience);
      setQuestion('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-2xl font-bold text-[#1a1f6e] mb-4">Análise Financeira</h2>
      
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Pergunta</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex: Qual o saldo bancário atual?"
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#1a1f6e]"
          rows="3"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Mês</label>
          <input
            type="text"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Ano</label>
          <input
            type="text"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-semibold mb-2">Público</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded"
          >
            <option>Board</option>
            <option>CFO</option>
            <option>Executivo</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#1a1f6e] text-white py-2 rounded font-semibold hover:bg-blue-900 disabled:opacity-50"
      >
        {loading ? 'Analisando...' : 'ANALISAR'}
      </button>
    </form>
  );
}