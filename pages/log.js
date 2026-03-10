import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createWorker } from 'tesseract.js';
import { supabase } from '../lib/supabaseClient';

export default function GrandResonanceArchive() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // --- フォームステート (全機能統合) ---
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    event: '', venue: '', category: 'STAGE', fervor: 3, note: '', is_first_spark: false
  });
  const [encounters, setEncounters] = useState([{ id: Date.now(), name: '', is_primary: true }]);
  const [suggestions, setSuggestions] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => { if (user) fetchLogs(); }, [user]);

  // 1. 全データ取得 (リレーション含む)
  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('fan_logs')
      .select('*, log_encounters(*, cosplayer_master(name))')
      .order('event_date', { ascending: false });
    if (!error) setLogs(data || []);
  };

  // 2. 120点のサジェスト (最後の日付を表示)
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

    const processed = data?.map(d => ({
      ...d,
      last_date: d.fan_logs?.sort((a, b) => b.event_date.localeCompare(a.event_date))[0]?.event_date
    }));
    setSuggestions(prev => ({ ...prev, [encId]: processed || [] }));
  };

  // 3. ブラウザ完結型OCR (演出付)
  const handleOcr = async (file) => {
    if (!file) return;
    setIsScanning(true);
    const worker = await createWorker('jpn+eng');
    try {
      const { data: { text } } = await worker.recognize(file);
      setFormData(prev => ({ ...prev, note: prev.note + "\n" + text }));
    } finally {
      await worker.terminate();
      setIsScanning(false);
    }
  };

  // 4. 保存処理 (トランザクション的実行)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      // 親ログ保存
      const { data: logData, error: logError } = await supabase
        .from('fan_logs')
        .insert([{
          event_date: formData.date, event_name: formData.event, venue: formData.venue,
          event_category: formData.category, fervor_score: formData.fervor,
          is_first_spark: formData.is_first_spark, memory_note: formData.note, word_count: formData.note.length
        }]).select().single();

      if (logError) throw logError;

      // 各レイヤーの処理
      for (const enc of encounters) {
        if (!enc.name) continue;
        let { data: master } = await supabase.from('cosplayer_master').select('id').eq('name', enc.name).single();
        if (!master) {
          const { data: newMaster } = await supabase.from('cosplayer_master').insert([{ 
            name: enc.name, genesis_catalyst: 'SERENDIPITY', genesis_type: 'REAL' 
          }]).select().single();
          master = newMaster;
        }
        await supabase.from('log_encounters').insert([{ log_id: logData.id, cosplayer_id: master.id, is_primary: enc.is_primary }]);
      }
      setShowModal(false); fetchLogs();
    } catch (err) { alert("SYNC_ERROR: " + err.message); }
  };

  if (loading) return <div className="c-loader">RESONANCE_INITIALIZING...</div>;

  return (
    <div className="c-root">
      <Head><title>DR // GRAND_CONSOLE</title></Head>

      <header className="c-header">
        <div className="c-header-inner">
          <Link href="/"><span className="c-back">← PORTAL</span></Link>
          <div className="c-logo">RESONANCE_ARCHIVE <span>CORE</span></div>
          <button className="c-record-btn" onClick={() => setShowModal(true)}>+ DATA_ENTRY</button>
        </div>
      </header>

      <main className="c-main">
        {logs.map(log => (
          <div key={log.id} className="c-log-card">
            <div className="c-log-side">
              <span className="c-log-date">{log.event_date.replace(/-/g, '.')}</span>
              <span className="c-log-cat">{log.event_category}</span>
            </div>
            <div className="c-log-body">
              <h2 className="c-log-title">{log.event_name}</h2>
              <div className="c-log-names">
                {log.log_encounters?.map((e, i) => (
                  <span key={i} className={e.is_primary ? 'is-p' : ''}>@{e.cosplayer_master?.name}</span>
                ))}
              </div>
              <p className="c-log-note">{log.memory_note}</p>
            </div>
          </div>
        ))}
      </main>

      <AnimatePresence>
        {showModal && (
          <motion.div className="m-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="m-glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              
              <div className="m-ui-header">
                <div className="m-ui-status"><span className="dot pulse" /> UPLINK_ACTIVE</div>
                <button className="m-ui-close" onClick={() => setShowModal(false)}>&times;</button>
              </div>

              <form onSubmit={handleSave} className="m-ui-form">
                <div className="m-ui-grid">
                  
                  {/* LEFT: CORE_UPLINK */}
                  <div className="m-ui-col">
                    <div className="m-ui-field">
                      <label><span className="id-tag">01</span> MISSION_DATE</label>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="m-ui-field">
                      <label><span className="id-tag">02</span> EVENT_NAME</label>
                      <input type="text" placeholder="REQUIRED_FIELD..." value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})} required />
                    </div>
                    <div className="m-ui-field">
                      <label><span className="id-tag">03</span> CATEGORY</label>
                      <select className="custom-select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option value="STAGE">STAGE_EVENT</option>
                        <option value="MKT">MARKET_DOUJIN</option>
                        <option value="SHT">PHOTO_SESSION</option>
                        <option value="CFE">CAFE_GUEST</option>
                        <option value="MEM">MEMORIAL</option>
                        <option value="DIGITAL">DIGITAL_SNS</option>
                      </select>
                    </div>
                    
                    <div className="m-ui-field">
                      <label><span className="id-tag">04</span> COSP_NODES (ENCOUNTERS)</label>
                      <div className="node-list">
                        {encounters.map((enc) => (
                          <div key={enc.id} className="node-item-wrap">
                            <div className="node-item">
                              <input 
                                placeholder="@IDENTIFIER..." 
                                value={enc.name} 
                                onChange={(e) => {
                                  setEncounters(encounters.map(item => item.id === enc.id ? {...item, name: e.target.value} : item));
                                  fetchNames(e.target.value, enc.id);
                                }}
                              />
                              <button type="button" 
                                      className={`node-primary-toggle ${enc.is_primary ? 'active' : ''}`}
                                      onClick={() => setEncounters(encounters.map(item => ({...item, is_primary: item.id === enc.id})))}>
                                {enc.is_primary ? 'MAIN' : 'SIDE'}
                              </button>
                            </div>
                            {/* 120点のサジェスト表示 */}
                            <AnimatePresence>
                              {suggestions[enc.id]?.length > 0 && (
                                <motion.div className="node-suggest-box" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                  {suggestions[enc.id].map((s, i) => (
                                    <div key={i} className="s-item" onClick={() => {
                                      setEncounters(encounters.map(item => item.id === enc.id ? {...item, name: s.name} : item));
                                      setSuggestions(p => ({...p, [enc.id]: []}));
                                    }}>
                                      {s.name} <span className="s-date">{s.last_date ? `Last: ${s.last_date}` : 'New Encounter'}</span>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                        <button type="button" className="node-add-btn" onClick={() => setEncounters([...encounters, {id: Date.now(), name:'', is_primary:false}])}>
                          + ATTACH_NEW_NODE
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: RESONANCE_DATA */}
                  <div className="m-ui-col">
                    <div className="m-ui-field">
                      <label><span className="id-tag">05</span> FERVOR_LEVEL</label>
                      <div className="fervor-gauge-v2">
                        {[1,2,3,4,5].map(v => (
                          <div key={v} className={`gauge-segment ${formData.fervor >= v ? 'active' : ''}`} onClick={() => setFormData({...formData, fervor: v})} />
                        ))}
                      </div>
                    </div>

                    <div className="m-ui-field">
                      <label><span className="id-tag">06</span> THOUGHT_LOG (WORDS: {formData.note.length})</label>
                      <div className="textarea-wrapper">
                        {isScanning && <div className="scan-line-v2" />}
                        <textarea rows="10" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="ENTERING_MISSION_REPORT..." />
                      </div>
                    </div>

                    <div className="m-ui-field">
                      <label><span className="id-tag">07</span> OPTICAL_SCAN (OCR)</label>
                      <div className="ocr-dropzone-v2">
                        <input type="file" id="ocr-v2" hidden onChange={e => handleOcr(e.target.files[0])} />
                        <label htmlFor="ocr-v2">
                          <i className="fas fa-expand-arrows-alt" />
                          <span>{isScanning ? 'SCANNING_IN_PROGRESS...' : 'UPLOAD_IMAGE_FOR_OCR'}</span>
                        </label>
                      </div>
                    </div>

                    <div className="m-ui-field flex-row">
                      <label>FIRST_SPARK_DETECTED</label>
                      <label className="ui-switch">
                        <input type="checkbox" checked={formData.is_first_spark} onChange={e => setFormData({...formData, is_first_spark: e.target.checked})} />
                        <span className="ui-slider" />
                      </label>
                    </div>
                  </div>
                </div>

                <button type="submit" className="final-execute-btn">SYNC_GRAND_ARCHIVE</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #030304; }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; margin: 0; }
        
        /* モーダル背景・スクロール対応 */
        .m-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.95); backdrop-filter: blur(30px);
          z-index: 9999; display: flex; align-items: flex-start; justify-content: center;
          padding: 40px 20px; overflow-y: auto;
        }
        .m-glass-card {
          background: rgba(15, 15, 20, 0.9); width: 1100px; padding: 60px;
          border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; position: relative;
        }

        /* セレクトボックス白飛び対策 */
        .custom-select {
          background: #111 !important; color: #fff !important; border: 1px solid #333 !important;
          padding: 12px 15px !important; width: 100%; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23444' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important; background-position: right 15px center !important;
        }
        .custom-select option { background: #111; color: #fff; }

        /* サジェストボックス */
        .node-item-wrap { position: relative; margin-bottom: 10px; }
        .node-suggest-box {
          position: absolute; top: 100%; left: 0; width: 100%; background: #0a0a0a;
          border: 1px solid #222; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .s-item { padding: 12px; font-size: 12px; cursor: pointer; border-bottom: 1px solid #111; display: flex; justify-content: space-between; }
        .s-item:hover { background: #111; color: var(--v-cyn); }
        .s-date { color: #444; font-size: 10px; }

        /* ゲージ・トグル・演出 (共通) */
        .fervor-gauge-v2 { display: flex; gap: 8px; }
        .gauge-segment { flex: 1; height: 4px; background: #111; cursor: pointer; transition: 0.4s; }
        .gauge-segment.active { background: var(--v-mag); box-shadow: 0 0 15px var(--v-mag); }

        .scan-line-v2 { position: absolute; width: 100%; height: 2px; background: var(--v-mag); box-shadow: 0 0 15px var(--v-mag); animation: scan 2s infinite; pointer-events: none; z-index: 10; }
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }

        .ui-switch { position: relative; width: 44px; height: 22px; }
        .ui-switch input { opacity: 0; width: 0; height: 0; }
        .ui-slider { position: absolute; inset: 0; background: #111; border: 1px solid #333; cursor: pointer; transition: 0.4s; }
        .ui-slider:before { content:""; position: absolute; height: 14px; width: 14px; left: 3px; bottom: 3px; background: #333; transition: 0.4s; }
        input:checked + .ui-slider { border-color: var(--v-cyn); box-shadow: 0 0 10px var(--v-cyn); }
        input:checked + .ui-slider:before { transform: translateX(22px); background: var(--v-cyn); }

        /* その他UI */
        .m-ui-grid { display: grid; grid-template-cols: 1fr 1.2fr; gap: 60px; }
        .id-tag { color: var(--v-mag); border: 1px solid var(--v-mag); padding: 1px 4px; font-size: 8px; margin-right: 10px; }
        input, textarea { background: rgba(255,255,255,0.02); border: none; border-bottom: 1px solid #222; padding: 12px 5px; color: #fff; outline: none; transition: 0.3s; }
        input:focus, textarea:focus { border-color: var(--v-cyn); background: rgba(255,255,255,0.05); }

        .final-execute-btn {
          width: 100%; margin-top: 60px; padding: 25px; background: none; border: 1px solid #222;
          color: #fff; font-weight: 800; font-size: 12px; letter-spacing: 0.5em; transition: 0.5s;
        }
        .final-execute-btn:hover { background: var(--v-mag); border-color: var(--v-mag); box-shadow: 0 0 40px rgba(255,0,255,0.3); }

        .c-header { position: fixed; top: 0; width: 100%; height: 80px; background: rgba(0,0,0,0.9); backdrop-filter: blur(20px); z-index: 1000; border-bottom: 1px solid #111; }
        .c-header-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 100%; padding: 0 40px; }
        .c-record-btn { background: #fff; color: #000; font-weight: 800; font-size: 10px; padding: 10px 25px; border-radius: 2px; }
      `}</style>
    </div>
  );
}
