import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';

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
  const [diagnosisStep, setDiagnosisStep] = useState(0);
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

          // ★キャッシュリセット付きストーリー生成★
          const today = new Date().toISOString().slice(0, 10);
          const cacheKey = `vspo_stories_v2_${today}`; // Key名を v2 に変更してキャッシュを強制更新
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            setStories(JSON.parse(cached));
          } else {
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

  const stats = useMemo(() => {
    if (!activeFilters.cosplayer) return null;
    const cleanName = activeFilters.cosplayer.replace(/さん$/, '');
    const profKey = Object.keys(profileData).find(k => k.replace(/さん$/, '') === cleanName) || activeFilters.cosplayer;
    const prof = profileData[profKey] || {};
    const myPhotos = allData.filter(d => d.cosplayer === activeFilters.cosplayer);
    const memberCounts = {};
    myPhotos.forEach(d => { memberCounts[d.member] = (memberCounts[d.member] || 0) + 1; });
    const getSnsUrl = (kw) => { const k = Object.keys(prof).find(key => kw.some(w => key.toLowerCase().includes(w))); return k ? prof[k].trim() : null; };
    return { total: myPhotos.length, memberCount: Object.keys(memberCounts).length, breakdown: memberCounts, sns: { twitter: getSnsUrl(['twitter', 'x', '𝕏']), insta: getSnsUrl(['insta', 'instagram']), tiktok: getSnsUrl(['tiktok']), fantia: getSnsUrl(['fantia']) } };
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

  // ストーリー自動遷移を「その人の分が終わったら閉じる」に限定
  const nextSlide = () => {
    setActiveStory(prev => {
      if (!prev) return null;
      const currentMemberStories = stories[prev.memberIndex];
      if (prev.slideIndex < currentMemberStories.images.length - 1) return { ...prev, slideIndex: prev.slideIndex + 1 };
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
      </Head>

      <div className={`overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header"><span className="sidebar-title">MENU</span><button className="close-btn" onClick={() => setIsMenuOpen(false)}>&times;</button></div>
        <div className="menu-item" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""}); setIsMenuOpen(false);}}><i className="fas fa-home"></i> ホーム</div>
        <div className="menu-item" onClick={() => {setViewMode('directory'); setIsMenuOpen(false);}}><i className="fas fa-users"></i> レイヤー名鑑</div>
        <div className="menu-item" onClick={() => {setViewMode('events'); setIsMenuOpen(false);}}><i className="fas fa-calendar-alt"></i> イベントアーカイブ</div>
        <div className="menu-divider"></div>
        <div className="menu-item" onClick={() => {setDiagnosisStep(1); setIsMenuOpen(false);}}><i className="fas fa-magic"></i> 運命の1枚ガチャ</div>
      </aside>

      <header>
        <div className="header-left">
          <button className="menu-btn" onClick={() => setIsMenuOpen(true)}><i className="fas fa-bars"></i></button>
          <div className="site-title" onClick={() => {setViewMode('home'); setActiveFilters({member:null,cosplayer:null,event:null,text:""}); window.scrollTo({top:0,behavior:'smooth'});}}>
            <i className="fas fa-camera site-logo-icon"></i>
            <span className="title-text">VSPO! COSPLAY ARCHIVE</span>
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

            {/* ダッシュボード */}
            {activeFilters.cosplayer && stats && (
              <div className="dashboard-container">
                <div className="profile-header-main">
                  <h2 className="profile-name"><i className="fas fa-user-check"></i> {activeFilters.cosplayer}</h2>
                  <div className="profile-actions">
                    {stats.sns.twitter && <a href={stats.sns.twitter} target="_blank" rel="noreferrer" className="btn-sns"><i className="fab fa-x-twitter"></i> Follow</a>}
                    {stats.sns.insta && <a href={stats.sns.insta} target="_blank" rel="noreferrer" className="btn-sns btn-insta"><i className="fab fa-instagram"></i> Insta</a>}
                    {stats.sns.tiktok && <a href={stats.sns.tiktok} target="_blank" rel="noreferrer" className="btn-sns" style={{background:'#000'}}><i className="fab fa-tiktok"></i> TikTok</a>}
                    {stats.sns.fantia && <a href={stats.sns.fantia} target="_blank" rel="noreferrer" className="btn-sns" style={{background:'#e5005a'}}><i className="fas fa-heart"></i> Fantia</a>}
                    <button className="btn-share-profile" onClick={() => setActiveFilters(prev => ({...prev, cosplayer: null}))}><i className="fas fa-times"></i> Close</button>
                  </div>
                </div>
                <div className="profile-stats-grid">
                  <div className="stat-card"><div className="stat-val">{stats.total}</div><div className="stat-label">Total Photos</div></div>
                  <div className="stat-card"><div className="stat-val">{stats.memberCount}</div><div className="stat-label">Members</div></div>
                </div>
                <div className="member-breakdown-box">
                  {Object.keys(stats.breakdown).map(m => (
                    <div key={m} className={`member-bd-chip ${activeFilters.member === m ? 'active' : ''}`} onClick={() => setActiveFilters(prev => ({...prev, member: prev.member === m ? null : m}))}>
                      {memberIcons[m]} {m} <span className="member-bd-count">{stats.breakdown[m]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeFilters.event && (
              <div className="dashboard-container">
                <div className="profile-header-main">
                  <h2 className="profile-name"><i className="fas fa-calendar-alt"></i> {activeFilters.event}</h2>
                  <button className="btn-share-profile" onClick={() => setActiveFilters(prev => ({...prev, event: null}))}><i className="fas fa-times"></i> Close</button>
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
                    <Image src={getTwitterUrl(item.image, 'medium')} alt={item.member} width={400} height={600} className="main-img" loading="lazy" />
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
                  <div><div className="dir-name">{name}</div><div className="dir-count">{aggregated.cosplayers[name].count} Photos</div></div>
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
                  <div className="ev-overlay"><div className="ev-name">{ev}</div><div className="ev-count">{aggregated.events[ev].count} Photos</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ストーリービューワー */}
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
            <div className="story-nav left" onClick={() => setActiveStory(prev => ({...prev, slideIndex: Math.max(0, prev.slideIndex - 1)}))}></div>
            <div className="story-nav right" onClick={nextSlide}></div>
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
        :root { --bg-color: #0f0f0f; --text-color: #f1f1f1; --text-sub: #aaaaaa; --primary: #3ea6ff; --header-height: 64px; }
        body { background: var(--bg-color); color: var(--text-color); font-family: sans-serif; margin: 0; padding-top: var(--header-height); }
        
        header { position: fixed; top: 0; width: 100%; height: var(--header-height); background: rgba(15,15,15,0.98); backdrop-filter: blur(12px); z-index: 1000; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid #222; }
        .site-title { font-weight: 800; display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 1.1rem; }
        .site-logo-icon { background: linear-gradient(135deg, #3b82f6, #d946ef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.4rem; }
        .search-box { background: #1a1a1a; border: 1px solid #333; border-radius: 24px; padding: 8px 18px; display: flex; align-items: center; flex: 1; max-width: 320px; }
        .search-input { background: none; border: none; color: #fff; outline: none; margin-left: 10px; width: 100%; font-size: 0.95rem; }

        .stories-container { display: flex; gap: 20px; overflow-x: auto; padding: 20px; scrollbar-width: none; border-bottom: 1px solid #222; background: #000; }
        .story-item { flex-shrink: 0; width: 84px; text-align: center; cursor: pointer; }
        .story-ring { width: 80px; height: 80px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, #3b82f6, #d946ef); display: flex; align-items: center; justify-content: center; }
        .story-img { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid #000; }
        .story-name { font-size: 0.75rem; color: #ccc; margin-top: 8px; display: block; font-weight: 500; }

        .masonry-grid { column-count: 2; column-gap: 16px; padding: 16px; }
        @media (min-width: 600px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 1000px) { .masonry-grid { column-count: 4; } }
        @media (min-width: 1400px) { .masonry-grid { column-count: 5; } }

        .card { break-inside: avoid; margin-bottom: 24px; transition: transform 0.2s; }
        .card-img-area { border-radius: 12px; overflow: hidden; background: #1a1a1a; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        .card-meta { display: flex; gap: 12px; margin-top: 12px; cursor: pointer; align-items: center; }
        .card-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
        .card-title { font-weight: bold; font-size: 0.95rem; }
        .card-subtitle { font-size: 0.8rem; color: var(--text-sub); }

        .top-area { background: var(--bg-color); position: sticky; top: var(--header-height); z-index: 900; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
        .chips-container { display: flex; gap: 10px; overflow-x: auto; padding: 12px 16px; scrollbar-width: none; }
        .member-chip { background: #222; padding: 8px 16px; border-radius: 10px; font-size: 0.85rem; cursor: pointer; white-space: nowrap; border: 1px solid #333; }
        .member-chip.active { background: #fff; color: #000; font-weight: bold; }

        .modal { position: fixed; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); display: none; justify-content: center; align-items: center; z-index: 5000; backdrop-filter: blur(8px); }
        .modal.open { display: flex; }
        .modal img { max-height: 90vh; max-width: 95%; border-radius: 8px; box-shadow: 0 0 40px rgba(0,0,0,1); }

        .story-viewer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 6000; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .story-progress-bar { position: absolute; top: 15px; width: 95%; display: flex; gap: 6px; z-index: 6010; }
        .story-progress-segment { flex: 1; height: 3px; background: rgba(255,255,255,0.25); border-radius: 3px; overflow: hidden; }
        .story-progress-fill { height: 100%; background: #fff; width: 0; }
        .story-content { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; max-width: 500px; }
        .story-header-info { position: absolute; top: 40px; left: 20px; color: #fff; font-weight: bold; text-shadow: 0 2px 8px rgba(0,0,0,0.8); z-index: 6010; font-size: 1.1rem; }
        
        .sidebar { position: fixed; top: 0; left: -280px; width: 280px; height: 100%; background: #0a0a0a; z-index: 2001; transition: 0.3s; padding: 25px; border-right: 1px solid #222; }
        .sidebar.open { left: 0; }
        .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: none; }
        .overlay.open { display: block; }
      `}</style>
    </>
  );
}
