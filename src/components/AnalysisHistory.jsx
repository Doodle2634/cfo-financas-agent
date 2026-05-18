export default function AnalysisHistory({ analyses }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold text-[#1a1f6e] mb-4">Histórico</h3>
      <div className="max-h-96 overflow-y-auto">
        {analyses.length === 0 ? (
          <p className="text-gray-500">Nenhuma análise ainda</p>
        ) : (
          <ul className="space-y-2">
            {analyses.map((a) => (
              <li key={a.id} className="text-sm p-2 bg-[#f7f6f2] rounded">
                <p className="font-semibold text-[#1a1f6e]">{a.question.substring(0, 30)}...</p>
                <p className="text-gray-600 text-xs">
                  {new Date(a.timestamp).toLocaleString('pt-BR')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}