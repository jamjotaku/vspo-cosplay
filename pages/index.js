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
  const [activeFilters, setActiveFilters] = useState({ member: null, cosplayer: null, text: "" });
  const [currentSort, setCurrentSort] = useState('random');
  const [modalImage, setModalImage] = useState(null);

  // ストーリー管理
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const storyTimer = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
      
      // アーカイブデータ取得
      Papa.parse(CSV_URL, {
        download: true, header: true, complete: (res) => {
          const keys = Object.keys(res.data[0] || {});
          // 列名を柔軟に検知
          const kMem = keys.find(k => k.match(/member|名前/i)) || 'member';
          const kImg = keys.find(k => k.match(/image|url/i)) || 'image';
          const kCos = keys.find(k => k.match(/cosplayer|レイヤー/i)) || 'cosplayer';
          const kLink = keys.find(k => k.match(/link|twitter/i)) || 'link';

          const formatted = res.data.filter(d => d[kImg]).map((d, i) => ({
            _id: i,
            member: (d[kMem] || "").trim(), // 空白削除で正確にマッチング
            image: d[kImg],
            cosplayer: (d[kCos] || "Unknown").trim(),
            link: d[kLink] || "",
            // AIタグを排除し、メンバー名とレイヤー名のみを検索キーにする
            searchKey: `${d[kMem]} ${d[kCos]}`.toLowerCase()
          }));
          setAllData(formatted);

          // ストーリー生成（正確なマッチングのみ）
          const storyList = memberOrder.map(m => {
            const pics = formatted.filter(d => d.member === m);
            if (pics.length === 0) return null;
            // 最新5枚をピックアップ
            return { member: m, images: pics.slice(-5).reverse() };
          }).filter(Boolean);
          setStories(storyList);
        }
      });

      // プロフィールデータ取得
      Papa.parse(PROFILE_CSV_URL, {
        download: true, header: true, complete: (res) => {
          const profs = {};
          res.data.forEach(p => {
            const name = (p.cosplayer || p['名前'] || "").trim();
            if(name) profs[name] = p;
          });
          setProfileData(profs);
        }
      });
    };
    loadData();
  }, []);

  // 次のスライド（そのメンバーのスライドが終わったら閉じるように変更）
  const nextSlide = () => {
    setActiveStory(prev => {
      if (!prev) return null;
      const currentMemberStories = stories[prev.memberIndex];
      if (prev.slideIndex < currentMemberStories.images.length - 1) {
        return { ...prev, slideIndex: prev.slideIndex + 1 };
      }
      // 他のメンバーに勝手に飛ばないよう、ここで終了（null）にする
      return null;
    });
  };

  useEffect(() => {
    if (activeStory) {
      clearTimeout(storyTimer.current);
      storyTimer.current = setTimeout(nextSlide, 4000);
    }
    return () => clearTimeout(storyTimer.current);
  }, [activeStory]);

  // フィルタリング & 統計 (SNS強化版)
  const stats = useMemo(() => {
    if (!activeFilters.cosplayer) return null;
    const cleanName = activeFilters.cosplayer.replace(/さん$/, '');
    const profKey = Object.keys(profileData).find(k => k.replace(/さん$/, '') === cleanName) || activeFilters.cosplayer;
    const prof = profileData[profKey] || {};
    const myPhotos = allData.filter(d => d.cosplayer === activeFilters.cosplayer);
    const memberCounts = {};
    myPhotos.forEach(d => { memberCounts[d.member] = (memberCounts[d.member] || 0) + 1; });
    
    const getSnsUrl = (keywords) => {
      const foundKey = Object.keys(prof).find(key => keywords.some(k => key.toLowerCase().includes(k.toLowerCase())));
      return foundKey ? prof[foundKey].trim() : null;
    };

    return {
      total: myPhotos.length,
      memberCount: Object.keys(memberCounts).length,
      breakdown: memberCounts,
      sns: {
        twitter: getSnsUrl(['twitter', 'x', '𝕏']),
        insta: getSnsUrl(['insta', 'instagram']),
      }
    };
  }, [activeFilters.cosplayer, allData, profileData]);

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

  return (
    <>
      <Head><title>VSPO! COSPLAY ARCHIVE</title></Head>

      <header>
        <div className="header-left" onClick={() => setActiveFilters({member:null, cosplayer:null, text:""})}>
          <div className="site-title">
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

      {/* ストーリー表示エリア */}
      {!activeFilters.cosplayer && (
        <div className="stories-container">
          {stories.map((s, idx) => (
            <div key={s.member} className="story-item" onClick={() => setActiveStory({ memberIndex: idx, slideIndex: 0 })}>
              <div className="story-ring">
                <img src={getTwitterUrl(s.images[0].image, 'thumb')} className="story-img" alt={s.member} />
              </div>
              <span className="story-name">{s.member}</span>
            </div>
          ))}
        </div>
      )}

      {/* ポートフォリオダッシュボード */}
      {activeFilters.cosplayer && stats && (
        <div className="dashboard-container">
          <div className="profile-header-main">
            <h2 className="profile-name"><i className="fas fa-user-check"></i> {activeFilters.cosplayer}</h2>
            <div className="profile-actions">
              {stats.sns.twitter && <a href={stats.sns.twitter} target="_blank" rel="noreferrer" className="btn-sns"><i className="fab fa-x-twitter"></i> Follow</a>}
              {stats.sns.insta && <a href={stats.sns.insta} target="_blank" rel="noreferrer" className="btn-sns btn-insta"><i className="fab fa-instagram"></i> Insta</a>}
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

      <main>
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
      </main>

      {/* ストーリービューワー（改善版：プログレスバーとナビゲーション） */}
      {activeStory && (
        <div className="story-viewer" onClick={() => setActiveStory(null)}>
          <div className="story-progress-bar">
            {stories[activeStory.memberIndex].images.map((_, i) => (
              <div key={i} className="story-progress-segment">
                <div className="story-progress-fill" style={{ 
                  width: i < activeStory.slideIndex ? '100%' : i === activeStory.slideIndex ? '100%' : '0%',
                  transition: i === activeStory.slideIndex ? 'width 4s linear' : 'none'
                }}></div>
              </div>
            ))}
          </div>
          <div className="story-content" onClick={e => e.stopPropagation()}>
            <img src={getTwitterUrl(stories[activeStory.memberIndex].images[activeStory.slideIndex].image, 'large')} className="story-main-img" alt="" />
            <div className="story-header-info">
              {memberIcons[stories[activeStory.memberIndex].member]} {stories[activeStory.memberIndex].member}
            </div>
            {/* 左右クリックでスライド移動 */}
            <div className="story-nav left" onClick={() => setActiveStory(prev => ({...prev, slideIndex: Math.max(0, prev.slideIndex - 1)}))}></div>
            <div className="story-nav right" onClick={nextSlide}></div>
          </div>
        </div>
      )}

      {modalImage && (
        <div className="modal open" onClick={() => setModalImage(null)}>
          <span className="modal-close" onClick={() => setModalImage(null)}>&times;</span>
          <img src={getTwitterUrl(modalImage.image, 'large')} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <style jsx global>{`
        /* --- 既存のスタイルを維持しつつストーリーを微調整 --- */
        :root { --bg-color: #0f0f0f; --text-color: #f1f1f1; --primary: #3ea6ff; --header-height: 60px; }
        body { background: var(--bg-color); color: var(--text-color); font-family: sans-serif; margin: 0; padding-top: var(--header-height); }
        header { position: fixed; top: 0; width: 100%; height: var(--header-height); background: rgba(15,15,15,0.95); backdrop-filter: blur(10px); z-index: 1000; display: flex; align-items: center; justify-content: space-between; padding: 0 15px; }
        
        .stories-container { display: flex; gap: 15px; overflow-x: auto; padding: 15px; scrollbar-width: none; border-bottom: 1px solid #222; }
        .story-item { flex-shrink: 0; width: 70px; text-align: center; cursor: pointer; }
        .story-ring { width: 66px; height: 66px; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, #3b82f6 0%, #d946ef 100%); display: flex; align-items: center; justify-content: center; }
        .story-img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #000; }
        .story-name { font-size: 0.65rem; color: #aaa; margin-top: 5px; display: block; }

        .story-viewer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 5000; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .story-progress-bar { position: absolute; top: 10px; width: 95%; display: flex; gap: 4px; z-index: 5010; }
        .story-progress-segment { flex: 1; height: 2px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden; }
        .story-progress-fill { height: 100%; background: #fff; width: 0; }
        .story-content { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .story-main-img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .story-header-info { position: absolute; top: 30px; left: 20px; color: #fff; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: 5010; }
        .story-nav { position: absolute; top: 0; height: 100%; width: 40%; z-index: 5005; }
        .story-nav.left { left: 0; } .story-nav.right { right: 0; }

        /* ダッシュボード & グリッド */
        .dashboard-container { padding: 20px; background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, var(--bg-color) 100%); border-bottom: 1px solid #333; }
        .profile-header-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .btn-sns { background: #1da1f2; color: #fff; padding: 6px 15px; border-radius: 20px; text-decoration: none; font-size: 0.75rem; font-weight: bold; }
        .btn-insta { background: linear-gradient(45deg, #f09433, #bc1888); }
        .btn-share-profile { background: #333; color: #fff; border: none; padding: 6px 15px; border-radius: 20px; cursor: pointer; }
        .profile-stats-grid { display: flex; gap: 10px; margin-bottom: 15px; }
        .stat-card { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; flex: 1; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
        .stat-val { font-size: 1.2rem; font-weight: bold; }
        .stat-label { font-size: 0.6rem; color: #aaa; }
        .member-breakdown-box { display: flex; flex-wrap: wrap; gap: 6px; }
        .member-bd-chip { background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; }
        .member-bd-chip.active { background: var(--primary); }
        .member-bd-count { color: var(--primary); font-weight: bold; margin-left: 4px; }
        .member-bd-chip.active .member-bd-count { color: #fff; }

        .masonry-grid { column-count: 2; column-gap: 15px; padding: 15px; }
        @media (min-width: 768px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 1200px) { .masonry-grid { column-count: 5; } }
        .card { break-inside: avoid; margin-bottom: 20px; }
        .card-img-area { border-radius: 12px; overflow: hidden; background: #222; }
        .card-img-area :global(img) { width: 100%; height: auto; display: block; }
        .card-meta { display: flex; gap: 10px; margin-top: 10px; cursor: pointer; }
        .card-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
        .card-title { font-weight: bold; font-size: 0.85rem; }
        .card-subtitle { font-size: 0.7rem; color: #aaa; }

        .top-area { background: var(--bg-color); position: sticky; top: var(--header-height); z-index: 900; }
        .chips-container { display: flex; gap: 8px; overflow-x: auto; padding: 10px 15px; scrollbar-width: none; }
        .member-chip { background: #272727; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; cursor: pointer; white-space: nowrap; }
        .member-chip.active { background: #fff; color: #000; font-weight: bold; }
        .utility-deck { padding: 5px 15px; display: flex; justify-content: space-between; }
        .sort-btn { background: transparent; border: none; color: #aaa; padding: 5px 8px; font-size: 0.75rem; cursor: pointer; }
        .sort-btn.active { color: #fff; border-bottom: 2px solid #fff; }

        .modal { position: fixed; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: none; justify-content: center; align-items: center; z-index: 2000; }
        .modal.open { display: flex; }
        .modal img { max-height: 85vh; max-width: 95%; border-radius: 8px; }
        .modal-close { position: absolute; top: 20px; right: 20px; font-size: 2.5rem; color: #fff; cursor: pointer; }

        .search-box { background: #121212; border: 1px solid #303030; border-radius: 20px; padding: 5px 15px; display: flex; align-items: center; }
        .search-input { background: none; border: none; color: #fff; outline: none; margin-left: 8px; font-size: 0.9rem; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </>
  );
}
