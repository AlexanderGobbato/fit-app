import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [exercises, setExercises] = useState([]);
  
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('');

  useEffect(() => {
    if (profile?.id) fetchMyPlans();
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
      setActivePlan(data[0]); // Por padrão, mostrar o plano mais recente
      fetchGroups(data[0].id);
    } else {
      setLoading(false);
    }
  };

  const fetchGroups = async (planId) => {
    const { data } = await supabase
      .from('workout_groups')
      .select('*')
      .eq('plan_id', planId)
      .order('created_at');
    
    if (data && data.length > 0) {
      setGroups(data);
      setSelectedGroupId(data[0].id);
      fetchExercises(data[0].id);
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

    // Registra o log no banco
    const { error } = await supabase.from('execution_logs').insert([{
      aluno_id: profile.id,
      group_id: selectedGroupId,
      notes: `Finalizado via App V2 | Dia: ${selectedDay}`
    }]);

    if (!error) {
      alert('Treino concluído e salvo no histórico! Parabéns!');
      setIsFocusMode(false);
      setSelectedDay('');
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

  if (!activePlan) {
    return (
      <div className="dashboard-wrapper">
        <header className="dashboard-header">
           <h2 className="greeting title-gradient">Seu Treino</h2>
           <button onClick={signOut} className="btn-secondary" style={{ padding: '0.4rem 1rem' }}>Sair</button>
        </header>
        <div className="glass-card" style={{ textAlign: 'center', marginTop: '2rem' }}>
          <h3>Nenhum plano ativo encontrado.</h3>
          <p style={{ marginTop: '1rem', color: '#aaa' }}>Peça ao seu professor para montar um plano de treinos para você.</p>
        </div>
      </div>
    );
  }

  const currentExercise = exercises[currentExerciseIndex];

  if (isFocusMode && currentExercise) {
    const listSets = parseNumSets(currentExercise.sets);
    
    return (
      <div className="dashboard-wrapper">
        <header className="focus-header">
          <button className="btn-back" onClick={handleExitFocus}>⬅ Visão Macro</button>
          <span className="focus-workout-title">{activePlan.title}</span>
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

  const activeGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div>
          <h2 className="greeting title-gradient">Olá, {profile?.full_name?.split(' ')[0]}</h2>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center' }}>
            <span className="date-display" style={{ margin: 0 }}>Plano Vigente: </span>
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
        </div>
        <button onClick={signOut} className="btn-secondary" style={{ padding: '0.4rem 1rem' }}>Sair</button>
      </header>

      {groups.length > 0 ? (
        <div className="selector-container">
          <select 
            className="workout-select" 
            value={selectedGroupId} 
            onChange={handleGroupChange}
          >
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                Treino: {g.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="glass-card" style={{ marginTop: '2rem' }}>Nenhum grupo de treino encontrado neste plano.</div>
      )}

      {groups.length > 0 && exercises.length > 0 && (
        <section className="workout-container glass-card">
          <h3 className="workout-title">{activeGroup?.name}</h3>
          
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

          <button className="btn-action-start" onClick={handleStartFocus}>
            🔥 Iniciar Execução (Modo Foco)
          </button>
        </section>
      )}
    </div>
  );
}
