import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

// Leafletはブラウザ側でのみ動くため、dynamic importが必要
import dynamic from 'next/dynamic';
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

export default function LeafletTacticalMap() {
  const [logs, setLogs] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [L, setL] = useState(null);

  useEffect(() => {
    // Leafletのスタイルとインスタンスを初期化
    import('leaflet').then((leaflet) => {
      setL(leaflet);
    });
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('fan_logs').select('*').eq('user_id', session.user.id);
      if (data) geocodeAll(data);
    }
  };

  // --- OSS版ジオコーディング (Nominatim使用) ---
  const geocodeAll = async (logData) => {
    const newMarkers = [];
    for (const log of logData) {
      if (!log.location) continue;
      try {
        // 無料のNominatim APIを叩く (1秒1リクエストの制限に注意)
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(log.location)}`);
        const data = await res.json();
        if (data && data.length > 0) {
          newMarkers.push({
            id: log.id,
            name: log.event_name,
            locName: log.location,
            pos: [parseFloat(data[0].lat), parseFloat(data[0].lon)],
            fervor: log.fervor_score,
            date: log.event_date
          });
        }
        // 負荷軽減のためのウェイト
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error("GEOCODE_ERROR:", err);
      }
    }
    setMarkers(newMarkers);
    setLoading(false);
  };

  // カスタムアイコン（マゼンタ/シアンのネオン円）
  const createCustomIcon = (fervor) => {
    if (!L) return null;
    const color = fervor >= 5 ? 'var(--v-cyn)' : 'var(--v-mag)';
    const size = 12 + fervor * 3;
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="width:${size}px; height:${size}px; background:${color}; border:2px solid #fff; border-radius:50%; box-shadow:0 0 15px ${color};"></div>`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  };

  if (loading || !L) return <div className="m-loader">CALIBRATING_OSS_SATELLITE...</div>;

  return (
    <div className="m-root">
      <Head>
        <title>DR // OSS_TACTICAL_MAP</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&family=Montserrat:wght@400;900&display=swap" rel="stylesheet" />
      </Head>

      <header className="m-header">
        <div className="header-inner">
          <Link href="/"><span className="nav-back">←_RETURN_TO_PORTAL</span></Link>
          <div className="m-brand">GEOGRAPHIC_RESONANCE // <span>OSS_MODE</span></div>
          <div className="m-status"><span className="p-dot" /> OPEN_STREET_MAP_CONNECTED</div>
        </div>
      </header>

      <main className="m-container">
        <div className="map-view-box">
          <MapContainer center={[35.6895, 139.6917]} zoom={12} style={{ height: '100%', width: '100%', background: '#000' }}>
            {/* 漆黒のタイルレイヤー (CartoDB Dark Matter) */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            />
            {markers.map((m) => (
              <Marker key={m.id} position={m.pos} icon={createCustomIcon(m.fervor)}>
                <Popup>
                  <div className="info-card">
                    <span className="i-tag">RESONANCE_DETECTED</span>
                    <h3>{m.name}</h3>
                    <p>{m.locName} / {m.date}</p>
                    <p>FERVOR: {m.fervor}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </main>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #030305; }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; margin: 0; }
        
        .m-header { height: 75px; border-bottom: 1px solid #111; display: flex; align-items: center; padding: 0 40px; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); }
        .header-inner { max-width: 1400px; margin: 0 auto; width: 100%; display: flex; justify-content: space-between; align-items: center; }
        .m-brand { font-family: 'JetBrains Mono'; font-weight: 800; font-size: 14px; letter-spacing: 0.3em; }
        .m-brand span { color: var(--v-mag); }
        .nav-back { color: #444; font-size: 10px; font-family: 'JetBrains Mono'; cursor: pointer; text-decoration: none; }

        .m-container { padding: 40px; height: calc(100vh - 75px); box-sizing: border-box; }
        .map-view-box { width: 100%; height: 100%; border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }

        .m-loader { height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono'; color: var(--v-cyn); letter-spacing: 0.5em; }
        .p-dot { display: inline-block; width: 6px; height: 6px; background: var(--v-cyn); border-radius: 50%; box-shadow: 0 0 10px var(--v-cyn); margin-right: 10px; }

        /* Leaflet Popup Styling */
        .leaflet-popup-content-wrapper { background: #000 !important; color: #fff !important; border: 1px solid #222 !important; border-radius: 0 !important; }
        .leaflet-popup-tip { background: #000 !important; }
        .info-card { font-family: 'JetBrains Mono'; font-size: 10px; }
        .i-tag { color: var(--v-mag); font-size: 8px; display: block; margin-bottom: 5px; }
        .info-card h3 { margin: 5px 0; font-weight: 800; font-size: 14px; }
      `}</style>
    </div>
  );
}
