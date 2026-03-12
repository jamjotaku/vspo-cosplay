import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '../lib/supabaseClient';

const containerStyle = { width: '100%', height: '100%' };

// --- 漆黒のタクティカル・マップ・スタイル (違和感を消し去る設定) ---
const mapOptions = {
  styles: [
    { "elementType": "geometry", "stylers": [{ "color": "#1d2c4d" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a3646" }] },
    { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b6878" }] },
    { "featureType": "landscape.man_made", "elementType": "geometry.stroke", "stylers": [{ "color": "#334e87" }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#283d6a" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#6f9ba5" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#304a7d" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#98a5be" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0e1626" }] }
  ],
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: "greedy"
};

export default function TacticalMap() {
  const [user, setUser] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.AIzaSyAIvI5kP7S_2KiuDNVQbHJuUL4q02XU3fs // ← ここにキーが正しく入っているか確認！
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchLogs(session.user.id);
    });
  }, []);

  const fetchLogs = async (uid) => {
    const { data } = await supabase.from('fan_logs').select('*').eq('user_id', uid);
    if (data) geocodeLocations(data);
  };

  const geocodeLocations = async (logData) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    const newMarkers = [];

    for (const log of logData) {
      if (!log.location) continue;
      await new Promise((resolve) => {
        geocoder.geocode({ address: log.location }, (results, status) => {
          if (status === 'OK') {
            newMarkers.push({
              id: log.id,
              name: log.event_name,
              locName: log.location,
              pos: results[0].geometry.location,
              fervor: log.fervor_score,
              date: log.event_date
            });
          }
          resolve();
        });
      });
    }
    setMarkers(newMarkers);
    setLoading(false);
  };

  if (!isLoaded || loading) return <div className="m-loader">UPLINKING_TO_SATELLITE...</div>;

  return (
    <div className="m-root">
      <Head>
        <title>DR // GEOGRAPHIC_RESONANCE</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&family=Montserrat:wght@100;400;900&display=swap" rel="stylesheet" />
      </Head>

      <header className="m-header">
        <div className="header-inner">
          <Link href="/"><span className="nav-back">←_RETURN_TO_PORTAL</span></Link>
          <div className="m-brand">GEOGRAPHIC_RESONANCE // <span>AREA_ANALYSIS</span></div>
          <div className="m-status"><span className="p-dot" /> GPS_SYNC_ACTIVE</div>
        </div>
      </header>

      <main className="m-container">
        <div className="map-view-box glass">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={{ lat: 35.6895, lng: 139.6917 }}
            zoom={12}
            options={mapOptions}
          >
            {markers.map((m) => (
              <Marker
                key={m.id}
                position={m.pos}
                onClick={() => setSelected(m)}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10 + m.fervor * 2,
                  fillColor: m.fervor >= 5 ? '#00f2ff' : '#ff00ff',
                  fillOpacity: 0.8,
                  strokeWeight: 2,
                  strokeColor: '#fff',
                }}
              />
            ))}

            {selected && (
              <InfoWindow position={selected.pos} onCloseClick={() => setSelected(null)}>
                <div className="info-card">
                  <span className="i-tag">SYNC_REPORT</span>
                  <h3>{selected.name}</h3>
                  <div className="i-meta">
                    <p><span>LOC:</span> {selected.locName}</p>
                    <p><span>DATE:</span> {selected.date}</p>
                    <p><span>FERVOR:</span> {selected.fervor}/5.0</p>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>
      </main>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #030305; }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; margin: 0; overflow: hidden; }

        .m-header { height: 75px; border-bottom: 1px solid #111; display: flex; align-items: center; padding: 0 40px; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); position: sticky; top: 0; z-index: 1000; }
        .header-inner { max-width: 1400px; margin: 0 auto; width: 100%; display: flex; justify-content: space-between; align-items: center; }
        .m-brand { font-family: 'JetBrains Mono'; font-weight: 800; font-size: 14px; letter-spacing: 0.3em; }
        .m-brand span { color: var(--v-cyn); }
        .nav-back { color: #444; font-size: 10px; font-family: 'JetBrains Mono'; cursor: pointer; }
        
        .m-status { display: flex; align-items: center; gap: 10px; font-family: 'JetBrains Mono'; font-size: 9px; color: #444; }
        .p-dot { width: 6px; height: 6px; background: var(--v-cyn); border-radius: 50%; box-shadow: 0 0 10px var(--v-cyn); animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .m-container { padding: 40px; height: calc(100vh - 75px); box-sizing: border-box; }
        .map-view-box { width: 100%; height: 100%; border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }

        /* INFO_CARD (InfoWindow内) */
        .gm-style-iw { background-color: #0a0a0c !important; border: 1px solid #222 !important; padding: 0 !important; }
        .gm-style-iw-d { overflow: hidden !important; }
        .gm-style-iw-tc::after { background: #0a0a0c !important; }
        
        .info-card { padding: 20px; color: #fff; min-width: 200px; }
        .i-tag { font-family: 'JetBrains Mono'; font-size: 8px; color: var(--v-mag); display: block; margin-bottom: 10px; }
        .info-card h3 { font-size: 16px; margin: 0 0 15px; font-weight: 400; }
        .i-meta p { margin: 5px 0; font-family: 'JetBrains Mono'; font-size: 10px; color: #666; }
        .i-meta p span { color: #333; }

        .m-loader { height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono'; color: var(--v-cyn); letter-spacing: 0.8em; }
      `}</style>
    </div>
  );
}
