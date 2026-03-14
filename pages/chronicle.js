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

    const g = svg.append("g");
    svg.call(d3.zoom().scaleExtent([0.3, 3]).on("zoom", (e) => g.attr("transform", e.transform)));

    const fLinks = data.links.filter(l => l.index <= (data.links.length * (timeFilter / 100)));
    const activeIds = new Set(fLinks.flatMap(l => [l.source.id || l.source, l.target.id || l.target]));
    const fNodes = data.nodes.filter(n => activeIds.has(n.id));

    const radiusScale = d3.scaleSqrt().domain([1, 40]).range([5, 25]);

    // 【高速化】シミュレーションの設定を極限まで短縮
    const simulation = d3.forceSimulation(fNodes)
      .force("link", d3.forceLink(fLinks).id(d => d.id).distance(120).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => radiusScale(d.degree) + 5))
      .velocityDecay(0.4) // 動きを早く止める
      .alphaDecay(0.1);    // 早期終了

    const link = g.append("g").selectAll("line").data(fLinks).join("line")
      .attr("stroke", "rgba(255,255,255,0.05)").attr("stroke-width", 0.5);

    const node = g.append("g").selectAll("g").data(fNodes).join("g")
      .attr("class", "node-item")
      .on("click", (e, d) => {
        const related = fLinks.filter(l => l.source.id === d.id || l.target.id === d.id);
        setSelectedNode({ ...d, detail: related[related.length - 1]?.originalData });
        setIsSidebarOpen(true);
      })
      .on("mouseenter", (e, d) => {
        node.style("opacity", n => n.id === d.id || fLinks.some(l => (l.source.id === d.id && l.target.id === n.id) || (l.target.id === d.id && l.source.id === n.id)) ? 1 : 0.05);
        link.style("stroke", l => l.source.id === d.id || l.target.id === d.id ? "#00f2ff" : "rgba(255,255,255,0.05)")
            .style("opacity", l => l.source.id === d.id || l.target.id === d.id ? 1 : 0.02);
      })
      .on("mouseleave", () => {
        node.style("opacity", 1);
        link.style("stroke", "rgba(255,255,255,0.05)").style("opacity", 1);
      });

    node.append("circle")
      .attr("r", d => radiusScale(d.degree))
      .attr("class", d => d.group === 'member' ? 'c-mem' : 'c-ply');

    node.append("text")
      .text(d => d.id)
      .attr("x", d => radiusScale(d.degree) + 8)
      .attr("y", 4)
      .style("display", d => d.degree > 15 ? "block" : "none");

    // 【高速化】シミュレーションを一定回数で停止させ、ブラウザの負荷をゼロにする
    simulation.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [data, timeFilter]);

  return (
    <div className="c-root">
      <Head>
        <title>CHRONICLE // LIGHT_VER</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@400;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="c-ui-header">
        <Link href="/"><div className="c-back-btn">PORTAL</div></Link>
        <div className="c-brand-block">
          <h1>VSPO! CHRONICLE</h1>
          <p>PERFORMANCE_OPTIMIZED // STARKILLER_2.6</p>
        </div>
      </div>

      <svg ref={svgRef} className="c-svg-canvas"></svg>

      <aside className={`c-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        <button className="c-close" onClick={() => setIsSidebarOpen(false)}>&times;</button>
        {selectedNode && selectedNode.detail && (
          <div className="c-sidebar-inner">
             {/* 略：サイドバーの中身は以前の美しいデザインを維持 */}
             <div className="c-mag-card">
              <img src={selectedNode.detail.image || selectedNode.detail.url} alt="" />
              <div className="c-card-ui">
                <span className="c-tag">CHRONICLE / DATA</span>
                <h1 className="c-member-name">{selectedNode.id}</h1>
              </div>
            </div>
            <div className="c-data-box">
              <div className="c-row"><span className="h">CONNECTION</span><span className="v">{selectedNode.degree} Entries</span></div>
              <a href={selectedNode.detail.link || selectedNode.detail.URL} target="_blank" rel="noreferrer" className="c-action-btn">ACCESS_LOG</a>
            </div>
          </div>
        )}
      </aside>

      <footer className="c-footer-ui">
        <div className="c-slider-container">
          <input type="range" min="1" max="100" value={timeFilter} onChange={e => setTimeFilter(e.target.value)} />
          <div className="c-slider-track" style={{ width: `${timeFilter}%` }}></div>
        </div>
      </footer>

      <style jsx global>{`
        body { margin: 0; background: #000; font-family: 'Montserrat', sans-serif; color: #fff; overflow: hidden; }
        .c-root { width: 100vw; height: 100vh; position: relative; }
        .c-svg-canvas { width: 100%; height: 100%; cursor: move; }

        /* ノードの基本スタイル（重いFilterを排除し、CSSで光らせる） */
        .c-mem { fill: rgba(0, 242, 255, 0.2); stroke: #00f2ff; stroke-width: 1.5; }
        .c-ply { fill: rgba(255, 0, 255, 0.1); stroke: #ff00ff; stroke-width: 1.5; }
        
        .node-item text { font-size: 10px; font-weight: 800; fill: #444; pointer-events: none; text-transform: uppercase; }
        .node-item:hover text { fill: #fff; }

        .c-ui-header { position: absolute; top: 40px; left: 40px; z-index: 100; display:flex; gap:30px; }
        .c-back-btn { background: rgba(255,255,255,0.05); backdrop-filter:blur(10px); border:1px solid #222; padding:10px 20px; font-size:10px; font-weight:800; border-radius:4px; cursor:pointer; }
        .c-brand-block h1 { font-size: 18px; letter-spacing: 0.3em; margin: 0; }
        .c-brand-block p { font-size: 8px; color: #333; margin-top: 4px; }

        .c-sidebar { position: fixed; right: 0; top: 0; width: 400px; height: 100%; background: rgba(5,5,5,0.9); backdrop-filter: blur(25px); transform: translateX(100%); transition: 0.6s cubic-bezier(0.19, 1, 0.22, 1); z-index: 2000; padding: 60px 40px; }
        .c-sidebar.is-open { transform: translateX(0); box-shadow: -20px 0 50px rgba(0,0,0,0.8); }
        .c-mag-card { width: 100%; aspect-ratio: 2/3; position: relative; border-radius: 4px; overflow: hidden; border: 1px solid #222; margin-bottom: 40px; }
        .c-mag-card img { width: 100%; height: 100%; object-fit: cover; }
        .c-member-name { font-family: 'Playfair Display', serif; font-style: italic; font-size: 40px; margin: 0; }
        
        .c-action-btn { display: block; width: 100%; text-align: center; border: 1px solid #00f2ff; color: #00f2ff; padding: 15px; border-radius: 2px; font-size: 10px; font-weight: 800; text-decoration: none; margin-top: 30px; }

        .c-footer-ui { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); width: 400px; }
        .c-slider-container { position: relative; height: 2px; background: #111; }
        .c-slider-container input { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; z-index: 10; }
        .c-slider-track { position: absolute; top: 0; left: 0; height: 100%; background: #00f2ff; box-shadow: 0 0 10px #00f2ff; }
      `}</style>
    </div>
  );
}
