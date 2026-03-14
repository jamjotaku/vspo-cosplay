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
          {/* ヘッダーエリア */}
          <div className="p-glass-panel head-area">
            <span className="p-tag">SYSTEM_DEPLOYMENT_v1.0.0</span>
            <h1>WIDGET_INSTALLER</h1>
          </div>

          {/* メインコンテンツ */}
          <div className="p-content-grid">
            <div className="p-glass-panel visual-box">
               {/* 苦労して作ったあのアイコンを表示 */}
              <img src="/icon.ico" alt="Widget Icon" className="p-icon-main" />
              <div className="p-status-row">
                <span className="status-dot"></span>
                <span className="status-text">READY_FOR_DEPLOY</span>
              </div>
            </div>

            <div className="p-glass-panel info-box">
              <span className="p-tag">SPECIFICATION</span>
              <p className="p-desc">
                ぶいすぽっ！のアーカイブをデスクトップに常駐させる専用ウィジェット。
                ポータルとのデータ同期機能を搭載し、常に最新の「推し」を表示します。
              </p>
              
              <ul className="spec-list">
                <li><i className="fas fa-check"></i> OS: Windows 10 / 11 (x64)</li>
                <li><i className="fas fa-check"></i> SIZE: 約 65MB</li>
                <li><i className="fas fa-check"></i> TYPE: NSIS_Installer</li>
              </ul>

              <a href={GITHUB_EXE_URL} className="p-download-btn">
                <i className="fas fa-download"></i> START_DOWNLOAD
              </a>
            </div>
          </div>

          {/* セキュリティ・ガイド（SmartScreen対策） */}
          <div className="p-glass-panel guide-box">
            <span className="p-tag">SECURITY_AUTHENTICATION_GUIDE</span>
            <div className="guide-steps">
              <div className="step">
                <span className="step-num">01</span>
                <p>ダウンロードした .exe を実行</p>
              </div>
              <div className="step">
                <span className="step-num">02</span>
                <p>「詳細情報」をクリック</p>
              </div>
              <div className="step">
                <span className="step-num">03</span>
                <p>「実行」を選択して配備開始</p>
              </div>
            </div>
          </div>

          <Link href="/">
            <button className="p-back-btn">
              <i className="fas fa-arrow-left"></i> RETURN_TO_PORTAL
            </button>
          </Link>
        </div>
      </main>

      <style jsx global>{`
        :root { --v-accent: #00f2ff; }
        body { margin:0; background:#000; color:#fff; font-family:'Montserrat', sans-serif; overflow-x:hidden; }
        
        .p-grain { position:fixed; inset:0; background:url('https://grainy-gradients.vercel.app/noise.svg'); opacity:0.05; pointer-events:none; z-index:900; }
        .p-main-layer { position:relative; min-height:100vh; padding:60px 20px; box-sizing:border-box; z-index:10; background: radial-gradient(circle at 50% -20%, #112, #000); }
        .p-container { max-width:900px; margin:0 auto; }

        .p-glass-panel { background:rgba(255,255,255,0.02); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); padding:30px; margin-bottom:20px; }
        .p-tag { font-family:'JetBrains Mono'; font-size:10px; font-weight:800; color:var(--v-accent); letter-spacing:0.2em; display:block; margin-bottom:10px; }
        
        h1 { font-size:40px; font-weight:100; margin:0; letter-spacing:0.1em; }

        .p-content-grid { display:grid; grid-template-columns: 1fr 1.5fr; gap:20px; }
        
        .visual-box { display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .p-icon-main { width:120px; height:120px; filter: drop-shadow(0 0 20px var(--v-accent)); margin-bottom:20px; }
        
        .p-status-row { display:flex; align-items:center; gap:10px; }
        .status-dot { width:6px; height:6px; background:var(--v-accent); border-radius:50%; box-shadow: 0 0 10px var(--v-accent); animation: pulse 2s infinite; }
        .status-text { font-family:'JetBrains Mono'; font-size:10px; color:var(--v-accent); }

        .p-desc { font-size:14px; line-height:1.8; color:#999; margin-bottom:20px; }
        .spec-list { list-style:none; padding:0; margin-bottom:30px; }
        .spec-list li { font-family:'JetBrains Mono'; font-size:11px; color:#666; margin-bottom:8px; display:flex; items-center; gap:10px; }
        .spec-list i { color:var(--v-accent); }

        .p-download-btn { display:block; width:100%; padding:20px; background:var(--v-accent); color:#000; text-align:center; text-decoration:none; font-family:'JetBrains Mono'; font-weight:800; transition:0.3s; }
        .p-download-btn:hover { background:#fff; box-shadow:0 0 30px var(--v-accent); transform:translateY(-2px); }

        .guide-steps { display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-top:20px; }
        .step { text-align:center; }
        .step-num { font-family:'JetBrains Mono'; font-size:20px; color:rgba(255,255,255,0.1); display:block; margin-bottom:10px; }
        .step p { font-size:11px; color:#666; margin:0; }

        .p-back-btn { background:none; border:1px solid #222; color:#444; padding:10px 20px; font-family:'JetBrains Mono'; font-size:10px; cursor:pointer; transition:0.3s; margin-top:20px; }
        .p-back-btn:hover { border-color:#666; color:#eee; }

        @keyframes pulse { 0% { opacity:0.3; } 50% { opacity:1; } 100% { opacity:0.3; } }
        
        @media (max-width: 768px) {
          .p-content-grid { grid-template-columns: 1fr; }
          .guide-steps { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
