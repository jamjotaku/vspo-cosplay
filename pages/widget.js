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
  const [config, setConfig] = useState({ member: '全員', cosplayer: '全員', interval: 60, size: '中' });
  const [now, setNow] = useState(new Date());

  // 1. 起動時の初期化
  useEffect(() => {
    // 時計の開始
    const clockTimer = setInterval(() => setNow(new Date()), 1000);

    // 設定の読み込み
    const saved = localStorage.getItem('vspo-widget-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig(parsed);
      // ウィンドウサイズ復元 (Electron連携)
      setTimeout(() => {
        if (window.electronAPI) {
          const { w, h } = SIZES[parsed.size || '中'];
          window.electronAPI.resizeWindow(w, h);
        }
      }, 1000);
    }

    // CSVのパース
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

  // 2. 写真ピックアップロジック (機能維持)
  const pickPhoto = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => 
      (config.member === '全員' || p.member === config.member) &&
      (config.cosplayer === '全員' || p.cosplayer === config.cosplayer)
    );
    if (pool.length === 0) pool = allData;
    setCurrentPhoto(pool[Math.floor(Math.random() * pool.length)]);
  }, [allData, config.member, config.cosplayer]);

  useEffect(() => {
    pickPhoto();
    const timer = setInterval(pickPhoto, config.interval * 1000);
    return () => clearInterval(timer);
  }, [pickPhoto, config.interval]);

  // 3. サイズ変更と保存
  const handleSizeChange = (sizeKey) => {
    setConfig(prev => ({ ...prev, size: sizeKey }));
    if (window.electronAPI) {
      const { w, h } = SIZES[sizeKey];
      window.electronAPI.resizeWindow(w, h);
    }
  };

  const handleSave = () => {
    localStorage.setItem('vspo-widget-config', JSON.stringify(config));
    pickPhoto();
    setIsSettingsOpen(false);
  };

  const cosplayers = useMemo(() => 
    ['全員', ...new Set(allData.map(d => d.cosplayer))].sort(), [allData]
  );

  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="widget-root">
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,900&family=Montserrat:wght@300;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="main-wrapper">
        {currentPhoto && (
          <div className="magazine-layer">
            <img src={currentPhoto.image} alt="" className="bg-photo" />
            
            {/* 雑誌風オーバーレイ：機能に関係なく「被せる」だけなのでロジックを邪魔しません */}
            <div className="editorial-overlay">
              <div className="issue-stamp">
                <div className="vol-no">VOL. {timeStr}</div>
                <div className="issue-date">{dateStr} ISSUE</div>
              </div>

              <div className="masthead">
                <h1 className="member-name">{currentPhoto.member}</h1>
              </div>

              <div className="cover-footer">
                <div className="featured-label">SPECIAL ARCHIVE</div>
                <div className="cosplayer-name">
                  <span className="model-tag">MODEL / </span>
                  {currentPhoto.cosplayer}
                </div>
                <div className="barcode-area">
                  <div className="barcode-lines"></div>
                  <div className="barcode-text">4 549323 000108</div>
                </div>
              </div>
            </div>

            {currentPhoto.link && (
              <button className="link-btn" onClick={() => window.open(currentPhoto.link, '_blank')}>
                <i className="fas fa-external-link-alt"></i>
              </button>
            )}
          </div>
        )}

        <div className="drag-handle" />
        <button className="gear-btn" onClick={() => setIsSettingsOpen(true)}><i className="fas fa-cog"></i></button>

        {/* 設定モーダル：省略せずにすべて記述 */}
        <div className={`config-modal ${isSettingsOpen ? 'is-open' : ''}`}>
          <div className="modal-inner">
            <div className="modal-header">
              <span>WIDGET CONFIG</span>
              <button className="close-x" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            <div className="modal-content">
              <div className="input-box">
                <label>MEMBER</label>
                <select value={config.member} onChange={e => setConfig({...config, member: e.target.value})}>
                  {MEMBER_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="input-box">
                <label>COSPLAYER</label>
                <select value={config.cosplayer} onChange={e => setConfig({...config, cosplayer: e.target.value})}>
                  {cosplayers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="input-box">
                <label>WIDGET SIZE</label>
                <div className="size-buttons">
                  {Object.keys(SIZES).map(s => (
                    <button key={s} onClick={() => handleSizeChange(s)} className={`size-btn ${config.size === s ? 'active' : ''}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="input-box">
                <label>INTERVAL ({config.interval}s)</label>
                <input type="range" min="10" max="600" step="10" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} />
              </div>
              <button className="save-btn" onClick={handleSave}>SAVE & UPDATE</button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* 前回の雑誌風スタイルを完全に適用 */
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Montserrat', sans-serif; user-select: none; }
        .widget-root { width: 100vw; height: 100vh; }
        .main-wrapper { width: 100%; height: 100%; border-radius: 16px; overflow: hidden; background: #000; position: relative; }
        .bg-photo { width: 100%; height: 100%; object-fit: cover; }
        
        .editorial-overlay {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          display: flex; flex-direction: column; justify-content: space-between;
          padding: 20px; box-sizing: border-box;
          background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 100%);
          pointer-events: none; /* 下のドラッグハンドルを邪魔しない */
        }

        .issue-stamp { align-self: flex-end; text-align: right; color: #fff; }
        .vol-no { font-size: 18px; font-weight: 800; color: #00f2ff; }
        .issue-date { font-size: 10px; border-top: 1px solid #fff; margin-top: 4px; padding-top: 2px; }

        .masthead { position: absolute; top: 15%; left: 50%; transform: translateX(-50%); width: 90%; text-align: center; }
        .member-name { font-family: 'Playfair Display', serif; font-size: 42px; font-style: italic; font-weight: 900; color: rgba(255,255,255,0.9); text-transform: uppercase; line-height: 0.9; }

        .cover-footer { color: #fff; }
        .featured-label { font-size: 10px; letter-spacing: 0.4em; }
        .cosplayer-name { font-size: 24px; font-weight: 800; text-transform: uppercase; }
        .model-tag { font-size: 12px; font-weight: 300; opacity: 0.7; }

        .barcode-area { margin-top: 15px; opacity: 0.6; }
        .barcode-lines { height: 15px; width: 60px; background: linear-gradient(90deg, #fff 1px, transparent 1px, transparent 3px, #fff 3px, #fff 5px, transparent 5px); background-size: 5px 100%; }
        .barcode-text { font-size: 7px; margin-top: 2px; }

        .drag-handle { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 50; -webkit-app-region: drag; }
        .gear-btn, .link-btn { position: absolute; z-index: 100; background: rgba(0,0,0,0.5); color: #fff; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; -webkit-app-region: no-drag; display: flex; align-items: center; justify-content: center; }
        .gear-btn { bottom: 12px; left: 12px; }
        .link-btn { top: 12px; left: 12px; }

        /* 設定画面（以前のものを完全復元） */
        .config-modal { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(10,10,12,0.98); color: white; z-index: 200; transform: translateY(100%); transition: 0.3s cubic-bezier(0.2, 1, 0.3, 1); -webkit-app-region: no-drag; }
        .config-modal.is-open { transform: translateY(0); }
        .modal-inner { display: flex; flex-direction: column; height: 100%; padding: 15px; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 10px; color: #00f2ff; font-weight: bold; }
        .close-x { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
        .modal-content { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding: 10px 0; }
        .input-box { display: flex; flex-direction: column; gap: 4px; }
        .input-box label { font-size: 10px; color: #888; }
        select { background: #1a1a1c; color: white; border: 1px solid #333; padding: 8px; border-radius: 6px; }
        .size-buttons { display: flex; gap: 5px; }
        .size-btn { flex: 1; background: #222; color: #fff; border: 1px solid #444; padding: 6px; border-radius: 4px; font-size: 11px; }
        .size-btn.active { background: #00f2ff; color: #000; font-weight: bold; }
        .save-btn { background: linear-gradient(45deg, #00f2ff, #ff00ff); border: none; color: white; padding: 12px; border-radius: 8px; font-weight: bold; margin-top: 10px; cursor: pointer; }
      `}</style>
    </div>
  );
}