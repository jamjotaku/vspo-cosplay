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

  useEffect(() => {
    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, {
        download: true, header: true, complete: (res) => {
          const formatted = res.data.filter(d => d.image || d.url || d['画像'] || d['URL']).map((d, i) => ({
            _id: i,
            member: (d.member || d['名前'] || "").trim(),
            image: d.image || d['url'] || d['画像'] || d['URL'],
            link: (d.link || d['URL'] || d.url || "").trim(),
            cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
            event: (d.event || d.Event || d['イベント'] || "").trim(),
            searchKey: `${d.member} ${d.cosplayer} ${d.event || d.Event || d['イベント']}`.toLowerCase()
          }));
          setAllData(formatted);

          const today = new Date().toISOString().slice(0, 10);
          const cacheKey = `v_daily_${today}`;
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
    <div className="site-wrapper">
      <Head>
        <title>VSPO! ARCHIVE</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;800&family=Playfair+Display:ital,wght@1,900&display=swap" rel="stylesheet" />
      </Head>

      <header className="main-header">
        <div className="header-inner">
          <div className="header-left">
            <button className="menu-icon-btn" onClick={() => setIsMenuOpen(true)}><i className="fas fa-bars"></i></button>
            <div className="brand" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""}); setDiagStep(0); window.scrollTo({top:0,behavior:'smooth'});}}>
              <i className="fas fa-camera brand-logo"></i>
              <span className="brand-name">VSPO! ARCHIVE</span>
            </div>
          </div>
          <div className="header-right">
            <div className="search-pill">
              <i className="fas fa-search"></i>
              <input type="text" placeholder="Search..." onChange={(e) => setActiveFilters(prev => ({...prev, text: e.target.value.toLowerCase()}))} />
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar & Overlay */}
      <div className={`overlay ${isMenuOpen ? 'is-visible' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'is-open' : ''}`}>
        <div className="sidebar-top">
          <span className="sidebar-label">NAVIGATION</span>
          <button className="close-sidebar" onClick={() => setIsMenuOpen(false)}>&times;</button>
        </div>
        <div className="nav-list">
          <div className="nav-item" onClick={() => {setViewMode('home'); setDiagStep(0); setIsMenuOpen(false);}}><i className="fas fa-th-large"></i> HOME</div>
          <div className="nav-item" onClick={() => {setViewMode('directory'); setIsMenuOpen(false);}}><i className="fas fa-id-badge"></i> DIRECTORY</div>
          <div className="nav-item" onClick={() => {setViewMode('events'); setIsMenuOpen(false);}}><i className="fas fa-calendar-alt"></i> EVENTS</div>
          <div className="nav-divider">PRO TOOLS</div>
          <Link href="/chronicle"><div className="nav-item special-cyan"><i className="fas fa-project-diagram"></i> CHRONICLE MAP</div></Link>
          <Link href="/tracker"><div className="nav-item special-pink"><i className="fas fa-cut"></i> COSTUME TRACKER</div></Link>
          <Link href="/log"><div className="nav-item special-gold"><i className="fas fa-journal-whills"></i> OSHIGOTO LOG</div></Link>
          <div className="nav-item" onClick={() => {setDiagStep(1); setIsMenuOpen(false);}}><i className="fas fa-magic"></i> 推しフォト診断</div>
        </div>
      </aside>

      <main className="main-content">
        {viewMode === 'home' && diagStep === 0 && (
          <>
            {/* Stories */}
            {!activeFilters.member && !activeFilters.cosplayer && !activeFilters.event && !activeFilters.text && (
              <div className="stories-tray">
                {stories.map((s, idx) => (
                  <div key={s.member} className="story-node" onClick={() => setActiveStory({ memberIndex: idx, slideIndex: 0 })}>
                    <div className="ring"><img src={getTwitterUrl(s.images[0].image, 'thumb')} alt="" /></div>
                    <span className="label">{s.member}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hero Section */}
            {(activeFilters.cosplayer || activeFilters.event) && (
              <div className="hero-section">
                <div className="hero-content">
                  <h1 className="hero-title">{activeFilters.cosplayer || activeFilters.event}</h1>
                  <div className="hero-meta">
                    <span className="hero-pill"><i className="fas fa-images"></i> {filteredData.length} ARCHIVES</span>
                    {stats?.sns.twitter && <a href={stats.sns.twitter} target="_blank" rel="noreferrer" className="hero-pill sns">Twitter</a>}
                    <button className="hero-pill close" onClick={() => setActiveFilters(p => ({...p, cosplayer:null, event:null}))}><i className="fas fa-times"></i></button>
                  </div>
                  {stats && (
                    <div className="hero-breakdown">
                      {Object.entries(stats.breakdown).map(([m, count]) => (
                        <span key={m} className="mini-badge">{memberIcons[m]} {m} <span className="num">{count}</span></span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sticky Filter & Sort Bar */}
            <div className="sticky-ui-container">
              <div className="filter-bar">
                <div className="member-chips">
                  <button className={`chip ${!activeFilters.member ? 'active' : ''}`} onClick={() => setActiveFilters(p => ({...p, member:null}))}>ALL</button>
                  {memberOrder.map(m => (
                    <button key={m} className={`chip ${activeFilters.member === m ? 'active' : ''}`} onClick={() => setActiveFilters(p => ({...p, member:m}))}>
                      {memberIcons[m]} {m}
                    </button>
                  ))}
                </div>
                <div className="sort-group">
                  <button className={`sort-tool ${currentSort === 'old' ? 'active' : ''}`} onClick={() => setCurrentSort('old')} title="登録順"><i className="fas fa-history"></i></button>
                  <button className={`sort-tool ${currentSort === 'new' ? 'active' : ''}`} onClick={() => setCurrentSort('new')} title="新着順"><i className="fas fa-sparkles"></i></button>
                  <button className={`sort-tool ${currentSort === 'random' ? 'active' : ''}`} onClick={() => setCurrentSort('random')} title="シャッフル"><i className="fas fa-random"></i></button>
                </div>
              </div>
            </div>

            {/* Photo Grid - display:grid で安定化 */}
            <div className="archive-grid">
              {filteredData.slice(0, displayLimit).map((item) => (
                <div key={item._id} className="archive-card">
                  <div className="card-thumb">
                    <img src={getTwitterUrl(item.image, 'medium')} alt="" loading="lazy" onClick={() => setModalImage(item)} />
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noreferrer" className="x-link-btn">
                        <i className="fa-brands fa-x-twitter"></i>
                      </a>
                    )}
                  </div>
                  <div className="card-caption" onClick={() => setActiveFilters(prev => ({...prev, cosplayer: item.cosplayer}))}>
                    <div className="caption-name">{item.cosplayer}</div>
                    <div className="caption-sub">{memberIcons[item.member]} {item.member}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* List Views & Diagnostic Tool (完全維持) */}
        {(viewMode === 'directory' || viewMode === 'events') && (
          <div className="list-view">
            <h2 className="view-title">{viewMode === 'directory' ? 'DIRECTORY / 名鑑' : 'EVENTS / まとめ'}</h2>
            <div className="list-container">
              {Object.keys(viewMode === 'directory' ? aggregated.cos : aggregated.evs).sort((a,b) => (viewMode === 'directory' ? aggregated.cos[b].count - aggregated.cos[a].count : aggregated.evs[b].count - aggregated.evs[a].count)).map(key => (
                <div key={key} className="list-row" onClick={() => {setActiveFilters(p => ({...p, [viewMode === 'directory' ? 'cosplayer' : 'event']: key})); setViewMode('home');}}>
                  <img src={getTwitterUrl((viewMode === 'directory' ? aggregated.cos[key] : aggregated.evs[key]).latest, 'thumb')} alt="" className="list-img" />
                  <div className="list-info"><div className="list-name">{key}</div><div className="list-meta">{(viewMode === 'directory' ? aggregated.cos[key] : aggregated.evs[key]).count} 作品</div></div>
                  <i className="fas fa-chevron-right"></i>
                </div>
              ))}
            </div>
          </div>
        )}

        {diagStep > 0 && (
          <div className="diag-screen">
            {diagStep === 1 ? (
              <div className="diag-modal">
                <h3 className="diag-head">誰を引く？</h3>
                <div className="diag-select-grid">
                  {memberOrder.map(m => <button key={m} className="diag-choice" onClick={() => { const list = allData.filter(d => d.member === m); if(list.length) { setDiagResult(list[Math.floor(Math.random()*list.length)]); setDiagStep(2); } }}>{memberIcons[m]}<br/>{m}</button>)}
                </div>
                <button className="diag-cancel" onClick={() => setDiagStep(0)}>閉じる</button>
              </div>
            ) : (
              <div className="diag-result-screen">
                <h3 className="diag-result-title">✨ DESTINY PHOTO ✨</h3>
                {diagResult && <img src={getTwitterUrl(diagResult.image, 'large')} className="diag-img" alt="" onClick={() => setModalImage(diagResult)} />}
                <p className="diag-name"><b>{diagResult?.cosplayer}</b> さん</p>
                <div className="diag-buttons">
                  <button className="diag-btn-main" onClick={() => setDiagStep(1)}>もう一度引く</button>
                  <button className="diag-btn-main alt" onClick={() => setDiagStep(0)}>ホームへ</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {activeStory && (
        <div className="story-viewer" onClick={() => setActiveStory(null)}>
          <div className="story-bars">
            {stories[activeStory.memberIndex].images.map((_, i) => (
              <div key={i} className="s-bar"><div className="s-fill" style={{ width: i < activeStory.slideIndex ? '100%' : (i === activeStory.slideIndex ? '100%' : '0%'), transition: i === activeStory.slideIndex ? '4s linear' : 'none' }}></div></div>
            ))}
          </div>
          <div className="story-stage" onClick={e => e.stopPropagation()}>
            <img src={getTwitterUrl(stories[activeStory.memberIndex].images[activeStory.slideIndex].image, 'large')} alt="" />
            <div className="story-label">{memberIcons[stories[activeStory.memberIndex].member]} {stories[activeStory.memberIndex].member}</div>
            <div className="story-hit left" onClick={() => setActiveStory(prev => ({...prev, slideIndex: Math.max(0, prev.slideIndex - 1)}))}></div>
            <div className="story-hit right" onClick={nextSlide}></div>
          </div>
        </div>
      )}
      {modalImage && <div className="modal-full" onClick={() => setModalImage(null)}><img src={getTwitterUrl(modalImage.image, 'large')} alt="" /></div>}

      <style jsx global>{`
        :root { --bg: #0a0a0b; --cyan: #00f2ff; --pink: #ff00ff; --gold: #ffcc00; --dim: #88888e; --h: 70px; }
        
        /* 1. 基本レイアウト：黒い帯を消し、コンテンツを中央化 */
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: var(--bg); overflow-x: hidden; }
        .site-wrapper { width: 100%; min-height: 100vh; display: block; }
        body { padding-top: var(--h); font-family: 'Montserrat', sans-serif; color: #fff; }

        /* 2. ヘッダー：被り防止のため不透明度をMAXに */
        .main-header { position: fixed; top: 0; left: 0; width: 100%; height: var(--h); background: #0a0a0b; z-index: 2000; border-bottom: 1px solid #222; }
        .header-inner { max-width: 1400px; margin: 0 auto; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; box-sizing: border-box; }
        .brand { cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 14px; letter-spacing: 0.1em; }
        .brand-logo { font-size: 22px; background: linear-gradient(135deg, var(--cyan), var(--pink)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .search-pill { background: #161618; border-radius: 30px; padding: 8px 15px; display: flex; align-items: center; gap: 10px; width: 200px; }
        .search-pill input { background: none; border: none; color: #fff; outline: none; font-size: 13px; width: 100%; }
        .menu-icon-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }

        /* 3. フィルターバー：ヘッダーの下にピタッと固定し、画像が被らないように背景を固定 */
        .sticky-ui-container { position: sticky; top: var(--h); z-index: 1000; background: #0a0a0b; padding: 15px 20px; border-bottom: 1px solid #222; }
        .filter-bar { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .member-chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
        .chip { background: #1a1a1c; border: 1px solid #222; color: var(--dim); padding: 8px 18px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; }
        .chip.active { background: #fff; color: #000; }

        /* 4. 写真グリッド：もっとも安定する Grid レイアウトを採用 */
        .main-content { width: 100%; max-width: 1400px; margin: 0 auto; }
        .archive-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
          gap: 30px; 
          padding: 30px 20px;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 600px) { .archive-grid { grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 15px; } }

        .archive-card { width: 100%; transition: 0.4s; position: relative; }
        .card-thumb { position: relative; border-radius: 16px; overflow: hidden; background: #161618; line-height: 0; }
        .card-thumb img { width: 100%; height: auto; display: block; transition: 0.6s; cursor: pointer; }
        .archive-card:hover { transform: translateY(-5px); }
        .archive-card:hover img { transform: scale(1.05); }

        /* 5. 𝕏ボタン：画像内に美しく配置 */
        .x-link-btn { position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; border: 1px solid rgba(255,255,255,0.2); transition: 0.3s; z-index: 10; font-size: 14px; text-decoration: none; }
        .x-link-btn:hover { background: #fff; color: #000; transform: scale(1.1); }

        .card-caption { padding: 12px 5px; cursor: pointer; }
        .caption-name { font-size: 14px; font-weight: 800; color: #fff; }
        .caption-sub { font-size: 11px; color: var(--dim); margin-top: 4px; }

        /* Sidebar (完全独立) */
        .sidebar { position: fixed; top: 0; left: -320px; width: 320px; height: 100%; background: #000; z-index: 3000; transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1); padding: 40px 30px; border-right: 1px solid #222; box-sizing: border-box; }
        .sidebar.is-open { left: 0; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 2500; opacity: 0; pointer-events: none; transition: 0.3s; }
        .overlay.is-visible { opacity: 1; pointer-events: auto; }
        .nav-item { padding: 15px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 15px; font-size: 13px; transition: 0.2s; }
        .nav-item:hover { background: rgba(255,255,255,0.05); }
        .special-cyan { color: var(--cyan); background: rgba(0,242,255,0.05); }
        .special-pink { color: var(--pink); background: rgba(255,0,255,0.05); }
        .special-gold { color: var(--gold); background: rgba(255,204,0,0.05); }

        /* Others */
        .stories-tray { display: flex; gap: 20px; overflow-x: auto; padding: 20px; border-bottom: 1px solid #222; scrollbar-width: none; }
        .hero-section { padding: 60px 40px; background: radial-gradient(circle at top right, rgba(0,242,255,0.1), transparent); border-radius: 24px; margin: 20px; border: 1px solid #222; }
        .hero-title { font-size: 48px; font-weight: 800; margin: 0 0 20px 0; }
        .sort-group { display: flex; gap: 5px; background: #1a1a1c; padding: 4px; border-radius: 12px; }
        .sort-tool { background: none; border: none; color: #555; padding: 10px; width: 40px; border-radius: 8px; cursor: pointer; }
        .sort-tool.active { background: #2a2a2c; color: var(--cyan); }
        .modal-full { position: fixed; inset: 0; background: rgba(0,0,0,0.98); z-index: 4000; display: flex; align-items: center; justify-content: center; }
        .modal-full img { max-height: 95vh; max-width: 95%; object-fit: contain; }
      `}</style>
    </div>
  );
}
