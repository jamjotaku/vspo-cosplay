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
  const [currentSort, setCurrentSort] = useState('random');
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
          const cacheKey = `v_daily_final_${today}`;
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
    return { total: myPhotos.length, breakdown: memberCounts, sns: { twitter: getSns(['twitter', 'x', '𝕏']), insta: getSns(['insta', 'instagram']), tiktok: getSns(['tiktok']), fantia: getSns(['fantia']) } };
  }, [activeFilters.cosplayer, allData, profileData]);

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
    <>
      <Head>
        <title>VSPO! COSPLAY ARCHIVE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;800&display=swap" rel="stylesheet" />
      </Head>

      <div className={`overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header"><span className="sidebar-title">MENU</span><button className="close-btn" onClick={() => setIsMenuOpen(false)}>&times;</button></div>
        
        <div className="menu-group">
          <div className="menu-label">NAVIGATE</div>
          <div className="menu-item" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""}); setIsMenuOpen(false);}}>
            <i className="fas fa-home"></i> ホーム
          </div>
          <div className="menu-item" onClick={() => {setViewMode('directory'); setIsMenuOpen(false);}}>
            <i className="fas fa-users"></i> レイヤー名鑑
          </div>
          <div className="menu-item" onClick={() => {setViewMode('events'); setIsMenuOpen(false);}}>
            <i className="fas fa-calendar-alt"></i> イベントまとめ
          </div>
        </div>

        <div className="menu-group">
          <div className="menu-label">TOOLS & ANALYSIS</div>
          <Link href="/chronicle">
            <div className="menu-item special-item-map">
              <i className="fas fa-project-diagram"></i> Cos-Chronicle Map
            </div>
          </Link>
          <Link href="/tracker">
            <div className="menu-item special-item-tracker">
              <i className="fas fa-cut"></i> Costume Tracker
            </div>
          </Link>
          <div className="menu-item" onClick={() => {setDiagStep(1); setIsMenuOpen(false);}}>
            <i className="fas fa-magic"></i> 推しフォト診断
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="version-tag">VSPO! ARCHIVE PLATFORM v1.0</div>
        </div>
      </aside>

      <header>
        <div className="header-left">
          <button className="menu-btn" onClick={() => setIsMenuOpen(true)}><i className="fas fa-bars"></i></button>
          <div className="site-title" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""}); window.scrollTo({top:0,behavior:'smooth'});}}>
            <i className="fas fa-camera site-logo-icon"></i>
            <span className="title-text">VSPO! ARCHIVE</span>
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
            {!activeFilters.member && !activeFilters.cosplayer && !activeFilters.event && !activeFilters.text && (
              <div className="stories-container">
                {stories.map((s, idx) => (
                  <div key={s.member} className="story-item" onClick={() => setActiveStory({ memberIndex: idx, slideIndex: 0 })}>
                    <div className="story-ring"><img className="story-img" src={getTwitterUrl(s.images[0].image, 'thumb')} alt="" /></div>
                    <span className="story-name">{s.member}</span>
                  </div>
                ))}
              </div>
            )}

            {activeFilters.cosplayer && stats && (
              <div className="dashboard-container">
                <div className="profile-header-main">
                  <h2 className="profile-name"><i className="fas fa-user-check"></i> {activeFilters.cosplayer}</h2>
                  <div className="profile-actions">
                    {stats.sns.twitter && <a href={stats.sns.twitter} target="_blank" rel="noreferrer" className="btn-sns">Twitter</a>}
                    {stats.sns.insta && <a href={stats.sns.insta} target="_blank" rel="noreferrer" className="btn-sns btn-insta">Insta</a>}
                    <button className="btn-share-profile" onClick={() => setActiveFilters(p => ({...p, cosplayer:null}))}><i className="fas fa-times"></i> Close</button>
                  </div>
                </div>
                <div className="member-breakdown-box">
                  {Object.keys(stats.breakdown).map(m => <div key={m} className="member-bd-chip">{memberIcons[m]} {m} <span className="member-bd-count">{stats.breakdown[m]}</span></div>)}
                </div>
              </div>
            )}

            <div className="top-area">
              <div className="chips-container">
                <span className={`member-chip ${!activeFilters.member ? 'active' : ''}`} onClick={() => setActiveFilters(p => ({...p, member:null}))}>🏠 All</span>
                {memberOrder.map(m => <span key={m} className={`member-chip ${activeFilters.member === m ? 'active' : ''}`} onClick={() => setActiveFilters(p => ({...p, member:m}))}>{memberIcons[m]} {m}</span>)}
              </div>
              <div className="utility-deck">
                <div className="sort-group">
                  <button className={`sort-btn ${currentSort === 'old' ? 'active' : ''}`} onClick={() => setCurrentSort('old')}>⬇️ 登録順</button>
                  <button className={`sort-btn ${currentSort === 'new' ? 'active' : ''}`} onClick={() => setCurrentSort('new')}>✨ 新着順</button>
                  <button className={`sort-btn ${currentSort === 'random' ? 'active' : ''}`} onClick={() => setCurrentSort('random')}>🔀 シャッフル</button>
                </div>
              </div>
            </div>

            <div className="masonry-grid">
              {filteredData.slice(0, displayLimit).map((item) => (
                <div key={item._id} className="card">
                  <div className="card-img-area" onClick={() => setModalImage(item)}>
                    <img src={getTwitterUrl(item.image, 'medium')} alt={item.member} loading="lazy" />
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
          <div className="special-view">
            <h2 className="profile-name"><i className="fas fa-users"></i> レイヤー名鑑</h2>
            <div className="dir-grid">
              {Object.keys(aggregated.cos).sort((a,b) => aggregated.cos[b].count - aggregated.cos[a].count).map(name => (
                <div key={name} className="dir-card" onClick={() => {setActiveFilters(p => ({...p, cosplayer: name})); setViewMode('home');}}>
                  <img src={getTwitterUrl(aggregated.cos[name].latest, 'thumb')} alt="" className="dir-avatar" />
                  <div><div className="dir-name">{name}</div><div className="dir-count">{aggregated.cos[name].count} Photos</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* モーダル類 */}
      {modalImage && <div className="modal open" onClick={() => setModalImage(null)}><img src={getTwitterUrl(modalImage.image, 'large')} alt="" /></div>}

      <style jsx global>{`
        :root {
          --bg-color: #0f0f0f;
          --sidebar-bg: #121212;
          --text-color: #f1f1f1;
          --text-sub: #aaaaaa;
          --primary: #00f2ff;
          --secondary: #ff00ff;
          --grad-main: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          --header-height: 60px;
          --chip-bg: #272727;
        }
        body { margin: 0; background: var(--bg-color); color: var(--text-color); font-family: 'Montserrat', sans-serif; padding-top: var(--header-height); }
        header { position: fixed; top: 0; left: 0; width: 100%; height: var(--header-height); background: rgba(15, 15, 15, 0.95); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: space-between; padding: 0 15px; z-index: 1000; border-bottom: 1px solid rgba(255,255,255,0.05); box-sizing: border-box;}
        .site-title { font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .site-logo-icon { background: var(--grad-main); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .sidebar { position: fixed; top: 0; left: -280px; width: 280px; height: 100%; background: var(--sidebar-bg); z-index: 2000; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); padding: 20px; border-right: 1px solid #222; box-sizing: border-box; display: flex; flex-direction: column; }
        .sidebar.open { left: 0; }
        .menu-group { margin-bottom: 30px; }
        .menu-label { font-size: 0.65rem; font-weight: 800; color: #555; letter-spacing: 0.1em; margin-bottom: 10px; padding-left: 15px; }
        .menu-item { display: flex; align-items: center; gap: 15px; padding: 12px 15px; border-radius: 10px; color: #fff; cursor: pointer; font-weight: bold; font-size: 0.9rem; transition: 0.2s; }
        .menu-item:hover { background: rgba(255,255,255,0.05); }
        .special-item-map { color: var(--primary); background: rgba(0, 242, 255, 0.03); margin-bottom: 8px; }
        .special-item-tracker { color: var(--secondary); background: rgba(255, 0, 255, 0.03); }
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1500; display: none; }
        .overlay.open { display: block; }
        .masonry-grid { column-count: 2; column-gap: 16px; padding: 15px; }
        @media (min-width: 600px) { .masonry-grid { column-count: 3; } }
        .card { break-inside: avoid; margin-bottom: 24px; }
        .card-img-area { border-radius: 12px; overflow: hidden; background: #202020; cursor: pointer; }
        .card-img-area img { width: 100%; height: auto; display: block; }
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: none; align-items: center; justify-content: center; }
        .modal.open { display: flex; }
      `}</style>
    </>
  );
}
