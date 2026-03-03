import React, { useState, useEffect, useMemo } from 'react';
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
  const [activeFilters, setActiveFilters] = useState({ member: null, cosplayer: null, text: "" });
  const [currentSort, setCurrentSort] = useState('random');
  const [modalImage, setModalImage] = useState(null);

  // 1. データ読み込み
  useEffect(() => {
    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
      
      Papa.parse(CSV_URL, {
        download: true, header: true, complete: (res) => {
          const formatted = res.data.filter(d => d.image || d.url).map((d, i) => ({
            _id: i,
            member: d.member || d['名前'],
            image: d.image || d['url'],
            cosplayer: d.cosplayer || d['レイヤー'] || "Unknown",
            link: d.link || d['twitter'],
            searchKey: `${d.member} ${d.cosplayer}`.toLowerCase()
          }));
          setAllData(formatted);
        }
      });

      Papa.parse(PROFILE_CSV_URL, {
        download: true, header: true, complete: (res) => {
          const profs = {};
          res.data.forEach(p => {
            const name = p.cosplayer || p['名前'] || p['レイヤー'];
            if(name) profs[name] = p;
          });
          setProfileData(profs);
        }
      });
    };
    loadData();
  }, []);

  // 2. 個人統計とSNSリンクの計算 (強化ロジック)
  const stats = useMemo(() => {
    if (!activeFilters.cosplayer) return null;

    // 「さん」抜きの名前でプロフィールを検索
    const cleanName = activeFilters.cosplayer.replace(/さん$/, '');
    const profKey = Object.keys(profileData).find(k => k.replace(/さん$/, '') === cleanName) || activeFilters.cosplayer;
    const prof = profileData[profKey] || {};

    const myPhotos = allData.filter(d => d.cosplayer === activeFilters.cosplayer);
    const memberCounts = {};
    myPhotos.forEach(d => {
      memberCounts[d.member] = (memberCounts[d.member] || 0) + 1;
    });

    // 列名にキーワードが含まれているか柔軟に探す
    const getSnsUrl = (keywords) => {
      const foundKey = Object.keys(prof).find(key => 
        keywords.some(k => key.toLowerCase().includes(k.toLowerCase()))
      );
      return foundKey ? prof[foundKey].trim() : null;
    };

    return {
      total: myPhotos.length,
      memberCount: Object.keys(memberCounts).length,
      breakdown: memberCounts,
      sns: {
        twitter: getSnsUrl(['twitter', 'x', '𝕏', 'sns']),
        insta: getSnsUrl(['insta', 'instagram']),
        tiktok: getSnsUrl(['tiktok']),
        fantia: getSnsUrl(['fantia']),
        booth: getSnsUrl(['booth']),
      }
    };
  }, [activeFilters.cosplayer, allData, profileData]);

  // 3. フィルタリング & ソート
  useEffect(() => {
    let result = allData.filter(d => {
      const mMem = !activeFilters.member || d.member === activeFilters.member;
      const mCos = !activeFilters.cosplayer || d.cosplayer === activeFilters.cosplayer;
      const mTxt = !activeFilters.text || d.searchKey.includes(activeFilters.text);
      return mMem && mCos && mTxt;
    });
    if (currentSort === 'new') result.sort((a, b) => b._id - a._id);
    else if (currentSort === 'old') result.sort((a, b) => a._id - b._id);
    else if (currentSort === 'random') result.sort(() => Math.random() - 0.5);
    setFilteredData(result);
  }, [allData, activeFilters, currentSort]);

  // 4. 無限スクロール
  useEffect(() => {
    const handleScroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 600) {
        setDisplayLimit(prev => prev + 20);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const resetToHome = () => {
    setActiveFilters({ member: null, cosplayer: null, text: "" });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Head>
        <title>VSPO! COSPLAY ARCHIVE</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      </Head>

      <header>
        <div className="header-left">
          <div className="site-title" onClick={resetToHome}>
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

      {/* --- 個人ダッシュボード --- */}
      {activeFilters.cosplayer && stats && (
        <div className="dashboard-container">
          <div className="profile-header-main">
            <h2 className="profile-name"><i className="fas fa-user-check"></i> {activeFilters.cosplayer}</h2>
            <div className="profile-actions">
              {stats.sns.twitter && <a href={stats.sns.twitter} target="_blank" rel="noreferrer" className="btn-sns"><i className="fab fa-x-twitter"></i> Follow</a>}
              {stats.sns.insta && <a href={stats.sns.insta} target="_blank" rel="noreferrer" className="btn-sns btn-insta"><i className="fab fa-instagram"></i> Insta</a>}
              {stats.sns.tiktok && <a href={stats.sns.tiktok} target="_blank" rel="noreferrer" className="btn-sns" style={{background:'#000'}}><i className="fab fa-tiktok"></i> TikTok</a>}
              {stats.sns.fantia && <a href={stats.sns.fantia} target="_blank" rel="noreferrer" className="btn-sns" style={{background:'#e5005a'}}><i className="fas fa-heart"></i> Fantia</a>}
              <button className="btn-share-profile" onClick={resetToHome}><i className="fas fa-times"></i> Close</button>
            </div>
          </div>
          <div className="profile-stats-grid">
            <div className="stat-card">
              <div className="stat-val">{stats.total}</div>
              <div className="stat-label">Total Photos</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{stats.memberCount}</div>
              <div className="stat-label">Members Cosplayed</div>
            </div>
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

      {!activeFilters.cosplayer && (
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
      )}

      <main>
        <div className="masonry-grid">
          {filteredData.slice(0, displayLimit).map((item) => (
            <div key={item._id} className="card">
              <div className="card-img-area" onClick={() => setModalImage(item)}>
                <Image src={getTwitterUrl(item.image, 'medium')} alt={item.member} width={400} height={600} className="main-img" loading="lazy" />
              </div>
              <div className="card-meta">
                <img src={getTwitterUrl(item.image, 'thumb')} className="card-avatar" alt="" onClick={() => setActiveFilters(prev => ({...prev, cosplayer: item.cosplayer}))} />
                <div className="card-texts" onClick={() => setActiveFilters(prev => ({...prev, cosplayer: item.cosplayer}))}>
                  <div className="card-title">{item.cosplayer}</div>
                  <div className="card-subtitle">{memberIcons[item.member]} {item.member}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {modalImage && (
        <div className="modal open" onClick={() => setModalImage(null)}>
          <span className="modal-close" onClick={() => setModalImage(null)}>&times;</span>
          <img src={getTwitterUrl(modalImage.image, 'large')} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <style jsx global>{`
        :root {
          --bg-color: #0f0f0f;
          --text-color: #f1f1f1;
          --text-sub: #aaaaaa;
          --primary: #3ea6ff;
          --grad-main: linear-gradient(135deg, #3b82f6 0%, #d946ef 100%);
          --header-height: 60px;
        }
        body { background: var(--bg-color); color: var(--text-color); font-family: sans-serif; margin: 0; padding-top: var(--header-height); }
        header { position: fixed; top: 0; width: 100%; height: var(--header-height); background: rgba(15,15,15,0.95); backdrop-filter: blur(10px); z-index: 1000; display: flex; align-items: center; justify-content: space-between; padding: 0 15px; }
        .site-title { font-weight: 800; display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .site-logo-icon { background: var(--grad-main); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .dashboard-container { padding: 20px; background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, var(--bg-color) 100%); border-bottom: 1px solid #333; animation: fadeIn 0.4s; }
        .profile-header-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
        .profile-name { font-size: 1.5rem; margin: 0; }
        .profile-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-sns { background: #1da1f2; color: #fff; padding: 8px 15px; border-radius: 20px; text-decoration: none; font-size: 0.8rem; font-weight: bold; }
        .btn-insta { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
        .btn-share-profile { background: #333; color: #fff; border: none; padding: 8px 15px; border-radius: 20px; cursor: pointer; }

        .profile-stats-grid { display: flex; gap: 15px; margin-bottom: 20px; }
        .stat-card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; flex: 1; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
        .stat-val { font-size: 1.5rem; font-weight: bold; }
        .stat-label { font-size: 0.7rem; color: var(--text-sub); }

        .member-breakdown-box { display: flex; flex-wrap: wrap; gap: 8px; }
        .member-bd-chip { background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 8px; font-size: 0.8rem; cursor: pointer; transition: 0.2s; border: 1px solid transparent; }
        .member-bd-chip.active { background: var(--primary); color: #fff; }
        .member-bd-count { color: var(--primary); font-weight: bold; margin-left: 5px; }
        .member-bd-chip.active .member-bd-count { color: #fff; }

        .masonry-grid { column-count: 2; column-gap: 15px; padding: 15px; }
        @media (min-width: 768px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 1200px) { .masonry-grid { column-count: 5; } }
        
        .card { break-inside: avoid; margin-bottom: 20px; }
        .card-img-area { border-radius: 12px; overflow: hidden; background: #222; }
        .card-img-area :global(img) { width: 100%; height: auto; display: block; transition: 0.3s; }
        .card-img-area:hover :global(img) { transform: scale(1.03); }
        
        .card-meta { display: flex; gap: 10px; margin-top: 10px; cursor: pointer; }
        .card-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .card-texts { display: flex; flex-direction: column; overflow: hidden; }
        .card-title { font-weight: bold; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card-subtitle { font-size: 0.75rem; color: var(--text-sub); }

        .top-area { background: var(--bg-color); position: sticky; top: var(--header-height); z-index: 900; }
        .chips-container { display: flex; gap: 8px; overflow-x: auto; padding: 10px 15px; scrollbar-width: none; }
        .chips-container::-webkit-scrollbar { display: none; }
        .member-chip { background: #272727; padding: 6px 14px; border-radius: 8px; font-size: 0.8rem; cursor: pointer; white-space: nowrap; }
        .member-chip.active { background: #fff; color: #000; font-weight: bold; }

        .utility-deck { padding: 5px 15px; display: flex; justify-content: space-between; }
        .sort-btn { background: transparent; border: none; color: var(--text-sub); padding: 5px 10px; font-size: 0.8rem; cursor: pointer; }
        .sort-btn.active { color: var(--text-color); border-bottom: 2px solid var(--text-color); }

        .modal { position: fixed; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: none; justify-content: center; align-items: center; z-index: 2000; }
        .modal.open { display: flex; }
        .modal img { max-height: 85vh; max-width: 95%; border-radius: 8px; }
        .modal-close { position: absolute; top: 20px; right: 20px; font-size: 2.5rem; color: #fff; cursor: pointer; z-index: 2100; }

        .search-box { background: #121212; border: 1px solid #303030; border-radius: 20px; padding: 5px 15px; display: flex; align-items: center; }
        .search-input { background: none; border: none; color: #fff; outline: none; margin-left: 8px; font-size: 0.9rem; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}
