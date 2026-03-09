import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function OshigotoLog() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ date: '', event: '', venue: '', note: '' });

  // ポータルと共通の輝度設定（将来的に共有Stateにするとベスト）
  const [brightness] = useState(0.8);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user) fetchLogs();
  }, [user]);

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

    if (error) alert("保存エラー: " + error.message);
    else {
      setFormData({ date: '', event: '', venue: '', note: '' });
      setShowAdd(false);
      fetchLogs();
    }
  };

  if (loading) return <div className="l-loading">SYNCING_MEMORIES...</div>;

  return (
    <div className="l-root" style={{ '--v-bright': brightness }}>
      <Head>
        <title>MEMORY_LOG // VSPO! HUB</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;400;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* --- FIXED HEADER (Galleryと統一) --- */}
      <header className="l-header">
        <div className="l-header-inner">
          <Link href="/"><div className="l-back-btn"><i className="fas fa-chevron-left"></i> PORTAL</div></Link>
          <div className="l-brand-title">LOGS <span>The Chronicle</span></div>
          {user && (
            <button className="l-add-trigger" onClick={() => setShowAdd(true)}>
              <i className="fas fa-pen-nib"></i> RECORD
            </button>
          )}
        </div>
      </header>

      <main className="l-container">
        {!user ? (
          <div className="l-prompt">
            <i className="fas fa-lock"></i>
            <p>記憶の同期には認証が必要です</p>
            <Link href="/tracker"><button className="l-login-btn">GO TO AUTH</button></Link>
          </div>
        ) : (
          <div className="l-timeline">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="l-item">
                  <div className="l-side">
                    <div className="l-dot"></div>
                    <div className="l-date">
                      <span className="year">{log.event_date.split('-')[0]}</span>
                      <span className="day">{log.event_date.split('-')[1]}.{log.event_date.split('-')[2]}</span>
                    </div>
                  </div>
                  <div className="l-content-glass">
                    <div className="l-card-head">
                      <span className="l-venue"><i className="fas fa-map-marker-alt"></i> {log.venue || "DIGITAL BASE"}</span>
                      <h2 className="l-event-name">{log.event_name}</h2>
                    </div>
                    <div className="l-card-body">
                      <p className="l-note">{log.memory_note}</p>
                    </div>
                    {/* 画像ピン留め用スロット (将来の機能) */}
                    <div className="l-photo-pin">
                      <i className="fas fa-camera"></i> NO_IMAGE_PINNED
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="l-empty">NO_MEMORIES_RECORDED</div>
            )}
          </div>
        )}
      </main>

      {/* --- ADD MODAL (System Configと統一) --- */}
      {showAdd && (
        <div className="m-overlay" onClick={() => setShowAdd(false)}>
          <div className="m-card" onClick={e => e.stopPropagation()}>
            <div className="m-head">
              <h3>NEW_RECORD</h3>
              <button className="m-close" onClick={() => setShowAdd(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave} className="m-form">
              <div className="m-field">
                <label>DATE</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="m-field">
                <label>EVENT_NAME</label>
                <input type="text" placeholder="VGGC 11th / Comic Market..." value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})} required />
              </div>
              <div className="m-field">
                <label>VENUE</label>
                <input type="text" placeholder="Makuhari Messe..." value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} />
              </div>
              <div className="m-field">
                <label>MEMORY_NOTE</label>
                <textarea rows="4" placeholder="Record your precious moment here..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
              </div>
              <button type="submit" className="m-submit">ARCHIVE_RECORD</button>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root { --v-cyan: #00f2ff; --v-glass: rgba(255, 255, 255, 0.03); }
        body { margin:0; background:#050505; color:#fff; font-family:'Montserrat', sans-serif; }
        
        .l-header { position:fixed; top:0; left:0; width:100%; height:90px; background:rgba(5,5,5,0.9); backdrop-filter:blur(20px); z-index:2000; border-bottom:1px solid #111; }
        .l-header-inner { max-width:1200px; margin:0 auto; height:100%; display:flex; align-items:center; justify-content:space-between; padding:0 40px; }
        .l-back-btn { font-size:11px; font-weight:800; color:#444; letter-spacing:0.2em; cursor:pointer; transition:0.3s; }
        .l-back-btn:hover { color:#fff; }
        .l-brand-title { font-size:18px; font-weight:800; letter-spacing:0.1em; }
        .l-brand-title span { font-size:10px; font-weight:400; color:#333; margin-left:10px; letter-spacing:0.2em; }
        .l-add-trigger { background:#fff; color:#000; border:none; padding:10px 25px; border-radius:4px; font-weight:800; font-size:11px; cursor:pointer; transition:0.3s; }
        .l-add-trigger:hover { background:var(--v-cyan); box-shadow:0 0 20px var(--v-cyan); transform:translateY(-2px); }

        .l-container { max-width:1000px; margin:0 auto; padding:150px 40px 100px; }
        
        .l-timeline { position:relative; padding-left:40px; }
        .l-timeline::before { content:''; position:absolute; left:0; top:0; bottom:0; width:1px; background:linear-gradient(to bottom, transparent, #222 10%, #222 90%, transparent); }
        
        .l-item { display:flex; gap:60px; margin-bottom:80px; position:relative; }
        .l-side { width:80px; flex-shrink:0; text-align:right; }
        .l-dot { position:absolute; left:-4.5px; top:12px; width:10px; height:10px; background:var(--v-cyan); border-radius:50%; box-shadow:0 0 15px var(--v-cyan); z-index:10; }
        
        .l-date { display:flex; flex-direction:column; opacity:calc(var(--v-bright)*0.5); }
        .year { font-size:11px; font-weight:800; color:#444; }
        .day { font-size:20px; font-weight:200; color:#fff; }

        .l-content-glass { 
          flex:1; background:var(--v-glass); backdrop-filter:blur(15px); 
          border:1px solid rgba(255,255,255,0.08); border-radius:4px; padding:40px; 
          transition:0.4s cubic-bezier(0.19, 1, 0.22, 1); 
        }
        .l-content-glass:hover { background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.2); transform:translateX(10px); }
        
        .l-venue { font-size:9px; font-weight:800; color:var(--v-cyan); letter-spacing:0.2em; text-transform:uppercase; margin-bottom:15px; display:block; }
        .l-event-name { font-size:24px; font-weight:400; margin:0 0 20px 0; color:rgba(255,255,255,calc(0.4+var(--v-bright)*0.6)); letter-spacing:0.05em; }
        .l-note { color:#888; line-height:1.8; font-size:14px; white-space:pre-wrap; }
        
        .l-photo-pin { margin-top:30px; border-top:1px solid #111; padding-top:20px; font-size:9px; font-weight:800; color:#222; letter-spacing:0.1em; display:flex; align-items:center; gap:10px; }

        /* MODAL */
        .m-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.9); backdrop-filter:blur(20px); z-index:5000; display:flex; align-items:center; justify-content:center; }
        .m-card { background:#0a0a0b; width:480px; padding:40px; border:1px solid #1a1a1c; border-radius:4px; }
        .m-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:40px; }
        .m-head h3 { font-size:12px; font-weight:800; letter-spacing:0.2em; color:#444; }
        .m-close { background:none; border:none; color:#fff; font-size:30px; cursor:pointer; }
        
        .m-field { margin-bottom:25px; }
        .m-field label { display:block; font-size:9px; font-weight:800; color:#333; margin-bottom:12px; letter-spacing:0.1em; }
        input, textarea { width:100%; background:#111; border:1px solid #222; border-radius:2px; padding:15px; color:#fff; outline:none; font-family:inherit; }
        input:focus, textarea:focus { border-color:var(--v-cyan); }
        .m-submit { width:100%; padding:18px; background:var(--v-cyan); color:#000; border:none; font-weight:800; font-size:11px; cursor:pointer; margin-top:10px; }
        
        .l-loading { display:flex; height:100vh; align-items:center; justify-content:center; background:#000; color:var(--v-cyan); font-weight:800; letter-spacing:0.3em; }
        .l-prompt, .l-empty { text-align:center; padding:100px 0; color:#222; }
        .l-login-btn { background:#111; color:#fff; border:1px solid #222; padding:12px 24px; border-radius:4px; font-weight:800; margin-top:20px; font-size:10px; cursor:pointer; }
      `}</style>
    </div>
  );
}
