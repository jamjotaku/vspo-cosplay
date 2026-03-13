import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

const MEMBER_ORDER = [
  '全員', '集合', '花芽すみれ', '花芽なずな', '小雀とと', '一ノ瀬うるは', '胡桃のあ',
  '兎咲ミミ', '空澄セナ', '橘ひなの', '英リサ', '如月れん', '神成きゅぴ', '八雲べに', 
  '藍沢エマ', '紫宮るな', '猫汰つな', '白波らむね', '小森めと', '夢野あかり', 
  '夜乃くろむ', '紡木こかげ', '千燈ゆうひ', '蝶屋はなび', '甘結もか', '銀城サイネ', '龍巻ちせ'
];

export default function Portal() {
  // --- STATES: SYSTEM ---
  const [allData, setAllData] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [user, setUser] = useState(null);
  const [time, setTime] = useState(new Date());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // --- STATES: WIDGETS ---
  const [nextMission, setNextMission] = useState(null);
  const [latestArchive, setLatestArchive] = useState(null);
  const [productionProgress, setProductionProgress] = useState(45);
  const [pulseStats, setPulseStats] = useState({ avgFervor: 0, lastDays: 0, hasSpark: false });
  const canvasRef = useRef(null);

  // --- STATES: CONFIG (Synced with GlobalCommander) ---
  const [config, setConfig] = useState({
    interval: 15000, brightness: 0.8,
    member: '全員', cosplayer: '全員', theme_color: '#00f2ff'
  });

  // --- INITIALIZATION: AUTH & PROFILE ---
  useEffect(() => {
    const bootstrap = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (prof) {
          const loadedConfig = {
            member: prof.oshi_member || '全員',
            cosplayer: prof.favorite_cosplayer || '全員',
            theme_color: prof.theme_color || '#00f2ff',
            interval: 15000, brightness: 0.8
          };
          setConfig(loadedConfig);
          // CSS変数を即時反映
          document.documentElement.style.setProperty('--v-accent', loadedConfig.theme_color);
        }
        await fetchLogWidgets(session.user.id);
      }
      setLoading(false);
    };
    bootstrap();

    const clock = setInterval(() => setTime(new Date()), 1000);
    loadCSV();
    
    // localStorageから進捗復元
    const savedProgress = localStorage.getItem('v_total_progress');
    if (savedProgress) setProductionProgress(parseInt(savedProgress));

    return () => clearInterval(clock);
  }, []);

  // --- DATA_LOADING: CSV ---
  const loadCSV = async () => {
    const Papa = (await import('papaparse')).default;
    Papa.parse(CSV_URL, {
      download: true, header: true,
      complete: (res) => {
        const data = res.data.filter(d => d.image || d.url).map(d => ({
          member: (d.member || d['名前'] || "").trim(),
          image: (d.image || d['画像'] || d.link || d.url || "").replace('name=medium', 'name=large'),
          cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
        }));
        setAllData(data);
      }
    });
  };

  const cosplayerList = useMemo(() => ['全員', ...new Set(allData.map(d => d.cosplayer))].sort(), [allData]);

  // --- LOGIC: FEATURED_ROTATION ---
  const pickFeatured = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => 
      (config.member === '全員' || p.member === config.member) &&
      (config.cosplayer === '全員' || p.cosplayer === config.cosplayer)
    );
    if (pool.length === 0) pool = allData;
    setFeatured(pool[Math.floor(Math.random() * pool.length)]);
  }, [allData, config.member, config.cosplayer]);

  useEffect(() => {
    pickFeatured();
    const timer = setInterval(pickFeatured, config.interval);
    return () => clearInterval(timer);
  }, [pickFeatured, config.interval]);

  // --- LOGIC: LOG_WIDGET_DATA ---
  const fetchLogWidgets = async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('fan_logs').select('*').eq('user_id', userId).order('event_date', { ascending: true });
    
    if (data && data.length > 0) {
      setNextMission(data.find(l => l.event_date > today));
      const archives = [...data].reverse().filter(l => l.event_date <= today);
      setLatestArchive(archives[0]);
      
      const recent = archives.slice(0, 10);
      const avg = recent.reduce((acc, cur) => acc + cur.fervor_score, 0) / (recent.length || 1);
      const diff = Math.floor((new Date() - new Date(archives[0].event_date)) / 86400000);
      setPulseStats({ avgFervor: avg, lastDays: diff, hasSpark: recent.some(d => d.is_first_spark) });
    }
  };

  // --- RENDER: PULSE_MONITOR (Canvas) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pulseStats.avgFervor) return;
    const ctx = canvas.getContext('2d');
    let offset = 0, ani;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath(); ctx.lineWidth = 2;
      ctx.strokeStyle = config.theme_color;
      ctx.shadowBlur = 15; ctx.shadowColor = ctx.strokeStyle;
      
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + (pulseStats.avgFervor * 12) * Math.sin(x * 0.02 + offset);
        const noise = pulseStats.hasSpark ? (Math.random() - 0.5) * 8 : 0;
        if (x === 0) ctx.moveTo(x, y + noise); else ctx.lineTo(x, y + noise);
      }
      ctx.stroke();
      offset -= 0.08; ani = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(ani);
  }, [pulseStats, config.theme_color]);

  // --- HANDLER: SAVE_CONFIG (With Safety Guard) ---
  const saveAllConfig = async () => {
    if (!user) return; // セーフティガード

    const { error } = await supabase.from('profiles').update({
      oshi_member: config.member,
      favorite_cosplayer: config.cosplayer,
      theme_color: config.theme_color
    }).eq('id', user.id);

    if (error) {
      alert("SYNC_ERROR: " + error.message);
    } else {
      localStorage.setItem('v_portal_final_v3', JSON.stringify(config));
      // 司令部全域に信号を送るためリロードを実行
      window.location.reload();
    }
  };

  if (loading) return null; // GlobalCommanderのローダーに任せる

  return (
    <div className="p-root" style={{ opacity: config.brightness }}>
      <Head>
        <title>COMMAND_CENTER // VSPO! HUB</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      <main className="p-main-layer">
        <div className="p-grid">
          
          {/* LEFT: STATUS_WING */}
          <aside className="p-wing-left">
            <div className="p-glass-panel">
              <span className="p-tag">PRODUCTION_STATUS</span>
              <div className="p-progress-wrap">
                <div className="p-progress-bar" style={{ width: `${productionProgress}%` }}></div>
                <span className="p-progress-val">{productionProgress}%</span>
              </div>
              <div className="p-meta-box">
                <div className="p-meta">COMMANDER: <span>{user?.email.split('@')[0]}</span></div>
                <div className="p-meta">RESONANCE: <span>{config.cosplayer}</span></div>
              </div>
            </div>
            <button className="p-config-btn" onClick={() => setIsConfigOpen(true)}>
              <i className="fas fa-sliders-h"></i> CONFIG_SYSTEM_CALIBRATION
            </button>
          </aside>

          {/* CENTER: CHRONO_CORE */}
          <section className="p-chrono-core">
            <div className="p-clock">{time.toLocaleTimeString('en-US', { hour12: false })}</div>
            <div className="p-date">{time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}</div>
            
            <div className="p-pulse-monitor">
              <canvas ref={canvasRef} width={600} height={120} />
              <div className="p-pulse-info">
                <div className="p-pulse-stat"><span>FERVOR_AVG</span> <strong>{pulseStats.avgFervor.toFixed(1)}</strong></div>
                <div className="p-pulse-stat"><span>LAST_SCAN</span> <strong>{pulseStats.lastDays}D_AGO</strong></div>
                <div className="p-pulse-stat spark-status" style={{ color: pulseStats.hasSpark ? 'var(--v-accent)' : '#333' }}>
                  <span>SPARK_SIGNAL</span> <strong>{pulseStats.hasSpark ? 'DETECTED' : 'STABLE'}</strong>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT: ARCHIVE_WING */}
          <aside className="p-wing-right">
            <div className="p-stack">
              {featured && (
                <div className="p-featured-card">
                  <div className="p-featured-media">
                    <img src={featured.image} alt="" loading="lazy" />
                  </div>
                  <div className="p-featured-info">
                    <span className="p-tag">FEATURED_ARCHIVE</span>
                    <h3>{featured.member}</h3>
                    <p>BY {featured.cosplayer}</p>
                  </div>
                </div>
              )}
              <div className="p-feed-panel">
                <div className="p-feed-row mission">
                  <span className="p-feed-tag">NEXT_MISSION_IDENTIFIED</span>
                  <p>{nextMission?.event_name || 'STANDBY_MODE'}</p>
                </div>
                <div className="p-feed-row">
                  <span className="p-feed-tag">LATEST_LOG_ENTRY</span>
                  <p>{latestArchive?.event_name || 'NO_RECENT_DATA'}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* BOTTOM: SYSTEM_DOCK */}
        <nav className="p-dock-wrap">
          <div className="p-dock">
            <Link href="/gallery"><div className="p-dock-item"><i className="fas fa-th-large"></i><span>GALLERY</span></div></Link>
            <Link href="/log"><div className="p-dock-item"><i className="fas fa-history"></i><span>LOGS</span></div></Link>
            <Link href="/tracker"><div className="p-dock-item"><i className="fas fa-compass"></i><span>TRACKER</span></div></Link>
            <Link href="/chronicle"><div className="p-dock-item"><i className="fas fa-project-diagram"></i><span>CHRONICLE</span></div></Link>
            <Link href="/analytics"><div className="p-dock-item"><i className="fas fa-chart-line"></i><span>ANALYTICS</span></div></Link>
            <Link href="/workstation"><div className="p-dock-item"><i className="fas fa-hammer"></i><span>WORK</span></div></Link>
          </div>
        </nav>
      </main>

      {/* MODAL: CONFIGURATION */}
      {isConfigOpen && (
        <div className="p-modal-overlay" onClick={() => setIsConfigOpen(false)}>
          <div className="p-modal-card" onClick={e => e.stopPropagation()}>
            <div className="p-modal-head">
              <h3>SYSTEM_CALIBRATION</h3>
              <button className="p-close" onClick={() => setIsConfigOpen(false)}>&times;</button>
            </div>
            <div className="p-modal-body">
              <div className="p-modal-row">
                <label>TARGET_UNIT</label>
                <select className="custom-input" value={config.member} onChange={e => setConfig({...config, member:e.target.value})}>
                  {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="p-modal-row">
                <label>IDENTIFIED_COSER</label>
                <select className="custom-input" value={config.cosplayer} onChange={e => setConfig({...config, cosplayer:e.target.value})}>
                  {cosplayerList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="p-modal-row">
                <label>RESONANCE_COLOR</label>
                <div className="color-ctrl">
                  <input type="color" value={config.theme_color} onChange={e => {
                    setConfig({...config, theme_color:e.target.value});
                    document.documentElement.style.setProperty('--v-accent', e.target.value);
                  }} />
                  <input type="text" className="hex-input" value={config.theme_color.toUpperCase()} readOnly />
                </div>
              </div>
              <div className="p-modal-row">
                <label>CORE_BRIGHTNESS</label>
                <input type="range" min="0.3" max="1" step="0.1" value={config.brightness} onChange={e => setConfig({...config, brightness:parseFloat(e.target.value)})} />
              </div>
            </div>
            <button className="p-modal-save" onClick={saveAllConfig}>APPLY_CHANGES_TO_ALL_STATIONS</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .p-root { position:relative; min-height:100vh; overflow:hidden; transition: opacity 0.5s; }
        .p-main-layer { position:relative; height:100vh; z-index:10; display:flex; flex-direction:column; }
        
        /* Layout Grid */
        .p-grid { flex:1; display:grid; grid-template-columns: 380px 1fr 380px; padding:0 60px; gap:40px; align-items:center; }
        
        /* Panels */
        .p-glass-panel, .p-featured-card, .p-feed-panel { 
          background: rgba(255,255,255,0.01); 
          backdrop-filter: blur(40px); 
          border: 1px solid rgba(255,255,255,0.05); 
          padding: 35px; border-radius: 4px; margin-bottom: 25px; 
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }
        
        /* Wing Left */
        .p-tag { font-family:'JetBrains Mono'; font-size:9px; color:var(--v-accent); letter-spacing:0.3em; display:block; margin-bottom:15px; text-shadow: 0 0 10px var(--v-accent); }
        .p-progress-wrap { position:relative; height:2px; background:rgba(255,255,255,0.05); margin:25px 0; }
        .p-progress-bar { height:100%; background:var(--v-accent); box-shadow:0 0 20px var(--v-accent); transition:1.5s cubic-bezier(0.19, 1, 0.22, 1); }
        .p-progress-val { position:absolute; right:0; top:-18px; font-size:10px; font-weight:800; color:var(--v-accent); font-family: 'JetBrains Mono'; }
        .p-meta-box { display:flex; flex-direction:column; gap:8px; }
        .p-meta { font-family:'JetBrains Mono'; font-size:9px; color:#444; text-transform:uppercase; }
        .p-meta span { color:#888; margin-left:10px; }
        
        .p-config-btn { 
          background:none; border:1px solid rgba(255,255,255,0.1); color:#444; 
          padding:18px; width:100%; font-size:9px; font-weight:800; border-radius:4px; 
          cursor:pointer; font-family: 'JetBrains Mono'; transition:0.3s; letter-spacing:0.1em;
        }
        .p-config-btn:hover { border-color:var(--v-accent); color:var(--v-accent); background:rgba(255,255,255,0.02); }

        /* Chrono Core */
        .p-chrono-core { text-align:center; user-select:none; }
        .p-clock { font-size:140px; font-weight:100; letter-spacing:-0.05em; line-height:0.9; font-family: 'Montserrat', sans-serif; }
        .p-date { font-size:12px; font-weight:800; color:#333; letter-spacing:0.6em; margin: 20px 0 60px; font-family: 'JetBrains Mono'; }
        .p-pulse-monitor { width: 600px; margin: 0 auto; position: relative; }
        .p-pulse-info { display: flex; justify-content: space-between; margin-top: 35px; padding: 0 50px; }
        .p-pulse-stat { font-family: 'JetBrains Mono'; text-align: center; }
        .p-pulse-stat span { display:block; font-size: 8px; color: #444; margin-bottom: 8px; letter-spacing: 0.1em; }
        .p-pulse-stat strong { font-size: 20px; color:#fff; font-weight:400; }

        /* Wing Right */
        .p-featured-card { padding:0; overflow:hidden; border-color: rgba(255,255,255,0.1); }
        .p-featured-media { height:280px; background:#000; display:flex; align-items:center; justify-content:center; position:relative; }
        .p-featured-media img { max-width:100%; max-height:100%; object-fit:contain; z-index:2; }
        .p-featured-info { padding:25px; background: rgba(0,0,0,0.4); }
        .p-featured-info h3 { margin:0; font-size:22px; font-weight:400; letter-spacing: 0.05em; }
        .p-featured-info p { margin:8px 0 0; font-size:10px; color:#555; font-family: 'JetBrains Mono'; font-weight:800; }
        .p-feed-panel { display:flex; flex-direction:column; gap:25px; margin-bottom:0; }
        .p-feed-tag { font-family:'JetBrains Mono'; font-size:8px; color:var(--v-accent); margin-bottom:8px; display:block; opacity:0.6; }
        .p-feed-row p { margin:0; font-size:15px; color:#eee; font-weight:400; }

        /* Dock */
        .p-dock-wrap { position:fixed; bottom:50px; left:0; width:100%; display:flex; justify-content:center; z-index:1000; }
        .p-dock { 
          display:flex; gap:10px; background:rgba(5,5,7,0.8); backdrop-filter:blur(30px); 
          padding:10px; border-radius:60px; border:1px solid rgba(255,255,255,0.05); 
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }
        .p-dock-item { 
          padding:15px 30px; border-radius:50px; color:#555; display:flex; 
          align-items:center; gap:12px; cursor:pointer; transition:0.4s cubic-bezier(0.19, 1, 0.22, 1); 
        }
        .p-dock-item:hover { color:var(--v-accent); background:rgba(255,255,255,0.03); transform:translateY(-5px); }
        .p-dock-item span { font-family: 'JetBrains Mono'; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; }
        .p-dock-item i { font-size: 14px; }

        /* Modal Settings */
        .p-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:2000; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(10px); }
        .p-modal-card { background:#070709; width:480px; padding:50px; border:1px solid #151517; border-radius:2px; box-shadow: 0 50px 100px rgba(0,0,0,0.8); }
        .p-modal-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:45px; border-bottom:1px solid #111; padding-bottom:20px; }
        .p-modal-head h3 { font-family: 'JetBrains Mono'; font-size:12px; color:var(--v-accent); margin:0; letter-spacing: 0.2em; }
        .p-close { background:none; border:none; color:#444; font-size:30px; cursor:pointer; transition:0.3s; }
        .p-close:hover { color:#fff; }
        .p-modal-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; }
        .p-modal-row label { font-family: 'JetBrains Mono'; font-size:10px; color:#444; letter-spacing: 0.1em; }
        .custom-input { background:#000; border:1px solid #1a1a1c; color:#fff; padding:12px 18px; font-family: 'JetBrains Mono'; font-size:12px; text-align:right; width:200px; outline:none; }
        .custom-input:focus { border-color: var(--v-accent); }
        .color-ctrl { display:flex; gap:15px; align-items:center; }
        .color-ctrl input[type="color"] { background:none; border:1px solid #1a1a1c; width:45px; height:45px; cursor:pointer; padding:0; }
        .hex-input { background:#000; border:1px solid #111; color:#555; padding:12px; width:100px; font-family:'JetBrains Mono'; text-align:center; font-size:12px; }
        .p-modal-save { 
          width:100%; padding:25px; background:var(--v-accent); color:#000; 
          font-family: 'JetBrains Mono'; font-weight:800; border:none; margin-top:30px; 
          cursor:pointer; font-size:11px; letter-spacing: 0.1em; transition: 0.3s;
        }
        .p-modal-save:hover { filter: brightness(1.2); box-shadow: 0 0 30px var(--v-accent); }

        /* Responsive Guards */
        @media (max-width: 1400px) {
          .p-grid { grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; padding-top: 100px; }
          .p-chrono-core { grid-column: span 2; order: -1; margin-bottom: 50px; }
        }
      `}</style>
    </div>
  );
}
