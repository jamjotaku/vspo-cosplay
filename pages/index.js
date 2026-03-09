import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";
const memberOrder = ["花芽すみれ", "花芽なずな", "小雀とと", "一ノ瀬うるは", "胡桃のあ", "兎咲ミミ", "空澄セナ", "橘ひなの", "英リサ", "如月れん", "神成きゅぴ", "八雲べに", "藍沢エマ", "紫宮るな", "猫汰つな", "白波らむね", "小森めと", "夢野あかり", "夜乃くろむ", "紡木こかげ", "千燈ゆうひ", "蝶屋はなび", "甘結もか"];

export default function Portal() {
  const [allData, setAllData] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [user, setUser] = useState(null);
  const [time, setTime] = useState(new Date());
  const [recentLog, setRecentLog] = useState(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const [config, setConfig] = useState({
    glow: true, grain: true, whisper: true, showWidget: true,
    showCaption: true, interval: 15000, focusMember: 'ALL', brightness: 0.8 // 初期輝度を少し上げ
  });

  const slideTimer = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('v_portal_final_v2');
    if (saved) setConfig(JSON.parse(saved));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchLatestLog(session.user.id);
    });

    const clock = setInterval(() => setTime(new Date()), 1000);
    const fetchAll = async () => {
      const Papa = (await import('papaparse')).default;
       Papa.parse(CSV_URL, { download: true, header: true, complete: (res) => {
        setAllData(res.data.filter(d => d.image || d.url));
      }});
    };
    fetchAll();
    return () => { clearInterval(clock); clearInterval(slideTimer.current); };
  }, []);

  useEffect(() => {
    if (!allData.length || !config.showWidget) return;
    const pick = () => {
      const pool = config.focusMember === 'ALL' ? allData : allData.filter(d => d.member === config.focusMember);
      if (pool.length) setFeatured(pool[Math.floor(Math.random() * pool.length)]);
    };
    pick();
    clearInterval(slideTimer.current);
    slideTimer.current = setInterval(pick, config.interval);
  }, [allData, config.focusMember, config.interval, config.showWidget]);

  const fetchLatestLog = async (uid) => {
    const { data } = await supabase.from('fan_logs').select('event_name, memory_note').eq('user_id', uid).order('event_date', { ascending: false }).limit(1);
    if (data?.[0]) setRecentLog(data[0]);
  };

  const updateConfig = (key, val) => {
    const next = { ...config, [key]: val };
    setConfig(next);
    localStorage.setItem('v_portal_final_v2', JSON.stringify(next));
  };

  return (
    <div className="p-root" style={{ '--v-bright': config.brightness }}>
      <Head>
        <title>VSPO! HUB // TERMINAL</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;400;700;800&display=swap" rel="stylesheet" />
      </Head>

      {config.grain && <div className="grain"></div>}

      <main className="t-interface">
        <div className="ambient-lit">
          {config.glow && config.showWidget && featured && (
            <div className="g-glow"><img src={featured.image || featured.url} alt="" /></div>
          )}
          <div className="v-mask"></div>
        </div>

        <div className="t-grid">
          {/* LEFT: SYSTEM */}
          <div className="w-left">
            <div className="glass-btn config-trigger" onClick={() => setIsConfigOpen(true)}>
              <i className="fas fa-sliders-h"></i> <span>SYSTEM_CONFIG</span>
            </div>
            <div className="stat-box">
              <span className="sid">UNIT // {user ? user.email.split('@')[0] : "ANONYMOUS"}</span>
              <span className="loc">STATUS // {user ? "ENCRYPTED" : "OFFLINE"}</span>
            </div>
          </div>

          {/* CENTER: ZEN */}
          <div className="c-core">
            <div className="z-clock">{time.toLocaleTimeString('en-US', { hour12: false })}</div>
            {config.whisper && recentLog && (
              <div className="whisper-box">
                <div className="w-glass">
                  <i className="fas fa-quote-left"></i> {recentLog.event_name} — {recentLog.memory_note}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: WIDGET (視認性補正版) */}
          <div className="w-right">
            {config.showWidget && featured ? (
              <div className="f-wrap" key={featured.image}>
                <div className="f-frame-container">
                  <div className="f-frame"><img src={featured.image || featured.url} alt="" /></div>
                  {/* 画像背後の局所的な光 */}
                  <div className="f-back-light" style={{ background: `radial-gradient(circle, var(--v-c) 0%, transparent 70%)`, opacity: config.brightness * 0.3 }}></div>
                </div>
                {config.showCaption && (
                  <div className="f-cap-glass">
                    <div className="c-name">{featured.cosplayer || featured['レイヤー']}</div>
                    <div className="m-name">{featured.member || featured['名前']}</div>
                  </div>
                )}
              </div>
            ) : <div className="standby">STANDBY</div>}
          </div>
        </div>

        <nav className="d-dock">
          <div className="glass-btn d-inner">
            {['GALLERY', 'CHRONICLE', 'TRACKER', 'LOG'].map(i => (
              <Link href={`/${i.toLowerCase()}`} key={i}><div className="d-link">{i}</div></Link>
            ))}
          </div>
        </nav>
      </main>

      {/* CONFIG MODAL (略さず維持) */}
      {isConfigOpen && (
        <div className="m-overlay" onClick={() => setIsConfigOpen(false)}>
          <div className="m-card" onClick={e => e.stopPropagation()}>
            <div className="m-head"><h3>SYSTEM CONFIG</h3><button onClick={() => setIsConfigOpen(false)}>&times;</button></div>
            <div className="m-body">
              <div className="m-sec">
                <span className="m-lab">LUMINANCE</span>
                <div className="s-box"><i className="fas fa-sun"></i><input type="range" min="0.1" max="1" step="0.1" value={config.brightness} onChange={e => updateConfig('brightness', parseFloat(e.target.value))} /></div>
              </div>
              <div className="m-sec">
                <span className="m-lab">WIDGET FOCUS</span>
                <div className="m-grid">
                  <button className={config.focusMember==='ALL'?'on':''} onClick={()=>updateConfig('focusMember','ALL')}>ALL</button>
                  {memberOrder.map(m => <button key={m} className={config.focusMember===m?'on':''} onClick={()=>updateConfig('focusMember',m)}>{m}</button>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root { --v-c: #00f2ff; }
        body { margin:0; background:#000; font-family:'Montserrat',sans-serif; color:#fff; overflow:hidden; }
        .p-root { width:100vw; height:100vh; position:relative; }
        .grain { position:fixed; inset:0; z-index:9999; pointer-events:none; background-image:url('https://www.transparenttextures.com/patterns/stardust.png'); opacity:0.12; mix-blend-mode:overlay; }
        
        .t-interface { position:relative; z-index:10; height:100%; display:flex; flex-direction:column; padding:60px; box-sizing:border-box; }
        .ambient-lit { position:absolute; inset:0; z-index:0; }
        .g-glow { position:absolute; right:-5%; top:10%; width:50%; height:70%; filter:blur(120px); opacity:calc(var(--v-bright)*0.5); transform:rotate(-10deg); }
        .g-glow img { width:100%; height:100%; object-fit:cover; }
        
        /* グラデーションの影を少し中央寄りに限定し、ウィジェットが沈まないように調整 */
        .v-mask { position:absolute; inset:0; background:radial-gradient(circle at center, transparent 30%, #000 100%); }
        
        .t-grid { flex:1; display:grid; grid-template-columns:1fr 1.5fr 1fr; align-items:center; gap:40px; }
        .glass-btn { background:rgba(255,255,255,0.06); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:12px 24px; transition:0.3s; cursor:pointer; }
        .glass-btn:hover { background:rgba(255,255,255,0.12); border-color:var(--v-c); box-shadow:0 0 30px rgba(0,242,255,0.3); }
        
        .config-trigger { display:inline-flex; align-items:center; gap:15px; color:rgba(255,255,255,calc(0.5+var(--v-bright)*0.5)); width:fit-content; }
        .config-trigger i { color:var(--v-c); text-shadow: 0 0 10px var(--v-c); }
        .config-trigger span { font-size:10px; font-weight:800; letter-spacing:0.2em; }
        
        .stat-box { margin-top:20px; padding-left:20px; border-left:1px solid rgba(255,255,255,0.1); }
        .sid, .loc { display:block; font-size:9px; font-weight:700; color:rgba(255,255,255,calc(var(--v-bright)*0.4)); letter-spacing:0.2em; margin-bottom:5px; }
        
        .z-clock { font-weight:100; font-size:110px; text-align:center; color:rgba(255,255,255,calc(0.4+var(--v-bright)*0.6)); text-shadow: 0 0 20px rgba(255,255,255,0.05); }
        .w-glass { background:rgba(255,255,255,0.03); backdrop-filter:blur(15px); padding:18px 35px; border:1px solid rgba(255,255,255,0.1); font-size:12px; font-style:italic; color:rgba(255,255,255,calc(0.6+var(--v-bright)*0.4)); line-height:1.8; border-radius:8px; margin-top:30px; animation: breathe 8s infinite; }
        
        /* Widget Styling */
        .f-wrap { animation: fIn 2s; text-align:right; position:relative; }
        .f-frame-container { position:relative; display:inline-block; }
        .f-frame { width:280px; height:400px; border-radius:4px; overflow:hidden; box-shadow:0 50px 100px #000; border:1px solid rgba(255,255,255,0.08); position:relative; z-index:2; }
        .f-frame img { width:100%; height:100%; object-fit:cover; }
        .f-back-light { position:absolute; top:20%; left:20%; width:100%; height:100%; filter:blur(60px); z-index:1; }
        
        /* キャプションを見やすく補正 */
        .f-cap-glass { 
          margin-top:30px; background:rgba(255,255,255,0.03); backdrop-filter:blur(10px); 
          padding:15px; border-radius:8px; display:inline-block; border:1px solid rgba(255,255,255,0.05);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .c-name { font-size:15px; color:#fff; font-weight:400; letter-spacing:0.05em; }
        .m-name { font-size:11px; color:var(--v-c); font-weight:800; margin-top:6px; letter-spacing:0.2em; text-transform:uppercase; }
        
        .d-dock { display:flex; justify-content:center; padding-top:40px; }
        .d-inner { display:flex; gap:60px; border-radius:60px; padding:18px 60px; }
        .d-link { font-size:11px; font-weight:800; letter-spacing:0.4em; color:rgba(255,255,255,calc(0.4+var(--v-bright)*0.6)); }
        .d-link:hover { color:#fff; text-shadow:0 0 15px var(--v-c); }
        
        .m-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.92); backdrop-filter:blur(30px); z-index:5000; display:flex; align-items:center; justify-content:center; }
        .m-card { background:#0a0a0b; width:480px; padding:40px; border:1px solid #1a1a1c; border-radius:12px; max-height:85vh; overflow-y:auto; box-shadow: 0 0 100px rgba(0,0,0,1); }
        .m-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:40px; border-bottom:1px solid #111; padding-bottom:20px; }
        .m-sec { margin-bottom:35px; }
        .m-lab { display:block; font-size:10px; font-weight:800; color:#444; margin-bottom:18px; letter-spacing:0.2em; }
        .s-box { display:flex; align-items:center; gap:25px; background:#111; padding:18px; border-radius:8px; }
        .s-box input { flex:1; accent-color:var(--v-c); }
        .m-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .m-grid button { background:#111; border:1px solid #222; color:#555; padding:12px; font-size:9px; border-radius:4px; font-weight:800; transition:0.3s; cursor:pointer; }
        .m-grid button.on { color:var(--v-c); border-color:var(--v-c); background:rgba(0,242,255,0.02); }
        
        @keyframes breathe { 0%,100% { opacity:0.5; } 50% { opacity:0.9; } }
        @keyframes fIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
      `}</style>
    </div>
  );
}
