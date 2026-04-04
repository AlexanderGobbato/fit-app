import { useState, useEffect } from 'react';
import { workoutsData } from '../data/workouts';
import './Dashboard.css';

export default function Dashboard() {
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(workoutsData[0].id);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState({});

  const activeWorkout = workoutsData.find(w => w.id === selectedWorkoutId);
  const activeExercises = activeWorkout?.exercises || [];
  const currentExercise = activeExercises[currentExerciseIndex];

  const handleStartFocus = () => {
    setIsFocusMode(true);
    setCurrentExerciseIndex(0);
    setCompletedSets({});
  };

  const handleExitFocus = () => {
    setIsFocusMode(false);
  };

  const handleNext = () => {
    if (currentExerciseIndex < activeExercises.length - 1) {
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

  const parseNumSets = (setsStr) => {
    if (!setsStr) return [0, 1, 2];
    const match = setsStr.match(/(\d+)/);
    const num = match ? parseInt(match[1]) : 3;
    return Array.from({length: num > 0 ? num : 3}, (_, i) => i);
  };

  if (isFocusMode && currentExercise) {
    const listSets = parseNumSets(currentExercise.sets);
    
    return (
      <div className="dashboard-wrapper">
        <header className="focus-header">
          <button className="btn-back" onClick={handleExitFocus}>⬅  Visão Macro</button>
          <span className="focus-workout-title">{activeWorkout.title}</span>
          <span>{currentExerciseIndex + 1} / {activeExercises.length}</span>
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
          
          {currentExerciseIndex === activeExercises.length - 1 ? (
             <button className="btn-success" onClick={handleExitFocus}>Finalizar Treino!</button>
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
          <h2 className="greeting title-gradient">Seu Treino</h2>
          <p className="date-display">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      <div className="selector-container">
        <select 
          className="workout-select" 
          value={selectedWorkoutId} 
          onChange={(e) => setSelectedWorkoutId(e.target.value)}
        >
          {workoutsData.map(workout => (
            <option key={workout.id} value={workout.id}>
              {workout.title}
            </option>
          ))}
        </select>
      </div>

      <section className="workout-container glass-card">
        <h3 className="workout-title">{activeWorkout.title}</h3>
        
        <div className="exercise-list">
          {activeExercises.map(ex => (
            <div key={ex.id} className="exercise-card interactive-hover">
              <div className="exercise-details">
                <span className="exercise-name">{ex.name}</span>
                <span className="exercise-metrics">{ex.sets}x {ex.reps}</span>
              </div>
              <div className="exercise-timer">
                {ex.rest !== '-' && <span>⏱ Descanso: {ex.rest}</span>}
                {ex.obs && <span className="obs-text">⚡ {ex.obs}</span>}
              </div>
            </div>
          ))}
        </div>

        <button className="btn-action-start" onClick={handleStartFocus}>
          🔥 Iniciar Execução (Modo Foco)
        </button>
      </section>
    </div>
  );
}
