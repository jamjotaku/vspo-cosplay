import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

const MEMBER_ORDER = [
  '全員', '集合', '花芽すみれ', '花芽なずな', '小雀とと', '一ノ瀬うるは', '胡桃のあ',
  '兎咲ミミ', '空澄セナ', '橘ひなの', '英リサ', '如月れん', '神成きゅぴ', '八雲べに', 
  '藍沢エマ', '紫宮るな', '猫汰つな', '白波らむね', '小森めと', '夢野あかり', 
  '夜乃くろむ', '紡木こかげ', '千燈ゆうひ', '蝶屋はなび', '甘結もか', '銀城サイネ', '龍巻ちせ'
];

const SIZES = { '小': { w: 240, h: 360 }, '中': { w: 320, h: 480 }, '大': { w: 400, h: 600 }, 'ワイド': { w: 480, h: 270 } };

export default function SyncWidget() {
  const [allData, setAllData] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('magazine'); 
  const [config, setConfig] = useState({ member: '全員', cosplayer: '全員', interval: 60, size: '中' });
  const [pomoConfig, setPomoConfig] = useState({ focusTime: 25, breakTime: 5 });
  const [now, setNow] = useState(new Date());
  const [pomoStatus, setPomoStatus] = useState('idle'); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [user, setUser] = useState(null);

  // --- NEW: LOGIN FORM STATE ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // --- INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // ログイン状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    const saved = localStorage.getItem('vspo-widget-config');
    const savedPomo = localStorage.getItem('vspo-widget-pomo');
    if (saved) setConfig(JSON.parse(saved));
    if (savedPomo) setPomoConfig(JSON.parse(savedPomo));

    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
       Papa.parse(CSV_URL, {
        download: true, header: true, skipEmptyLines: true,
        complete: (res) => {
          const formatted = res.data.filter(d => d.image || d['画像'] || d.link || d['URL']).map(d => ({
            member: (d.member || d['名前'] || "").trim(),
            image: (d.image || d['画像'] || d.link || d['URL'] || "").replace('name=medium', 'name=large'),
            cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
          }));
          setAllData(formatted);
        }
      });
    };
    loadData();
    return () => {
      clearInterval(clockTimer);
      subscription.unsubscribe();
    };
  }, []);

  // --- LOGIN LOGIC ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    if (error) alert("SYNC_AUTH_FAILED: " + error.message);
    else {
      setLoginEmail(""); setLoginPass("");
      setActiveTab('magazine'); // 成功したら戻す
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- PHOTO LOGIC ---
  const pickPhoto = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => (config.member === '全員' || p.member === config.member) && (config.cosplayer === '全員' || p.cosplayer === config.cosplayer));
    if (pool.length === 0) pool = allData;
    setCurrentPhoto(pool[Math.floor(Math.random() * pool.length)]);
  }, [allData, config.member, config.cosplayer]);

  useEffect(() => {
    pickPhoto();
    const intervalTime = pomoStatus === 'break' ? 10 : config.interval;
    const timer = setInterval(pickPhoto, intervalTime * 1000);
    return () => clearInterval(timer);
  }, [pickPhoto, config.interval, pomoStatus]);

  // --- DATA ARCHIVING LOGIC ---
  const archiveSession = async (type, minutes) => {
    if (!user) return; // ログインしていなければ送信しない
    console.log(`ARCHIVING_${type}_SESSION: ${minutes} MIN`);
    const { error } = await supabase
      .from('work_logs')
      .insert([{
        user_id: user.id,
        session_type: type,
        duration_minutes: minutes
      }]);
    if (error) console.error("UPLINK_ERROR:", error.message);
  };

  // --- POMODORO CORE ---
  useEffect(() => {
    if (pomoStatus === 'idle') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          const finishedStatus = pomoStatus;
          const duration = finishedStatus === 'focus' ? pomoConfig.focusTime : pomoConfig.breakTime;
          
          // セッション完了の瞬間にデータをアーカイブ
          archiveSession(finishedStatus.toUpperCase(), duration);

          const nextS = pomoStatus === 'focus' ? 'break' : 'focus';
          setPomoStatus(nextS);
          return (nextS === 'focus' ? pomoConfig.focusTime : pomoConfig.breakTime) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomoStatus, pomoConfig, user]);

  const togglePomo = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (pomoStatus === 'idle') { setPomoStatus('focus'); setTimeLeft(pomoConfig.focusTime * 60); }
    else { if (confirm("現在のセッションを破棄して終了しますか？")) { setPomoStatus('idle'); setTimeLeft(0); } }
  };

  // --- WINDOW RESIZE (ELECTRON) ---
  useEffect(() => {
    if (window.electronAPI) {
      const { w, h } = SIZES[config.size || '中'];
      window.electronAPI.resizeWindow(w, h);
    }
  }, [config.size]);

  const cosplayers = useMemo(() => ['全員', ...new Set(allData.map(d => d.cosplayer))].sort(), [allData]);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className={`widget-root status-${pomoStatus}`}>
      <Head>
        <title>VSPO! // SYNC_WIDGET</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@300;800&family=JetBrains+Mono:wght@800&display=swap" rel="stylesheet" />
      </Head>

      <div className="main-wrapper">
        <div className="bg-photo-layer">{currentPhoto && <img src={currentPhoto.image} alt="" className="main-photo" />}</div>
        <div className="drag-handle-base"></div>

        <div className="ui-overlay">
          <div className="header-ui">
            <div className="brand-badge">
              VSPO! ARCHIVE / {user ? <span style={{color:'var(--v-cyn)'}}>[CONNECTED]</span> : 'OFFLINE'}
            </div>
            <div className="top-clock">{timeStr}</div>
          </div>

          <div className="masthead-ui">
            <h1 className="title-text">{currentPhoto?.member || 'VSPO!'}</h1>
          </div>

          <div className="footer-ui">
            <div className="model-info">
              <span className="label">MODEL</span>
              <div className="name">{currentPhoto?.cosplayer || '---'}</div>
            </div>
            
            <button className={`pomo-trigger-btn ${pomoStatus !== 'idle' ? 'is-active' : ''}`} onClick={togglePomo}>
              <div className="dot pulse"></div>
              <span className="timer-val">{pomoStatus === 'idle' ? 'START' : `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`}</span>
            </button>
          </div>
        </div>

        <button className="gear-trigger-btn" onClick={() => setIsSettingsOpen(true)}><i className="fas fa-ellipsis-v"></i></button>

        {/* SETTINGS VIEW */}
        <div className={`settings-view ${isSettingsOpen ? 'is-active' : ''}`}>
          <div className="settings-content">
            <div className="settings-header">
              <h3>SYSTEM_CONFIG</h3>
              <button className="x-btn" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            
            <div className="settings-tabs">
              <button className={activeTab === 'magazine' ? 'on' : ''} onClick={() => setActiveTab('magazine')}>Magazine</button>
              <button className={activeTab === 'timer' ? 'on' : ''} onClick={() => setActiveTab('timer')}>Timer</button>
              <button className={activeTab === 'sync' ? 'on' : ''} onClick={() => setActiveTab('sync')}>Sync</button>
            </div>

            <div className="settings-body">
              {activeTab === 'magazine' && (
                <div className="field-group">
                  <label>TARGET_MEMBER</label>
                  <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
                    {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <label>IDENTIFIED_COSPLAYER</label>
                  <select value={config.cosplayer} onChange={e => setConfig({...config, cosplayer: e.target.value})}>
                    {cosplayers.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <label>REFRESH_INTERVAL ({config.interval}s)</label>
                  <input type="range" min="10" max="600" step="10" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} />
                  <label>CONSOLE_SIZE</label>
                  <div className="size-grid">
                    {Object.keys(SIZES).map(s => <button key={s} className={config.size === s ? 'on' : ''} onClick={() => setConfig({...config, size: s})}>{s}</button>)}
                  </div>
                </div>
              )}

              {activeTab === 'timer' && (
                <div className="field-group">
                  <label>FOCUS_DURATION ({pomoConfig.focusTime}m)</label>
                  <input type="range" min="5" max="60" step="5" value={pomoConfig.focusTime} onChange={e => setPomoConfig({...pomoConfig, focusTime: parseInt(e.target.value)})} />
                  <label>BREAK_DURATION ({pomoConfig.breakTime}m)</label>
                  <input type="range" min="1" max="15" step="1" value={pomoConfig.breakTime} onChange={e => setPomoConfig({...pomoConfig, breakTime: parseInt(e.target.value)})} />
                </div>
              )}

              {activeTab === 'sync' && (
                <div className="field-group">
                  <label>DATA_UPLINK_STATUS</label>
                  {user ? (
                    <div className="auth-status-info">
                      <p style={{fontSize: '11px', color: '#888'}}>ACCOUNT: <br/>{user.email}</p>
                      <button className="auth-btn logout" onClick={handleLogout}>LOGOUT / DISCONNECT</button>
                    </div>
                  ) : (
                    <div className="auth-form">
                      <input type="email" placeholder="EMAIL" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                      <input type="password" placeholder="PASSWORD" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
                      <button className="auth-btn login" onClick={handleLogin}>ESTABLISH_LINK</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className="final-apply-btn" onClick={() => { 
              localStorage.setItem('vspo-widget-config', JSON.stringify(config)); 
              localStorage.setItem('vspo-widget-pomo', JSON.stringify(pomoConfig));
              setIsSettingsOpen(false); 
            }}>APPLY_CHANGES</button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root { --v-cyn: #00f2ff; --v-mag: #ff00ff; }
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Montserrat', sans-serif; color: white; }
        .main-wrapper { width: 100vw; height: 100vh; position: relative; background: #000; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        
        .bg-photo-layer { position: absolute; inset: 0; z-index: 1; }
        .main-photo { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; }
        .drag-handle-base { position: absolute; inset: 0; z-index: 5; -webkit-app-region: drag; }

        .ui-overlay { position: absolute; inset: 0; z-index: 10; padding: 25px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
        .brand-badge { font-family: 'JetBrains Mono'; font-size: 8px; letter-spacing: 0.2em; color: rgba(255,255,255,0.4); }
        .top-clock { font-family: 'JetBrains Mono'; font-size: 14px; color: #fff; }
        .header-ui { display: flex; justify-content: space-between; align-items: center; }

        .title-text { font-family: 'Playfair Display', serif; font-style: italic; font-size: 48px; margin: 0; text-align: center; line-height: 1; text-shadow: 0 0 20px rgba(0,0,0,0.8); }

        .pomo-trigger-btn, .gear-trigger-btn, .settings-view, .auth-btn, input, select { pointer-events: auto !important; -webkit-app-region: no-drag !important; }

        .footer-ui { display: flex; justify-content: space-between; align-items: flex-end; }
        .model-info .label { font-size: 8px; color: #666; letter-spacing: 0.1em; display: block; margin-bottom: 4px; }
        .model-info .name { font-size: 11px; font-weight: 800; color: #fff; }

        .pomo-trigger-btn { background: rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 12px 20px; border-radius: 40px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.4s; }
        .pomo-trigger-btn:hover { border-color: var(--v-cyn); background: #000; }
        .timer-val { font-family: 'JetBrains Mono'; font-size: 12px; font-weight: 800; }
        
        .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--v-cyn); }
        .pulse { animation: pulse-glow 2s infinite; }
        @keyframes pulse-glow { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
        .status-focus .dot { background: var(--v-mag); box-shadow: 0 0 10px var(--v-mag); }
        .status-break .dot { background: var(--v-cyn); box-shadow: 0 0 10px var(--v-cyn); }
        
        .gear-trigger-btn { position: absolute; top: 20px; right: 20px; z-index: 100; width: 40px; height: 40px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }

        .settings-view { position: absolute; inset: 0; background: rgba(10,10,12,0.95); backdrop-filter: blur(30px); z-index: 1000; transform: translateY(100%); transition: 0.5s cubic-bezier(0.19, 1, 0.22, 1); }
        .settings-view.is-active { transform: translateY(0); }
        .settings-content { padding: 40px; height: 100%; display: flex; flex-direction: column; }
        .settings-header h3 { font-family: 'JetBrains Mono'; font-size: 12px; letter-spacing: 0.2em; color: #444; }
        .settings-tabs { display: flex; gap: 20px; margin-bottom: 30px; }
        .settings-tabs button { background: none; border: none; color: #333; font-weight: 800; padding: 10px 0; font-size: 11px; cursor: pointer; letter-spacing: 0.1em; }
        .settings-tabs button.on { color: var(--v-cyn); border-bottom: 2px solid var(--v-cyn); }

        .settings-body { flex: 1; overflow-y: auto; }
        .field-group label { display: block; font-family: 'JetBrains Mono'; font-size: 8px; color: #444; margin: 20px 0 8px 0; }
        select, input[type="range"], input[type="email"], input[type="password"] { background: #111; border: 1px solid #222; color: #fff; padding: 12px; border-radius: 4px; font-family: 'JetBrains Mono'; width: 100%; box-sizing: border-box; }
        input[type="email"], input[type="password"] { margin-bottom: 10px; font-size: 12px; }

        .auth-btn { width: 100%; padding: 15px; border: none; font-family: 'JetBrains Mono'; font-weight: 800; font-size: 11px; cursor: pointer; margin-top: 10px; border-radius: 4px; }
        .auth-btn.login { background: var(--v-cyn); color: #000; }
        .auth-btn.logout { background: #222; color: #888; }

        .size-grid { display: flex; gap: 8px; }
        .size-grid button { flex: 1; padding: 12px; background: #111; border: 1px solid #222; color: #666; font-size: 10px; cursor: pointer; border-radius: 4px; font-weight: 800; }
        .size-grid button.on { border-color: var(--v-cyn); color: var(--v-cyn); }

        .final-apply-btn { background: var(--v-cyn); color: #000; border: none; padding: 20px; border-radius: 4px; font-weight: 800; font-size: 11px; letter-spacing: 0.2em; cursor: pointer; margin-top: 30px; }
        .x-btn { color: #333; font-size: 32px; background: none; border: none; cursor: pointer; }
      `}</style>
    </div>
  );
}
