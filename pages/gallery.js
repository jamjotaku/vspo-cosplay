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
    const fetch = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(CSV_URL, { download: true, header: true, complete: (res) => {
        const data = res.data.filter(d => d.image || d.url).map((d, i) => ({
          _id: i, member: (d.member || d['名前'] || "").trim(),
          image: d.image || d.url, link: (d.link || d['URL'] || "").trim(),
          cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
          searchKey: `${d.member} ${d.cosplayer}`.toLowerCase()
        }));
        setAllData(data);
        setStories(memberOrder.map(m => {
          const pics = data.filter(d => d.member === m);
          return pics.length ? { member: m, images: [...pics].sort(()=>.5-Math.random()).slice(0,5) } : null;
        }).filter(Boolean));
      }});
    };
    fetch();
  }, []);

  useEffect(() => {
    let res = allData.filter(d => (!activeFilters.member || d.member === activeFilters.member) && (!activeFilters.text || d.searchKey.includes(activeFilters.text)));
    if (currentSort === 'new') res.sort((a,b)=>b._id - a._id);
    else res.sort((a,b)=>a._id - b._id);
    setFilteredData(res);
  }, [allData, activeFilters, currentSort]);

  const next = () => { setActiveStory(p => { if(!p) return null; const c = stories[p.memberIndex]; return p.slideIndex < c.images.length - 1 ? {...p, slideIndex: p.slideIndex+1} : null; }); };
  useEffect(() => { if(activeStory) { clearTimeout(storyTimer.current); storyTimer.current = setTimeout(next, 4000); } }, [activeStory]);

  return (
    <div className="g-root">
      <Head>
        <title>COLLECTION // VSPO! HUB</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;400;700;800&family=Playfair+Display:ital,wght@1,900&display=swap" rel="stylesheet" />
      </Head>

      <header className="g-header">
        <div className="g-header-inner">
          <Link href="/"><div className="g-back-btn"><i className="fas fa-chevron-left"></i> PORTAL</div></Link>
          <div className="g-brand-title">THE ARCHIVE <span>Vol. 2026</span></div>
          <div className="g-search-wrap">
            <input type="text" placeholder="Search our collection..." onChange={e=>setActiveFilters(p=>({...p, text:e.target.value.toLowerCase()}))} />
          </div>
        </div>
      </header>

      <main className="g-container">
        {/* Stories: Curated Round Nodes */}
        <div className="g-stories-shelf">
          {stories.map((s, idx) => (
            <div key={idx} className="s-node" onClick={()=>setActiveStory({memberIndex:idx, slideIndex:0})}>
              <div className="s-ring"><img src={getTwitterUrl(s.images[0].image, 'thumb')} alt="" /></div>
              <label>{s.member}</label>
            </div>
          ))}
        </div>

        {/* Filter Bar: Glass Styling */}
        <div className="g-sticky-bar">
          <div className="g-bar-inner">
            <div className="g-chips">
              <button className={!activeFilters.member?'active':''} onClick={()=>setActiveFilters(p=>({...p,member:null}))}>ALL SERIES</button>
              {memberOrder.map(m => <button key={m} className={activeFilters.member===m?'active':''} onClick={()=>setActiveFilters(p=>({...p,member:m}))}>{m}</button>)}
            </div>
            <div className="g-sort-group">
              <button className={currentSort==='old'?'active':''} onClick={()=>setCurrentSort('old')}><i className="fas fa-history"></i></button>
              <button className={currentSort==='new'?'active':''} onClick={()=>setCurrentSort('new')}><i className="fas fa-sparkles"></i></button>
            </div>
          </div>
        </div>

        {/* Magazine Grid: Dynamic Spacing */}
        <div className="magazine-grid">
          {filteredData.slice(0, displayLimit).map((item, idx) => {
            // 数枚ごとに「大判写真」にするロジック (例: 7枚目、15枚目...)
            const isFeatured = idx % 10 === 6;
            return (
              <div key={item._id} className={`mag-card ${isFeatured ? 'featured' : ''}`}>
                <div className="mag-media">
                  <img src={getTwitterUrl(item.image, isFeatured ? 'large' : 'medium')} alt="" loading="lazy" onClick={()=>setModalImage(item)} />
                  {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="mag-x-overlay"><i className="fa-brands fa-x-twitter"></i></a>}
                </div>
                <div className="mag-caption" onClick={()=>setActiveFilters(p=>({...p, text:item.cosplayer.toLowerCase()}))}>
                  <div className="mag-ref">ID.{String(item._id).padStart(4,'0')}</div>
                  <div className="mag-name">{item.cosplayer}</div>
                  <div className="mag-mem">{memberIcons[item.member]} {item.member}</div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Story Viewer (見切れ対策済) */}
      {activeStory && (
        <div className="sv-root" onClick={()=>setActiveStory(null)}>
          <div className="sv-prog">{stories[activeStory.memberIndex].images.map((_,i)=>(<div key={i} className="sv-seg"><div className="sv-fill" style={{width:i<=activeStory.slideIndex?'100%':'0%', transition:i===activeStory.slideIndex?'4s linear':'none'}}></div></div>))}</div>
          <div className="sv-stage" onClick={e=>e.stopPropagation()}>
            <img src={getTwitterUrl(stories[activeStory.memberIndex].images[activeStory.slideIndex].image, 'large')} alt="" />
            <div className="sv-label">{stories[activeStory.memberIndex].member}</div>
            <div className="sv-hit l" onClick={()=>setActiveStory(p=>({...p, slideIndex:Math.max(0, p.slideIndex-1)}))}></div>
            <div className="sv-hit r" onClick={next}></div>
          </div>
        </div>
      )}

      {modalImage && <div className="g-modal-full" onClick={()=>setModalImage(null)}><img src={getTwitterUrl(modalImage.image, 'large')} alt="" /></div>}

      <style jsx global>{`
        :root { --g-accent: #00f2ff; --g-bg: #050505; --g-glass: rgba(255, 255, 255, 0.03); }
        body { margin:0; background:var(--g-bg); color:#fff; font-family:'Montserrat', sans-serif; }

        /* Header: Editorial Feel */
        .g-header { position:fixed; top:0; left:0; width:100%; height:90px; background:rgba(5,5,5,0.8); backdrop-filter:blur(20px); z-index:1000; border-bottom:1px solid #111; }
        .g-header-inner { max-width:1600px; margin:0 auto; height:100%; display:flex; align-items:center; justify-content:space-between; padding:0 40px; }
        .g-back-btn { font-size:11px; font-weight:800; color:#555; cursor:pointer; letter-spacing:0.2em; transition:0.3s; }
        .g-back-btn:hover { color:#fff; }
        .g-brand-title { font-family:'Playfair Display', serif; font-size:22px; font-weight:900; letter-spacing:0.1em; }
        .g-brand-title span { font-family:'Montserrat', sans-serif; font-size:12px; font-weight:400; color:#444; margin-left:10px; font-style:italic; }
        .g-search-wrap input { background:#111; border:1px solid #222; color:#fff; padding:12px 25px; border-radius:40px; font-size:12px; width:220px; outline:none; transition:0.3s; }
        .g-search-wrap input:focus { border-color:var(--g-accent); width:300px; }

        .g-main { padding-top:110px; }
        .g-container { max-width:1600px; margin:0 auto; }

        /* Stories */
        .g-stories-shelf { display:flex; gap:35px; padding:20px 40px; overflow-x:auto; scrollbar-width:none; border-bottom:1px solid #111; }
        .s-node { text-align:center; cursor:pointer; flex-shrink:0; }
        .s-ring { width:70px; height:70px; border-radius:50%; border:1px solid #1a1a1a; padding:4px; transition:0.4s cubic-bezier(0.19, 1, 0.22, 1); }
        .s-ring img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
        .s-node label { display:block; font-size:9px; font-weight:800; color:#444; margin-top:12px; letter-spacing:0.1em; }
        .s-node:hover .s-ring { border-color:var(--g-accent); transform:scale(1.1); }

        /* Sticky Bar */
        .g-sticky-bar { position:sticky; top:90px; background:rgba(5,5,5,0.9); z-index:900; border-bottom:1px solid #111; }
        .g-bar-inner { max-width:1600px; margin:0 auto; padding:20px 40px; display:flex; justify-content:space-between; align-items:center; }
        .g-chips { display:flex; gap:20px; overflow-x:auto; scrollbar-width:none; }
        .g-chips button { background:none; border:none; color:#333; font-size:11px; font-weight:800; cursor:pointer; white-space:nowrap; transition:0.3s; }
        .g-chips button.active { color:#fff; border-bottom:1px solid var(--g-accent); padding-bottom:5px; }

        /* Magazine Grid: The Heart of the Layout */
        .magazine-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); 
          grid-auto-flow: dense;
          gap: 60px; 
          padding: 60px 40px; 
        }
        .mag-card { transition: 0.5s; position: relative; }
        .mag-card.featured { grid-column: span 2; grid-row: span 1; } /* 2列分使う大判設定 */
        @media (max-width: 800px) { .mag-card.featured { grid-column: span 1; } }

        .mag-media { position:relative; overflow:hidden; border-radius:3px; background:#0a0a0b; line-height:0; box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
        .mag-media img { width:100%; height:auto; transition:1.2s cubic-bezier(0.19, 1, 0.22, 1); cursor:pointer; }
        .mag-card:hover img { transform:scale(1.05); }
        .mag-x-overlay { position:absolute; top:20px; right:20px; width:36px; height:36px; background:#fff; color:#000; border-radius:50%; display:flex; align-items:center; justify-content:center; opacity:0; transition:0.3s; box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
        .mag-card:hover .mag-x-overlay { opacity:1; }

        .mag-caption { padding:25px 0; border-top:1px solid #111; margin-top:15px; cursor:pointer; }
        .mag-ref { font-size:9px; color:#222; font-weight:800; margin-bottom:10px; letter-spacing:0.2em; }
        .mag-name { font-size:20px; font-weight:400; color:#eee; letter-spacing:0.02em; }
        .mag-mem { font-size:11px; color:#444; margin-top:8px; font-weight:700; letter-spacing:0.1em; }

        /* Modal & Story (略さず安定稼働) */
        .sv-root { position:fixed; inset:0; background:#000; z-index:5000; display:flex; flex-direction:column; }
        .sv-stage img { max-height:100%; max-width:100%; object-fit:contain; }
        .g-modal-full { position:fixed; inset:0; background:rgba(0,0,0,0.98); z-index:4000; display:flex; align-items:center; justify-content:center; }
        .g-modal-full img { max-height:95vh; object-fit:contain; }
      `}</style>
    </div>
  );
}
