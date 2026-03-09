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
        const nodes = [];
        const links = [];
        const nodeMap = new Map();

        raw.forEach((d, i) => {
          const mName = (d.member || d['名前']).trim();
          const cName = (d.cosplayer || d['レイヤー']).trim();
          const img = (d.image || d['画像'] || d.link || d['URL'] || "").replace('name=medium', 'name=large');

          [mName, cName].forEach((name, idx) => {
            if (!nodeMap.has(name)) {
              nodeMap.set(name, { 
                id: name, 
                group: idx === 0 ? 'member' : 'player', 
                baseImage: img,
                degree: 0 
              });
            }
            nodeMap.get(name).degree += 1;
          });

          links.push({ 
            source: cName, target: mName, index: i, date: d.date || "2026.XX.XX",
            originalData: { ...d, member: mName, cosplayer: cName, image: img }
          });
        });
        setData({ nodes: Array.from(nodeMap.values()), links });
      }
    });
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([0.2, 4]).on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    const filteredLinks = data.links.filter(l => l.index <= (data.links.length * (timeFilter / 100)));
    const activeIds = new Set(filteredLinks.flatMap(l => [l.source.id || l.source, l.target.id || l.target]));
    const filteredNodes = data.nodes.filter(n => activeIds.has(n.id));

    const radiusScale = d3.scaleSqrt().domain([1, 50]).range([8, 35]);

    const simulation = d3.forceSimulation(filteredNodes)
      .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(150).strength(0.3))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => radiusScale(d.degree) + 10))
      .alphaDecay(0.05);

    // 接続線（光の糸）
    const link = g.append("g")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", "rgba(255,255,255,0.05)")
      .attr("stroke-width", 0.5);

    // ノード（硝子の球体）
    const node = g.append("g")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .on("click", (e, d) => {
        const related = filteredLinks.filter(l => l.source.id === d.id || l.target.id === d.id);
        setSelectedNode({ ...d, detail: related[related.length - 1]?.originalData });
        setIsSidebarOpen(true);
      })
      .on("mouseenter", function(e, d) {
        d3.select(this).select("text").style("opacity", 1);
        node.style("opacity", n => (n.id === d.id) ? 1 : 0.1);
        link.style("stroke", l => (l.source.id === d.id || l.target.id === d.id) ? "#00f2ff" : "rgba(255,255,255,0.05)")
            .style("stroke-width", l => (l.source.id === d.id || l.target.id === d.id) ? 1.5 : 0.5)
            .style("opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.05);
      })
      .on("mouseleave", function() {
        node.select("text").style("opacity", d => d.degree > 15 ? 0.8 : 0);
        node.style("opacity", 1);
        link.style("stroke", "rgba(255,255,255,0.05)").style("stroke-width", 0.5).style("opacity", 1);
      })
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.append("circle")
      .attr("r", d => radiusScale(d.degree))
      .attr("fill", d => d.group === 'member' ? "rgba(0, 242, 255, 0.2)" : "rgba(255, 0, 255, 0.2)")
      .attr("stroke", d => d.group === 'member' ? "#00f2ff" : "#ff00ff")
      .attr("stroke-width", 1.5)
      .style("filter", "drop-shadow(0 0 8px rgba(0, 242, 255, 0.4))");

    node.append("text")
      .text(d => d.id)
      .attr("x", d => radiusScale(d.degree) + 10)
      .attr("y", 5)
      .attr("fill", "#fff")
      .attr("font-size", "11px")
      .attr("font-weight", "800")
      .style("pointer-events", "none")
      .style("opacity", d => d.degree > 15 ? 0.8 : 0)
      .style("text-shadow", "0 0 10px #000");

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
        <title>CHRONICLE // VSPO! HUB</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@100;400;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* --- UI OVERLAY --- */}
      <div className="c-ui-header">
        <Link href="/"><div className="c-back-btn"><i className="fas fa-chevron-left"></i> PORTAL</div></Link>
        <div className="c-brand-block">
          <h1>VSPO! CHRONICLE</h1>
          <p>SYSTEM_VERSION // 2.6.0_STARKILLER</p>
        </div>
      </div>

      <svg ref={svgRef} className="c-svg-canvas"></svg>

      {/* --- EDITORIAL SIDEBAR (Glass Concept) --- */}
      <aside className={`c-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        <button className="c-close" onClick={() => setIsSidebarOpen(false)}>&times;</button>
        {selectedNode && selectedNode.detail && (
          <div className="c-sidebar-inner">
            <div className="c-mag-card">
              <img src={selectedNode.detail.image} alt="" />
              <div className="c-card-glow"></div>
              <div className="c-card-ui">
                <span className="c-tag">DEEP_ARCHIVE / 0.1</span>
                <h1 className="c-member-name">{selectedNode.detail.member}</h1>
                <div className="c-footer">
                  <span className="c-lab">COPLAYED_BY //</span>
                  <span className="c-val">{selectedNode.detail.cosplayer}</span>
                </div>
              </div>
            </div>
            <div className="c-data-box">
              <div className="c-row"><span className="h">CONNECTION_DEGREE</span><span className="v">{selectedNode.degree} Nodes</span></div>
              <div className="c-row"><span className="h">CHRONICLE_DATE</span><span className="v">{selectedNode.detail.date}</span></div>
              <a href={selectedNode.detail.link} target="_blank" rel="noreferrer" className="c-action-btn">ACCESS_ORIGINAL_LOG</a>
            </div>
          </div>
        )}
      </aside>

      {/* --- TIMELINE SCANNER --- */}
      <footer className="c-footer-ui">
        <div className="c-time-info">
          <span className="c-lab">CHRONOLOGICAL_SCAN_PROGRESS</span>
          <span className="c-progress-val">{timeFilter}%</span>
        </div>
        <div className="c-slider-wrap">
          <input type="range" min="1" max="100" value={timeFilter} onChange={e => setTimeFilter(e.target.value)} />
          <div className="c-slider-fill" style={{ width: `${timeFilter}%` }}></div>
        </div>
      </footer>

      <style jsx global>{`
        :root { --v-cyan: #00f2ff; --v-magenta: #ff00ff; }
        body { margin: 0; background: #000; color: #fff; font-family: 'Montserrat', sans-serif; overflow: hidden; }
        
        .c-root { width: 100vw; height: 100vh; position: relative; }
        .c-svg-canvas { width: 100%; height: 100%; background: radial-gradient(circle at center, #0a0a0c 0%, #000 100%); }

        /* HEADER */
        .c-ui-header { position: absolute; top: 40px; left: 40px; z-index: 100; display:flex; gap:40px; align-items:flex-start; }
        .c-back-btn { background: rgba(255,255,255,0.05); backdrop-filter:blur(15px); border:1px solid rgba(255,255,255,0.1); padding:10px 20px; border-radius:4px; font-size:10px; font-weight:800; letter-spacing:0.2em; cursor:pointer; }
        .c-back-btn:hover { border-color: var(--v-cyan); color: var(--v-cyan); }
        .c-brand-block h1 { font-size: 20px; font-weight: 800; letter-spacing: 0.3em; margin: 0; color: #fff; }
        .c-brand-block p { font-size: 8px; color: #333; letter-spacing: 0.1em; margin-top: 5px; }

        /* SIDEBAR (Glassmorphism) */
        .c-sidebar {
          position: fixed; right: 0; top: 0; width: 420px; height: 100%; 
          background: rgba(5, 5, 5, 0.85); backdrop-filter: blur(30px);
          border-left: 1px solid rgba(255,255,255,0.05); transform: translateX(100%); 
          transition: 0.8s cubic-bezier(0.19, 1, 0.22, 1); z-index: 2000; padding: 60px 40px; box-sizing: border-box;
        }
        .c-sidebar.is-open { transform: translateX(0); box-shadow: -50px 0 100px rgba(0,0,0,0.9); }
        .c-close { position: absolute; top: 20px; left: 20px; background: none; border: none; color: #333; font-size: 32px; cursor: pointer; }

        .c-mag-card { width: 100%; aspect-ratio: 2/3; position: relative; border-radius: 4px; overflow: hidden; margin-bottom: 50px; border: 1px solid rgba(255,255,255,0.1); }
        .c-mag-card img { width: 100%; height: 100%; object-fit: cover; }
        .c-card-glow { position:absolute; inset:0; background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.8)); }
        .c-card-ui { position: absolute; inset: 0; padding: 30px; display: flex; flex-direction: column; justify-content: flex-end; }
        .c-tag { font-size: 9px; font-weight: 800; color: var(--v-cyan); letter-spacing: 0.2em; margin-bottom: 15px; border-left: 2px solid var(--v-cyan); padding-left: 10px; }
        .c-member-name { font-family: 'Playfair Display', serif; font-style: italic; font-size: 48px; margin: 0; line-height: 0.9; color: #fff; }
        .c-footer { margin-top: 20px; font-size: 11px; }
        .c-lab { color: #444; font-weight: 800; margin-right: 10px; }

        .c-data-box { border-top: 1px solid #111; padding-top: 30px; }
        .c-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .c-row .h { font-size: 9px; color: #444; font-weight: 800; letter-spacing: 0.1em; }
        .c-row .v { font-size: 12px; color: #fff; font-weight: 400; }
        .c-action-btn { display: block; width: 100%; text-align: center; border: 1px solid var(--v-cyan); color: var(--v-cyan); padding: 18px; border-radius: 2px; font-size: 10px; font-weight: 800; text-decoration: none; margin-top: 30px; transition: 0.3s; }
        .c-action-btn:hover { background: var(--v-cyan); color: #000; }

        /* FOOTER SLIDER */
        .c-footer-ui { position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); width: 500px; text-align: center; }
        .c-time-info { display: flex; justify-content: space-between; margin-bottom: 15px; }
        .c-time-info .c-lab { font-size: 9px; letter-spacing: 0.2em; color: #333; }
        .c-progress-val { font-size: 14px; font-weight: 100; color: var(--v-cyan); }
        .c-slider-wrap { position: relative; height: 2px; background: #111; }
        .c-slider-wrap input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 10; }
        .c-slider-fill { position: absolute; top: 0; left: 0; height: 100%; background: var(--v-cyan); box-shadow: 0 0 10px var(--v-cyan); transition: 0.2s; }
      `}</style>
    </div>
  );
}
