import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';

// --- 設定 ---
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";
const PROFILE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=1592730885&single=true&output=csv";

const memberOrder = ["花芽すみれ", "花芽なずな", "小雀とと", "一ノ瀬うるは", "胡桃のあ", "兎咲ミミ", "空澄セナ", "橘ひなの", "英リサ", "如月れん", "神成きゅぴ", "八雲べに", "藍沢エマ", "紫宮るな", "猫汰つな", "白波らむね", "小森めと", "夢野あかり", "夜乃くろむ", "紡木こかげ", "千燈ゆうひ", "蝶屋はなび", "甘結もか"];
const memberIcons = { "花芽すみれ": "👾💤", "花芽なずな": "🍣", "小雀とと": "🔫🐥", "一ノ瀬うるは": "🌠", "胡桃のあ": "🧸♔", "橘ひなの": "🍫💘", "如月れん": "⏰", "英リサ": "💐", "空澄セナ": "🗝♠︎", "兎咲ミミ": "🐰🍭", "神成きゅぴ": "🌩", "八雲べに": "💄💚", "藍沢エマ": "🥞💫", "紫宮るな": "☪🐾", "猫汰つな": "🍒✨", "白波らむね": "🐻‍❄️🏖", "小森めと": "🪐", "夢野あかり": "🍼", "夜乃くろむ": "💀⛓", "紡木こかげ": "📘💧", "千燈ゆうひ": "🫠", "蝶屋はなび": "🦋🎆", "甘結もか": "🕹🔖" };

const getTwitterUrl = (url, size = 'medium') => {
  if (!url || !url.includes('pbs.twimg.com')) return url;
  return `${url.split('?')[0]}?format=jpg&name=${size}`;
};

