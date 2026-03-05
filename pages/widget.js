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
  const [nextPhoto, setNextPhoto] = useState(null);
  const [isChanging, setIsChanging] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('magazine'); 
  const [config, setConfig] = useState({ member: '全員', cosplayer: '全員', interval: 60, size: '中' });
  const [pomoConfig, setPomoConfig] = useState({ focusTime: 25, breakTime: 5 });
  const [now, setNow] = useState(new Date());
  const [pomoStatus, setPomoStatus] = useState('idle'); 
  const [timeLeft, setTimeLeft] = useState(0);

  // 1. データ読み込み
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
            link: (d.link || d['URL'] || "").trim(),
            cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
          }));
          setAllData(formatted);
        }
      });
    };
    loadData();
    return () => clearInterval(clockTimer);
  }, []);

  // 2. 画像切り替えロジック（アニメーション対応）
  const pickPhoto = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => (config.member === '全員' || p.member === config.member) && (config.cosplayer === '全員' || p.cosplayer === config.cosplayer));
    if (pool.length === 0) pool = allData;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    
    if (!currentPhoto) {
      setCurrentPhoto(selected);
    } else {
      setNextPhoto(selected);
      setIsChanging(true);
      setTimeout(() => {
        setCurrentPhoto(selected);
        setIsChanging(false);
        setNextPhoto(null);
      }, 1200); // クロスフェード時間
    }
  }, [allData, config.member, config.cosplayer, currentPhoto]);

  useEffect(() => {
    pickPhoto();
    const intervalTime = pomoStatus === 'break' ? 10 : config.interval;
    const timer = setInterval(pickPhoto, intervalTime * 1000);
    return () => clearInterval(timer);
  }, [pickPhoto, config.interval, pomoStatus]);

  // 3. タイマー・ウィンドウ制御
  useEffect(() => {
    if (pomoStatus === 'idle') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPomoStatus(pomoStatus === 'focus' ? 'break' : 'focus');
          return (pomoStatus === 'focus' ? pomoConfig.breakTime : pomoConfig.focusTime) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomoStatus, pomoConfig]);

  useEffect(() => {
    if (window.electronAPI) {
      const { w, h } = SIZES[config.size || '中'];
      window.electronAPI.resizeWindow(w, h);
    }
  }, [config.size]);

  const togglePomo = (e) => {
    e.stopPropagation();
    if (pomoStatus === 'idle') { 
      setPomoStatus('focus'); 
      setTimeLeft(pomoConfig.focusTime * 60); 
    } else { 
      if (confirm("タイマーをリセットしますか？")) {
        setPomoStatus('idle'); 
        setTimeLeft(0); 
      }
    }
  };

  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const cosplayers = useMemo(() => ['全員', ...new Set(allData.map(d => d.cosplayer))].sort(), [allData]);

  return (
    <div className={`widget-root status-${pomoStatus}`}>
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@300;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="main-wrapper">
        <div className="magazine-view">
          {/* 画像レイヤー */}
          <div className={`photo-layer ${isChanging ? 'is-leaving' : ''}`}>
            {currentPhoto && <img src={currentPhoto.image} alt="" className="photo" />}
          </div>
          {nextPhoto && (
            <div className={`photo-layer is-entering`}>
              <img src={nextPhoto.image} alt="" className="photo" />
            </div>
          )}

          <div className="grain-overlay"></div>

          {/* 誌面デザインオーバーレイ */}
          <div className="editorial-ui">
            <div className="top-meta">
              <div className="brand">VSPO! ARCHIVE / SPECIAL ISSUE</div>
              <div className="time-code">{pomoStatus === 'idle' ? timeStr : `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`}</div>
            </div>

            <div className="masthead">
              <h1 className="main-title">{currentPhoto?.member || 'VSPO!'}</h1>
              <div className="sub-line">{dateStr} / NEW ARCHIVE RELEASE</div>
            </div>

            <div className="bottom-meta">
              <div className="featured">
                <span className="label">FEATURED MODEL</span>
                <div className="name">{currentPhoto?.cosplayer || 'Unknown'}</div>
              </div>
              <div className="session-status" onClick={togglePomo}>
                <div className="status-indicator"></div>
                <span>{pomoStatus === 'idle' ? 'START SESSION' : pomoStatus.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* ポモドーロプログレス */}
          {pomoStatus !== 'idle' && (
            <div className="pomo-progress-container">
              <div className="pomo-progress-bar" style={{ width: `${(timeLeft / (pomoStatus === 'focus' ? pomoConfig.focusTime*60 : pomoConfig.breakTime*60)) * 100}%` }}></div>
            </div>
          )}
        </div>

        <div className="drag-handle"></div>
        <button className="settings-trigger" onClick={() => setIsSettingsOpen(true)}><i className="fas fa-ellipsis-v"></i></button>

        {/* 設定モーダル */}
        <div className={`settings-panel ${isSettingsOpen ? 'is-open' : ''}`}>
          <div className="panel-inner">
            <div className="panel-header">
              <h3>SETTINGS</h3>
              <button onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            <div className="panel-tabs">
              <button className={activeTab === 'magazine' ? 'active' : ''} onClick={() => setActiveTab('magazine')}>Magazine</button>
              <button className={activeTab === 'pomo' ? 'active' : ''} onClick={() => setActiveTab('pomo')}>Timer</button>
            </div>
            <div className="panel-body">
              {activeTab === 'magazine' ? (
                <>
                  <div className="field"><label>Member</label>
                    <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
                      {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Size</label>
                    <div className="btn-group">
                      {Object.keys(SIZES).map(s => <button key={s} className={config.size === s ? 'active' : ''} onClick={() => setConfig({...config, size: s})}>{s}</button>)}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="field"><label>Focus (min)</label>
                    <input type="range" min="5" max="60" value={pomoConfig.focusTime} onChange={e => setPomoConfig({...pomoConfig, focusTime: parseInt(e.target.value)})} />
                  </div>
                </>
              )}
            </div>
            <button className="apply-btn" onClick={() => { localStorage.setItem('vspo-widget-config', JSON.stringify(config)); setIsSettingsOpen(false); }}>APPLY CHANGES</button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Montserrat', sans-serif; color: white; user-select: none; }
        .main-wrapper { width: 100vw; height: 100vh; position: relative; background: #000; border-radius: 12px; overflow: hidden; }
        
        .magazine-view { width: 100%; height: 100%; position: relative; }
        .photo-layer { position: absolute; inset: 0; transition: transform 1.2s cubic-bezier(0.19, 1, 0.22, 1), opacity 1.2s; }
        .photo { width: 100%; height: 100%; object-fit: cover; }
        .is-leaving { transform: scale(1.1); opacity: 0; z-index: 1; }
        .is-entering { transform: scale(0.95); opacity: 1; z-index: 2; animation: enter 1.2s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        @keyframes enter { to { transform: scale(1); } }

        .grain-overlay { position: absolute; inset: 0; background-image: url("https://grainy-gradients.vercel.app/noise.svg"); opacity: 0.15; pointer-events: none; z-index: 5; mix-blend-mode: overlay; }

        .editorial-ui { position: absolute; inset: 0; z-index: 10; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 40%, transparent 60%, rgba(0,0,0,0.6)); }
        
        .top-meta { display: flex; justify-content: space-between; align-items: flex-start; }
        .brand { font-size: 8px; font-weight: 800; letter-spacing: 0.2em; border-left: 2px solid #00f2ff; padding-left: 8px; }
        .time-code { font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 16px; color: #00f2ff; }

        .masthead { text-align: center; }
        .main-title { font-family: 'Playfair Display', serif; font-style: italic; font-size: 48px; margin: 0; line-height: 0.9; text-shadow: 0 10px 20px rgba(0,0,0,0.5); }
        .sub-line { font-size: 8px; font-weight: 300; letter-spacing: 0.3em; margin-top: 10px; opacity: 0.7; }

        .bottom-meta { display: flex; justify-content: space-between; align-items: flex-end; }
        .featured .label { font-size: 7px; font-weight: 800; opacity: 0.5; display: block; }
        .featured .name { font-size: 18px; font-weight: 800; }
        .session-status { cursor: pointer; display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 20px; font-size: 9px; font-weight: 800; -webkit-app-region: no-drag; transition: 0.3s; }
        .session-status:hover { background: #00f2ff; color: #000; }
        .status-indicator { width: 6px; height: 6px; border-radius: 50%; background: #00f2ff; box-shadow: 0 0 10px #00f2ff; }
        .status-focus .status-indicator { background: #ff00ff; box-shadow: 0 0 10px #ff00ff; }

        .drag-handle { position: absolute; inset: 0; z-index: 5; -webkit-app-region: drag; }
        .settings-trigger { position: absolute; top: 20px; right: 20px; z-index: 100; background: none; border: none; color: #fff; cursor: pointer; -webkit-app-region: no-drag; opacity: 0.3; transition: 0.3s; }
        .settings-trigger:hover { opacity: 1; }

        .pomo-progress-container { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: rgba(255,255,255,0.1); z-index: 20; }
        .pomo-progress-bar { height: 100%; background: #00f2ff; transition: width 1s linear; }
        .status-focus .pomo-progress-bar { background: #ff00ff; }

        /* 設定パネル */
        .settings-panel { position: absolute; inset: 0; background: rgba(10,10,12,0.95); z-index: 200; transform: translateX(100%); transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1); }
        .settings-panel.is-open { transform: translateX(0); }
        .panel-inner { padding: 30px; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }
        .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .panel-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
        .panel-tabs button { background: none; border: none; color: #555; font-weight: 800; cursor: pointer; border-bottom: 2px solid transparent; }
        .panel-tabs button.active { color: #00f2ff; border-bottom-color: #00f2ff; }
        .field { margin-bottom: 20px; }
        .field label { display: block; font-size: 10px; font-weight: 800; margin-bottom: 8px; color: #555; }
        select, .btn-group button { width: 100%; background: #1a1a1c; border: 1px solid #333; color: white; padding: 10px; border-radius: 6px; font-family: inherit; }
        .btn-group { display: flex; gap: 5px; }
        .btn-group button.active { border-color: #00f2ff; color: #00f2ff; }
        .apply-btn { margin-top: auto; background: #00f2ff; color: #000; border: none; padding: 15px; border-radius: 8px; font-weight: 800; cursor: pointer; }
      `}</style>
    </div>
  );
}
