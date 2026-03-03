import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Script from 'next/script';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";
const memberOrder = ["花芽すみれ", "花芽なずな", "小雀とと", "一ノ瀬うるは", "胡桃のあ", "兎咲ミミ", "空澄セナ", "橘ひなの", "英リサ", "如月れん", "神成きゅぴ", "八雲べに", "藍沢エマ", "紫宮るな", "猫汰つな", "白波らむね", "小森めと", "夢野あかり", "夜乃くろむ", "紡木こかげ", "千燈ゆうひ", "蝶屋はなび", "甘結もか"];
const memberIcons = { "花芽すみれ": "👾💤", "花芽なずな": "🍣", "小雀とと": "🔫🐥", "一ノ瀬うるは": "🌠", "胡桃のあ": "🧸♔", "橘ひなの": "🍫💘", "如月れん": "⏰", "英リサ": "💐", "空澄セナ": "🗝♠︎", "兎咲ミミ": "🐰🍭", "神成きゅぴ": "🌩", "八雲べに": "💄💚", "藍沢エマ": "🥞💫", "紫宮るな": "☪🐾", "猫汰つな": "🍒✨", "白波らむね": "🐻‍❄️🏖", "小森めと": "🪐", "夢野あかり": "🍼", "夜乃くろむ": "💀⛓", "紡木こかげ": "📘💧", "千燈ゆうひ": "🫠", "蝶屋はなび": "🦋🎆", "甘結もか": "🕹🔖", "銀城サイネ": "🎈", "龍巻ちせ": "🐉🌪" };

const getTwitterUrl = (url, size = 'medium') => {
  if (!url || !url.includes('pbs.twimg.com')) return url;
  return `${url.split('?')[0]}?format=jpg&name=${size}`;
};

export default function Home() {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(40);
  const [activeFilters, setActiveFilters] = useState({ member: null, text: "" });
  const [currentSort, setCurrentSort] = useState('random');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, {
        download: true, header: true, complete: (results) => {
          const formatted = results.data.filter(d => d.image || d.url).map((d, i) => ({
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
    };
    loadData();
  }, []);

  useEffect(() => {
    let result = allData.filter(d => {
      const mMem = !activeFilters.member || d.member === activeFilters.member;
      const mTxt = !activeFilters.text || d.searchKey.includes(activeFilters.text);
      return mMem && mTxt;
    });
    if (currentSort === 'new') result.sort((a, b) => b._id - a._id);
    else if (currentSort === 'old') result.sort((a, b) => a._id - b._id);
    else if (currentSort === 'random') result.sort(() => Math.random() - 0.5);
    setFilteredData(result);
  }, [allData, activeFilters, currentSort]);

  return (
    <>
      <Head>
        <title>VSPO! COSPLAY ARCHIVE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover" />
      </Head>

      <header>
        <div className="header-left">
          <button className="menu-btn" onClick={() => setIsMenuOpen(true)}><i className="fas fa-bars"></i></button>
          <div className="site-title">
            <i className="fas fa-camera site-logo-icon"></i>
            <span className="title-text">VSPO! COSPLAY ARCHIVE</span>
          </div>
        </div>
        <div className="header-right">
          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search..." 
              onChange={(e) => setActiveFilters(prev => ({...prev, text: e.target.value.toLowerCase()}))}
            />
          </div>
        </div>
      </header>

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
                <Image 
                  src={getTwitterUrl(item.image, 'medium')} 
                  alt={item.member}
                  width={400} 
                  height={600}
                  className="main-img"
                  loading="lazy"
                />
              </div>
              <div className="card-meta">
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

      {modalImage && (
        <div className="modal open" onClick={() => setModalImage(null)}>
          <span className="modal-close">&times;</span>
          <img src={getTwitterUrl(modalImage.image, 'large')} alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* --- 🎨 あなたのオリジナルデザインを完全復元 --- */}
      <style jsx global>{`
        :root {
            --bg-color: #0f0f0f;
            --text-color: #f1f1f1;
            --text-sub: #aaaaaa;
            --primary: #3ea6ff;
            --grad-main: linear-gradient(135deg, #3b82f6 0%, #d946ef 100%);
            --header-height: 60px;
            --chip-bg: #272727;
        }

        body { 
            font-family: sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0; padding: 0; 
            padding-top: var(--header-height);
        }

        header { 
            position: fixed; top: 0; left: 0; width: 100%; height: var(--header-height);
            background: rgba(15, 15, 15, 0.95); backdrop-filter: blur(10px);
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 15px; z-index: 1000;
        }
        .site-title { font-weight: 800; display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .site-logo-icon { background: var(--grad-main); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .search-box { background: #121212; border: 1px solid #303030; border-radius: 20px; padding: 5px 15px; display: flex; align-items: center; }
        .search-input { background: none; border: none; color: #fff; outline: none; margin-left: 8px; }

        .top-area { background: var(--bg-color); position: sticky; top: var(--header-height); z-index: 900; padding-bottom: 10px; }
        .chips-container { display: flex; gap: 8px; overflow-x: auto; padding: 10px 15px; scrollbar-width: none; }
        .member-chip { background: var(--chip-bg); color: var(--text-color); padding: 6px 14px; border-radius: 8px; font-size: 0.85rem; cursor: pointer; white-space: nowrap; }
        .member-chip.active { background: #f1f1f1; color: #0f0f0f; font-weight: bold; }

        .utility-deck { padding: 5px 15px; display: flex; justify-content: space-between; }
        .sort-btn { background: transparent; border: none; color: var(--text-sub); padding: 5px 10px; font-size: 0.8rem; cursor: pointer; }
        .sort-btn.active { color: var(--text-color); border-bottom: 2px solid var(--text-color); }

        .masonry-grid { column-count: 2; column-gap: 16px; padding: 10px; }
        @media (min-width: 768px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 1200px) { .masonry-grid { column-count: 5; } }

        .card { break-inside: avoid; margin-bottom: 24px; transition: transform 0.2s; }
        .card-img-area { width: 100%; border-radius: 12px; overflow: hidden; background: #202020; cursor: pointer; }
        .card-img-area :global(img) { width: 100%; height: auto; display: block; }

        .card-meta { margin-top: 10px; display: flex; gap: 10px; padding: 0 4px; }
        .card-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
        .card-texts { display: flex; flex-direction: column; overflow: hidden; }
        .card-title { font-size: 0.95rem; font-weight: 700; color: #f1f1f1; }
        .card-subtitle { font-size: 0.8rem; color: var(--text-sub); }

        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 3000; display: none; justify-content: center; align-items: center; }
        .modal.open { display: flex; }
        .modal img { max-height: 85vh; max-width: 95%; border-radius: 8px; }
        .modal-close { position: absolute; top: 20px; right: 20px; font-size: 2rem; color: #fff; cursor: pointer; }
      `}</style>
      
      {/* FontAwesomeの読み込み */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    </>
  );
}
