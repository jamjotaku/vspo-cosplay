import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";
const MEMBER_ORDER = ['全員', '集合', '花芽すみれ', '花芽なずな', '小雀とと', '一ノ瀬うるは', '胡桃のあ', '兎咲ミミ', '空澄セナ', '橘ひなの', '英リサ', '如月れん', '神成きゅぴ', '八雲べに', '藍沢エマ', '紫宮るな', '猫汰つな', '白波らむね', '小森めと', '夢野あかり', '夜乃くろむ', '紡木こかげ', '千燈ゆうひ', '蝶屋はなび', '甘結もか', '銀城サイネ', '龍巻ちせ'];

export default function Portal() {
  const [allData, setAllData] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [user, setUser] = useState(null);
  const [time, setTime] = useState(new Date());
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [nextMission, setNextMission] = useState(null);
  const [latestArchive, setLatestArchive] = useState(null);
  const [productionProgress, setProductionProgress] = useState(45);
  const [pulseStats, setPulseStats] = useState({ avgFervor: 0, lastDays: 0, hasSpark: false });
  const canvasRef = useRef(null);

  const [config, setConfig] = useState({
    interval: 15000, brightness: 1.0,
    member: '全員', cosplayer: '全員', theme_color: '#00f2ff'
  });

  // --- INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (prof) {
          const newConf = {
            member: prof.oshi_member || '全員',
            cosplayer: prof.favorite_cosplayer || '全員',
            theme_color: prof.theme_color || '#00f2ff',
            interval: 15000, brightness: 1.0
          };
          setConfig(newConf);
          document.documentElement.style.setProperty('--v-accent', newConf.theme_color);
        }
        await fetchLogWidgets(session.user.id);
      }
      setLoading(false);
    };
    init();
    const clock = setInterval(() => setTime(new Date()), 1000);
    loadCSV();
    return () => clearInterval(clock);
  }, []);

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

  const pickFeatured = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => (config.member === '全員' || p.member === config.member) && (config.cosplayer === '全員' || p.cosplayer === config.cosplayer));
    if (pool.length === 0) pool = allData;
    setFeatured(pool[Math.floor(Math.random() * pool.length)]);
  }, [allData, config.member, config.cosplayer]);

  useEffect(() => {
    pickFeatured();
    const timer = setInterval(pickFeatured, config.interval);
    return () => clearInterval(timer);
  }, [pickFeatured, config.interval]);

  const fetchLogWidgets = async (userId) => {
    const { data } = await supabase.from('fan_logs').select('*').eq('user_id', userId).order('event_date', { ascending: true });
    if (data && data.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      setNextMission(data.find(l => l.event_date > today));
      const archives = [...data].reverse().filter(l => l.event_date <= today);
      setLatestArchive(archives[0]);
      const recent = archives.slice(0, 10);
      const avg = recent.reduce((acc, cur) => acc + cur.fervor_score, 0) / (recent.length || 1);
      setPulseStats({ avgFervor: avg, lastDays: Math.floor((new Date() - new Date(archives[0].event_date)) / 86400000), hasSpark: recent.some(d => d.is_first_spark) });
    }
  };

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

  const saveAllConfig = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ oshi_member: config.member, favorite_cosplayer: config.cosplayer, theme_color: config.theme_color }).eq('id', user.id);
    window.location.reload();
  };

  if (loading) return null;

  return (
    <div className="p-root">
      <Head>
        <title>COMMAND_CENTER // VSPO! HUB</title>
        {/* フォントの絶対ロード */}
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;800&family=Montserrat:wght@100;400;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      {/* 安定版の背景システムを再構築 */}
      <div className="p-bg-layer">
        <div className="p-grain" />
        <div className="p-ambient">
          {featured && <div className="p-glow-wrap" key={featured.image}><img src={featured.image} alt="" /></div>}
          <div className="p-mask" />
        </div>
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
              <div className="p-meta">COMMANDER: {user?.email.split('@')[0]}</div>
              <div className="p-meta">OSHI: {config.cosplayer}</div>
            </div>
            <button className="p-config-btn" onClick={() => setIsConfigOpen(true)}>
              <i className="fas fa-sliders-h"></i> CONFIG_SYSTEM
            </button>
          </div>

          <div className="p-chrono-core">
            <div className="p-clock">{time.toLocaleTimeString('en-US', { hour12: false })}</div>
            <div className="p-date">{time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}</div>
            <div className="p-pulse-monitor">
              <canvas ref={canvasRef} width={600} height={120} />
            </div>
          </div>

          <div className="p-wing-right">
            <div className="p-stack">
              {featured && (
                <div className="p-featured-card">
                  <div className="p-featured-media"><img src={featured.image} alt="" /></div>
                  <div className="p-featured-info"><h3>{featured.member}</h3><p>BY {featured.cosplayer}</p></div>
                </div>
              )}
              <div className="p-feed-panel">
                <div className="p-feed-row"><span className="p-feed-tag">NEXT</span><p>{nextMission?.event_name || 'STANDBY'}</p></div>
              </div>
            </div>
          </div>
        </div>

        <nav className="p-dock-wrap">
          <div className="p-dock">
            <Link href="/gallery"><div className="p-dock-item"><span>GALLERY</span></div></Link>
            <Link href="/log"><div className="p-dock-item"><span>LOGS</span></div></Link>
            <Link href="/tracker"><div className="p-dock-item"><span>TRACKER</span></div></Link>
            <Link href="/chronicle"><div className="p-dock-item"><span>CHRONICLE</span></div></Link>
            <Link href="/analytics"><div className="p-dock-item"><span>ANALYTICS</span></div></Link>
            <Link href="/workstation"><div className="p-dock-item"><span>WORK</span></div></Link>
          </div>
        </nav>
      </main>

      {isConfigOpen && (
        <div className="p-modal-overlay" onClick={() => setIsConfigOpen(false)}>
          <div className="p-modal-card" onClick={e => e.stopPropagation()}>
            <div className="p-modal-head"><h3>SYSTEM_CALIBRATION</h3></div>
            <div className="p-modal-body">
              <div className="p-modal-row"><label>TARGET</label>
                <select className="custom-input" value={config.member} onChange={e => setConfig({...config, member:e.target.value})}>{MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}</select>
              </div>
              <div className="p-modal-row"><label>COLOR</label>
                <input type="color" value={config.theme_color} onChange={e => { setConfig({...config, theme_color:e.target.value}); document.documentElement.style.setProperty('--v-accent', e.target.value); }} />
              </div>
            </div>
            <button className="p-modal-save" onClick={saveAllConfig}>APPLY_AND_SYNC</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* 完璧なフォント指定を固定 */
        body { margin:0; background:#000; color:#fff; font-family: 'Montserrat', 'JetBrains Mono', sans-serif !important; overflow:hidden; }
        .p-root { height:100vh; position:relative; }
        
        /* 背景レイヤー */
        .p-bg-layer { position:fixed; inset:0; z-index:1; }
        .p-grain { position:absolute; inset:0; background:url('https://grainy-gradients.vercel.app/noise.svg'); opacity:0.04; z-index:2; }
        .p-ambient { position:absolute; inset:0; z-index:1; }
        .p-glow-wrap { position:absolute; inset:-10%; filter:blur(100px); opacity:0.4; transition:3s; }
        .p-glow-wrap img { width:100%; height:100%; object-fit:cover; }
        .p-mask { position:absolute; inset:0; background:radial-gradient(circle at center, transparent 10%, #000 90%); }

        /* メインUI */
        .p-main-layer { position:relative; z-index:10; height:100vh; display:flex; flex-direction:column; }
        .p-grid { flex:1; display:grid; grid-template-columns: 380px 1fr 380px; padding:0 60px; align-items:center; }
        
        .p-glass-panel, .p-featured-card, .p-feed-panel { background: rgba(0,0,0,0.7); backdrop-filter: blur(40px); border: 1px solid rgba(255,255,255,0.05); padding: 35px; border-radius: 4px; }
        
        .p-tag { font-family:'JetBrains Mono' !important; font-size:9px; color:var(--v-accent); letter-spacing:0.3em; margin-bottom:15px; display:block; }
        .p-progress-bar { height:100%; background:var(--v-accent); box-shadow:0 0 20px var(--v-accent); transition:1.5s; }
        .p-meta { font-family:'JetBrains Mono' !important; font-size:9px; color:#444; margin-top:8px; }
        
        .p-clock { font-size:120px; font-weight:100; text-align:center; font-family: 'Montserrat' !important; letter-spacing: -0.05em; }
        .p-date { font-size:12px; color:#333; text-align:center; letter-spacing:0.5em; font-family:'JetBrains Mono' !important; margin-top:10px; }
        
        .p-pulse-monitor { width: 600px; margin: 40px auto 0; }
        
        .p-dock-wrap { position:fixed; bottom:40px; left:0; width:100%; display:flex; justify-content:center; }
        .p-dock { display:flex; background:rgba(0,0,0,0.8); backdrop-filter:blur(30px); padding:8px; border-radius:50px; border:1px solid #111; }
        .p-dock-item { padding:12px 25px; color:#555; cursor:pointer; font-family:'JetBrains Mono' !important; font-size:10px; font-weight:800; }
        .p-dock-item:hover { color:var(--v-accent); }
        
        .p-config-btn { background:none; border:1px solid #222; color:#444; padding:15px; font-family:'JetBrains Mono'; font-size:9px; cursor:pointer; width:100%; }

        .p-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:2000; display:flex; align-items:center; justify-content:center; }
        .p-modal-card { background:#0a0a0c; width:450px; padding:50px; border:1px solid #1a1a1c; }
        .custom-input { background:#000; border:1px solid #222; color:#fff; padding:10px; font-family:'JetBrains Mono'; }
        .p-modal-save { width:100%; padding:20px; background:var(--v-accent); border:none; font-family:'JetBrains Mono'; font-weight:800; cursor:pointer; }
      `}</style>
    </div>
  );
}
