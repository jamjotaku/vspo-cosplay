import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

// Next.jsのSSR(サーバーサイドレンダリング)でLeafletが壊れないように動的インポート
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

export default function DeepTacticalMap() {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [L, setL] = useState(null); // Leafletインスタンス保持用

  useEffect(() => {
    // クライアントサイドでのみLeafletライブラリをロード
    import('leaflet').then((leaflet) => {
      setL(leaflet);
    });
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // ログデータを取得
    const { data } = await supabase
      .from('fan_logs')
      .select('*')
      .eq('user_id', session.user.id);
    
    if (data) geocodeWithPersistence(data);
  };

  // --- 地名 → 座標変換 ＆ DB永続化ロジック ---
  const geocodeWithPersistence = async (logData) => {
    const newMarkers = [];
    
    for (const log of logData) {
      if (!log.location) continue;

      // 1. すでにDBに座標(lat, lng)がある場合はそれを使う
      if (log.lat && log.lng) {
        newMarkers.push({
          id: log.id,
          name: log.event_name,
          locName: log.location,
          pos: [log.lat, log.lng],
          fervor: log.fervor_score,
          date: log.event_date
        });
        continue;
      }

      // 2. 座標がない場合のみ外部APIに問い合わせ
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(log.location)}`);
        const data = await res.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);

          newMarkers.push({
            id: log.id,
            name: log.event_name,
            locName: log.location,
            pos: [lat, lng],
            fervor: log.fervor_score,
            date: log.event_date
          });

          // 3. 判明した座標をDBに保存(次回から高速化)
          await supabase
            .from('fan_logs')
            .update({ lat, lng })
            .eq('id', log.id);
          
          // Nominatimの利用規約(1秒1回)を守るためのクールダウン
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err) {
        console.error("GEO_UPLINK_ERROR:", err);
      }
    }
    setMarkers(newMarkers);
    setLoading(false);
  };

  // カスタム・ネオンアイコンの生成
  const createNeonIcon = (fervor) => {
    if (!L) return null;
    const color = fervor >= 5 ? 'var(--v-cyn)' : 'var(--v-mag)';
    const size = 12 + fervor * 2;
    return L.divIcon({
      className: 'neon-marker',
      html: `<div style="
        width: ${size}px; 
        height: ${size}px; 
        background: ${color}; 
        border: 2px solid #fff; 
        border-radius: 50%; 
        box-shadow: 0 0 15px ${color}, 0 0 30px ${color};
        animation: pulse 2s infinite;
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  };

  if (loading || !L) return <div className="m-loader">SYNCHRONIZING_TACTICAL_MAP...</div>;

  return (
    <div className="m-root">
      <Head>
        <title>DR // GEOGRAPHIC_RESONANCE</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&family=Montserrat:wght@400;900&display=swap" rel="stylesheet" />
      </Head>

      <header className="m-header">
        <div className="header-inner">
          <Link href="/"><span className="nav-back">←_RETURN_TO_BASE</span></Link>
          <div className="m-brand">GEOGRAPHIC_RESONANCE // <span>OSS_STABLE</span></div>
          <div className="m-status"><span className="p-dot" /> PERSISTENCE_LOGIC_ACTIVE</div>
        </div>
      </header>

      <main className="m-main">
        <div className="map-wrapper glass">
          <MapContainer center={[35.6895, 139.6917]} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%', background: '#000' }}>
            {/* 漆黒のタイルレイヤー (CartoDB Dark Matter) */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            />
            
            {markers.map((m) => (
              <Marker key={m.id} position={m.pos} icon={createNeonIcon(m.fervor)}>
                <Popup>
                  <div className="info-card">
                    <span className="i-tag">RESONANCE_DATA</span>
                    <h3 className="i-title">{m.name}</h3>
                    <div className="i-meta">
                      <p>LOC: {m.locName}</p>
                      <p>DATE: {m.date}</p>
                      <p className="i-fervor">FERVOR: {m.fervor}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </main>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #030305; }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; margin: 0; overflow: hidden; }

        .m-header { height: 75px; border-bottom: 1px solid #111; display: flex; align-items: center; padding: 0 40px; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); z-index: 1000; position: relative; }
        .header-inner { max-width: 1400px; margin: 0 auto; width: 100%; display: flex; justify-content: space-between; align-items: center; }
        .m-brand { font-family: 'JetBrains Mono'; font-weight: 800; font-size: 14px; letter-spacing: 0.3em; }
        .m-brand span { color: var(--v-cyn); }
        .nav-back { color: #444; font-size: 10px; font-family: 'JetBrains Mono'; cursor: pointer; text-decoration: none; }

        .m-main { height: calc(100vh - 75px); padding: 40px; box-sizing: border-box; }
        .map-wrapper { width: 100%; height: 100%; border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; position: relative; }

        /* Leaflet UI Custom */
        .leaflet-container { font-family: 'Montserrat', sans-serif !important; }
        .leaflet-popup-content-wrapper { background: #0a0a0c !important; color: #fff !important; border: 1px solid #222 !important; border-radius: 0 !important; box-shadow: 0 10px 40px #000 !important; }
        .leaflet-popup-tip { background: #0a0a0c !important; }
        
        .info-card { padding: 10px; min-width: 180px; }
        .i-tag { font-family: 'JetBrains Mono'; color: var(--v-mag); font-size: 8px; letter-spacing: 0.1em; }
        .i-title { font-size: 14px; margin: 10px 0; font-weight: 400; }
        .i-meta { font-family: 'JetBrains Mono'; font-size: 9px; color: #555; line-height: 1.6; }
        .i-fervor { color: var(--v-cyn) !important; margin-top: 5px; }

        .m-loader { height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono'; color: var(--v-cyn); letter-spacing: 0.8em; }
        .p-dot { display: inline-block; width: 6px; height: 6px; background: var(--v-cyn); border-radius: 50%; box-shadow: 0 0 10px var(--v-cyn); margin-right: 10px; animation: pulse 2s infinite; }

        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
