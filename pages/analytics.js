import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { supabase } from '../lib/supabaseClient';

export default function DeepAnalytics() {
  const [user, setUser] = useState(null);
  const [rawLogs, setRawLogs] = useState([]);
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
    
    setRawLogs(data || []);
    setLoading(false);
  };

  // --- 1. 時系列データの加工 ---
  const trendData = useMemo(() => {
    return rawLogs.map(l => ({
      date: l.event_date.substring(5), // MM-DD
      fervor: l.fervor_score,
      name: l.event_name
    }));
  }, [rawLogs]);

  // --- 2. 起源（Genesis）の集計 ---
  const genesisData = useMemo(() => {
    const counts = {};
    rawLogs.forEach(l => {
      l.log_encounters?.forEach(e => {
        const cat = e.cosplayer_master?.genesis_catalyst || 'OTHER';
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return Object.keys(counts).map(key => ({ subject: key, A: counts[key], fullMark: 10 }));
  }, [rawLogs]);

  if (loading) return <div className="a-loader">DECODING_ARCHIVES...</div>;

  return (
    <div className="a-root">
      <Head><title>DR // DEEP_ANALYTICS</title></Head>

      <header className="a-header">
        <div className="a-header-inner">
          <Link href="/"><span className="a-back">← PORTAL</span></Link>
          <div className="a-brand">DEEP_ANALYTICS // <span>DECODING_PASSION</span></div>
        </div>
      </header>

      <main className="a-container">
        <div className="a-grid">
          
          {/* SECTOR_01: TREND_LINE */}
          <section className="a-panel glass full-width">
            <div className="a-panel-label">RESONANCE_INTENSITY_TREND (時系列熱量推移)</div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorFervor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--v-mag)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--v-mag)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="date" stroke="#444" fontSize={10} tickLine={false} />
                  <YAxis domain={[0, 5]} stroke="#444" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#000', border: '1px solid #333', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="fervor" stroke="var(--v-mag)" fillOpacity={1} fill="url(#colorFervor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* SECTOR_02: GENESIS_RADAR */}
          <section className="a-panel glass">
            <div className="a-panel-label">GENESIS_DISTRIBUTION (起源分析)</div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={genesisData}>
                  <PolarGrid stroke="#222" />
                  <PolarAngleAxis dataKey="subject" stroke="#666" fontSize={10} />
                  <Radar name="Count" dataKey="A" stroke="var(--v-cyn)" fill="var(--v-cyn)" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* SECTOR_03: TOP_SYNERGY */}
          <section className="a-panel glass">
            <div className="a-panel-label">TOP_RESONANCE_IDENTITIES (高共鳴個体)</div>
            <div className="a-rank-list">
              {/* ここに集計ロジックに基づいたランキングを表示 */}
              <div className="a-rank-item">
                <span className="rank-num">01</span>
                <span className="rank-name">@SAMPLE_LAYER</span>
                <span className="rank-val">12_ARCHIVES</span>
              </div>
              <p className="a-empty-text">MORE DATA REQUIRED FOR DEEP ANALYSIS...</p>
            </div>
          </section>

        </div>
      </main>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #030305; }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; }

        .a-header { height: 80px; border-bottom: 1px solid #111; display: flex; align-items: center; padding: 0 40px; position: sticky; top: 0; background: rgba(3,3,5,0.8); backdrop-filter: blur(20px); z-index: 100; }
        .a-header-inner { max-width: 1400px; margin: 0 auto; width: 100%; display: flex; justify-content: space-between; align-items: center; }
        .a-brand { font-family: 'JetBrains Mono'; font-weight: 800; font-size: 14px; letter-spacing: 0.2em; }
        .a-brand span { color: var(--v-mag); }
        .a-back { color: #444; font-size: 10px; font-weight: 800; cursor: pointer; }

        .a-container { max-width: 1200px; margin: 0 auto; padding: 60px 40px; }
        .a-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .full-width { grid-column: span 2; }

        .glass { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 40px; }
        .a-panel-label { font-family: 'JetBrains Mono'; font-size: 10px; color: #444; margin-bottom: 30px; letter-spacing: 0.1em; }

        .a-rank-list { display: flex; flex-direction: column; gap: 20px; }
        .a-rank-item { display: flex; align-items: center; gap: 20px; border-bottom: 1px solid #111; padding-bottom: 15px; }
        .rank-num { font-family: 'JetBrains Mono'; color: var(--v-mag); font-weight: 800; }
        .rank-name { flex: 1; font-weight: 400; }
        .rank-val { font-family: 'JetBrains Mono'; font-size: 10px; color: #444; }

        .a-empty-text { font-size: 10px; color: #222; margin-top: 40px; text-align: center; font-family: 'JetBrains Mono'; }
        .a-loader { height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono'; color: var(--v-cyn); letter-spacing: 0.5em; }
      `}</style>
    </div>
  );
}