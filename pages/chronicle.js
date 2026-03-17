import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import * as d3 from 'd3';
import Papa from 'papaparse';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

export default function ChroniclePage() {
  const svgRef = useRef(null);
  const [data, setData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [lockedId, setLockedId] = useState(null); // ★追加：ロックオン中のノードID
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState(100); 

  useEffect(() => {
    Papa.parse(CSV_URL, {
      download: true, header: true, skipEmptyLines: true,
      complete: (results) => {
        const raw = results.data.filter(d => (d.member || d['名前']) && (d.cosplayer || d['レイヤー']));
        const nodeMap = new Map();
        const links = raw.map((d, i) => {
          const m = (d.member || d['名前']).trim();
          const c = (d.cosplayer || d['レイヤー']).trim();
          [m, c].forEach((n, idx) => {
            if (!nodeMap.has(n)) nodeMap.set(n, { id: n, group: idx === 0 ? 'member' : 'player', degree: 0 });
            nodeMap.get(n).degree += 1;
          });
          return { source: c, target: m, index: i, originalData: d };
        });
        setData({ nodes: Array.from(nodeMap.values()), links });
      }
    });
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const width = window.innerWidth, height = window.innerHeight;
    const svg = d3.select(svgRef.current).attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    // 背景をクリックでロック解除
    svg.on("click", (e) => {
      if (e.target.tagName === "svg") {
        setLockedId(null);
        setIsSidebarOpen(false);
      }
    });

    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([0.1, 5]).on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    const fLinks = data.links.filter(l => l.index <= (data.links.length * (timeFilter / 100)));
    const activeIds = new Set(fLinks.flatMap(l => [l.source.id || l.source, l.target.id || l.target]));
    const fNodes = data.nodes.filter(n => activeIds.has(n.id));

    const radiusScale = d3.scaleSqrt().domain([1, 40]).range([6, 28]);

    const simulation = d3.forceSimulation(fNodes)
      .force("link", d3.forceLink(fLinks).id(d => d.id).distance(140).strength(0.4))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => radiusScale(d.degree) + 10))
      .velocityDecay(0.3)
      .alphaDecay(0.08);

    const link = g.append("g").selectAll("line").data(fLinks).join("line")
      .attr("stroke", "rgba(255,255,255,0.08)").attr("stroke-width", 0.6);

    const node = g.append("g").selectAll("g").data(fNodes).join("g")
      .attr("class", "node-item")
      .style("cursor", "pointer")
      .on("click", (e, d) => {
        e.stopPropagation();
        // ロックオン処理
        setLockedId(d.id);
        
        // ★修正：関連リンクから「ランダム」に1件抽出して表示
        const related = fLinks.filter(l => l.source.id === d.id || l.target.id === d.id);
        const randomEntry = related[Math.floor(Math.random() * related.length)];
        
        setSelectedNode({ ...d, detail: randomEntry?.originalData });
        setIsSidebarOpen(true);
      })
      .on("mouseenter", (e, d) => {
        if (lockedId) return; // ロック中はホバー反応を無効化
        updateHighlight(d.id);
      })
      .on("mouseleave", () => {
        if (lockedId) return;
        resetHighlight();
      });

    // ハイライト・ロックオンの共通ロジック
    const updateHighlight = (id) => {
      const neighbors = new Set([id]);
      fLinks.forEach(l => {
        if (l.source.id === id) neighbors.add(l.target.id);
        if (l.target.id === id) neighbors.add(l.source.id);
      });

      node.style("opacity", n => neighbors.has(n.id) ? 1 : 0.05);
      link.style("stroke", l => l.source.id === id || l.target.id === id ? "var(--v-accent, #00f2ff)" : "rgba(255,255,255,0.05)")
          .style("opacity", l => l.source.id === id || l.target.id === id ? 1 : 0.02)
          .style("stroke-width", l => l.source.id === id || l.target.id === id ? 1.5 : 0.6);
    };

    const resetHighlight = () => {
      node.style("opacity", 1);
      link.style("stroke", "rgba(255,255,255,0.08)").style("opacity", 1).style("stroke-width", 0.6);
    };

    // 初期化またはlockedId変更時に状態を反映
    if (lockedId) updateHighlight(lockedId);

    node.append("circle")
      .attr("r", d => radiusScale(d.degree))
      .attr("class", d => d.group === 'member' ? 'c-mem' : 'c-ply');

    node.append("text")
      .text(d => d.id)
      .attr("x", d => radiusScale(d.degree) + 10)
      .attr("y", 4)
      .style("display", d => d.degree > 10 || lockedId === d.id ? "block" : "none");

    simulation.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [data, timeFilter, lockedId]); // lockedIdが変更されたら再描画

  return (
    <div className="c-root">
      <Head>
        <title>CHRONICLE // NETWORK_ANALYSIS</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@400;800&family=JetBrains+Mono:wght@800&display=swap" rel="stylesheet" />
      </Head>

      <div className="c-ui-overlay">
        <div className="c-ui-header">
          <Link href="/"><div className="c-back-btn">RETURN_PORTAL</div></Link>
          <div className="c-brand-block">
            <h1>VSPO! CHRONICLE</h1>
            <p>RELATIONSHIP_ANALYSIS_SYSTEM // STARKILLER_2.7</p>
          </div>
        </div>

        {/* ガイダンスチップ */}
        <div className="c-guide-chip">
          <div className="chip-row"><span className="key">CLICK</span> <span className="val">LOCK_ON_NODE</span></div>
          <div className="chip-row"><span className="key">DRAG</span> <span className="val">MOVE_VIEW</span></div>
          <div className="chip-row"><span className="key">SCROLL</span> <span className="val">ZOOM_IN_OUT</span></div>
          <div className="chip-row"><span className="key">BG_CLICK</span> <span className="val">RELEASE_LOCK</span></div>
        </div>
      </div>

      <svg ref={svgRef} className="c-svg-canvas"></svg>

      <aside className={`c-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        <button className="c-close" onClick={() => { setIsSidebarOpen(false); setLockedId(null); }}>&times;</button>
        {selectedNode && selectedNode.detail && (
          <div className="c-sidebar-inner">
            <div className="c-mag-card">
              <img src={selectedNode.detail.image || selectedNode.detail.url} alt="" />
              <div className="c-card-ui">
                <span className="c-tag">CHRONICLE / SAMPLING_DATA</span>
                <h1 className="c-member-name">{selectedNode.id}</h1>
              </div>
            </div>
            <div className="c-data-box">
              <div className="c-row">
                <span className="h">CONNECTION_DENSITY</span>
                <span className="v">{selectedNode.degree} Entries</span>
              </div>
              <p className="c-random-hint">※クリックするたびに異なる記録を抽出します</p>
              <a href={selectedNode.detail.link || selectedNode.detail.URL} target="_blank" rel="noreferrer" className="c-action-btn">ACCESS_MISSION_LOG</a>
            </div>
          </div>
        )}
      </aside>

      <footer className="c-footer-ui">
        <div className="slider-label">TIME_LINE_EXPANSION</div>
        <div className="c-slider-container">
          <input type="range" min="1" max="100" value={timeFilter} onChange={e => setTimeFilter(e.target.value)} />
          <div className="c-slider-track" style={{ width: `${timeFilter}%` }}></div>
        </div>
      </footer>

      <style jsx global>{`
        body { margin: 0; background: #000; font-family: 'Montserrat', sans-serif; color: #fff; overflow: hidden; }
        .c-root { width: 100vw; height: 100vh; position: relative; background: radial-gradient(circle at center, #050510 0%, #000 100%); }
        .c-svg-canvas { width: 100%; height: 100%; }

        .c-mem { fill: rgba(0, 242, 255, 0.1); stroke: #00f2ff; stroke-width: 1.5; filter: drop-shadow(0 0 5px rgba(0, 242, 255, 0.5)); }
        .c-ply { fill: rgba(255, 0, 255, 0.05); stroke: #ff00ff; stroke-width: 1.5; filter: drop-shadow(0 0 5px rgba(255, 0, 255, 0.4)); }
        
        .node-item text { font-size: 11px; font-weight: 800; fill: #555; pointer-events: none; font-family: 'JetBrains Mono'; }
        .node-item:hover text { fill: #fff; text-shadow: 0 0 10px #fff; }

        .c-ui-overlay { position: absolute; top: 40px; left: 40px; z-index: 100; pointer-events: none; }
        .c-ui-header, .c-guide-chip { pointer-events: auto; }
        
        .c-back-btn { background: rgba(255,255,255,0.03); backdrop-filter:blur(10px); border:1px solid #333; padding:12px 24px; font-size:10px; font-weight:800; border-radius:4px; cursor:pointer; font-family: 'JetBrains Mono'; transition: 0.3s; }
        .c-back-btn:hover { border-color: #00f2ff; color: #00f2ff; box-shadow: 0 0 20px rgba(0,242,255,0.2); }
        .c-brand-block { margin-top: 30px; }
        .c-brand-block h1 { font-size: 24px; letter-spacing: 0.4em; margin: 0; font-weight: 900; }
        .c-brand-block p { font-size: 9px; color: #444; margin-top: 8px; font-family: 'JetBrains Mono'; }

        /* ガイダンスチップ */
        .c-guide-chip { margin-top: 40px; background: rgba(255,255,255,0.02); border: 1px solid #111; padding: 15px; border-radius: 4px; display: inline-block; }
        .chip-row { font-size: 9px; margin-bottom: 6px; font-family: 'JetBrains Mono'; }
        .chip-row:last-child { margin-bottom: 0; }
        .chip-row .key { color: #00f2ff; margin-right: 10px; }
        .chip-row .val { color: #555; }

        .c-sidebar { position: fixed; right: 0; top: 0; width: 420px; height: 100%; background: rgba(3,3,8,0.92); backdrop-filter: blur(35px); transform: translateX(100%); transition: 0.8s cubic-bezier(0.16, 1, 0.3, 1); z-index: 2000; padding: 60px 40px; border-left: 1px solid #111; }
        .c-sidebar.is-open { transform: translateX(0); }
        .c-mag-card { width: 100%; aspect-ratio: 2/3; position: relative; border-radius: 4px; overflow: hidden; border: 1px solid #222; margin-bottom: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
        .c-mag-card img { width: 100%; height: 100%; object-fit: cover; }
        .c-member-name { font-family: 'Playfair Display', serif; font-style: italic; font-size: 48px; margin: 0; font-weight: 900; line-height: 1; }
        
        .c-random-hint { font-size: 10px; color: #444; margin-top: 20px; font-style: italic; }
        .c-action-btn { display: block; width: 100%; text-align: center; border: 1px solid #00f2ff; color: #00f2ff; padding: 18px; border-radius: 2px; font-size: 11px; font-weight: 800; text-decoration: none; margin-top: 20px; font-family: 'JetBrains Mono'; transition: 0.3s; }
        .c-action-btn:hover { background: #00f2ff; color: #000; box-shadow: 0 0 30px #00f2ff; }

        .c-footer-ui { position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); width: 450px; text-align: center; }
        .slider-label { font-size: 10px; font-family: 'JetBrains Mono'; color: #333; margin-bottom: 15px; letter-spacing: 0.2em; }
        .c-slider-container { position: relative; height: 3px; background: #111; border-radius: 3px; }
        .c-slider-container input { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; z-index: 10; }
        .c-slider-track { position: absolute; top: 0; left: 0; height: 100%; background: #00f2ff; box-shadow: 0 0 15px #00f2ff; border-radius: 3px; }
      `}</style>
    </div>
  );
}
