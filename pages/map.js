import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '../lib/supabaseClient';

const containerStyle = { width: '100%', height: '100%' };
const mapOptions = {
  styles: [ /* 漆黒のタクティカル・マップ・スタイル */
    { "elementType": "geometry", "stylers": [{ "color": "#020204" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#444" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#111" }] }
  ],
  disableDefaultUI: true,
  zoomControl: true,
};

export default function ResonanceMap() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchLogs(session.user.id);
    });
  }, []);

  const fetchLogs = async (uid) => {
    const { data } = await supabase.from('fan_logs').select('*').eq('user_id', uid);
    if (data) {
      setLogs(data);
      geocodeLocations(data);
    }
  };

  // --- 自動ジオコーディング (名前 → 座標) ---
  const geocodeLocations = async (logData) => {
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

  if (!isLoaded || loading) return <div className="m-loader">CALIBRATING_GPS_SATELLITES...</div>;

  return (
    <div className="m-root">
      <Head><title>DR // GEOGRAPHIC_RESONANCE</title></Head>

      <header className="m-header">
        <div className="header-inner">
          <Link href="/"><span className="nav-back">←_RETURN_TO_BASE</span></Link>
          <div className="m-brand">GEOGRAPHIC_RESONANCE // <span>AREA_ANALYSIS</span></div>
          <div className="m-stats">IDENTIFIED_SPOTS: {markers.length}</div>
        </div>
      </header>

      <main className="m-main">
        <div className="map-wrapper glass">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={{ lat: 35.6895, lng: 139.6917 }} // デフォルト:東京
            zoom={12}
            options={mapOptions}
          >
            {markers.map((marker) => (
              <Marker
                key={marker.id}
                position={marker.pos}
                onClick={() => setSelected(marker)}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8 + marker.fervor * 2,
                  fillColor: marker.fervor >= 5 ? '#00f2ff' : '#ff00ff',
                  fillOpacity: 0.7,
                  strokeWeight: 2,
                  strokeColor: '#fff',
                }}
              />
            ))}

            {selected && (
              <InfoWindow position={selected.pos} onCloseClick={() => setSelected(null)}>
                <div className="info-box">
                  <div className="info-tag">MISSION_REPORT</div>
                  <h3>{selected.name}</h3>
                  <div className="info-meta">
                    <span>LOCATION: {selected.locName}</span>
                    <span>DATE: {selected.date}</span>
                    <span>FERVOR: {selected.fervor}</span>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>
      </main>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #030306; }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; margin: 0; overflow: hidden; }

        .m-header { height: 75px; border-bottom: 1px solid #111; display: flex; align-items: center; padding: 0 40px; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); z-index: 1000; }
        .header-inner { max-width: 1400px; margin: 0 auto; width: 100%; display: flex; justify-content: space-between; align-items: center; }
        .m-brand { font-family: 'JetBrains Mono'; font-weight: 800; font-size: 14px; letter-spacing: 0.3em; }
        .m-brand span { color: var(--v-mag); }
        .nav-back { color: #444; font-size: 10px; font-family: 'JetBrains Mono'; cursor: pointer; }
        .m-stats { font-family: 'JetBrains Mono'; font-size: 10px; color: var(--v-cyn); letter-spacing: 0.1em; }

        .m-main { width: 100vw; height: calc(100vh - 75px); padding: 40px; box-sizing: border-box; }
        .map-wrapper { width: 100%; height: 100%; border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }

        /* InfoWindow Style */
        .info-box { background: #000; color: #fff; padding: 15px; font-family: 'Montserrat', sans-serif; min-width: 200px; }
        .info-tag { font-family: 'JetBrains Mono'; font-size: 8px; color: var(--v-mag); margin-bottom: 10px; border-bottom: 1px solid #222; padding-bottom: 5px; }
        .info-box h3 { margin: 0 0 10px; font-size: 14px; font-weight: 400; }
        .info-meta { display: flex; flex-direction: column; gap: 5px; font-size: 10px; color: #666; font-family: 'JetBrains Mono'; }

        .m-loader { height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono'; color: var(--v-cyn); letter-spacing: 0.5em; background: #000; }

        /* GMAP InfoWindowのデフォルト白背景を調整(限界はあるが) */
        .gm-style-iw { background-color: #000 !important; border: 1px solid #333 !important; }
        .gm-style-iw-d { overflow: hidden !important; }
        .gm-style-iw-tc::after { background: #000 !important; }
      `}</style>
    </div>
  );
}
