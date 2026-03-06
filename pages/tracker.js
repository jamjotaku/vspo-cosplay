import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

const MASTER_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSAruZ3gKMni3ipy08kB8iVkpwlUTlpOro_TvCO4ilZaDeUvdlwVEqYqcsLtbSu5gV0ZhqeRJhDSY0-/pub?output=csv";

// ユーザーIDを内部用メール形式に変換するユーティリティ
const formatUserId = (id) => `${id}@vspo-internal.local`;

export default function Tracker() {
  const [masterData, setMasterData] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userProgress, setUserProgress] = useState({});

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    const loadMaster = async () => {
      const Papa = (await import('papaparse')).default;
      Papa.parse(MASTER_CSV_URL, {
        download: true, header: true, skipEmptyLines: true,
        complete: (res) => {
          setMasterData(res.data);
          if (res.data.length > 0) setSelectedItem(res.data[0]);
          setLoading(false);
        }
      });
    };
    loadMaster();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchProgress();
  }, [user]);

  const fetchProgress = async () => {
    const { data } = await supabase.from('user_progress').select('*').eq('user_id', user.id);
    if (data) {
      const formatted = {};
      data.forEach(row => { formatted[row.master_id] = { parts: row.parts }; });
      setUserProgress(formatted);
    }
  };

  const saveToSupabase = async (id, parts) => {
    if (!user) return;
    await supabase.from('user_progress').upsert({
      user_id: user.id, master_id: id, parts: parts, updated_at: new Date()
    }, { onConflict: 'user_id, master_id' });
  };

  // 【新規アカウント作成】
  const handleSignUp = async () => {
    const userId = prompt("希望するユーザーIDを入力してください");
    const password = prompt("パスワードを入力してください (6文字以上)");
    if (!userId || !password) return;
    const { data, error } = await supabase.auth.signUp({
      email: formatUserId(userId),
      password: password,
    });
    if (error) alert("登録エラー: " + error.message);
    else alert("アカウント作成完了！");
  };

  // 【ログイン】
  const handleSignIn = async () => {
    const userId = prompt("ユーザーIDを入力してください");
    const password = prompt("パスワードを入力してください");
    if (!userId || !password) return;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formatUserId(userId),
      password: password,
    });
    if (error) alert("ログインエラー: IDまたはパスワードが違います");
    else alert("ログインに成功しました！");
  };

  const addPart = () => {
    if (!selectedItem) return;
    const id = selectedItem.Master_ID;
    const partName = prompt("追加するパーツ名を入力してください");
    if (!partName) return;
    const newParts = [...(userProgress[id]?.parts || []), { name: partName, percent: 0 }];
    const newProgress = { ...userProgress, [id]: { parts: newParts } };
    setUserProgress(newProgress);
    saveToSupabase(id, newParts);
  };

  const updatePercent = (index, val) => {
    const id = selectedItem.Master_ID;
    const newParts = [...userProgress[id].parts];
    newParts[index].percent = parseInt(val);
    const newProgress = { ...userProgress, [id]: { parts: newParts } };
    setUserProgress(newProgress);
    saveToSupabase(id, newParts);
  };

  const deletePart = (index) => {
    if (!confirm("このパーツを削除しますか？")) return;
    const id = selectedItem.Master_ID;
    const newParts = userProgress[id].parts.filter((_, i) => i !== index);
    const newProgress = { ...userProgress, [id]: { parts: newParts } };
    setUserProgress(newProgress);
    saveToSupabase(id, newParts);
  };

  const handleWheel = (e) => { e.preventDefault(); const delta = e.deltaY > 0 ? -0.1 : 0.1; setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 5)); };
  const handleMouseDown = (e) => { setIsDragging(true); setStartPos({ x: e.clientX - offset.x, y: e.clientY - offset.y }); };
  const handleMouseMove = (e) => { if (!isDragging) return; setOffset({ x: e.clientX - startPos.x, y: e.clientY - startPos.y }); };

  if (loading) return <div className="loading">SYNCING PRODUCTION DATA...</div>;

  const currentParts = selectedItem ? (userProgress[selectedItem.Master_ID]?.parts || []) : [];
  const totalProgress = currentParts.length > 0 
    ? Math.round(currentParts.reduce((acc, p) => acc + p.percent, 0) / currentParts.length) 
    : 0;

  return (
    <div className="tracker-root" onMouseUp={() => setIsDragging(false)}>
      <Head>
        <title>VSPO! COSTUME TRACKER</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;800&display=swap" rel="stylesheet" />
      </Head>

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-logo">VSPO! TRACKER</div>
          {user ? (
            <div className="user-info">
              <span className="user-email">ID: {user.email.split('@')[0]}</span>
              <button onClick={() => supabase.auth.signOut()} className="auth-btn">LOGOUT</button>
            </div>
          ) : (
            <div className="auth-group" style={{ display: 'flex', gap: '5px' }}>
              <button onClick={handleSignIn} className="auth-btn login" style={{ flex: 1 }}>LOGIN</button>
              <button onClick={handleSignUp} className="auth-btn" style={{ flex: 1, background: '#1a1a1d' }}>SIGN UP</button>
            </div>
          )}
        </div>
        <div className="item-list">
          {masterData.map((item) => (
            <div key={item.Master_ID} className={`costume-item ${selectedItem?.Master_ID === item.Master_ID ? 'active' : ''}`} onClick={() => setSelectedItem(item)}>
              <div className="mem-name">{item.Member_Name}</div>
              <div className="cos-type">{item.Costume_Type}</div>
            </div>
          ))}
        </div>
      </aside>

      <main className="viewer-area">
        <div className="info-bar">
          <h2>{selectedItem?.Member_Name} <span className="slash">/</span> <span className="type">{selectedItem?.Costume_Type}</span></h2>
          <div className="controls-hint">WHEEL: ZOOM / DRAG: MOVE STAGE</div>
        </div>
        <div className="image-stage" onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
          {selectedItem && (
            <img src={selectedItem.Ref_Image_URL} alt="Ref" className="ref-image" draggable="false" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }} />
          )}
        </div>
      </main>

      <aside className="progress-panel">
        <div className="panel-header">
          <span className="status-label">{user ? "PRODUCTION LOG" : "GUEST MODE"}</span>
          <span className="total-badge">{totalProgress}%</span>
        </div>
        <div className="total-bar-container"><div className="total-bar-fill" style={{ width: `${totalProgress}%` }}></div></div>
        
        <div className="progress-content">
          {user ? (
            <>
              <button className="add-btn" onClick={addPart}>+ ADD NEW PART</button>
              <div className="parts-list">
                {currentParts.map((part, idx) => (
                  <div key={idx} className="part-card">
                    <div className="part-info">
                      <span className="part-name">{part.name}</span>
                      <span className="part-percent">{part.percent}%</span>
                      <button className="del-mini" onClick={() => deletePart(idx)}>&times;</button>
                    </div>
                    <input type="range" min="0" max="100" value={part.percent} onChange={(e) => updatePercent(idx, e.target.value)} className="p-slider" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="guest-msg">ログインすると、クラウドに進捗を同期できます。</div>
          )}
        </div>
      </aside>

      <style jsx global>{`
        body { margin: 0; background: #050507; color: #eee; font-family: 'Montserrat', sans-serif; overflow: hidden; }
        .tracker-root { display: flex; height: 100vh; width: 100vw; }
        .sidebar { width: 260px; background: #0a0a0c; border-right: 1px solid #1a1a1c; flex-shrink: 0; display: flex; flex-direction: column; }
        .sidebar-header { padding: 25px 20px; border-bottom: 1px solid #1a1a1c; }
        .brand-logo { font-weight: 800; font-size: 14px; letter-spacing: 0.2em; color: #00f2ff; margin-bottom: 15px; }
        .auth-btn { width: 100%; padding: 10px; background: transparent; border: 1px solid #333; color: #ccc; cursor: pointer; border-radius: 6px; font-size: 10px; font-weight: 800; transition: 0.3s; }
        .auth-btn.login { background: #00f2ff; color: #000; border: none; }
        .item-list { flex: 1; overflow-y: auto; padding: 10px; }
        .costume-item { padding: 15px; border-radius: 8px; margin-bottom: 8px; cursor: pointer; border: 1px solid transparent; }
        .costume-item.active { background: #111114; border-color: #00f2ff; box-shadow: 0 0 15px rgba(0,242,255,0.1); }
        .mem-name { font-size: 13px; font-weight: 800; }
        .cos-type { font-size: 10px; color: #555; }
        .viewer-area { flex: 1; display: flex; flex-direction: column; background: #000; position: relative; overflow: hidden; }
        .info-bar { padding: 15px 25px; background: rgba(10,10,12,0.95); backdrop-filter: blur(10px); z-index: 10; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1a1a1c; }
        .info-bar h2 { font-size: 18px; margin: 0; font-weight: 800; }
        .slash { color: #00f2ff; margin: 0 10px; }
        .type { color: #888; font-weight: 300; }
        .image-stage { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; background: radial-gradient(circle at center, #111 0%, #000 100%); }
        .ref-image { max-width: 85%; height: auto; transition: transform 0.05s linear; }
        .progress-panel { width: 340px; background: #0a0a0c; border-left: 1px solid #1a1a1c; display: flex; flex-direction: column; }
        .panel-header { padding: 25px; display: flex; justify-content: space-between; align-items: center; }
        .total-badge { background: #ff00ff; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; }
        .total-bar-container { width: 100%; height: 2px; background: #1a1a1c; }
        .total-bar-fill { height: 100%; background: #ff00ff; transition: 0.6s; }
        .add-btn { width: 100%; padding: 12px; background: transparent; border: 1px dashed #333; color: #555; border-radius: 8px; cursor: pointer; margin-bottom: 25px; font-size: 11px; font-weight: 800; }
        .part-card { background: #111114; padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #1a1a1c; }
        .part-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .part-percent { color: #00f2ff; font-weight: 800; }
        .p-slider { width: 100%; cursor: pointer; accent-color: #00f2ff; }
        .loading { display: flex; height: 100vh; align-items: center; justify-content: center; background: #000; color: #00f2ff; font-weight: 800; letter-spacing: 0.3em; }
      `}</style>
    </div>
  );
}
