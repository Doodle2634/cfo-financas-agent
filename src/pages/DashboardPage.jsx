import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import QuestionForm from '../components/QuestionForm';
import AnalysisResult from '../components/AnalysisResult';
import AnalysisHistory from '../components/AnalysisHistory';
import API from '../utils/api';

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  const handleAnalyze = async (question, month, year, audience) => {
    setLoading(true);
    try {
      const response = await API.post('/api/analyze', {
        question,
        month,
        year,
        audience,
        company: 'C&S Projetos e Mercado'
      });

      const newAnalysis = {
        id: Date.now(),
        question,
        response: response.data.response,
        timestamp: new Date().toISOString(),
        month,
        year
      };

      setCurrentAnalysis(newAnalysis);
      setAnalyses([newAnalysis, ...analyses]);
    } catch (err) {
      alert('Erro na análise: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-offwhite">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <QuestionForm onSubmit={handleAnalyze} loading={loading} />
            {currentAnalysis && <AnalysisResult analysis={currentAnalysis} />}
          </div>
          <div>
            <AnalysisHistory analyses={analyses} />
          </div>
        </div>
      </div>
    </div>
  );
}