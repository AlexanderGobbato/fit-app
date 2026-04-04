import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg('E-mail ou senha incorretos.');
      setLoading(false);
    } else {
      // O useEffect do AuthContext vai ler o Role e o ProtectedRoute fará o redirect correto.
      // O Roteador na raiz já cuida de jogar pra /aluno, /professor ou /admin caso tenha session + role.
    }
  };

  // Se já logou e o state atualizou, redirecionamos manual
  useEffect(() => {
    if (profile) {
      if (profile.role === 'ALUNO') navigate('/aluno');
      if (profile.role === 'PROFESSOR') navigate('/professor');
      if (profile.role === 'ADMIN') navigate('/admin');
    }
  }, [profile, navigate]);
  return (
    <div className="login-wrapper">
      <div className="login-glass-card">
        <h1 className="title-gradient">FitApp Premium</h1>
        <p className="subtitle">Seu treino inteligente na nuvem.</p>
        
        {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{errorMsg}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-field">
            <label>E-mail de Acesso</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="atleta@dominio.com"
              required 
            />
          </div>
          <div className="input-field">
            <label>Senha</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="btn-glow" disabled={loading}>
            {loading ? 'Validando...' : 'Acessar'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', fontSize: '0.9rem' }}>
          Não tem conta? <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Cadastre-se</Link>
        </div>
      </div>
    </div>
  );
}
