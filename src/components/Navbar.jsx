import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="bg-[#1a1f6e] text-white px-6 py-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold">CFO Finanças</h1>
      <button
        onClick={handleLogout}
        className="bg-[#c9a84c] text-[#1a1f6e] px-4 py-2 rounded font-semibold hover:bg-yellow-500"
      >
        Sair
      </button>
    </nav>
  );
}