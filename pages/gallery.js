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
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&family=Playfair+Display:ital,wght@1,900&display=swap" rel="stylesheet" />
      </Head>

      <header className="g-header">
        <div className="g-header-inner">
          <Link href="/"><div className="g-back-btn"><i className="fas fa-chevron-left"></i> PORTAL</div></Link>
          <div className="g-brand-title">THE ARCHIVE <span>Vol. 2026</span></div>
          <div className="g-search-wrap">
            <input type="text" placeholder="Explore Archives..." onChange={e=>setActiveFilters(p=>({...p, text:e.target.value.toLowerCase()}))} />
          </div>
        </div>
      </header>

      <main className="g-main">
        <div className="g-container">
          <div className="g-stories-shelf">
            {stories.map((s, idx) => (
              <div key={idx} className="s-node" onClick={()=>setActiveStory({memberIndex:idx, slideIndex:0})}>
                <div className="s-ring">
                  <img src={getTwitterUrl(s.images[0].image, 'thumb')} alt="" />
                  <div className="s-glow-ring"></div>
                </div>
                <label>{s.member}</label>
              </div>
            ))}
          </div>

          <div className="g-sticky-bar">
            <div className="g-bar-inner">
              <div className="g-chips">
                <button className={!activeFilters.member?'active':''} onClick={()=>setActiveFilters(p=>({...p,member:null}))}>ALL SERIES</button>
                {memberOrder.map(m => <button key={m} className={activeFilters.member===m?'active':''} onClick={()=>setActiveFilters(p=>({...p,member:m}))}>{m}</button>)}
              </div>
              <div className="g-sort-controls">
                <span className="sort-label">SORT:</span>
                <button className={currentSort==='new'?'active':''} onClick={()=>setCurrentSort('new')}>NEW</button>
                <button className={currentSort==='old'?'active':''} onClick={()=>setCurrentSort('old')}>OLD</button>
                <button className={currentSort==='random'?'active':''} onClick={()=>setCurrentSort('random')}>SHUFFLE</button>
              </div>
            </div>
          </div>

          <div className="magazine-grid">
            {filteredData.slice(0, displayLimit).map((item, idx) => {
              const isFeatured = idx % 12 === 7;
              return (
                <div key={item._id} className={`mag-card ${isFeatured ? 'featured' : ''}`}>
                  <div className="mag-media">
                    <img src={getTwitterUrl(item.image, isFeatured ? 'large' : 'medium')} alt="" loading="lazy" onClick={()=>setModalImage(item)} />
                    {item.link && <a href={item.link} target="_blank" rel="noreferrer" className="mag-x-overlay"><i className="fa-brands fa-x-twitter"></i></a>}
                  </div>
                  <div className="mag-caption" onClick={()=>setActiveFilters(p=>({...p, text:item.cosplayer.toLowerCase()}))}>
                    <div className="mag-ref">ARCHIVE_ID.{String(item._id).padStart(4,'0')}</div>
                    <div className="mag-name">{item.cosplayer}</div>
                    <div className="mag-mem">{memberIcons[item.member]} {item.member}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* --- STORY VIEWER (視認性改善版) --- */}
      {activeStory && (
        <div className="sv-root" onClick={()=>setActiveStory(null)}>
          {/* 上部のUI保護用グラデーション */}
          <div className="sv-top-shadow"></div>
          
          <div className="sv-prog">
            {stories[activeStory.memberIndex].images.map((_,i)=>(
              <div key={i} className="sv-seg">
                <div className="sv-fill" style={{width:i < activeStory.slideIndex ? '100%' : (i === activeStory.slideIndex ? '100%' : '0%'), transition:i===activeStory.slideIndex?'4s linear':'none'}}></div>
              </div>
            ))}
          </div>

          <div className="sv-stage" onClick={e=>e.stopPropagation()}>
            <img src={getTwitterUrl(stories[activeStory.memberIndex].images[activeStory.slideIndex].image, 'large')} alt="" className="sv-main-img" />
            
            {/* メンバー名ラベルの視認性強化 */}
            <div className="sv-label-box">
              {memberIcons[stories[activeStory.memberIndex].member]} {stories[activeStory.memberIndex].member}
            </div>

            {/* ナビゲーションヒットエリア */}
            <div className="sv-hit-left" onClick={() => setActiveStory(p => ({...p, slideIndex: Math.max(0, p.slideIndex - 1)}))}></div>
            <div className="sv-hit-right" onClick={next}></div>
          </div>

          {/* 閉じるボタンを明示的に配置 */}
          <button className="sv-close-btn" onClick={() => setActiveStory(null)}>&times;</button>
        </div>
      )}
      
      {modalImage && <div className="g-modal-full" onClick={()=>setModalImage(null)}><img src={getTwitterUrl(modalImage.image, 'large')} alt="" /></div>}

      <style jsx global>{`
        :root { --g-accent: #00f2ff; --g-bg: #050505; --header-h: 90px; }
        body { margin:0; background:var(--g-bg); color:#fff; font-family:'Montserrat', sans-serif; }

        .g-header { position:fixed; top:0; left:0; width:100%; height:var(--header-h); background:rgba(5,5,5,0.95); backdrop-filter:blur(20px); z-index:2000; border-bottom:1px solid #111; }
        .g-header-inner { max-width:1600px; margin:0 auto; height:100%; display:flex; align-items:center; justify-content:space-between; padding:0 40px; }
        .g-brand-title { font-family:'Playfair Display', serif; font-size:24px; font-weight:900; letter-spacing:0.1em; }
        
        .g-main { padding-top: calc(var(--header-h) + 10px); }
        .g-stories-shelf { display:flex; gap:30px; padding:20px 40px 40px; overflow-x:auto; scrollbar-width:none; border-bottom:1px solid #111; }
        
        /* STORY VIEWER: IMPROVED */
        .sv-root { position:fixed; inset:0; background:#000; z-index:9000; display:flex; flex-direction:column; }
        .sv-top-shadow { position:absolute; top:0; left:0; right:0; height:120px; background:linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%); z-index:9100; pointer-events:none; }
        
        .sv-prog { display:flex; gap:6px; padding:20px 20px 10px; position:relative; z-index:9200; }
        .sv-seg { flex:1; height:3px; background:rgba(255,255,255,0.25); border-radius:10px; overflow:hidden; }
        .sv-fill { height:100%; background:#fff; width:0; box-shadow: 0 0 8px #fff; }

        .sv-stage { flex:1; position:relative; display:flex; align-items:center; justify-content:center; background:#000; overflow:hidden; }
        .sv-main-img { max-height:100%; max-width:100%; width:auto; height:auto; object-fit:contain; z-index:9050; }
        
        .sv-label-box { 
          position:absolute; top:20px; left:20px; z-index:9200; 
          background:rgba(255,255,255,0.1); backdrop-filter:blur(10px); 
          padding:10px 20px; border-radius:50px; border:1px solid rgba(255,255,255,0.2);
          font-weight:800; font-size:16px; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,0.5);
        }

        .sv-hit-left, .sv-hit-right { position:absolute; top:0; bottom:0; width:45%; z-index:9300; cursor:pointer; }
        .sv-hit-left { left:0; } .sv-hit-right { right:0; }
        
        .sv-close-btn { position:absolute; top:15px; right:15px; z-index:9400; background:none; border:none; color:#fff; font-size:40px; cursor:pointer; opacity:0.6; transition:0.3s; }
        .sv-close-btn:hover { opacity:1; scale:1.1; }

        /* Other Styles */
        .g-sticky-bar { position:sticky; top:var(--header-h); background:rgba(5,5,5,0.95); backdrop-filter:blur(20px); z-index:1500; border-bottom:1px solid #111; padding:15px 40px; }
        .magazine-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(350px, 1fr)); gap:60px; padding:60px 40px; }
        .mag-card.featured { grid-column: span 2; }
        .g-modal-full { position:fixed; inset:0; background:rgba(0,0,0,0.98); z-index:9999; display:flex; align-items:center; justify-content:center; }
        .g-modal-full img { max-height:95vh; object-fit:contain; }
      `}</style>
    </div>
  );
}
