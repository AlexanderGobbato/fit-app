import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Login.css'; // reaproveitando os estilos do login

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role] = useState('PROFESSOR'); // Opção B: Registro público apenas para professores
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      alert('Cadastro de Professor realizado com sucesso! Faça o login.');
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="login-wrapper">
      <div className="login-glass-card">
        <h1 className="title-gradient">Portal do Professor</h1>
        <p className="subtitle">Junte-se à plataforma premium para gerenciar seus alunos.</p>
        
        {errorMsg && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{errorMsg}</div>}

        <form onSubmit={handleRegister} className="login-form">
          <div className="input-field">
            <label>Nome Completo</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>

          <div className="input-field">
            <label>E-mail Corporativo</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="input-field">
            <label>Sua nova senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength="6" required />
          </div>

          <button type="submit" className="btn-glow" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Registrar'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', fontSize: '0.9rem' }}>
          Já tem conta? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Fazer Login</Link>
        </div>
      </div>
    </div>
  );
}
