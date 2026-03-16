import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

export default function AdminConsole() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [csvData, setCsvData] = useState([]);
  const [deadLinks, setDeadLinks] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user.email.startsWith("jamj__otaku")) {
        router.push('/'); // 管理者以外は即追放
        return;
      }
      setUser(session.user);
      setLoading(false);
      fetchCSV();
    };
    checkAdmin();
  }, [router]);

  const fetchCSV = async () => {
    const Papa = (await import('papaparse')).default;
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      complete: (res) => {
        const data = res.data.filter(d => d.image || d.url).map((d, index) => ({
          row: index + 2, // スプレッドシートの行番号
          member: (d.member || d['名前'] || "").trim(),
          image: (d.image || d['画像'] || d.link || d.url || "").replace('name=medium', 'name=large'),
        }));
        setCsvData(data);
      }
    });
  };

  // リンク切れチェックの核
  const checkImage = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      setTimeout(() => resolve(false), 5000); // 5秒でタイムアウト
    });
  };

  const startScan = async () => {
    setScanning(true);
    setDeadLinks([]);
    const dead = [];
    for (let i = 0; i < csvData.length; i++) {
      const isAlive = await checkImage(csvData[i].image);
      if (!isAlive) {
        dead.push(csvData[i]);
      }
      setScanProgress(Math.round(((i + 1) / csvData.length) * 100));
    }
    setDeadLinks(dead);
    setScanning(false);
  };

  if (loading) return <div className="admin-loading">INITIALIZING_ADMIN_SHELL...</div>;

  return (
    <div className="admin-root">
      <Head><title>ADMIN_CONSOLE // VSPO! HUB</title></Head>
      
      <main className="admin-container">
        <header className="admin-header">
          <div className="admin-tag">MASTER_ADMIN_PRIVILEGE</div>
          <h1>SYSTEM_MAINTENANCE_SHELL</h1>
          <p>COMMANDER_ID: {user.email}</p>
        </header>

        <section className="admin-tools">
          <div className="tool-card">
            <h3><i className="fas fa-link"></i> CSV_DEAD_LINK_SCANNER</h3>
            <p>全 {csvData.length} 件の画像をスキャンし、リンク切れを特定します。</p>
            
            {!scanning ? (
              <button className="scan-btn" onClick={startScan}>START_SYSTEM_SCAN</button>
            ) : (
              <div className="progress-area">
                <div className="progress-bar-bg"><div className="progress-fill" style={{width: `${scanProgress}%`}}></div></div>
                <span>SCANNING: {scanProgress}%</span>
              </div>
            )}
          </div>
        </section>

        {deadLinks.length > 0 && (
          <section className="results-area">
            <h3><i className="fas fa-exclamation-triangle"></i> DEAD_LINKS_DETECTED ({deadLinks.length})</h3>
            <div className="dead-list">
              {deadLinks.map((link, idx) => (
                <div key={idx} className="dead-item">
                  <span className="row-num">ROW_{link.row}</span>
                  <span className="member">{link.member}</span>
                  <input className="url-input" readOnly value={link.image} onClick={e => e.target.select()} />
                </div>
              ))}
            </div>
            <button className="copy-btn" onClick={() => {
              navigator.clipboard.writeText(deadLinks.map(l => l.image).join('\n'));
              alert("COPIED_TO_CLIPBOARD");
            }}>COPY_ALL_DEAD_URLS</button>
          </section>
        )}
      </main>

      <style jsx global>{`
        body { background: #000; color: #fff; font-family: 'JetBrains Mono', monospace; margin: 0; }
        .admin-root { min-height: 100vh; padding: 60px; background: radial-gradient(circle at top right, #050505, #000); }
        .admin-container { max-width: 900px; margin: 0 auto; }
        .admin-tag { color: #ff00ff; font-size: 10px; letter-spacing: 0.3em; margin-bottom: 10px; }
        .admin-header { border-bottom: 1px solid #222; padding-bottom: 30px; margin-bottom: 50px; }
        .admin-header h1 { font-size: 32px; margin: 0; font-family: 'Montserrat'; letter-spacing: 0.1em; }
        .admin-header p { color: #444; font-size: 12px; margin-top: 10px; }

        .tool-card { background: rgba(255,255,255,0.03); border: 1px solid #1a1a1c; padding: 40px; border-radius: 4px; }
        .scan-btn { background: #00f2ff; color: #000; border: none; padding: 15px 30px; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .scan-btn:hover { background: #fff; box-shadow: 0 0 30px #00f2ff; }

        .progress-bar-bg { background: #111; height: 4px; width: 100%; margin: 20px 0 10px; overflow: hidden; }
        .progress-fill { background: #00f2ff; height: 100%; transition: 0.3s; box-shadow: 0 0 15px #00f2ff; }

        .results-area { margin-top: 50px; animation: slideUp 0.5s ease-out; }
        .dead-list { background: #08080a; border: 1px solid #222; max-height: 400px; overflow-y: auto; padding: 20px; border-radius: 4px; }
        .dead-item { display: flex; align-items: center; gap: 15px; padding: 10px 0; border-bottom: 1px solid #111; font-size: 12px; }
        .row-num { color: #ff0055; font-weight: 800; }
        .member { width: 100px; color: #999; }
        .url-input { background: transparent; border: none; color: #444; font-size: 10px; flex: 1; outline: none; cursor: pointer; }
        .url-input:hover { color: #00f2ff; }

        .copy-btn { margin-top: 20px; background: transparent; border: 1px solid #444; color: #999; padding: 10px 20px; cursor: pointer; font-size: 10px; font-weight: 800; width: 100%; }
        .copy-btn:hover { border-color: #fff; color: #fff; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}