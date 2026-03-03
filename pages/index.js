import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Script from 'next/script';
import { useRouter } from 'next/router';

// --- 設定 ---
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";
const PROFILE_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=1592730885&single=true&output=csv";

const memberOrder = ["花芽すみれ", "花芽なずな", "小雀とと", "一ノ瀬うるは", "胡桃のあ", "兎咲ミミ", "空澄セナ", "橘ひなの", "英リサ", "如月れん", "神成きゅぴ", "八雲べに", "藍沢エマ", "紫宮るな", "猫汰つな", "白波らむね", "小森めと", "夢野あかり", "夜乃くろむ", "紡木こかげ", "千燈ゆうひ", "蝶屋はなび", "甘結もか"];
const memberIcons = { "花芽すみれ": "👾💤", "花芽なずな": "🍣", "小雀とと": "🔫🐥", "一ノ瀬うるは": "🌠", "胡桃のあ": "🧸♔", "橘ひなの": "🍫💘", "如月れん": "⏰", "英リサ": "💐", "空澄セナ": "🗝♠︎", "兎咲ミミ": "🐰🍭", "神成きゅぴ": "🌩", "八雲べに": "💄💚", "藍沢エマ": "🥞💫", "紫宮るな": "☪🐾", "猫汰つな": "🍒✨", "白波らむね": "🐻‍❄️🏖", "小森めと": "🪐", "夢野あかり": "🍼", "夜乃くろむ": "💀⛓", "紡木こかげ": "📘💧", "千燈ゆうひ": "🫠", "蝶屋はなび": "🦋🎆", "甘結もか": "🕹🔖", "銀城サイネ": "🎈", "龍巻ちせ": "🐉🌪" };

// ヘルパー: Twitter画像のサイズ指定
const getTwitterUrl = (url, size = 'medium') => {
  if (!url || !url.includes('pbs.twimg.com')) return url;
  return `${url.split('?')[0]}?format=jpg&name=${size}`;
};

