import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";
const PROFILE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=1592730885&single=true&output=csv";

const memberOrder = ["花芽すみれ", "花芽なずな", "小雀とと", "一ノ瀬うるは", "胡桃のあ", "兎咲ミミ", "空澄セナ", "橘ひなの", "英リサ", "如月れん", "神成きゅぴ", "八雲べに", "藍沢エマ", "紫宮るな", "猫汰つな", "白波らむね", "小森めと", "夢野あかり", "夜乃くろむ", "紡木こかげ", "千燈ゆうひ", "蝶屋はなび", "甘結もか"];
const memberIcons = { "花芽すみれ": "👾💤", "花芽なずな": "🍣", "小雀とと": "🔫🐥", "一ノ瀬うるは": "🌠", "胡桃のあ": "🧸♔", "橘ひなの": "🍫💘", "如月れん": "⏰", "英リサ": "💐", "空澄セナ": "🗝♠︎", "兎咲ミミ": "🐰🍭", "神成きゅぴ": "🌩", "八雲べに": "💄💚", "藍沢エマ": "🥞💫", "紫宮るな": "☪🐾", "猫汰つな": "🍒✨", "白波らむね": "🐻‍❄️🏖", "小森めと": "🪐", "夢野あかり": "🍼", "夜乃くろむ": "💀⛓", "紡木こかげ": "📘💧", "千燈ゆうひ": "🫠", "蝶屋はなび": "🦋🎆", "甘結もか": "🕹🔖", "銀城サイネ": "🎈", "龍巻ちせ": "🐉🌪" };

const getTwitterUrl = (url, size = 'medium') => {
  if (!url || !url.includes('pbs.twimg.com')) return url;
  return `${url.split('?')[0]}?format=jpg&name=${size}`;
};

