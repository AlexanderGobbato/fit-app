import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ChevronLeft, Plus, Trash2, Edit2, Check, X, Copy, Search, Loader2 } from 'lucide-react';

export default function StudentWorkouts({ aluno, onBack }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useLocalStorage(`fit-app:professor:aluno:${aluno.id}:selectedPlanId`, '');
  
  const [newTitle, setNewTitle] = useLocalStorage(`fit-app:professor:aluno:${aluno.id}:newTitle`, '');
  const [startDate, setStartDate] = useLocalStorage(`fit-app:professor:aluno:${aluno.id}:startDate`, '');
  const [endDate, setEndDate] = useLocalStorage(`fit-app:professor:aluno:${aluno.id}:endDate`, '');
  
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useLocalStorage(`fit-app:professor:aluno:${aluno.id}:newGroupName`, '');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  
  const [exercises, setExercises] = useState({}); // { group_id: [] }
  const [newExercise, setNewExercise] = useLocalStorage(`fit-app:professor:aluno:${aluno.id}:newExercise`, { name: '', sets: '', reps: '', load: '', rest: '', obs: '' });
  const [activeGroupForm, setActiveGroupForm] = useState(null); // group_id
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [editExerciseData, setEditExerciseData] = useState({ name: '', sets: '', reps: '', load: '', rest: '', obs: '' });

  // Copy/Clone States
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [otherStudents, setOtherStudents] = useState([]);
  const [selectedSourceStudentId, setSelectedSourceStudentId] = useState('');
  const [otherStudentPlans, setOtherStudentPlans] = useState([]);
  const [selectedSourcePlanId, setSelectedSourcePlanId] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [aluno]);

  const fetchPlans = async () => {
    const { data } = await supabase.from('workout_plans').select('*').eq('aluno_id', aluno.id).order('created_at', { ascending: false });
    if (data) {
      setPlans(data);
      if (selectedPlanId) {
        const restored = data.find(p => p.id === selectedPlanId);
        if (restored) openPlan(restored);
      }
    }
  };

  const createPlan = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('workout_plans').insert([{
      aluno_id: aluno.id,
      professor_id: aluno.professor_id,
      title: newTitle,
      start_date: startDate || null,
      end_date: endDate || null
    }]).select();
    
    if (!error && data) {
      setPlans([data[0], ...plans]);
      setNewTitle(''); setStartDate(''); setEndDate('');
    } else {
      alert('Erro: ' + (error?.message || 'Falha ao criar plano'));
    }
  };

  // Quando abre um plano, carrega grupos e exercícios
  const openPlan = async (plan) => {
    setSelectedPlan(plan);
    setSelectedPlanId(plan.id);
    const { data: gs } = await supabase.from('workout_groups').select('*').eq('plan_id', plan.id).order('created_at');
    if (gs) {
      setGroups(gs);
      const exTemp = {};
      for (let g of gs) {
        const { data: exs } = await supabase.from('exercises').select('*').eq('group_id', g.id).order('created_at');
        exTemp[g.id] = exs || [];
      }
      setExercises(exTemp);
    }
  };

  // Funções de Cópia
  const startCopyFlow = async () => {
    setShowCopyModal(true);
    // Buscar todos os alunos (menos o atual) para oferecer como origem
    const { data } = await supabase.from('profiles').select('*').eq('role', 'ALUNO').neq('id', aluno.id).order('full_name');
    if (data) setOtherStudents(data);
  };

  const fetchPlansBySourceStudent = async (studentId) => {
    setSelectedSourceStudentId(studentId);
    if (!studentId) return setOtherStudentPlans([]);
    const { data } = await supabase.from('workout_plans').select('*').eq('aluno_id', studentId).order('created_at', { ascending: false });
    if (data) setOtherStudentPlans(data);
  };

  const handleCopyPlan = async () => {
    if (!selectedSourcePlanId) return;
    setIsCopying(true);

    try {
      // 1. Pegar detalhes do plano de origem
      const sourcePlan = otherStudentPlans.find(p => p.id === selectedSourcePlanId);
      
      // 2. Criar novo plano para o aluno atual
      const { data: newPlanData, error: planErr } = await supabase.from('workout_plans').insert([{
        aluno_id: aluno.id,
        professor_id: aluno.professor_id,
        title: `Cópia: ${sourcePlan.title}`,
        start_date: sourcePlan.start_date,
        end_date: sourcePlan.end_date
      }]).select();

      if (planErr || !newPlanData) throw new Error('Erro ao criar plano de destino');
      const newPlan = newPlanData[0];

      // 3. Buscar grupos de origem
      const { data: sourceGroups } = await supabase.from('workout_groups').select('*').eq('plan_id', sourcePlan.id);
      
      if (sourceGroups && sourceGroups.length > 0) {
        for (const sg of sourceGroups) {
          // 4. Criar novo grupo no destino
          const { data: newGroupData, error: groupErr } = await supabase.from('workout_groups').insert([{
            plan_id: newPlan.id,
            name: sg.name,
            order_index: sg.order_index
          }]).select();

          if (groupErr || !newGroupData) continue;
          const newGroup = newGroupData[0];

          // 5. Buscar exercícios de cada grupo de origem
          const { data: sourceExercises } = await supabase.from('exercises').select('*').eq('group_id', sg.id);
          
          if (sourceExercises && sourceExercises.length > 0) {
            const newExercises = sourceExercises.map(se => ({
              group_id: newGroup.id,
              name: se.name,
              sets: se.sets,
              reps: se.reps,
              load: se.load,
              rest: se.rest,
              obs: se.obs,
              order_index: se.order_index
            }));

            await supabase.from('exercises').insert(newExercises);
          }
        }
      }

      alert('Plano clonado com sucesso!');
      setShowCopyModal(false);
      fetchPlans();
    } catch (err) {
      alert(`Oops: ${err.message}`);
    } finally {
      setIsCopying(false);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName) return;
    const { data } = await supabase.from('workout_groups').insert([{ plan_id: selectedPlan.id, name: newGroupName }]).select();
    if (data) {
      setGroups([...groups, data[0]]);
      setExercises({ ...exercises, [data[0].id]: [] });
      setNewGroupName('');
    }
  };

  const updateGroup = async (groupId) => {
    const { data, error } = await supabase.from('workout_groups').update({ name: editGroupName }).eq('id', groupId).select();
    if (!error && data) {
      setGroups(groups.map(g => g.id === groupId ? data[0] : g));
      setEditingGroupId(null);
    }
  };

  const deleteGroup = async (groupId) => {
    if (!confirm('Deseja excluir este GRUPO INTEIRO e todos os seus exercícios?')) return;
    const { error } = await supabase.from('workout_groups').delete().eq('id', groupId);
    if (!error) {
      setGroups(groups.filter(g => g.id !== groupId));
      const newExercises = { ...exercises };
      delete newExercises[groupId];
      setExercises(newExercises);
    }
  };

  const createExercise = async (e, groupId) => {
    e.preventDefault();
    const { data } = await supabase.from('exercises').insert([{ group_id: groupId, ...newExercise }]).select();
    if (data) {
      setExercises({ ...exercises, [groupId]: [...exercises[groupId], data[0]] });
      setNewExercise({ name: '', sets: '', reps: '', load: '', rest: '', obs: '' });
      setActiveGroupForm(null);
    }
  };

  const updateExercise = async (exerciseId, groupId) => {
    const { data, error } = await supabase.from('exercises').update({ ...editExerciseData }).eq('id', exerciseId).select();
    if (!error && data) {
      setExercises({
        ...exercises,
        [groupId]: exercises[groupId].map(ex => ex.id === exerciseId ? data[0] : ex)
      });
      setEditingExerciseId(null);
    }
  };

  const deletePlan = async (id) => {
    if (!confirm('Deseja excluir este plano e todos os seus treinos?')) return;
    await supabase.from('workout_plans').delete().eq('id', id);
    setSelectedPlan(null);
    fetchPlans();
  };

  const deleteExercise = async (id, groupId) => {
    await supabase.from('exercises').delete().eq('id', id);
    setExercises({...exercises, [groupId]: exercises[groupId].filter(ex => ex.id !== id)});
  };

  const updatePlan = async (id) => {
    const { data, error } = await supabase.from('workout_plans').update({
      title: editTitle,
      start_date: editStartDate || null,
      end_date: editEndDate || null
    }).eq('id', id).select();
    
    if (!error && data) {
      setPlans(plans.map(p => p.id === id ? data[0] : p));
      setEditingPlanId(null);
    } else {
      alert('Erro ao atualizar: ' + (error?.message || ''));
    }
  };

  const startEditingPlan = (p) => {
    setEditingPlanId(p.id);
    setEditTitle(p.title);
    setEditStartDate(p.start_date || '');
    setEditEndDate(p.end_date || '');
  };

  const startEditingExercise = (ex) => {
    setEditingExerciseId(ex.id);
    setEditExerciseData({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      load: ex.load,
      rest: ex.rest,
      obs: ex.obs || ''
    });
  };

  if (selectedPlan) {
    return (
      <div className="glass-card">
        <button onClick={() => setSelectedPlan(null)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ChevronLeft size={16} /> Voltar para Planos
        </button>
        <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{selectedPlan.title}</h3>
        <p style={{ fontSize: '0.9rem', color: '#999', marginBottom: '2rem' }}>
          Vigência: {selectedPlan.start_date || '-'} até {selectedPlan.end_date || '-'}
        </p>

        {/* Formulário Novo Grupo */}
        <form onSubmit={createGroup} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <input 
            type="text" placeholder="Nome do Novo Grupo (Ex: Costas e Bíceps)" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required
            style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
          <button type="submit" className="btn-glow" style={{ padding: '0 1.5rem' }}>Criar Grupo</button>
        </form>

        {/* Lista de Grupos */}
        {groups.map(g => (
          <div key={g.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              {editingGroupId === g.id ? (
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  <input type="text" value={editGroupName} onChange={e => setEditGroupName(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} />
                  <button onClick={() => updateGroup(g.id)} style={{ color: '#22c55e', background: 'none', border: 'none', cursor: 'pointer' }}><Check size={20}/></button>
                  <button onClick={() => setEditingGroupId(null)} style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
                </div>
              ) : (
                <>
                  <h4 style={{ fontSize: '1.2rem', margin: 0 }}>{g.name}</h4>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button onClick={() => {setEditingGroupId(g.id); setEditGroupName(g.name)}} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer' }} title="Editar Nome do Grupo"><Edit2 size={16}/></button>
                    <button onClick={() => deleteGroup(g.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Excluir Grupo Inteiro"><Trash2 size={16}/></button>
                  </div>
                </>
              )}
            </div>
            
            {/* Lista de Exercicios do Grupo */}
            {exercises[g.id]?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {exercises[g.id].map(ex => (
                  <div key={ex.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {editingExerciseId === ex.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input type="text" value={editExerciseData.name} onChange={e => setEditExerciseData({...editExerciseData, name: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} placeholder="Nome" />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                          <input type="text" value={editExerciseData.sets} onChange={e => setEditExerciseData({...editExerciseData, sets: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} placeholder="Séries" />
                          <input type="text" value={editExerciseData.reps} onChange={e => setEditExerciseData({...editExerciseData, reps: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} placeholder="Reps" />
                          <input type="text" value={editExerciseData.load} onChange={e => setEditExerciseData({...editExerciseData, load: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} placeholder="Cargo" />
                          <input type="text" value={editExerciseData.rest} onChange={e => setEditExerciseData({...editExerciseData, rest: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} placeholder="Descanso" />
                        </div>
                        <input type="text" value={editExerciseData.obs} onChange={e => setEditExerciseData({...editExerciseData, obs: e.target.value})} style={{ padding: '0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} placeholder="Obs" />
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem' }}>
                          <button onClick={() => updateExercise(ex.id, g.id)} style={{ padding: '0.4rem 1rem', background: '#22c55e', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Salvar</button>
                          <button onClick={() => setEditingExerciseId(null)} style={{ padding: '0.4rem 1rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--primary)' }}>{ex.name}</strong>
                          <span style={{ fontSize: '0.85rem', color: '#aaa', marginLeft: '1rem' }}>
                            {ex.sets}x{ex.reps} | Carga: {ex.load} | Rest: {ex.rest} {ex.obs && ` | Obs: ${ex.obs}`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => startEditingExercise(ex)} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer' }}><Edit2 size={16}/></button>
                          <button onClick={() => deleteExercise(ex.id, g.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Nenhum exercício neste grupo.</p>}

            {/* Adicionar exercicio ao grupo */}
            {activeGroupForm === g.id ? (
              <form onSubmit={e => createExercise(e, g.id)} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px' }}>
                <input type="text" placeholder="Nome do Exercício (Ex: Supino Reto)" required value={newExercise.name} onChange={e => setNewExercise({...newExercise, name: e.target.value})} style={{ padding: '0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
                  <input type="text" placeholder="Séries (ex: 4)" required value={newExercise.sets} onChange={e => setNewExercise({...newExercise, sets: e.target.value})} style={{ padding: '0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} />
                  <input type="text" placeholder="Reps (ex: 12)" required value={newExercise.reps} onChange={e => setNewExercise({...newExercise, reps: e.target.value})} style={{ padding: '0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} />
                  <input type="text" placeholder="Carga (ex: 10kg)" value={newExercise.load} onChange={e => setNewExercise({...newExercise, load: e.target.value})} style={{ padding: '0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} />
                  <input type="text" placeholder="Descanso (ex: 60s)" value={newExercise.rest} onChange={e => setNewExercise({...newExercise, rest: e.target.value})} style={{ padding: '0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} />
                </div>
                <input type="text" placeholder="Observações (opcional)" value={newExercise.obs} onChange={e => setNewExercise({...newExercise, obs: e.target.value})} style={{ padding: '0.6rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Salvar Novo Exercício</button>
                  <button type="button" onClick={() => setActiveGroupForm(null)} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Cancelar</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setActiveGroupForm(g.id)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                <Plus size={16}/> Adicionar Exercício ao Grupo
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ChevronLeft size={16} /> Voltar
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
           <button onClick={startCopyFlow} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: 'var(--primary)' }}>
             <Copy size={16} /> Reaproveitar Treino
           </button>
           <span style={{ fontWeight: 'bold' }}>Gerenciando: {aluno.full_name}</span>
        </div>
      </div>

      {showCopyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Copy size={20}/> Reaproveitar de Outro Aluno</h3>
              <button onClick={() => setShowCopyModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div>
                  <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '0.3rem' }}>1. Selecione o Aluno de Origem</label>
                  <select 
                    value={selectedSourceStudentId} 
                    onChange={e => fetchPlansBySourceStudent(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="">Escolher Aluno...</option>
                    {otherStudents.map(s => (
                      <option key={s.id} value={s.id} style={{ color: '#000' }}>{s.full_name}</option>
                    ))}
                  </select>
               </div>

               {selectedSourceStudentId && (
                 <div>
                    <label style={{ fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '0.3rem' }}>2. Selecione o Plano para Copiar</label>
                    <select 
                      value={selectedSourcePlanId} 
                      onChange={e => setSelectedSourcePlanId(e.target.value)}
                      style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <option value="">Escolher Plano...</option>
                      {otherStudentPlans.map(p => (
                        <option key={p.id} value={p.id} style={{ color: '#000' }}>{p.title}</option>
                      ))}
                    </select>
                 </div>
               )}

               <button 
                onClick={handleCopyPlan} 
                disabled={!selectedSourcePlanId || isCopying}
                className="btn-primary" 
                style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
               >
                 {isCopying ? <><Loader2 className="animate-spin" size={18}/> Clonando...</> : 'Iniciar Cópia Mestre'}
               </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={createPlan} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px', display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <h4 style={{ width: '100%' }}>Novo Planejamento Manual</h4>
        <input type="text" placeholder="Título do Plano (Ex: Foco Hipertrofia)" value={newTitle} onChange={e => setNewTitle(e.target.value)} required style={{ flex: '1 1 100%', padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
        <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.3rem' }}>Início (Opcional)</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
        </div>
        <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.3rem' }}>Fim (Opcional)</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.8rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
        </div>
        <button type="submit" className="btn-glow" style={{ flex: '1 1 100%' }}>Criar Planejamento</button>
      </form>

      <h3>Planos do Aluno</h3>
      {plans.length === 0 ? (
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Nenhum plano cadastrado.</p>
      ) : (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {plans.map(p => {
            if (editingPlanId === p.id) {
              return (
                <div key={p.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--primary)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Título" style={{ padding: '0.5rem', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                       <label style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.2rem' }}>Início</label>
                       <input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                       <label style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.2rem' }}>Fim</label>
                       <input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '5px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={() => updatePlan(p.id)} className="btn-primary" style={{ flex: 1, padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Check size={16}/> Salvar</button>
                    <button onClick={() => setEditingPlanId(null)} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><X size={16}/> Cancelar</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={p.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '0.3rem', color: 'var(--primary)' }}>{p.title}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#aaa' }}>{p.start_date ? `${p.start_date} até ${p.end_date || '?'}` : 'Sem validade definida'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => startEditingPlan(p)} className="btn-secondary" style={{ padding: '0.5rem', color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.3)' }} title="Editar Plano"><Edit2 size={16} /></button>
                  <button onClick={() => deletePlan(p.id)} className="btn-secondary" style={{ padding: '0.5rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }} title="Excluir Plano"><Trash2 size={16} /></button>
                  <button onClick={() => openPlan(p)} className="btn-secondary" style={{ padding: '0.5rem 1rem', marginLeft: '0.5rem' }}>Estruturar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


