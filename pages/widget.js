import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

const MEMBER_ORDER = [
  '全員', '集合', '花芽すみれ', '花芽なずな', '小雀とと', '一ノ瀬うるは', '胡桃のあ',
  '兎咲ミミ', '空澄セナ', '橘ひなの', '英リサ', '如月れん', '神成きゅぴ', '八雲べに', 
  '藍沢エマ', '紫宮るな', '猫汰つな', '白波らむね', '小森めと', '夢野あかり', 
  '夜乃くろむ', '紡木こかげ', '千燈ゆうひ', '蝶屋はなび', '甘結もか', '銀城サイネ', '龍巻ちせ'
];

export default function Widget() {
  const [allData, setAllData] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState({ member: '全員', cosplayer: '全員', interval: 60 });

  // 1. CSVデータの取得
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

  // 2. 写真のランダム選出
  const pickPhoto = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => 
      (config.member === '全員' || p.member === config.member) &&
      (config.cosplayer === '全員' || p.cosplayer === config.cosplayer)
    );
    if (pool.length === 0) pool = allData;
    setCurrentPhoto(pool[Math.floor(Math.random() * pool.length)]);
  }, [allData, config]);

  // 3. タイマー設定
  useEffect(() => {
    pickPhoto();
    const timer = setInterval(pickPhoto, config.interval * 1000);
    return () => clearInterval(timer);
  }, [pickPhoto, config.interval]);

  const cosplayers = useMemo(() => 
    ['全員', ...new Set(allData.map(d => d.cosplayer))].sort(), [allData]
  );

  return (
    <div className="widget-container">
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </Head>

      <div className="main-frame">
        {/* 設定ボタン：no-dragを付与してクリックを優先 */}
        <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>
          <i className="fas fa-cog"></i>
        </button>

        {currentPhoto && (
          <>
            <img src={currentPhoto.image} alt="" className="photo" />
            <div className="caption">
              <div className="tag">{currentPhoto.member}</div>
              <div className="name">{currentPhoto.cosplayer}</div>
            </div>
          </>
        )}
      </div>

      {/* 設定パネル */}
      <div className={`modal ${isSettingsOpen ? 'show' : ''}`}>
        <div className="modal-header">
          <span>WIDGET CONFIG</span>
          <button onClick={() => setIsSettingsOpen(false)}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>MEMBER</label>
            <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
              {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>COSPLAYER</label>
            <select value={config.cosplayer} onChange={e => setConfig({...config, cosplayer: e.target.value})}>
              {cosplayers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>INTERVAL: {config.interval}s</label>
            <input type="range" min="10" max="600" step="10" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} />
          </div>
          <button className="save-btn" onClick={() => { pickPhoto(); setIsSettingsOpen(false); }}>SAVE & UPDATE</button>
        </div>
      </div>

      <style jsx global>{`
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Inter', sans-serif; }
        .widget-container { width: 100vw; height: 100vh; position: relative; }
        .main-frame { 
          width: 100%; height: 100%; position: relative; border-radius: 12px; overflow: hidden; 
          background: #111; border: 1px solid rgba(255,255,255,0.1); -webkit-app-region: drag;
        }
        .photo { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        .settings-btn { 
          position: absolute; top: 10px; left: 10px; z-index: 1000; 
          background: rgba(0,0,0,0.5); color: #00f2ff; border: 1px solid #00f2ff;
          border-radius: 50%; width: 32px; height: 32px; cursor: pointer;
          -webkit-app-region: no-drag; pointer-events: auto !important;
        }
        .caption { 
          position: absolute; bottom: 0; width: 100%; padding: 20px 10px 10px;
          background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: white; pointer-events: none;
        }
        .tag { font-size: 10px; color: #ff00ff; font-weight: bold; }
        .name { font-size: 14px; font-weight: bold; }
        
        .modal { 
          position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
          background: rgba(10,10,12,0.95); transition: 0.3s; transform: translateY(100%);
          z-index: 2000; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column;
          -webkit-app-region: no-drag; pointer-events: auto;
        }
        .modal.show { transform: translateY(0); }
        .modal-header { display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 15px; font-size: 12px; color: #00f2ff; font-weight: bold; }
        .modal-header button { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        .modal-body { display: flex; flex-direction: column; gap: 15px; }
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field label { font-size: 10px; color: #888; }
        select { background: #222; color: white; border: 1px solid #444; padding: 8px; border-radius: 4px; }
        input[type="range"] { accent-color: #00f2ff; }
        .save-btn { background: linear-gradient(45deg, #00f2ff, #ff00ff); border: none; color: white; padding: 10px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 10px; }
      `}</style>
    </div>
  );
}
