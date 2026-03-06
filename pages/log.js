import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function OshigotoLog() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  
  // 入力フォームの状態
  const [formData, setFormData] = useState({ date: '', event: '', venue: '', note: '' });

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

    if (error) {
      alert("保存エラー: " + error.message);
    } else {
      setFormData({ date: '', event: '', venue: '', note: '' });
      setShowAdd(false);
      fetchLogs();
    }
  };

  if (loading) return <div className="loading">SYNCING MEMORIES...</div>;

  return (
    <div className="log-root">
      <Head>
        <title>OSHIGOTO LOG | VSPO! HUB</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;700;800&display=swap" rel="stylesheet" />
      </Head>

      <nav className="log-nav">
        <Link href="/">
          <div className="back-btn"><i className="fas fa-arrow-left"></i> BACK TO ARCHIVE</div>
        </Link>
      </nav>

      <div className="container">
        <header className="log-header">
          <div className="title-block">
            <span className="badge">CHRONICLES</span>
            <h1>OSHIGOTO LOG</h1>
            <p>推し事の軌跡を、一冊のアーカイブに。</p>
          </div>
          {user && (
            <button className="add-trigger" onClick={() => setShowAdd(true)}>
              <i className="fas fa-pen-nib"></i> 過去の記録を綴る
            </button>
          )}
        </header>

        {!user ? (
          <div className="login-prompt">
            <i className="fas fa-lock"></i>
            <p>ログインすると、自分専用の参戦日記を作成できます。</p>
            <Link href="/tracker"><button className="login-jump">ログインページへ</button></Link>
          </div>
        ) : (
          <div className="timeline">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="log-card">
                  <div className="card-side">
                    <div className="dot"></div>
                    <div className="date-display">
                      <span className="year">{log.event_date.split('-')[0]}</span>
                      <span className="day">{log.event_date.split('-')[1]}.{log.event_date.split('-')[2]}</span>
                    </div>
                  </div>
                  <div className="card-main">
                    <div className="card-header">
                      <h2 className="event-name">{log.event_name}</h2>
                      <div className="venue-tag"><i className="fas fa-map-marker-alt"></i> {log.venue || "会場未設定"}</div>
                    </div>
                    <div className="card-body">
                      <p className="note-text">{log.memory_note}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <i className="fas fa-ghost"></i>
                <p>まだ思い出が登録されていません。<br/>「綴る」ボタンから最初の記録を追加しましょう。</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 追加フォームモーダル */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>綴る / NEW MEMORY</h3>
              <button className="close-x" onClick={() => setShowAdd(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="input-row">
                <label>開催日</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
              </div>
              <div className="input-row">
                <label>イベント名称</label>
                <input type="text" placeholder="例: C103 / ぶいすぽ文化祭" value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})} required />
              </div>
              <div className="input-row">
                <label>会場</label>
                <input type="text" placeholder="例: 東京ビッグサイト / 幕張メッセ" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} />
              </div>
              <div className="input-row">
                <label>記録・思い出</label>
                <textarea placeholder="あの時の熱量や、衣装の感想を自由に記録..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
              </div>
              <button type="submit" className="submit-btn">この記憶をアーカイブする</button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .log-root { background: #050507; min-height: 100vh; color: #fff; font-family: 'Montserrat', sans-serif; padding-bottom: 100px; }
        .log-nav { padding: 30px 40px; }
        .back-btn { font-size: 11px; font-weight: 800; color: #555; cursor: pointer; transition: 0.3s; letter-spacing: 0.1em; }
        .back-btn:hover { color: var(--cyan); }
        
        .container { max-width: 900px; margin: 0 auto; padding: 0 20px; }
        
        .log-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 80px; }
        .badge { font-size: 10px; font-weight: 800; color: #ff00ff; letter-spacing: 0.3em; margin-bottom: 10px; display: block; border-left: 2px solid #ff00ff; padding-left: 15px; }
        h1 { font-size: 48px; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
        .log-header p { color: #666; margin-top: 10px; font-size: 14px; }
        
        .add-trigger { background: #fff; color: #000; border: none; padding: 15px 30px; border-radius: 40px; font-weight: 800; font-size: 13px; cursor: pointer; transition: 0.3s; }
        .add-trigger:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,242,255,0.3); background: #00f2ff; }

        .timeline { position: relative; padding-left: 20px; }
        .timeline::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 1px; background: linear-gradient(to bottom, #222, #111); }
        
        .log-card { display: flex; gap: 40px; margin-bottom: 60px; position: relative; }
        .card-side { width: 80px; flex-shrink: 0; text-align: right; }
        .dot { position: absolute; left: -4px; top: 10px; width: 9px; height: 9px; background: #ff00ff; border-radius: 50%; box-shadow: 0 0 15px #ff00ff; }
        .date-display { display: flex; flex-direction: column; }
        .year { font-size: 12px; font-weight: 800; color: #333; }
        .day { font-size: 18px; font-weight: 800; color: #666; }

        .card-main { flex: 1; background: #0f0f12; border: 1px solid #1a1a1c; border-radius: 20px; padding: 30px; transition: 0.3s; }
        .card-main:hover { border-color: #333; transform: translateX(10px); background: #121216; }
        
        .event-name { font-size: 22px; font-weight: 800; margin: 0 0 10px 0; color: #00f2ff; }
        .venue-tag { font-size: 12px; font-weight: 700; color: #555; display: flex; align-items: center; gap: 8px; }
        .note-text { color: #aaa; line-height: 1.8; font-size: 15px; margin-top: 20px; white-space: pre-wrap; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
        .modal-content { background: #0a0a0c; width: 90%; max-width: 500px; padding: 40px; border-radius: 30px; border: 1px solid #222; }
        .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .modal-head h3 { font-size: 16px; font-weight: 800; letter-spacing: 0.1em; }
        .close-x { background: none; border: none; color: #555; font-size: 30px; cursor: pointer; }
        
        .input-row { margin-bottom: 25px; }
        .input-row label { display: block; font-size: 10px; font-weight: 800; color: #555; margin-bottom: 10px; letter-spacing: 0.1em; }
        input, textarea { width: 100%; background: #141417; border: 1px solid #222; border-radius: 12px; padding: 15px; color: #fff; outline: none; transition: 0.3s; }
        input:focus, textarea:focus { border-color: #00f2ff; background: #1a1a1e; }
        textarea { height: 120px; resize: none; font-family: inherit; }
        .submit-btn { width: 100%; padding: 18px; border-radius: 15px; border: none; background: linear-gradient(135deg, #00f2ff, #ff00ff); color: #fff; font-weight: 800; cursor: pointer; margin-top: 10px; transition: 0.3s; }
        .submit-btn:hover { transform: scale(1.02); box-shadow: 0 0 20px rgba(0,242,255,0.4); }

        .loading { display: flex; height: 100vh; align-items: center; justify-content: center; background: #000; color: #00f2ff; font-weight: 800; letter-spacing: 0.3em; }
        .empty-state, .login-prompt { text-align: center; padding: 100px 0; color: #333; }
        .empty-state i, .login-prompt i { font-size: 40px; margin-bottom: 20px; color: #111; }
        .login-jump { background: #222; color: #fff; border: none; padding: 12px 24px; border-radius: 20px; font-weight: 800; margin-top: 20px; cursor: pointer; }
      `}</style>
    </div>
  );
}
