import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    oshi_member: '全員',
    x_url: '',
    instagram_url: '',
    discord_id: '',
    theme_color: '#00f2ff'
  });
  const [favorites, setFavorites] = useState([]); // アーカイブ画像用
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // 1. プロフィール取得（なければ作成）
      let { data: prof, error } = await supabase.from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error && error.code === 'PGRST116') {
        const newProf = { id: session.user.id, oshi_member: '全員', theme_color: '#00f2ff' };
        await supabase.from('profiles').insert([newProf]);
        prof = newProf;
      }

      if (prof) {
        setProfile(prof);
        document.documentElement.style.setProperty('--v-accent', prof.theme_color || '#00f2ff');
      }

      // 2. アーカイブ画像（お気に入り）を取得
      const { data: favs } = await supabase.from('favorites')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (favs) setFavorites(favs);

      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  // 保存処理
  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      ...profile
    });

    if (!error) {
      setIsEditing(false);
      document.documentElement.style.setProperty('--v-accent', profile.theme_color);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading && !user) return <div className="p-loader">SYNCHRONIZING_PORTAL...</div>;

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
          {/* ヘッダーエリア */}
          <div className="p-glass-panel head-area flex-between">
            <div>
              <span className="p-tag">COMMANDER_IDENTITY_CARD</span>
              <h1>USER_PROFILE</h1>
            </div>
            <button className="p-edit-toggle" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'CANCEL_EDIT' : 'EDIT_SYSTEM'}
            </button>
          </div>

          <div className="p-content-grid">
            {/* 左側：ID & SNS */}
            <div className="p-glass-panel info-box">
              <span className="p-tag">IDENTIFICATION</span>
              <div className="user-info-row">
                <div className="p-avatar"><i className="fas fa-user-shield"></i></div>
                <div>
                  <div className="p-label">COMMANDER_ID</div>
                  <div className="p-value">{user?.email}</div>
                </div>
              </div>

              {/* SNS表示/編集エリア */}
              <div className="social-section mt-30">
                <span className="p-tag">SOCIAL_RESOURCES</span>
                {isEditing ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label><i className="fab fa-x-twitter"></i> X_URL</label>
                      <input type="text" value={profile.x_url || ''} onChange={e => setProfile({...profile, x_url: e.target.value})} placeholder="https://x.com/..." />
                    </div>
                    <div className="form-group">
                      <label><i className="fab fa-instagram"></i> INSTA_URL</label>
                      <input type="text" value={profile.instagram_url || ''} onChange={e => setProfile({...profile, instagram_url: e.target.value})} placeholder="https://instagram.com/..." />
                    </div>
                    <button className="p-save-btn" onClick={handleSave}>UPDATE_IDENT_DATA</button>
                  </div>
                ) : (
                  <div className="social-display">
                    {profile.x_url ? (
                      <a href={profile.x_url} target="_blank" className="social-icon-btn"><i className="fab fa-x-twitter"></i></a>
                    ) : <span className="no-data">NO_X_LINK</span>}
                    {profile.instagram_url ? (
                      <a href={profile.instagram_url} target="_blank" className="social-icon-btn"><i className="fab fa-instagram"></i></a>
                    ) : <span className="no-data">NO_INSTA_LINK</span>}
                  </div>
                )}
              </div>
            </div>

            {/* 右側：アプリ & ステータス */}
            <div className="p-glass-panel equipment-box">
              <span className="p-tag">CURRENT_RESONANCE</span>
              <div className="p-value-large">{profile?.oshi_member}</div>
              
              <div className="mt-40">
                <span className="p-tag">EQUIPMENT_STATUS</span>
                <Link href="/download">
                  <div className="p-app-link-card">
                    <img src="/icon.png" alt="" className="mini-icon" />
                    <div className="card-text">
                      <div className="card-title">ACCESS_DEPLOY_HUB</div>
                      <div className="card-desc">デスクトップ版の配備はこちら</div>
                    </div>
                    <i className="fas fa-chevron-right arrow-icon"></i>
                  </div>
                </Link>
              </div>

              <button onClick={handleLogout} className="p-logout-btn mt-30">TERMINATE_SESSION</button>
            </div>
          </div>

          {/* ★新設：アーカイブ・ギャラリーセクション★ */}
          <div className="p-glass-panel archive-section mt-20">
            <div className="archive-head">
              <span className="p-tag">ARCHIVED_MISSION_RESOURCES</span>
              <span className="archive-count">{favorites.length} UNIT_STORED</span>
            </div>
            
            <div className="p-archive-grid">
              {favorites.length > 0 ? (
                favorites.map((fav) => (
                  <div key={fav.id} className="p-archive-item">
                    <div className="archive-img-wrap">
                      <img src={fav.image_url} alt={fav.member_name} />
                      <div className="archive-overlay">
                        <span className="overlay-tag">{fav.member_name}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-archive-msg">
                  <i className="fas fa-ghost"></i>
                  <p>NO_DATA_ARCHIVED_IN_DATABASE</p>
                </div>
              )}
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
        :root { --v-accent: ${profile.theme_color}; }
        body { margin:0; background:#000; color:#fff; font-family:'Montserrat', sans-serif; overflow-x:hidden; }
        
        .p-grain { position:fixed; inset:0; background:url('https://grainy-gradients.vercel.app/noise.svg'); opacity:0.05; pointer-events:none; z-index:900; }
        .p-main-layer { position:relative; min-height:100vh; padding:60px 20px; box-sizing:border-box; z-index:10; background: radial-gradient(circle at 50% -20%, #112, #000); }
        .p-container { max-width:1000px; margin:0 auto; }

        .p-glass-panel { background:rgba(255,255,255,0.02); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.08); padding:30px; margin-bottom:20px; }
        .flex-between { display:flex; justify-content:space-between; align-items:flex-start; }
        .p-tag { font-family:'JetBrains Mono'; font-size:10px; font-weight:800; color:var(--v-accent); letter-spacing:0.2em; display:block; margin-bottom:15px; text-shadow: 0 0 10px var(--v-accent); }
        
        h1 { font-size:40px; font-weight:100; margin:0; letter-spacing:0.1em; }

        .p-content-grid { display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
        
        .user-info-row { display:flex; gap:20px; align-items:center; }
        .p-avatar { width:60px; height:60px; border:1px solid var(--v-accent); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--v-accent); font-size:24px; box-shadow:0 0 15px var(--v-accent); }
        
        .p-label { font-family:'JetBrains Mono'; font-size:9px; color:#555; font-weight:800; }
        .p-value { font-size:14px; color:#eee; }
        .p-value-large { font-size:36px; font-weight:100; color:#fff; letter-spacing:0.1em; }

        /* アーカイブセクション */
        .archive-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
        .archive-count { font-family:'JetBrains Mono'; font-size:9px; color:#333; }
        .p-archive-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); 
          gap: 15px; 
          margin-top: 10px;
        }
        .p-archive-item { 
          background: #000; 
          border: 1px solid #111; 
          border-radius: 4px; 
          overflow: hidden; 
          aspect-ratio: 4 / 5;
          position: relative;
          cursor: pointer;
          transition: 0.4s;
        }
        .p-archive-item:hover { 
          border-color: var(--v-accent); 
          box-shadow: 0 0 20px var(--v-accent);
          transform: translateY(-5px);
        }
        .archive-img-wrap { width: 100%; height: 100%; }
        .archive-img-wrap img { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; transition: 0.4s; }
        .p-archive-item:hover img { opacity: 1; transform: scale(1.05); }
        
        .archive-overlay { 
          position: absolute; inset: 0; 
          background: linear-gradient(transparent 60%, rgba(0,0,0,0.9)); 
          display: flex; align-items: flex-end; padding: 15px; 
          opacity: 0; transition: 0.3s;
        }
        .p-archive-item:hover .archive-overlay { opacity: 1; }
        .overlay-tag { font-family: 'JetBrains Mono'; font-size: 10px; color: var(--v-accent); font-weight: 800; }

        .no-archive-msg { 
          grid-column: 1 / -1; padding: 60px; text-align: center; 
          color: #222; font-family: 'JetBrains Mono'; font-size: 12px;
        }
        .no-archive-msg i { font-size: 30px; margin-bottom: 10px; display: block; }

        /* SNS表示 */
        .social-display { display:flex; gap:15px; }
        .social-icon-btn { width:50px; height:50px; background:rgba(255,255,255,0.03); border:1px solid #222; display:flex; align-items:center; justify-content:center; font-size:20px; color:#fff; transition:0.3s; text-decoration:none; }
        .social-icon-btn:hover { border-color:var(--v-accent); color:var(--v-accent); box-shadow: 0 0 15px var(--v-accent); transform: translateY(-2px); }
        .no-data { font-family:'JetBrains Mono'; font-size:10px; color:#333; }

        /* 編集フォーム */
        .edit-form { display:flex; flex-direction:column; gap:15px; }
        .form-group label { display:block; font-family:'JetBrains Mono'; font-size:10px; color:#666; margin-bottom:5px; }
        .form-group input { width:100%; background:#111; border:1px solid #222; color:#fff; padding:12px; font-family:'JetBrains Mono'; font-size:12px; border-radius:4px; transition:0.3s; }
        .form-group input:focus { border-color:var(--v-accent); outline:none; box-shadow: 0 0 10px var(--v-accent); }
        
        .p-edit-toggle { background:none; border:1px solid #333; color:#666; padding:8px 15px; font-family:'JetBrains Mono'; font-size:10px; cursor:pointer; transition:0.3s; }
        .p-edit-toggle:hover { border-color:var(--v-accent); color:var(--v-accent); }
        .p-save-btn { background:var(--v-accent); color:#000; border:none; padding:15px; font-family:'JetBrains Mono'; font-weight:800; cursor:pointer; margin-top:10px; transition:0.3s; }
        .p-save-btn:hover { background:#fff; box-shadow: 0 0 20px var(--v-accent); }

        .p-app-link-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 12px 20px; border-radius: 4px; cursor: pointer; transition: 0.3s; max-width: 100%; }
        .p-app-link-card:hover { border-color: var(--v-accent); background: rgba(255,255,255,0.06); transform: translateX(5px); }
        .mini-icon { width: 48px; height: 48px; object-fit: contain; flex-shrink: 0; filter: drop-shadow(0 0 8px var(--v-accent)); }
        .card-text { flex-grow: 1; }
        .card-title { font-family: 'JetBrains Mono'; font-size: 12px; font-weight: 800; color: var(--v-accent); }
        .card-desc { font-size: 10px; color: #555; }
        .arrow-icon { font-size: 12px; color: #333; }

        .p-logout-btn { background:none; border:1px solid #311; color:#633; padding:10px 20px; font-family:'JetBrains Mono'; font-size:10px; font-weight:800; cursor:pointer; transition:0.3s; }
        .p-logout-btn:hover { background:#311; color:#f66; border-color:#f66; }
        .p-back-btn { background:none; border:1px solid #222; color:#444; padding:10px 20px; font-family:'JetBrains Mono'; font-size:10px; cursor:pointer; transition:0.3s; margin-top:20px; }
        .p-back-btn:hover { border-color:#666; color:#eee; }

        .mt-20 { margin-top: 20px; } .mt-30 { margin-top:30px; } .mt-40 { margin-top:40px; }
        .p-loader { height:100vh; background:#000; color:var(--v-accent); display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono'; letter-spacing:0.5em; }

        @media (max-width: 768px) { .p-content-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
