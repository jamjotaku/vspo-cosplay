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

  const sortedData = useMemo(() => {
    const missions = logs.filter(l => l.event_date > today).sort((a,b) => a.event_date.localeCompare(b.event_date));
    const archives = logs.filter(l => l.event_date <= today);
    return { missions, archives };
  }, [logs, today]);

  if (loading) return <div className="l-loading">SYNCING_MEMORIES...</div>;

  return (
    <div className="l-root">
      <Head>
        <title>LOGS // CHRONICLE</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;400;700;800&display=swap" rel="stylesheet" />
      </Head>

      <header className="l-header">
        <div className="l-header-inner">
          <Link href="/"><div className="l-back-btn"><i className="fas fa-chevron-left"></i> PORTAL</div></Link>
          <div className="l-brand-title">LOGS <span>MISSION & ARCHIVE</span></div>
          {user && (
            <button className="l-add-trigger" onClick={() => setShowAdd(true)}>
              <i className="fas fa-plus"></i> RECORD
            </button>
          )}
        </div>
      </header>

      <main className="l-container">
        {!user ? (
          <div className="l-prompt">ACCESS_DENIED: LOGIN REQUIRED</div>
        ) : (
          <div className="l-timeline">
            {/* MISSIONS Section */}
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

            {/* ARCHIVES Section */}
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

      {/* --- ADD MODAL (修復済) --- */}
      {showAdd && (
        <div className="m-overlay" onClick={() => setShowAdd(false)}>
          <div className="m-card" onClick={e => e.stopPropagation()}>
            <div className="m-head">
              <h3>NEW_EVENT_ENTRY</h3>
              <button className="m-close" onClick={() => setShowAdd(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave} className="m-form">
              <div className="m-field">
                <label>DATE (MISSION OR ARCHIVE)</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="m-field">
                <label>EVENT_NAME</label>
                <input type="text" placeholder="VGGC 12th / Summer Event..." value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})} required />
              </div>
              <div className="m-field">
                <label>VENUE</label>
                <input type="text" placeholder="Big Sight / Online..." value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} />
              </div>
              <div className="m-field">
                <label>DETAILS / PLANS</label>
                <textarea rows="4" placeholder="Record your precious moment here..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
              </div>
              <button type="submit" className="m-submit">REGISTER_TO_CHRONICLE</button>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root { --v-cyan: #00f2ff; --v-magenta: #ff00ff; }
        body { margin:0; background:#050505; color:#fff; font-family:'Montserrat', sans-serif; }
        button { background: none; border: none; padding: 0; color: inherit; font: inherit; cursor: pointer; outline: inherit; appearance: none; }

        /* HEADER */
        .l-header { position:fixed; top:0; left:0; width:100%; height:90px; background:rgba(5,5,5,0.9); backdrop-filter:blur(20px); z-index:2000; border-bottom:1px solid #111; }
        .l-header-inner { max-width:1200px; margin:0 auto; height:100%; display:flex; align-items:center; justify-content:space-between; padding:0 40px; }
        .l-back-btn { font-size:11px; font-weight:800; color:#444; letter-spacing:0.2em; }
        .l-add-trigger { background:#fff; color:#000; border:none; padding:10px 25px; border-radius:4px; font-weight:800; font-size:11px; }

        /* CONTENT */
        .l-container { max-width:1000px; margin:0 auto; padding:150px 40px 100px; }
        .l-timeline { position:relative; padding-left:40px; }
        .l-timeline::before { content:''; position:absolute; left:0; top:0; bottom:0; width:1px; background:linear-gradient(to bottom, #222 50%, transparent 50%); background-size: 1px 20px; }
        
        .l-divider { margin: 60px 0; font-size: 9px; font-weight: 800; color: var(--v-magenta); letter-spacing: 0.5em; text-align: center; border: 1px solid #111; padding: 10px; position: relative; left: -20px; background: rgba(0,0,0,0.5); }

        .l-item { display:flex; gap:60px; margin-bottom:80px; position:relative; }
        .l-side { width:80px; flex-shrink:0; text-align:right; }
        .l-dot { position:absolute; left:-4.5px; top:12px; width:10px; height:10px; background:#222; border-radius:50%; }
        .l-dot-glow { position:absolute; left:-7px; top:10px; width:14px; height:14px; background:var(--v-cyan); border-radius:50%; box-shadow:0 0 20px var(--v-cyan); }
        
        .l-date .year { display:block; font-size:11px; font-weight:800; color:#333; }
        .l-date .day { display:block; font-size:20px; font-weight:200; color:#fff; }

        .l-content-glass { flex:1; background:rgba(255,255,255,0.02); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.05); border-radius:4px; padding:35px; }
        .is-mission .l-content-glass { border-color: rgba(0,242,255,0.2); }

        /* FORM & MODAL (REPAIRED) */
        .m-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.95); backdrop-filter:blur(20px); z-index:5000; display:flex; align-items:center; justify-content:center; }
        .m-card { background:#0a0a0b; width:480px; padding:40px; border:1px solid #1a1a1c; border-radius:4px; box-shadow: 0 50px 100px rgba(0,0,0,0.8); }
        .m-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:40px; }
        .m-head h3 { font-size:12px; font-weight:800; letter-spacing:0.2em; color:#fff; margin:0; }
        .m-close { font-size:32px; color:#444; }

        .m-form { display: flex; flex-direction: column; }
        .m-field { margin-bottom: 25px; display: flex; flex-direction: column; gap: 10px; }
        .m-field label { font-size: 9px; font-weight: 800; color: #444; letter-spacing: 0.1em; }
        
        input, textarea { 
          background: #111; 
          border: 1px solid #222; 
          border-radius: 2px; 
          padding: 15px; 
          color: #fff; 
          font-family: inherit; 
          outline: none; 
          appearance: none; 
          width: 100%;
          box-sizing: border-box;
        }
        input:focus, textarea:focus { border-color: var(--v-cyan); background: #151518; }
        
        /* Date picker specific */
        input[type="date"] { color-scheme: dark; }

        .m-submit { 
          width: 100%; 
          padding: 20px; 
          background: var(--v-cyan); 
          color: #000; 
          font-weight: 800; 
          font-size: 11px; 
          letter-spacing: 0.1em; 
          margin-top: 10px;
          transition: 0.3s;
        }
        .m-submit:hover { background: #fff; box-shadow: 0 0 30px var(--v-cyan); }

        .l-loading { display:flex; height:100vh; align-items:center; justify-content:center; background:#000; color:var(--v-cyan); font-weight:800; letter-spacing:0.3em; }
      `}</style>
    </div>
  );
}
