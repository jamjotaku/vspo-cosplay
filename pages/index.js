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
            image: d.image || d.url || d['画像'] || d['URL'],
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
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
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

      {/* Sidebar - コンテンツを押し出さないように完全独立化 */}
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
          <div className="nav-item" onClick={() => {setDiagStep(1); setIsMenuOpen(false);}}><i className="fas fa-magic"></i> 診断ツール</div>
        </div>
      </aside>

      <main className="main-content">
        {viewMode === 'home' && diagStep === 0 && (
          <>
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

            <div className="archive-grid">
              {filteredData.slice(0, displayLimit).map((item) => (
                <div key={item._id} className="archive-card">
                  <div className="card-thumb" onClick={() => setModalImage(item)}>
                    <img src={getTwitterUrl(item.image, 'medium')} alt="" loading="lazy" />
                  </div>
                  {/* アバターを削除し、テキストキャプションを洗練 */}
                  <div className="card-caption" onClick={() => setActiveFilters(prev => ({...prev, cosplayer: item.cosplayer}))}>
                    <div className="caption-name">{item.cosplayer}</div>
                    <div className="caption-sub">{memberIcons[item.member]} {item.member}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {viewMode === 'directory' && (
          <div className="list-view">
            <h2 className="view-title">DIRECTORY / 名鑑</h2>
            <div className="list-container">
              {Object.keys(aggregated.cos).sort((a,b) => aggregated.cos[b].count - aggregated.cos[a].count).map(name => (
                <div key={name} className="list-row" onClick={() => {setActiveFilters(p => ({...p, cosplayer: name})); setViewMode('home');}}>
                  <img src={getTwitterUrl(aggregated.cos[name].latest, 'thumb')} alt="" className="list-img" />
                  <div className="list-info"><div className="list-name">{name}</div><div className="list-meta">{aggregated.cos[name].count} 作品</div></div>
                  <i className="fas fa-chevron-right"></i>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'events' && (
          <div className="list-view">
            <h2 className="view-title">EVENTS / まとめ</h2>
            <div className="list-container">
              {Object.keys(aggregated.evs).sort((a,b) => aggregated.evs[b].count - aggregated.evs[a].count).map(ev => (
                <div key={ev} className="list-row" onClick={() => {setActiveFilters(p => ({...p, event: ev})); setViewMode('home');}}>
                  <img src={getTwitterUrl(aggregated.evs[ev].latest, 'thumb')} alt="" className="list-img" />
                  <div className="list-info"><div className="list-name">{ev}</div><div className="list-meta">{aggregated.evs[ev].count} 作品</div></div>
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
                <img src={getTwitterUrl(diagResult?.image, 'large')} className="diag-img" alt="" onClick={() => setModalImage(diagResult)} />
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

      {/* モーダル & ストーリー */}
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
        :root { --bg: #0a0a0b; --cyan: #00f2ff; --pink: #ff00ff; --dim: #88888e; --h: 70px; }
        
        /* 基本構造：黒い帯を許さない設定 */
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: var(--bg); overflow-x: hidden; }
        .site-wrapper { width: 100%; position: relative; min-height: 100vh; }
        body { padding-top: var(--h); font-family: 'Montserrat', sans-serif; color: #fff; }

        .main-header { position: fixed; top: 0; left: 0; width: 100%; height: var(--h); background: rgba(10,10,11,0.9); backdrop-filter: blur(20px); z-index: 1000; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .header-inner { max-width: 1400px; margin: 0 auto; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; box-sizing: border-box; }
        .brand { cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 14px; letter-spacing: 0.1em; }
        .brand-logo { font-size: 22px; background: linear-gradient(135deg, var(--cyan), var(--pink)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .sidebar { position: fixed; top: 0; left: -320px; width: 320px; height: 100%; background: #000; z-index: 2000; transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1); padding: 40px 30px; border-right: 1px solid #222; box-sizing: border-box; }
        .sidebar.is-open { left: 0; }
        .nav-item { padding: 15px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 15px; font-size: 13px; }
        .nav-item:hover { background: rgba(255,255,255,0.05); }
        .nav-divider { font-size: 10px; font-weight: 800; color: #333; margin: 30px 0 10px 20px; letter-spacing: 0.2em; }
        .special-cyan { color: var(--cyan); background: rgba(0,242,255,0.05); }
        .special-pink { color: var(--pink); background: rgba(255,0,255,0.05); }

        .main-content { width: 100%; max-width: 100vw; margin: 0; padding: 0; position: relative; }

        .stories-tray { display: flex; gap: 20px; overflow-x: auto; padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); scrollbar-width: none; }
        .story-node .ring { width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, var(--cyan), var(--pink)); padding: 2px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .story-node img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid #000; }
        .story-node .label { display: block; font-size: 10px; font-weight: 700; text-align: center; margin-top: 8px; color: var(--dim); }

        .archive-grid { column-count: 2; column-gap: 20px; padding: 20px; box-sizing: border-box; }
        @media (min-width: 768px) { .archive-grid { column-count: 3; } }
        @media (min-width: 1200px) { .archive-grid { column-count: 4; } }
        
        .archive-card { break-inside: avoid; margin-bottom: 30px; transition: 0.4s; }
        .card-thumb { border-radius: 16px; overflow: hidden; background: #161618; cursor: pointer; }
        .card-thumb img { width: 100%; display: block; transition: 0.6s cubic-bezier(0.19, 1, 0.22, 1); }
        .archive-card:hover { transform: translateY(-5px); }
        .archive-card:hover img { transform: scale(1.05); }

        .card-caption { padding: 12px 5px; cursor: pointer; }
        .caption-name { font-size: 14px; font-weight: 800; color: #fff; }
        .caption-sub { font-size: 11px; color: var(--dim); margin-top: 4px; }

        .filter-bar { display: flex; justify-content: space-between; align-items: center; padding: 20px; position: sticky; top: var(--h); background: var(--bg); z-index: 900; }
        .member-chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
        .chip { background: #1a1a1c; border: 1px solid #222; color: var(--dim); padding: 8px 18px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; }
        .chip.active { background: #fff; color: #000; border-color: #fff; }

        .sort-group { display: flex; gap: 5px; background: #1a1a1c; padding: 4px; border-radius: 12px; }
        .sort-tool { background: none; border: none; color: #555; padding: 10px; width: 40px; border-radius: 8px; cursor: pointer; transition: 0.3s; }
        .sort-tool.active { background: #2a2a2c; color: var(--cyan); }

        .hero-section { padding: 60px 40px; background: radial-gradient(circle at top right, rgba(0,242,255,0.1), transparent); border-radius: 20px; margin: 20px; }
        .hero-title { font-size: 48px; font-weight: 800; margin: 0 0 20px 0; }
        .hero-pill { background: #fff; color: #000; padding: 8px 20px; border-radius: 30px; font-size: 12px; font-weight: 800; border: none; cursor: pointer; }
        .hero-meta { display: flex; gap: 10px; margin-bottom: 20px; }

        .list-view { padding: 40px 20px; max-width: 1200px; margin: 0 auto; }
        .list-container { display: flex; flex-direction: column; gap: 1px; background: #222; border-radius: 20px; overflow: hidden; }
        .list-row { background: #000; padding: 20px; display: flex; align-items: center; gap: 20px; cursor: pointer; transition: 0.3s; }
        .list-row:hover { background: #0a0a0c; }
        .list-img { width: 50px; height: 50px; border-radius: 12px; object-fit: cover; }
        
        .diag-screen { padding: 40px 20px; display: flex; flex-direction: column; align-items: center; min-height: 80vh; }
        .diag-modal { background: #111; padding: 40px; border-radius: 24px; max-width: 600px; text-align: center; border: 1px solid #222; }
        .diag-select-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-top: 20px; }
        .diag-choice { background: #1a1a1c; border: 1px solid #333; color: #fff; padding: 15px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; cursor: pointer; }
        .diag-img { width: 100%; border-radius: 20px; margin: 20px 0; cursor: pointer; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }

        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1500; opacity: 0; pointer-events: none; transition: 0.3s; }
        .overlay.is-visible { opacity: 1; pointer-events: auto; }
        .modal-full { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 3000; display: flex; align-items: center; justify-content: center; }
        .modal-full img { max-height: 95vh; max-width: 95%; object-fit: contain; }

        .story-viewer { position: fixed; inset: 0; background: #000; z-index: 5000; display: flex; flex-direction: column; }
        .story-bars { display: flex; gap: 5px; padding: 20px; }
        .s-bar { flex: 1; height: 2px; background: rgba(255,255,255,0.2); border-radius: 2px; }
        .s-fill { height: 100%; background: #fff; width: 0; }
        .story-stage { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; }
        .story-stage img { max-height: 100%; max-width: 100%; object-fit: contain; }
      `}</style>
    </div>
  );
}
