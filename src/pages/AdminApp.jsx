import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, supabaseSilentAuth } from '../lib/supabase';
import { CheckCircle, XCircle } from 'lucide-react';
import StudentWorkouts from '../components/StudentWorkouts';

export default function AdminApp() {
  const { profile, signOut } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('PROFESSOR');
  const [creating, setCreating] = useState(false);

  // Selected state for Workout management
  const [selectedAluno, setSelectedAluno] = useState(null);

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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);

    const { data, error } = await supabaseSilentAuth.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: {
        data: {
          full_name: newName,
          role: newRole,
          // Admin não é professor de ninguém, então alunos criados pelo admin não tem professor_id automático, a não ser que o admin delegue depois.
          professor_id: null 
        }
      }
    });

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      alert('Usuário cadastrado com sucesso!');
      setNewEmail(''); setNewPassword(''); setNewName('');
      fetchUsers();
    }
    setCreating(false);
  };

  if (selectedAluno) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 className="title-gradient" style={{ color: '#ef4444' }}>Gestão Mestre</h1>
          <button onClick={signOut} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Sair</button>
        </header>
        <StudentWorkouts aluno={selectedAluno} onBack={() => setSelectedAluno(null)} />
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="title-gradient" style={{ color: '#ef4444' }}>Gestão Mestre</h1>
        <button onClick={signOut} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Sair</button>
      </header>

      <div className="glass-card" style={{ border: '1px solid #ef4444', marginBottom: '2rem' }}>
        <h2>Olá, Admin {profile?.full_name}</h2>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
          Você tem acesso ilimitado para gerenciar todos os perfis e os treinos de qualquer aluno.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Formulário Criação */}
        <div className="glass-card">
          <h3>Novo Usuário</h3>
          <form style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleCreateUser}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Perfil Inicial</label>
              <select 
                value={newRole} 
                onChange={e => setNewRole(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                <option value="PROFESSOR" style={{ color: '#000' }}>Professor</option>
                <option value="ALUNO" style={{ color: '#000' }}>Aluno</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Nome Completo</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required 
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>E-mail Único</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required 
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Senha Temporária</label>
              <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            </div>
            <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: '1rem', background: '#ef4444' }}>
              {creating ? 'Cadastrando...' : 'Forçar Cadastro'}
            </button>
          </form>
        </div>

        {/* Listagem */}
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
                    <th style={{ padding: '1rem' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: u.is_active ? 1 : 0.5 }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 'bold' }}>{u.full_name || 'Sem Nome'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>
                          {u.is_active ? '✅ Ativo' : '❌ Bloqueado'} | ProfID: {u.professor_id ? u.professor_id.substring(0,6) : 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', background: u.role === 'ADMIN' ? '#ef4444' : u.role === 'PROFESSOR' ? '#3b82f6' : '#22c55e' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button 
                            onClick={() => toggleStatus(u.id, u.is_active)}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', background: 'transparent', color: '#fff', fontSize: '0.8rem' }}
                          >
                            {u.is_active ? 'Inativar' : 'Ativar'}
                          </button>
                          
                          {u.role === 'ALUNO' && (
                            <button 
                              onClick={() => setSelectedAluno(u)}
                              style={{ padding: '0.4rem 0.8rem', borderRadius: '5px', border: 'none', cursor: 'pointer', background: 'var(--primary)', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}
                            >
                              Ver Treinos
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
