import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createWorker } from 'tesseract.js';
import { supabase } from '../lib/supabaseClient';

export default function DeepResonanceLog() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // --- フォーム状態管理 ---
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    event: '',
    venue: '',
    category: 'STAGE',
    fervor: 3,
    note: '',
    is_first_spark: false
  });

  // 複数遭遇レイヤー管理
  const [encounters, setEncounters] = useState([{ id: Date.now(), name: '', is_primary: true, is_new: false }]);
  const [suggestions, setSuggestions] = useState({}); // { encounterId: [list] }

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => { if (user) fetchLogs(); }, [user]);

  // --- データ取得ロジック ---
  const fetchLogs = async () => {
    // 遭遇レイヤー情報も含めて取得
    const { data, error } = await supabase
      .from('fan_logs')
      .select(`
        *,
        log_encounters (
          is_primary,
          cosplayer_master ( name )
        )
      `)
      .order('event_date', { ascending: false });
    
    if (!error) setLogs(data || []);
  };

  // 名前のサジェスト取得 (120点仕様: 最後の日付付き)
  const fetchNames = async (input, encId) => {
    if (input.length < 1) {
      setSuggestions(prev => ({ ...prev, [encId]: [] }));
      return;
    }
    const { data } = await supabase
      .from('cosplayer_master')
      .select(`id, name, fan_logs(event_date)`)
      .ilike('name', `%${input}%`)
      .limit(5);

    // 重複を排除して最新の日付を付与
    const processed = data?.map(d => ({
      ...d,
      last_date: d.fan_logs?.sort((a, b) => b.event_date.localeCompare(a.event_date))[0]?.event_date
    }));

    setSuggestions(prev => ({ ...prev, [encId]: processed || [] }));
  };

  // --- OCRロジック (ブラウザ完結) ---
  const handleOcr = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    const worker = await createWorker('jpn+eng');
    
    try {
      const { data: { text } } = await worker.recognize(file);
      setFormData(prev => ({ ...prev, note: prev.note + "\n" + text }));
    } catch (err) {
      console.error("OCR_ERROR", err);
    } finally {
      await worker.terminate();
      setIsScanning(false);
    }
  };

  // --- 保存処理 ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      // 1. fan_logsへの挿入
      const { data: logData, error: logError } = await supabase
        .from('fan_logs')
        .insert([{
          event_date: formData.date,
          event_name: formData.event,
          venue: formData.venue,
          event_category: formData.category,
          fervor_score: formData.fervor,
          is_first_spark: formData.is_first_spark,
          memory_note: formData.note,
          word_count: formData.note.length
        }])
        .select()
        .single();

      if (logError) throw logError;

      // 2. レイヤーマスタの更新 & 中間テーブル挿入
      for (const enc of encounters) {
        if (!enc.name) continue;

        // すでに存在するか確認
        let { data: master } = await supabase.from('cosplayer_master').select('id').eq('name', enc.name).single();
        
        if (!master) {
          // 新規登録 (一期一会の起源をデフォルトでセット)
          const { data: newMaster } = await supabase.from('cosplayer_master').insert([{
            name: enc.name,
            genesis_catalyst: 'SERENDIPITY',
            genesis_type: 'REAL_ENCOUNTER'
          }]).select().single();
          master = newMaster;
        }

        // 中間テーブルへ
        await supabase.from('log_encounters').insert([{
          log_id: logData.id,
          cosplayer_id: master.id,
          is_primary: enc.is_primary
        }]);
      }

      closeModal();
      fetchLogs();
    } catch (err) {
      alert("SYNC_ERROR: " + err.message);
    }
  };

  // --- UI操作 ---
  const addEncounter = () => setEncounters([...encounters, { id: Date.now(), name: '', is_primary: false }]);
  
  const updateEncounter = (id, field, value) => {
    setEncounters(encounters.map(enc => enc.id === id ? { ...enc, [field]: value } : enc));
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ date: today, event: '', venue: '', category: 'STAGE', fervor: 3, note: '', is_first_spark: false });
    setEncounters([{ id: Date.now(), name: '', is_primary: true }]);
  };

  if (loading) return <div className="l-loading">INITIALIZING_RESONANCE_SCANNER...</div>;

  return (
    <div className="l-root">
      <Head>
        <title>DEEP_RESONANCE // LOGS</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      <header className="l-header">
        <div className="l-header-inner">
          <Link href="/"><div className="l-back-btn">PORTAL_HOME</div></Link>
          <div className="l-brand">DEEP_RESONANCE <span>SCANNER</span></div>
          <button className="l-add-trigger" onClick={() => setShowModal(true)}>RECORD_MISSION</button>
        </div>
      </header>

      <main className="l-container">
        <div className="l-timeline">
          {logs.map((log) => (
            <div key={log.id} className={`l-item ${log.is_first_spark ? 'spark-border' : ''}`}>
              <div className="l-side">
                <span className="year">{log.event_date.split('-')[0]}</span>
                <span className="day">{log.event_date.split('-')[1]}.{log.event_date.split('-')[2]}</span>
              </div>
              <div className="l-content-glass">
                {log.is_first_spark && <div className="spark-badge">FIRST_SPARK</div>}
                <div className="l-cat-tag">{log.event_category}</div>
                <h2 className="l-event-name">{log.event_name}</h2>
                
                {/* 遭遇した人たち */}
                <div className="l-enc-names">
                  {log.log_encounters?.map((e, idx) => (
                    <span key={idx} className={e.is_primary ? 'is-p' : ''}>
                      @{e.cosplayer_master.name}
                    </span>
                  ))}
                </div>

                <div className="l-fervor-meter">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`dot ${i < log.fervor_score ? 'active' : ''}`} />
                  ))}
                </div>
                <p className="l-note">{log.memory_note}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- MODAL: RESONANCE_SCANNER --- */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="m-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="m-card" initial={{ y: 50 }} animate={{ y: 0 }}>
              <div className="m-head">
                <h3>NEW_RESONANCE_SCAN</h3>
                <button onClick={closeModal} className="m-close">&times;</button>
              </div>

              <form onSubmit={handleSave} className="m-form">
                <div className="m-grid">
                  {/* LEFT: CORE_DATA */}
                  <div className="m-col">
                    <div className="m-field">
                      <label>MISSION_DATE</label>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                    </div>
                    <div className="m-field">
                      <label>EVENT_NAME</label>
                      <input type="text" value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})} required />
                    </div>
                    <div className="m-field">
                      <label>CATEGORY</label>
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option value="STAGE">STAGE (Event)</option>
                        <option value="MKT">MARKET (Doujin/Goods)</option>
                        <option value="SHT">SESSION (Photo)</option>
                        <option value="CFE">CAFE_GUEST</option>
                        <option value="MEM">MEMORIAL</option>
                        <option value="DIGITAL">DIGITAL (SNS/Stream)</option>
                      </select>
                    </div>
                    
                    <div className="m-field">
                      <label>COSP_RECOGNITION</label>
                      {encounters.map((enc) => (
                        <div key={enc.id} className="enc-input-row">
                          <input 
                            type="text" 
                            placeholder="@NAME" 
                            value={enc.name} 
                            onChange={(e) => {
                              updateEncounter(enc.id, 'name', e.target.value);
                              fetchNames(e.target.value, enc.id);
                            }}
                          />
                          {/* サジェストリスト */}
                          <div className="s-dropdown">
                            {suggestions[enc.id]?.map(s => (
                              <div key={s.id} className="s-item" onClick={() => {
                                updateEncounter(enc.id, 'name', s.name);
                                setSuggestions(prev => ({...prev, [enc.id]: []}));
                              }}>
                                {s.name} <span className="s-date">{s.last_date || 'New'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addEncounter} className="add-enc-btn">+ ADD_NODE</button>
                    </div>
                  </div>

                  {/* RIGHT: RESONANCE_DATA */}
                  <div className="m-col">
                    <div className="m-field">
                      <label>FERVOR_SCORE (1-5)</label>
                      <div className="fervor-input">
                        {[1,2,3,4,5].map(v => (
                          <button key={v} type="button" 
                                  className={formData.fervor >= v ? 'active' : ''} 
                                  onClick={() => setFormData({...formData, fervor: v})}>
                            ▲
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="m-field relative overflow-hidden">
                      <label>MEMORY_NOTE (WORDS: {formData.note.length})</label>
                      {isScanning && <motion.div className="scan-line" animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2, repeat: Infinity }} />}
                      <textarea rows="6" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
                    </div>

                    <div className="m-field">
                      <label>IMAGE_SCAN (OCR)</label>
                      <input type="file" accept="image/*" onChange={handleOcr} className="ocr-file" />
                    </div>

                    <div className="m-field spark-toggle">
                      <label>FIRST_SPARK?</label>
                      <input type="checkbox" checked={formData.is_first_spark} onChange={e => setFormData({...formData, is_first_spark: e.target.checked})} />
                    </div>
                  </div>
                </div>

                <button type="submit" className="m-submit">EXECUTE_RESONANCE_SYNC</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        :root { --v-magenta: #ff00ff; --v-cyan: #00f2ff; --glass: rgba(255,255,255,0.03); }
        body { background: #000; color: #eee; font-family: 'Montserrat', sans-serif; }

        /* Header */
        .l-header { position: fixed; top: 0; width: 100%; height: 80px; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); z-index: 100; border-bottom: 1px solid #111; }
        .l-header-inner { max-width: 1200px; margin: 0 auto; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 40px; }
        .l-brand { font-weight: 800; letter-spacing: 0.3em; font-size: 14px; }
        .l-brand span { color: var(--v-magenta); }
        .l-add-trigger { background: var(--v-magenta); color: #fff; padding: 10px 20px; font-weight: 800; font-size: 10px; border-radius: 2px; box-shadow: 0 0 15px rgba(255,0,255,0.3); }

        /* Timeline */
        .l-container { max-width: 900px; margin: 0 auto; padding: 120px 20px; }
        .l-item { display: flex; gap: 40px; margin-bottom: 60px; }
        .l-side { width: 60px; text-align: right; opacity: 0.4; }
        .l-side .year { display: block; font-size: 10px; font-weight: 800; }
        .l-side .day { font-size: 18px; font-weight: 200; }

        .l-content-glass { flex: 1; background: var(--glass); border: 1px solid rgba(255,255,255,0.05); padding: 30px; position: relative; }
        .spark-border { border-left: 2px solid var(--v-cyan); }
        .spark-badge { position: absolute; top: -10px; left: 20px; background: var(--v-cyan); color: #000; font-size: 8px; font-weight: 800; padding: 2px 8px; }
        
        .l-cat-tag { font-size: 8px; color: var(--v-magenta); font-weight: 800; letter-spacing: 0.2em; margin-bottom: 10px; }
        .l-event-name { font-size: 20px; font-weight: 400; margin-bottom: 10px; }
        .l-enc-names { display: flex; gap: 10px; font-size: 12px; color: #666; margin-bottom: 15px; }
        .l-enc-names .is-p { color: var(--v-cyan); font-weight: 800; }

        .l-fervor-meter { display: flex; gap: 4px; margin-bottom: 20px; }
        .l-fervor-meter .dot { width: 6px; height: 6px; border: 1px solid #333; transform: rotate(45deg); }
        .l-fervor-meter .dot.active { background: var(--v-magenta); border-color: var(--v-magenta); box-shadow: 0 0 10px var(--v-magenta); }

        /* Modal & Form */
        .m-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(15px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .m-card { background: #0a0a0b; width: 900px; max-height: 90vh; overflow-y: auto; padding: 40px; border: 1px solid #1a1a1c; }
        .m-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; }
        .m-field { margin-bottom: 25px; display: flex; flex-direction: column; gap: 8px; }
        .m-field label { font-size: 9px; font-weight: 800; color: #444; letter-spacing: 0.1em; }
        
        input, select, textarea { background: #111; border: 1px solid #222; padding: 12px; color: #fff; font-size: 13px; outline: none; }
        input:focus, textarea:focus { border-color: var(--v-magenta); }

        .scan-line { position: absolute; left: 0; width: 100%; height: 2px; background: var(--v-magenta); box-shadow: 0 0 15px var(--v-magenta); z-index: 10; pointer-events: none; }

        .fervor-input { display: flex; gap: 10px; }
        .fervor-input button { font-size: 20px; color: #222; transition: 0.3s; }
        .fervor-input button.active { color: var(--v-magenta); text-shadow: 0 0 10px var(--v-magenta); }

        .s-dropdown { position: absolute; width: 100%; background: #151518; border: 1px solid #222; z-index: 50; }
        .s-item { padding: 10px; font-size: 12px; cursor: pointer; display: flex; justify-content: space-between; }
        .s-item:hover { background: #222; }
        .s-date { color: #444; font-size: 10px; }

        .m-submit { grid-column: span 2; width: 100%; padding: 20px; background: none; border: 1px solid var(--v-magenta); color: var(--v-magenta); font-weight: 800; font-size: 12px; margin-top: 20px; transition: 0.3s; }
        .m-submit:hover { background: var(--v-magenta); color: #fff; box-shadow: 0 0 30px var(--v-magenta); }
      `}</style>
    </div>
  );
}
