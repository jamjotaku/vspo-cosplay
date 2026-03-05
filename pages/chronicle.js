import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import * as d3 from 'd3';
import Papa from 'papaparse';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

export default function ChroniclePage() {
  const svgRef = useRef(null);
  const [data, setData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState(100); 

  // 1. データの取得と計算（ここは変更なし）
  useEffect(() => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
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
            source: cName, 
            target: mName, 
            index: i,
            date: d.date || "Unknown Date",
            originalData: { ...d, member: mName, cosplayer: cName, image: img }
          });
        });
        setData({ nodes: Array.from(nodeMap.values()), links });
      }
    });
  }, []);

  // 2. D3.js エンジン（軽量化チューニング済み）
  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([0.1, 5]).on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    const filteredLinks = data.links.filter(l => l.index <= (data.links.length * (timeFilter / 100)));
    const activeIds = new Set(filteredLinks.flatMap(l => [l.source.id || l.source, l.target.id || l.target]));
    const filteredNodes = data.nodes.filter(n => activeIds.has(n.id));

    // ノードサイズのスケール（衝突判定を軽くするため範囲を少し調整）
    const radiusScale = d3.scaleSqrt()
      .domain([1, d3.max(data.nodes, d => d.degree)])
      .range([6, 30]);

    // --- 【軽量化ポイント：シミュレーションの高速鎮座】 ---
    const simulation = d3.forceSimulation(filteredNodes)
      .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(110).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => radiusScale(d.degree) + 3))
      .velocityDecay(0.3) // 摩擦を増やして早く止める
      .alphaDecay(0.06)   // 冷却速度を上げて計算時間を短縮
      .alphaMin(0.02);    // 微細な計算を切り捨てる

    // リンク描画
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", "#ffffff15") // 透明度を下げて描画負荷軽減
      .attr("stroke-width", 0.8);

    // ノード描画
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .attr("class", "node-group")
      .on("click", (e, d) => {
        const related = filteredLinks.filter(l => l.source.id === d.id || l.target.id === d.id);
        const latest = related[related.length - 1];
        setSelectedNode({ ...d, detail: latest?.originalData });
        setIsSidebarOpen(true);
      })
      .on("mouseenter", function(e, d) {
        // ホバー時に名前を表示
        d3.select(this).select("text").style("display", "block").style("opacity", 1);
        
        const neighbors = new Set([d.id]);
        filteredLinks.forEach(l => {
          if (l.source.id === d.id) neighbors.add(l.target.id);
          if (l.target.id === d.id) neighbors.add(l.source.id);
        });

        node.style("opacity", n => neighbors.has(n.id) ? 1 : 0.05);
        link.style("opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.02);
        link.attr("stroke", l => (l.source.id === d.id || l.target.id === d.id) ? "#00f2ff" : "#fff");
      })
      .on("mouseleave", function() {
        // 重要でないノードの名前を再び隠す
        node.select("text").style("display", d => d.degree > 15 ? "block" : "none");
        node.style("opacity", 1);
        link.style("opacity", 1);
        link.attr("stroke", "#ffffff15");
      })
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    // 円（ドロップシャドウの適用を限定）
    node.append("circle")
      .attr("r", d => radiusScale(d.degree))
      .attr("fill", d => d.group === 'member' ? "#00f2ff" : "#ff00ff")
      .attr("filter", d => d.degree > 12 ? "drop-shadow(0 0 10px rgba(0,242,255,0.4))" : "none");

    // --- 【軽量化ポイント：ラベルの初期表示制限】 ---
    node.append("text")
      .text(d => d.id)
      .attr("x", d => radiusScale(d.degree) + 6)
      .attr("y", 4)
      .attr("fill", "#fff")
      .attr("font-size", d => Math.max(10, radiusScale(d.degree) / 1.6) + "px")
      .attr("font-weight", "800")
      .style("pointer-events", "none")
      .style("text-shadow", "0 0 5px #000")
      .style("display", d => d.degree > 15 ? "block" : "none"); // 重要ノードのみ表示

    simulation.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [data, timeFilter]);

  return (
    <div className="chronicle-root">
      <Head>
        <title>VSPO! Cos-Chronicle Map</title>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@300;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="ui-overlay">
        <div className="brand-header">
          <h1>VSPO! COS-CHRONICLE</h1>
          <p>INTERACTIVE ARCHIVE RELATIONSHIP MAP</p>
        </div>
      </div>

      <svg ref={svgRef} style={{ width: '100vw', height: '100vh', background: '#050507' }}></svg>

      <aside className={`editorial-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
        <button className="close-x" onClick={() => setIsSidebarOpen(false)}>&times;</button>
        {selectedNode && selectedNode.detail && (
          <div className="sidebar-inner">
            <div className="mag-card">
              <img src={selectedNode.detail.image} alt="" />
              <div className="card-overlay">
                <span className="issue-tag">CHRONICLE / ARCHIVE</span>
                <h1 className="member-name">{selectedNode.detail.member}</h1>
                <div className="footer-info">
                  <span className="label">MODEL / </span>
                  <span className="cos-name">{selectedNode.detail.cosplayer}</span>
                </div>
              </div>
            </div>
            <div className="data-table">
              <div className="data-row"><span className="h">TOTAL ARCHIVES</span><span className="v">{selectedNode.degree} Entries</span></div>
              <div className="data-row"><span className="h">LAST OBSERVED</span><span className="v">{selectedNode.detail.date}</span></div>
              <a href={selectedNode.detail.link} target="_blank" rel="noreferrer" className="action-btn">OPEN ORIGINAL POST</a>
            </div>
          </div>
        )}
      </aside>

      <footer className="chronicle-ui">
        <div className="time-display">
          <span className="label">TIMELINE PROGRESSION</span>
          <span className="value">{Math.floor(timeFilter)}% / {data.links.length} TOTAL SESSIONS</span>
        </div>
        <input type="range" min="1" max="100" value={timeFilter} onChange={e => setTimeFilter(e.target.value)} className="history-slider" />
      </footer>

      <style jsx global>{`
        body { margin: 0; background: #050507; color: white; font-family: 'Montserrat', sans-serif; overflow: hidden; }
        .chronicle-root { width: 100vw; height: 100vh; position: relative; }
        .brand-header { position: absolute; top: 30px; left: 30px; z-index: 10; pointer-events: none; }
        .brand-header h1 { font-size: 18px; font-weight: 800; letter-spacing: 0.3em; margin: 0; color: #00f2ff; }
        .brand-header p { font-size: 8px; font-weight: 300; letter-spacing: 0.1em; opacity: 0.5; margin: 5px 0 0 0; }
        .node-group { cursor: pointer; }
        line { pointer-events: none; }
        .editorial-sidebar {
          position: fixed; right: 0; top: 0; width: 400px; height: 100%; background: rgba(8, 8, 10, 0.98);
          border-left: 1px solid #333; transform: translateX(100%); transition: 0.7s cubic-bezier(0.19, 1, 0.22, 1);
          z-index: 1000; padding: 40px 30px; box-sizing: border-box; box-shadow: -20px 0 60px rgba(0,0,0,0.9);
        }
        .editorial-sidebar.is-open { transform: translateX(0); }
        .close-x { position: absolute; top: 20px; left: 20px; background: none; border: none; color: #555; font-size: 32px; cursor: pointer; }
        .mag-card { width: 100%; aspect-ratio: 2/3; position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.8); margin-bottom: 40px; }
        .mag-card img { width: 100%; height: 100%; object-fit: cover; }
        .card-overlay {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%; padding: 30px; box-sizing: border-box;
          display: flex; flex-direction: column; justify-content: space-between;
          background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent, rgba(0,0,0,0.9));
        }
        .issue-tag { font-size: 9px; font-weight: 800; border-left: 3px solid #00f2ff; padding-left: 12px; }
        .member-name { font-family: 'Playfair Display', serif; font-style: italic; font-size: 42px; margin: 0; line-height: 0.85; }
        .cos-name { font-size: 20px; font-weight: 800; color: #fff; }
        .data-table { display: flex; flex-direction: column; gap: 15px; }
        .data-row { display: flex; justify-content: space-between; border-bottom: 1px solid #222; padding-bottom: 8px; }
        .data-row .h { font-size: 10px; color: #666; font-weight: 800; }
        .data-row .v { font-size: 12px; color: #fff; font-weight: 800; }
        .action-btn { display: block; width: 100%; text-align: center; border: 1px solid #00f2ff; color: #00f2ff; padding: 15px; border-radius: 8px; font-size: 11px; font-weight: 800; text-decoration: none; margin-top: 20px; }
        .chronicle-ui { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); width: 60%; z-index: 500; text-align: center; }
        .time-display .label { font-size: 10px; letter-spacing: 0.4em; color: #00f2ff; font-weight: 800; display: block; margin-bottom: 5px; }
        .time-display .value { font-size: 14px; font-weight: 300; opacity: 0.6; }
        .history-slider { width: 100%; height: 4px; accent-color: #00f2ff; cursor: pointer; margin-top: 15px; }
      `}</style>
    </div>
  );
}
