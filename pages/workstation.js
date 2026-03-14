import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

const MEMBER_ORDER = [
  '全員', '集合', '花芽すみれ', '花芽なずな', '小雀とと', '一ノ瀬うるは', '胡桃のあ',
  '兎咲ミミ', '空澄セナ', '橘ひなの', '英リサ', '如月れん', '神成きゅぴ', '八雲べに', 
  '藍沢エマ', '紫宮るな', '猫汰つな', '白波らむね', '小森めと', '夢野あかり', 
  '夜乃くろむ', '紡木こかげ', '千燈ゆうひ', '蝶屋はなび', '甘結もか', '銀城サイネ', '龍巻ちせ'
];

export default function Workstation() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);

  // --- WORKSTATION_INDEPENDENT_CONFIG ---
  const [wsConfig, setWsConfig] = useState({
    focusTime: 25,
    breakTime: 5,
    member: '全員',
    cosplayer: '全員',
    photoInterval: 60
  });
  const [isWsSettingsOpen, setIsWsSettingsOpen] = useState(false);

  // --- POMODORO_STATE ---
  const [pomoStatus, setPomoStatus] = useState('idle'); // idle, focus, break
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);

  // --- TODO_STATE ---
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");

  useEffect(() => {
    // 初期化: 設定の読み込み
    const saved = localStorage.getItem('dr_workstation_config');
    if (saved) setWsConfig(JSON.parse(saved));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchTodos(session.user.id);
        fetchStats(session.user.id);
      }
    });

    // CSVデータ取得
    const loadCsv = async () => {
      const Papa = (await import('papaparse')).default;
       Papa.parse(CSV_URL, {
        download: true, header: true, complete: (res) => {
          const data = res.data.filter(d => d.image || d.url).map(d => ({
            member: (d.member || d['名前'] || "").trim(),
            image: (d.image || d['画像'] || d.link || d.url || "").replace('name=medium', 'name=large'),
            cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
          }));
          setAllData(data);
          setLoading(false);
        }
      });
    };
    loadCsv();
  }, []);

  // --- PHOTO_LOGIC (独立選出) ---
  const pickPhoto = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => 
      (wsConfig.member === '全員' || p.member === wsConfig.member) &&
      (wsConfig.cosplayer === '全員' || p.cosplayer === wsConfig.cosplayer)
    );
    if (pool.length === 0) pool = allData;
    setCurrentPhoto(pool[Math.floor(Math.random() * pool.length)]);
  }, [allData, wsConfig.member, wsConfig.cosplayer]);

  useEffect(() => {
    pickPhoto();
    const interval = (pomoStatus === 'break' ? 15 : wsConfig.photoInterval) * 1000;
    const timer = setInterval(pickPhoto, interval);
    return () => clearInterval(timer);
  }, [pickPhoto, wsConfig.photoInterval, pomoStatus]);

  const cosplayerList = useMemo(() => ['全員', ...new Set(allData.map(d => d.cosplayer))].sort(), [allData]);

  // --- DATA_FETCHING (Supabase) ---
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
    const isFocus = pomoStatus === 'focus';
    if (isFocus) {
      await supabase.from('work_logs').insert([{ user_id: user.id, session_type: 'FOCUS', duration_minutes: wsConfig.focusTime }]);
      setSessionsToday(prev => prev + 1);
    }
    const nextStatus = isFocus ? 'break' : 'idle';
    setPomoStatus(nextStatus);
    setTimeLeft(isFocus ? wsConfig.breakTime * 60 : 0);
    alert(isFocus ? "MISSION_ACCOMPLISHED. TAKE_A_BREAK." : "BREAK_FINISHED. STANDBY_FOR_NEXT_MISSION.");
  };

  const startPomo = () => { setPomoStatus('focus'); setTimeLeft(wsConfig.focusTime * 60); };

  // --- TODO_LOGIC ---
  const addTodo = async (e) => {
    e.preventDefault(); if (!newTodo || !user) return;
    const { data } = await supabase.from('todo_list').insert([{ user_id: user.id, task: newTodo }]).select().single();
    if (data) { setTodos([data, ...todos]); setNewTodo(""); }
  };
  const toggleTodo = async (id, current) => {
    await supabase.from('todo_list').update({ is_completed: !current }).eq('id', id);
    setTodos(todos.map(t => t.id === id ? { ...t, is_completed: !current } : t));
  };
  const deleteTodo = async (id) => {
    await supabase.from('todo_list').delete().eq('id', id);
    setTodos(todos.filter(t => t.id !== id));
  };

  if (loading) return <div className="loader">CALIBRATING_SUPPORT_SYSTEM...</div>;

  return (
    <div className="ws-root">
      <Head>
        <title>DR // TACTICAL_WORKSTATION</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;800&family=Montserrat:wght@100;400;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      <header className="ws-header">
        <div className="header-inner">
          <Link href="/"><span className="nav-back">←_PORTAL_SYS</span></Link>
          <div className="ws-brand">TACTICAL_WORKSTATION // <span>OPS_v4</span></div>
          <div className="ws-header-actions">
            <div className="stat-pill">COMPLETED_SESSIONS: {sessionsToday}</div>
            <button className="ws-config-trigger" onClick={() => setIsWsSettingsOpen(true)}>
              <i className="fas fa-cog" /> CONFIG
            </button>
          </div>
        </div>
      </header>

      <main className="ws-container">
        <div className="ws-grid">
          
          {/* SECTOR_ALPHA: CHRONO & MONITOR (画像連動) */}
          <section className="ws-module monitor-module glass">
            <div className="mod-tag">SECTOR_ALPHA // MISSION_CONTROL</div>
            
            {/* Background Photo Layer */}
            <AnimatePresence mode='wait'>
              <motion.div 
                key={currentPhoto?.image}
                className="monitor-bg"
                initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
              >
                {currentPhoto && <img src={currentPhoto.image} alt="" />}
              </motion.div>
            </AnimatePresence>

            <div className="pomo-overlay">
              <div className={`pomo-ring ${pomoStatus}`}>
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="48" className="bg" />
                  <motion.circle 
                    cx="50" cy="50" r="48" className="fg" 
                    style={{ pathLength: pomoStatus === 'idle' ? 1 : timeLeft / (pomoStatus === 'focus' ? wsConfig.focusTime * 60 : wsConfig.breakTime * 60) }} 
                  />
                </svg>
                <div className="timer-display">
                  <span className="t-status">{pomoStatus.toUpperCase()}</span>
                  <span className="t-clock">
                    {pomoStatus === 'idle' ? `${wsConfig.focusTime}:00` : `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`}
                  </span>
                </div>
              </div>

              <div className="pomo-controls">
                {pomoStatus === 'idle' ? (
                  <button className="ws-btn focus-btn" onClick={startPomo}>START_MISSION</button>
                ) : (
                  <button className="ws-btn abort-btn" onClick={() => setPomoStatus('idle')}>ABORT_OPS</button>
                )}
              </div>

              {currentPhoto && (
                <div className="monitor-info-tag">
                  <span>IDENTIFIED: {currentPhoto.member}</span>
                  <span>SOURCE: {currentPhoto.cosplayer}</span>
                </div>
              )}
            </div>
          </section>

          {/* SECTOR_BRAVO: OBJECTIVES */}
          <section className="ws-module glass">
            <div className="mod-tag">SECTOR_BRAVO // MISSION_OBJECTIVES</div>
            <form onSubmit={addTodo} className="ws-input-group">
              <input placeholder="ENTER_NEW_GOAL..." value={newTodo} onChange={e => setNewTodo(e.target.value)} />
              <button type="submit">ADD</button>
            </form>
            <div className="ws-todo-list">
              {todos.map(todo => (
                <motion.div key={todo.id} className={`ws-todo-item ${todo.is_completed ? 'done' : ''}`} layout>
                  <div className="check-box" onClick={() => toggleTodo(todo.id, todo.is_completed)}>
                    {todo.is_completed && <i className="fas fa-check" />}
                  </div>
                  <span className="todo-label">{todo.task}</span>
                  <button className="todo-remove" onClick={() => deleteTodo(todo.id)}>&times;</button>
                </motion.div>
              ))}
            </div>
          </section>

        </div>
      </main>

      {/* --- INDEPENDENT SETTINGS MODAL --- */}
      <AnimatePresence>
        {isWsSettingsOpen && (
          <div className="ws-modal-overlay" onClick={() => setIsWsSettingsOpen(false)}>
            <motion.div className="ws-modal-card" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={e => e.stopPropagation()}>
              <div className="modal-head">
                <h3>WORKSTATION_CONFIGURATION</h3>
                <button onClick={() => setIsWsSettingsOpen(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="m-row">
                  <label>TARGET_MEMBER</label>
                  <select value={wsConfig.member} onChange={e => setWsConfig({...wsConfig, member: e.target.value})}>
                    {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="m-row">
                  <label>COSPLAYER_FILTER</label>
                  <select value={wsConfig.cosplayer} onChange={e => setWsConfig({...wsConfig, cosplayer: e.target.value})}>
                    {cosplayerList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="m-row-grid">
                  <div className="m-cell">
                    <label>FOCUS_DURATION (MIN)</label>
                    <input type="number" value={wsConfig.focusTime} onChange={e => setWsConfig({...wsConfig, focusTime: parseInt(e.target.value)})} />
                  </div>
                  <div className="m-cell">
                    <label>BREAK_DURATION (MIN)</label>
                    <input type="number" value={wsConfig.breakTime} onChange={e => setWsConfig({...wsConfig, breakTime: parseInt(e.target.value)})} />
                  </div>
                </div>
                <div className="m-row">
                  <label>PHOTO_ROTATION (SEC)</label>
                  <input type="range" min="10" max="300" step="10" value={wsConfig.photoInterval} onChange={e => setWsConfig({...wsConfig, photoInterval: parseInt(e.target.value)})} />
                </div>
              </div>
              <button className="m-save-btn" onClick={() => { localStorage.setItem('dr_workstation_config', JSON.stringify(wsConfig)); setIsWsSettingsOpen(false); pickPhoto(); }}>
                APPLY_CHANGES_TO_STATION
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #020204; }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; margin: 0; }

        .ws-header { height: 75px; border-bottom: 1px solid #111; display: flex; align-items: center; padding: 0 40px; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); position: sticky; top: 0; z-index: 1000; }
        .header-inner { max-width: 1400px; margin: 0 auto; width: 100%; display: flex; justify-content: space-between; align-items: center; }
        .ws-brand { font-family: 'JetBrains Mono'; font-weight: 800; font-size: 14px; letter-spacing: 0.3em; }
        .ws-brand span { color: var(--v-cyn); }
        .nav-back { color: #444; font-size: 10px; font-family: 'JetBrains Mono'; cursor: pointer; }

        .ws-header-actions { display: flex; align-items: center; gap: 30px; }
        .stat-pill { font-family: 'JetBrains Mono'; font-size: 9px; color: #555; border: 1px solid #222; padding: 5px 15px; border-radius: 20px; }
        .ws-config-trigger { background: none; border: none; color: #eee; font-family: 'JetBrains Mono'; font-size: 10px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .ws-config-trigger:hover { color: var(--v-cyn); }

        .ws-container { max-width: 1300px; margin: 0 auto; padding: 50px 40px; }
        .ws-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px; height: 650px; }

        .ws-module { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 50px; position: relative; overflow: hidden; }
        .mod-tag { position: absolute; top: 15px; left: 20px; color: #333; font-size: 8px; font-family: 'JetBrains Mono'; letter-spacing: 0.2em; z-index: 20; }

        /* MONITOR_MODULE */
        .monitor-module { display: flex; align-items: center; justify-content: center; }
        .monitor-bg { position: absolute; inset: 0; z-index: 1; }
        .monitor-bg img { width: 100%; height: 100%; object-fit: cover; filter: saturate(0.5); }
        .pomo-overlay { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; gap: 40px; background: rgba(0,0,0,0.4); padding: 50px; border-radius: 50%; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); width: 350px; height: 350px; justify-content: center; }

        .pomo-ring { position: relative; width: 260px; height: 260px; }
        .pomo-ring svg { transform: rotate(-90deg); width: 100%; height: 100%; }
        .pomo-ring circle { fill: none; stroke-width: 1.5; }
        .pomo-ring .bg { stroke: #111; }
        .pomo-ring .fg { stroke: var(--v-mag); stroke-linecap: round; filter: drop-shadow(0 0 12px var(--v-mag)); transition: stroke 0.4s; }
        .pomo-ring.break .fg { stroke: var(--v-cyn); filter: drop-shadow(0 0 12px var(--v-cyn)); }
        
        .timer-display { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'JetBrains Mono'; }
        .t-status { font-size: 9px; color: #555; letter-spacing: 0.3em; margin-bottom: 5px; }
        .t-clock { font-size: 52px; font-weight: 300; }

        .ws-btn { background: none; border: 1px solid #333; color: #fff; padding: 12px 30px; font-family: 'JetBrains Mono'; font-size: 10px; letter-spacing: 0.2em; cursor: pointer; transition: 0.4s; }
        .focus-btn:hover { background: var(--v-mag); border-color: var(--v-mag); box-shadow: 0 0 30px rgba(255,0,255,0.4); }
        .abort-btn:hover { background: #ff0055; border-color: #ff0055; }

        .monitor-info-tag { position: absolute; bottom: -60px; display: flex; flex-direction: column; align-items: center; gap: 5px; font-size: 8px; font-family: 'JetBrains Mono'; color: #444; }

        /* OBJECTIVES */
        .ws-input-group { display: flex; gap: 10px; margin-bottom: 30px; }
        .ws-input-group input { flex: 1; background: #0a0a0a; border: 1px solid #111; padding: 15px; color: #fff; font-family: 'JetBrains Mono'; font-size: 12px; outline: none; }
        .ws-input-group button { background: #fff; color: #000; border: none; padding: 0 25px; font-family: 'JetBrains Mono'; font-weight: 800; font-size: 10px; cursor: pointer; }

        .ws-todo-list { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; max-height: 400px; }
        .ws-todo-item { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.01); padding: 18px; border: 1px solid rgba(255,255,255,0.03); }
        .ws-todo-item.done { opacity: 0.4; }
        .check-box { width: 18px; height: 18px; border: 1px solid #222; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 10px; color: var(--v-cyn); }
        .todo-label { flex: 1; font-size: 13px; font-weight: 300; }
        .ws-todo-item.done .todo-label { text-decoration: line-through; }
        .todo-remove { background: none; border: none; color: #222; font-size: 20px; cursor: pointer; transition: 0.3s; }
        .todo-remove:hover { color: #ff0055; }

        /* MODAL */
        .ws-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(20px); z-index: 5000; display: flex; align-items: center; justify-content: center; }
        .ws-modal-card { background: #0a0a0c; width: 500px; padding: 50px; border: 1px solid #1a1a1c; position: relative; }
        .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 1px solid #111; padding-bottom: 15px; }
        .modal-head h3 { font-family: 'JetBrains Mono'; font-size: 12px; letter-spacing: 0.1em; color: #eee; }
        .modal-head button { background: none; border: none; color: #444; font-size: 32px; cursor: pointer; }
        .m-row { margin-bottom: 25px; }
        .m-row label { display: block; font-family: 'JetBrains Mono'; font-size: 9px; color: #444; margin-bottom: 10px; }
        .m-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
        select, input[type="number"], input[type="range"] { width: 100%; background: #111; border: 1px solid #222; padding: 12px; color: #fff; border-radius: 4px; font-family: 'JetBrains Mono'; font-size: 12px; }
        .m-save-btn { width: 100%; padding: 20px; background: var(--v-cyn); color: #000; border: none; font-family: 'JetBrains Mono'; font-weight: 800; cursor: pointer; margin-top: 20px; }

        .loader { height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono'; color: var(--v-cyn); letter-spacing: 0.8em; }
      `}</style>
    </div>
  );
}
