import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, BarChart, Bar, ComposedChart, Line
} from 'recharts';
import { supabase } from '../lib/supabaseClient';

export default function DeepAnalyticsReinforced() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchData(session.user.id);
    });
  }, []);

  const fetchData = async (userId) => {
    // 1. 推し活ログの取得
    const { data: logData } = await supabase
      .from('fan_logs')
      .select('*, log_encounters(*, cosplayer_master(*))')
      .eq('user_id', userId)
      .order('event_date', { ascending: true });
    
    // 2. 作業ログの取得
    const { data: workData } = await supabase
      .from('work_logs')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: true });

    setLogs(logData || []);
    setWorkLogs(workData || []);
    setLoading(false);
  };

  // --- 1. 相関分析データ (Work vs Passion) ---
  const combinedData = useMemo(() => {
    const dailyMap = {};
    // 推し活データをマッピング
    logs.forEach(l => {
      dailyMap[l.event_date] = { date: l.event_date.replace(/-/g, '.'), fervor: l.fervor_score, workMinutes: 0 };
    });
    // 作業データをマッピング
    workLogs.forEach(w => {
      const date = w.completed_at.split('T')[0];
      if (!dailyMap[date]) dailyMap[date] = { date: date.replace(/-/g, '.'), fervor: 0, workMinutes: 0 };
      dailyMap[date].workMinutes += w.duration_minutes;
    });
    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [logs, workLogs]);

  // --- 2. 感情解析 (Memory Note Scan) ---
  const sentimentData = useMemo(() => {
    const KEYWORDS = {
      ADORE: /かわいい|可愛い|すき|好き|尊い/,
      GENIUS: /天才|上手い|すごい|最高|完璧/,
      GRATITUDE: /感謝|ありがとう|助かる|救い/,
      COOL: /かっこいい|格好いい|イケメン|鋭い/,
      ENERGY: /元気|勇気|モチベ|頑張れる/
    };
    const counts = { ADORE: 0, GENIUS: 0, GRATITUDE: 0, COOL: 0, ENERGY: 0 };
    logs.forEach(l => {
      if (!l.memory_note) return;
      Object.keys(KEYWORDS).forEach(key => {
        if (KEYWORDS[key].test(l.memory_note)) counts[key]++;
      });
    });
    return Object.keys(counts).map(key => ({ subject: key, A: counts[key] }));
  }, [logs]);

  // --- 3. 集中効率 (Hourly Focus) ---
  const hourlyEfficiency = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}H`, count: 0 }));
    workLogs.forEach(w => {
      const h = new Date(w.completed_at).getHours();
      hours[h].count++;
    });
    return hours;
  }, [workLogs]);

  // 遭遇ランキング (既存機能維持)
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

  if (loading) return <div className="a-loader">SYNCHRONIZING_DEEP_DATA...</div>;

  return (
    <div className="a-root">
      <Head>
        <title>DR // ANALYTICS_v4.0</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&family=Montserrat:wght@100;400;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      <header className="a-header">
        <div className="header-inner">
          <Link href="/"><span className="nav-back">←_PORTAL_SYS</span></Link>
          <div className="a-brand">RESONANCE_ANALYTICS <span>[CORE_UPGRADED]</span></div>
          <div className="a-status"><span className="pulse-dot" /> MULTI_UPLINK_STABLE</div>
        </div>
      </header>

      <main className="a-container">
        <div className="a-grid">
          
          {/* SECTOR_01: WORK & PASSION CORRELATION */}
          <section className="a-module full-width">
            <div className="a-mod-tag">SECTOR_01 // WORK_PASSION_CORRELATION</div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={combinedData}>
                  <defs>
                    <linearGradient id="glowFervor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--v-mag)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--v-mag)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#111" vertical={false} />
                  <XAxis dataKey="date" stroke="#333" fontSize={10} axisLine={false} />
                  <YAxis yAxisId="left" domain={[0, 5]} stroke="#333" fontSize={10} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#333" fontSize={10} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="right" dataKey="workMinutes" fill="var(--v-cyn)" opacity={0.2} barSize={40} />
                  <Area yAxisId="left" type="monotone" dataKey="fervor" stroke="var(--v-mag)" strokeWidth={3} fill="url(#glowFervor)" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                <span className="l-fervor">■ PASSION_SCORE</span>
                <span className="l-work">■ WORK_MINUTES</span>
              </div>
            </div>
          </section>

          {/* SECTOR_02: SENTIMENT_RADAR */}
          <section className="a-module">
            <div className="a-mod-tag">SECTOR_02 // SENTIMENT_DNA_ANALYSIS</div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={sentimentData}>
                  <PolarGrid stroke="#222" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <Radar name="Count" dataKey="A" stroke="var(--v-mag)" fill="var(--v-mag)" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* SECTOR_03: HOURLY_EFFICIENCY */}
          <section className="a-module">
            <div className="a-mod-tag">SECTOR_03 // HOURLY_FOCUS_EFFICIENCY</div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hourlyEfficiency}>
                  <XAxis dataKey="hour" stroke="#333" fontSize={8} axisLine={false} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={<SimpleTooltip />} />
                  <Bar dataKey="count" fill="var(--v-cyn)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* SECTOR_04: IDENTITY_RANKING (既存) */}
          <section className="a-module full-width">
            <div className="a-mod-tag">SECTOR_04 // HIGH_RESONANCE_IDENTITIES</div>
            <div className="a-rank-grid">
              {ranking.map(([name, count], idx) => (
                <div key={idx} className="a-rank-card">
                  <span className="r-idx">0{idx + 1}</span>
                  <div className="r-info">
                    <span className="r-name">@{name}</span>
                    <span className="r-val">{count} SYNC_ARCHIVES</span>
                  </div>
                  <div className="r-gauge"><div className="r-fill" style={{ width: `${(count / ranking[0][1]) * 100}%` }} /></div>
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
        .a-brand span { color: var(--v-cyn); }
        .nav-back { color: #444; font-size: 10px; font-weight: 800; font-family: 'JetBrains Mono'; cursor: pointer; }
        
        .a-container { max-width: 1200px; margin: 0 auto; padding: 60px 40px; }
        .a-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .full-width { grid-column: span 2; }

        .a-module { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 50px; position: relative; }
        .a-mod-tag { position: absolute; top: 15px; left: 20px; color: #333; font-size: 8px; font-family: 'JetBrains Mono'; letter-spacing: 0.2em; }

        .chart-legend { display: flex; gap: 20px; justify-content: center; margin-top: 20px; font-family: 'JetBrains Mono'; font-size: 9px; }
        .l-fervor { color: var(--v-mag); }
        .l-work { color: var(--v-cyn); opacity: 0.6; }

        .a-rank-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .a-rank-card { background: rgba(255,255,255,0.01); padding: 20px; border: 1px solid #111; position: relative; }
        .r-idx { font-family: 'JetBrains Mono'; font-size: 24px; color: #111; font-weight: 900; position: absolute; top: 10px; right: 15px; }
        .r-info { position: relative; z-index: 10; }
        .r-name { display: block; font-family: 'JetBrains Mono'; font-size: 14px; color: var(--v-cyn); margin-bottom: 5px; }
        .r-val { font-size: 9px; color: #444; letter-spacing: 0.1em; }
        .r-gauge { height: 2px; background: #111; margin-top: 15px; }
        .r-fill { height: 100%; background: var(--v-mag); box-shadow: 0 0 10px var(--v-mag); }

        .pulse-dot { width: 6px; height: 6px; background: var(--v-cyn); border-radius: 50%; box-shadow: 0 0 10px var(--v-cyn); animation: p 2s infinite; }
        @keyframes p { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .a-loader { height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono'; color: var(--v-cyn); letter-spacing: 0.8em; }
      `}</style>
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid #222', padding: '15px', fontFamily: 'JetBrains Mono' }}>
        <p style={{ margin: 0, color: '#fff', fontSize: '10px', marginBottom: '10px' }}>{payload[0].payload.date}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ margin: '5px 0 0', color: p.color, fontSize: '12px' }}>
            {`${p.name.toUpperCase()}: ${p.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function SimpleTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid #222', padding: '10px', fontFamily: 'JetBrains Mono', fontSize: '10px' }}>
        {`SESSIONS: ${payload[0].value}`}
      </div>
    );
  }
  return null;
}
