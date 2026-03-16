import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Download() {
  const GITHUB_EXE_URL = "https://github.com/jamjotaku/vspo-cosplay/releases/download/v1.0.0/VspoCosplayWidget_Setup_1.0.0.exe";

  return (
    <div className="p-root">
      <Head>
        <title>DEPLOYMENT_MODULE // VSPO! WIDGET</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&family=Montserrat:wght@100;400;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      <div className="p-grain"></div>
      
      <main className="p-main-layer">
        <div className="p-container">
          
          {/* ヘッダー：プラットフォーム固定 */}
          <div className="p-glass-panel head-area">
            <div className="p-head-flex">
              <div>
                <span className="p-tag">SYSTEM_DEPLOYMENT_v1.0.0</span>
                <h1>WIDGET_INSTALLER</h1>
              </div>
              <div className="p-platform-badge">
                <i className="fab fa-windows"></i> WINDOWS_ONLY
              </div>
            </div>
          </div>

          {/* メイングリッド */}
          <div className="p-content-grid">
            {/* 左：ビジュアルボックス */}
            <div className="p-glass-panel visual-box">
              <div className="p-icon-wrapper">
                <img src="/icon.png" alt="Widget Icon" className="p-icon-main" />
                <div className="p-icon-glow"></div>
              </div>
              <div className="p-status-row">
                <span className="status-dot"></span>
                <span className="status-text">SYSTEM_READY_FOR_DEPLOY</span>
              </div>
            </div>

            {/* 右：スペック＆ダウンロード */}
            <div className="p-glass-panel info-box">
              <span className="p-tag">SPECIFICATION</span>
              <p className="p-desc">
                ぶいすぽコスプレイヤーさんのアーカイブをデスクトップに常駐させる専用ウィジェット。
                ポータルとのデータ同期機能を搭載し、常に最新の「推し」を表示します。
              </p>
              
              <ul className="spec-list">
                <li><i className="fas fa-microchip"></i> <span>ARCHITECTURE:</span> <strong>Windows 10 / 11 (x64)</strong></li>
                <li><i className="fas fa-file-archive"></i> <span>FILE_SIZE:</span> <strong>64.8 MB</strong></li>
                <li><i className="fas fa-shield-alt"></i> <span>ENCRYPTION:</span> <strong>SECURE_LINK_ENABLED</strong></li>
              </ul>

              {/* ★ボタン位置の修正★ */}
              <div className="p-btn-container">
                <a href={GITHUB_EXE_URL} className="p-download-btn">
                  <div className="btn-content">
                    <i className="fas fa-download"></i>
                    <span>START_PRIMARY_DOWNLOAD</span>
                  </div>
                  <div className="btn-sub">VspoCosplayWidget_Setup_1.0.0.exe</div>
                </a>
              </div>
            </div>
          </div>

          {/* セキュリティガイド */}
          <div className="p-glass-panel guide-box">
            <span className="p-tag">SECURITY_AUTHENTICATION_GUIDE</span>
            <div className="guide-intro">
              <i className="fas fa-info-circle"></i> 
              個人開発アプリのため、初回実行時にWindowsの保護機能が作動する場合があります。
            </div>
            <div className="guide-steps">
              <div className="step">
                <span className="step-num">01</span>
                <p>ダウンロードした <strong>.exe</strong> を実行</p>
              </div>
              <div className="step">
                <span className="step-num">02</span>
                <p>警告画面の <strong>「詳細情報」</strong> をクリック</p>
              </div>
              <div className="step">
                <span className="step-num">03</span>
                <p>出現した <strong>「実行」</strong> ボタンで配備開始</p>
              </div>
            </div>
          </div>

          <div className="p-footer-actions">
            <Link href="/">
              <button className="p-back-btn">
                <i className="fas fa-arrow-left"></i> RETURN_TO_PORTAL
              </button>
            </Link>
            <div className="p-legal-note">© 2026 VSPO!_COMMAND // ALL_RIGHTS_RESERVED.</div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        :root { --v-accent: #00f2ff; --v-magenta: #ff00ff; }
        body { margin:0; background:#000; color:#fff; font-family:'Montserrat', sans-serif; overflow-x:hidden; }
        
        .p-grain { position:fixed; inset:0; background:url('https://grainy-gradients.vercel.app/noise.svg'); opacity:0.05; pointer-events:none; z-index:900; }
        .p-main-layer { position:relative; min-height:100vh; padding:80px 20px; box-sizing:border-box; z-index:10; background: radial-gradient(circle at 50% -20%, #0a0a15, #000); }
        .p-container { max-width:900px; margin:0 auto; }

        .p-glass-panel { background:rgba(255,255,255,0.02); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,0.08); padding:40px; margin-bottom:20px; border-radius: 4px; }
        .p-tag { font-family:'JetBrains Mono'; font-size:10px; font-weight:800; color:var(--v-accent); letter-spacing:0.3em; display:block; margin-bottom:15px; }
        
        .p-head-flex { display: flex; justify-content: space-between; align-items: flex-end; }
        h1 { font-size:42px; font-weight:900; margin:0; letter-spacing:0.1em; }
        .p-platform-badge { font-family: 'JetBrains Mono'; font-size: 11px; font-weight: 800; color: #fff; background: rgba(255,255,255,0.05); padding: 8px 16px; border-radius: 4px; display: flex; align-items: center; gap: 10px; border: 1px solid #222; }
        .p-platform-badge i { color: var(--v-accent); }

        /* グリッド整列の強化 */
        .p-content-grid { display:grid; grid-template-columns: 1fr 1.5fr; gap:20px; align-items: stretch; }
        
        .visual-box { display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .p-icon-wrapper { position: relative; margin-bottom: 30px; }
        .p-icon-main { width:140px; height:140px; position: relative; z-index: 2; }
        .p-icon-glow { position: absolute; inset: 10%; background: var(--v-accent); filter: blur(40px); opacity: 0.3; z-index: 1; }
        
        .p-status-row { display:flex; align-items:center; gap:12px; background: rgba(0,0,0,0.4); padding: 8px 16px; border-radius: 20px; border: 1px solid #111; }
        .status-dot { width:8px; height:8px; background:var(--v-accent); border-radius:50%; box-shadow: 0 0 15px var(--v-accent); animation: pulse 2s infinite; }
        .status-text { font-family:'JetBrains Mono'; font-size:10px; color:var(--v-accent); font-weight: 800; letter-spacing: 0.1em; }

        .p-desc { font-size:15px; line-height:1.8; color:#777; margin-bottom:30px; }
        .spec-list { list-style:none; padding:0; margin-bottom:40px; }
        .spec-list li { font-family:'JetBrains Mono'; font-size:11px; color:#444; margin-bottom:12px; display:flex; align-items: center; gap:12px; }
        .spec-list li span { width: 100px; color: #555; }
        .spec-list li strong { color: #aaa; }
        .spec-list i { color:var(--v-accent); font-size: 14px; }

        /* ★ボタンコンテナとスタイルの修正★ */
        .p-btn-container { width: 100%; display: flex; justify-content: center; }
        .p-download-btn { 
          display:block; 
          width:100%; 
          padding:25px; 
          background:#fff; 
          color:#000; 
          text-align:center; 
          text-decoration:none; 
          font-family:'JetBrains Mono'; 
          transition:0.3s; 
          border-radius: 4px;
          box-sizing: border-box; /* パディングによるズレを防止 */
        }
        .p-download-btn:hover { background:var(--v-accent); box-shadow:0 0 40px rgba(0,242,255,0.5); transform:translateY(-3px); }
        
        /* タイポ修正: align-items: center */
        .btn-content { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 15px; 
          font-weight: 900; 
          font-size: 16px; 
          margin-bottom: 5px; 
        }
        .btn-sub { font-size: 9px; opacity: 0.5; font-weight: 400; text-align: center; }

        .guide-intro { font-size: 12px; color: #666; margin-bottom: 25px; display: flex; align-items: center; gap: 10px; }
        .guide-intro i { color: var(--v-magenta); }
        .guide-steps { display:grid; grid-template-columns: repeat(3, 1fr); gap:30px; margin-top:20px; border-top: 1px solid #111; padding-top: 30px; }
        .step { text-align:center; position: relative; }
        .step-num { font-family:'JetBrains Mono'; font-size:32px; color:rgba(255,255,255,0.05); display:block; margin-bottom:10px; font-weight: 900; }
        .step p { font-size:12px; color:#555; margin:0; line-height: 1.6; }

        .p-footer-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 40px; padding: 0 10px; }
        .p-back-btn { background:none; border:1px solid #1a1a1c; color:#444; padding:12px 24px; font-family:'JetBrains Mono'; font-size:11px; font-weight: 800; cursor:pointer; transition:0.3s; border-radius: 4px; }
        .p-back-btn:hover { border-color:#fff; color:#fff; background: rgba(255,255,255,0.05); }
        .p-legal-note { font-family: 'JetBrains Mono'; font-size: 9px; color: #222; letter-spacing: 0.1em; }

        @keyframes pulse { 0% { opacity:0.3; transform: scale(0.9); } 50% { opacity:1; transform: scale(1.1); } 100% { opacity:0.3; transform: scale(0.9); } }
        
        @media (max-width: 768px) {
          .p-content-grid { grid-template-columns: 1fr; }
          .guide-steps { grid-template-columns: 1fr; gap: 40px; }
          .p-head-flex { flex-direction: column; align-items: flex-start; gap: 20px; }
        }
      `}</style>
    </div>
  );
}
