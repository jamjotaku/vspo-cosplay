import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

export default function Workstation() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // --- POMODORO_STATE ---
  const [pomoStatus, setPomoStatus] = useState('idle'); // idle, focus, break
  const [timeLeft, setTimeLeft] = useState(0);
  const [focusTime, setFocusTime] = useState(25);
  const [sessionsToday, setSessionsToday] = useState(0);

  // --- TODO_STATE ---
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchTodos(session.user.id);
        fetchStats(session.user.id);
      }
      setLoading(false);
    });
  }, []);

  // --- DATA_FETCHING ---
  const fetchTodos = async (uid) => {
    const { data } = await supabase.from('todo_list').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    setTodos(data || []);
  };

  const fetchStats = async (uid) => {
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase.from('work_logs').select('*', { count: 'exact', head: true }).eq('user_id', uid).gte('completed_at', today);
    setSessionsToday(count || 0);
  };

  // --- POMODORO_LOGIC ---
  useEffect(() => {
    if (pomoStatus === 'idle') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomoStatus]);

  const handleSessionComplete = async () => {
    const type = pomoStatus.toUpperCase();
    const mins = pomoStatus === 'focus' ? focusTime : 5;
    
    if (pomoStatus === 'focus') {
      await supabase.from('work_logs').insert([{ user_id: user.id, session_type: 'FOCUS', duration_minutes: focusTime }]);
      setSessionsToday(prev => prev + 1);
    }
    
    setPomoStatus('idle');
    alert(`${type}_SESSION_COMPLETE`);
  };

  const startPomo = () => {
    setPomoStatus('focus');
    setTimeLeft(focusTime * 60);
  };

  // --- TODO_LOGIC ---
  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo) return;
    const { data } = await supabase.from('todo_list').insert([{ user_id: user.id, task: newTodo }]).select().single();
    if (data) { setTodos([data, ...todos]); setNewTodo(""); }
  };

  const toggleTodo = async (id, current) => {
    const { error } = await supabase.from('todo_list').update({ is_completed: !current }).eq('id', id);
    if (!error) setTodos(todos.map(t => t.id === id ? { ...t, is_completed: !current } : t));
  };

  const deleteTodo = async (id) => {
    await supabase.from('todo_list').delete().eq('id', id);
    setTodos(todos.filter(t => t.id !== id));
  };

  if (loading) return <div className="loader">CONNECTING_TO_WORKSTATION...</div>;

  return (
    <div className="ws-root">
      <Head>
        <title>DR // TACTICAL_WORKSTATION</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;800&family=Montserrat:wght@100;400;900&display=swap" rel="stylesheet" />
      </Head>

      <header className="ws-header">
        <div className="header-inner">
          <Link href="/"><span className="nav-back">←_RETURN_TO_PORTAL</span></Link>
          <div className="ws-brand">TACTICAL_WORKSTATION // <span>OPS_CENTER</span></div>
          <div className="ws-stats">
            <div className="stat-item"><span className="s-label">DAILY_SESSIONS:</span> <span className="s-val">{sessionsToday}</span></div>
          </div>
        </div>
      </header>

      <main className="ws-container">
        <div className="ws-grid">
          
          {/* SECTOR_ALPHA: TIME_CONTROL */}
          <section className="ws-module glass">
            <div className="mod-tag">SECTOR_ALPHA // CHRONO_ENGINE</div>
            <div className="pomo-display">
              <div className={`pomo-ring ${pomoStatus}`}>
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="bg" />
                  <motion.circle cx="50" cy="50" r="45" className="fg" 
                    style={{ pathLength: pomoStatus === 'idle' ? 1 : timeLeft / (focusTime * 60) }} 
                  />
                </svg>
                <div className="timer-text">
                  {pomoStatus === 'idle' ? `${focusTime}:00` : `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`}
                </div>
              </div>
              <div className="pomo-controls">
                {pomoStatus === 'idle' ? (
                  <button className="ws-btn focus" onClick={startPomo}>INITIATE_FOCUS</button>
                ) : (
                  <button className="ws-btn abort" onClick={() => setPomoStatus('idle')}>ABORT_MISSION</button>
                )}
              </div>
              <div className="pomo-settings">
                <label>FOCUS_LENGTH (MIN)</label>
                <input type="range" min="5" max="60" step="5" value={focusTime} onChange={e => setFocusTime(parseInt(e.target.value))} />
              </div>
            </div>
          </section>

          {/* SECTOR_BRAVO: MISSION_OBJECTIVES */}
          <section className="ws-module glass">
            <div className="mod-tag">SECTOR_BRAVO // MISSION_OBJECTIVES</div>
            <form onSubmit={addTodo} className="todo-input-wrap">
              <input placeholder="NEW_OBJECTIVE_DESCRIPTION..." value={newTodo} onChange={e => setNewTodo(e.target.value)} />
              <button type="submit">ADD</button>
            </form>
            <div className="todo-list">
              <AnimatePresence>
                {todos.map(todo => (
                  <motion.div key={todo.id} className={`todo-item ${todo.is_completed ? 'done' : ''}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.5 }}>
                    <div className="todo-check" onClick={() => toggleTodo(todo.id, todo.is_completed)}>
                      {todo.is_completed && <i className="fas fa-check" />}
                    </div>
                    <span className="todo-text">{todo.task}</span>
                    <button className="todo-del" onClick={() => deleteTodo(todo.id)}>&times;</button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

        </div>
      </main>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #030306; }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; margin: 0; }

        .ws-header { height: 75px; border-bottom: 1px solid #111; display: flex; align-items: center; padding: 0 40px; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); position: sticky; top: 0; z-index: 1000; }
        .header-inner { max-width: 1400px; margin: 0 auto; width: 100%; display: flex; justify-content: space-between; align-items: center; }
        .ws-brand { font-family: 'JetBrains Mono'; font-weight: 800; font-size: 14px; letter-spacing: 0.3em; }
        .ws-brand span { color: var(--v-cyn); }
        .nav-back { color: #444; font-size: 10px; font-weight: 800; font-family: 'JetBrains Mono'; cursor: pointer; }
        
        .ws-stats { display: flex; gap: 30px; }
        .stat-item { font-family: 'JetBrains Mono'; font-size: 10px; color: #444; }
        .stat-item .s-val { color: var(--v-mag); font-weight: 800; font-size: 12px; }

        .ws-container { max-width: 1200px; margin: 0 auto; padding: 60px 40px; }
        .ws-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 40px; }

        .ws-module { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 50px; position: relative; }
        .mod-tag { position: absolute; top: 15px; left: 20px; color: #333; font-size: 8px; font-family: 'JetBrains Mono'; letter-spacing: 0.2em; }

        /* POMO_UI */
        .pomo-display { display: flex; flex-direction: column; align-items: center; gap: 40px; }
        .pomo-ring { position: relative; width: 220px; height: 220px; }
        .pomo-ring svg { transform: rotate(-90deg); }
        .pomo-ring circle { fill: none; stroke-width: 2; }
        .pomo-ring .bg { stroke: #111; }
        .pomo-ring .fg { stroke: var(--v-mag); stroke-linecap: round; filter: drop-shadow(0 0 8px var(--v-mag)); }
        .pomo-ring.focus .fg { stroke: var(--v-mag); }
        .pomo-ring.break .fg { stroke: var(--v-cyn); }
        
        .timer-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono'; font-size: 42px; font-weight: 300; }

        .ws-btn { background: none; border: 1px solid #222; color: #fff; padding: 15px 40px; font-family: 'JetBrains Mono'; font-size: 11px; letter-spacing: 0.2em; cursor: pointer; transition: 0.4s; }
        .ws-btn.focus:hover { background: var(--v-mag); border-color: var(--v-mag); box-shadow: 0 0 30px rgba(255,0,255,0.3); }
        .ws-btn.abort:hover { background: #333; border-color: #333; }

        .pomo-settings { width: 100%; }
        .pomo-settings label { display: block; font-family: 'JetBrains Mono'; font-size: 8px; color: #444; margin-bottom: 10px; text-align: center; }
        input[type="range"] { -webkit-appearance: none; width: 100%; height: 2px; background: #222; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: var(--v-mag); border-radius: 50%; cursor: pointer; }

        /* TODO_UI */
        .todo-input-wrap { display: flex; gap: 10px; margin-bottom: 30px; }
        .todo-input-wrap input { flex: 1; background: #0a0a0a; border: 1px solid #111; padding: 15px; color: #fff; font-family: 'JetBrains Mono'; font-size: 12px; outline: none; }
        .todo-input-wrap input:focus { border-color: var(--v-cyn); }
        .todo-input-wrap button { background: #fff; color: #000; border: none; padding: 0 20px; font-family: 'JetBrains Mono'; font-weight: 800; font-size: 10px; }

        .todo-list { display: flex; flex-direction: column; gap: 15px; max-height: 400px; overflow-y: auto; }
        .todo-item { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.01); padding: 15px; border: 1px solid rgba(255,255,255,0.03); }
        .todo-check { width: 18px; height: 18px; border: 1px solid #222; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px; color: var(--v-cyn); }
        .todo-text { flex: 1; font-size: 13px; color: #888; }
        .todo-item.done .todo-text { text-decoration: line-through; color: #222; }
        .todo-item.done .todo-check { border-color: var(--v-cyn); background: rgba(0,242,255,0.1); }
        .todo-del { background: none; border: none; color: #222; font-size: 18px; cursor: pointer; transition: 0.3s; }
        .todo-del:hover { color: #ff0055; }

        .loader { height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono'; color: var(--v-cyn); letter-spacing: 0.5em; }
      `}</style>
    </div>
  );
}