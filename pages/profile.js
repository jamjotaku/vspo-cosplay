import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [themeColor, setThemeColor] = useState('#00f2ff');

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Supabaseからプロファイル（推しメン、テーマカラー）を取得
      const { data: prof } = await supabase.from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (prof) {
        setProfile(prof);
        const color = prof.theme_color || '#00f2ff';
        setThemeColor(color);
        document.documentElement.style.setProperty('--v-accent', color);
      }
    };

    fetchUserData();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!user) return <div className="p-loader">ACCESSING_DATABASE...</div>;

  return (
    <div className="p-root">
      <Head>
        <title>COMMANDER_PROFILE // VSPO! HUB</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&family=Montserrat:wght@100;400;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      <div className="p-grain"></div>
      
      <main className="p-main-layer">
        <div className="p-container">
          {/* 1. ページヘッダー */}
          <div className="p-glass-panel head-area">
            <span className="p-tag">COMMANDER_IDENTITY_CARD</span>
            <h1>USER_PROFILE</h1>
          </div>

          <div className="p-content-grid">
            {/* 2. 左側：ユーザー情報ステータス */}
            <div className="p-glass-panel info-box">
              <span className="p-tag">IDENTIFICATION</span>
              <div className="user-info-row">
                <div className="p-avatar">
                  <i className="fas fa-user-shield"></i>
                </div>
                <div>
                  <div className="p-label">COMMANDER_EMAIL</div>
                  <div className="p-value">{user.email}</div>
                </div>
              </div>

              <div className="oshi-status-box mt-20">
                <span className="p-tag">CURRENT_RESONANCE</span>
                <div className="p-label">TARGET_MEMBER</div>
                <div className="p-value-large">{profile?.oshi_member || 'UNDEFINED'}</div>
              </div>

              <button onClick={handleLogout} className="p-logout-btn mt-30">
                <i className="fas fa-sign-out-alt"></i> TERMINATE_SESSION
              </button>
            </div>

            {/* 3. 右側：装備（アプリ）配布への導線 */}
            <div className="p-glass-panel equipment-box">
              <span className="p-tag">EQUIPMENT_STATUS</span>
              <h3>DESKTOP_WIDGET</h3>
              <p className="p-desc">
                現在、Windows専用ウィジェットが配備可能です。
                デスクトップへ推しを常駐させます。
              </p>
              
              {/* 緊急用配布ページ（/download）へのリンク */}
              <Link href="/download">
                <div className="p-app-link-card">
                  <img src="/icon.png" alt="App Icon" className="mini-icon" />
                  <div>
                    <div className="card-title">ACCESS_DEPLOY_HUB</div>
                    <div className="card-desc">配布専用ページへ移動します</div>
                  </div>
                  <i className="fas fa-chevron-right"></i>
                </div>
              </Link>
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
        :root { --v-accent: ${themeColor}; }
        body { margin:0; background:#000; color:#fff; font-family:'Montserrat', sans-serif; overflow-x:hidden; }
        
        .p-grain { position:fixed; inset:0; background:url('https://grainy-gradients.vercel.app/noise.svg'); opacity:0.05; pointer-events:none; z-index:900; }
        .p-main-layer { position:relative; min-height:100vh; padding:60px 20px; box-sizing:border-box; z-index:10; background: radial-gradient(circle at 50% -20%, #112, #000); }
        .p-container { max-width:1000px; margin:0 auto; }

        .p-glass-panel { background:rgba(255,255,255,0.02); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); padding:30px; margin-bottom:20px; }
        .p-tag { font-family:'JetBrains Mono'; font-size:10px; font-weight:800; color:var(--v-accent); letter-spacing:0.2em; display:block; margin-bottom:15px; }
        
        h1 { font-size:40px; font-weight:100; margin:0; letter-spacing:0.1em; }
        h3 { font-family:'JetBrains Mono'; font-size:18px; margin:0 0 10px; color:#eee; }

        .p-content-grid { display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
        
        .user-info-row { display:flex; gap:20px; align-items:center; }
        .p-avatar { width:60px; height:60px; background:rgba(255,255,255,0.05); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; color:var(--v-accent); border:1px solid var(--v-accent); box-shadow:0 0 15px var(--v-accent); }
        
        .p-label { font-family:'JetBrains Mono'; font-size:9px; color:#555; font-weight:800; }
        .p-value { font-size:14px; color:#eee; }
        .p-value-large { font-size:28px; font-weight:100; color:#fff; letter-spacing:0.1em; }

        .p-desc { font-size:13px; color:#666; line-height:1.6; margin-bottom:25px; }

        .p-app-link-card { display:flex; align-items:center; gap:15px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); padding:20px; border-radius:4px; cursor:pointer; transition:0.3s; }
        .p-app-link-card:hover { border-color:var(--v-accent); background:rgba(255,255,255,0.06); transform:translateX(5px); }
        .mini-icon { width:40px; height:40px; filter: drop-shadow(0 0 5px var(--v-accent)); }
        .card-title { font-family:'JetBrains Mono'; font-size:12px; font-weight:800; color:var(--v-accent); }
        .card-desc { font-size:10px; color:#555; }

        .p-logout-btn { background:none; border:1px solid #311; color:#633; padding:10px 20px; font-family:'JetBrains Mono'; font-size:10px; font-weight:800; cursor:pointer; transition:0.3s; }
        .p-logout-btn:hover { background:#311; color:#f66; border-color:#f66; }

        .p-back-btn { background:none; border:1px solid #222; color:#444; padding:10px 20px; font-family:'JetBrains Mono'; font-size:10px; cursor:pointer; transition:0.3s; margin-top:20px; }
        .p-back-btn:hover { border-color:#666; color:#eee; }

        .mt-20 { margin-top:20px; }
        .mt-30 { margin-top:30px; }

        .p-loader { height:100vh; background:#000; color:var(--v-accent); display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono'; letter-spacing:0.5em; }
        
        @media (max-width: 768px) {
          .p-content-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
