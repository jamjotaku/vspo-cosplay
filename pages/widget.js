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
          const nextS = pomoStatus === 'focus' ? 'break' : 'focus';
          setPomoStatus(nextS);
          return (nextS === 'focus' ? pomoConfig.focusTime : pomoConfig.breakTime) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomoStatus, pomoConfig]);

  const togglePomo = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (pomoStatus === 'idle') { setPomoStatus('focus'); setTimeLeft(pomoConfig.focusTime * 60); }
    else { if (confirm("終了しますか？")) { setPomoStatus('idle'); setTimeLeft(0); } }
  };

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
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@300;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="main-wrapper">
        <div className="bg-photo-layer">{currentPhoto && <img src={currentPhoto.image} alt="" className="main-photo" />}</div>
        
        <div className="drag-handle-base"></div>

        <div className="ui-overlay">
          <div className="header-ui">
            <div className="brand-badge">VSPO! ARCHIVE / SPECIAL</div>
            <div className="top-clock">{timeStr}</div>
          </div>

          <div className="masthead-ui">
            <h1 className="title-text">{currentPhoto?.member || 'VSPO!'}</h1>
          </div>

          <div className="footer-ui">
            <div className="model-info"><span className="label">MODEL</span><div className="name">{currentPhoto?.cosplayer || '---'}</div></div>
            <button className="pomo-trigger-btn" onClick={togglePomo}>
              <div className="dot"></div>
              <span>{pomoStatus === 'idle' ? 'START SESSION' : `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`}</span>
            </button>
          </div>
        </div>

        <button className="gear-trigger-btn" onClick={() => setIsSettingsOpen(true)}><i className="fas fa-ellipsis-v"></i></button>

        <div className={`settings-view ${isSettingsOpen ? 'is-active' : ''}`}>
          <div className="settings-content">
            <div className="settings-header">
              <h3>WIDGET SETTINGS</h3>
              <button className="x-btn" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            
            <div className="settings-tabs">
              <button className={activeTab === 'magazine' ? 'on' : ''} onClick={() => setActiveTab('magazine')}>Magazine</button>
              <button className={activeTab === 'timer' ? 'on' : ''} onClick={() => setActiveTab('timer')}>Timer</button>
            </div>

            <div className="settings-body">
              {activeTab === 'magazine' ? (
                <div className="field-group">
                  <label>MEMBER / 表示メンバー</label>
                  <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
                    {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  
                  <label>COSPLAYER / レイヤーさん</label>
                  <select value={config.cosplayer} onChange={e => setConfig({...config, cosplayer: e.target.value})}>
                    {cosplayers.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <label>INTERVAL / 更新間隔 ({config.interval} 秒)</label>
                  <input type="range" min="10" max="600" step="10" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} />

                  <label>SIZE / ウィンドウサイズ</label>
                  <div className="size-grid">
                    {Object.keys(SIZES).map(s => <button key={s} className={config.size === s ? 'on' : ''} onClick={() => setConfig({...config, size: s})}>{s}</button>)}
                  </div>
                </div>
              ) : (
                <div className="field-group">
                  <label>FOCUS TIME / 集中時間 ({pomoConfig.focusTime} 分)</label>
                  <input type="range" min="5" max="60" step="5" value={pomoConfig.focusTime} onChange={e => setPomoConfig({...pomoConfig, focusTime: parseInt(e.target.value)})} />
                  <label>BREAK TIME / 休憩時間 ({pomoConfig.breakTime} 分)</label>
                  <input type="range" min="1" max="15" step="1" value={pomoConfig.breakTime} onChange={e => setPomoConfig({...pomoConfig, breakTime: parseInt(e.target.value)})} />
                </div>
              )}
            </div>
            <button className="final-apply-btn" onClick={() => { localStorage.setItem('vspo-widget-config', JSON.stringify(config)); setIsSettingsOpen(false); }}>SAVE & CLOSE</button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Montserrat', sans-serif; color: white; }
        .main-wrapper { width: 100vw; height: 100vh; position: relative; background: #000; border-radius: 12px; overflow: hidden; }
        
        .bg-photo-layer { position: absolute; inset: 0; z-index: 1; }
        .main-photo { width: 100%; height: 100%; object-fit: cover; }
        .drag-handle-base { position: absolute; inset: 0; z-index: 5; -webkit-app-region: drag; }

        .ui-overlay { position: absolute; inset: 0; z-index: 10; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
        .title-text { font-family: 'Playfair Display', serif; font-style: italic; font-size: 42px; margin: 0; text-align: center; line-height: 1; text-shadow: 0 4px 15px rgba(0,0,0,0.8); }

        .pomo-trigger-btn, .gear-trigger-btn, .settings-view { pointer-events: auto !important; -webkit-app-region: no-drag !important; }

        .pomo-trigger-btn { background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 10px 15px; border-radius: 30px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.3s; }
        .pomo-trigger-btn:hover { background: #00f2ff; color: #000; border-color: #00f2ff; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #00f2ff; box-shadow: 0 0 10px #00f2ff; }
        .status-focus .dot { background: #ff00ff; box-shadow: 0 0 10px #ff00ff; }
        
        .gear-trigger-btn { position: absolute; top: 15px; right: 15px; z-index: 100; width: 40px; height: 40px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }

        /* 設定画面のスクロール対応 */
        .settings-view { position: absolute; inset: 0; background: #0a0a0c; z-index: 1000; transform: translateY(100%); transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1); }
        .settings-view.is-active { transform: translateY(0); }
        .settings-content { padding: 30px; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; }
        
        .settings-body { 
          flex: 1; 
          overflow-y: auto; /* スクロール有効化 */
          padding-right: 5px;
          margin: 10px 0;
          -webkit-app-region: no-drag !important; /* スクロールを邪魔させない */
        }
        /* スクロールバーのデザイン */
        .settings-body::-webkit-scrollbar { width: 4px; }
        .settings-body::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }

        .settings-header { display: flex; justify-content: space-between; align-items: center; }
        .settings-tabs { display: flex; gap: 15px; border-bottom: 1px solid #222; }
        .settings-tabs button { background: none; border: none; color: #555; font-weight: 800; padding: 10px 0; cursor: pointer; }
        .settings-tabs button.on { color: #00f2ff; border-bottom: 2px solid #00f2ff; }

        .field-group label { display: block; font-size: 9px; color: #666; font-weight: 800; margin: 15px 0 5px 0; }
        select, input[type="range"] { width: 100%; padding: 12px; background: #1a1a1c; border: 1px solid #333; color: white; border-radius: 6px; }
        
        .size-grid { display: flex; gap: 5px; }
        .size-grid button { flex: 1; padding: 10px; background: #1a1a1c; border: 1px solid #333; color: white; font-size: 11px; cursor: pointer; border-radius: 6px; }
        .size-grid button.on { border-color: #00f2ff; color: #00f2ff; }

        .final-apply-btn { background: #00f2ff; color: #000; border: none; padding: 15px; border-radius: 8px; font-weight: 800; cursor: pointer; margin-top: 10px; }
        .x-btn { background: none; border: none; color: #555; font-size: 32px; cursor: pointer; }
      `}</style>
    </div>
  );
}
