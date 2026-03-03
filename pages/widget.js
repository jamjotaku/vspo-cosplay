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
  const [isLoaded, setIsLoaded] = useState(false);

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
          setIsLoaded(true);
        }
      });
    };
    loadData();
  }, []);

  // 2. 画像をランダムに選ぶ
  const pickPhoto = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => 
      (!config.member || config.member === '全員' || p.member === config.member) &&
      (!config.cosplayer || config.cosplayer === '全員' || p.cosplayer === config.cosplayer)
    );
    if (pool.length === 0) pool = allData;
    const random = pool[Math.floor(Math.random() * pool.length)];
    setCurrentPhoto(random);
  }, [allData, config]);

  // 3. 切り替えタイマー
  useEffect(() => {
    pickPhoto();
    const timer = setInterval(pickPhoto, config.interval * 1000);
    return () => clearInterval(timer);
  }, [pickPhoto, config.interval]);

  // レイヤー名リストの生成
  const cosplayers = useMemo(() => 
    ['全員', ...new Set(allData.map(d => d.cosplayer))].sort(), [allData]
  );

  return (
    <div className="widget-root">
      <Head>
        <title>Vspo! Desktop Widget</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </Head>
      
      {/* メインフレーム */}
      <div className="photo-frame">
        {/* 設定を開くための浮遊ボタン（ドラッグ無効エリア） */}
        <button className="settings-trigger" onClick={() => setIsSettingsOpen(true)}>
          <i className="fas fa-cog"></i>
        </button>

        {currentPhoto ? (
          <>
            <img src={currentPhoto.image} alt="" className="main-image" />
            <div className="overlay-info">
              <div className="member-name">{currentPhoto.member}</div>
              <div className="cos-name">{currentPhoto.cosplayer}</div>
            </div>
          </>
        ) : (
          <div className="loading">Loading...</div>
        )}
      </div>

      {/* 設定パネル（スライド式） */}
      <div className={`settings-panel ${isSettingsOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <span><i className="fas fa-sliders-h"></i> WIDGET SETTINGS</span>
          <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>&times;</button>
        </div>

        <div className="scroll-area">
          <div className="setting-group">
            <label>Member Filter</label>
            <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
              {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="setting-group">
            <label>Cosplayer Filter</label>
            <select value={config.cosplayer} onChange={e => setConfig({...config, cosplayer: e.target.value})}>
              {cosplayers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="setting-group">
            <label>Interval: {config.interval}s</label>
            <input 
              type="range" min="10" max="600" step="10" 
              value={config.interval} 
              onChange={e => setConfig({...config, interval: e.target.value})} 
            />
          </div>
        </div>

        <button className="apply-btn" onClick={() => { pickPhoto(); setIsSettingsOpen(false); }}>
          APPLY & UPDATE
        </button>
      </div>

      <style jsx global>{`
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Inter', 'Meiryo', sans-serif; }
        
        /* ドラッグ可能エリアの設定 */
        .photo-frame {
          width: 100vw; height: 100vh;
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: #111;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          -webkit-app-region: drag; /* ウィンドウを掴んで動かせる */
          border: 2px solid rgba(255, 255, 255, 0.1);
          box-sizing: border-box;
        }

        .main-image {
          width: 100%; height: 100%;
          object-fit: cover;
          pointer-events: none; /* ドラッグを邪魔しない */
        }

        /* 設定ボタン（ドラッグ不可） */
        .settings-trigger {
          position: absolute; top: 12px; left: 12px; z-index: 100;
          background: rgba(0,0,0,0.6); color: #00f2ff;
          border: 1px solid #00f2ff; border-radius: 50%;
          width: 32px; height: 32px; cursor: pointer;
          -webkit-app-region: no-drag;
          transition: 0.3s;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 10px rgba(0, 242, 255, 0.3);
        }
        .settings-trigger:hover { background: #00f2ff; color: #000; }

        .overlay-info {
          position: absolute; bottom: 0; width: 100%;
          padding: 30px 15px 15px;
          background: linear-gradient(transparent, rgba(0,0,0,0.9));
          color: white; pointer-events: none;
        }
        .member-name { font-size: 11px; color: #ff00ff; font-weight: bold; letter-spacing: 1px; }
        .cos-name { font-size: 15px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }

        /* 設定パネル */
        .settings-panel {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(10, 10, 12, 0.98);
          color: white; padding: 20px; box-sizing: border-box;
          transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          transform: translateY(100%);
          z-index: 200;
          display: flex; flex-direction: column;
          -webkit-app-region: no-drag;
        }
        .settings-panel.open { transform: translateY(0); }

        .panel-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px;
        }
        .panel-header span { font-size: 12px; font-weight: bold; color: #00f2ff; }
        .close-btn { background: none; border: none; color: #888; font-size: 24px; cursor: pointer; }

        .scroll-area { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        
        .setting-group { display: flex; flex-direction: column; gap: 8px; }
        .setting-group label { font-size: 11px; color: #aaa; text-transform: uppercase; }
        
        select {
          background: #1a1a1c; color: white; border: 1px solid #333;
          padding: 10px; border-radius: 8px; font-size: 14px; outline: none;
        }
        select:focus { border-color: #00f2ff; }

        input[type="range"] { accent-color: #00f2ff; cursor: pointer; }

        .apply-btn {
          background: linear-gradient(45deg, #00f2ff, #ff00ff);
          border: none; color: white; padding: 12px;
          border-radius: 8px; font-weight: bold; cursor: pointer;
          margin-top: 20px; letter-spacing: 1px;
        }
        .apply-btn:active { transform: scale(0.98); }

        .loading {
          width: 100%; height: 100%; display: flex; align-items: center;
          justify-content: center; color: #555; font-size: 12px;
        }
      `}</style>
    </div>
  );
}
