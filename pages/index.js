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
  // States
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

  // Load Data
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

          const today = new Date().toISOString().slice(0, 10);
          const cacheKey = `v_full_final_${today}`;
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

  // Aggregation & Filters
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

  // Story Timer
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
    <div className="vspo-global-root">
      <Head>
        <title>VSPO! ARCHIVE PLATFORM</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* --- HEADER --- */}
      <header className="vspo-fixed-header">
        <div className="v-header-inner">
          <div className="v-header-left">
            <button className="v-menu-btn" onClick={() => setIsMenuOpen(true)}><i className="fas fa-bars"></i></button>
            <div className="v-logo-brand" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""}); setDiagStep(0); window.scrollTo({top:0,behavior:'smooth'});}}>
              <i className="fas fa-camera v-logo-gradient"></i>
              <span className="v-logo-text">VSPO! ARCHIVE</span>
            </div>
          </div>
          <div className="v-header-right">
            <div className="v-search-bar">
              <i className="fas fa-search"></i>
              <input type="text" placeholder="探索する..." onChange={(e) => setActiveFilters(prev => ({...prev, text: e.target.value.toLowerCase()}))} />
            </div>
          </div>
        </div>
      </header>

      {/* --- SIDEBAR --- */}
      <div className={`v-sidebar-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`v-sidebar-main ${isMenuOpen ? 'open' : ''}`}>
        <div className="v-sidebar-head">
          <span>PORTAL MENU</span>
          <button className="v-sidebar-close" onClick={() => setIsMenuOpen(false)}>&times;</button>
        </div>
        <div className="v-sidebar-list">
          <div className="v-side-item" onClick={() => {setViewMode('home'); setDiagStep(0); setIsMenuOpen(false);}}><i className="fas fa-th-large"></i> HOME</div>
          <div className="v-side-item" onClick={() => {setViewMode('directory'); setIsMenuOpen(false);}}><i className="fas fa-id-badge"></i> DIRECTORY</div>
          <div className="v-side-item" onClick={() => {setViewMode('events'); setIsMenuOpen(false);}}><i className="fas fa-calendar-alt"></i> EVENTS</div>
          <div className="v-side-divider">PRO TOOLS</div>
          <Link href="/chronicle"><div className="v-side-item special-c"><i className="fas fa-project-diagram"></i> CHRONICLE MAP</div></Link>
          <Link href="/tracker"><div className="v-side-item special-p"><i className="fas fa-cut"></i> COSTUME TRACKER</div></Link>
          <Link href="/log"><div className="v-side-item special-g"><i className="fas fa-journal-whills"></i> OSHIGOTO LOG</div></Link>
          <div className="v-side-divider">FUN</div>
          <div className="v-side-item" onClick={() => {setDiagStep(1); setIsMenuOpen(false);}}><i className="fas fa-magic"></i> 推しフォト診断</div>
        </div>
      </aside>

      <main className="vspo-main-content-area">
        {viewMode === 'home' && diagStep === 0 && (
          <div className="vspo-home-layer">
            
            {/* インスタストーリー風トレイ */}
            {!activeFilters.member && !activeFilters.cosplayer && !activeFilters.event && !activeFilters.text && (
              <div className="v-stories-shelf">
                {stories.map((s, idx) => (
                  <div key={s.member} className="v-story-icon-node" onClick={() => setActiveStory({ memberIndex: idx, slideIndex: 0 })}>
                    <div className="v-story-ring">
                      <div className="v-story-inner">
                        <img src={getTwitterUrl(s.images[0].image, 'thumb')} alt="" />
                      </div>
                    </div>
                    <span className="v-story-label">{s.member}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hero / Stats */}
            {(activeFilters.cosplayer || activeFilters.event) && (
              <div className="v-editorial-hero">
                <div className="v-hero-content">
                  <h1 className="v-hero-name">{activeFilters.cosplayer || activeFilters.event}</h1>
                  <div className="v-hero-meta">
                    <span className="v-hero-badge"><i className="fas fa-images"></i> {filteredData.length} ARCHIVES</span>
                    {stats?.sns.twitter && <a href={stats.sns.twitter} target="_blank" rel="noreferrer" className="v-hero-badge sns">Twitter</a>}
                    <button className="v-hero-badge close" onClick={() => setActiveFilters(p => ({...p, cosplayer:null, event:null}))}><i className="fas fa-times"></i></button>
                  </div>
                  {stats && (
                    <div className="v-hero-chips">
                      {Object.entries(stats.breakdown).map(([m, count]) => (
                        <span key={m} className="v-hero-chip">{memberIcons[m]} {m} <span className="v-h-val">{count}</span></span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 固定UIバー (背景を不透明化して被りを防止) */}
            <div className="vspo-sticky-wrapper">
              <div className="vspo-filter-bar-inner">
                <div className="v-member-chips">
                  <button className={`v-chip ${!activeFilters.member ? 'active' : ''}`} onClick={() => setActiveFilters(p => ({...p, member:null}))}>ALL</button>
                  {memberOrder.map(m => (
                    <button key={m} className={`v-chip ${activeFilters.member === m ? 'active' : ''}`} onClick={() => setActiveFilters(p => ({...p, member:m}))}>
                      {memberIcons[m]} {m}
                    </button>
                  ))}
                </div>
                <div className="v-sort-box">
                  <button className={`v-sort-btn ${currentSort === 'old' ? 'active' : ''}`} onClick={() => setCurrentSort('old')} title="登録順"><i className="fas fa-history"></i></button>
                  <button className={`v-sort-btn ${currentSort === 'new' ? 'active' : ''}`} onClick={() => setCurrentSort('new')} title="新着順"><i className="fas fa-sparkles"></i></button>
                  <button className={`v-sort-btn ${currentSort === 'random' ? 'active' : ''}`} onClick={() => setCurrentSort('random')} title="シャッフル"><i className="fas fa-random"></i></button>
                </div>
              </div>
            </div>

            {/* フォトグリッド */}
            <div className="vspo-main-grid">
              {filteredData.slice(0, displayLimit).map((item) => (
                <div key={item._id} className="vspo-photo-card">
                  <div className="v-card-media">
                    <img src={getTwitterUrl(item.image, 'medium')} alt="" loading="lazy" onClick={() => setModalImage(item)} />
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noreferrer" className="v-x-btn-overlay">
                        <i className="fa-brands fa-x-twitter"></i>
                      </a>
                    )}
                  </div>
                  <div className="v-card-info" onClick={() => setActiveFilters(prev => ({...prev, cosplayer: item.cosplayer}))}>
                    <div className="v-card-name">{item.cosplayer}</div>
                    <div className="v-card-sub">{memberIcons[item.member]} {item.member}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ... (他名鑑・診断・イベント等のビューも完全維持) ... */}
        {(viewMode === 'directory' || viewMode === 'events') && (
          <div className="v-list-view">
            <h2 className="v-list-title">{viewMode === 'directory' ? 'DIRECTORY / 名鑑' : 'EVENTS / まとめ'}</h2>
            <div className="v-list-container">
              {Object.keys(viewMode === 'directory' ? aggregated.cos : aggregated.evs).sort((a,b) => (viewMode === 'directory' ? aggregated.cos[b].count - aggregated.cos[a].count : aggregated.evs[b].count - aggregated.evs[a].count)).map(key => (
                <div key={key} className="v-list-row" onClick={() => {setActiveFilters(p => ({...p, [viewMode === 'directory' ? 'cosplayer' : 'event']: key})); setViewMode('home');}}>
                  <img className="v-list-img" src={getTwitterUrl((viewMode === 'directory' ? aggregated.cos[key] : aggregated.evs[key]).latest, 'thumb')} alt="" />
                  <div className="v-list-info"><div className="v-list-name">{key}</div><div className="v-list-count">{(viewMode === 'directory' ? aggregated.cos[key] : aggregated.evs[key]).count} Photos</div></div>
                  <i className="fas fa-chevron-right"></i>
                </div>
              ))}
            </div>
          </div>
        )}

        {diagStep > 0 && (
          <div className="v-diag-screen">
            {diagStep === 1 ? (
              <div className="v-diag-modal">
                <h3 className="v-diag-h3">誰を引く？</h3>
                <div className="v-diag-grid">
                  {memberOrder.map(m => <button key={m} className="v-diag-btn" onClick={() => { const list = allData.filter(d => d.member === m); if(list.length) { setDiagResult(list[Math.floor(Math.random()*list.length)]); setDiagStep(2); } }}>{memberIcons[m]}<br/>{m}</button>)}
                </div>
                <button className="v-diag-cancel" onClick={() => setDiagStep(0)}>CANCEL</button>
              </div>
            ) : (
              <div className="v-diag-result">
                <h3 className="v-diag-res-title">✨ DESTINY PHOTO ✨</h3>
                {diagResult && <img src={getTwitterUrl(diagResult.image, 'large')} className="v-diag-res-img" alt="" onClick={() => setModalImage(diagResult)} />}
                <p className="v-diag-res-name"><b>{diagResult?.cosplayer}</b> さん</p>
                <div className="v-diag-actions">
                  <button className="v-diag-main-btn" onClick={() => setDiagStep(1)}>RETRY</button>
                  <button className="v-diag-main-btn alt" onClick={() => setDiagStep(0)}>CLOSE</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- STORY VIEWER (画像見切れ対策済み) --- */}
      {activeStory && (
        <div className="v-story-viewer-root" onClick={() => setActiveStory(null)}>
          <div className="v-story-progress-shelf">
            {stories[activeStory.memberIndex].images.map((_, i) => (
              <div key={i} className="v-story-bar"><div className="v-story-fill" style={{ width: i < activeStory.slideIndex ? '100%' : (i === activeStory.slideIndex ? '100%' : '0%'), transition: i === activeStory.slideIndex ? '4s linear' : 'none' }}></div></div>
            ))}
          </div>
          <div className="v-story-stage" onClick={e => e.stopPropagation()}>
            {/* object-fit: contain を指定して絶対に見切れないように設定 */}
            <img className="v-story-img" src={getTwitterUrl(stories[activeStory.memberIndex].images[activeStory.slideIndex].image, 'large')} alt="" />
            <div className="v-story-label-box">{memberIcons[stories[activeStory.memberIndex].member]} {stories[activeStory.memberIndex].member}</div>
            <div className="v-story-hitbox left" onClick={() => setActiveStory(prev => ({...prev, slideIndex: Math.max(0, prev.slideIndex - 1)}))}></div>
            <div className="v-story-hitbox right" onClick={nextSlide}></div>
          </div>
        </div>
      )}

      {modalImage && <div className="v-modal-full" onClick={() => setModalImage(null)}><img src={getTwitterUrl(modalImage.image, 'large')} alt="" /></div>}

      <style jsx global>{`
        :root { --v-bg: #0a0a0b; --v-cyan: #00f2ff; --v-pink: #ff00ff; --v-gold: #ffcc00; --v-dim: #88888e; --v-h: 70px; }
        
        /* 1. Reset & Structural Stability */
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: var(--v-bg); overflow-x: hidden; }
        .vspo-global-root { width: 100%; position: relative; min-height: 100vh; }
        body { padding-top: var(--v-h); font-family: 'Montserrat', sans-serif; color: #fff; }

        /* 2. Fixed Header (背景不透明) */
        .vspo-fixed-header { position: fixed; top: 0; left: 0; width: 100%; height: var(--v-h); background: #0a0a0b; z-index: 2000; border-bottom: 1px solid #222; }
        .v-header-inner { max-width: 1400px; margin: 0 auto; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; box-sizing: border-box; }
        .v-logo-brand { cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 14px; letter-spacing: 0.1em; }
        .v-logo-gradient { font-size: 22px; background: linear-gradient(135deg, var(--v-cyan), var(--v-pink)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .v-search-bar { background: #161618; border-radius: 30px; padding: 8px 18px; display: flex; align-items: center; gap: 10px; width: 200px; border: 1px solid #333; }
        .v-search-bar input { background: none; border: none; color: #fff; outline: none; font-size: 13px; width: 100%; }
        .v-menu-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 10px; }

        /* 3. Sticky UI Bar (被り防止の要) */
        .vspo-sticky-wrapper { position: sticky; top: var(--v-h); z-index: 1000; background: #0a0a0b; padding: 15px 20px; border-bottom: 1px solid #222; }
        .vspo-filter-bar-inner { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .v-member-chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
        .v-chip { background: #1a1a1c; border: 1px solid #222; color: var(--v-dim); padding: 8px 18px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; transition: 0.3s; }
        .v-chip.active { background: #fff; color: #000; border-color: #fff; }
        .v-sort-box { display: flex; gap: 5px; background: #1a1a1c; padding: 4px; border-radius: 12px; }
        .v-sort-btn { background: none; border: none; color: #555; padding: 10px; width: 40px; height: 40px; border-radius: 8px; cursor: pointer; }
        .v-sort-btn.active { background: #2a2a2c; color: var(--v-cyan); }

        /* 4. Stories Tray */
        .v-stories-shelf { display: flex; gap: 20px; overflow-x: auto; padding: 25px 20px; border-bottom: 1px solid #1a1a1c; scrollbar-width: none; }
        .v-story-icon-node { text-align: center; flex-shrink: 0; cursor: pointer; }
        .v-story-ring { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--v-cyan), var(--v-pink)); display: flex; align-items: center; justify-content: center; }
        .v-story-inner { width: 66px; height: 66px; border-radius: 50%; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .v-story-inner img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }
        .v-story-label { display: block; font-size: 10px; font-weight: 700; margin-top: 8px; color: var(--v-dim); }

        /* 5. Main Grid Layout */
        .vspo-main-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 30px; padding: 30px 20px; max-width: 1400px; margin: 0 auto; box-sizing: border-box; }
        @media (max-width: 600px) { .vspo-main-grid { grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 15px; } }
        
        .vspo-photo-card { transition: 0.4s; position: relative; }
        .v-card-media { border-radius: 16px; overflow: hidden; background: #161618; position: relative; line-height: 0; }
        .v-card-media img { width: 100%; height: auto; display: block; transition: 0.6s; cursor: pointer; }
        .vspo-photo-card:hover { transform: translateY(-5px); }
        .v-x-btn-overlay { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; border: 1px solid rgba(255,255,255,0.2); z-index: 10; font-size: 14px; text-decoration: none; }
        .v-card-info { padding: 12px 5px; cursor: pointer; }
        .v-card-name { font-size: 14px; font-weight: 800; }
        .v-card-sub { font-size: 11px; color: var(--v-dim); margin-top: 5px; }

        /* 6. Story Viewer (見切れ対策の要) */
        .v-story-viewer-root { position: fixed; inset: 0; background: #000; z-index: 5000; display: flex; flex-direction: column; }
        .v-story-progress-shelf { display: flex; gap: 5px; padding: 20px; }
        .v-story-bar { flex: 1; height: 2px; background: rgba(255,255,255,0.2); }
        .v-story-fill { height: 100%; background: #fff; width: 0; }
        .v-story-stage { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .v-story-img { max-height: 100%; max-width: 100%; object-fit: contain; } /* これで見切れない */
        .v-story-label-box { position: absolute; top: 30px; left: 30px; font-weight: 800; font-size: 18px; }
        .v-story-hitbox { position: absolute; top: 0; bottom: 0; width: 40%; cursor: pointer; }
        .v-story-hitbox.left { left: 0; }
        .v-story-hitbox.right { right: 0; }

        /* Sidebar */
        .v-sidebar-main { position: fixed; top: 0; left: -320px; width: 320px; height: 100%; background: #000; z-index: 3000; transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1); padding: 40px 30px; border-right: 1px solid #222; box-sizing: border-box; }
        .v-sidebar-main.open { left: 0; }
        .v-sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 2500; opacity: 0; pointer-events: none; transition: 0.3s; }
        .v-sidebar-overlay.open { opacity: 1; pointer-events: auto; }
        .v-side-item { padding: 15px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 15px; font-size: 13px; }
        .special-c { color: var(--v-cyan); background: rgba(0,242,255,0.05); }
        .special-p { color: var(--v-pink); background: rgba(255,0,255,0.05); }
        .special-g { color: var(--v-gold); background: rgba(255,204,0,0.05); }

        /* Others */
        .v-editorial-hero { padding: 80px 40px; background: radial-gradient(circle at top right, rgba(0,242,255,0.1), transparent); border-radius: 24px; margin: 20px; border: 1px solid #222; }
        .v-hero-name { font-size: 48px; font-weight: 800; margin: 0 0 20px 0; }
        .v-hero-badge { background: #fff; color: #000; padding: 10px 24px; border-radius: 30px; font-size: 12px; font-weight: 800; border: none; cursor: pointer; }
        .v-modal-full { position: fixed; inset: 0; background: rgba(0,0,0,0.98); z-index: 4000; display: flex; align-items: center; justify-content: center; }
        .v-modal-full img { max-height: 95vh; max-width: 95%; object-fit: contain; }
      `}</style>
    </div>
  );
}
