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
  const [viewMode, setViewMode] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const [diagStep, setDiagStep] = useState(0); // 0: off, 1: choice, 2: result
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

  const stats = useMemo(() => {
    if (!activeFilters.cosplayer) return null;
    const cleanName = activeFilters.cosplayer.replace(/さん$/, '');
    const profKey = Object.keys(profileData).find(k => k.replace(/さん$/, '') === cleanName) || activeFilters.cosplayer;
    const prof = profileData[profKey] || {};
    const myPhotos = allData.filter(d => d.cosplayer === activeFilters.cosplayer);
    const memberCounts = {};
    myPhotos.forEach(d => { memberCounts[d.member] = (memberCounts[d.member] || 0) + 1; });
    const getSns = (kw) => { const k = Object.keys(prof).find(key => kw.some(w => key.toLowerCase().includes(w))); return k ? prof[k].trim() : null; };
    return { total: myPhotos.length, memberCount: Object.keys(memberCounts).length, breakdown: memberCounts, sns: { twitter: getSns(['twitter', 'x', '𝕏']), insta: getSns(['insta', 'instagram']), tiktok: getSns(['tiktok']), fantia: getSns(['fantia']) } };
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
    <div className="site-wrapper">
      <Head>
        <title>VSPO! COSPLAY ARCHIVE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </Head>

      <div className={`overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header"><span className="sidebar-title">MENU</span><button onClick={() => setIsMenuOpen(false)}>&times;</button></div>
        <div className="menu-item" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""}); setIsMenuOpen(false);}}><i className="fas fa-home"></i> ホーム</div>
        <div className="menu-item" onClick={() => {setViewMode('directory'); setIsMenuOpen(false);}}><i className="fas fa-users"></i> レイヤー名鑑</div>
        <div className="menu-item" onClick={() => {setViewMode('events'); setIsMenuOpen(false);}}><i className="fas fa-calendar-alt"></i> イベントアーカイブ</div>
        <div className="menu-divider"></div>
        <div className="menu-item" onClick={() => {setDiagStep(1); setIsMenuOpen(false);}}><i className="fas fa-magic"></i> 推しフォトガチャ</div>
      </aside>

      <header>
        <div className="header-content">
          <button className="menu-btn" onClick={() => setIsMenuOpen(true)}><i className="fas fa-bars"></i></button>
          <div className="site-title" onClick={() => setViewMode('home')}>
            <i className="fas fa-camera site-logo-icon"></i>
            <span className="title-text">ARCHIVE</span>
          </div>
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search..." onChange={(e) => setActiveFilters(p => ({...p, text: e.target.value.toLowerCase()}))} />
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
                    <div className="story-ring"><img src={getTwitterUrl(s.images[0].image, 'thumb')} alt="" /></div>
                    <span className="story-name">{s.member}</span>
                  </div>
                ))}
              </div>
            )}

            {(activeFilters.cosplayer || activeFilters.event) && (
              <div className="dashboard">
                <h2><i className={activeFilters.event ? "fas fa-calendar-alt" : "fas fa-user-check"}></i> {activeFilters.event || activeFilters.cosplayer}</h2>
                {stats && <div className="stats-row">
                    <div className="stat"><b>{stats.total}</b> Photos</div>
                    <div className="stat"><b>{stats.memberCount}</b> Members</div>
                    {stats.sns.twitter && <a href={stats.sns.twitter} target="_blank" className="btn-sns">Twitter</a>}
                </div>}
                <button className="close-dash" onClick={() => setActiveFilters(p => ({...p, cosplayer:null, event:null}))}>&times; 閉じる</button>
              </div>
            )}

            <div className="filter-area">
              <div className="chips">
                <span className={!activeFilters.member ? 'active' : ''} onClick={() => setActiveFilters(p => ({...p, member:null}))}>🏠 All</span>
                {memberOrder.map(m => <span key={m} className={activeFilters.member === m ? 'active' : ''} onClick={() => setActiveFilters(p => ({...p, member:m}))}>{memberIcons[m]} {m}</span>)}
              </div>
            </div>

            <div className="masonry">
              {filteredData.slice(0, displayLimit).map(item => (
                <div key={item._id} className="card">
                  <div className="card-img" onClick={() => setModalImage(item)}>
                    <img src={getTwitterUrl(item.image, 'medium')} alt={item.member} loading="lazy" />
                  </div>
                  <div className="card-info" onClick={() => setActiveFilters(p => ({...p, cosplayer: item.cosplayer}))}>
                    <img src={getTwitterUrl(item.image, 'thumb')} className="avatar" alt="" />
                    <div><div className="name">{item.cosplayer}</div><div className="sub">{memberIcons[item.member]} {item.member}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* --- 名鑑・イベント・ガチャのロジックはシンプルに維持 --- */}
        {diagStep > 0 && (
          <div className="modal-diag" onClick={() => setDiagStep(0)}>
            <div className="diag-box" onClick={e => e.stopPropagation()}>
              {diagStep === 1 ? (
                <div className="diag-grid">
                  {memberOrder.map(m => <button key={m} onClick={() => {
                    const list = allData.filter(d => d.member === m);
                    if(list.length) { setDiagResult(list[Math.floor(Math.random()*list.length)]); setDiagStep(2); }
                  }}>{memberIcons[m]}<br/>{m}</button>)}
                </div>
              ) : (
                <div className="diag-res">
                  <h3>✨ 運命の1枚 ✨</h3>
                  <img src={getTwitterUrl(diagResult.image, 'large')} alt="" onClick={() => setModalImage(diagResult)} />
                  <p>{diagResult.cosplayer} さん</p>
                  <button onClick={() => setDiagStep(1)}>もう一度</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ストーリービューワー */}
      {activeStory && (
        <div className="story-viewer" onClick={() => setActiveStory(null)}>
          <div className="progress">
            {stories[activeStory.memberIndex].images.map((_, i) => (
              <div key={i} className="seg"><div className="fill" style={{ width: i <= activeStory.slideIndex ? '100%' : '0%', transition: i === activeStory.slideIndex ? 'width 4s linear' : 'none' }}></div></div>
            ))}
          </div>
          <div className="content" onClick={e => e.stopPropagation()}>
            <img src={getTwitterUrl(stories[activeStory.memberIndex].images[activeStory.slideIndex].image, 'large')} alt="" />
            <div className="nav right" onClick={nextSlide}></div>
          </div>
        </div>
      )}

      {modalImage && <div className="modal-img" onClick={() => setModalImage(null)}><img src={getTwitterUrl(modalImage.image, 'large')} alt="" /></div>}

      <style jsx global>{`
        :root { --bg: #0f0f0f; --text: #f1f1f1; --primary: #3ea6ff; --h: 60px; }
        body { margin: 0; background: var(--bg); color: var(--text); font-family: sans-serif; }
        header { position: fixed; top: 0; width: 100%; height: var(--h); background: rgba(15,15,15,0.9); backdrop-filter: blur(10px); z-index: 1000; display: flex; align-items: center; border-bottom: 1px solid #333; }
        .header-content { display: flex; align-items: center; width: 100%; padding: 0 20px; gap: 15px; }
        .menu-btn { background: none; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; }
        .site-title { font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 1rem; }
        .site-logo-icon { background: linear-gradient(135deg, #3b82f6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .search-box { background: #222; border-radius: 20px; padding: 5px 15px; display: flex; align-items: center; flex: 1; max-width: 300px; }
        .search-box input { background: none; border: none; color: #fff; outline: none; margin-left: 10px; width: 100%; }

        .stories-container { display: flex; gap: 15px; overflow-x: auto; padding: 20px; scrollbar-width: none; }
        .story-item { flex-shrink: 0; width: 70px; text-align: center; cursor: pointer; }
        .story-ring { width: 66px; height: 66px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, #3b82f6, #d946ef); display: flex; align-items: center; justify-content: center; }
        .story-ring img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #000; }
        .story-name { font-size: 0.65rem; color: #aaa; margin-top: 5px; display: block; }

        .filter-area { position: sticky; top: var(--h); z-index: 900; background: var(--bg); padding: 10px 0; }
        .chips { display: flex; gap: 8px; overflow-x: auto; padding: 0 15px; scrollbar-width: none; }
        .chips span { background: #222; padding: 6px 15px; border-radius: 20px; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
        .chips span.active { background: #fff; color: #000; font-weight: bold; }

        /* Masonry Fix: 自然なアスペクト比を維持 */
        .masonry { column-count: 2; column-gap: 15px; padding: 15px; }
        @media (min-width: 768px) { .masonry { column-count: 3; } }
        @media (min-width: 1200px) { .masonry { column-count: 5; } }
        .card { break-inside: avoid; margin-bottom: 20px; }
        .card-img { border-radius: 12px; overflow: hidden; background: #222; cursor: pointer; }
        .card-img img { width: 100%; height: auto; display: block; transition: 0.3s; }
        .card-img:hover img { transform: scale(1.05); }

        .card-info { display: flex; gap: 10px; margin-top: 10px; cursor: pointer; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .name { font-weight: bold; font-size: 0.9rem; }
        .sub { font-size: 0.75rem; color: #aaa; }

        .sidebar { position: fixed; top: 0; left: -260px; width: 260px; height: 100%; background: #0f0f0f; z-index: 2000; transition: 0.3s; padding: 20px; border-right: 1px solid #333; }
        .sidebar.open { left: 0; }
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1500; display: none; }
        .overlay.open { display: block; }

        .modal-img { position: fixed; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; align-items: center; justify-content: center; }
        .modal-img img { max-height: 90vh; max-width: 95%; border-radius: 8px; }

        .story-viewer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 5000; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .progress { position: absolute; top: 15px; width: 95%; display: flex; gap: 5px; }
        .seg { flex: 1; height: 2px; background: rgba(255,255,255,0.2); }
        .fill { height: 100%; background: #fff; width: 0; }
        .story-viewer img { max-height: 100%; max-width: 100%; object-fit: contain; }
      `}</style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </div>
  );
}