export default function Home() {
  // --- States ---
  const [allData, setAllData] = useState([]);
  const [profileData, setProfileData] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(40);
  const [activeFilters, setActiveFilters] = useState({ member: null, cosplayer: null, event: null, text: "" });
  const [currentSort, setCurrentSort] = useState('new');
  const [viewMode, setViewMode] = useState('home'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [diagStep, setDiagStep] = useState(0); 
  const [diagResult, setDiagResult] = useState(null);
  const storyTimer = useRef(null);

  // --- Data Loading ---
  useEffect(() => {
    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, {
        download: true, header: true, complete: (res) => {
          const formatted = res.data.filter(d => d.image || d.url || d['画像'] || d['URL']).map((d, i) => ({
            _id: i,
            member: (d.member || d['名前'] || "").trim(),
            image: d.image || d.url || d['画像'] || d['URL'],
            link: (d.link || d['URL'] || d.url || "").trim(),
            cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
            event: (d.event || d.Event || d['イベント'] || "").trim(),
            searchKey: `${d.member} ${d.cosplayer} ${d.event || d.Event || d['イベント']}`.toLowerCase()
          }));
          setAllData(formatted);

          // Stories Cache
          const today = new Date().toISOString().slice(0, 10);
          const cacheKey = `v_full_stories_${today}`;
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

  // --- Aggregation ---
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

  const stats = useMemo(() => {
    if (!activeFilters.cosplayer) return null;
    const cleanName = activeFilters.cosplayer.replace(/さん$/, '');
    const profKey = Object.keys(profileData).find(k => k.replace(/さん$/, '') === cleanName) || activeFilters.cosplayer;
    const prof = profileData[profKey] || {};
    const myPhotos = allData.filter(d => d.cosplayer === activeFilters.cosplayer);
    const memberCounts = {};
    myPhotos.forEach(d => { memberCounts[d.member] = (memberCounts[d.member] || 0) + 1; });
    const getSns = (kw) => { const k = Object.keys(prof).find(key => kw.some(w => key.toLowerCase().includes(w))); return k ? prof[k].trim() : null; };
    return { total: myPhotos.length, breakdown: memberCounts, sns: { twitter: getSns(['twitter', 'x', '𝕏']), insta: getSns(['insta', 'instagram']) } };
  }, [activeFilters.cosplayer, allData, profileData]);

  // --- Filter & Sort ---
  useEffect(() => {
    let result = [...allData].filter(d => {
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

  // --- Story Logic ---
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
    <div className="site-root-container">
      <Head>
        <title>VSPO! COSPLAY ARCHIVE</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;800&family=Playfair+Display:ital,wght@1,900&display=swap" rel="stylesheet" />
      </Head>

      {/* --- HEADER --- */}
      <header className="vspo-main-header">
        <div className="header-content-inner">
          <div className="header-left-box">
            <button className="h-menu-btn" onClick={() => setIsMenuOpen(true)}><i className="fas fa-bars"></i></button>
            <div className="h-brand-logo" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""}); setDiagStep(0); window.scrollTo({top:0,behavior:'smooth'});}}>
              <i className="fas fa-camera logo-icon-gradient"></i>
              <span className="logo-text">VSPO! ARCHIVE</span>
            </div>
          </div>
          <div className="header-right-box">
            <div className="h-search-pill">
              <i className="fas fa-search"></i>
              <input type="text" placeholder="Search Archives..." onChange={(e) => setActiveFilters(prev => ({...prev, text: e.target.value.toLowerCase()}))} />
            </div>
          </div>
        </div>
      </header>

      {/* --- SIDEBAR --- */}
      <div className={`v-overlay ${isMenuOpen ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`v-sidebar ${isMenuOpen ? 'active' : ''}`}>
        <div className="sidebar-header-area">
          <span className="sidebar-label-text">NAVIGATION</span>
          <button className="sidebar-close-x" onClick={() => setIsMenuOpen(false)}>&times;</button>
        </div>
        <div className="sidebar-nav-list">
          <div className="s-nav-item" onClick={() => {setViewMode('home'); setDiagStep(0); setIsMenuOpen(false);}}><i className="fas fa-th-large"></i> HOME</div>
          <div className="s-nav-item" onClick={() => {setViewMode('directory'); setIsMenuOpen(false);}}><i className="fas fa-id-badge"></i> DIRECTORY</div>
          <div className="s-nav-item" onClick={() => {setViewMode('events'); setIsMenuOpen(false);}}><i className="fas fa-calendar-alt"></i> EVENTS</div>
          
          <div className="s-nav-divider">PRO TOOLS</div>
          <Link href="/chronicle"><div className="s-nav-item special-c"><i className="fas fa-project-diagram"></i> CHRONICLE MAP</div></Link>
          <Link href="/tracker"><div className="s-nav-item special-p"><i className="fas fa-cut"></i> COSTUME TRACKER</div></Link>
          <Link href="/log"><div className="s-nav-item special-g"><i className="fas fa-journal-whills"></i> OSHIGOTO LOG</div></Link>
          
          <div className="s-nav-divider">FUN</div>
          <div className="s-nav-item" onClick={() => {setDiagStep(1); setIsMenuOpen(false);}}><i className="fas fa-magic"></i> 推しフォト診断</div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="vspo-main-content">
        {viewMode === 'home' && diagStep === 0 && (
          <div className="home-view-container">
            
            {/* 復刻：インスタストーリー風UI */}
            {!activeFilters.member && !activeFilters.cosplayer && !activeFilters.event && !activeFilters.text && (
              <div className="insta-stories-shelf">
                {stories.map((s, idx) => (
                  <div key={s.member} className="insta-story-node" onClick={() => setActiveStory({ memberIndex: idx, slideIndex: 0 })}>
                    <div className="insta-ring-gradient">
                      <div className="insta-inner-black">
                        <img src={getTwitterUrl(s.images[0].image, 'thumb')} alt="" />
                      </div>
                    </div>
                    <span className="insta-node-label">{s.member}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Filter/Profile Hero */}
            {(activeFilters.cosplayer || activeFilters.event) && (
              <div className="editorial-hero">
                <div className="hero-body">
                  <h1 className="hero-title-text">{activeFilters.cosplayer || activeFilters.event}</h1>
                  <div className="hero-metadata-row">
                    <span className="hero-badge-pill"><i className="fas fa-images"></i> {filteredData.length} 作品</span>
                    {stats?.sns.twitter && <a href={stats.sns.twitter} target="_blank" rel="noreferrer" className="hero-badge-pill sns-btn">Twitter</a>}
                    <button className="hero-badge-pill close-btn" onClick={() => setActiveFilters(p => ({...p, cosplayer:null, event:null}))}><i className="fas fa-times"></i></button>
                  </div>
                  {stats && (
                    <div className="hero-breakdown-row">
                      {Object.entries(stats.breakdown).map(([m, count]) => (
                        <span key={m} className="hero-mini-chip">{memberIcons[m]} {m} <span className="count-val">{count}</span></span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 鉄壁のフィルター・ソートバー */}
            <div className="vspo-sticky-bar-wrapper">
              <div className="vspo-filter-bar">
                <div className="f-member-chips-scroll">
                  <button className={`f-chip ${!activeFilters.member ? 'active' : ''}`} onClick={() => setActiveFilters(p => ({...p, member:null}))}>ALL</button>
                  {memberOrder.map(m => (
                    <button key={m} className={`f-chip ${activeFilters.member === m ? 'active' : ''}`} onClick={() => setActiveFilters(p => ({...p, member:m}))}>
                      {memberIcons[m]} {m}
                    </button>
                  ))}
                </div>
                <div className="f-sort-tools">
                  <button className={`sort-icon-btn ${currentSort === 'old' ? 'active' : ''}`} onClick={() => setCurrentSort('old')} title="登録順"><i className="fas fa-history"></i></button>
                  <button className={`sort-icon-btn ${currentSort === 'new' ? 'active' : ''}`} onClick={() => setCurrentSort('new')} title="新着順"><i className="fas fa-sparkles"></i></button>
                  <button className={`sort-icon-btn ${currentSort === 'random' ? 'active' : ''}`} onClick={() => setCurrentSort('random')} title="シャッフル"><i className="fas fa-random"></i></button>
                </div>
              </div>
            </div>

            {/* 安定版フォトグリッド */}
            <div className="vspo-photo-grid">
              {filteredData.slice(0, displayLimit).map((item) => (
                <div key={item._id} className="vspo-card">
                  <div className="v-card-media-box">
                    <img className="v-card-img" src={getTwitterUrl(item.image, 'medium')} alt="" loading="lazy" onClick={() => setModalImage(item)} />
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noreferrer" className="v-x-link-overlay" title="Open 𝕏">
                        <i className="fa-brands fa-x-twitter"></i>
                      </a>
                    )}
                  </div>
                  <div className="v-card-info-box" onClick={() => setActiveFilters(prev => ({...prev, cosplayer: item.cosplayer}))}>
                    <div className="v-card-name-text">{item.cosplayer}</div>
                    <div className="v-card-sub-text">{memberIcons[item.member]} {item.member}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 名鑑 & イベント ビュー --- */}
        {(viewMode === 'directory' || viewMode === 'events') && (
          <div className="vspo-list-view-container">
            <h2 className="vspo-section-title">{viewMode === 'directory' ? 'DIRECTORY / レイヤー名鑑' : 'EVENTS / まとめ'}</h2>
            <div className="vspo-list-shelf">
              {Object.keys(viewMode === 'directory' ? aggregated.cos : aggregated.evs).sort((a,b) => (viewMode === 'directory' ? aggregated.cos[b].count - aggregated.cos[a].count : aggregated.evs[b].count - aggregated.evs[a].count)).map(key => (
                <div key={key} className="vspo-list-row" onClick={() => {setActiveFilters(p => ({...p, [viewMode === 'directory' ? 'cosplayer' : 'event']: key})); setViewMode('home');}}>
                  <div className="vspo-list-avatar"><img src={getTwitterUrl((viewMode === 'directory' ? aggregated.cos[key] : aggregated.evs[key]).latest, 'thumb')} alt="" /></div>
                  <div className="vspo-list-main-info"><div className="vspo-list-name">{key}</div><div className="vspo-list-count">{(viewMode === 'directory' ? aggregated.cos[key] : aggregated.evs[key]).count} Photos</div></div>
                  <i className="fas fa-chevron-right vspo-list-arrow"></i>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 診断ツール --- */}
        {diagStep > 0 && (
          <div className="vspo-diag-overlay">
            {diagStep === 1 ? (
              <div className="vspo-diag-modal-box">
                <h3 className="vspo-diag-h3">誰を引く？</h3>
                <div className="vspo-diag-selection-grid">
                  {memberOrder.map(m => <button key={m} className="vspo-diag-choice-btn" onClick={() => { const list = allData.filter(d => d.member === m); if(list.length) { setDiagResult(list[Math.floor(Math.random()*list.length)]); setDiagStep(2); } }}>{memberIcons[m]}<br/>{m}</button>)}
                </div>
                <button className="vspo-diag-close-btn" onClick={() => setDiagStep(0)}>CANCEL</button>
              </div>
            ) : (
              <div className="vspo-diag-result-container">
                <h3 className="vspo-diag-result-title">✨ DESTINY PHOTO ✨</h3>
                {diagResult && <img src={getTwitterUrl(diagResult.image, 'large')} className="vspo-diag-result-img" alt="" onClick={() => setModalImage(diagResult)} />}
                <p className="vspo-diag-result-name-text"><b>{diagResult?.cosplayer}</b> さん</p>
                <div className="vspo-diag-action-btns">
                  <button className="vspo-diag-action-main" onClick={() => setDiagStep(1)}>RETRY</button>
                  <button className="vspo-diag-action-main alt" onClick={() => setDiagStep(0)}>CLOSE</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- MODAL & STORY VIEWER --- */}
      {activeStory && (
        <div className="v-story-viewer-full" onClick={() => setActiveStory(null)}>
          <div className="v-story-progress-bar-container">
            {stories[activeStory.memberIndex].images.map((_, i) => (
              <div key={i} className="v-story-progress-segment"><div className="v-story-progress-fill" style={{ width: i < activeStory.slideIndex ? '100%' : (i === activeStory.slideIndex ? '100%' : '0%'), transition: i === activeStory.slideIndex ? '4s linear' : 'none' }}></div></div>
            ))}
          </div>
          <div className="v-story-content-box" onClick={e => e.stopPropagation()}>
            <img className="v-story-main-image" src={getTwitterUrl(stories[activeStory.memberIndex].images[activeStory.slideIndex].image, 'large')} alt="" />
            <div className="v-story-header-overlay">{memberIcons[stories[activeStory.memberIndex].member]} {stories[activeStory.memberIndex].member}</div>
            <div className="v-story-nav-hit left" onClick={() => setActiveStory(prev => ({...prev, slideIndex: Math.max(0, prev.slideIndex - 1)}))}></div>
            <div className="v-story-nav-hit right" onClick={nextSlide}></div>
          </div>
        </div>
      )}

      {modalImage && <div className="v-full-modal-overlay" onClick={() => setModalImage(null)}><img src={getTwitterUrl(modalImage.image, 'large')} alt="" /></div>}

      <style jsx global>{`
        :root { --v-bg: #0a0a0b; --v-cyan: #00f2ff; --v-pink: #ff00ff; --v-gold: #ffcc00; --v-text-dim: #88888e; --v-h: 70px; }
        
        /* 1. Global Reset & Band Fix */
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: var(--v-bg); overflow-x: hidden; }
        .site-root-container { width: 100%; position: relative; min-height: 100vh; }
        body { padding-top: var(--v-h); font-family: 'Montserrat', sans-serif; color: #fff; }

        /* 2. Header */
        .vspo-main-header { position: fixed; top: 0; left: 0; width: 100%; height: var(--v-h); background: #0a0a0b; z-index: 1200; border-bottom: 1px solid #222; }
        .header-content-inner { max-width: 1400px; margin: 0 auto; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; box-sizing: border-box; }
        .h-brand-logo { cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 14px; letter-spacing: 0.1em; }
        .logo-icon-gradient { font-size: 22px; background: linear-gradient(135deg, var(--v-cyan), var(--v-pink)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .h-search-pill { background: #161618; border-radius: 30px; padding: 8px 18px; display: flex; align-items: center; gap: 10px; border: 1px solid #333; transition: 0.3s; width: 180px; }
        .h-search-pill:focus-within { border-color: var(--v-cyan); width: 260px; }
        .h-search-pill input { background: none; border: none; color: #fff; outline: none; font-size: 13px; width: 100%; }
        .h-menu-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 10px; }

        /* 3. Sidebar */
        .v-sidebar { position: fixed; top: 0; left: -320px; width: 320px; height: 100%; background: #000; z-index: 3000; transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1); padding: 40px 30px; border-right: 1px solid #222; box-sizing: border-box; display: flex; flex-direction: column; }
        .v-sidebar.active { left: 0; }
        .v-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 2500; opacity: 0; pointer-events: none; transition: 0.3s; }
        .v-overlay.active { opacity: 1; pointer-events: auto; }
        .sidebar-header-area { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .sidebar-label-text { font-size: 10px; font-weight: 800; color: #444; letter-spacing: 0.2em; }
        .sidebar-close-x { background: none; border: none; color: #555; font-size: 30px; cursor: pointer; }
        .s-nav-item { padding: 15px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 15px; font-size: 13px; transition: 0.2s; }
        .s-nav-item:hover { background: rgba(255,255,255,0.05); }
        .s-nav-divider { font-size: 10px; font-weight: 800; color: #333; margin: 30px 0 10px 20px; letter-spacing: 0.2em; }
        .special-c { color: var(--v-cyan); background: rgba(0,242,255,0.03); margin-bottom: 5px; }
        .special-p { color: var(--v-pink); background: rgba(255,0,255,0.03); margin-bottom: 5px; }
        .special-g { color: var(--v-gold); background: rgba(255,204,0,0.03); margin-bottom: 5px; }

        /* 4. Insta Stories */
        .insta-stories-shelf { display: flex; gap: 20px; overflow-x: auto; padding: 25px 20px; border-bottom: 1px solid #1a1a1c; scrollbar-width: none; }
        .insta-story-node { text-align: center; flex-shrink: 0; cursor: pointer; transition: 0.3s; }
        .insta-story-node:hover { transform: scale(1.05); }
        .insta-ring-gradient { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--v-cyan), var(--v-pink)); display: flex; align-items: center; justify-content: center; }
        .insta-inner-black { width: 66px; height: 66px; border-radius: 50%; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .insta-inner-black img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }
        .insta-node-label { display: block; font-size: 10px; font-weight: 700; margin-top: 8px; color: var(--v-text-dim); }

        /* 5. Sticky Bar (The overlap fix) */
        .vspo-sticky-bar-wrapper { position: sticky; top: var(--v-h); z-index: 1000; background: #0a0a0b; }
        .vspo-filter-bar { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid #222; }
        .f-member-chips-scroll { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
        .f-chip { background: #1a1a1c; border: 1px solid #222; color: var(--v-text-dim); padding: 8px 18px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; transition: 0.3s; }
        .f-chip.active { background: #fff; color: #000; border-color: #fff; }
        .f-sort-tools { display: flex; gap: 6px; background: #1a1a1c; padding: 4px; border-radius: 12px; }
        .sort-icon-btn { background: none; border: none; color: #555; padding: 10px; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; transition: 0.3s; }
        .sort-icon-btn.active { background: #2a2a2c; color: var(--v-cyan); }

        /* 6. Grid & Card System */
        .vspo-main-content { max-width: 1400px; margin: 0 auto; width: 100%; }
        .vspo-photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 35px; padding: 35px 20px; box-sizing: border-box; }
        @media (max-width: 600px) { .vspo-photo-grid { grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 15px; } }
        
        .vspo-card { width: 100%; transition: 0.4s; position: relative; }
        .v-card-media-box { border-radius: 20px; overflow: hidden; background: #161618; position: relative; line-height: 0; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .v-card-img { width: 100%; height: auto; display: block; transition: 0.6s cubic-bezier(0.19, 1, 0.22, 1); cursor: pointer; }
        .vspo-card:hover { transform: translateY(-8px); }
        .vspo-card:hover .v-card-img { transform: scale(1.06); }
        
        .v-x-link-overlay { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; border: 1px solid rgba(255,255,255,0.2); transition: 0.3s; z-index: 10; font-size: 14px; text-decoration: none; }
        .v-x-link-overlay:hover { background: #fff; color: #000; transform: scale(1.1); }

        .v-card-info-box { padding: 15px 5px; cursor: pointer; }
        .v-card-name-text { font-size: 15px; font-weight: 800; color: #fff; }
        .v-card-sub-text { font-size: 11px; color: var(--v-text-dim); margin-top: 5px; font-weight: 700; }

        /* 7. Editorial Hero */
        .editorial-hero { padding: 80px 40px; background: radial-gradient(circle at top right, rgba(0,242,255,0.1), transparent); border-radius: 24px; margin: 20px; border: 1px solid #1a1a1c; }
        .hero-title-text { font-size: 52px; font-weight: 800; margin: 0 0 25px 0; letter-spacing: -0.02em; }
        .hero-metadata-row { display: flex; gap: 12px; margin-bottom: 25px; }
        .hero-badge-pill { background: #fff; color: #000; padding: 10px 24px; border-radius: 40px; font-size: 12px; font-weight: 800; border: none; cursor: pointer; text-decoration: none; }
        .hero-badge-pill.sns-btn { background: #000; color: #fff; border: 1px solid #333; }
        .hero-breakdown-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .hero-mini-chip { background: rgba(255,255,255,0.05); padding: 6px 14px; border-radius: 10px; font-size: 11px; font-weight: 700; border: 1px solid rgba(255,255,255,0.05); }

        /* 8. Diagnostic & Modal Styles */
        .vspo-diag-overlay { padding: 60px 20px; display: flex; flex-direction: column; align-items: center; min-height: 80vh; }
        .vspo-diag-modal-box { background: #111; padding: 50px; border-radius: 30px; max-width: 600px; text-align: center; border: 1px solid #222; }
        .vspo-diag-selection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; margin: 30px 0; }
        .vspo-diag-choice-btn { background: #1a1a1c; border: 1px solid #333; color: #fff; padding: 15px; border-radius: 15px; font-size: 11px; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .vspo-diag-result-container { text-align: center; max-width: 500px; }
        .vspo-diag-result-img { width: 100%; border-radius: 24px; margin: 25px 0; box-shadow: 0 30px 60px rgba(0,0,0,0.6); cursor: pointer; }
        .vspo-diag-action-main { background: #fff; color: #000; border: none; padding: 14px 35px; border-radius: 40px; font-weight: 800; margin: 10px; cursor: pointer; }
        .vspo-diag-action-main.alt { background: #1a1a1c; color: #fff; }

        /* 9. Story Viewer Fullscreen */
        .v-story-viewer-full { position: fixed; inset: 0; background: #000; z-index: 5000; display: flex; flex-direction: column; }
        .v-story-progress-bar-container { display: flex; gap: 6px; padding: 20px; }
        .v-story-progress-segment { flex: 1; height: 3px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden; }
        .v-story-progress-fill { height: 100%; background: #fff; width: 0; }
        .v-story-content-box { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; }
        .v-story-main-image { max-height: 100%; max-width: 100%; object-fit: contain; }
        .v-story-header-overlay { position: absolute; top: 30px; left: 30px; font-weight: 800; font-size: 18px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
        .v-story-nav-hit { position: absolute; top: 0; bottom: 0; width: 40%; cursor: pointer; }
        .v-story-nav-hit.left { left: 0; }
        .v-story-nav-hit.right { right: 0; }

        .v-full-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.98); z-index: 4000; display: flex; align-items: center; justify-content: center; }
        .v-full-modal-overlay img { max-height: 96vh; max-width: 96%; object-fit: contain; }

        /* 10. List Views */
        .vspo-list-view-container { padding: 60px 20px; max-width: 1100px; margin: 0 auto; }
        .vspo-list-shelf { display: flex; flex-direction: column; gap: 2px; background: #222; border-radius: 24px; overflow: hidden; }
        .vspo-list-row { background: #000; padding: 22px 30px; display: flex; align-items: center; gap: 25px; cursor: pointer; transition: 0.3s; }
        .vspo-list-row:hover { background: #0c0c0e; }
        .vspo-list-avatar img { width: 56px; height: 56px; border-radius: 14px; object-fit: cover; }
        .vspo-list-name { font-size: 18px; font-weight: 800; }
        .vspo-list-count { font-size: 12px; color: var(--v-text-dim); margin-top: 5px; font-weight: 700; }
      `}</style>
    </div>
  );
}
