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

const SIZES = { 
  '小': { w: 240, h: 360 }, 
  '中': { w: 320, h: 480 }, 
  '大': { w: 400, h: 600 }, 
  'ワイド': { w: 480, h: 270 } 
};

export default function DeepSyncWidget() {
  // --- STATE_MANAGEMENT ---
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

  // --- LOGIN STATE ---
  const [loginID, setLoginID] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // --- INITIALIZATION & REALTIME SYNC ---
  useEffect(() => {
    // 1. Auth Session Initial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 2. Auth State Change Listener
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 3. Realtime Subscription Logic
    let profileSub = null;
    const startSync = (userId) => {
      profileSub = supabase
        .channel('profile-sync')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        }, (payload) => {
          const { theme_color, oshi_member, oshi_cosplayer } = payload.new;
          setConfig(prev => ({ 
            ...prev, 
            member: oshi_member || '全員', 
            cosplayer: oshi_cosplayer || '全員' 
          }));
          if (theme_color) document.documentElement.style.setProperty('--v-cyn', theme_color);
        })
        .subscribe();
    };

    // 4. Load Initial Data from DB
    const syncInitialProfile = async (userId) => {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (prof) {
        setConfig(prev => ({ ...prev, member: prof.oshi_member, cosplayer: prof.oshi_cosplayer }));
        if (prof.theme_color) document.documentElement.style.setProperty('--v-cyn', prof.theme_color);
        startSync(userId);
      }
    };

    // 再ログイン時や起動時にデータを同期
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) syncInitialProfile(session.user.id);
    });

    // その他タイマーとCSVロード
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    const saved = localStorage.getItem('vspo-widget-config');
    const savedPomo = localStorage.getItem('vspo-widget-pomo');
    if (saved) setConfig(prev => ({ ...prev, ...JSON.parse(saved) }));
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
      authSub.unsubscribe();
      if (profileSub) supabase.removeChannel(profileSub);
    };
  }, []);

  // --- LOGIN LOGIC ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const finalEmail = loginID.includes('@') ? loginID : `${loginID}@vspo-internal.local`;
    const { error } = await supabase.auth.signInWithPassword({ email: finalEmail, password: loginPass });

    if (error) {
      alert(`SYNC_AUTH_FAILED: ${error.message}`);
    } else {
      setLoginID(""); setLoginPass("");
      setActiveTab('magazine');
      setIsSettingsOpen(false);
      // 再読み込みして同期開始
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    if (confirm("DISCONNECT?")) {
      await supabase.auth.signOut();
      window.location.reload();
    }
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

  // --- SYNC LOGIC ---
  const archiveSession = async (type, minutes) => {
    if (!user) return;
    await supabase.from('work_logs').insert([{
      user_id: user.id,
      session_type: type,
      duration_minutes: minutes,
      completed_at: new Date().toISOString()
    }]);
  };

  // --- POMODORO CORE ---
  useEffect(() => {
    if (pomoStatus === 'idle') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          archiveSession(pomoStatus.toUpperCase(), pomoStatus === 'focus' ? pomoConfig.focusTime : pomoConfig.breakTime);
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
    else { if (confirm("CANCEL SESSION?")) { setPomoStatus('idle'); setTimeLeft(0); } }
  };

  // --- WINDOW RESIZE ---
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
        <title>VSPO! // REFINED_WIDGET</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@300;800&family=JetBrains+Mono:wght@800&display=swap" rel="stylesheet" />
      </Head>

      <div className="main-wrapper">
        <div className="bg-photo-layer">{currentPhoto && <img src={currentPhoto.image} alt="" className="main-photo" />}</div>
        <div className="drag-handle-base"></div>

        <div className="ui-overlay">
          <div className="header-ui">
            <div className="brand-badge">
              VSPO! / {user ? <span className="sync-active">[RESONANCE_ON]</span> : 'OFFLINE'}
            </div>
            
            <div className="header-controls">
              <div className="top-clock">{timeStr}</div>
              <button className="gear-trigger-btn" onClick={() => setIsSettingsOpen(true)}>
                <i className="fas fa-ellipsis-v"></i>
              </button>
            </div>
          </div>

          <div className="masthead-ui">
            {/* ★主役をコスプレイヤー名に変更 */}
            <h1 className="title-text">{currentPhoto?.cosplayer || 'VSPO!'}</h1>
            <div className="sub-member-name">CHARACTER: {currentPhoto?.member || '---'}</div>
          </div>

          <div className="footer-ui">
            <div className="model-info">
              <span className="label">SYSTEM_RESONANCE</span>
              <div className="name">{config.member} / {config.cosplayer}</div>
            </div>
            
            <button className={`pomo-trigger-btn ${pomoStatus !== 'idle' ? 'is-active' : ''}`} onClick={togglePomo}>
              <div className="dot pulse"></div>
              <span className="timer-val">{pomoStatus === 'idle' ? 'START' : `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`}</span>
            </button>
          </div>
        </div>

        {/* SETTINGS VIEW - フル復元版 */}
        <div className={`settings-view ${isSettingsOpen ? 'is-active' : ''}`}>
          <div className="settings-content">
            <div className="settings-header">
              <h3>SYSTEM_SETUP_v5.1</h3>
              <button className="x-btn" onClick={() => {
                setIsSettingsOpen(false);
                window.focus(); // フォーカスバグ対策
              }}>&times;</button>
            </div>
            
            <div className="settings-tabs">
              <button className={activeTab === 'magazine' ? 'on' : ''} onClick={() => setActiveTab('magazine')}>MAGAZINE</button>
              <button className={activeTab === 'timer' ? 'on' : ''} onClick={() => setActiveTab('timer')}>TIMER</button>
              <button className={activeTab === 'sync' ? 'on' : ''} onClick={() => setActiveTab('sync')}>SYNC</button>
            </div>

            <div className="settings-body no-scrollbar">
              {activeTab === 'magazine' && (
                <div className="field-group">
                  <label>MEMBER_ID</label>
                  <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
                    {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <label>COSPLAYER_ID</label>
                  <select value={config.cosplayer} onChange={e => setConfig({...config, cosplayer: e.target.value})}>
                    {cosplayers.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <label>SCAN_INTERVAL ({config.interval}s)</label>
                  <input type="range" min="10" max="600" step="10" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} />
                  <label>CONSOLE_SIZE</label>
                  <div className="size-grid">
                    {Object.keys(SIZES).map(s => <button key={s} className={config.size === s ? 'on' : ''} onClick={() => setConfig({...config, size: s})}>{s}</button>)}
                  </div>
                  <p className="sync-hint">※MEMBER/COSPLAYERはサイト側の変更とリアルタイム同期されます</p>
                </div>
              )}

              {activeTab === 'timer' && (
                <div className="field-group">
                  <label>FOCUS_TIME ({pomoConfig.focusTime}m)</label>
                  <input type="range" min="5" max="60" step="5" value={pomoConfig.focusTime} onChange={e => setPomoConfig({...pomoConfig, focusTime: parseInt(e.target.value)})} />
                  <label>BREAK_TIME ({pomoConfig.breakTime}m)</label>
                  <input type="range" min="1" max="15" step="1" value={pomoConfig.breakTime} onChange={e => setPomoConfig({...pomoConfig, breakTime: parseInt(e.target.value)})} />
                </div>
              )}

              {activeTab === 'sync' && (
                <div className="field-group">
                  <label>UPLINK_STATION_AUTH</label>
                  {user ? (
                    <div className="auth-status-panel">
                      <div className="user-id-badge">ID: {user.email.split('@')[0]}</div>
                      <p className="status-text">UPLINK: <span className="sync-active">ACTIVE</span></p>
                      <button className="auth-btn logout" onClick={handleLogout}>TERMINATE_LINK</button>
                    </div>
                  ) : (
                    <div className="auth-form">
                      <input type="text" placeholder="COMMANDER_ID" value={loginID} onChange={e => setLoginID(e.target.value)} />
                      <input type="password" placeholder="ACCESS_PASS" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
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
              window.focus();
            }}>SAVE_CONFIG</button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root { --v-cyn: #00f2ff; --v-mag: #ff00ff; --v-bg: #0a0a0c; }
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Montserrat', sans-serif; color: white; }
        .main-wrapper { width: 100vw; height: 100vh; position: relative; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
        
        .bg-photo-layer { position: absolute; inset: 0; z-index: 1; }
        .main-photo { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; transition: 0.5s ease; }
        .drag-handle-base { position: absolute; inset: 0; z-index: 5; -webkit-app-region: drag; }

        .ui-overlay { position: absolute; inset: 0; z-index: 10; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
        
        .header-ui { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .header-controls { display: flex; align-items: center; gap: 12px; pointer-events: auto; }
        
        .brand-badge { font-family: 'JetBrains Mono'; font-size: 8px; letter-spacing: 0.1em; color: rgba(255,255,255,0.3); }
        .sync-active { color: var(--v-cyn); text-shadow: 0 0 10px var(--v-cyn); }
        .top-clock { font-family: 'JetBrains Mono'; font-size: 14px; color: #fff; font-weight: 800; }

        .masthead-ui { text-align: center; }
        .title-text { font-family: 'Playfair Display', serif; font-style: italic; font-size: 38px; margin: 0; line-height: 1; text-shadow: 0 4px 15px rgba(0,0,0,0.8); }
        .sub-member-name { font-family: 'JetBrains Mono'; font-size: 9px; color: var(--v-cyn); margin-top: 8px; opacity: 0.8; letter-spacing: 0.1em; }

        .pomo-trigger-btn, .gear-trigger-btn, .settings-view, .auth-btn, input, select, .final-apply-btn, .x-btn { pointer-events: auto !important; -webkit-app-region: no-drag !important; }

        .gear-trigger-btn { 
          width: 32px; height: 32px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); 
          color: #555; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; 
          backdrop-filter: blur(10px); transition: 0.3s;
        }
        .gear-trigger-btn:hover { color: #fff; border-color: var(--v-cyn); background: rgba(255,255,255,0.1); }

        .footer-ui { display: flex; justify-content: space-between; align-items: flex-end; }
        .model-info .label { font-size: 8px; color: #555; display: block; margin-bottom: 2px; font-family: 'JetBrains Mono'; }
        .model-info .name { font-size: 10px; font-weight: 800; color: #fff; }

        .pomo-trigger-btn { background: rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 10px 18px; border-radius: 40px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.3s; }
        .pomo-trigger-btn:hover { border-color: var(--v-cyn); box-shadow: 0 0 15px rgba(0,242,255,0.2); }
        .timer-val { font-family: 'JetBrains Mono'; font-size: 12px; font-weight: 800; }
        
        .dot { width: 7px; height: 7px; border-radius: 50%; background: #444; }
        .pulse { animation: pulse-glow 2s infinite; }
        @keyframes pulse-glow { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        .status-focus .dot { background: var(--v-mag); box-shadow: 0 0 10px var(--v-mag); }
        .status-break .dot { background: var(--v-cyn); box-shadow: 0 0 10px var(--v-cyn); }
        
        /* --- SETTINGS_VIEW --- */
        .settings-view { position: absolute; inset: 0; background: rgba(10,10,12,0.98); backdrop-filter: blur(30px); z-index: 1000; transform: translateY(100%); transition: 0.5s cubic-bezier(0.19, 1, 0.22, 1); }
        .settings-view.is-active { transform: translateY(0); }
        .settings-content { padding: 40px; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; }
        .settings-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-shrink: 0; }
        .settings-header h3 { font-family: 'JetBrains Mono'; font-size: 12px; color: #eee; margin: 0; }
        .settings-tabs { display: flex; gap: 20px; margin-bottom: 20px; border-bottom: 1px solid #1a1a1c; flex-shrink: 0; }
        .settings-tabs button { background: none; border: none; color: #333; font-weight: 800; padding: 10px 0; font-size: 11px; cursor: pointer; font-family: 'JetBrains Mono'; transition: 0.3s; }
        .settings-tabs button.on { color: var(--v-cyn); border-bottom: 2px solid var(--v-cyn); }

        .settings-body { flex: 1; overflow-y: auto; overflow-x: hidden; margin-right: -10px; padding-right: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .field-group label { display: block; font-family: 'JetBrains Mono'; font-size: 9px; color: #444; margin: 15px 0 6px 0; }
        select, input[type="text"], input[type="password"] { background: #0f0f11; border: 1px solid #1a1a1c; color: #fff; padding: 10px; border-radius: 4px; font-family: 'JetBrains Mono'; width: 100%; box-sizing: border-box; font-size: 12px; outline: none; }
        select:focus, input:focus { border-color: var(--v-cyn); }

        .auth-btn { width: 100%; padding: 12px; border: none; font-family: 'JetBrains Mono'; font-weight: 800; font-size: 10px; cursor: pointer; margin-top: 10px; border-radius: 4px; transition: 0.3s; }
        .auth-btn.login { background: var(--v-cyn); color: #000; }
        .auth-btn.logout { background: #1a1a1c; color: #555; }

        .size-grid { display: flex; gap: 6px; flex-wrap: wrap; }
        .size-grid button { flex: 1; min-width: 45%; padding: 10px; background: #0f0f11; border: 1px solid #1a1a1c; color: #444; font-size: 9px; cursor: pointer; border-radius: 4px; font-weight: 800; font-family: 'JetBrains Mono'; transition: 0.3s; }
        .size-grid button.on { border-color: var(--v-cyn); color: var(--v-cyn); }

        .final-apply-btn { background: #fff; color: #000; border: none; padding: 15px; border-radius: 4px; font-weight: 800; font-size: 10px; letter-spacing: 0.2em; cursor: pointer; margin-top: 20px; font-family: 'JetBrains Mono'; flex-shrink: 0; transition: 0.3s; }
        .final-apply-btn:hover { background: var(--v-cyn); box-shadow: 0 0 20px var(--v-cyn); }
        .x-btn { color: #333; font-size: 28px; background: none; border: none; cursor: pointer; line-height: 1; }
        .x-btn:hover { color: #fff; }

        .sync-hint { font-size: 9px; color: #333; margin-top: 15px; font-family: 'JetBrains Mono'; font-style: italic; }

        @media (max-height: 400px), (max-width: 280px) {
          .settings-content { padding: 15px; }
          .settings-tabs { gap: 10px; margin-bottom: 10px; }
          .settings-tabs button { font-size: 9px; padding: 5px 0; }
          .title-text { font-size: 28px; }
        }

        .p-loader { height:100vh; background:#000; color:var(--v-cyn); display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono'; letter-spacing:0.5em; font-size:14px; }
      `}</style>
    </div>
  );
}
