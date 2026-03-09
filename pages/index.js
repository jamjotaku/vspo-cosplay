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
  
  // システム設定（ウィジェット詳細設定を追加）
  const [config, setConfig] = useState({
    glow: true,
    grain: true,
    whisper: true,
    showWidget: true,
    showCaption: true,
    interval: 15000, // スライド速度（ミリ秒）
    focusMember: 'ALL' // 絞り込みメンバー
  });

  const slideTimer = useRef(null);

  useEffect(() => {
    // 設定読み込み
    const savedConfig = localStorage.getItem('v_portal_system_v3');
    if (savedConfig) setConfig(JSON.parse(savedConfig));

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchLatestLog(session.user.id);
    });

    const clockTimer = setInterval(() => setTime(new Date()), 1000);

    // データ初期取得
    const fetchAllData = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, {
        download: true, header: true, complete: (res) => {
          const list = res.data.filter(d => d.image || d.url);
          setAllData(list);
        }
      });
    };
    fetchAllData();

    return () => clearInterval(clockTimer);
  }, []);

  // スライドショーの更新ロジック
  useEffect(() => {
    if (!allData.length || !config.showWidget) return;

    const pickRandom = () => {
      const pool = config.focusMember === 'ALL' 
        ? allData 
        : allData.filter(d => d.member === config.focusMember);
      
      if (pool.length > 0) {
        setFeatured(pool[Math.floor(Math.random() * pool.length)]);
      }
    };

    // メンバー変更時や速度変更時に即座に1枚目を切り替える
    pickRandom();

    // インターバル設定
    clearInterval(slideTimer.current);
    slideTimer.current = setInterval(pickRandom, config.interval);

    return () => clearInterval(slideTimer.current);
  }, [allData, config.focusMember, config.interval, config.showWidget]);

  const fetchLatestLog = async (userId) => {
    const { data } = await supabase.from('fan_logs').select('event_name, memory_note').eq('user_id', userId).order('event_date', { ascending: false }).limit(1);
    if (data?.[0]) setRecentLog(data[0]);
  };

  const updateConfig = (key, val) => {
    const newConfig = { ...config, [key]: val };
    setConfig(newConfig);
    localStorage.setItem('v_portal_system_v3', JSON.stringify(newConfig));
  };

  return (
    <div className="portal-root">
      <Head>
        <title>VSPO! HUB // TERMINAL</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;400;700;800&display=swap" rel="stylesheet" />
      </Head>

      {config.grain && <div className="grain-overlay"></div>}

      <main className="terminal-interface">
        <div className="ambient-lighting">
          {config.glow && config.showWidget && featured && (
            <div className="dynamic-glow"><img src={featured.image || featured.url} alt="" /></div>
          )}
          <div className="vignette-deep"></div>
        </div>

        <div className="triptych-grid">
          {/* LEFT: SYSTEM & CONFIG */}
          <div className="wing-left">
            <div className="meta-info">
              <div className="config-trigger" onClick={() => setIsConfigOpen(true)}>
                <i className="fas fa-sliders-h"></i> <span>SYSTEM_CONFIG</span>
              </div>
              <div className="status-box">
                <span className="sid">UNIT // {user ? user.email.split('@')[0] : "ANONYMOUS"}</span>
                <span className="loc">MODE // {config.focusMember === 'ALL' ? 'WANDERING' : 'FOCUSED'}</span>
              </div>
            </div>
          </div>

          {/* CENTER: TIME & WHISPER */}
          <div className="center-core">
            <div className="zen-clock">{time.toLocaleTimeString('en-US', { hour12: false })}</div>
            {config.whisper && recentLog && (
              <div className="memory-whisper">
                <i className="fas fa-quote-left"></i> {recentLog.event_name} — {recentLog.memory_note}
              </div>
            )}
          </div>

          {/* RIGHT: SLIDESHOW WIDGET */}
          <div className="wing-right">
            {config.showWidget && featured ? (
              <div className="featured-wrap" key={featured.image}> {/* Keyを変えることでフェードアニメーションを誘発 */}
                <div className="image-frame-organic">
                  <img src={featured.image || featured.url} alt="" />
                </div>
                {config.showCaption && (
                  <div className="piece-caption">
                    <div className="p-cos">{featured.cosplayer || featured['レイヤー']}</div>
                    <div className="p-mem">{featured.member || featured['名前']}</div>
                  </div>
                )}
              </div>
            ) : <div className="widget-placeholder">STANDBY...</div>}
          </div>
        </div>

        <nav className="minimal-dock">
          {['GALLERY', 'CHRONICLE', 'TRACKER', 'LOG'].map(item => (
            <Link href={`/${item.toLowerCase()}`} key={item}><div className="dock-link">{item}</div></Link>
          ))}
        </nav>
      </main>

      {/* CONFIG MODAL */}
      {isConfigOpen && (
        <div className="config-modal-overlay" onClick={() => setIsConfigOpen(false)}>
          <div className="config-card" onClick={e => e.stopPropagation()}>
            <div className="config-head">
              <h3>SYSTEM CONFIGURATION</h3>
              <button onClick={() => setIsConfigOpen(false)}>&times;</button>
            </div>
            
            <div className="config-scroll-area">
              {/* VISUAL EFFECTS */}
              <div className="config-section">
                <span className="section-label">VISUAL EFFECTS</span>
                <div className="config-item">
                  <label>AMBIENT GLOW / FILM GRAIN</label>
                  <div className="btn-group">
                    <button className={config.glow ? 'on' : ''} onClick={() => updateConfig('glow', !config.glow)}>GLOW</button>
                    <button className={config.grain ? 'on' : ''} onClick={() => updateConfig('grain', !config.grain)}>GRAIN</button>
                  </div>
                </div>
              </div>

              {/* WIDGET SPEED */}
              <div className="config-section">
                <span className="section-label">SLIDESHOW SPEED</span>
                <div className="btn-group-full">
                  {[5000, 15000, 60000].map(v => (
                    <button key={v} className={config.interval === v ? 'on' : ''} onClick={() => updateConfig('interval', v)}>
                      {v === 5000 ? 'SHORT (5s)' : v === 15000 ? 'NORMAL (15s)' : 'LONG (60s)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* FOCUS MEMBER */}
              <div className="config-section">
                <span className="section-label">WIDGET FOCUS MEMBER</span>
                <div className="member-select-grid">
                  <button className={config.focusMember === 'ALL' ? 'on' : ''} onClick={() => updateConfig('focusMember', 'ALL')}>ALL MEMBERS</button>
                  {memberOrder.map(m => (
                    <button key={m} className={config.focusMember === m ? 'on' : ''} onClick={() => updateConfig('focusMember', m)}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        body { margin: 0; background: #000; font-family: 'Montserrat', sans-serif; color: #fff; overflow: hidden; }
        .terminal-interface { position: relative; z-index: 10; height: 100vh; display: flex; flex-direction: column; padding: 60px; box-sizing: border-box; }
        .triptych-grid { flex: 1; display: grid; grid-template-columns: 1fr 1.5fr 1fr; align-items: center; gap: 40px; }
        
        /* 演出系 */
        .grain-overlay { position: fixed; inset: 0; z-index: 9999; pointer-events: none; background-image: url('https://www.transparenttextures.com/patterns/stardust.png'); opacity: 0.12; mix-blend-mode: overlay; }
        .dynamic-glow { position: absolute; right: -5%; top: 10%; width: 50%; height: 70%; filter: blur(120px); opacity: 0.2; transform: rotate(-10deg); }
        .dynamic-glow img { width: 100%; height: 100%; object-fit: cover; }
        .vignette-deep { position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 0%, #000 90%); }

        /* 中央時計 */
        .zen-clock { font-weight: 100; font-size: 100px; letter-spacing: -0.02em; color: rgba(255,255,255,0.8); text-align: center; }
        .memory-whisper { margin-top: 30px; font-size: 11px; font-style: italic; color: #444; letter-spacing: 0.1em; text-align: center; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.6; animation: breathe 8s ease-in-out infinite; }

        /* 右ウィジェット */
        .featured-wrap { animation: fadeIn 2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .image-frame-organic { width: 280px; height: 400px; border-radius: 2px; overflow: hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.9); border: 1px solid rgba(255,255,255,0.03); }
        .image-frame-organic img { width: 100%; height: 100%; object-fit: cover; }
        .piece-caption { margin-top: 50px; text-align: right; }
        .p-cos { font-size: 14px; color: #666; font-weight: 200; }
        .p-mem { font-size: 11px; color: #00f2ff; font-weight: 700; margin-top: 6px; letter-spacing: 0.2em; }

        /* 設定画面 UI */
        .config-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(15px); z-index: 5000; display: flex; align-items: center; justify-content: center; }
        .config-card { background: #0a0a0b; width: 500px; max-height: 80vh; padding: 40px; border: 1px solid #1a1a1c; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; }
        .config-scroll-area { overflow-y: auto; padding-right: 15px; scrollbar-width: thin; scrollbar-color: #333 #000; }
        .config-section { margin-bottom: 40px; }
        .section-label { display: block; font-size: 9px; font-weight: 800; color: #333; margin-bottom: 15px; letter-spacing: 0.2em; border-bottom: 1px solid #111; padding-bottom: 8px; }
        .btn-group, .btn-group-full { display: flex; gap: 10px; }
        .btn-group-full button { flex: 1; }
        .member-select-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        button { background: #111; border: 1px solid #222; color: #444; padding: 12px; font-size: 10px; font-weight: 800; cursor: pointer; transition: 0.3s; border-radius: 2px; }
        button.on { border-color: #00f2ff; color: #00f2ff; background: rgba(0,242,255,0.02); }
        .config-head button { background: none; border: none; font-size: 24px; color: #fff; }

        .dock-link { font-size: 11px; font-weight: 800; letter-spacing: 0.4em; color: #222; cursor: pointer; transition: 0.4s; }
        .dock-link:hover { color: #fff; letter-spacing: 0.6em; }
        @keyframes breathe { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}