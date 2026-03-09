import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const MASTER_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSAruZ3gKMni3ipy08kB8iVkpwlUTlpOro_TvCO4ilZaDeUvdlwVEqYqcsLtbSu5gV0ZhqeRJhDSY0-/pub?output=csv";
const formatUserId = (id) => `${id}@vspo-internal.local`;

export default function Tracker() {
  const [masterData, setMasterData] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProgress, setUserProgress] = useState({});

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const loadMaster = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(MASTER_CSV_URL, {
        download: true, header: true, skipEmptyLines: true,
        complete: (res) => {
          setMasterData(res.data);
          if (res.data.length > 0) setSelectedItem(res.data[0]);
          setLoading(false);
        }
      });
    };
    loadMaster();
  }, []);

  useEffect(() => { if (user) fetchProgress(); }, [user]);

  const fetchProgress = async () => {
    const { data } = await supabase.from('user_progress').select('*').eq('user_id', user.id);
    if (data) {
      const formatted = {};
      data.forEach(row => { formatted[row.master_id] = { parts: row.parts }; });
      setUserProgress(formatted);
    }
  };

  const saveToSupabase = async (id, parts) => {
    if (!user) return;
    await supabase.from('user_progress').upsert({
      user_id: user.id, master_id: id, parts: parts, updated_at: new Date()
    }, { onConflict: 'user_id, master_id' });
  };

  const updatePercent = (index, val) => {
    const id = selectedItem.Master_ID;
    const newParts = [...(userProgress[id]?.parts || [])];
    newParts[index].percent = parseInt(val);
    const newProgress = { ...userProgress, [id]: { parts: newParts } };
    setUserProgress(newProgress);
    saveToSupabase(id, newParts);
  };

  // Auth Functions (Simplified for UI Sync)
  const handleAuthAction = async (type) => {
    const userId = prompt("ENTER_UNIT_ID");
    const password = prompt("ENTER_ACCESS_KEY");
    if (!userId || !password) return;
    const { error } = type === 'in' 
      ? await supabase.auth.signInWithPassword({ email: formatUserId(userId), password })
      : await supabase.auth.signUp({ email: formatUserId(userId), password });
    if (error) alert(error.message);
    else window.location.reload();
  };

  if (loading) return <div className="t-loading">LOADING_SYSTEM_DATA...</div>;

  const currentParts = selectedItem ? (userProgress[selectedItem.Master_ID]?.parts || []) : [];
  const totalProgress = currentParts.length > 0 
    ? Math.round(currentParts.reduce((acc, p) => acc + p.percent, 0) / currentParts.length) 
    : 0;

  return (
    <div className="t-root">
      <Head>
        <title>PRODUCTION_TRACKER // VSPO!</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;400;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* --- TOP SCAN LINE (Total Progress) --- */}
      <div className="t-scan-line" style={{ width: `${totalProgress}%` }}></div>

      <div className="t-layout">
        {/* LEFT: DATABASE WING */}
        <aside className="t-wing-left">
          <header className="t-side-head">
            <Link href="/"><div className="t-back-btn">PORTAL</div></Link>
            <div className="t-system-id">SYS_VER // 2.6.0</div>
          </header>
          <div className="t-item-list no-scrollbar">
            {masterData.map((item) => (
              <div 
                key={item.Master_ID} 
                className={`t-item ${selectedItem?.Master_ID === item.Master_ID ? 'active' : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="t-item-inner">
                  <span className="t-mem">{item.Member_Name}</span>
                  <span className="t-type">{item.Costume_Type}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="t-auth-footer">
            {!user ? (
              <button onClick={() => handleAuthAction('in')} className="t-glass-btn">INITIALIZE_LOGIN</button>
            ) : (
              <div className="t-user-status" onClick={() => supabase.auth.signOut()}>
                <span className="dot pulse"></span> {user.email.split('@')[0]} [LOGOUT]
              </div>
            )}
          </div>
        </aside>

        {/* CENTER: OBSERVATION STAGE */}
        <main className="t-stage">
          <div className="t-stage-grid"></div>
          <div className="t-stage-header">
            <div className="t-stage-title">
              <h2>{selectedItem?.Member_Name} <span className="sep">//</span> <span className="sub">{selectedItem?.Costume_Type}</span></h2>
            </div>
            <div className="t-stage-meta">ZOOM: {Math.round(zoom * 100)}% / REF_LUMINANCE: ON</div>
          </div>
          
          <div 
            className="t-viewport"
            onWheel={(e) => setZoom(prev => Math.min(Math.max(prev + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 5))}
            onMouseDown={(e) => { setIsDragging(true); setStartPos({ x: e.clientX - offset.x, y: e.clientY - offset.y }); }}
            onMouseMove={(e) => { if (isDragging) setOffset({ x: e.clientX - startPos.x, y: e.clientY - startPos.y }); }}
            onMouseUp={() => setIsDragging(false)}
          >
            {selectedItem && (
              <img 
                src={selectedItem.Ref_Image_URL} 
                alt="Ref" 
                className="t-ref-img" 
                draggable="false"
                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
              />
            )}
          </div>
        </main>

        {/* RIGHT: PRODUCTION PANEL */}
        <aside className="t-wing-right">
          <div className="t-panel-head">
            <span className="t-lab">PRODUCTION_LOG</span>
            <div className="t-total-circle">{totalProgress}%</div>
          </div>
          
          <div className="t-progress-area no-scrollbar">
            {user ? (
              <div className="t-parts-container">
                <button className="t-add-part" onClick={() => {
                  const name = prompt("NEW_PART_NAME");
                  if (name) {
                    const next = [...currentParts, { name, percent: 0 }];
                    setUserProgress({ ...userProgress, [selectedItem.Master_ID]: { parts: next } });
                    saveToSupabase(selectedItem.Master_ID, next);
                  }
                }}>+ ATTACH_NEW_COMPONENT</button>
                
                {currentParts.map((part, idx) => (
                  <div key={idx} className="t-part-card">
                    <div className="t-part-info">
                      <span className="t-p-name">{part.name}</span>
                      <span className="t-p-val">{part.percent}%</span>
                    </div>
                    <div className="t-slider-wrap">
                      <input 
                        type="range" min="0" max="100" value={part.percent} 
                        onChange={(e) => updatePercent(idx, e.target.value)} 
                      />
                      <div className="t-slider-glow" style={{ width: `${part.percent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="t-guest-msg">SYSTEM_LOCKED: 閲覧のみ可能です。進捗を記録するには認証が必要です。</div>
            )}
          </div>
        </aside>
      </div>

      <style jsx global>{`
        :root { --v-cyan: #00f2ff; --v-magenta: #ff00ff; --v-glass: rgba(255, 255, 255, 0.03); }
        body { margin:0; background:#000; font-family:'Montserrat', sans-serif; color:#fff; overflow:hidden; }
        
        .t-root { height:100vh; width:100vw; position:relative; }
        .t-scan-line { position:fixed; top:0; left:0; height:2px; background:var(--v-magenta); box-shadow: 0 0 10px var(--v-magenta); z-index:3000; transition: 0.6s cubic-bezier(0.19, 1, 0.22, 1); }
        
        .t-layout { display:flex; height:100%; }
        
        /* --- Sidebar Left --- */
        .t-wing-left { width:280px; background:#050505; border-right:1px solid #111; display:flex; flex-direction:column; }
        .t-side-head { padding:30px; border-bottom:1px solid #111; }
        .t-back-btn { font-size:10px; font-weight:800; color:#444; letter-spacing:0.2em; cursor:pointer; margin-bottom:10px; }
        .t-system-id { font-size:9px; color:#222; font-weight:700; }
        
        .t-item-list { flex:1; overflow-y:auto; padding:10px; }
        .t-item { padding:15px 20px; border-radius:4px; margin-bottom:5px; cursor:pointer; transition:0.3s; border:1px solid transparent; }
        .t-item.active { background:var(--v-glass); border-color:rgba(255,255,255,0.05); }
        .t-item.active .t-mem { color:var(--v-cyan); text-shadow:0 0 10px rgba(0,242,255,0.3); }
        .t-mem { display:block; font-size:13px; font-weight:800; color:#555; }
        .t-type { font-size:9px; font-weight:700; color:#222; letter-spacing:0.05em; }

        .t-auth-footer { padding:20px; border-top:1px solid #111; }
        .t-glass-btn { width:100%; padding:12px; background:var(--v-glass); border:1px solid #222; color:#555; font-size:10px; font-weight:800; border-radius:4px; }
        .t-user-status { font-size:9px; font-weight:800; color:#333; display:flex; align-items:center; gap:10px; cursor:pointer; }
        .dot { width:6px; height:6px; background:var(--v-cyan); border-radius:50%; }
        .pulse { animation: pulse 2s infinite; }

        /* --- Main Viewer --- */
        .t-stage { flex:1; position:relative; background:#000; display:flex; flex-direction:column; overflow:hidden; }
        .t-stage-grid { position:absolute; inset:0; background-image: radial-gradient(#111 1px, transparent 1px); background-size: 40px 40px; opacity: 0.3; }
        .t-stage-header { position:relative; z-index:10; padding:25px 40px; background:rgba(0,0,0,0.8); backdrop-filter:blur(20px); border-bottom:1px solid #111; display:flex; justify-content:space-between; align-items:center; }
        .t-stage-title h2 { margin:0; font-size:18px; font-weight:800; }
        .sep { color:var(--v-cyan); margin:0 10px; }
        .sub { color:#444; font-weight:400; font-size:14px; }
        .t-stage-meta { font-size:9px; font-weight:800; color:#222; letter-spacing:0.1em; }
        .t-viewport { flex:1; position:relative; overflow:hidden; cursor:grab; }
        .t-viewport:active { cursor:grabbing; }
        .t-ref-img { position:absolute; top:20%; left:20%; max-height:80%; transition: transform 0.05s linear; }

        /* --- Panel Right --- */
        .t-wing-right { width:340px; background:#050505; border-left:1px solid #111; display:flex; flex-direction:column; }
        .t-panel-head { padding:30px; display:flex; justify-content:space-between; align-items:center; }
        .t-lab { font-size:10px; font-weight:800; color:#444; letter-spacing:0.15em; }
        .t-total-circle { font-size:24px; font-weight:100; color:var(--v-magenta); text-shadow:0 0 10px var(--v-magenta); }

        .t-progress-area { flex:1; overflow-y:auto; padding:0 30px 40px; }
        .t-add-part { width:100%; padding:15px; background:none; border:1px dashed #222; color:#333; font-size:10px; font-weight:800; border-radius:4px; margin-bottom:40px; transition:0.3s; }
        .t-add-part:hover { border-color:#444; color:#666; }
        
        .t-part-card { margin-bottom:30px; }
        .t-part-info { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
        .t-p-name { font-size:11px; font-weight:800; color:#888; letter-spacing:0.05em; }
        .t-p-val { font-size:12px; font-weight:800; color:var(--v-cyan); }
        
        .t-slider-wrap { position:relative; height:4px; background:#111; border-radius:10px; }
        .t-slider-wrap input { position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; z-index:10; }
        .t-slider-glow { position:absolute; top:0; left:0; height:100%; background:var(--v-cyan); box-shadow: 0 0 10px var(--v-cyan); border-radius:10px; transition: 0.3s; }

        .t-loading { height:100vh; display:flex; align-items:center; justify-content:center; background:#000; color:var(--v-cyan); font-weight:800; letter-spacing:0.3em; }
        .t-guest-msg { font-size:11px; color:#333; line-height:1.6; text-align:center; margin-top:100px; padding:0 40px; }

        @keyframes pulse { 0% { opacity:0.4; } 50% { opacity:1; } 100% { opacity:0.4; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
