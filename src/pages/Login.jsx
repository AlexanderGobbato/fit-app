import { useState } from 'react';
import './Login.css';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate auth success
    if(email && password) {
      onLogin();
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-glass-card">
        <h1 className="title-gradient">FitApp Premium</h1>
        <p className="subtitle">Seu treino inteligente, a um clique.</p>
        
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
          <button type="submit" className="btn-glow">Acessar Meus Treinos</button>
        </form>
      </div>
    </div>
  );
}