export default function Home() {
  const router = useRouter();
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(40);
  const [activeFilters, setActiveFilters] = useState({ member: null, cosplayer: null, event: null, text: "" });
  const [currentSort, setCurrentSort] = useState('random');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);

  // 1. データ読み込み (PapaParseをNext.jsで動かす)
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
            event: (d.Event || d['イベント'] || "").trim(),
            searchKey: `${d.member} ${d.cosplayer} ${d.Tags} ${d.Event}`.toLowerCase()
          }));
          setAllData(formatted);
        }
      });
    };
    loadData();
  }, []);

  // 2. フィルタリング & ソート
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

  // 3. 無限スクロール
  useEffect(() => {
    const handleScroll = () => {
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        setDisplayLimit(prev => prev + 20);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Head>
        <title>VSPO! COSPLAY ARCHIVE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#0f0f0f" />
      </Head>

      <Script src="https://www.googletagmanager.com/gtag/js?id=G-QE8MD8LCQ0" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-QE8MD8LCQ0');
        `}
      </Script>

      <div className={`overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
      
      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">MENU</span>
          <button className="close-btn" onClick={() => setIsMenuOpen(false)}>&times;</button>
        </div>
        <div className="menu-item" onClick={() => {setActiveFilters({member:null, cosplayer:null, event:null, text:""}); setIsMenuOpen(false);}}><i className="fas fa-home"></i> ホーム</div>
        <div className="menu-divider"></div>
        {/* 他のメニュー項目もここに追加 */}
      </aside>

      <header>
        <div className="header-left">
          <button className="menu-btn" onClick={() => setIsMenuOpen(true)}><i className="fas fa-bars"></i></button>
          <div className="site-title" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
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

      <main>
        {/* チップコンテナ */}
        <div className="chips-container">
          <span className={`member-chip ${!activeFilters.member ? 'active' : ''}`} onClick={() => setActiveFilters(prev => ({...prev, member: null}))}>🏠 All</span>
          {memberOrder.map(m => (
            <span key={m} className={`member-chip ${activeFilters.member === m ? 'active' : ''}`} onClick={() => setActiveFilters(prev => ({...prev, member: m}))}>
              {memberIcons[m]} {m}
            </span>
          ))}
        </div>

        {/* ソートボタン */}
        <div className="utility-deck">
          <div className="sort-group">
            <button className={`sort-btn ${currentSort === 'old' ? 'active' : ''}`} onClick={() => setCurrentSort('old')}>⬇️ 登録順</button>
            <button className={`sort-btn ${currentSort === 'new' ? 'active' : ''}`} onClick={() => setCurrentSort('new')}>✨ 新着順</button>
            <button className={`sort-btn ${currentSort === 'random' ? 'active' : ''}`} onClick={() => setCurrentSort('random')}>🔀 シャッフル</button>
          </div>
        </div>

        {/* メイングリッド (爆速版) */}
        <div className="masonry-grid">
          {filteredData.slice(0, displayLimit).map((item) => (
            <div key={item._id} className="card">
              <div className="card-img-area" onClick={() => setModalImage(item)}>
                {/* ★Next.jsのImageコンポーネントで最適化 */}
                <Image 
                  src={getTwitterUrl(item.image, 'small')} 
                  alt={item.member}
                  width={400} 
                  height={600}
                  className="main-img"
                  loading="lazy"
                  unoptimized={false} 
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

      {/* モーダル (拡大時は高画質版を読み込む) */}
      {modalImage && (
        <div className="modal open" onClick={() => setModalImage(null)}>
          <span className="modal-close">&times;</span>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <img src={getTwitterUrl(modalImage.image, 'large')} alt="" />
            <div className="modal-actions">
              <a href={modalImage.link} target="_blank" rel="noreferrer" className="ctrl-chip"><i className="fas fa-external-link-alt"></i> Original</a>
            </div>
          </div>
        </div>
      )}

      {/* 既存のCSSをそのまま流用 */}
      <style jsx global>{`
        :root {
          --bg-color: #0f0f0f;
          --sidebar-bg: #0f0f0f;
          --text-color: #f1f1f1;
          --text-sub: #aaaaaa;
          --primary: #3ea6ff;
          --grad-main: linear-gradient(135deg, #3b82f6 0%, #d946ef 100%);
          --header-height: 60px;
          --chip-bg: #272727;
        }
        body { font-family: sans-serif; background: var(--bg-color); color: var(--text-color); margin: 0; padding-top: var(--header-height); }
        header { position: fixed; top: 0; width: 100%; height: var(--header-height); background: rgba(15,15,15,0.9); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: space-between; padding: 0 15px; z-index: 1000; }
        .masonry-grid { column-count: 2; column-gap: 16px; padding: 15px; }
        @media (min-width: 768px) { .masonry-grid { column-count: 3; } }
        @media (min-width: 1200px) { .masonry-grid { column-count: 5; } }
        .card { break-inside: avoid; margin-bottom: 20px; }
        .card-img-area { border-radius: 12px; overflow: hidden; cursor: pointer; background: #222; }
        .card-img-area :global(img) { width: 100%; height: auto; display: block; transition: 0.3s; }
        .card-img-area:hover :global(img) { transform: scale(1.05); }
        .chips-container { display: flex; gap: 8px; overflow-x: auto; padding: 15px; white-space: nowrap; }
        .member-chip { background: var(--chip-bg); padding: 8px 15px; border-radius: 20px; cursor: pointer; }
        .member-chip.active { background: #fff; color: #000; }
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: 0.3s; }
        .modal.open { opacity: 1; visibility: visible; }
        .modal img { max-height: 85vh; max-width: 95%; object-fit: contain; }
        /* 必要に応じて他のCSSもここに追加してください */
      `}</style>
    </>
  );
}
