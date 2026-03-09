import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

export default function Portal() {
  const [allData, setAllData] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [user, setUser] = useState(null);
  const [time, setTime] = useState(new Date());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Widget Data
  const [nextMission, setNextMission] = useState(null);
  const [latestArchive, setLatestArchive] = useState(null);
  const [productionProgress, setProductionProgress] = useState(0);

  const [config, setConfig] = useState({
    glow: true, grain: true, showWidget: true,
    showCaption: true, interval: 15000, focusMember: 'ALL', brightness: 0.8
  });

  useEffect(() => {
    const saved = localStorage.getItem('v_portal_final_v2');
    if (saved) setConfig(JSON.parse(saved));

    const savedProgress = localStorage.getItem('v_total_progress') || 45;
    setProductionProgress(parseInt(savedProgress));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchLogWidgets(session.user.id);
    });

    const clock = setInterval(() => setTime(new Date()), 1000);
    const fetchAll = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, { download: true, header: true, complete: (res) => {
        const data = res.data.filter(d => d.image || d.url);
        setAllData(data);
        const initial = data[Math.floor(Math.random() * data.length)];
        setFeatured(initial);
      }});
    };
    fetchAll();
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (allData.length === 0) return;
    const timer = setInterval(() => {
      const pool = config.focusMember === 'ALL' ? allData : allData.filter(d => d.member === config.focusMember);
      if (pool.length > 0) setFeatured(pool[Math.floor(Math.random() * pool.length)]);
    }, config.interval);
    return () => clearInterval(timer);
  }, [allData, config]);

  const fetchLogWidgets = async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('fan_logs').select('*').eq('user_id', userId).order('event_date', { ascending: true });
    if (data) {
      setNextMission(data.find(l => l.event_date > today));
      setLatestArchive([...data].reverse().find(l => l.event_date <= today));
    }
  };

  const getDaysUntil = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="p-root" style={{ '--v-bright': config.brightness }}>
      <Head>
        <title>COMMAND_CENTER // VSPO! HUB</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;400;700;800&family=Playfair+Display:ital,wght@1,900&display=swap" rel="stylesheet" />
      </Head>

      {config.grain && <div className="grain"></div>}

      <main className="t-interface">
        {/* BACKGROUND AMBIENT */}
        <div className="ambient-lit">
          {config.glow && featured && <div className="g-glow" key={featured.image}><img src={featured.image || featured.url} alt="" /></div>}
          <div className="v-mask"></div>
        </div>

        <div className="t-grid">
          {/* LEFT: PRODUCTION PANEL */}
          <div className="w-left">
            <div className="glass-panel p-status">
              <span className="p-label">PRODUCTION_STATUS</span>
              <div className="p-bar-wrap">
                <div className="p-bar-fill" style={{ width: `${productionProgress}%` }}></div>
                <span className="p-val">{productionProgress}%</span>
              </div>
              <div className="p-meta">PROJECT: {featured?.member || "SYSTEM_SCANNING"}</div>
            </div>
            
            <div className="config-box">
              <button className="glass-btn" onClick={() => setIsConfigOpen(true)}>
                <i className="fas fa-sliders-h"></i> CONFIG
              </button>
              <div className="sys-id">NODE_ID // {user ? user.email.split('@')[0] : "GUEST"}</div>
            </div>
          </div>

          {/* CENTER: CHRONO_UNIT */}
          <div className="c-core">
            <div className="z-clock">{time.toLocaleTimeString('en-US', { hour12: false })}</div>
            <div className="z-date">{time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}</div>
          </div>

          {/* RIGHT: CHRONICLE FEED */}
          <div className="w-right">
            <div className="feed-container">
              {/* MISSION CARD */}
              <div className={`f-card mission ${nextMission ? 'active' : ''}`}>
                <div className="f-head">
                  <span className="f-tag">NEXT_MISSION</span>
                  <span className="f-days">{nextMission ? `T-MINUS ${getDaysUntil(nextMission.event_date)}D` : 'STANDBY'}</span>
                </div>
                <div className="f-body">
                  <h3>{nextMission ? nextMission.event_name : 'NO_PENDING_MISSION'}</h3>
                  <span className="f-venue">{nextMission?.venue || '--'}</span>
                </div>
                {nextMission && <div className="f-glow-line"></div>}
              </div>

              {/* ARCHIVE CARD */}
              <div className="f-card archive">
                <div className="f-head">
                  <span className="f-tag">RECENT_ARCHIVE</span>
                  <span className="f-date">{latestArchive?.event_date.replace(/-/g, '.') || '0000.00.00'}</span>
                </div>
                <div className="f-body">
                  <h3>{latestArchive ? latestArchive.event_name : 'NO_RECORDS'}</h3>
                  <p className="f-note">{latestArchive?.memory_note?.slice(0, 45) || 'No recent memories recorded in system.'}...</p>
                </div>
              </div>

              <Link href="/log"><div className="f-link">OPEN_FULL_CHRONICLE <i className="fas fa-arrow-right"></i></div></Link>
            </div>
          </div>
        </div>

        {/* BOTTOM DOCK */}
        <nav className="d-dock">
          <Link href="/gallery"><div className="d-item"><i className="fas fa-th-large"></i><span>GALLERY</span></div></Link>
          <Link href="/log"><div className="d-item"><i className="fas fa-history"></i><span>LOGS</span></div></Link>
          <Link href="/tracker"><div className="d-item"><i className="fas fa-compass"></i><span>TRACKER</span></div></Link>
          <Link href="/chronicle"><div className="d-item"><i className="fas fa-project-diagram"></i><span>CHRONICLE</span></div></Link>
        </nav>
      </main>

      {/* --- CONFIG MODAL (DESIGN RESTORED) --- */}
      {isConfigOpen && (
        <div className="cfg-overlay" onClick={() => setIsConfigOpen(false)}>
          <div className="cfg-card" onClick={e => e.stopPropagation()}>
            <div className="cfg-head"><h3>SYSTEM_CONFIGURATION</h3><button onClick={() => setIsConfigOpen(false)}>&times;</button></div>
            <div className="cfg-body">
              <div className="cfg-row"><label>AMBIENT_GLOW</label><input type="checkbox" checked={config.glow} onChange={e => setConfig({...config, glow: e.target.checked})} /></div>
              <div className="cfg-row"><label>DIGITAL_GRAIN</label><input type="checkbox" checked={config.grain} onChange={e => setConfig({...config, grain: e.target.checked})} /></div>
              <div className="cfg-row"><label>MASTER_BRIGHTNESS</label><input type="range" min="0.2" max="1" step="0.1" value={config.brightness} onChange={e => setConfig({...config, brightness: parseFloat(e.target.value)})} /></div>
              <div className="cfg-row"><label>SLIDE_INTERVAL (ms)</label><input type="number" step="1000" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} /></div>
            </div>
            <button className="cfg-save" onClick={() => { localStorage.setItem('v_portal_final_v2', JSON.stringify(config)); setIsConfigOpen(false); }}>APPLY_CHANGES</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root { --v-cyan: #00f2ff; --v-magenta: #ff00ff; }
        body { margin:0; background:#000; color:#fff; font-family:'Montserrat', sans-serif; overflow:hidden; }
        
        .grain { position:fixed; inset:0; background:url('https://grainy-gradients.vercel.app/noise.svg'); opacity:0.04; pointer-events:none; z-index:999; }
        .t-interface { height:100vh; width:100vw; position:relative; z-index:10; }
        .t-grid { height:100%; display:grid; grid-template-columns: 380px 1fr 380px; padding:60px; box-sizing:border-box; align-items:center; }

        .ambient-lit { position:absolute; inset:0; z-index:1; overflow:hidden; }
        .g-glow { position:absolute; inset:-10%; filter:blur(150px); opacity:calc(0.4 * var(--v-bright)); transition:3s; }
        .g-glow img { width:100%; height:100%; object-fit:cover; }
        .v-mask { position:absolute; inset:0; background:radial-gradient(circle at center, transparent 20%, #000 80%); }

        /* WIDGET STYLES (LOG & TRACKER) */
        .glass-panel { background:rgba(255,255,255,0.03); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.05); border-radius:4px; padding:25px; margin-bottom:30px; }
        .p-label { font-size:9px; font-weight:800; color:#444; letter-spacing:0.2em; display:block; margin-bottom:12px; }
        .p-bar-wrap { position:relative; height:2px; background:rgba(255,255,255,0.05); display:flex; align-items:center; }
        .p-bar-fill { height:100%; background:var(--v-magenta); box-shadow:0 0 15px var(--v-magenta); transition:1.5s cubic-bezier(0.19, 1, 0.22, 1); }
        .p-val { position:absolute; right:0; top:-18px; font-size:10px; font-weight:800; color:var(--v-magenta); }
        .p-meta { font-size:9px; color:#222; font-weight:800; margin-top:15px; }

        .feed-container { display:flex; flex-direction:column; gap:25px; }
        .f-card { background:rgba(255,255,255,0.03); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.05); border-radius:4px; padding:25px; position:relative; overflow:hidden; transition:0.4s; }
        .f-card:hover { border-color:rgba(255,255,255,0.15); transform:translateX(-5px); }
        .f-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; }
        .f-tag { font-size:9px; font-weight:800; letter-spacing:0.2em; color:#444; }
        .mission .f-tag { color:var(--v-cyan); }
        .f-days { font-size:10px; font-weight:800; color:#fff; text-shadow:0 0 10px var(--v-cyan); }
        .f-body h3 { font-size:16px; font-weight:400; margin:0; letter-spacing:0.05em; color:#eee; }
        .f-venue { font-size:9px; color:#444; margin-top:8px; display:block; text-transform:uppercase; font-weight:700; }
        .f-note { font-size:11px; color:#666; margin-top:10px; line-height:1.5; }
        .f-glow-line { position:absolute; bottom:0; left:0; height:2px; width:100%; background:linear-gradient(90deg, var(--v-cyan), transparent); opacity:0.3; animation: scan 3s infinite; }

        /* CENTER CLOCK */
        .c-core { text-align:center; position:relative; z-index:10; }
        .z-clock { font-size:120px; font-weight:100; letter-spacing:-0.05em; line-height:1; opacity: var(--v-bright); }
        .z-date { font-size:12px; font-weight:800; color:#333; letter-spacing:0.5em; margin-top:20px; }

        /* DOCK */
        .d-dock { position:fixed; bottom:40px; left:50%; transform:translateX(-50%); display:flex; gap:10px; background:rgba(255,255,255,0.03); backdrop-filter:blur(20px); padding:8px; border-radius:50px; border:1px solid rgba(255,255,255,0.05); z-index:2000; }
        .d-item { padding:12px 25px; border-radius:40px; display:flex; align-items:center; gap:12px; cursor:pointer; transition:0.3s; color:#444; }
        .d-item:hover { color:#fff; background:rgba(255,255,255,0.05); }
        .d-item span { font-size:10px; font-weight:800; letter-spacing:0.1em; display:none; }
        .d-item:hover span { display:block; }

        /* CONFIG MODAL */
        .cfg-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.9); backdrop-filter:blur(15px); z-index:5000; display:flex; align-items:center; justify-content:center; }
        .cfg-card { background:#0a0a0b; width:400px; padding:40px; border:1px solid #111; border-radius:4px; }
        .cfg-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
        .cfg-row label { font-size:9px; font-weight:800; color:#444; letter-spacing:0.1em; }
        .cfg-save { width:100%; padding:15px; background:var(--v-cyan); color:#000; font-weight:800; font-size:10px; border:none; margin-top:20px; cursor:pointer; }

        @keyframes scan { 0% { transform:translateX(-100%); } 100% { transform:translateX(100%); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
