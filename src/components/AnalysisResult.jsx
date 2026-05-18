export default function AnalysisResult({ analysis }) {
  if (!analysis) return null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold text-[#1a1f6e] mb-4">Resultado</h3>
      <div className="prose prose-sm max-w-none whitespace-pre-wrap">
        {analysis.response}
      </div>
      <p className="text-gray-500 text-sm mt-4">
        {new Date(analysis.timestamp).toLocaleString('pt-BR')}
      </p>
    </div>
  );
}