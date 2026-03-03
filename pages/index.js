import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';

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
  const [diagStep, setDiagStep] = useState(0); 
  const [diagResult, setDiagResult] = useState(null);
  const storyTimer = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, {
        download: true, header: true, complete: (res) => {
          const formatted = res.data.filter(d => d.image || d.url).map((d, i) => ({
            _id: i,
            member: (d.member || d['名前'] || "").trim(),
            image: d.image || d['url'],
            cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
            event: (d.Event || d['イベント'] || "").trim(),
            searchKey: `${d.member} ${d.cosplayer} ${d.Event}`.toLowerCase()
          }));
          setAllData(formatted);

          const today = new Date().toISOString().slice(0, 10);
          const cacheKey = `v_st_v3_${today}`;
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

  // 名鑑・イベントの集計
  const aggregated = useMemo(() => {
    const cos = {}; const evs = {};
    allData.forEach(d => {
      if (!cos[d.cosplayer]) cos[d.cosplayer] = { count: 0, latest: d.image };
      cos[d.cosplayer].count++;
      if (d.event) {
        if (!evs[d.event]) evs[d.event] = { count: 0, latest: d.image };
        evs[d.event].count++;
      }
    });
    return { cos, evs };
  }, [allData]);

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

  const nextSlide = () => {
    setActiveStory(prev => {
      if (!prev) return null;
      const current = stories[prev.memberIndex];
      if (prev.slideIndex < current.images.length - 1) return { ...prev, slideIndex: prev.slideIndex + 1 };
      return null;
    });
  };

  useEffect(() => {
    if (activeStory) { clearTimeout(storyTimer.current); storyTimer.current = setTimeout(nextSlide, 4000); }
    return () => clearTimeout(storyTimer.current);
  }, [activeStory]);

  return (
    <div className="app-container">
      <Head>
        <title>VSPO! COSPLAY ARCHIVE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </Head>

      {/* サイドバーとオーバーレイ */}
      <div className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`main-sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span>MENU</span>
          <button className="close-sidebar" onClick={() => setIsMenuOpen(false)}>&times;</button>
        </div>
        <nav>
          <div className="nav-item" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""}); setIsMenuOpen(false);}}>
            <i className="fas fa-home"></i> ホーム
          </div>
          <div className="nav-item" onClick={() => {setViewMode('directory'); setIsMenuOpen(false);}}>
            <i className="fas fa-users"></i> レイヤー名鑑
          </div>
          <div className="nav-item" onClick={() => {setViewMode('events'); setIsMenuOpen(false);}}>
            <i className="fas fa-calendar-alt"></i> イベントアーカイブ
          </div>
          <div className="divider"></div>
          <div className="nav-item diagnosis" onClick={() => {setDiagStep(1); setIsMenuOpen(false);}}>
            <i className="fas fa-magic"></i> 推しフォト診断
          </div>
        </nav>
      </aside>

      <header className="main-header">
        <button className="burger-menu" onClick={() => setIsMenuOpen(true)}><i className="fas fa-bars"></i></button>
        <div className="header-logo" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""});}}>
          <i className="fas fa-camera logo-icon"></i>
          <span className="logo-text">VSPO! ARCHIVE</span>
        </div>
        <div className="header-search">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search..." onChange={(e) => setActiveFilters(prev => ({...prev, text: e.target.value.toLowerCase()}))} />
        </div>
      </header>

      <main className="content-area">
        {viewMode === 'home' && (
          <>
            {/* ストーリー表示 */}
            {!activeFilters.cosplayer && !activeFilters.event && (
              <div className="story-strip">
                {stories.map((s, idx) => (
                  <div key={s.member} className="story-node" onClick={() => setActiveStory({ memberIndex: idx, slideIndex: 0 })}>
                    <div className="ring"><img src={getTwitterUrl(s.images[0].image, 'thumb')} alt="" /></div>
                    <span className="name">{s.member}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ダッシュボード表示 */}
            {(activeFilters.cosplayer || activeFilters.event) && (
              <div className="dash-box">
                <h2><i className={activeFilters.event ? "fas fa-calendar-alt" : "fas fa-user-check"}></i> {activeFilters.event || activeFilters.cosplayer}</h2>
                <div className="dash-info">
                  <span><b>{filteredData.length}</b> Photos</span>
                  <button className="dash-close" onClick={() => setActiveFilters(p => ({...p, cosplayer:null, event:null}))}>絞り込み解除</button>
                </div>
              </div>
            )}

            <div className="sticky-chips">
              <div className="chip-list">
                <span className={!activeFilters.member ? 'active' : ''} onClick={() => setActiveFilters(p => ({...p, member:null}))}>🏠 All</span>
                {memberOrder.map(m => <span key={m} className={activeFilters.member === m ? 'active' : ''} onClick={() => setActiveFilters(p => ({...p, member:m}))}>{memberIcons[m]} {m}</span>)}
              </div>
            </div>

            <div className="masonry-layout">
              {filteredData.slice(0, displayLimit).map(item => (
                <div key={item._id} className="item-card">
                  <div className="card-media" onClick={() => setModalImage(item)}>
                    <img src={getTwitterUrl(item.image, 'medium')} alt={item.member} loading="lazy" />
                  </div>
                  <div className="card-body" onClick={() => setActiveFilters(p => ({...p, cosplayer: item.cosplayer}))}>
                    <img src={getTwitterUrl(item.image, 'thumb')} className="user-avatar" alt="" />
                    <div className="user-info">
                      <div className="user-name">{item.cosplayer}</div>
                      <div className="meta-text">{memberIcons[item.member]} {item.member}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {viewMode === 'directory' && (
          <div className="special-view">
            <h3><i className="fas fa-users"></i> レイヤー名鑑</h3>
            <div className="grid-list">
              {Object.keys(aggregated.cos).sort((a,b) => aggregated.cos[b].count - aggregated.cos[a].count).map(name => (
                <div key={name} className="list-card" onClick={() => {setActiveFilters(prev => ({...prev, cosplayer: name})); setViewMode('home');}}>
                  <img src={getTwitterUrl(aggregated.cos[name].latest, 'thumb')} alt="" />
                  <div className="text-box"><b>{name}</b><span>{aggregated.cos[name].count} Photos</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'events' && (
          <div className="special-view">
            <h3><i className="fas fa-calendar-alt"></i> イベントアーカイブ</h3>
            <div className="grid-list">
              {Object.keys(aggregated.evs).sort((a,b) => aggregated.evs[b].count - aggregated.evs[a].count).map(ev => (
                <div key={ev} className="event-item" style={{backgroundImage: `url(${getTwitterUrl(aggregated.evs[ev].latest, 'medium')})`}} onClick={() => {setActiveFilters(prev => ({...prev, event: ev})); setViewMode('home');}}>
                  <div className="event-inner"><b>{ev}</b><span>{aggregated.evs[ev].count} Photos</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 診断（ガチャ）モーダル */}
      {diagStep > 0 && (
        <div className="fixed-modal" onClick={() => setDiagStep(0)}>
          <div className="modal-body" onClick={e => e.stopPropagation()}>
            {diagStep === 1 ? (
              <div className="member-picker">
                <h3>誰を引く？</h3>
                <div className="picker-grid">
                  {memberOrder.map(m => <button key={m} onClick={() => {
                    const list = allData.filter(d => d.member === m);
                    if(list.length) { setDiagResult(list[Math.floor(Math.random()*list.length)]); setDiagStep(2); }
                  }}>{memberIcons[m]}<br/>{m}</button>)}
                </div>
              </div>
            ) : (
              <div className="diag-res">
                <h3>✨ 運命の1枚 ✨</h3>
                <img src={getTwitterUrl(diagResult.image, 'large')} alt="" onClick={() => setModalImage(diagResult)} />
                <p><b>{diagResult.cosplayer}</b> さん</p>
                <button className="retry-btn" onClick={() => setDiagStep(1)}>もう一度引く</button>
              </div>
            )}
            <button className="abs-close" onClick={() => setDiagStep(0)}>&times;</button>
          </div>
        </div>
      )}

      {/* ストーリービューワー */}
      {activeStory && (
        <div className="story-full-screen" onClick={() => setActiveStory(null)}>
          <div className="bar-container">
            {stories[activeStory.memberIndex].images.map((_, i) => (
              <div key={i} className="bar-track"><div className="bar-fill" style={{ width: i <= activeStory.slideIndex ? '100%' : '0%', transition: i === activeStory.slideIndex ? 'width 4s linear' : 'none' }}></div></div>
            ))}
          </div>
          <div className="story-img-wrap" onClick={e => e.stopPropagation()}>
            <img src={getTwitterUrl(stories[activeStory.memberIndex].images[activeStory.slideIndex].image, 'large')} alt="" />
            <div className="nav-area right" onClick={nextSlide}></div>
          </div>
        </div>
      )}

      {modalImage && <div className="img-overlay" onClick={() => setModalImage(null)}><img src={getTwitterUrl(modalImage.image, 'large')} alt="" /></div>}

      <style jsx global>{`
        :root { --dark: #0f0f0f; --accent: #3ea6ff; --h: 60px; }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--dark); color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        
        /* 帯を消すための重要設定 */
        .app-container { width: 100%; min-height: 100vh; position: relative; overflow-x: hidden; }
        .content-area { width: 100%; padding-top: var(--h); }

        /* ヘッダー */
        .main-header { position: fixed; top: 0; left: 0; width: 100%; height: var(--h); background: rgba(15,15,15,0.9); backdrop-filter: blur(15px); z-index: 1000; display: flex; align-items: center; padding: 0 15px; border-bottom: 1px solid #333; gap: 15px; }
        .burger-menu { background: none; border: none; color: #fff; font-size: 1.3rem; cursor: pointer; }
        .header-logo { display: flex; align-items: center; gap: 8px; cursor: pointer; white-space: nowrap; }
        .logo-icon { background: linear-gradient(135deg, #3b82f6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.2rem; }
        .logo-text { font-weight: 800; font-size: 0.9rem; }
        .header-search { background: #222; border-radius: 20px; padding: 6px 15px; display: flex; align-items: center; flex: 1; max-width: 400px; }
        .header-search input { background: none; border: none; color: #fff; outline: none; margin-left: 10px; width: 100%; }

        /* サイドバー */
        .main-sidebar { position: fixed; top: 0; left: -280px; width: 280px; height: 100%; background: #0a0a0a; z-index: 2000; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); padding: 20px; border-right: 1px solid #333; }
        .main-sidebar.open { left: 0; }
        .sidebar-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1500; display: none; }
        .sidebar-overlay.open { display: block; }
        .nav-item { padding: 12px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; gap: 15px; font-weight: bold; transition: 0.2s; }
        .nav-item:hover { background: #222; }
        .divider { height: 1px; background: #333; margin: 15px 0; }

        /* ストーリー */
        .story-strip { display: flex; gap: 15px; overflow-x: auto; padding: 20px 15px; scrollbar-width: none; background: #000; }
        .story-node { flex-shrink: 0; width: 75px; text-align: center; cursor: pointer; }
        .ring { width: 70px; height: 70px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, #3b82f6, #d946ef); display: flex; align-items: center; justify-content: center; }
        .ring img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid #000; }
        .name { font-size: 0.65rem; color: #aaa; margin-top: 6px; display: block; }

        /* Masonry: 比率維持 */
        .masonry-layout { column-count: 2; column-gap: 12px; padding: 12px; }
        @media (min-width: 768px) { .masonry-layout { column-count: 3; } @media (min-width: 1200px) { .masonry-layout { column-count: 5; } } }
        .item-card { break-inside: avoid; margin-bottom: 20px; }
        .card-media { border-radius: 12px; overflow: hidden; background: #1a1a1a; cursor: pointer; }
        .card-media img { width: 100%; height: auto; display: block; transition: 0.4s; }
        .card-body { display: flex; gap: 10px; margin-top: 10px; cursor: pointer; align-items: center; }
        .user-avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }
        .user-name { font-weight: bold; font-size: 0.85rem; }
        .meta-text { font-size: 0.7rem; color: #aaa; }

        /* 特殊ビュー */
        .special-view { padding: 20px; animation: fadeIn 0.3s; }
        .grid-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
        .list-card { background: #1a1a1a; padding: 10px; border-radius: 12px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .list-card img { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
        .event-item { height: 130px; border-radius: 12px; background-size: cover; background-position: center; cursor: pointer; position: relative; overflow: hidden; }
        .event-inner { position: absolute; bottom: 0; width: 100%; background: linear-gradient(transparent, rgba(0,0,0,0.9)); padding: 15px; }

        .img-overlay { position: fixed; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .img-overlay img { max-height: 90vh; max-width: 100%; border-radius: 8px; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  );
}
