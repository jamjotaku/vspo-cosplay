import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router'; // 認証ガード用
import { supabase } from '../lib/supabaseClient';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhY (ユーザー提供のURL)";

const MEMBER_ORDER = [
  '全員', '集合', '花芽すみれ', '花芽なずな', '小雀とと', '一ノ瀬うるは', '胡桃のあ',
  '兎咲ミミ', '空澄セナ', '橘ひなの', '英リサ', '如月れん', '神成きゅぴ', '八雲べに', 
  '藍沢エマ', '紫宮るな', '猫汰つな', '白波らむね', '小森めと', '夢野あかり', 
  '夜乃くろむ', '紡木こかげ', '千燈ゆうひ', '蝶屋はなび', '甘結もか', '銀城サイネ', '龍巻ちせ'
];

export default function Portal() {
  const router = useRouter();
  
  // --- EXISTING_STATES (完全復元) ---
  const [allData, setAllData] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [user, setUser] = useState(null);
  const [time, setTime] = useState(new Date());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [nextMission, setNextMission] = useState(null);
  const [latestArchive, setLatestArchive] = useState(null);
  const [productionProgress, setProductionProgress] = useState(45);
  const [pulseStats, setPulseStats] = useState({ avgFervor: 0, lastDays: 0, hasSpark: false });
  const canvasRef = useRef(null);

  // --- NEW_CONFIG_STATE (カラーピッカー・推し選択対応) ---
  const [profile, setProfile] = useState({ oshi_member: '全員', theme_color: '#00f2ff' });
  const [config, setConfig] = useState({
    glow: true, grain: true, interval: 15000, brightness: 0.8
  });

  // --- INITIALIZATION (認証ガード & プロファイル同期) ---
  useEffect(() => {
    const initPortal = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 【ログインガード】セッションがなければゲートへ
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        
        // 【プロファイル同期】DBから推し設定をロード
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (prof) {
          setProfile(prof);
          // CSS変数に反映してサイトをジャック
          document.documentElement.style.setProperty('--v-accent', prof.theme_color || '#00f2ff');
        }
        fetchLogWidgets(session.user.id);
      }
    };
    initPortal();

    // 既存設定のロード
    const saved = localStorage.getItem('v_portal_final_v5');
    if (saved) setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
    const savedProgress = localStorage.getItem('v_total_progress') || 45;
    setProductionProgress(parseInt(savedProgress));

    const clock = setInterval(() => setTime(new Date()), 1000);
    loadCSVData();

    return () => clearInterval(clock);
  }, []);

  const loadCSVData = async () => {
    const Papa = (await import('papaparse')).default;
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
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

  // --- OSHI_JACK_IMAGE_LOGIC (推し優先ピッカー) ---
  const pickFeatured = useCallback(() => {
    if (allData.length === 0) return;
    
    // 設定された推しメンでフィルタリング
    let pool = allData.filter(p => 
      (profile.oshi_member === '全員' || p.member === profile.oshi_member)
    );

    if (pool.length === 0) pool = allData;
    setFeatured(pool[Math.floor(Math.random() * pool.length)]);
  }, [allData, profile.oshi_member]);

  useEffect(() => {
    pickFeatured();
    const timer = setInterval(pickFeatured, config.interval);
    return () => clearInterval(timer);
  }, [pickFeatured, config.interval]);

  // --- DATA_FETCHING_LOGIC (既存ロジック完全復元) ---
  const fetchLogWidgets = async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('fan_logs').select('*').eq('user_id', userId).order('event_date', { ascending: true });

    if (data && data.length > 0) {
      setNextMission(data.find(l => l.event_date > today));
      const archives = [...data].reverse().filter(l => l.event_date <= today);
      setLatestArchive(archives[0]);

      const recent = archives.slice(0, 10);
      const avg = recent.reduce((acc, cur) => acc + cur.fervor_score, 0) / (recent.length || 1);
      const lastDate = new Date(archives[0].event_date);
      const diffDays = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
      
      setPulseStats({ avgFervor: avg, lastDays: diffDays, hasSpark: recent.some(d => d.is_first_spark) });
    }
  };

  // --- REALTIME_CANVAS_ENGINE (既存のノイズ演出を維持しつつカラー連動) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pulseStats.avgFervor) return;
    const ctx = canvas.getContext('2d');
    let offset = 0, ani;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const amplitude = pulseStats.avgFervor * 12; 
      const frequency = 0.015 + (1 / (pulseStats.lastDays + 1)) * 0.04;
      
      ctx.beginPath();
      ctx.lineWidth = 2;
      // プロファイルのカラーを反映
      ctx.strokeStyle = profile.theme_color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = ctx.strokeStyle;

      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + amplitude * Math.sin(x * frequency + offset);
        // 【復元】スパーク信号時のノイズ演出
        const noise = pulseStats.hasSpark ? (Math.random() - 0.5) * 10 : 0;
        if (x === 0) ctx.moveTo(x, y + noise);
        else ctx.lineTo(x, y + noise);
      }
      ctx.stroke();
      offset -= 0.08;
      ani = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(ani);
  }, [pulseStats, profile.theme_color]);

  // --- CONFIG_SAVE_LOGIC ---
  const saveFinalConfig = async () => {
    // 1. Supabaseのプロファイルを更新（カラーと推し）
    await supabase.from('profiles').update({
      oshi_member: profile.oshi_member,
      theme_color: profile.theme_color
    }).eq('id', user.id);

    // 2. LocalStorageに表示設定を保存
    localStorage.setItem('v_portal_final_v5', JSON.stringify(config));
    
    setIsConfigOpen(false);
    pickFeatured();
  };

  if (!user) return <div className="p-loader">IDENTIFYING_COMMANDER...</div>;

  return (
    <div className="p-root" style={{ '--v-bright': config.brightness }}>
      <Head>
        <title>COMMAND_CENTER // VSPO! HUB V5.2</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&family=Montserrat:wght@100;400;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      {config.grain && <div className="p-grain"></div>}
      
      <div className="p-ambient">
        {config.glow && featured && (
          <div className="p-glow-wrap" key={featured.image}><img src={featured.image} alt="" /></div>
        )}
        <div className="p-mask"></div>
      </div>

      <main className="p-main-layer">
        <div className="p-grid">
          
          {/* LEFT_WING (完全復元) */}
          <div className="p-wing-left">
            <div className="p-glass-panel">
              <span className="p-tag">PRODUCTION_STATUS</span>
              <div className="p-progress-wrap">
                <div className="p-progress-bar" style={{ width: `${productionProgress}%` }}></div>
                <span className="p-progress-val">{productionProgress}%</span>
              </div>
              <div className="p-meta">UNIT_ID: {user.email.split('@')[0]}</div>
              <div className="p-meta">LINK_OSHI: {profile.oshi_member}</div>
            </div>
            <button className="p-config-btn" onClick={() => setIsConfigOpen(true)}>
              <i className="fas fa-sliders-h"></i> CONFIG_SYSTEM
            </button>
          </div>

          {/* CHRONO_CORE & BIO_MONITOR (完全復元) */}
          <div className="p-chrono-core">
            <div className="p-clock">{time.toLocaleTimeString('en-US', { hour12: false })}</div>
            <div className="p-date">{time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}</div>
            
            <div className="p-pulse-monitor">
              <canvas ref={canvasRef} width={600} height={120} />
              <div className="p-pulse-info">
                <div className="p-pulse-stat"><span>FERVOR_AVG</span> <strong>{pulseStats.avgFervor.toFixed(1)}</strong></div>
                <div className="p-pulse-stat"><span>LAST_SCAN</span> <strong>{pulseStats.lastDays}D_AGO</strong></div>
                <div className="p-pulse-stat spark-status" style={{ color: pulseStats.hasSpark ? 'var(--v-accent)' : '#444' }}>
                  <span>SPARK_SIGNAL</span> <strong>{pulseStats.hasSpark ? 'DETECTED' : 'STABLE'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT_WING (完全復元) */}
          <div className="p-wing-right">
            <div className="p-stack">
              {featured && (
                <div className="p-featured-card">
                  <div className="p-featured-media"><img src={featured.image} alt="" /></div>
                  <div className="p-featured-info">
                    <span className="p-tag">FEATURED_ARCHIVE</span>
                    <h3>{featured.member}</h3>
                    <p>BY {featured.cosplayer || 'Unknown'}</p>
                  </div>
                </div>
              )}
              <div className="p-feed-panel">
                <div className="p-feed-row mission">
                  <span className="p-feed-tag">NEXT_MISSION</span>
                  <p>{nextMission ? nextMission.event_name : 'STANDBY_MODE'}</p>
                </div>
                <div className="p-feed-row">
                  <span className="p-feed-tag">LAST_RECORD</span>
                  <p>{latestArchive ? latestArchive.event_name : 'NO_RECENT_DATA'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DOCK_NAVIGATION (全6項目完全復元) */}
        <nav className="p-dock">
          <Link href="/gallery"><div className="p-dock-item"><i className="fas fa-th-large"></i><span>GALLERY</span></div></Link>
          <Link href="/log"><div className="p-dock-item"><i className="fas fa-history"></i><span>LOGS</span></div></Link>
          <Link href="/tracker"><div className="p-dock-item"><i className="fas fa-compass"></i><span>TRACKER</span></div></Link>
          <Link href="/chronicle"><div className="p-dock-item"><i className="fas fa-project-diagram"></i><span>CHRONICLE</span></div></Link>
          <Link href="/analytics"><div className="p-dock-item"><i className="fas fa-chart-line"></i><span>ANALYTICS</span></div></Link>
          <Link href="/workstation"><div className="p-dock-item"><i className="fas fa-hammer"></i><span>WORKSTATION</span></div></Link>
        </nav>
      </main>

      {/* --- CONFIG_MODAL (カラーピッカー・推し選択搭載版) --- */}
      {isConfigOpen && (
        <div className="p-modal-overlay" onClick={() => setIsConfigOpen(false)}>
          <div className="p-modal-card" onClick={e => e.stopPropagation()}>
            <div className="p-modal-head">
              <h3>SYSTEM_CALIBRATION</h3>
              <button onClick={() => setIsConfigOpen(false)} className="close-btn">&times;</button>
            </div>
            <div className="p-modal-body">
              <div className="p-modal-row">
                <label>TARGET_OSHI_ID</label>
                <select 
                  className="custom-input" 
                  value={profile.oshi_member} 
                  onChange={e => setProfile({...profile, oshi_member: e.target.value})}
                >
                  {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="p-modal-row">
                <label>RESONANCE_COLOR</label>
                <div className="color-picker-group">
                  <input 
                    type="color" 
                    value={profile.theme_color} 
                    onChange={e => {
                      setProfile({...profile, theme_color: e.target.value});
                      document.documentElement.style.setProperty('--v-accent', e.target.value);
                    }} 
                  />
                  <input 
                    type="text" 
                    className="hex-input"
                    value={profile.theme_color.toUpperCase()}
                    onChange={e => {
                      setProfile({...profile, theme_color: e.target.value});
                      document.documentElement.style.setProperty('--v-accent', e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="p-modal-row">
                <label>AMBIENT_GLOW</label>
                <input type="checkbox" checked={config.glow} onChange={e => setConfig({...config, glow: e.target.checked})} />
              </div>

              <div className="p-modal-row">
                <label>BRIGHTNESS</label>
                <input type="range" min="0.2" max="1" step="0.1" value={config.brightness} onChange={e => setConfig({...config, brightness: parseFloat(e.target.value)})} />
              </div>
            </div>
            <button className="p-modal-save" onClick={saveFinalConfig}>APPLY_AND_SYNC_OSHI_JACK</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root { --v-accent: #00f2ff; --v-bg: #030305; }
        body { margin:0; background:var(--v-bg); color:#fff; font-family:'Montserrat', sans-serif; overflow:hidden; }

        .p-grain { position:fixed; inset:0; background:url('https://grainy-gradients.vercel.app/noise.svg'); opacity:0.04; pointer-events:none; z-index:900; }
        .p-ambient { position:absolute; inset:0; z-index:1; }
        .p-glow-wrap { position:absolute; inset:-10%; filter:blur(100px); opacity:calc(0.5 * var(--v-bright)); transition:3s; }
        .p-glow-wrap img { width:100%; height:100%; object-fit:cover; }
        .p-mask { position:absolute; inset:0; background:radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.5) 60%, #000 95%); }

        .p-main-layer { position:relative; height:100vh; width:100vw; z-index:10; display:flex; flex-direction:column; }
        .p-grid { flex:1; display:grid; grid-template-columns: 380px 1fr 380px; padding:60px; box-sizing:border-box; align-items:center; }

        .p-glass-panel, .p-featured-card, .p-feed-panel { background:rgba(255,255,255,0.02); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,0.05); padding:30px; border-radius:4px; margin-bottom:30px; }
        .p-tag { font-family:'JetBrains Mono'; font-size:9px; font-weight:800; color:var(--v-accent); letter-spacing:0.2em; display:block; margin-bottom:15px; text-shadow: 0 0 10px var(--v-accent); }

        .p-progress-wrap { position:relative; height:2px; background:rgba(255,255,255,0.1); display:flex; align-items:center; }
        .p-progress-bar { height:100%; background:var(--v-accent); box-shadow:0 0 15px var(--v-accent); transition:1s; }
        .p-progress-val { position:absolute; right:0; top:-18px; font-size:10px; font-weight:800; color:var(--v-accent); }
        .p-meta { font-size:9px; color:#555; font-weight:800; margin-top:20px; font-family: 'JetBrains Mono'; }
        
        .p-config-btn { background:none; border:1px solid #222; color:#555; padding:15px; width:100%; font-size:10px; font-weight:800; border-radius:4px; cursor:pointer; font-family: 'JetBrains Mono'; transition:0.3s; }
        .p-config-btn:hover { border-color:var(--v-accent); color:var(--v-accent); }

        .p-chrono-core { display: flex; flex-direction: column; align-items: center; }
        .p-clock { font-size:120px; font-weight:100; text-align:center; letter-spacing: -0.05em; line-height:1; }
        .p-date { font-size:12px; font-weight:800; color:#333; letter-spacing:0.5em; margin: 10px 0 40px; text-align:center; font-family: 'JetBrains Mono'; }

        .p-pulse-monitor { width: 600px; position: relative; }
        .p-pulse-info { display: flex; justify-content: space-between; margin-top: 25px; padding: 0 40px; }
        .p-pulse-stat { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 800; color: #fff; text-align: center; }
        .p-pulse-stat span { color: #444; margin-bottom: 8px; font-size: 9px; display: block; letter-spacing: 0.1em; }
        
        .p-featured-card { padding:0; overflow:hidden; }
        .p-featured-media { height:260px; background:#000; display:flex; align-items:center; justify-content:center; }
        .p-featured-media img { max-width:100%; max-height:100%; object-fit:contain; }
        .p-featured-info { padding:20px; }
        .p-featured-info h3 { margin:0; font-size:20px; font-weight:400; color:#eee; }
        .p-featured-info p { margin:8px 0 0; font-size:10px; font-weight:800; color:#555; }

        .p-feed-panel { display:flex; flex-direction:column; gap:20px; margin-bottom:0; }
        .p-feed-tag { font-family:'JetBrains Mono'; font-size:8px; font-weight:800; color:var(--v-accent); letter-spacing:0.2em; display:block; margin-bottom:5px; }
        .p-feed-row p { margin:0; font-size:14px; color:#fff; font-weight: 400; line-height: 1.4; }

        .p-dock { position:fixed; bottom:40px; left:50%; transform:translateX(-50%); display:flex; gap:10px; background:rgba(0,0,0,0.8); backdrop-filter:blur(30px); padding:8px; border-radius:50px; border:1px solid #111; z-index:100; }
        .p-dock-item { padding:12px 25px; border-radius:40px; color:#444; transition:0.3s; cursor:pointer; display: flex; align-items: center; gap: 10px; }
        .p-dock-item:hover { color:var(--v-accent); background:rgba(255,255,255,0.05); }
        .p-dock-item span { font-family: 'JetBrains Mono'; font-size: 10px; font-weight: 800; }

        /* CONFIG MODAL */
        .p-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.96); z-index:2000; display:flex; align-items:center; justify-content:center; }
        .p-modal-card { background:#0a0a0c; width:450px; padding:45px; border:1px solid #1a1a1c; }
        .p-modal-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:40px; }
        .p-modal-head h3 { font-family: 'JetBrains Mono'; font-size:12px; color:var(--v-accent); margin:0; }
        .close-btn { background:none; border:none; color:#444; font-size:24px; cursor:pointer; }
        
        .p-modal-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; }
        .p-modal-row label { font-family: 'JetBrains Mono'; font-size:10px; color:#444; }
        
        .color-picker-group { display:flex; gap:10px; align-items:center; }
        .color-picker-group input[type="color"] { background:none; border:1px solid #222; width:40px; height:40px; cursor:pointer; }
        .hex-input { background:#000; border:1px solid #222; color:#fff; padding:10px; width:100px; font-family:'JetBrains Mono'; text-align:center; }

        .custom-input { background:#000; border:1px solid #222; color:#fff; padding:10px; font-family: 'JetBrains Mono'; font-size:12px; }
        
        .p-modal-save { width:100%; padding:20px; background:var(--v-accent); color:#000; font-family: 'JetBrains Mono'; font-weight:800; border:none; margin-top:20px; cursor:pointer; transition:0.3s; }
        .p-modal-save:hover { background:#fff; box-shadow:0 0 30px var(--v-accent); }

        .p-loader { height:100vh; background:#000; color:var(--v-accent); display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono'; letter-spacing:0.5em; }
      `}</style>
    </div>
  );
}
