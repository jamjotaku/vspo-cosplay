import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis 
} from 'recharts';
import { supabase } from '../lib/supabaseClient';

export default function DeepAnalyticsFinal() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData(session.user.id);
    });
  }, []);

  const fetchData = async (userId) => {
    const { data } = await supabase
      .from('fan_logs')
      .select('*, log_encounters(*, cosplayer_master(*))')
      .eq('user_id', userId)
      .order('event_date', { ascending: true });
    setLogs(data || []);
    setLoading(false);
  };

  // --- 1. 時系列熱量データ (2件以上の実データを反映) ---
  const trendData = useMemo(() => {
    if (logs.length === 0) return [];
    return logs.map(l => ({
      date: l.event_date.replace(/-/g, '.'),
      fervor: l.fervor_score,
      name: l.event_name
    }));
  }, [logs]);

  // --- 2. 起源（Genesis）集計 ---
  const genesisData = useMemo(() => {
    const counts = { STAGE: 0, MKT: 0, SHT: 0, CFE: 0, DIGITAL: 0 };
    logs.forEach(l => {
      const cat = l.event_category || 'STAGE';
      if (counts.hasOwnProperty(cat)) counts[cat]++;
    });
    return Object.keys(counts).map(key => ({ subject: key, A: counts[key] }));
  }, [logs]);

  // --- 3. 遭遇回数ランキング (実データから集計) ---
  const ranking = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      l.log_encounters?.forEach(e => {
        const name = e.cosplayer_master?.name;
        if (name) map[name] = (map[name] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [logs]);

  if (loading) return <div className="a-loader">ANALYZING_CHRONICLE...</div>;

  return (
    <div className="a-root">
      <Head>
        <title>DR // ANALYTICS_v3.5</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&family=Montserrat:wght@100;400;900&display=swap" rel="stylesheet" />
      </Head>

      <header className="a-header">
        <div className="header-inner">
          <Link href="/"><span className="nav-back">←_PORTAL_SYS</span></Link>
          <div className="a-brand">RESONANCE_ANALYTICS <span>[DEEP_SCAN]</span></div>
          <div className="a-status"><span className="pulse-dot" /> ARCHIVE_CONNECTED</div>
        </div>
      </header>

      <main className="a-container">
        <div className="a-grid">
          
          {/* SECTOR_01: INTENSITY_TREND */}
          <section className="a-module full-width">
            <div className="a-mod-tag">SECTOR_01 // PASSION_INTENSITY_TIMELINE</div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="glowFervor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--v-mag)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--v-mag)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111" vertical={false} />
                  <XAxis dataKey="date" stroke="#333" fontSize={10} tick={{fill: '#444'}} axisLine={false} />
                  <YAxis domain={[0, 5]} stroke="#333" fontSize={10} tick={{fill: '#444'}} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="fervor" stroke="var(--v-mag)" strokeWidth={3} fill="url(#glowFervor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* SECTOR_02: RADAR_ANALYSIS */}
          <section className="a-module">
            <div className="a-mod-tag">SECTOR_02 // CATEGORY_RESONANCE</div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={genesisData}>
                  <PolarGrid stroke="#222" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 9 }} />
                  <Radar name="Count" dataKey="A" stroke="var(--v-cyn)" fill="var(--v-cyn)" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* SECTOR_03: IDENTITY_RANKING */}
          <section className="a-module">
            <div className="a-mod-tag">SECTOR_03 // HIGH_RESONANCE_IDENTITIES</div>
            <div className="a-rank-list">
              {ranking.map(([name, count], idx) => (
                <div key={idx} className="a-rank-row">
                  <span className="r-idx">0{idx + 1}</span>
                  <div className="r-name-wrap">
                    <span className="r-name">@{name}</span>
                    <div className="r-bar-bg"><div className="r-bar-fill" style={{ width: `${(count / ranking[0][1]) * 100}%` }} /></div>
                  </div>
                  <span className="r-val">{count} SYNC</span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #030305; }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; margin: 0; }

        .a-header { height: 75px; border-bottom: 1px solid #111; display: flex; align-items: center; padding: 0 40px; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); position: sticky; top: 0; z-index: 1000; }
        .header-inner { max-width: 1400px; margin: 0 auto; width: 100%; display: flex; justify-content: space-between; align-items: center; }
        .a-brand { font-family: 'JetBrains Mono'; font-weight: 800; font-size: 14px; letter-spacing: 0.3em; }
        .a-brand span { color: var(--v-mag); }
        .nav-back { color: #444; font-size: 10px; font-weight: 800; font-family: 'JetBrains Mono'; cursor: pointer; }
        
        .a-status { display: flex; align-items: center; gap: 10px; font-family: 'JetBrains Mono'; font-size: 9px; color: #444; }
        .pulse-dot { width: 6px; height: 6px; background: var(--v-cyn); border-radius: 50%; box-shadow: 0 0 10px var(--v-cyn); animation: p 2s infinite; }
        @keyframes p { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .a-container { max-width: 1200px; margin: 0 auto; padding: 60px 40px; }
        .a-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .full-width { grid-column: span 2; }

        .a-module { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 50px; position: relative; }
        .a-mod-tag { position: absolute; top: 15px; left: 20px; color: #333; font-size: 8px; font-family: 'JetBrains Mono'; letter-spacing: 0.2em; }

        .a-rank-list { display: flex; flex-direction: column; gap: 25px; }
        .a-rank-row { display: flex; align-items: center; gap: 20px; }
        .r-idx { font-family: 'JetBrains Mono'; color: var(--v-mag); font-weight: 800; font-size: 12px; }
        .r-name-wrap { flex: 1; }
        .r-name { display: block; font-size: 14px; color: #eee; margin-bottom: 8px; font-family: 'JetBrains Mono'; }
        .r-bar-bg { height: 2px; background: #111; width: 100%; }
        .r-bar-fill { height: 100%; background: var(--v-cyn); box-shadow: 0 0 10px var(--v-cyn); transition: 1s ease; }
        .r-val { font-family: 'JetBrains Mono'; font-size: 10px; color: #444; width: 60px; text-align: right; }

        .a-loader { height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono'; color: var(--v-cyn); letter-spacing: 0.8em; }
      `}</style>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid #222', padding: '15px', fontFamily: 'JetBrains Mono' }}>
        <p style={{ margin: 0, color: 'var(--v-mag)', fontSize: '12px' }}>{`INTENSITY: ${payload[0].value}`}</p>
        <p style={{ margin: '5px 0 0', color: '#555', fontSize: '10px' }}>{`DATE: ${payload[0].payload.date}`}</p>
      </div>
    );
  }
  return null;
}