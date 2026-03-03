import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

const memberOrder = ["花芽すみれ", "花芽なずな", "小雀とと", "一ノ瀬うるは", "胡桃のあ", "兎咲ミミ", "空澄セナ", "橘ひなの", "英リサ", "如月れん", "神成きゅぴ", "八雲べに", "藍沢エマ", "紫宮るな", "猫汰つな", "白波らむね", "小森めと", "夢野あかり", "夜乃くろむ", "紡木こかげ", "千燈ゆうひ", "蝶屋はなび", "甘結もか", "銀城サイネ", "龍巻ちせ"];

export default function Widget() {
  const [allData, setAllData] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // --- ウィジェットの設定状態 ---
  const [config, setConfig] = useState({
    member: "",      // 空なら「全員」
    cosplayer: "",   // 空なら「全員」
    interval: 60,    // 更新間隔（秒）
  });

  // 1. CSVデータの取得
  useEffect(() => {
    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, {
        download: true, header: true, complete: (res) => {
          const formatted = res.data.filter(d => d.image || d.url).map(d => ({
            member: (d.member || d['名前'] || "").trim(),
            image: d.image || d['url'],
            cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
          }));
          setAllData(formatted);
        }
      });
    };
    loadData();
  }, []);

  // 2. 画像をランダムに選ぶ関数
  const pickRandomPhoto = useCallback(() => {
    if (allData.length === 0) return;

    // 設定に合わせてフィルタリング
    let pool = allData.filter(p => {
      const mMatch = !config.member || p.member === config.member;
      const cMatch = !config.cosplayer || p.cosplayer === config.cosplayer;
      return mMatch && cMatch;
    });

    // 該当する写真がない場合は全体から選ぶ（エラー回避）
    if (pool.length === 0) pool = allData;

    const random = pool[Math.floor(Math.random() * pool.length)];
    setCurrentPhoto(random);
  }, [allData, config]);

  // 3. タイマー設定（画像切り替え）
  useEffect(() => {
    pickRandomPhoto();
    const timer = setInterval(pickRandomPhoto, config.interval * 1000);
    return () => clearInterval(timer);
  }, [pickRandomPhoto, config.interval]);

  // 重複を除いたレイヤーさんリストの作成
  const cosplayers = useMemo(() => {
    const names = allData.map(d => d.cosplayer);
    return Array.from(new Set(names)).sort();
  }, [allData]);

  return (
    <div className="widget-container">
      <Head>
        <title>Vspo Widget</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </Head>

      {/* 画像表示エリア */}
      {currentPhoto && (
        <div className="photo-frame" onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
          <img src={currentPhoto.image.replace('name=medium', 'name=large')} alt="" className="main-img" />
          <div className="photo-info">
            <span className="member-tag">{currentPhoto.member}</span>
            <span className="cos-name">{currentPhoto.cosplayer}</span>
          </div>
        </div>
      )}

      {/* 設定パネル */}
      <div className={`settings-panel ${isSettingsOpen ? 'open' : ''}`}>
        <div className="settings-header">
          <h3><i className="fas fa-cog"></i> Widget Settings</h3>
          <button onClick={() => setIsSettingsOpen(false)}>&times;</button>
        </div>
        
        <div className="setting-item">
          <label>メンバー指定</label>
          <select value={config.member} onChange={(e) => setConfig({...config, member: e.target.value})}>
            <option value="">全員 (ALL)</option>
            {memberOrder.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="setting-item">
          <label>レイヤー指定</label>
          <select value={config.cosplayer} onChange={(e) => setConfig({...config, cosplayer: e.target.value})}>
            <option value="">全員 (ALL)</option>
            {cosplayers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="setting-item">
          <label>更新間隔: {config.interval}秒</label>
          <input type="range" min="10" max="600" step="10" value={config.interval} onChange={(e) => setConfig({...config, interval: parseInt(e.target.value)})} />
        </div>

        <button className="apply-btn" onClick={() => { pickRandomPhoto(); setIsSettingsOpen(false); }}>
          今すぐ更新
        </button>
      </div>

      <style jsx global>{`
        body { margin: 0; padding: 0; background: transparent; overflow: hidden; font-family: sans-serif; }
        .widget-container { width: 100vw; height: 100vh; position: relative; cursor: pointer; }
        
        .photo-frame { width: 100%; height: 100%; position: relative; }
        .main-img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }

        .photo-info {
          position: absolute; bottom: 0; width: 100%; padding: 20px 10px 10px;
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
          color: white; border-radius: 0 0 12px 12px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .member-tag { font-size: 0.7rem; color: #3ea6ff; font-weight: bold; }
        .cos-name { font-size: 0.85rem; font-weight: bold; }

        .settings-panel {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(15, 15, 15, 0.95); padding: 15px;
          box-sizing: border-box; display: flex; flex-direction: column; gap: 15px;
          transition: 0.3s transform; transform: translateY(100%);
          z-index: 10; color: white; border-radius: 12px;
        }
        .settings-panel.open { transform: translateY(0); }
        .settings-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 5px; }
        .settings-header h3 { font-size: 0.9rem; margin: 0; }
        
        .setting-item { display: flex; flex-direction: column; gap: 5px; }
        .setting-item label { font-size: 0.75rem; color: #aaa; }
        .setting-item select { background: #333; color: white; border: none; padding: 8px; border-radius: 5px; }
        .apply-btn { background: #3ea6ff; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; margin-top: auto; }
      `}</style>
    </div>
  );
}

// 共通で使う useMemo のインポートなどを React から取得
import { useMemo } from 'react';
