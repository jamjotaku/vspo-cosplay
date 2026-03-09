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
      <Head><title>COMMAND_CENTER // VSPO!</title></Head>

      {config.grain && <div className="grain"></div>}

      <main className="t-interface">
        <div className="ambient-lit">
          {config.glow && featured && <div className="g-glow" key={featured.image}><img src={featured.image || featured.url} alt="" /></div>}
          <div className="v-mask"></div>
        </div>

        <div className="t-grid">
          {/* LEFT: PRODUCTION PANEL */}
          <div className="w-left">
            <div className="glass-panel">
              <span className="p-label">PRODUCTION_STATUS</span>
              <div className="p-bar-wrap">
                <div className="p-bar-fill" style={{ width: `${productionProgress}%` }}></div>
                <span className="p-val">{productionProgress}%</span>
              </div>
              <div className="p-meta">UNIT_ID: {user ? user.email.split('@')[0] : "GUEST_LINK"}</div>
            </div>
            
            <button className="config-trigger-btn" onClick={() => setIsConfigOpen(true)}>
              <i className="fas fa-sliders-h"></i> CONFIG_SYSTEM
            </button>
          </div>

          {/* CENTER: CHRONO_UNIT */}
          <div className="c-core">
            <div className="z-clock">{time.toLocaleTimeString('en-US', { hour12: false })}</div>
            <div className="z-date">{time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}</div>
          </div>

          {/* RIGHT: MULTI-WIDGET STACK */}
          <div className="w-right">
            <div className="widget-stack">
              
              {/* RESTORED: SLIDESHOW WIDGET */}
              {featured && (
                <div className="f-slideshow-card">
                  <div className="f-media">
                    <img src={featured.image || featured.url} alt="" key={featured.image} />
                  </div>
                  <div className="f-info">
                    <span className="f-label">FEATURED_ARCHIVE</span>
                    <h3>{featured.member}</h3>
                    <p>BY {featured.cosplayer || featured['レイヤー']}</p>
                  </div>
                </div>
              )}

              {/* MISSION & ARCHIVE FEED */}
              <div className="feed-glass">
                <div className="feed-row mission">
                  <span className="row-tag">NEXT_MISSION</span>
                  <p>{nextMission ? nextMission.event_name : 'STANDBY...'}</p>
                </div>
                <div className="feed-row archive">
                  <span className="row-tag">LAST_RECORD</span>
                  <p>{latestArchive ? latestArchive.event_name : 'NO_DATA'}</p>
                </div>
              </div>

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

      {/* CONFIG MODAL */}
      {isConfigOpen && (
        <div className="cfg-overlay" onClick={() => setIsConfigOpen(false)}>
          <div className="cfg-card" onClick={e => e.stopPropagation()}>
            <div className="cfg-head"><h3>SYSTEM_CONFIG</h3><button onClick={() => setIsConfigOpen(false)}>&times;</button></div>
            <div className="cfg-body">
              <div className="cfg-row"><label>GLOW</label><input type="checkbox" checked={config.glow} onChange={e => setConfig({...config, glow: e.target.checked})} /></div>
              <div className="cfg-row"><label>BRIGHTNESS</label><input type="range" min="0.2" max="1" step="0.1" value={config.brightness} onChange={e => setConfig({...config, brightness: parseFloat(e.target.value)})} /></div>
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
        .t-grid { height:100%; display:grid; grid-template-columns: 360px 1fr 360px; padding:60px; box-sizing:border-box; align-items:center; }

        .ambient-lit { position:absolute; inset:0; z-index:1; }
        .g-glow { position:absolute; inset:-10%; filter:blur(120px); opacity:calc(0.5 * var(--v-bright)); transition:3s; }
        .g-glow img { width:100%; height:100%; object-fit:cover; }
        .v-mask { position:absolute; inset:0; background:radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.6) 70%, #000 100%); }

        /* WIDGETS */
        .glass-panel, .f-slideshow-card, .feed-glass { background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1); border-radius:4px; }
        .p-label, .f-label, .row-tag { font-size:9px; font-weight:800; color:#888; letter-spacing:0.2em; display:block; margin-bottom:12px; }
        
        .p-bar-wrap { position:relative; height:2px; background:rgba(255,255,255,0.1); display:flex; align-items:center; }
        .p-bar-fill { height:100%; background:var(--v-magenta); box-shadow:0 0 15px var(--v-magenta); }
        .p-val { position:absolute; right:0; top:-18px; font-size:10px; font-weight:800; color:var(--v-magenta); }
        .p-meta, .sys-id { font-size:9px; color:#444; font-weight:800; margin-top:15px; }

        .config-trigger-btn { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#666; padding:12px 20px; font-size:10px; font-weight:800; border-radius:4px; margin-top:20px; cursor:pointer; transition:0.3s; }
        .config-trigger-btn:hover { background:#fff; color:#000; border-color:#fff; }

        /* SLIDESHOW UNIT */
        .widget-stack { display:flex; flex-direction:column; gap:20px; }
        .f-slideshow-card { overflow:hidden; }
        .f-media { height:180px; overflow:hidden; }
        .f-media img { width:100%; height:100%; object-fit:cover; animation: pulse-img 15s infinite; }
        .f-info { padding:20px; }
        .f-info h3 { margin:0; font-size:18px; font-weight:400; color:#fff; }
        .f-info p { margin:5px 0 0; font-size:10px; color:#444; font-weight:800; }

        .feed-glass { padding:20px; display:flex; flex-direction:column; gap:15px; }
        .feed-row p { margin:5px 0 0; font-size:13px; color:#eee; }
        .row-tag { color:var(--v-cyan); margin-bottom:5px; }

        .c-core { text-align:center; }
        .z-clock { font-size:120px; font-weight:100; letter-spacing:-0.05em; color:#fff; }
        .z-date { font-size:12px; font-weight:800; color:#444; letter-spacing:0.5em; margin-top:20px; }

        .d-dock { position:fixed; bottom:40px; left:50%; transform:translateX(-50%); display:flex; gap:10px; background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); padding:8px; border-radius:50px; border:1px solid rgba(255,255,255,0.1); }
        .d-item { padding:12px 25px; border-radius:40px; color:#666; transition:0.3s; }
        .d-item:hover { color:#fff; background:rgba(255,255,255,0.1); }
        .d-item span { font-size:10px; font-weight:800; display:none; }
        .d-item:hover span { display:block; }

        .cfg-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:5000; display:flex; align-items:center; justify-content:center; }
        .cfg-card { background:#0a0a0b; width:400px; padding:40px; border-radius:4px; }
        .cfg-save { width:100%; padding:15px; background:var(--v-cyan); color:#000; font-weight:800; border:none; margin-top:20px; cursor:pointer; }
        
        @keyframes pulse-img { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}
