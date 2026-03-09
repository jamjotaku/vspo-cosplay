import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function OshigotoLog() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ date: '', event: '', venue: '', note: '' });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => { if (user) fetchLogs(); }, [user]);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('fan_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('event_date', { ascending: false });
    setLogs(data || []);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('fan_logs').insert({
      user_id: user.id,
      event_date: formData.date,
      event_name: formData.event,
      venue: formData.venue,
      memory_note: formData.note,
      updated_at: new Date()
    });
    if (!error) {
      setFormData({ date: '', event: '', venue: '', note: '' });
      setShowAdd(false);
      fetchLogs();
    }
  };

  // 予定(Mission)と記録(Archive)を分離
  const sortedData = useMemo(() => {
    const missions = logs.filter(l => l.event_date > today).sort((a,b) => a.event_date.localeCompare(b.event_date));
    const archives = logs.filter(l => l.event_date <= today);
    return { missions, archives };
  }, [logs, today]);

  if (loading) return <div className="l-loading">SYNCING_MEMORIES...</div>;

  return (
    <div className="l-root">
      <Head>
        <title>LOGS // MISSION & ARCHIVE</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;400;700;800&display=swap" rel="stylesheet" />
      </Head>

      <header className="l-header">
        <div className="l-header-inner">
          <Link href="/"><div className="l-back-btn"><i className="fas fa-chevron-left"></i> PORTAL</div></Link>
          <div className="l-brand-title">LOGS <span>The Chronicle</span></div>
          {user && (
            <button className="l-add-trigger" onClick={() => setShowAdd(true)}>
              <i className="fas fa-plus"></i> ADD EVENT
            </button>
          )}
        </div>
      </header>

      <main className="l-container">
        {!user ? (
          <div className="l-prompt">ACCESS_DENIED: LOGIN REQUIRED</div>
        ) : (
          <div className="l-timeline">
            
            {/* --- UPCOMING MISSIONS (予定) --- */}
            {sortedData.missions.length > 0 && (
              <section className="l-section">
                <div className="l-sec-head"><span className="tag-mission">UPCOMING_MISSIONS</span></div>
                {sortedData.missions.map((log) => (
                  <div key={log.id} className="l-item is-mission">
                    <div className="l-side">
                      <div className="l-dot-glow"></div>
                      <div className="l-date">
                        <span className="year">{log.event_date.split('-')[0]}</span>
                        <span className="day">{log.event_date.split('-')[1]}.{log.event_date.split('-')[2]}</span>
                      </div>
                    </div>
                    <div className="l-content-glass">
                      <span className="l-status">T-MINUS SCANNING...</span>
                      <h2 className="l-event-name">{log.event_name}</h2>
                      <span className="l-venue"><i className="fas fa-crosshairs"></i> {log.venue || "TBD"}</span>
                    </div>
                  </div>
                ))}
              </section>
            )}

            <div className="l-divider">PRESENT_TIME</div>

            {/* --- PAST ARCHIVES (記録) --- */}
            <section className="l-section">
              <div className="l-sec-head"><span className="tag-archive">PAST_ARCHIVES</span></div>
              {sortedData.archives.map((log) => (
                <div key={log.id} className="l-item">
                  <div className="l-side">
                    <div className="l-dot"></div>
                    <div className="l-date">
                      <span className="year">{log.event_date.split('-')[0]}</span>
                      <span className="day">{log.event_date.split('-')[1]}.{log.event_date.split('-')[2]}</span>
                    </div>
                  </div>
                  <div className="l-content-glass">
                    <h2 className="l-event-name">{log.event_name}</h2>
                    <span className="l-venue"><i className="fas fa-map-marker-alt"></i> {log.venue}</span>
                    <p className="l-note">{log.memory_note}</p>
                  </div>
                </div>
              ))}
            </section>

          </div>
        )}
      </main>

      {/* モーダルは前回と同様の洗練されたデザインを維持 */}
      {showAdd && (
        <div className="m-overlay" onClick={() => setShowAdd(false)}>
          <div className="m-card" onClick={e => e.stopPropagation()}>
            <div className="m-head"><h3>NEW_EVENT_ENTRY</h3></div>
            <form onSubmit={handleSave} className="m-form">
              <div className="m-field"><label>DATE (PAST OR FUTURE)</label><input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required /></div>
              <div className="m-field"><label>EVENT_NAME</label><input type="text" placeholder="VGGC 12th / Summer Event..." value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})} required /></div>
              <div className="m-field"><label>VENUE</label><input type="text" placeholder="Big Sight / Online..." value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} /></div>
              <div className="m-field"><label>DETAILS / PLANS</label><textarea rows="4" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} /></div>
              <button type="submit" className="m-submit">REGISTER_TO_CHRONICLE</button>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root { --v-cyan: #00f2ff; --v-magenta: #ff00ff; }
        body { margin:0; background:#050505; color:#fff; font-family:'Montserrat', sans-serif; }

        .l-header { position:fixed; top:0; left:0; width:100%; height:90px; background:rgba(5,5,5,0.9); backdrop-filter:blur(20px); z-index:2000; border-bottom:1px solid #111; }
        .l-header-inner { max-width:1200px; margin:0 auto; height:100%; display:flex; align-items:center; justify-content:space-between; padding:0 40px; }
        .l-back-btn { font-size:11px; font-weight:800; color:#444; letter-spacing:0.2em; cursor:pointer; }
        .l-add-trigger { background:#fff; color:#000; border:none; padding:10px 25px; border-radius:4px; font-weight:800; font-size:11px; cursor:pointer; }

        .l-container { max-width:1000px; margin:0 auto; padding:150px 40px 100px; }
        
        /* タイムライン：予定エリアは点線 */
        .l-timeline { position:relative; padding-left:40px; }
        .l-timeline::before { content:''; position:absolute; left:0; top:0; bottom:0; width:1px; background:linear-gradient(to bottom, #222 50%, transparent 50%); background-size: 1px 20px; }
        
        .l-divider { margin: 60px 0; font-size: 9px; font-weight: 800; color: #ff00ff; letter-spacing: 0.5em; text-align: center; border: 1px solid #222; padding: 10px; position: relative; left: -20px; }

        .l-item { display:flex; gap:60px; margin-bottom:80px; position:relative; }
        .l-side { width:80px; flex-shrink:0; text-align:right; }
        .l-dot { position:absolute; left:-4.5px; top:12px; width:10px; height:10px; background:#444; border-radius:50%; }
        .l-dot-glow { position:absolute; left:-7px; top:10px; width:14px; height:14px; background:var(--v-cyan); border-radius:50%; box-shadow:0 0 20px var(--v-cyan); animation: pulse 2s infinite; }
        
        .l-date { display:flex; flex-direction:column; }
        .year { font-size:11px; font-weight:800; color:#333; }
        .day { font-size:18px; font-weight:200; color:#fff; }

        .l-content-glass { flex:1; background:rgba(255,255,255,0.02); backdrop-filter:blur(15px); border:1px solid rgba(255,255,255,0.05); border-radius:4px; padding:35px; }
        .is-mission .l-content-glass { border-color: rgba(0,242,255,0.2); background: linear-gradient(135deg, rgba(0,242,255,0.05), transparent); }

        .l-status { font-size: 8px; font-weight: 800; color: var(--v-cyan); letter-spacing: 0.2em; margin-bottom: 10px; display: block; }
        .tag-mission { color: var(--v-cyan); font-size: 10px; font-weight: 800; letter-spacing: 0.2em; }
        .tag-archive { color: #444; font-size: 10px; font-weight: 800; letter-spacing: 0.2em; }
        .l-sec-head { margin-bottom: 40px; }

        .l-event-name { font-size:22px; font-weight:400; margin:0 0 15px 0; color:#eee; }
        .l-venue { font-size:10px; font-weight:700; color:#444; display:flex; align-items:center; gap:8px; }
        .l-note { color:#888; line-height:1.8; font-size:14px; margin-top:20px; white-space:pre-wrap; }

        @keyframes pulse { 0% { opacity:0.5; transform: scale(0.9); } 50% { opacity:1; transform: scale(1.1); } 100% { opacity:0.5; transform: scale(0.9); } }
        
        /* Modal, Loading等は前回と同様 */
      `}</style>
    </div>
  );
}
