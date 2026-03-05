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

  // ポモドーロタイマーの核心ロジック
  useEffect(() => {
    if (pomoStatus === 'idle') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          const nextStatus = pomoStatus === 'focus' ? 'break' : 'focus';
          const nextTime = (nextStatus === 'focus' ? pomoConfig.focusTime : pomoConfig.breakTime) * 60;
          setPomoStatus(nextStatus);
          return nextTime;
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
  const cosplayers = useMemo(() => ['全員', ...new Set(allData.map(d => d.cosplayer))].sort(), [allData]);

  return (
    <div className={`widget-root status-${pomoStatus}`}>
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@300;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="main-wrapper">
        {/* 背景・画像レイヤー */}
        <div className="magazine-view">
          {currentPhoto && <img src={currentPhoto.image} alt="" className="main-photo" />}
          <div className="grain-overlay"></div>
          
          {/* UIオーバーレイ - pointer-events:noneでクリックを透過させ、ボタンだけautoにする */}
          <div className="editorial-ui">
            <div className="top-meta">
              <div className="brand">VSPO! ARCHIVE / SPECIAL ISSUE</div>
              <div className="time-display">{timeStr}</div>
            </div>

            <div className="masthead">
              <h1 className="member-name">{currentPhoto?.member || 'VSPO!'}</h1>
              <div className="issue-info">{dateStr} / NEW RELEASE</div>
            </div>

            <div className="bottom-meta">
              <div className="featured">
                <span className="label">FEATURED MODEL</span>
                <div className="name">{currentPhoto?.cosplayer || 'Unknown'}</div>
              </div>
              {/* ポモドーロスイッチ */}
              <div className="pomo-toggle" onClick={togglePomo}>
                <div className="pomo-indicator"></div>
                <div className="pomo-text">
                  {pomoStatus === 'idle' ? 'START SESSION' : `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`}
                </div>
              </div>
            </div>
          </div>

          {pomoStatus !== 'idle' && (
            <div className="pomo-progress-track">
              <div className="pomo-progress-fill" style={{ width: `${(timeLeft / (pomoStatus === 'focus' ? pomoConfig.focusTime*60 : pomoConfig.breakTime*60)) * 100}%` }}></div>
            </div>
          )}
        </div>

        {/* 最前面の操作レイヤー */}
        <div className="interaction-layer">
          <div className="drag-area"></div>
          <button className="settings-btn" onClick={() => setIsSettingsOpen(true)} title="Settings">
            <i className="fas fa-ellipsis-v"></i>
          </button>
        </div>

        {/* 設定パネル */}
        <div className={`settings-panel ${isSettingsOpen ? 'is-open' : ''}`}>
          <div className="panel-inner">
            <div className="panel-header">
              <h3>WIDGET SETTINGS</h3>
              <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            <div className="panel-tabs">
              <button className={activeTab === 'magazine' ? 'active' : ''} onClick={() => setActiveTab('magazine')}>Magazine</button>
              <button className={activeTab === 'pomo' ? 'active' : ''} onClick={() => setActiveTab('pomo')}>Timer</button>
            </div>
            <div className="panel-body">
              {activeTab === 'magazine' ? (
                <div className="settings-group">
                  <label>MEMBER</label>
                  <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
                    {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <label>SIZE</label>
                  <div className="size-selector">
                    {Object.keys(SIZES).map(s => <button key={s} className={config.size === s ? 'active' : ''} onClick={() => setConfig({...config, size: s})}>{s}</button>)}
                  </div>
                </div>
              ) : (
                <div className="settings-group">
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
        
        /* 描画レイヤー */
        .magazine-view { width: 100%; height: 100%; position: relative; }
        .main-photo { width: 100%; height: 100%; object-fit: cover; }
        .grain-overlay { position: absolute; inset: 0; background-image: url("https://grainy-gradients.vercel.app/noise.svg"); opacity: 0.1; pointer-events: none; z-index: 5; }

        /* デザインオーバーレイ（クリック不可にして、中のボタンだけ可にする） */
        .editorial-ui { position: absolute; inset: 0; z-index: 10; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; background: linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 30%, transparent 70%, rgba(0,0,0,0.6)); }
        
        .top-meta { display: flex; justify-content: space-between; align-items: center; }
        .brand { font-size: 8px; font-weight: 800; letter-spacing: 0.2em; border-left: 2px solid #00f2ff; padding-left: 8px; }
        .time-display { font-size: 14px; font-weight: 800; opacity: 0.8; }

        .masthead { text-align: center; }
        .member-name { font-family: 'Playfair Display', serif; font-style: italic; font-size: 42px; margin: 0; line-height: 1; text-shadow: 0 4px 15px rgba(0,0,0,0.8); }
        .issue-info { font-size: 8px; letter-spacing: 0.3em; margin-top: 8px; opacity: 0.6; }

        .bottom-meta { display: flex; justify-content: space-between; align-items: flex-end; }
        .featured .label { font-size: 7px; font-weight: 800; opacity: 0.5; }
        .featured .name { font-size: 18px; font-weight: 800; }

        /* ポモドーロスイッチ（ここをクリック可能に） */
        .pomo-toggle { pointer-events: auto; cursor: pointer; display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.6); padding: 10px 15px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); transition: 0.3s; }
        .pomo-toggle:hover { border-color: #00f2ff; background: #00f2ff; color: #000; }
        .pomo-indicator { width: 8px; height: 8px; border-radius: 50%; background: #00f2ff; box-shadow: 0 0 10px #00f2ff; }
        .status-focus .pomo-indicator { background: #ff00ff; box-shadow: 0 0 10px #ff00ff; }
        .pomo-text { font-size: 10px; font-weight: 800; }

        /* プログレスバー */
        .pomo-progress-track { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: rgba(255,255,255,0.1); z-index: 15; }
        .pomo-progress-fill { height: 100%; background: #00f2ff; transition: width 1s linear; }
        .status-focus .pomo-progress-fill { background: #ff00ff; }

        /* 操作レイヤー（最前面） */
        .interaction-layer { position: absolute; inset: 0; z-index: 100; pointer-events: none; }
        .drag-area { position: absolute; inset: 0; -webkit-app-region: drag; z-index: 1; }
        .settings-btn { position: absolute; top: 15px; right: 15px; width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; cursor: pointer; pointer-events: auto; -webkit-app-region: no-drag; z-index: 10; transition: 0.3s; }
        .settings-btn:hover { background: #fff; color: #000; }

        /* 設定パネル */
        .settings-panel { position: absolute; inset: 0; background: #0a0a0c; z-index: 200; transform: translateX(100%); transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1); pointer-events: auto; }
        .settings-panel.is-open { transform: translateX(0); }
        .panel-inner { padding: 30px; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; }
        .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .close-btn { background: none; border: none; color: #555; font-size: 28px; cursor: pointer; }
        .panel-tabs { display: flex; gap: 15px; margin-bottom: 25px; border-bottom: 1px solid #222; }
        .panel-tabs button { background: none; border: none; color: #555; font-weight: 800; cursor: pointer; padding-bottom: 10px; }
        .panel-tabs button.active { color: #00f2ff; border-bottom: 2px solid #00f2ff; }
        .settings-group label { display: block; font-size: 9px; color: #666; font-weight: 800; margin-bottom: 10px; }
        select, input[type="range"] { width: 100%; margin-bottom: 20px; }
        .size-selector { display: flex; gap: 5px; margin-bottom: 20px; }
        .size-selector button { flex: 1; background: #1a1a1c; border: 1px solid #333; color: white; padding: 10px; border-radius: 6px; font-size: 11px; cursor: pointer; }
        .size-selector button.active { border-color: #00f2ff; color: #00f2ff; }
        .apply-btn { margin-top: auto; background: #00f2ff; color: #000; border: none; padding: 15px; border-radius: 8px; font-weight: 800; cursor: pointer; }
      `}</style>
    </div>
  );
}
