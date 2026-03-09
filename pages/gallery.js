import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";
const memberIcons = { "花芽すみれ": "👾💤", "花芽なずな": "🍣", "小雀とと": "🔫🐥", "一ノ瀬うるは": "🌠", "胡桃のあ": "🧸♔", "橘ひなの": "🍫💘", "如月れん": "⏰", "英リサ": "💐", "空澄セナ": "🗝♠︎", "兎咲ミミ": "🐰🍭", "神成きゅぴ": "🌩", "八雲べに": "💄💚", "藍沢エマ": "🥞💫", "紫宮るな": "☪🐾", "猫汰つな": "🍒✨", "白波らむね": "🐻‍❄️🏖", "小森めと": "🪐", "夢野あかり": "🍼", "夜乃くろむ": "💀⛓", "紡木こかげ": "📘💧", "千燈ゆうひ": "🫠", "蝶屋はなび": "🦋🎆", "甘結もか": "🕹🔖", "銀城サイネ": "🎈", "龍巻ちせ": "🐉🌪" };
const memberOrder = Object.keys(memberIcons);

const getTwitterUrl = (url, size = 'medium') => { if (!url || !url.includes('pbs.twimg.com')) return url; return `${url.split('?')[0]}?format=jpg&name=${size}`; };

export default function Gallery() {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(40);
  const [activeFilters, setActiveFilters] = useState({ member: null, text: "" });
  const [currentSort, setCurrentSort] = useState('new');
  const [modalImage, setModalImage] = useState(null);
  const [stories, setStories] = useState([]);
  const [activeStory, setActiveStory] = useState(null);
  const storyTimer = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, {
        download: true, header: true, complete: (res) => {
          const formatted = res.data.filter(d => d.image || d.url).map((d, i) => ({
            _id: i,
            member: (d.member || d['名前'] || "").trim(),
            image: d.image || d.url,
            link: (d.link || d['URL'] || d.url || "").trim(),
            cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
            searchKey: `${d.member} ${d.cosplayer}`.toLowerCase()
          }));
          setAllData(formatted);
          setStories(memberOrder.map(m => {
            const pics = formatted.filter(d => d.member === m);
            return pics.length > 0 ? { member: m, images: [...pics].sort(() => 0.5 - Math.random()).slice(0, 5) } : null;
          }).filter(Boolean));
        }
      });
    };
    loadData();
  }, []);

  useEffect(() => {
    let result = [...allData].filter(d => {
      const mMem = !activeFilters.member || d.member === activeFilters.member;
      const mTxt = !activeFilters.text || d.searchKey.includes(activeFilters.text);
      return mMem && mTxt;
    });
    if (currentSort === 'new') result.sort((a, b) => b._id - a._id);
    else if (currentSort === 'old') result.sort((a, b) => a._id - b._id);
    setFilteredData(result);
  }, [allData, activeFilters, currentSort]);

  const nextSlide = () => { setActiveStory(prev => { if (!prev) return null; const current = stories[prev.memberIndex]; return prev.slideIndex < current.images.length - 1 ? { ...prev, slideIndex: prev.slideIndex + 1 } : null; }); };
  useEffect(() => { if (activeStory) { clearTimeout(storyTimer.current); storyTimer.current = setTimeout(nextSlide, 4000); } return () => clearTimeout(storyTimer.current); }, [activeStory]);

  return (
    <div className="gallery-root">
      <Head><title>ARCHIVE COLLECTION | VSPO!</title></Head>

      <header className="gal-header">
        <Link href="/"><div className="back-portal">PORTAL</div></Link>
        <div className="gal-title">ARCHIVE COLLECTION <span>'26</span></div>
        <div className="gal-search"><input type="text" placeholder="Explore..." onChange={e => setActiveFilters(p => ({...p, text: e.target.value.toLowerCase()}))} /></div>
      </header>

      <main className="gal-main">
        {/* Stories */}
        <div className="stories-strip">
          {stories.map((s, idx) => (
            <div key={idx} className="s-node" onClick={() => setActiveStory({ memberIndex: idx, slideIndex: 0 })}>
              <div className="s-ring"><img src={getTwitterUrl(s.images[0].image, 'thumb')} alt="" /></div>
              <label>{s.member}</label>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="filter-sticky-bar">
          <div className="chip-list">
            <button className={!activeFilters.member ? 'active' : ''} onClick={() => setActiveFilters(p => ({...p, member:null}))}>ALL SERIES</button>
            {memberOrder.map(m => (
              <button key={m} className={activeFilters.member === m ? 'active' : ''} onClick={() => setActiveFilters(p => ({...p, member:m}))}>{m}</button>
            ))}
          </div>
          <div className="sort-group">
            <button onClick={() => setCurrentSort('old')} className={currentSort === 'old' ? 'active' : ''}><i className="fas fa-history"></i></button>
            <button onClick={() => setCurrentSort('new')} className={currentSort === 'new' ? 'active' : ''}><i className="fas fa-sparkles"></i></button>
          </div>
        </div>

        {/* Grid (display: grid で安定化) */}
        <div className="catalog-grid">
          {filteredData.slice(0, displayLimit).map((item) => (
            <div key={item._id} className="catalog-card">
              <div className="card-media">
                <img src={getTwitterUrl(item.image, 'medium')} alt="" loading="lazy" onClick={() => setModalImage(item)} />
                {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="x-overlay"><i className="fa-brands fa-x-twitter"></i></a>}
              </div>
              <div className="card-caption">
                <div className="ref-id">REF. {String(item._id).padStart(4, '0')}</div>
                <div className="cos-name">{item.cosplayer}</div>
                <div className="mem-tag">{item.member}</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Story Viewer (見切れ対策済) */}
      {activeStory && (
        <div className="v-story-viewer" onClick={() => setActiveStory(null)}>
          <div className="v-story-progress">
            {stories[activeStory.memberIndex].images.map((_, i) => (
              <div key={i} className="v-s-seg"><div className="v-s-fill" style={{ width: i <= activeStory.slideIndex ? '100%' : '0%', transition: i === activeStory.slideIndex ? '4s linear' : 'none' }}></div></div>
            ))}
          </div>
          <div className="v-s-stage" onClick={e => e.stopPropagation()}>
            <img src={getTwitterUrl(stories[activeStory.memberIndex].images[activeStory.slideIndex].image, 'large')} alt="" />
            <div className="v-s-label">{stories[activeStory.memberIndex].member}</div>
            <div className="v-s-hit left" onClick={() => setActiveStory(prev => ({...prev, slideIndex: Math.max(0, prev.slideIndex - 1)}))}></div>
            <div className="v-s-hit right" onClick={nextSlide}></div>
          </div>
        </div>
      )}

      {modalImage && <div className="v-modal" onClick={() => setModalImage(null)}><img src={getTwitterUrl(modalImage.image, 'large')} alt="" /></div>}

      <style jsx global>{`
        :root { --v-accent: #00f2ff; --v-bg: #050505; }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; margin: 0; }
        
        .gal-header { position: fixed; top: 0; left: 0; width: 100%; height: 80px; background: #050505; z-index: 1000; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; border-bottom: 1px solid #111; box-sizing: border-box; }
        .back-portal { font-size: 11px; font-weight: 800; color: #333; cursor: pointer; transition: 0.3s; letter-spacing: 0.2em; }
        .back-portal:hover { color: #fff; }
        .gal-title { font-size: 16px; font-weight: 700; border-left: 1px solid #222; padding-left: 30px; letter-spacing: 0.1em; }
        .gal-search input { background: #0a0a0a; border: 1px solid #111; color: #fff; padding: 10px 20px; border-radius: 4px; width: 200px; outline: none; font-size: 12px; }

        .gal-main { padding-top: 100px; max-width: 1400px; margin: 0 auto; }
        .stories-strip { display: flex; gap: 30px; padding: 20px 40px; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid #111; }
        .s-node { text-align: center; cursor: pointer; flex-shrink: 0; }
        .s-ring { width: 64px; height: 64px; border-radius: 50%; border: 1px solid #1a1a1a; padding: 3px; transition: 0.4s; }
        .s-ring img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .s-node label { display: block; font-size: 9px; font-weight: 700; color: #444; margin-top: 10px; }
        .s-node:hover .s-ring { border-color: var(--v-accent); transform: scale(1.1); }

        .filter-sticky-bar { position: sticky; top: 80px; background: #050505; z-index: 900; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #111; }
        .chip-list { display: flex; gap: 20px; overflow-x: auto; scrollbar-width: none; }
        .chip-list button { background: transparent; border: none; color: #333; font-size: 11px; font-weight: 800; cursor: pointer; transition: 0.3s; white-space: nowrap; }
        .chip-list button.active { color: #fff; }

        .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 60px; padding: 50px 40px; }
        .catalog-card { transition: 0.4s; }
        .card-media { position: relative; overflow: hidden; border-radius: 2px; background: #0a0a0a; line-height: 0; }
        .card-media img { width: 100%; height: auto; transition: 1s cubic-bezier(0.19, 1, 0.22, 1); cursor: pointer; }
        .catalog-card:hover img { transform: scale(1.08); }
        .x-overlay { position: absolute; top: 15px; right: 15px; width: 32px; height: 32px; background: rgba(255,255,255,0.9); color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; opacity: 0; transition: 0.3s; text-decoration: none; }
        .catalog-card:hover .x-overlay { opacity: 1; }

        .card-caption { padding: 25px 0; border-bottom: 1px solid #111; }
        .ref-id { font-size: 9px; color: #222; font-weight: 800; margin-bottom: 10px; }
        .cos-name { font-size: 17px; font-weight: 400; color: #eee; }
        .mem-tag { font-size: 11px; color: #444; margin-top: 8px; font-weight: 700; }

        .v-story-viewer { position: fixed; inset: 0; background: #000; z-index: 5000; display: flex; flex-direction: column; }
        .v-story-progress { display: flex; gap: 5px; padding: 20px; }
        .v-s-seg { flex: 1; height: 2px; background: rgba(255,255,255,0.2); }
        .v-s-fill { height: 100%; background: #fff; width: 0; }
        .v-s-stage { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; }
        .v-s-stage img { max-height: 100%; max-width: 100%; object-fit: contain; }
        .v-s-label { position: absolute; top: 30px; left: 30px; font-weight: 800; }
        .v-s-hit { position: absolute; top: 0; bottom: 0; width: 40%; cursor: pointer; }
        .v-s-hit.left { left: 0; }
        .v-s-hit.right { right: 0; }

        .v-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.98); z-index: 4000; display: flex; align-items: center; justify-content: center; }
        .v-modal img { max-height: 95vh; max-width: 95%; object-fit: contain; }
      `}</style>
    </div>
  );
}
