import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { History, Dumbbell, Calendar, CheckSquare } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [activePlanId, setActivePlanId] = useLocalStorage(`fit-app:${profile?.id}:dashboard:activePlanId`, '');
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useLocalStorage(`fit-app:${profile?.id}:dashboard:selectedGroupId`, '');
  const [exercises, setExercises] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useLocalStorage(`fit-app:${profile?.id}:dashboard:activeTab`, 'train');
  
  const [isFocusMode, setIsFocusMode] = useLocalStorage(`fit-app:${profile?.id}:dashboard:isFocusMode`, false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useLocalStorage(`fit-app:${profile?.id}:dashboard:currentExerciseIndex`, 0);
  const [completedSets, setCompletedSets] = useLocalStorage(`fit-app:${profile?.id}:dashboard:completedSets`, {});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useLocalStorage(`fit-app:${profile?.id}:dashboard:selectedDay`, '');

  useEffect(() => {
    if (profile?.id) {
      fetchMyPlans();
      fetchHistory();
    }
  }, [profile]);

  const fetchMyPlans = async () => {
    const { data } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('aluno_id', profile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setPlans(data);
      // Try to restore from saved activePlanId or fallback to first one
      const savedPlan = activePlanId ? data.find(p => p.id === activePlanId) : null;
      const targetPlan = savedPlan || data[0];
      
      setActivePlan(targetPlan);
      setActivePlanId(targetPlan.id);
      fetchGroups(targetPlan.id);
    } else {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('execution_logs')
      .select('*, workout_groups(name, workout_plans(title))')
      .eq('aluno_id', profile.id)
      .order('completed_at', { ascending: false });
    
    if (data) setHistory(data);
  };

  const fetchGroups = async (planId) => {
    const { data } = await supabase
      .from('workout_groups')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at');
    
    if (data && data.length > 0) {
      setGroups(data);
      
      // Try to restore from saved selectedGroupId or fallback to first one
      const savedGroup = selectedGroupId ? data.find(g => g.id === selectedGroupId) : null;
      const targetGroupId = savedGroup ? savedGroup.id : data[0].id;
      
      setSelectedGroupId(targetGroupId);
      fetchExercises(targetGroupId);
    } else {
      setGroups([]);
      setExercises([]);
      setLoading(false);
    }
  };

  const fetchExercises = async (groupId) => {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at');
      
    if (data) {
      setExercises(data);
    }
    setLoading(false);
  };

  const handlePlanChange = (e) => {
    const pId = e.target.value;
    const plan = plans.find(p => p.id === pId);
    setActivePlan(plan);
    setActivePlanId(pId);
    fetchGroups(pId);
  };

  const handleGroupChange = (e) => {
    const gId = e.target.value;
    setSelectedGroupId(gId);
    fetchExercises(gId);
  };

  const handleStartFocus = () => {
    if (exercises.length === 0) return alert('Este grupo não possui exercícios cadastrados.');
    setIsFocusMode(true);
    setCurrentExerciseIndex(0);
    setCompletedSets({});
  };

  const handleExitFocus = () => {
    setIsFocusMode(false);
  };

  const handleNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(curr => curr + 1);
    }
  };

  const handlePrev = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(curr => curr - 1);
    }
  };

  const handleToggleSet = (exId, setIdx) => {
    setCompletedSets(prev => ({
      ...prev,
      [`${exId}_${setIdx}`]: !prev[`${exId}_${setIdx}`]
    }));
  };

  const handleFinishWorkout = async () => {
    if (!selectedDay) return alert('Por favor, informe em qual dia da semana este treino está sendo concluído.');

    const { error } = await supabase.from('execution_logs').insert([{
      aluno_id: profile.id,
      group_id: selectedGroupId,
      notes: `Finalizado via App V2 | Dia: ${selectedDay}`
    }]);

    if (!error) {
      alert('Treino concluído e salvo no histórico! Parabéns!');
      setIsFocusMode(false);
      setSelectedDay('');
      setCompletedSets({});
      setCurrentExerciseIndex(0);
      fetchHistory(); // Recarregar histórico
    } else {
      alert('Erro ao salvar o treino.');
    }
  };

  const parseNumSets = (setsStr) => {
    if (!setsStr) return [0, 1, 2];
    const match = setsStr.match(/(\d+)/);
    const num = match ? parseInt(match[1]) : 3;
    return Array.from({length: num > 0 ? num : 3}, (_, i) => i);
  };

  if (loading) {
    return <div className="dashboard-wrapper flex-center">Buscando seus treinos...</div>;
  }

  const currentExercise = exercises[currentExerciseIndex];

  if (isFocusMode && currentExercise) {
    const listSets = parseNumSets(currentExercise.sets);
    
    return (
      <div className="dashboard-wrapper">
        <header className="focus-header">
          <button className="btn-back" onClick={handleExitFocus}>⬅ Visão Macro</button>
          <span className="focus-workout-title">{activePlan?.title || 'Treino'}</span>
          <span>{currentExerciseIndex + 1} / {exercises.length}</span>
        </header>

        <section className="focus-card glass-card">
          <h2 className="focus-exercise-name">{currentExercise.name}</h2>
          
          <div className="focus-metrics">
            <div className="metric-box">
              <span className="label">Alvo</span>
              <span className="value">{currentExercise.reps}</span>
            </div>
            <div className="metric-box">
              <span className="label">Descanso</span>
              <span className="value">{currentExercise.rest}</span>
            </div>
          </div>

          {currentExercise.obs && (
            <div className="focus-obs">⚡ {currentExercise.obs}</div>
          )}

          <div className="sets-container">
            {listSets.map(idx => {
              const isDone = completedSets[`${currentExercise.id}_${idx}`];
              return (
                <div 
                  key={idx} 
                  className={`set-row ${isDone ? 'done' : ''}`}
                  onClick={() => handleToggleSet(currentExercise.id, idx)}
                >
                  <div className="set-info">Série {idx + 1}</div>
                  <div className={`checkbox ${isDone ? 'checked' : ''}`}>
                    {isDone ? '✓' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <div className="focus-controls">
          <button className="btn-secondary" onClick={handlePrev} disabled={currentExerciseIndex === 0}>
            Anterior
          </button>
          
          {currentExerciseIndex === exercises.length - 1 ? (
             <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
               <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)} style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                 <option value="">Informe o Dia...</option>
                 <option value="Segunda-feira">Segunda-feira</option>
                 <option value="Terça-feira">Terça-feira</option>
                 <option value="Quarta-feira">Quarta-feira</option>
                 <option value="Quinta-feira">Quinta-feira</option>
                 <option value="Sexta-feira">Sexta-feira</option>
                 <option value="Sábado">Sábado</option>
                 <option value="Domingo">Domingo</option>
               </select>
               <button className="btn-success" onClick={handleFinishWorkout}>Concluir Treino!</button>
             </div>
          ) : (
             <button className="btn-primary" onClick={handleNext}>Próximo Exercício ➡</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div>
          <h2 className="greeting title-gradient">Olá, {profile?.full_name?.split(' ')[0]}</h2>
          <p className="date-display">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={signOut} className="btn-secondary" style={{ padding: '0.4rem 1rem' }}>Sair</button>
      </header>

      {/* Navegação por Abas */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('train')}
          style={{ 
            background: 'none', border: 'none', color: activeTab === 'train' ? 'var(--primary)' : '#888', 
            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: activeTab === 'train' ? 'bold' : 'normal',
            borderBottom: activeTab === 'train' ? '2px solid var(--primary)' : 'none', paddingBottom: '0.5rem'
          }}
        >
          <Dumbbell size={18} /> Treinar Agora
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          style={{ 
            background: 'none', border: 'none', color: activeTab === 'history' ? 'var(--primary)' : '#888', 
            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: activeTab === 'history' ? 'bold' : 'normal',
            borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : 'none', paddingBottom: '0.5rem'
          }}
        >
          <History size={18} /> Meu Histórico
        </button>
      </div>

      {activeTab === 'train' ? (
        <>
          {!activePlan ? (
            <div className="glass-card" style={{ textAlign: 'center', marginTop: '2rem' }}>
              <h3>Nenhum plano ativo encontrado.</h3>
              <p style={{ marginTop: '1rem', color: '#aaa' }}>Peça ao seu professor para montar um plano de treinos para você.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
                <span className="date-display" style={{ margin: 0, fontWeight: 'bold' }}>Plano Atual: </span>
                <select 
                  value={activePlan.id} 
                  onChange={handlePlanChange} 
                  style={{ marginLeft: '0.5rem', background: 'transparent', color: 'var(--primary)', border: 'none', borderBottom: '1px solid var(--primary)', fontSize: '1rem', outline: 'none', cursor: 'pointer' }}
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id} style={{ color: '#000' }}>{p.title}</option>
                  ))}
                </select>
              </div>

              {groups.length > 0 ? (
                <div className="selector-container">
                  <select className="workout-select" value={selectedGroupId} onChange={handleGroupChange}>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>Treino: {g.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="glass-card" style={{ marginTop: '2rem' }}>Nenhum grupo de treino encontrado neste plano.</div>
              )}

              {groups.length > 0 && exercises.length > 0 && (
                <section className="workout-container glass-card">
                  <h3 className="workout-title">{groups.find(g => g.id === selectedGroupId)?.name}</h3>
                  <div className="exercise-list">
                    {exercises.map(ex => (
                      <div key={ex.id} className="exercise-card interactive-hover">
                        <div className="exercise-details">
                          <span className="exercise-name">{ex.name}</span>
                          <span className="exercise-metrics">{ex.sets}x {ex.reps}</span>
                        </div>
                        <div className="exercise-timer" style={{ display: 'flex', gap: '1rem' }}>
                          {ex.rest && ex.rest !== '-' && <span>⏱ Descanso: {ex.rest}</span>}
                          {ex.load && <span style={{ color: 'var(--primary)' }}>Peso: {ex.load}</span>}
                          {ex.obs && <span className="obs-text">⚡ {ex.obs}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn-action-start" onClick={handleStartFocus}>🔥 Iniciar Execução (Modo Foco)</button>
                </section>
              )}
            </>
          )}
        </>
      ) : (
        <div className="history-container">
          {history.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <p>Você ainda não concluiu nenhum treino. Comece hoje mesmo! 💪</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {history.map(log => (
                <div key={log.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                  <div>
                    <h4 style={{ margin: 0, color: 'var(--primary)' }}>{log.workout_groups?.name || 'Treino Finalizado'}</h4>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#888' }}>
                      {log.workout_groups?.workout_plans?.title || 'Plano Antigo'}
                    </p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={14} /> {new Date(log.completed_at).toLocaleDateString('pt-BR')} | 
                      <CheckSquare size={14} /> {log.notes?.split('|')[1]?.trim() || 'Concluído'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

