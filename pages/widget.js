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
  const [config, setConfig] = useState({ member: '', cosplayer: '', interval: 60 });

  // データ取得
  useEffect(() => {
    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, {
        download: true, header: true,
        complete: (res) => {
          const formatted = res.data.filter(d => d.image || d['画像']).map(d => ({
            member: (d.member || d['名前'] || "").trim(),
            image: (d.image || d['画像'] || "").replace('name=medium', 'name=large'),
            cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
          }));
          setAllData(formatted);
        }
      });
    };
    loadData();
  }, []);

  // ランダム選出
  const pickPhoto = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => 
      (!config.member || config.member === '全員' || p.member === config.member) &&
      (!config.cosplayer || config.cosplayer === '全員' || p.cosplayer === config.cosplayer)
    );
    if (pool.length === 0) pool = allData;
    setCurrentPhoto(pool[Math.floor(Math.random() * pool.length)]);
  }, [allData, config]);

  // タイマー
  useEffect(() => {
    pickPhoto();
    const timer = setInterval(pickPhoto, config.interval * 1000);
    return () => clearInterval(timer);
  }, [pickPhoto, config.interval]);

  // レイヤー名リスト
  const cosplayers = useMemo(() => 
    ['全員', ...new Set(allData.map(d => d.cosplayer))].sort(), [allData]
  );

  return (
    <div className="container">
      <Head><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" /></Head>
      
      {currentPhoto && (
        <div className="photo-frame" onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
          <img src={currentPhoto.image} alt="" className="img" />
          <div className="info">
            <div className="mem">{currentPhoto.member}</div>
            <div className="cos">{currentPhoto.cosplayer}</div>
          </div>
        </div>
      )}

      <div className={`panel ${isSettingsOpen ? 'open' : ''}`}>
        <div className="header">
          <span>⚙️ Settings</span>
          <button onClick={() => setIsSettingsOpen(false)}>&times;</button>
        </div>
        <div className="item">
          <label>Member</label>
          <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
            {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="item">
          <label>Cosplayer</label>
          <select value={config.cosplayer} onChange={e => setConfig({...config, cosplayer: e.target.value})}>
            {cosplayers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="item">
          <label>Interval ({config.interval}s)</label>
          <input type="range" min="10" max="600" step="10" value={config.interval} onChange={e => setConfig({...config, interval: e.target.value})} />
        </div>
        <button className="btn" onClick={() => { pickPhoto(); setIsSettingsOpen(false); }}>Update Now</button>
      </div>

      <style jsx global>{`
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Segoe UI', sans-serif; }
        .container { width: 100vw; height: 100vh; position: relative; }
        .photo-frame { width: 100%; height: 100%; position: relative; border-radius: 15px; overflow: hidden; -webkit-app-region: drag; cursor: grab; }
        .img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        .info { position: absolute; bottom: 0; width: 100%; padding: 15px; background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: white; }
        .mem { font-size: 10px; color: #3ea6ff; font-weight: bold; }
        .cos { font-size: 14px; font-weight: bold; }
        .panel { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(20,20,20,0.95); color: white; padding: 20px; transition: 0.3s; transform: translateY(100%); -webkit-app-region: no-drag; z-index: 100; box-sizing: border-box; display: flex; flex-direction: column; gap: 15px; border-radius: 15px; }
        .panel.open { transform: translateY(0); }
        .header { display: flex; justify-content: space-between; align-items: center; }
        .item { display: flex; flex-direction: column; gap: 5px; }
        .item label { font-size: 11px; color: #888; }
        select { background: #333; color: white; border: none; padding: 8px; border-radius: 5px; }
        .btn { background: #3ea6ff; border: none; color: white; padding: 10px; border-radius: 5px; font-weight: bold; cursor: pointer; margin-top: auto; }
      `}</style>
    </div>
  );
}
