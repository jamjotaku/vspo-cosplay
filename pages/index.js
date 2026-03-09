import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

export default function Portal() {
  const [featured, setFeatured] = useState(null);
  const [user, setUser] = useState(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // ログイン状態取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 時計の更新
    const timer = setInterval(() => setTime(new Date()), 1000);

    // ウィジェットデータ取得
    const fetchWidget = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, {
        download: true, header: true, complete: (res) => {
          const list = res.data.filter(d => d.image || d.url);
          setFeatured(list[Math.floor(Math.random() * list.length)]);
        }
      });
    };
    fetchWidget();

    return () => clearInterval(timer);
  }, []);

  // 時間のフォーマット
  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className="portal-root">
      <Head>
        <title>VSPO! HUB | TERMINAL</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;400;700&display=swap" rel="stylesheet" />
      </Head>

      <main className="terminal-interface">
        {/* 背景演出 */}
        <div className="ambient-bg">
          {featured && <img src={featured.image || featured.url} alt="" className="blur-layer" />}
          <div className="vignette-mask"></div>
        </div>

        {/* --- GRID LAYOUT --- */}
        <div className="triptych-grid">
          
          {/* 左翼：ステータス・将来の拡張枠 */}
          <div className="wing-left">
            <div className="system-status">
              <span className="label">SYSTEM READY</span>
              <div className="status-item">
                <span className="key">AGENT</span>
                <span className="val">{user ? user.email.split('@')[0] : "GUEST"}</span>
              </div>
              <div className="status-item">
                <span className="key">VERSION</span>
                <span className="val">2.0.26_HUB</span>
              </div>
            </div>
          </div>

          {/* 中央：禅・クロック（視線の逃げ場） */}
          <div className="center-core">
            <div className="zen-clock">{formatTime(time)}</div>
            <div className="base-tag">VSPO! DEVELOPER BASE</div>
          </div>

          {/* 右翼：メインウィジェット（今日の1枚） */}
          <div className="wing-right">
            {featured ? (
              <div className="featured-widget">
                <div className="widget-label">FEATURED_ARCHIVE</div>
                <div className="image-frame">
                  <img src={featured.image || featured.url} alt="" />
                </div>
                <div className="image-caption">
                  <div className="c-name">{featured.cosplayer || featured['レイヤー']}</div>
                  <div className="m-name">{featured.member || featured['名前']}</div>
                </div>
              </div>
            ) : <div className="silent-loader">LOADING...</div>}
          </div>

        </div>

        {/* 固定ナビゲーション */}
        <nav className="dock-navigation">
          <Link href="/gallery"><div className="dock-item">GALLERY</div></Link>
          <Link href="/chronicle"><div className="dock-item">CHRONICLE</div></Link>
          <Link href="/tracker"><div className="dock-item">TRACKER</div></Link>
          <Link href="/log"><div className="dock-item">LOG</div></Link>
        </nav>
      </main>

      <style jsx global>{`
        body { margin: 0; background: #000; font-family: 'Montserrat', sans-serif; color: #fff; overflow: hidden; }
        .portal-root { width: 100vw; height: 100vh; position: relative; }
        
        .ambient-bg { position: absolute; inset: 0; z-index: 0; }
        .blur-layer { width: 100%; height: 100%; object-fit: cover; opacity: 0.1; filter: blur(100px); transform: scale(1.1); }
        .vignette-mask { position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 0%, #000 90%); }

        .terminal-interface { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; padding: 60px; box-sizing: border-box; }
        
        .triptych-grid { flex: 1; display: grid; grid-template-columns: 1fr 1.5fr 1fr; align-items: center; gap: 40px; }

        /* Wing Left */
        .system-status { display: flex; flex-direction: column; gap: 20px; }
        .system-status .label { font-size: 9px; font-weight: 800; color: #222; letter-spacing: 0.5em; margin-bottom: 10px; }
        .status-item { display: flex; flex-direction: column; gap: 5px; }
        .status-item .key { font-size: 8px; color: #444; font-weight: 700; letter-spacing: 0.2em; }
        .status-item .val { font-size: 11px; color: #888; font-weight: 400; letter-spacing: 0.1em; }

        /* Center Core */
        .center-core { text-align: center; }
        .zen-clock { font-size: 80px; font-weight: 100; letter-spacing: 0.1em; color: rgba(255,255,255,0.8); margin-bottom: 20px; }
        .base-tag { font-size: 10px; font-weight: 400; letter-spacing: 0.8em; color: #333; text-transform: uppercase; }

        /* Wing Right (Widget) */
        .wing-right { display: flex; justify-content: flex-end; }
        .featured-widget { width: 280px; position: relative; animation: float 8s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        
        .widget-label { font-size: 9px; font-weight: 700; color: #333; letter-spacing: 0.4em; margin-bottom: 20px; text-align: right; }
        .image-frame { width: 100%; height: 400px; border-radius: 2px; overflow: hidden; box-shadow: 0 50px 100px rgba(0,0,0,0.9); border: 1px solid rgba(255,255,255,0.03); }
        .image-frame img { width: 100%; height: 100%; object-fit: cover; }
        
        .image-caption { position: absolute; bottom: -50px; right: 0; text-align: right; }
        .c-name { font-size: 14px; color: #aaa; font-weight: 200; letter-spacing: 0.1em; }
        .m-name { font-size: 11px; color: var(--v-cyan); font-weight: 700; margin-top: 5px; letter-spacing: 0.2em; }

        /* Dock Navigation */
        .dock-navigation { display: flex; justify-content: center; gap: 80px; padding-top: 40px; }
        .dock-item { font-size: 11px; font-weight: 700; letter-spacing: 0.4em; color: #333; cursor: pointer; transition: 0.5s; position: relative; }
        .dock-item:after { content: ''; position: absolute; bottom: -10px; left: 50%; width: 0; height: 1px; background: #fff; transition: 0.4s; transform: translateX(-50%); }
        .dock-item:hover { color: #fff; letter-spacing: 0.6em; }
        .dock-item:hover:after { width: 100%; }

        .silent-loader { font-size: 10px; letter-spacing: 0.5em; color: #111; }
      `}</style>
    </div>
  );
}