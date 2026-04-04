import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle } from 'lucide-react';

export default function AdminApp() {
  const { profile, signOut } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const toggleStatus = async (id, currentStatus) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', id);
      
    if (!error) {
      setUsers(users.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
    } else {
      alert('Erro ao atualizar status.');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="title-gradient" style={{ color: '#ef4444' }}>Gestão Mestre</h1>
        <button onClick={signOut} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Sair</button>
      </header>

      <div className="glass-card" style={{ border: '1px solid #ef4444', marginBottom: '2rem' }}>
        <h2>Olá, Admin {profile?.full_name}</h2>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          Aqui você tem visão global dos perfis cadastrados.
        </p>
      </div>

      <div className="glass-card">
        <h3>Usuários do Sistema</h3>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '1rem' }}>Nome</th>
                  <th style={{ padding: '1rem' }}>Perfil</th>
                  <th style={{ padding: '1rem' }}>ID Professor</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>{u.full_name || 'Sem Nome'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.3rem 0.6rem', 
                        borderRadius: '20px', 
                        fontSize: '0.8rem',
                        background: u.role === 'ADMIN' ? '#ef4444' : u.role === 'PROFESSOR' ? '#3b82f6' : '#22c55e'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#999' }}>
                      {u.professor_id ? u.professor_id.substring(0,8)+'...' : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {u.is_active ? 
                        <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16}/> Ativo</span> : 
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><XCircle size={16}/> Inativo</span>
                      }
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button 
                        onClick={() => toggleStatus(u.id, u.is_active)}
                        style={{ padding: '0.4rem 0.8rem', borderRadius: '5px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                      >
                        {u.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
