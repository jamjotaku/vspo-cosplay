import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';

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

export default function Widget() {
  const [allData, setAllData] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState({ member: '全員', cosplayer: '全員', interval: 60 });

  useEffect(() => {
    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, {
        download: true, header: true, skipEmptyLines: true,
        complete: (res) => {
          const formatted = res.data
            .filter(d => d.image || d['画像'] || d.link || d['URL'])
            .map(d => ({
              member: (d.member || d['名前'] || "").trim(),
              image: (d.image || d['画像'] || d.link || d['URL'] || "").replace('name=medium', 'name=large'),
              cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
            }));
          setAllData(formatted);
        }
      });
    };
    loadData();
  }, []);

  const pickPhoto = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => 
      (config.member === '全員' || p.member === config.member) &&
      (config.cosplayer === '全員' || p.cosplayer === config.cosplayer)
    );
    if (pool.length === 0) pool = allData;
    setCurrentPhoto(pool[Math.floor(Math.random() * pool.length)]);
  }, [allData, config]);

  useEffect(() => {
    pickPhoto();
    const timer = setInterval(pickPhoto, config.interval * 1000);
    return () => clearInterval(timer);
  }, [pickPhoto, config.interval]);

  const handleSizeChange = (sizeKey) => {
    const { w, h } = SIZES[sizeKey];
    if (window.electronAPI) {
      window.electronAPI.resizeWindow(w, h);
    }
  };

  const cosplayers = useMemo(() => 
    ['全員', ...new Set(allData.map(d => d.cosplayer))].sort(), [allData]
  );

  return (
    <div className="widget-root">
      <Head><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" /></Head>
      <div className="main-wrapper">
        {currentPhoto && (
          <div className="photo-layer">
            <img src={currentPhoto.image} alt="" className="main-img" />
            <div className="overlay-text">
              <div className="mem-tag">{currentPhoto.member}</div>
              <div className="cos-name">{currentPhoto.cosplayer}</div>
            </div>
          </div>
        )}
        {!isSettingsOpen && <div className="drag-handle" />}
        <button className="gear-btn" onClick={() => setIsSettingsOpen(true)}><i className="fas fa-cog"></i></button>
        <div className={`config-modal ${isSettingsOpen ? 'is-open' : ''}`}>
          <div className="modal-inner">
            <div className="modal-header"><span>WIDGET CONFIG</span><button className="close-x" onClick={() => setIsSettingsOpen(false)}>&times;</button></div>
            <div className="modal-content">
              <div className="input-box"><label>MEMBER</label>
                <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
                  {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="input-box"><label>WIDGET SIZE</label>
                <div className="size-buttons">
                  {Object.keys(SIZES).map(s => (<button key={s} onClick={() => handleSizeChange(s)} className="size-btn">{s}</button>))}
                </div>
              </div>
              <div className="input-box"><label>INTERVAL ({config.interval}s)</label>
                <input type="range" min="10" max="600" step="10" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} />
              </div>
              <button className="save-btn" onClick={() => { pickPhoto(); setIsSettingsOpen(false); }}>SAVE & UPDATE</button>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Inter', sans-serif; user-select: none; }
        .widget-root { width: 100vw; height: 100vh; position: relative; }
        .main-wrapper { width: 100%; height: 100%; border-radius: 12px; overflow: hidden; background: #000; position: relative; }
        .photo-layer { width: 100%; height: 100%; pointer-events: none; }
        .main-img { width: 100%; height: 100%; object-fit: cover; }
        .overlay-text { position: absolute; bottom: 0; width: 100%; padding: 20px 12px 12px; background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: white; }
        .drag-handle { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 50; -webkit-app-region: drag; }
        .gear-btn { position: absolute; top: 12px; left: 12px; z-index: 100; background: rgba(0,0,0,0.6); color: #00f2ff; border: 1px solid #00f2ff; border-radius: 50%; width: 34px; height: 34px; cursor: pointer; -webkit-app-region: no-drag !important; pointer-events: auto !important; }
        .config-modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10,10,12,0.98); color: white; z-index: 200; transform: translateY(100%); transition: 0.3s cubic-bezier(0.2, 1, 0.3, 1); padding: 20px; box-sizing: border-box; -webkit-app-region: no-drag !important; pointer-events: auto !important; }
        .config-modal.is-open { transform: translateY(0); }
        .modal-inner { display: flex; flex-direction: column; height: 100%; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; color: #00f2ff; font-weight: bold; }
        .close-x { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
        .modal-content { display: flex; flex-direction: column; gap: 15px; }
        .input-box { display: flex; flex-direction: column; gap: 6px; }
        .input-box label { font-size: 10px; color: #888; }
        select { background: #1a1a1c; color: white; border: 1px solid #333; padding: 10px; border-radius: 8px; outline: none; }
        .size-buttons { display: flex; gap: 5px; }
        .size-btn { flex: 1; background: #222; color: #fff; border: 1px solid #444; padding: 6px; border-radius: 4px; cursor: pointer; font-size: 11px; -webkit-app-region: no-drag; }
        .size-btn:hover { border-color: #00f2ff; color: #00f2ff; }
        .save-btn { background: linear-gradient(45deg, #00f2ff, #ff00ff); border: none; color: white; padding: 14px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 10px; }
      `}</style>
    </div>
  );
}