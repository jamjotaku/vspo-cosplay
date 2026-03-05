import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

const MEMBER_ORDER = [
  '全員', '集合', '花芽すみれ', '花芽なずな', '小雀とと', '一ノ瀬うるは', '胡桃のあ',
  '兎咲ミミ', '空澄セナ', '橘ひなの', '英リサ', '如月れん', '神成きゅぴ', '八雲べに', 
  '藍沢エマ', '紫宮るな', '猫汰つな', '白波らむね', '小森めと', '夢野あかり', 
  '夜乃くろむ', '紡木こかげ', '千燈ゆうひ', '蝶屋はなび', '甘結もか', '銀城サイネ', '龍巻ちせ'
];

const SIZES = { '小': { w: 240, h: 360 }, '中': { w: 320, h: 480 }, '大': { w: 400, h: 600 }, 'ワイド': { w: 480, h: 270 } };

export default function Widget() {
  const [allData, setAllData] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('magazine'); 
  const [config, setConfig] = useState({ member: '全員', cosplayer: '全員', interval: 60, size: '中' });
  const [pomoConfig, setPomoConfig] = useState({ focusTime: 25, breakTime: 5 });
  const [now, setNow] = useState(new Date());
  const [pomoStatus, setPomoStatus] = useState('idle'); 
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
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
    return () => clearInterval(clockTimer);
  }, []);

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

  useEffect(() => {
    if (pomoStatus === 'idle') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          const nextStatus = pomoStatus === 'focus' ? 'break' : 'focus';
          setPomoStatus(nextStatus);
          return (nextStatus === 'focus' ? pomoConfig.focusTime : pomoConfig.breakTime) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomoStatus, pomoConfig]);

  const togglePomo = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (pomoStatus === 'idle') {
      setPomoStatus('focus');
      setTimeLeft(pomoConfig.focusTime * 60);
    } else {
      if (confirm("タイマーを終了しますか？")) {
        setPomoStatus('idle');
        setTimeLeft(0);
      }
    }
  };

  useEffect(() => {
    if (window.electronAPI) {
      const { w, h } = SIZES[config.size || '中'];
      window.electronAPI.resizeWindow(w, h);
    }
  }, [config.size]);

  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className={`widget-root status-${pomoStatus}`}>
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@300;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="main-wrapper">
        {/* レイヤー1: 背景写真 */}
        <div className="background-layer">
          {currentPhoto && <img src={currentPhoto.image} alt="" className="main-photo" />}
          <div className="grain-overlay"></div>
        </div>
        
        {/* レイヤー2: ウィンドウ移動用の透明な壁 (ボタンがある場所を避ける) */}
        <div className="drag-handle"></div>

        {/* レイヤー3: 誌面デザイン ＆ ポモドーロボタン */}
        <div className="editorial-layer">
          <div className="top-bar">
            <div className="brand">VSPO! ARCHIVE / SPECIAL ISSUE</div>
            <div className="clock">{timeStr}</div>
          </div>

          <div className="masthead">
            <h1 className="title">{currentPhoto?.member || 'VSPO!'}</h1>
            <div className="release-info">{dateStr} / NEW ISSUE</div>
          </div>

          <div className="footer-bar">
            <div className="credits">
              <span className="label">MODEL</span>
              <div className="name">{currentPhoto?.cosplayer || 'Unknown'}</div>
            </div>
            {/* 修正：z-indexを上げてpointer-eventsを確実にする */}
            <div className="pomo-btn" onClick={togglePomo}>
              <div className="dot"></div>
              <span>{pomoStatus === 'idle' ? 'START SESSION' : `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`}</span>
            </div>
          </div>

          {pomoStatus !== 'idle' && (
            <div className="pomo-progress">
              <div className="pomo-bar" style={{ width: `${(timeLeft / (pomoStatus === 'focus' ? pomoConfig.focusTime*60 : pomoConfig.breakTime*60)) * 100}%` }}></div>
            </div>
          )}
        </div>

        {/* レイヤー4: 設定ボタン (最前面) */}
        <button className="settings-trigger" onClick={() => setIsSettingsOpen(true)}>
          <i className="fas fa-ellipsis-v"></i>
        </button>

        {/* レイヤー5: 設定パネル (最前面・クリック可能) */}
        <div className={`settings-panel ${isSettingsOpen ? 'is-open' : ''}`}>
          <div className="panel-inner">
            <div className="panel-header">
              <h3>WIDGET SETTINGS</h3>
              <button className="close-x" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            <div className="panel-tabs">
              <button className={activeTab === 'magazine' ? 'active' : ''} onClick={() => setActiveTab('magazine')}>Magazine</button>
              <button className={activeTab === 'pomo' ? 'active' : ''} onClick={() => setActiveTab('pomo')}>Timer</button>
            </div>
            
            <div className="panel-body">
              {activeTab === 'magazine' ? (
                <div className="group">
                  <label>MEMBER</label>
                  <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
                    {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <label>SIZE</label>
                  <div className="size-row">
                    {Object.keys(SIZES).map(s => <button key={s} className={config.size === s ? 'active' : ''} onClick={() => setConfig({...config, size: s})}>{s}</button>)}
                  </div>
                </div>
              ) : (
                <div className="group">
                  <label>FOCUS TIME ({pomoConfig.focusTime} min)</label>
                  <input type="range" min="5" max="60" step="5" value={pomoConfig.focusTime} onChange={e => setPomoConfig({...pomoConfig, focusTime: parseInt(e.target.value)})} />
                  <label>BREAK TIME ({pomoConfig.breakTime} min)</label>
                  <input type="range" min="1" max="15" step="1" value={pomoConfig.breakTime} onChange={e => setPomoConfig({...pomoConfig, breakTime: parseInt(e.target.value)})} />
                </div>
              )}
            </div>
            <button className="apply-btn" onClick={() => { localStorage.setItem('vspo-widget-config', JSON.stringify(config)); setIsSettingsOpen(false); }}>SAVE & CLOSE</button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Montserrat', sans-serif; color: white; user-select: none; }
        .main-wrapper { width: 100vw; height: 100vh; position: relative; background: #000; border-radius: 12px; overflow: hidden; }
        
        /* 写真レイヤー */
        .background-layer { position: absolute; inset: 0; z-index: 1; }
        .main-photo { width: 100%; height: 100%; object-fit: cover; }
        .grain-overlay { position: absolute; inset: 0; background-image: url("https://grainy-gradients.vercel.app/noise.svg"); opacity: 0.1; pointer-events: none; }

        /* ドラッグ用レイヤー (z-indexを中間にして、ボタンを避ける) */
        .drag-handle { position: absolute; inset: 0; z-index: 5; -webkit-app-region: drag; }

        /* デザイン ＆ ボタンレイヤー (ドラッグより上に配置) */
        .editorial-layer { position: absolute; inset: 0; z-index: 10; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 30%, transparent 70%, rgba(0,0,0,0.6)); }
        
        .top-bar, .masthead, .footer-bar { pointer-events: none; }
        .clock { font-size: 14px; font-weight: 800; opacity: 0.8; }
        .brand { font-size: 8px; font-weight: 800; letter-spacing: 0.2em; border-left: 2px solid #00f2ff; padding-left: 8px; }

        .masthead { text-align: center; }
        .title { font-family: 'Playfair Display', serif; font-style: italic; font-size: 42px; margin: 0; line-height: 1; text-shadow: 0 4px 15px rgba(0,0,0,0.8); }
        .release-info { font-size: 8px; letter-spacing: 0.3em; margin-top: 8px; opacity: 0.6; }

        .footer-bar { display: flex; justify-content: space-between; align-items: flex-end; }
        .credits .label { font-size: 7px; font-weight: 800; opacity: 0.5; }
        .credits .name { font-size: 18px; font-weight: 800; }

        /* ポモドーロボタン (クリックを有効にする) */
        .pomo-btn { pointer-events: auto !important; -webkit-app-region: no-drag; cursor: pointer; display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.7); padding: 10px 15px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); transition: 0.3s; z-index: 20; }
        .pomo-btn:hover { background: #00f2ff; color: #000; border-color: #00f2ff; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #00f2ff; box-shadow: 0 0 10px #00f2ff; }
        .status-focus .dot { background: #ff00ff; box-shadow: 0 0 10px #ff00ff; }
        .pomo-btn span { font-size: 10px; font-weight: 800; }

        .pomo-progress { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: rgba(255,255,255,0.1); }
        .pomo-bar { height: 100%; background: #00f2ff; transition: width 1s linear; }

        /* 設定トリガー (ドラッグより上) */
        .settings-trigger { position: absolute; top: 15px; right: 15px; width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); color: white; cursor: pointer; z-index: 100; -webkit-app-region: no-drag; transition: 0.3s; }
        .settings-trigger:hover { background: #fff; color: #000; }

        /* 設定パネル (最前面・絶対クリック可能) */
        .settings-panel { position: absolute; inset: 0; background: #0a0a0c; z-index: 1000; transform: translateX(100%); transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1); pointer-events: auto !important; }
        .settings-panel.is-open { transform: translateX(0); }
        .panel-inner { padding: 30px; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; -webkit-app-region: no-drag; }
        .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .close-x { background: none; border: none; color: #555; font-size: 28px; cursor: pointer; }
        .panel-tabs { display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 1px solid #222; }
        .panel-tabs button { background: none; border: none; color: #555; font-weight: 800; cursor: pointer; padding-bottom: 10px; -webkit-app-region: no-drag; }
        .panel-tabs button.active { color: #00f2ff; border-bottom: 2px solid #00f2ff; }
        .group label { display: block; font-size: 9px; color: #666; font-weight: 800; margin-bottom: 10px; }
        select, input[type="range"] { width: 100%; margin-bottom: 20px; -webkit-app-region: no-drag; }
        .size-row { display: flex; gap: 5px; margin-bottom: 20px; }
        .size-row button { flex: 1; background: #1a1a1c; border: 1px solid #333; color: white; padding: 10px; border-radius: 6px; font-size: 11px; cursor: pointer; -webkit-app-region: no-drag; }
        .size-row button.active { border-color: #00f2ff; color: #00f2ff; }
        .apply-btn { margin-top: auto; background: #00f2ff; color: #000; border: none; padding: 15px; border-radius: 8px; font-weight: 800; cursor: pointer; -webkit-app-region: no-drag; }
      `}</style>
    </div>
  );
}
