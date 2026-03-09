import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

export default function Portal() {
  const [featured, setFeatured] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

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
  }, []);

  return (
    <div className="curator-root">
      <Head>
        <title>VSPO! HUB | CURATOR</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@200;400;700;800&display=swap" rel="stylesheet" />
      </Head>

      <main className="portal-container">
        {/* 背景：没入感のあるアンビエント演出 */}
        <div className="ambient-bg">
          {featured && <img src={featured.image || featured.url} alt="" className="blur-img" />}
          <div className="overlay-vignette"></div>
        </div>

        <div className="portal-interface">
          <header className="portal-header">
            <div className="brand-logo">VSPO! ARCHIVE</div>
            <div className="status-tag">
              {user ? `AUTH-ID: ${user.email.split('@')[0]}` : "GUEST_SESSION"}
            </div>
          </header>

          <section className="featured-stage">
            {featured ? (
              <div className="piece-frame">
                <div className="label">TODAY'S FEATURED</div>
                <div className="image-wrapper">
                   <img src={featured.image || featured.url} alt="" />
                </div>
                <div className="info-overlay">
                  <span className="cos-name">{featured.cosplayer || featured['レイヤー']}</span>
                  <span className="mem-name">{featured.member || featured['名前']}</span>
                </div>
              </div>
            ) : <div className="loader">CONNECTING...</div>}
          </section>

          <nav className="minimal-navigation">
            <Link href="/gallery"><div className="nav-item">GALLERY</div></Link>
            <Link href="/chronicle"><div className="nav-item">MAP</div></Link>
            <Link href="/tracker"><div className="nav-item">TRACKER</div></Link>
            <Link href="/log"><div className="nav-item">LOG</div></Link>
          </nav>
        </div>
      </main>

      <style jsx global>{`
        body { margin: 0; background: #000; font-family: 'Montserrat', sans-serif; color: #fff; overflow: hidden; }
        .curator-root { width: 100vw; height: 100vh; position: relative; }
        
        .ambient-bg { position: absolute; inset: 0; z-index: 0; }
        .blur-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.12; filter: blur(80px); transform: scale(1.1); }
        .overlay-vignette { position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 0%, #000 85%); }

        .portal-interface { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; padding: 40px; box-sizing: border-box; }
        .portal-header { display: flex; justify-content: space-between; align-items: center; }
        .brand-logo { font-weight: 800; font-size: 14px; letter-spacing: 0.3em; color: #444; }
        .status-tag { font-size: 9px; font-weight: 700; color: #222; border: 1px solid #111; padding: 4px 12px; border-radius: 2px; }

        .featured-stage { flex: 1; display: flex; align-items: center; justify-content: center; }
        .piece-frame { position: relative; animation: float 6s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }

        .label { font-size: 10px; font-weight: 800; color: #333; letter-spacing: 0.6em; text-align: center; margin-bottom: 30px; }
        .image-wrapper { width: 320px; height: 460px; overflow: hidden; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 50px 100px rgba(0,0,0,0.8); }
        .image-wrapper img { width: 100%; height: 100%; object-fit: cover; }
        
        .info-overlay { position: absolute; bottom: -45px; left: 0; width: 100%; display: flex; justify-content: space-between; align-items: baseline; }
        .cos-name { font-size: 13px; font-weight: 400; color: #888; letter-spacing: 0.1em; }
        .mem-name { font-size: 11px; font-weight: 800; color: #00f2ff; border-bottom: 1px solid #222; padding-bottom: 5px; }

        .minimal-navigation { display: flex; justify-content: center; gap: 60px; padding-bottom: 40px; }
        .nav-item { font-size: 11px; font-weight: 800; letter-spacing: 0.4em; color: #333; cursor: pointer; transition: 0.5s; }
        .nav-item:hover { color: #fff; letter-spacing: 0.6em; text-shadow: 0 0 20px rgba(255,255,255,0.4); }

        .loader { font-size: 10px; letter-spacing: 0.5em; color: #222; }
      `}</style>
    </div>
  );
}