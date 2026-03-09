import React, { useState, useEffect } from 'react';
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
    const saved = localStorage.getItem('v_portal_final_v3');
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
      <Head><title>COMMAND_CENTER // VSPO! HUB</title></Head>

      {config.grain && <div className="p-grain"></div>}
      <div className="p-ambient">
        {config.glow && featured && <div className="p-glow-wrap" key={featured.image}><img src={featured.image || featured.url} alt="" /></div>}
        <div className="p-mask"></div>
      </div>

      <main className="p-main-layer">
        <div className="p-grid">
          <div className="p-wing-left">
            <div className="p-glass-panel">
              <span className="p-tag">PRODUCTION_STATUS</span>
              <div className="p-progress-wrap">
                <div className="p-progress-bar" style={{ width: `${productionProgress}%` }}></div>
                <span className="p-progress-val">{productionProgress}%</span>
              </div>
              <div className="p-meta">UNIT_ID: {user ? user.email.split('@')[0] : "GUEST_LINK"}</div>
            </div>
            <button className="p-config-btn" onClick={() => setIsConfigOpen(true)}>
              <i className="fas fa-sliders-h"></i> CONFIG_SYSTEM
            </button>
          </div>

          <div className="p-chrono-core">
            <div className="p-clock">{time.toLocaleTimeString('en-US', { hour12: false })}</div>
            <div className="p-date">{time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}</div>
          </div>

          <div className="p-wing-right">
            <div className="p-stack">
              {featured && (
                <div className="p-featured-card">
                  <div className="p-featured-media">
                    {/* 修正：object-fit containで全身を表示 */}
                    <img src={featured.image || featured.url} alt="" key={featured.image} />
                  </div>
                  <div className="p-featured-info">
                    <span className="p-tag">FEATURED_ARCHIVE</span>
                    <h3>{featured.member}</h3>
                    <p>BY {featured.cosplayer || featured['レイヤー']}</p>
                  </div>
                </div>
              )}
              <div className="p-feed-panel">
                <div className="p-feed-row mission"><span className="p-feed-tag">NEXT_MISSION</span><p>{nextMission ? nextMission.event_name : 'STANDBY_MODE'}</p></div>
                <div className="p-feed-row"><span className="p-feed-tag">LAST_RECORD</span><p>{latestArchive ? latestArchive.event_name : 'NO_RECENT_DATA'}</p></div>
              </div>
            </div>
          </div>
        </div>

        <nav className="p-dock">
          <Link href="/gallery"><div className="p-dock-item"><i className="fas fa-th-large"></i><span>GALLERY</span></div></Link>
          <Link href="/log"><div className="p-dock-item"><i className="fas fa-history"></i><span>LOGS</span></div></Link>
          <Link href="/tracker"><div className="p-dock-item"><i className="fas fa-compass"></i><span>TRACKER</span></div></Link>
          <Link href="/chronicle"><div className="p-dock-item"><i className="fas fa-project-diagram"></i><span>CHRONICLE</span></div></Link>
        </nav>
      </main>

      {/* --- CONFIG MODAL (UIフルカスタマイズ版) --- */}
      {isConfigOpen && (
        <div className="p-modal-overlay" onClick={() => setIsConfigOpen(false)}>
          <div className="p-modal-card" onClick={e => e.stopPropagation()}>
            <div className="p-modal-head">
              <h3>SYSTEM_CONFIGURATION</h3>
              <button onClick={() => setIsConfigOpen(false)} className="close-btn">&times;</button>
            </div>
            <div className="p-modal-body">
              <div className="p-modal-row">
                <label>AMBIENT_GLOW</label>
                <div className="custom-check">
                  <input type="checkbox" id="glow" checked={config.glow} onChange={e => setConfig({...config, glow: e.target.checked})} />
                  <label htmlFor="glow"></label>
                </div>
              </div>
              <div className="p-modal-row">
                <label>MASTER_BRIGHTNESS</label>
                <input type="range" min="0.2" max="1" step="0.1" value={config.brightness} onChange={e => setConfig({...config, brightness: parseFloat(e.target.value)})} className="custom-slider" />
              </div>
              <div className="p-modal-row">
                <label>INTERVAL (ms)</label>
                <input type="number" step="1000" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} className="custom-input" />
              </div>
            </div>
            <button className="p-modal-save" onClick={() => { localStorage.setItem('v_portal_final_v2', JSON.stringify(config)); setIsConfigOpen(false); }}>APPLY_CHANGES</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root { --v-cyan: #00f2ff; --v-magenta: #ff00ff; }
        body { margin:0; background:#000; color:#fff; font-family:'Montserrat', sans-serif; overflow:hidden; }

        .p-grain { position:fixed; inset:0; background:url('https://grainy-gradients.vercel.app/noise.svg'); opacity:0.05; pointer-events:none; z-index:900; }
        .p-ambient { position:absolute; inset:0; z-index:1; pointer-events:none; }
        .p-glow-wrap { position:absolute; inset:-10%; filter:blur(120px); opacity:calc(0.5 * var(--v-bright)); transition:3s; }
        .p-glow-wrap img { width:100%; height:100%; object-fit:cover; }
        .p-mask { position:absolute; inset:0; background:radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.5) 60%, #000 95%); }

        .p-main-layer { position:relative; height:100vh; width:100vw; z-index:10; display:flex; flex-direction:column; }
        .p-grid { flex:1; display:grid; grid-template-columns: 380px 1fr 380px; padding:60px; box-sizing:border-box; align-items:center; }

        .p-glass-panel, .p-featured-card, .p-feed-panel { background:rgba(255,255,255,0.05); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:25px; margin-bottom:30px; }
        .p-tag { font-size:9px; font-weight:800; color:#888; letter-spacing:0.2em; display:block; margin-bottom:15px; }

        .p-progress-wrap { position:relative; height:2px; background:rgba(255,255,255,0.1); display:flex; align-items:center; }
        .p-progress-bar { height:100%; background:var(--v-magenta); box-shadow:0 0 15px var(--v-magenta); }
        .p-progress-val { position:absolute; right:0; top:-18px; font-size:10px; font-weight:800; color:var(--v-magenta); }
        .p-meta { font-size:9px; color:#555; font-weight:800; margin-top:20px; }
        
        .p-config-btn { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#999; padding:12px 25px; font-size:10px; font-weight:800; border-radius:4px; cursor:pointer; }
        .p-config-btn:hover { background:#fff; color:#000; }

        .p-clock { font-size:120px; font-weight:100; text-align:center; }
        .p-date { font-size:12px; font-weight:800; color:#444; letter-spacing:0.5em; margin-top:20px; text-align:center; }

        /* FEATURED IMAGE FIX:全体表示 */
        .p-featured-card { padding:0; overflow:hidden; }
        .p-featured-media { height:240px; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; }
        .p-featured-media img { max-width:100%; max-height:100%; object-fit:contain; }
        .p-featured-info { padding:20px; }
        .p-featured-info h3 { margin:0; font-size:18px; font-weight:400; color:#eee; }
        .p-featured-info p { margin:8px 0 0; font-size:10px; font-weight:800; color:#555; }

        .p-feed-panel { display:flex; flex-direction:column; gap:20px; margin-bottom:0; }
        .p-feed-tag { font-size:8px; font-weight:800; color:var(--v-cyan); letter-spacing:0.2em; display:block; margin-bottom:5px; }
        .p-feed-row p { margin:0; font-size:13px; color:#eee; }

        .p-dock { position:fixed; bottom:40px; left:50%; transform:translateX(-50%); display:flex; gap:10px; background:rgba(255,255,255,0.05); backdrop-filter:blur(30px); padding:8px; border-radius:50px; border:1px solid rgba(255,255,255,0.1); z-index:100; }
        .p-dock-item { padding:12px 25px; border-radius:40px; color:#666; transition:0.3s; cursor:pointer; }
        .p-dock-item:hover { color:#fff; background:rgba(255,255,255,0.1); }

        /* --- CONFIG CUSTOM UI --- */
        .p-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.95); backdrop-filter:blur(20px); z-index:2000; display:flex; align-items:center; justify-content:center; }
        .p-modal-card { background:#0a0a0b; width:450px; padding:40px; border:1px solid #222; border-radius:4px; }
        .p-modal-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:40px; border-bottom:1px solid #111; padding-bottom:15px; }
        .p-modal-head h3 { font-size:12px; font-weight:800; color:#eee; margin:0; letter-spacing:0.1em; }
        .close-btn { background:none; border:none; color:#444; font-size:30px; cursor:pointer; }

        .p-modal-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; }
        .p-modal-row label { font-size:10px; font-weight:800; color:#666; letter-spacing:0.1em; }

        /* Custom Checkbox */
        .custom-check { position:relative; width:20px; height:20px; }
        .custom-check input { opacity:0; position:absolute; }
        .custom-check label { position:absolute; inset:0; border:2px solid #333; border-radius:2px; cursor:pointer; }
        .custom-check input:checked + label { border-color:var(--v-cyan); background:rgba(0,242,255,0.1); }
        .custom-check input:checked + label::after { content:'✓'; position:absolute; top:-2px; left:3px; color:var(--v-cyan); font-size:14px; }

        /* Custom Slider */
        .custom-slider { -webkit-appearance:none; width:150px; height:2px; background:#222; outline:none; }
        .custom-slider::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; background:var(--v-magenta); border-radius:50%; box-shadow:0 0 10px var(--v-magenta); cursor:pointer; }

        /* Custom Input */
        .custom-input { background:#111; border:1px solid #222; color:var(--v-cyan); padding:8px 12px; font-family:inherit; font-size:12px; text-align:right; width:100px; outline:none; }
        .custom-input:focus { border-color:var(--v-cyan); }

        .p-modal-save { width:100%; padding:20px; background:var(--v-cyan); color:#000; font-weight:800; border:none; margin-top:20px; cursor:pointer; transition:0.3s; }
        .p-modal-save:hover { background:#fff; box-shadow:0 0 30px var(--v-cyan); }
      `}</style>
    </div>
  );
}