export default function Home() {
  const [allData, setAllData] = useState([]);
  const [profileData, setProfileData] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(40);
  const [activeFilters, setActiveFilters] = useState({ member: null, cosplayer: null, event: null, text: "" });
  const [currentSort, setCurrentSort] = useState('random');
  const [viewMode, setViewMode] = useState('home'); // 'home', 'directory', 'events'
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [diagnosisStep, setDiagnosisStep] = useState(0); // 0: closed, 1: member, 2: result
  const [diagResult, setDiagResult] = useState(null);
  
  const storyTimer = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, {
        download: true, header: true, complete: (res) => {
          const keys = Object.keys(res.data[0] || {});
          const kMem = keys.find(k => k.match(/member|名前/i)) || 'member';
          const kImg = keys.find(k => k.match(/image|url/i)) || 'image';
          const kCos = keys.find(k => k.match(/cosplayer|レイヤー/i)) || 'cosplayer';
          const kEv = keys.find(k => k.match(/event|イベント/i)) || 'Event';

          const formatted = res.data.filter(d => d[kImg]).map((d, i) => ({
            _id: i,
            member: (d[kMem] || "").trim(),
            image: d[kImg],
            cosplayer: (d[kCos] || "Unknown").trim(),
            event: (d[kEv] || "").trim(),
            searchKey: `${d[kMem]} ${d[kCos]} ${d[kEv]}`.toLowerCase()
          }));
          setAllData(formatted);

          // 24hストーリー生成
          const today = new Date().toISOString().slice(0, 10);
          const cacheKey = `vspo_daily_stories_${today}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) setStories(JSON.parse(cached));
          else {
            const newStories = memberOrder.map(m => {
              const pics = formatted.filter(d => d.member === m);
              if (pics.length === 0) return null;
              return { member: m, images: [...pics].sort(() => 0.5 - Math.random()).slice(0, 5) };
            }).filter(Boolean);
            localStorage.setItem(cacheKey, JSON.stringify(newStories));
            setStories(newStories);
          }
        }
      });
      Papa.parse(PROFILE_CSV_URL, {
        download: true, header: true, complete: (res) => {
          const profs = {};
          res.data.forEach(p => { const name = (p.cosplayer || p['名前'] || "").trim(); if(name) profs[name] = p; });
          setProfileData(profs);
        }
      });
    };
    loadData();
  }, []);

  // 集計データ（名鑑・イベント用）
  const aggregated = useMemo(() => {
    const cosplayers = {};
    const events = {};
    allData.forEach(d => {
      if (!cosplayers[d.cosplayer]) cosplayers[d.cosplayer] = { count: 0, latest: d.image };
      cosplayers[d.cosplayer].count++;
      if (d.event) {
        if (!events[d.event]) events[d.event] = { count: 0, latest: d.image };
        events[d.event].count++;
      }
    });
    return { cosplayers, events };
  }, [allData]);

  // フィルタリング
  useEffect(() => {
    let result = allData.filter(d => {
      const mMem = !activeFilters.member || d.member === activeFilters.member;
      const mCos = !activeFilters.cosplayer || d.cosplayer === activeFilters.cosplayer;
      const mEv = !activeFilters.event || d.event === activeFilters.event;
      const mTxt = !activeFilters.text || d.searchKey.includes(activeFilters.text);
      return mMem && mCos && mEv && mTxt;
    });
    if (currentSort === 'new') result.sort((a, b) => b._id - a._id);
    else if (currentSort === 'old') result.sort((a, b) => a._id - b._id);
    else if (currentSort === 'random') result.sort(() => Math.random() - 0.5);
    setFilteredData(result);
  }, [allData, activeFilters, currentSort]);

  const runDiagnosis = (member) => {
    const list = allData.filter(d => d.member === member);
    if (list.length === 0) return;
    const pick = list[Math.floor(Math.random() * list.length)];
    setDiagResult(pick);
    setDiagnosisStep(2);
  };

  return (
    <>
      <Head><title>VSPO! COSPLAY ARCHIVE</title></Head>

      <div className={`overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header"><span className="sidebar-title">MENU</span></div>
        <div className="menu-item" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""}); setIsMenuOpen(false);}}><i className="fas fa-home"></i> ホーム</div>
        <div className="menu-item" onClick={() => {setViewMode('directory'); setIsMenuOpen(false);}}><i className="fas fa-users"></i> レイヤー名鑑</div>
        <div className="menu-item" onClick={() => {setViewMode('events'); setIsMenuOpen(false);}}><i className="fas fa-calendar-alt"></i> イベントアーカイブ</div>
        <div className="menu-divider"></div>
        <div className="menu-item" onClick={() => {setDiagnosisStep(1); setIsMenuOpen(false);}}><i className="fas fa-magic"></i> 運命の1枚ガチャ</div>
      </aside>

      <header>
        <div className="header-left">
          <button className="menu-btn" onClick={() => setIsMenuOpen(true)}><i className="fas fa-bars"></i></button>
          <div className="site-title" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""});}}>
            <i className="fas fa-camera site-logo-icon"></i>
            <span className="title-text">ARCHIVE</span>
          </div>
        </div>
        <div className="header-right">
          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input type="text" className="search-input" placeholder="Search..." onChange={(e) => setActiveFilters(prev => ({...prev, text: e.target.value.toLowerCase()}))} />
          </div>
        </div>
      </header>

      <main>
        {viewMode === 'home' && (
          <>
            {!activeFilters.cosplayer && !activeFilters.event && (
              <div className="stories-container">
                {stories.map((s, idx) => (
                  <div key={s.member} className="story-item" onClick={() => setActiveStory({ memberIndex: idx, slideIndex: 0 })}>
                    <div className="story-ring"><img src={getTwitterUrl(s.images[0].image, 'thumb')} className="story-img" alt="" /></div>
                    <span className="story-name">{s.member}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ダッシュボード (イベント/レイヤー共通) */}
            {(activeFilters.cosplayer || activeFilters.event) && (
              <div className="dashboard-container">
                <div className="profile-header-main">
                  <h2 className="profile-name">
                    <i className={activeFilters.event ? "fas fa-calendar-alt" : "fas fa-user-check"}></i> {activeFilters.event || activeFilters.cosplayer}
                  </h2>
                  <button className="btn-share-profile" onClick={() => setActiveFilters({member:null,cosplayer:null,event:null,text:""})}><i className="fas fa-times"></i> Close</button>
                </div>
                <div className="stat-card" style={{display:'inline-block', padding:'10px 20px'}}><div className="stat-val">{filteredData.length}</div><div className="stat-label">Photos Found</div></div>
              </div>
            )}

            <div className="top-area">
              <div className="chips-container">
                <span className={`member-chip ${!activeFilters.member ? 'active' : ''}`} onClick={() => setActiveFilters(prev => ({...prev, member: null}))}>🏠 All</span>
                {memberOrder.map(m => (
                  <span key={m} className={`member-chip ${activeFilters.member === m ? 'active' : ''}`} onClick={() => setActiveFilters(prev => ({...prev, member: m}))}>
                    {memberIcons[m]} {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="masonry-grid">
              {filteredData.slice(0, displayLimit).map((item) => (
                <div key={item._id} className="card">
                  <div className="card-img-area" onClick={() => setModalImage(item)}>
                    <Image src={getTwitterUrl(item.image, 'medium')} alt={item.member} width={400} height={600} className="main-img" />
                  </div>
                  <div className="card-meta" onClick={() => setActiveFilters(prev => ({...prev, cosplayer: item.cosplayer}))}>
                    <img src={getTwitterUrl(item.image, 'thumb')} className="card-avatar" alt="" />
                    <div className="card-texts">
                      <div className="card-title">{item.cosplayer}</div>
                      <div className="card-subtitle">{memberIcons[item.member]} {item.member}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {viewMode === 'directory' && (
          <div className="view-grid-container">
            <h2 className="view-title"><i className="fas fa-users"></i> レイヤー名鑑</h2>
            <div className="dir-grid">
              {Object.keys(aggregated.cosplayers).sort((a,b) => aggregated.cosplayers[b].count - aggregated.cosplayers[a].count).map(name => (
                <div key={name} className="dir-card" onClick={() => {setActiveFilters(prev => ({...prev, cosplayer: name})); setViewMode('home');}}>
                  <img src={getTwitterUrl(aggregated.cosplayers[name].latest, 'thumb')} alt="" className="dir-avatar" />
                  <div>
                    <div className="dir-name">{name}</div>
                    <div className="dir-count">{aggregated.cosplayers[name].count} Photos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'events' && (
          <div className="view-grid-container">
            <h2 className="view-title"><i className="fas fa-calendar-alt"></i> イベントアーカイブ</h2>
            <div className="dir-grid">
              {Object.keys(aggregated.events).sort((a,b) => aggregated.events[b].count - aggregated.events[a].count).map(ev => (
                <div key={ev} className="ev-card" style={{backgroundImage: `url(${getTwitterUrl(aggregated.events[ev].latest, 'medium')})`}} onClick={() => {setActiveFilters(prev => ({...prev, event: ev})); setViewMode('home');}}>
                  <div className="ev-overlay">
                    <div className="ev-name">{ev}</div>
                    <div className="ev-count">{aggregated.events[ev].count} Photos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ガチャ (診断) モーダル */}
      {diagnosisStep > 0 && (
        <div className="modal open" onClick={() => setDiagnosisStep(0)}>
          <div className="diag-container" onClick={e => e.stopPropagation()}>
            {diagnosisStep === 1 ? (
              <>
                <h3>誰を引く？</h3>
                <div className="diag-grid">
                  {memberOrder.map(m => (
                    <button key={m} className="diag-btn" onClick={() => runDiagnosis(m)}>{memberIcons[m]}<br/>{m}</button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{textAlign:'center'}}>
                <h2 style={{color:'var(--primary)'}}>✨ 運命の1枚 ✨</h2>
                <img src={getTwitterUrl(diagResult.image, 'large')} className="diag-result-img" alt="" onClick={() => setModalImage(diagResult)} />
                <p><b>{diagResult.cosplayer}</b> さん</p>
                <button className="btn-sns" onClick={() => setDiagnosisStep(1)}>もう一度引く</button>
              </div>
            )}
            <button className="modal-close" onClick={() => setDiagnosisStep(0)}>&times;</button>
          </div>
        </div>
      )}

      {/* ストーリービューワー (既存維持) */}
      {activeStory && (
        <div className="story-viewer" onClick={() => setActiveStory(null)}>
          <div className="story-progress-bar">
            {stories[activeStory.memberIndex].images.map((_, i) => (
              <div key={i} className="story-progress-segment">
                <div className="story-progress-fill" style={{ width: i <= activeStory.slideIndex ? '100%' : '0%', transition: i === activeStory.slideIndex ? 'width 4s linear' : 'none' }}></div>
              </div>
            ))}
          </div>
          <div className="story-content" onClick={e => e.stopPropagation()}>
            <img src={getTwitterUrl(stories[activeStory.memberIndex].images[activeStory.slideIndex].image, 'large')} className="story-main-img" alt="" />
            <div className="story-header-info">{memberIcons[stories[activeStory.memberIndex].member]} {stories[activeStory.memberIndex].member}</div>
            <div className="story-nav right" onClick={() => {
              if (activeStory.slideIndex < stories[activeStory.memberIndex].images.length - 1) setActiveStory(prev => ({...prev, slideIndex: prev.slideIndex + 1}));
              else setActiveStory(null);
            }}></div>
          </div>
        </div>
      )}

      {modalImage && (
        <div className="modal open" onClick={() => setModalImage(null)}>
          <span className="modal-close">&times;</span>
          <img src={getTwitterUrl(modalImage.image, 'large')} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <style jsx global>{`
        :root { --bg-color: #0f0f0f; --text-color: #f1f1f1; --primary: #3ea6ff; --header-height: 60px; --sidebar-w: 260px; }
        body { background: var(--bg-color); color: var(--text-color); font-family: sans-serif; margin: 0; padding-top: var(--header-height); overflow-x: hidden; }
        
        header { position: fixed; top: 0; width: 100%; height: var(--header-height); background: rgba(15,15,15,0.95); backdrop-filter: blur(10px); z-index: 1000; display: flex; align-items: center; padding: 0 15px; border-bottom: 1px solid #222; }
        .menu-btn { background: none; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; margin-right: 15px; }
        .site-title { font-weight: 800; display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .site-logo-icon { background: linear-gradient(135deg, #3b82f6 0%, #d946ef 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        /* サイドバー */
        .sidebar { position: fixed; top: 0; left: calc(-1 * var(--sidebar-w)); width: var(--sidebar-w); height: 100%; background: #0f0f0f; z-index: 2001; transition: 0.3s; padding: 20px; border-right: 1px solid #333; }
        .sidebar.open { left: 0; }
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 2000; display: none; }
        .overlay.open { display: block; }
        .menu-item { padding: 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 15px; font-weight: bold; }
        .menu-item:hover { background: #222; }
        .menu-divider { height: 1px; background: #333; margin: 15px 0; }

        /* グリッド表示 */
        .view-grid-container { padding: 20px; animation: fadeIn 0.4s; }
        .view-title { font-size: 1.5rem; margin-bottom: 20px; color: var(--primary); }
        .dir-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; }
        .dir-card { background: #1a1a1a; padding: 12px; border-radius: 12px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: 0.2s; }
        .dir-card:hover { transform: translateY(-3px); background: #222; }
        .dir-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
        .dir-name { font-weight: bold; }
        .dir-count { font-size: 0.8rem; color: #aaa; }

        .ev-card { height: 120px; border-radius: 12px; background-size: cover; background-position: center; overflow: hidden; position: relative; cursor: pointer; }
        .ev-overlay { position: absolute; bottom: 0; width: 100%; height: 100%; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); display: flex; flex-direction: column; justify-content: flex-end; padding: 15px; }
        .ev-name { font-weight: bold; font-size: 1.1rem; }

        /* ガチャ */
        .diag-container { background: #1a1a1a; padding: 25px; border-radius: 20px; width: 90%; max-width: 450px; max-height: 80vh; overflow-y: auto; }
        .diag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px; }
        .diag-btn { background: #333; border: none; color: #fff; padding: 10px; border-radius: 10px; cursor: pointer; font-size: 0.8rem; }
        .diag-result-img { width: 100%; border-radius: 12px; margin: 15px 0; cursor: pointer; }

        /* 既存デザインの調整 */
        .stories-container { display: flex; gap: 15px; overflow-x: auto; padding: 15px; scrollbar-width: none; }
        .story-item { flex-shrink: 0; width: 70px; text-align: center; cursor: pointer; }
        .story-ring { width: 66px; height: 66px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, #3b82f6 0%, #d946ef 100%); display: flex; align-items: center; justify-content: center; }
        .story-img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #000; }
        .story-name { font-size: 0.65rem; color: #aaa; margin-top: 5px; display: block; }
        .masonry-grid { column-count: 2; column-gap: 15px; padding: 15px; }
        @media (min-width: 768px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 1200px) { .masonry-grid { column-count: 5; } }
        .card { break-inside: avoid; margin-bottom: 20px; }
        .card-img-area { border-radius: 12px; overflow: hidden; background: #222; }
        .card-img-area :global(img) { width: 100%; height: auto; display: block; }
        .card-meta { display: flex; gap: 10px; margin-top: 10px; cursor: pointer; }
        .card-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .modal { position: fixed; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: none; justify-content: center; align-items: center; z-index: 5000; }
        .modal.open { display: flex; }
        .modal img { max-height: 85vh; max-width: 95%; border-radius: 8px; }
        .modal-close { position: absolute; top: 20px; right: 20px; font-size: 2.5rem; color: #fff; cursor: pointer; }
        .search-box { background: #121212; border: 1px solid #303030; border-radius: 20px; padding: 5px 15px; display: flex; align-items: center; flex: 1; max-width: 400px; margin-left: 20px; }
        .search-input { background: none; border: none; color: #fff; outline: none; margin-left: 8px; font-size: 0.9rem; width: 100%; }
        
        .dashboard-container { padding: 20px; background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, var(--bg-color) 100%); border-bottom: 1px solid #333; }
        .profile-header-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .btn-sns { background: var(--primary); color: #fff; padding: 8px 20px; border-radius: 20px; text-decoration: none; font-size: 0.8rem; border:none; cursor:pointer; }
        .top-area { background: var(--bg-color); position: sticky; top: var(--header-height); z-index: 900; }
        .chips-container { display: flex; gap: 8px; overflow-x: auto; padding: 10px 15px; scrollbar-width: none; }
        .member-chip { background: #272727; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; cursor: pointer; white-space: nowrap; }
        .member-chip.active { background: #fff; color: #000; font-weight: bold; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </>
  );
}
