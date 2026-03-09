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
  
  const [nextMission, setNextMission] = useState(null);
  const [latestArchive, setLatestArchive] = useState(null);
  const [productionProgress, setProductionProgress] = useState(45);

  const [config, setConfig] = useState({
    glow: true, grain: true, interval: 15000, brightness: 0.8
  });

  useEffect(() => {
    const saved = localStorage.getItem('v_portal_final_v2');
    if (saved) setConfig(JSON.parse(saved));

    const savedProgress = localStorage.getItem('v_total_progress');
    if (savedProgress) setProductionProgress(parseInt(savedProgress));

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
        setFeatured(data[Math.floor(Math.random() * data.length)]);
      }});
    };
    fetchAll();
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (allData.length === 0) return;
    const timer = setInterval(() => {
      setFeatured(allData[Math.floor(Math.random() * allData.length)]);
    }, config.interval);
    return () => clearInterval(timer);
  }, [allData, config.interval]);

  const fetchLogWidgets = async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('fan_logs').select('*').eq('user_id', userId).order('event_date', { ascending: true });
    if (data) {
      setNextMission(data.find(l => l.event_date > today));
      setLatestArchive([...data].reverse().find(l => l.event_date <= today));
    }
  };

  return (
    <div className="p-root" style={{ '--v-bright': config.brightness }}>
      <Head><title>V-HUB // COMMAND_CENTER</title></Head>

      {config.grain && <div className="grain"></div>}

      <main className="t-interface">
        {/* BACKGROUND AMBIENT (調整済) */}
        <div className="ambient-lit">
          {config.glow && featured && <div className="g-glow" key={featured.image}><img src={featured.image || featured.url} alt="" /></div>}
          <div className="v-mask"></div>
        </div>

        <div className="t-grid">
          {/* LEFT: PRODUCTION PANEL (視認性UP) */}
          <div className="w-left">
            <div className="glass-panel">
              <span className="p-label">PRODUCTION_STATUS</span>
              <div className="p-bar-wrap">
                <div className="p-bar-fill" style={{ width: `${productionProgress}%` }}></div>
                <span className="p-val">{productionProgress}%</span>
              </div>
              <div className="p-meta">PROJECT: {featured?.member || "SCANNING..."}</div>
            </div>
            
            <div className="config-box">
              <button className="glass-btn" onClick={() => setIsConfigOpen(true)}>
                <i className="fas fa-sliders-h"></i> CONFIG
              </button>
              <div className="sys-id">NODE_ID // {user ? user.email.split('@')[0] : "GUEST"}</div>
            </div>
          </div>

          {/* CENTER: CLOCK (純白を保証) */}
          <div className="c-core">
            <div className="z-clock">{time.toLocaleTimeString('en-US', { hour12: false })}</div>
            <div className="z-date">{time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}</div>
          </div>

          {/* RIGHT: CHRONICLE FEED (視認性UP) */}
          <div className="w-right">
            <div className="feed-container">
              <div className={`f-card mission ${nextMission ? 'active' : ''}`}>
                <div className="f-head">
                  <span className="f-tag">NEXT_MISSION</span>
                  <span className="f-days">{nextMission ? `T-MINUS ${Math.max(0, Math.ceil((new Date(nextMission.event_date) - new Date()) / 86400000))}D` : 'STANDBY'}</span>
                </div>
                <div className="f-body">
                  <h3>{nextMission ? nextMission.event_name : 'NO_PENDING_MISSION'}</h3>
                  <span className="f-venue">{nextMission?.venue || '--'}</span>
                </div>
                {nextMission && <div className="f-glow-line"></div>}
              </div>

              <div className="f-card archive">
                <div className="f-head">
                  <span className="f-tag">RECENT_ARCHIVE</span>
                  <span className="f-date">{latestArchive?.event_date.replace(/-/g, '.') || '0000.00.00'}</span>
                </div>
                <div className="f-body">
                  <h3>{latestArchive ? latestArchive.event_name : 'NO_RECORDS'}</h3>
                  <p className="f-note">{latestArchive?.memory_note?.slice(0, 45) || 'No recent memories recorded.'}...</p>
                </div>
              </div>
              <Link href="/log"><div className="f-link">OPEN_CHRONICLE <i className="fas fa-arrow-right"></i></div></Link>
            </div>
          </div>
        </div>

        {/* BOTTOM DOCK (アイコン輝度UP) */}
        <nav className="d-dock">
          <Link href="/gallery"><div className="d-item"><i className="fas fa-th-large"></i><span>GALLERY</span></div></Link>
          <Link href="/log"><div className="d-item"><i className="fas fa-history"></i><span>LOGS</span></div></Link>
          <Link href="/tracker"><div className="d-item"><i className="fas fa-compass"></i><span>TRACKER</span></div></Link>
          <Link href="/chronicle"><div className="d-item"><i className="fas fa-project-diagram"></i><span>CHRONICLE</span></div></Link>
        </nav>
      </main>

      {/* --- CONFIG MODAL (UI復旧済) --- */}
      {isConfigOpen && (
        <div className="cfg-overlay" onClick={() => setIsConfigOpen(false)}>
          <div className="cfg-card" onClick={e => e.stopPropagation()}>
            <div className="cfg-head"><h3>SYSTEM_CONFIGURATION</h3><button onClick={() => setIsConfigOpen(false)}>&times;</button></div>
            <div className="cfg-body">
              <div className="cfg-row"><label>AMBIENT_GLOW</label><input type="checkbox" checked={config.glow} onChange={e => setConfig({...config, glow: e.target.checked})} /></div>
              <div className="cfg-row"><label>MASTER_BRIGHTNESS</label><input type="range" min="0.2" max="1" step="0.1" value={config.brightness} onChange={e => setConfig({...config, brightness: parseFloat(e.target.value)})} /></div>
              <div className="cfg-row"><label>INTERVAL</label><input type="number" step="1000" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} /></div>
            </div>
            <button className="cfg-save" onClick={() => { localStorage.setItem('v_portal_final_v2', JSON.stringify(config)); setIsConfigOpen(false); }}>APPLY</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root { --v-cyan: #00f2ff; --v-magenta: #ff00ff; }
        body { margin:0; background:#000; color:#fff; font-family:'Montserrat', sans-serif; overflow:hidden; }
        
        .grain { position:fixed; inset:0; background:url('https://grainy-gradients.vercel.app/noise.svg'); opacity:0.05; pointer-events:none; z-index:999; }
        .t-interface { height:100vh; width:100vw; position:relative; z-index:10; }
        .t-grid { height:100%; display:grid; grid-template-columns: 380px 1fr 380px; padding:60px; box-sizing:border-box; align-items:center; }

        /* 背景マスクの緩和 */
        .ambient-lit { position:absolute; inset:0; z-index:1; }
        .g-glow { position:absolute; inset:-5%; filter:blur(120px); opacity:calc(0.5 * var(--v-bright)); transition:3s; }
        .g-glow img { width:100%; height:100%; object-fit:cover; }
        .v-mask { position:absolute; inset:0; background:radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.4) 60%, #000 95%); }

        /* テキスト視認性向上 */
        .glass-panel { background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); padding:25px; border-radius:4px; margin-bottom:30px; }
        .p-label, .f-tag { font-size:9px; font-weight:800; color:#888; letter-spacing:0.2em; display:block; margin-bottom:12px; }
        .p-bar-wrap { position:relative; height:2px; background:rgba(255,255,255,0.1); display:flex; align-items:center; }
        .p-bar-fill { height:100%; background:var(--v-magenta); box-shadow:0 0 15px var(--v-magenta); }
        .p-val { position:absolute; right:0; top:-18px; font-size:10px; font-weight:800; color:var(--v-magenta); }
        .p-meta, .sys-id { font-size:9px; color:#555; font-weight:800; margin-top:15px; letter-spacing:0.1em; }

        .f-card { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:25px; border-radius:4px; margin-bottom:20px; transition:0.3s; }
        .f-days, .f-date { font-size:10px; font-weight:800; color:#888; }
        .mission .f-days { color:#fff; text-shadow:0 0 10px var(--v-cyan); }
        .f-body h3 { font-size:16px; font-weight:400; color:#fff; }
        .f-venue { font-size:9px; color:#666; font-weight:700; margin-top:8px; display:block; }
        .f-note { font-size:11px; color:#999; margin-top:10px; line-height:1.5; }
        .f-link { font-size:10px; font-weight:800; color:#444; cursor:pointer; margin-top:15px; }
        .f-link:hover { color:#fff; }

        .c-core { text-align:center; }
        .z-clock { font-size:120px; font-weight:100; letter-spacing:-0.05em; color:#fff; opacity:1; }
        .z-date { font-size:12px; font-weight:800; color:#555; letter-spacing:0.5em; margin-top:20px; }

        .d-dock { position:fixed; bottom:40px; left:50%; transform:translateX(-50%); display:flex; gap:10px; background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); padding:8px; border-radius:50px; border:1px solid rgba(255,255,255,0.1); }
        .d-item { padding:12px 25px; border-radius:40px; display:flex; align-items:center; gap:12px; cursor:pointer; color:#888; }
        .d-item:hover { color:#fff; background:rgba(255,255,255,0.1); }
        .d-item span { font-size:10px; font-weight:800; display:none; }
        .d-item:hover span { display:block; }

        .cfg-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.95); backdrop-filter:blur(20px); z-index:5000; display:flex; align-items:center; justify-content:center; }
        .cfg-card { background:#0a0a0b; width:400px; padding:40px; border:1px solid #222; border-radius:4px; }
        .cfg-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
        .cfg-row label { font-size:9px; font-weight:800; color:#444; }
        .cfg-save { width:100%; padding:15px; background:var(--v-cyan); color:#000; font-weight:800; border:none; margin-top:20px; cursor:pointer; }
      `}</style>
    </div>
  );
}
