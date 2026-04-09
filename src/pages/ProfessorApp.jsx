import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, supabaseSilentAuth } from '../lib/supabase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import StudentWorkouts from '../components/StudentWorkouts';

export default function ProfessorApp() {
  const { profile, signOut } = useAuth();
  const [alunos, setAlunos] = useState([]);
  const [newEmail, setNewEmail] = useLocalStorage(`fit-app:professor:${profile?.id}:newEmail`, '');
  const [newPassword, setNewPassword] = useLocalStorage(`fit-app:professor:${profile?.id}:newPassword`, '');
  const [newName, setNewName] = useLocalStorage(`fit-app:professor:${profile?.id}:newName`, '');
  const [loading, setLoading] = useState(false);
  const [selectedAluno, setSelectedAluno] = useLocalStorage(`fit-app:professor:${profile?.id}:selectedAluno`, null);

  useEffect(() => {
    if (profile?.id) {
      fetchAlunos();
    }
  }, [profile]);

  const fetchAlunos = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'ALUNO')
      .eq('professor_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setAlunos(data);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Usando o cliente silencioso para não derrubar a sessão atual do Professor
    const { data, error } = await supabaseSilentAuth.auth.signUp({
      email: newEmail,
      password: newPassword,
      options: {
        data: {
          full_name: newName,
          role: 'ALUNO',
          professor_id: profile.id
        }
      }
    });

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      alert('Aluno cadastrado com sucesso!');
      setNewEmail(''); setNewPassword(''); setNewName('');
      fetchAlunos();
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="title-gradient">Painel do Professor</h1>
        <button onClick={signOut} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Sair</button>
      </header>

      {selectedAluno ? (
        <StudentWorkouts aluno={selectedAluno} onBack={() => setSelectedAluno(null)} />
      ) : (
        <>
          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <h2>Olá, Prof. {profile?.full_name}</h2>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              Cadastre seus alunos e gerencie os planos de treino.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
            {/* Lado Esquerdo: Formulário de Criação de Aluno */}
            <div className="glass-card">
              <h3>Novo Aluno</h3>
              <form style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleCreateStudent}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Nome Completo</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>E-mail de Acesso</label>
                  <input 
                    type="email" 
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Senha Inicial</label>
                  <input 
                    type="text" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    required 
                    minLength={6}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                  {loading ? 'Cadastrando...' : 'Cadastrar Aluno'}
                </button>
              </form>
            </div>

            {/* Lado Direito: Lista de Alunos e Planos (Futuro) */}
            <div className="glass-card">
              <h3>Meus Alunos ({alunos.length})</h3>
              {alunos.length === 0 ? (
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Você ainda não cadastrou nenhum aluno.</p>
              ) : (
                <ul style={{ marginTop: '1rem', listStyle: 'none', padding: 0 }}>
                  {alunos.map(aluno => (
                    <li key={aluno.id} style={{ 
                      padding: '1rem', background: 'rgba(0,0,0,0.2)', marginBottom: '0.5rem', borderRadius: '8px',
                      display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div>
                        <h4 style={{ margin: 0, color: '#fff' }}>{aluno.full_name}</h4>
                        <span style={{ fontSize: '0.8rem', color: aluno.is_active ? '#22c55e' : '#ef4444' }}>
                          {aluno.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <button onClick={() => setSelectedAluno(aluno)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        Ver Treinos
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
