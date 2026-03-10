import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createWorker } from 'tesseract.js';
import { supabase } from '../lib/supabaseClient';

export default function DeepResonanceConsole() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // --- フォーム状態 ---
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    event: '',
    venue: '',
    category: 'STAGE',
    fervor: 3,
    note: '',
    is_first_spark: false
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

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('fan_logs')
      .select('*, log_encounters(*, cosplayer_master(name))')
      .order('event_date', { ascending: false });
    setLogs(data || []);
  };

  const fetchNames = async (input, encId) => {
    if (input.length < 1) return setSuggestions(p => ({ ...p, [encId]: [] }));
    const { data } = await supabase.from('cosplayer_master').select('name, fan_logs(event_date)').ilike('name', `%${input}%`).limit(4);
    setSuggestions(p => ({ ...p, [encId]: data || [] }));
  };

  const handleOcr = async (file) => {
    if (!file) return;
    setIsScanning(true);
    const worker = await createWorker('jpn+eng');
    const { data: { text } } = await worker.recognize(file);
    setFormData(prev => ({ ...prev, note: prev.note + "\n" + text }));
    await worker.terminate();
    setIsScanning(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const { data: logData } = await supabase.from('fan_logs').insert([{
        event_date: formData.date, event_name: formData.event, venue: formData.venue,
        event_category: formData.category, fervor_score: formData.fervor,
        is_first_spark: formData.is_first_spark, memory_note: formData.note, word_count: formData.note.length
      }]).select().single();

      for (const enc of encounters) {
        if (!enc.name) continue;
        let { data: master } = await supabase.from('cosplayer_master').select('id').eq('name', enc.name).single();
        if (!master) {
          const { data: nm } = await supabase.from('cosplayer_master').insert([{ name: enc.name, genesis_catalyst: 'SERENDIPITY', genesis_type: 'REAL' }]).select().single();
          master = nm;
        }
        await supabase.from('log_encounters').insert([{ log_id: logData.id, cosplayer_id: master.id, is_primary: enc.is_primary }]);
      }
      setShowModal(false); fetchLogs();
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="c-loader">INITIALIZING_CONSOLE...</div>;

  return (
    <div className="c-root">
      <Head><title>DR // CONSOLE</title></Head>

      <header className="c-header">
        <div className="c-header-inner">
          <Link href="/"><span className="c-back">PORTAL_SYS</span></Link>
          <div className="c-logo">DEEP_RESONANCE // <span>ARCHIVE</span></div>
          <button className="c-record-btn" onClick={() => setShowModal(true)}>+ NEW_LOG</button>
        </div>
      </header>

      <main className="c-main">
        <div className="c-grid-bg" />
        <div className="c-content">
          {logs.map(log => (
            <div key={log.id} className="c-log-card">
              <div className="c-log-side">
                <span className="c-log-date">{log.event_date.replace(/-/g, '.')}</span>
              </div>
              <div className="c-log-body">
                <div className="c-log-cat">{log.event_category}</div>
                <h2 className="c-log-title">{log.event_name}</h2>
                <div className="c-log-names">
                  {log.log_encounters?.map((e, i) => (
                    <span key={i} className={e.is_primary ? 'is-p' : ''}>@{e.cosplayer_master.name}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {showModal && (
          <motion.div className="m-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="m-glass-card" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}>
              
              <div className="m-ui-header">
                <div className="m-ui-title">CONSOLE.LOG_RESONANCE(<span>{formData.event || 'NEW_ENTRY'}</span>)</div>
                <button className="m-ui-close" onClick={() => setShowModal(false)}>&times;</button>
              </div>

              <form onSubmit={handleSave} className="m-ui-form">
                <div className="m-ui-grid">
                  
                  {/* LEFT: CORE CONNECT */}
                  <div className="m-ui-col">
                    <div className="m-ui-field">
                      <label><span className="id-tag">ID_01</span> MISSION_DATE</label>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="m-ui-field">
                      <label><span className="id-tag">ID_02</span> EVENT_NAME</label>
                      <input type="text" placeholder="TYPE_NAME..." value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})} />
                    </div>
                    <div className="m-ui-field">
                      <label><span className="id-tag">ID_03</span> CATEGORY</label>
                      <div className="custom-select">
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                          <option value="STAGE">STAGE_EVENT</option>
                          <option value="MKT">MARKET_DOUJIN</option>
                          <option value="SHT">PHOTO_SESSION</option>
                          <option value="CFE">CAFE_GUEST</option>
                          <option value="MEM">MEMORIAL</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="m-ui-field">
                      <label><span className="id-tag">ID_04</span> COSP_NODES</label>
                      <div className="node-container">
                        {encounters.map((enc, idx) => (
                          <div key={enc.id} className="node-row">
                            <div className="node-line" />
                            <input 
                              placeholder="@RECOGNITION..." 
                              value={enc.name} 
                              onChange={(e) => {
                                setEncounters(encounters.map(item => item.id === enc.id ? {...item, name: e.target.value} : item));
                                fetchNames(e.target.value, enc.id);
                              }}
                            />
                            {suggestions[enc.id]?.length > 0 && (
                              <div className="node-suggest">
                                {suggestions[enc.id].map((s, i) => (
                                  <div key={i} onClick={() => {
                                    setEncounters(encounters.map(item => item.id === enc.id ? {...item, name: s.name} : item));
                                    setSuggestions(p => ({...p, [enc.id]: []}));
                                  }}>{s.name}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        <button type="button" className="node-add" onClick={() => setEncounters([...encounters, {id: Date.now(), name:'', is_primary:false}])}>+ CONNECT_NEW_NODE</button>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: RESONANCE SENSOR */}
                  <div className="m-ui-col">
                    <div className="m-ui-field">
                      <label><span className="id-tag">ID_05</span> FERVOR_GAUGE</label>
                      <div className="fervor-gauge">
                        {[1,2,3,4,5].map(v => (
                          <div key={v} className={`gauge-bar ${formData.fervor >= v ? 'active' : ''}`} onClick={() => setFormData({...formData, fervor: v})} />
                        ))}
                        <span className="gauge-val">LEVEL: 0{formData.fervor}</span>
                      </div>
                    </div>

                    <div className="m-ui-field scan-box">
                      <label><span className="id-tag">ID_06</span> THOUGHT_ARCHIVE</label>
                      <div className="relative">
                        {isScanning && <motion.div className="scan-laser" animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 1.5, repeat: Infinity }} />}
                        <textarea rows="6" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="ENTERING_THOUGHTS..." />
                      </div>
                    </div>

                    <div className="m-ui-field">
                      <label><span className="id-tag">ID_07</span> MEDIA_OCR_LINK</label>
                      <div className="ocr-hub">
                        <input type="file" id="ocr" hidden onChange={e => handleOcr(e.target.files[0])} />
                        <label htmlFor="ocr">
                          <i className="fas fa-microchip"></i>
                          <span>{isScanning ? 'SCANNING_IN_PROGRESS...' : 'UPLOAD_IMAGE_FOR_ANALYSIS'}</span>
                        </label>
                      </div>
                    </div>

                    <div className="m-ui-field flex-row">
                      <label>FIRST_SPARK_DETECTED</label>
                      <label className="ui-switch">
                        <input type="checkbox" checked={formData.is_first_spark} onChange={e => setFormData({...formData, is_first_spark: e.target.checked})} />
                        <span className="ui-slider"></span>
                      </label>
                    </div>
                  </div>

                </div>

                <button type="submit" className="ui-execute-btn">SYNC_RESONANCE_DATA</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #030304; }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; overflow-x: hidden; }

        /* Grid Background Decoration */
        .c-grid-bg { position: fixed; inset: 0; background-image: radial-gradient(#111 1px, transparent 1px); background-size: 30px 30px; opacity: 0.5; z-index: -1; }

        /* Header UI */
        .c-header { position: fixed; top: 0; width: 100%; height: 70px; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); z-index: 1000; border-bottom: 1px solid #111; }
        .c-header-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 100%; padding: 0 40px; }
        .c-logo { font-weight: 800; font-size: 12px; letter-spacing: 0.4em; }
        .c-logo span { color: var(--v-mag); text-shadow: 0 0 10px var(--v-mag); }
        .c-record-btn { background: #fff; color: #000; font-weight: 800; font-size: 10px; padding: 10px 25px; border-radius: 2px; }

        /* Timeline Items */
        .c-main { padding-top: 120px; max-width: 1000px; margin: 0 auto; }
        .c-log-card { display: flex; gap: 40px; margin-bottom: 50px; }
        .c-log-side { width: 100px; text-align: right; font-weight: 800; color: #333; font-size: 12px; }
        .c-log-body { flex: 1; background: rgba(255,255,255,0.02); padding: 30px; border: 1px solid rgba(255,255,255,0.05); }

        /* --- MODAL DESIGN: THE CONSOLE --- */
        .m-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(30px); z-index: 5000; display: flex; align-items: center; justify-content: center; }
        .m-glass-card { background: rgba(15, 15, 18, 0.7); width: 1000px; padding: 40px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 0 100px rgba(0,0,0,0.5); position: relative; }
        
        .m-ui-header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 1px solid #222; padding-bottom: 20px; }
        .m-ui-title { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: #555; letter-spacing: 0.1em; }
        .m-ui-title span { color: var(--v-cyn); }
        .m-ui-close { font-size: 24px; color: #333; }

        .m-ui-grid { display: grid; grid-template-cols: 1fr 1.2fr; gap: 60px; }
        .m-ui-field { margin-bottom: 30px; display: flex; flex-direction: column; gap: 12px; }
        .m-ui-field label { font-size: 10px; font-weight: 800; color: #444; letter-spacing: 0.1em; display: flex; align-items: center; gap: 10px; }
        .id-tag { background: #1a1a1c; color: #666; padding: 2px 6px; font-size: 8px; border-radius: 2px; }

        /* Custom Inputs */
        input, select, textarea { 
          background: rgba(255,255,255,0.03); border: none; border-bottom: 1px solid #222; 
          padding: 12px 0; color: #fff; font-size: 14px; outline: none; transition: 0.3s;
        }
        input:focus, textarea:focus { border-color: var(--v-cyn); background: rgba(255,255,255,0.05); }

        /* Fervor Gauge Design */
        .fervor-gauge { display: flex; align-items: center; gap: 8px; }
        .gauge-bar { width: 40px; height: 12px; background: #111; clip-path: polygon(15% 0, 100% 0, 85% 100%, 0% 100%); cursor: pointer; transition: 0.3s; }
        .gauge-bar.active { background: var(--v-mag); box-shadow: 0 0 15px var(--v-mag); }
        .gauge-val { margin-left: 20px; font-size: 10px; font-weight: 800; color: var(--v-mag); }

        /* Node Structure for Encounters */
        .node-container { padding-left: 15px; border-left: 1px dashed #222; }
        .node-row { position: relative; margin-bottom: 15px; }
        .node-line { position: absolute; left: -15px; top: 20px; width: 15px; height: 1px; border-bottom: 1px dashed #222; }
        .node-add { font-size: 9px; font-weight: 800; color: #333; margin-top: 10px; transition: 0.3s; }
        .node-add:hover { color: var(--v-cyn); }
        .node-suggest { position: absolute; background: #111; z-index: 10; width: 100%; border: 1px solid #222; top: 45px; }
        .node-suggest div { padding: 10px; font-size: 11px; cursor: pointer; border-bottom: 1px solid #1a1a1c; }

        /* OCR Hub Design */
        .ocr-hub { border: 1px dashed #222; padding: 30px; text-align: center; transition: 0.3s; cursor: pointer; }
        .ocr-hub:hover { border-color: var(--v-cyn); background: rgba(0,242,255,0.02); }
        .ocr-hub i { font-size: 24px; color: #222; display: block; margin-bottom: 10px; }
        .ocr-hub span { font-size: 9px; font-weight: 800; color: #444; letter-spacing: 0.1em; }

        /* Neon Switch */
        .flex-row { flex-direction: row; justify-content: space-between; align-items: center; }
        .ui-switch { position: relative; width: 40px; height: 20px; }
        .ui-switch input { opacity: 0; width: 0; height: 0; }
        .ui-slider { position: absolute; inset: 0; background: #111; border: 1px solid #222; cursor: pointer; transition: 0.4s; }
        .ui-slider:before { content:""; position: absolute; height: 12px; width: 12px; left: 3px; bottom: 3px; background: #333; transition: 0.4s; }
        input:checked + .ui-slider { border-color: var(--v-cyn); box-shadow: 0 0 10px var(--v-cyn); }
        input:checked + .ui-slider:before { transform: translateX(20px); background: var(--v-cyn); }

        /* Scan Animation */
        .scan-laser { position: absolute; left: 0; width: 100%; height: 2px; background: var(--v-mag); box-shadow: 0 0 15px var(--v-mag); z-index: 5; }

        /* Execute Button */
        .ui-execute-btn { 
          width: 100%; margin-top: 50px; padding: 25px; background: none; border: 1px solid #333; 
          color: #fff; font-weight: 800; font-size: 12px; letter-spacing: 0.4em; transition: 0.5s;
        }
        .ui-execute-btn:hover { border-color: var(--v-mag); background: var(--v-mag); box-shadow: 0 0 50px rgba(255,0,255,0.3); }

        .c-loader { height: 100vh; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; color: var(--v-cyn); letter-spacing: 0.5em; }
      `}</style>
    </div>
  );
}
