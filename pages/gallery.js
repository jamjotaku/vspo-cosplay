import React, { useState, useEffect, useRef } from 'react';
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
    let res = [...allData].filter(d => (!activeFilters.member || d.member === activeFilters.member) && (!activeFilters.text || d.searchKey.includes(activeFilters.text)));
    
    // 全ソートロジックの適用
    if (currentSort === 'new') res.sort((a,b)=>b._id - a._id);
    else if (currentSort === 'old') res.sort((a,b)=>a._id - b._id);
    else if (currentSort === 'random') res.sort(() => Math.random() - 0.5);
    
    setFilteredData(res);
  }, [allData, activeFilters, currentSort]);

  const next = () => { setActiveStory(p => { if(!p) return null; const c = stories[p.memberIndex]; return p.slideIndex < c.images.length - 1 ? {...p, slideIndex: p.slideIndex+1} : null; }); };
  useEffect(() => { if(activeStory) { clearTimeout(storyTimer.current); storyTimer.current = setTimeout(next, 4000); } }, [activeStory]);

  return (
    <div className="g-root">
      <Head>
        <title>COLLECTION // VSPO! HUB</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap" rel="stylesheet" />
      </Head>

      <header className="g-header">
        <div className="g-header-inner">
          <Link href="/"><div className="g-back-btn">PORTAL</div></Link>
          <div className="g-brand-title">THE ARCHIVE</div>
          <div className="g-search-wrap">
            <input type="text" placeholder="Explore Archives..." onChange={e=>setActiveFilters(p=>({...p, text:e.target.value.toLowerCase()}))} />
          </div>
        </div>
      </header>

      <main className="g-main">
        {/* STORIES (no-scrollbar) */}
        <div className="g-stories-shelf no-scrollbar">
          {stories.map((s, idx) => (
            <div key={idx} className="s-node" onClick={()=>setActiveStory({memberIndex:idx, slideIndex:0})}>
              <div className="s-ring"><img src={getTwitterUrl(s.images[0].image, 'thumb')} alt="" /></div>
              <label>{s.member}</label>
            </div>
          ))}
        </div>

        {/* STICKY BAR (NEW / OLD / SHUFFLE) */}
        <div className="g-sticky-bar">
          <div className="g-chips no-scrollbar">
            <button className={!activeFilters.member?'active':''} onClick={()=>setActiveFilters(p=>({...p,member:null}))}>ALL</button>
            {memberOrder.map(m => (
              <button key={m} className={activeFilters.member===m?'active':''} onClick={()=>setActiveFilters(p=>({...p,member:m}))}>{m}</button>
            ))}
          </div>
          <div className="g-sort">
            <button className={currentSort==='new'?'active':''} onClick={()=>setCurrentSort('new')}>NEW</button>
            <button className={currentSort==='old'?'active':''} onClick={()=>setCurrentSort('old')}>OLD</button>
            <button className={currentSort==='random'?'active':''} onClick={()=>setCurrentSort('random')}>SHUFFLE</button>
          </div>
        </div>

        {/* PHOTO GRID */}
        <div className="g-grid">
          {filteredData.slice(0, displayLimit).map((item) => (
            <div key={item._id} className="g-card">
              <div className="g-media">
                <img src={getTwitterUrl(item.image, 'medium')} alt="" onClick={()=>setModalImage(item)} />
              </div>
              <div className="g-caption">
                <div className="g-name">{item.cosplayer}</div>
                <div className="g-mem">{item.member}</div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* STORY VIEWER */}
      {activeStory && (
        <div className="sv-root" onClick={()=>setActiveStory(null)}>
          <div className="sv-prog">
            {stories[activeStory.memberIndex].images.map((_,i)=>(
              <div key={i} className="sv-seg">
                <div className="sv-fill" style={{width:i < activeStory.slideIndex ? '100%' : (i === activeStory.slideIndex ? '100%' : '0%'), transition:i===activeStory.slideIndex?'4s linear':'none'}}></div>
              </div>
            ))}
          </div>
          <div className="sv-stage" onClick={e=>e.stopPropagation()}>
            <img src={getTwitterUrl(stories[activeStory.memberIndex].images[activeStory.slideIndex].image, 'large')} alt="" className="sv-main-img" />
            <div className="sv-label-box">{stories[activeStory.memberIndex].member}</div>
            <div className="sv-hit-left" onClick={() => setActiveStory(p => ({...p, slideIndex: Math.max(0, p.slideIndex - 1)}))}></div>
            <div className="sv-hit-right" onClick={next}></div>
          </div>
          <button className="sv-close-btn" onClick={() => setActiveStory(null)}>&times;</button>
        </div>
      )}
      
      {modalImage && <div className="g-modal-full" onClick={()=>setModalImage(null)}><img src={getTwitterUrl(modalImage.image, 'large')} alt="" /></div>}

      <style jsx global>{`
        body { margin:0; background:#050505; color:#fff; font-family:'Montserrat', sans-serif; overflow-x: hidden; }
        button { background: none; border: none; padding: 0; color: inherit; font: inherit; cursor: pointer; outline: inherit; }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .g-header { position:fixed; top:0; left:0; width:100%; height:80px; background:#050505; z-index:2000; border-bottom:1px solid #111; display:flex; align-items:center; justify-content:space-between; padding:0 40px; box-sizing:border-box; }
        .g-back-btn { font-size:12px; font-weight:800; color:#444; letter-spacing: 0.1em; transition: 0.3s; }
        .g-back-btn:hover { color: #fff; }
        .g-brand-title { font-weight:900; letter-spacing:0.15em; font-size: 16px; }
        .g-search-wrap input { background:#0a0a0a; border:1px solid #222; color:#fff; padding:10px 20px; border-radius:30px; outline: none; width: 180px; font-size: 12px; transition: 0.3s; }
        .g-search-wrap input:focus { border-color: #00f2ff; width: 220px; }

        .g-main { padding-top: 80px; }
        .g-stories-shelf { display:flex; gap:25px; padding:25px 40px; overflow-x:auto; border-bottom:1px solid #111; background: #050505; }
        .s-node { text-align:center; cursor:pointer; flex-shrink:0; }
        .s-ring { width:68px; height:68px; border-radius:50%; border:2px solid #111; padding:2px; transition: 0.3s; }
        .s-ring img { width:100%; height:100%; border-radius:50%; object-fit:cover; }
        .s-node:hover .s-ring { border-color: #00f2ff; box-shadow: 0 0 15px rgba(0,242,255,0.3); }
        .s-node label { display:block; font-size:10px; margin-top:10px; color:#555; font-weight: 700; letter-spacing: 0.05em; }

        .g-sticky-bar { position:sticky; top:80px; background:#050505; z-index:1500; display:flex; justify-content:space-between; align-items:center; padding:15px 40px; border-bottom:1px solid #111; }
        .g-chips { display:flex; gap:18px; overflow-x:auto; }
        .g-chips button { font-size:11px; font-weight:800; color:#333; transition: 0.3s; white-space: nowrap; }
        .g-chips button.active { color:#fff; }
        .g-sort button { font-size:11px; font-weight:800; margin-left:20px; color:#333; transition: 0.3s; }
        .g-sort button.active { color:#00f2ff; }

        .g-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:50px; padding:60px 40px; max-width: 1600px; margin: 0 auto; }
        .g-card { background:transparent; border-radius:4px; overflow:hidden; transition: 0.4s; }
        .g-media { overflow: hidden; border-radius: 2px; background: #0a0a0b; line-height: 0; }
        .g-media img { width:100%; height:auto; cursor:pointer; transition: 0.8s cubic-bezier(0.19, 1, 0.22, 1); }
        .g-card:hover .g-media img { transform: scale(1.05); }
        .g-caption { padding:20px 0; border-top: 1px solid #111; margin-top: 10px; }
        .g-name { font-weight:400; font-size: 16px; color: #eee; letter-spacing: 0.05em; }
        .g-mem { font-size:11px; color:#444; margin-top:6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }

        .sv-root { position:fixed; inset:0; background:#000; z-index:9000; display:flex; flex-direction:column; }
        .sv-prog { display:flex; gap:4px; padding:15px; }
        .sv-seg { flex:1; height:2px; background:rgba(255,255,255,0.2); border-radius: 10px; overflow: hidden; }
        .sv-fill { height:100%; background:#fff; width:0; }
        .sv-stage { flex:1; position:relative; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .sv-main-img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .sv-label-box { position:absolute; top:30px; left:30px; background:rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding:8px 20px; border-radius:50px; font-size:14px; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); }
        .sv-hit-left, .sv-hit-right { position:absolute; top:0; bottom:0; width:45%; z-index:9100; cursor:pointer; }
        .sv-hit-left { left:0; } .sv-hit-right { right:0; }
        .sv-close-btn { position:absolute; top:20px; right:20px; font-size:40px; z-index:9200; opacity: 0.5; transition: 0.3s; }
        .sv-close-btn:hover { opacity: 1; }

        .g-modal-full { position:fixed; inset:0; background:rgba(0,0,0,0.98); z-index:9999; display:flex; align-items:center; justify-content:center; }
        .g-modal-full img { max-height:95vh; max-width:95vw; object-fit:contain; }
      `}</style>
    </div>
  );
}
