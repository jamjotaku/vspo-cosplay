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
  const [isLandscape, setIsLandscape] = useState(false);
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

  useEffect(() => {
    if (pomoStatus === 'idle') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (pomoStatus === 'focus') { logPomoSession(); setPomoStatus('break'); return pomoConfig.breakTime * 60; }
          else { setPomoStatus('focus'); return pomoConfig.focusTime * 60; }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomoStatus, pomoConfig, currentPhoto]);

  const logPomoSession = () => {
    if (!currentPhoto) return;
    const history = JSON.parse(localStorage.getItem('vspo-pomo-history') || '[]');
    history.push({ date: new Date().toISOString(), member: currentPhoto.member, cosplayer: currentPhoto.cosplayer, duration: pomoConfig.focusTime });
    localStorage.setItem('vspo-pomo-history', JSON.stringify(history.slice(-100)));
  };

  const togglePomo = (e) => {
    e.stopPropagation();
    if (pomoStatus === 'idle') { setPomoStatus('focus'); setTimeLeft(pomoConfig.focusTime * 60); }
    else { if (window.confirm("タイマーを終了しますか？")) { setPomoStatus('idle'); setTimeLeft(0); } }
  };

  useEffect(() => {
    if (window.electronAPI) {
      const { w, h } = SIZES[config.size || '中'];
      window.electronAPI.resizeWindow(w, h);
    }
  }, [config.size]);

  const handleImageLoad = (e) => { const { naturalWidth, naturalHeight } = e.target; setIsLandscape(naturalWidth > naturalHeight); };
  const pickPhoto = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => (config.member === '全員' || p.member === config.member) && (config.cosplayer === '全員' || p.cosplayer === config.cosplayer));
    if (pool.length === 0) pool = allData;
    setCurrentPhoto(pool[Math.floor(Math.random() * pool.length)]);
  }, [allData, config.member, config.cosplayer]);

  useEffect(() => {
    pickPhoto();
    const intervalTime = pomoStatus === 'break' ? 5 : config.interval;
    const timer = setInterval(pickPhoto, intervalTime * 1000);
    return () => clearInterval(timer);
  }, [pickPhoto, config.interval, pomoStatus]);

  const handleSave = () => {
    localStorage.setItem('vspo-widget-config', JSON.stringify(config));
    localStorage.setItem('vspo-widget-pomo', JSON.stringify(pomoConfig));
    pickPhoto();
    setIsSettingsOpen(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const cosplayers = useMemo(() => ['全員', ...new Set(allData.map(d => d.cosplayer))].sort(), [allData]);

  return (
    <div className={`widget-root ${isLandscape ? 'mode-landscape' : 'mode-portrait'} status-${pomoStatus}`}>
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@300;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="main-wrapper">
        {currentPhoto && (
          <div className={`magazine-layer ${isSettingsOpen ? 'is-blurred' : ''}`}>
            {isLandscape && (
              <div className="landscape-bg-wrap">
                <img src={currentPhoto.image} className="bg-blur-full" alt="" />
                <div className="bg-dimmer"></div>
              </div>
            )}
            <div className="image-container">
              <img src={currentPhoto.image} alt="" className="main-img" onLoad={handleImageLoad} />
            </div>
            
            <div className="editorial-overlay">
              <div className="overlay-top">
                <div className="brand-label">
                  {pomoStatus === 'idle' ? 'VSPO! ARCHIVE / SPECIAL ISSUE' : pomoStatus === 'focus' ? 'EDITORIAL SESSION / FOCUS' : 'ISSUE RELEASED / BREAK'}
                </div>
                <div className="issue-stamp">
                  <div className="vol-no">{pomoStatus === 'idle' ? `VOL. ${timeStr}` : formatTime(timeLeft)}</div>
                  <div className="issue-date">{dateStr} ISSUE</div>
                </div>
              </div>

              <div className="masthead">
                <h1 className="member-name">{currentPhoto.member}</h1>
              </div>

              <div className="overlay-bottom">
                <div className="cover-footer">
                  <div className="featured-label">FEATURED ARTIST</div>
                  <div className="cosplayer-name"><span className="model-tag">MODEL / </span>{currentPhoto.cosplayer}</div>
                </div>
                <div className="barcode-area">
                  <div className="barcode-lines"></div>
                  <div className="barcode-text">{pomoStatus === 'idle' ? 'START SESSION' : 'STOP SESSION'}</div>
                </div>
              </div>
            </div>

            {pomoStatus !== 'idle' && (
              <div className="pomo-progress">
                <div className="pomo-bar" style={{ width: `${(timeLeft / (pomoStatus === 'focus' ? pomoConfig.focusTime*60 : pomoConfig.breakTime*60)) * 100}%` }}></div>
              </div>
            )}
          </div>
        )}

        {!isSettingsOpen && (
          <>
            <div className="drag-handle" />
            <div className="pomo-click-trigger" onClick={togglePomo} />
          </>
        )}
        
        <button className="gear-btn" onClick={() => setIsSettingsOpen(true)}><i className="fas fa-cog"></i></button>

        <div className={`config-modal ${isSettingsOpen ? 'is-open' : ''}`}>
          <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="modal-inner">
            <div className="modal-header">
              <div className="tab-buttons">
                <button className={`tab-btn ${activeTab === 'magazine' ? 'active' : ''}`} onClick={() => setActiveTab('magazine')}>誌面設定</button>
                <button className={`tab-btn ${activeTab === 'timer' ? 'active' : ''}`} onClick={() => setActiveTab('timer')}>タイマー設定</button>
              </div>
              <button className="close-x" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            <div className="modal-content">
              {activeTab === 'magazine' ? (
                <div className="tab-pane">
                  <div className="input-box"><label>表示メンバー</label>
                    <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
                      {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="input-box"><label>コスプレイヤー</label>
                    <select value={config.cosplayer} onChange={e => setConfig({...config, cosplayer: e.target.value})}>
                      {cosplayers.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="input-box"><label>サイズ</label>
                    <div className="size-buttons">
                      {Object.keys(SIZES).map(s => <button key={s} onClick={() => setConfig({...config, size: s})} className={`size-btn ${config.size === s ? 'active' : ''}`}>{s}</button>)}
                    </div>
                  </div>
                  <div className="input-box"><label>更新間隔 ({config.interval}秒)</label>
                    <input type="range" min="10" max="600" step="10" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} />
                  </div>
                </div>
              ) : (
                <div className="tab-pane">
                  <div className="input-box"><label>集中時間 ({pomoConfig.focusTime}分)</label>
                    <input type="range" min="5" max="60" step="5" value={pomoConfig.focusTime} onChange={e => setPomoConfig({...pomoConfig, focusTime: parseInt(e.target.value)})} />
                  </div>
                  <div className="input-box"><label>休憩時間 ({pomoConfig.breakTime}分)</label>
                    <input type="range" min="1" max="15" step="1" value={pomoConfig.breakTime} onChange={e => setPomoConfig({...pomoConfig, breakTime: parseInt(e.target.value)})} />
                  </div>
                </div>
              )}
              <button className="save-btn" onClick={handleSave}>設定を保存して閉じる</button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Montserrat', sans-serif; user-select: none; }
        .widget-root { width: 100vw; height: 100vh; position: relative; }
        .main-wrapper { width: 100%; height: 100%; border-radius: 16px; overflow: hidden; background: #000; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .magazine-layer { width: 100%; height: 100%; position: relative; display: flex; align-items: center; justify-content: center; transition: filter 0.4s; }
        .magazine-layer.is-blurred { filter: blur(20px) brightness(0.5); }
        .image-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 10; }
        .status-focus .image-container { filter: brightness(0.65) saturate(0.8); }
        .status-break .image-container { filter: brightness(1.1) saturate(1.2); }
        .mode-portrait .main-img { width: 100%; height: 100%; object-fit: cover; }
        .mode-landscape .main-img { width: 100%; height: auto; box-shadow: 0 0 60px rgba(0,0,0,0.9); z-index: 15; position: relative; }
        .landscape-bg-wrap { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; overflow: hidden; }
        .bg-blur-full { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) blur(20px) brightness(0.35); transform: scale(1.1); }
        .editorial-overlay {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 60;
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 24px; box-sizing: border-box; pointer-events: none;
          background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.6) 100%);
        }
        .brand-label { font-size: 8px; letter-spacing: 0.25em; font-weight: 800; border-left: 3px solid #00f2ff; padding-left: 8px; color: #fff; }
        .vol-no { font-size: 18px; font-weight: 800; color: #00f2ff; text-shadow: 0 0 12px rgba(0,242,255,0.6); }
        .member-name { font-family: 'Playfair Display', serif; font-style: italic; font-weight: 900; color: rgba(255,255,255,0.95); text-transform: uppercase; line-height: 0.85; text-shadow: 0 4px 15px rgba(0,0,0,0.9); text-align: center; }
        .mode-portrait .member-name { font-size: 42px; transform: translateY(35px); }
        .mode-landscape .member-name { font-size: 32px; transform: translateY(-30px); }
        .cosplayer-name { font-size: 20px; font-weight: 800; text-transform: uppercase; color: #fff; }
        .pomo-click-trigger { position: absolute; bottom: 20px; right: 20px; width: 80px; height: 50px; z-index: 999; cursor: pointer; -webkit-app-region: no-drag; }
        .drag-handle { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 50; -webkit-app-region: drag; }
        .gear-btn { position: absolute; bottom: 12px; left: 12px; z-index: 100; background: rgba(0,0,0,0.5); color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 50%; width: 32px; height: 32px; cursor: pointer; -webkit-app-region: no-drag; display: flex; align-items: center; justify-content: center; }
        .config-modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10,10,12,0.98); color: white; z-index: 200; transform: translateY(100%); transition: 0.3s cubic-bezier(0.2, 1, 0.3, 1); pointer-events: auto !important; }
        .config-modal.is-open { transform: translateY(0); }
        .modal-inner { display: flex; flex-direction: column; height: 100%; padding: 24px; box-sizing: border-box; }
        .tab-btn { background: none; border: none; color: #666; font-size: 14px; font-weight: 800; cursor: pointer; padding: 8px 0; border-bottom: 2px solid transparent; }
        .tab-btn.active { color: #00f2ff; border-bottom-color: #00f2ff; }
        .save-btn { background: linear-gradient(45deg, #00f2ff, #ff00ff); border: none; color: white; padding: 16px; border-radius: 12px; font-weight: 800; cursor: pointer; margin-top: auto; }
        .pomo-progress { position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: rgba(255,255,255,0.1); z-index: 100; }
        .pomo-bar { height: 100%; background: #00f2ff; transition: width 1s linear; }
        select { background: #1a1a1c; color: white; border: 1px solid #333; padding: 12px; border-radius: 8px; font-family: 'Montserrat', sans-serif; }
      `}</style>
    </div>
  );
}