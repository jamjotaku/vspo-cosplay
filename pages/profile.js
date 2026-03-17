import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

// --- ぶいすぽメンバー：カラーマトリクス ---
const VSPO_MEMBERS = [
  { name: '花芽すみれ', color: '#B0C4DE' }, { name: '花芽なずな', color: '#FABEDC' },
  { name: '小雀とと', color: '#F5EB4A' }, { name: '一ノ瀬うるは', color: '#4182FA' },
  { name: '胡桃のあ', color: '#FFDBFE' }, { name: '兎咲ミミ', color: '#C7B2D6' },
  { name: '空澄セナ', color: '#FFFFFF' }, { name: '橘ひなの', color: '#FA96C8' },
  { name: '英リサ', color: '#D1DE79' }, { name: '如月れん', color: '#BE2152' },
  { name: '神成きゅぴ', color: '#FFD23C' }, { name: '八雲べに', color: '#85CAB3' },
  { name: '藍沢エマ', color: '#B4F1F9' }, { name: '紫宮るな', color: '#D6ADFF' },
  { name: '猫汰つな', color: '#FF3652' }, { name: '白波らむね', color: '#8ECED9' },
  { name: '小森めと', color: '#FBA03F' }, { name: '夢野あかり', color: '#FF998D' },
  { name: '夜乃くろむ', color: '#909EC8' }, { name: '紡木こかげ', color: '#5195E1' },
  { name: '千燈ゆうひ', color: '#ED784A' }, { name: '蝶屋はなび', color: '#EA5506' },
  { name: '甘結もか', color: '#ECA0AA' }, { name: '銀城サイネ', color: '#58535E' },
  { name: '龍巻ちせ', color: '#BEFF77' }
];

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    oshi_member: '全員',
    oshi_cosplayer: 'UNDEFINED',
    x_url: '',
    instagram_url: '',
    discord_id: '',
    theme_color: '#00f2ff'
  });
  const [favorites, setFavorites] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      let { data: prof, error } = await supabase.from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error && error.code === 'PGRST116') {
        const newProf = { 
          id: session.user.id, 
          oshi_member: '全員', 
          oshi_cosplayer: 'UNDEFINED',
          theme_color: '#00f2ff' 
        };
        await supabase.from('profiles').insert([newProf]);
        prof = newProf;
      }

      if (prof) {
        setProfile(prof);
        document.documentElement.style.setProperty('--v-accent', prof.theme_color || '#00f2ff');
      }

      const { data: favs } = await supabase.from('favorites')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (favs) setFavorites(favs);
      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  const handleSave = async () => {
    if (saveLoading) return;
    setSaveLoading(true);

    try {
      if (!user?.id) throw new Error("USER_ID_NOT_FOUND");

      const updateData = {
        oshi_member: profile.oshi_member || '全員',
        oshi_cosplayer: profile.oshi_cosplayer || 'UNDEFINED',
        x_url: profile.x_url || '',
        instagram_url: profile.instagram_url || '',
        theme_color: profile.theme_color || '#00f2ff',
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .match({ id: user.id });

      if (error) throw error;

      setIsEditing(false);
      document.documentElement.style.setProperty('--v-accent', profile.theme_color);
      alert("MISSION_SUCCESS: プロフィールを同期しました。");
      
    } catch (err) {
      alert(`SAVE_ERROR: ${err.message}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const selectPreset = (m) => {
    setProfile({ 
      ...profile, 
      oshi_member: m.name, 
      theme_color: m.color 
    });
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
            <div className="p-glass-panel info-box">
              <span className="p-tag">IDENTIFICATION</span>
              <div className="user-info-row">
                <div className="p-avatar"><i className="fas fa-user-shield"></i></div>
                <div>
                  <div className="p-label">COMMANDER_ID</div>
                  <div className="p-value">{user?.email}</div>
                </div>
              </div>

              <div className="social-section mt-30">
                <span className="p-tag">IDENTITY_RESOURCES</span>
                {isEditing ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label><i className="fas fa-user-tag"></i> TARGET_COSPLAYER</label>
                      <input type="text" value={profile.oshi_cosplayer || ''} onChange={e => setProfile({...profile, oshi_cosplayer: e.target.value})} placeholder="名前を入力..." />
                    </div>

                    <div className="form-group">
                      <label><i className="fas fa-palette"></i> COLOR_PRESETS (QUICK_SYNC)</label>
                      <div className="preset-grid">
                        {VSPO_MEMBERS.map(m => (
                          <button 
                            key={m.name} 
                            className={`preset-chip ${profile.oshi_member === m.name ? 'active' : ''}`}
                            style={{ '--chip-color': m.color }}
                            onClick={() => selectPreset(m)}
                            title={m.name}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="form-group">
                      <label><i className="fas fa-mask"></i> TARGET_CHARACTER</label>
                      <input type="text" value={profile.oshi_member || ''} onChange={e => setProfile({...profile, oshi_member: e.target.value})} placeholder="キャラ名を入力..." />
                    </div>

                    <div className="form-group">
                      <label><i className="fas fa-brush"></i> CUSTOM_THEME_COLOR</label>
                      <div className="flex-row">
                        <input type="color" value={profile.theme_color} onChange={e => setProfile({...profile, theme_color: e.target.value})} className="p-color-picker" />
                        <span className="color-code">{profile.theme_color.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label><i className="fab fa-x-twitter"></i> X_URL</label>
                      <input type="text" value={profile.x_url || ''} onChange={e => setProfile({...profile, x_url: e.target.value})} placeholder="https://x.com/..." />
                    </div>
                    
                    <button className={`p-save-btn ${saveLoading ? 'loading' : ''}`} onClick={handleSave} disabled={saveLoading}>
                      {saveLoading ? 'SYNCHRONIZING...' : 'UPDATE_IDENT_DATA'}
                    </button>
                  </div>
                ) : (
                  <div className="social-display">
                    {profile.x_url ? (
                      <a href={profile.x_url} target="_blank" rel="noreferrer" className="social-icon-btn"><i className="fab fa-x-twitter"></i></a>
                    ) : <span className="no-data">NO_X_LINK</span>}
                    {profile.instagram_url ? (
                      <a href={profile.instagram_url} target="_blank" rel="noreferrer" className="social-icon-btn"><i className="fab fa-instagram"></i></a>
                    ) : <span className="no-data">NO_INSTA_LINK</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="p-glass-panel equipment-box">
              <span className="p-tag">CURRENT_RESONANCE</span>
              <div className="p-value-large resonance-glow">{profile?.oshi_cosplayer}</div>
              <div className="p-sub-value">TARGET_CHARACTER: {profile?.oshi_member}</div>
              
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
                      <img src={fav.image_url} alt={fav.member_name} loading="lazy" />
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
        
        .p-grain { position:fixed; inset:0; background:url('https://grainy-gradients.vercel.app/noise.svg'); opacity:0.05; pointer-events:none; z-index:0; }
        .p-main-layer { position:relative; min-height:100vh; padding:60px 20px; box-sizing:border-box; z-index:10; background: radial-gradient(circle at 50% -20%, #0a0a15, #000); }
        .p-container { max-width:1000px; margin:0 auto; }

        .p-glass-panel { background:rgba(255,255,255,0.02); backdrop-filter:blur(30px); border:1px solid rgba(255,255,255,0.08); padding:30px; margin-bottom:20px; border-radius: 4px; }
        .flex-between { display:flex; justify-content:space-between; align-items:flex-start; }
        .p-tag { font-family:'JetBrains Mono'; font-size:10px; font-weight:800; color:var(--v-accent); letter-spacing:0.2em; display:block; margin-bottom:15px; text-shadow: 0 0 10px var(--v-accent); }
        
        h1 { font-size:40px; font-weight:900; margin:0; letter-spacing:0.1em; }
        .p-content-grid { display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
        
        .user-info-row { display:flex; gap:20px; align-items:center; }
        .p-avatar { width:60px; height:60px; border:1px solid var(--v-accent); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--v-accent); font-size:24px; box-shadow:0 0 15px var(--v-accent); }
        
        .p-label { font-family:'JetBrains Mono'; font-size:9px; color:#555; font-weight:800; }
        .p-value { font-size:14px; color:#eee; font-family: 'JetBrains Mono'; }
        .p-value-large { font-size:42px; font-weight:900; color:#fff; letter-spacing:0.05em; margin-bottom: 5px; }
        .resonance-glow { text-shadow: 0 0 20px rgba(255,255,255,0.2); }
        .p-sub-value { font-family: 'JetBrains Mono'; font-size: 11px; color: #444; font-weight: 800; }

        .preset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); gap: 10px; margin-top: 10px; background: rgba(0,0,0,0.3); padding: 15px; border: 1px solid #111; border-radius: 4px; }
        .preset-chip { width: 32px; height: 32px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); background: var(--chip-color); cursor: pointer; transition: 0.2s; position: relative; }
        .preset-chip:hover { transform: scale(1.15); z-index: 2; border-color: #fff; }
        .preset-chip.active { border: 2px solid #fff; box-shadow: 0 0 15px var(--chip-color); transform: scale(1.1); }
        
        .flex-row { display: flex; align-items: center; gap: 15px; }
        .color-code { font-family: 'JetBrains Mono'; font-size: 12px; color: #555; }

        .edit-form { display:flex; flex-direction:column; gap:15px; }
        .form-group label { display:block; font-family:'JetBrains Mono'; font-size:10px; color:#555; margin-bottom:8px; font-weight: 800; }
        .form-group input { width:100%; background:rgba(0,0,0,0.5); border:1px solid #222; color:#fff; padding:12px; font-family:'JetBrains Mono'; font-size:12px; border-radius:4px; box-sizing: border-box; }
        .form-group input:focus { border-color:var(--v-accent); outline:none; box-shadow: 0 0 10px var(--v-accent); background: #000; }
        
        .p-color-picker { width: 60px; height: 40px; cursor: pointer; border: none; padding: 2px; background: none; }
        
        .p-edit-toggle { background:none; border:1px solid #333; color:#666; padding:10px 20px; font-family:'JetBrains Mono'; font-size:10px; cursor:pointer; transition:0.3s; border-radius: 4px; z-index: 100; }
        .p-save-btn { 
          background:var(--v-accent); color:#000; border:none; padding:18px; 
          font-family:'JetBrains Mono'; font-weight:800; cursor:pointer; 
          margin-top:10px; transition:0.3s; border-radius: 4px; letter-spacing: 0.1em;
          position: relative; z-index: 100;
        }
        .p-save-btn:hover:not(:disabled) { background:#fff; box-shadow: 0 0 30px var(--v-accent); transform: translateY(-2px); }
        .p-save-btn:disabled { opacity: 0.5; cursor: wait; }

        /* ★ギャラリー画像の表示修正★ */
        .p-archive-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; }
        .p-archive-item { 
          background: #0a0a0a; 
          border: 1px solid #111; 
          border-radius: 4px; 
          overflow: hidden; 
          aspect-ratio: 4 / 5; 
          position: relative; 
          cursor: pointer; 
          transition: 0.4s; 
        }
        .p-archive-item:hover { border-color: var(--v-accent); box-shadow: 0 0 25px var(--v-accent); transform: translateY(-5px); }

        .archive-img-wrap { width: 100%; height: 100%; background: #111; }
        .archive-img-wrap img { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          /* 顔（上部）を優先して表示し、拡大しすぎによる崩れを防ぐ */
          object-position: top center; 
          image-rendering: -webkit-optimize-contrast;
          opacity: 0.9; 
          transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        .p-archive-item:hover img { opacity: 1; transform: scale(1.05); }

        .archive-overlay { position: absolute; inset: 0; background: linear-gradient(transparent 60%, rgba(0,0,0,0.8)); display: flex; align-items: flex-end; padding: 15px; opacity: 0; transition: 0.3s; }
        .p-archive-item:hover .archive-overlay { opacity: 1; }
        .overlay-tag { font-family: 'JetBrains Mono'; font-size: 10px; color: var(--v-accent); font-weight: 800; }

        .p-app-link-card { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 15px 20px; border-radius: 4px; cursor: pointer; transition: 0.3s; }
        .p-app-link-card:hover { border-color: var(--v-accent); background: rgba(255,255,255,0.06); transform: translateX(5px); }
        .mini-icon { width: 48px; height: 48px; object-fit: contain; filter: drop-shadow(0 0 8px var(--v-accent)); }

        .p-logout-btn { background:none; border:1px solid #311; color:#633; padding:12px 20px; font-family:'JetBrains Mono'; font-size:10px; font-weight:800; cursor:pointer; border-radius: 4px; transition: 0.3s; }
        .p-logout-btn:hover { background:#311; color:#f66; border-color:#f66; }
        .p-back-btn { background:none; border:1px solid #222; color:#444; padding:12px 24px; font-family:'JetBrains Mono'; font-size:11px; cursor:pointer; margin-top:30px; border-radius: 4px; transition:0.3s; }
        .p-back-btn:hover { border-color:#fff; color:#fff; }

        .p-loader { height:100vh; background:#000; color:var(--v-accent); display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono'; letter-spacing:0.5em; }

        @media (max-width: 768px) { .p-content-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
