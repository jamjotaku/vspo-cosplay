import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createWorker } from 'tesseract.js';
import { supabase } from '../lib/supabaseClient';

export default function ResonanceHudV3() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // --- State Management ---
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

  const fetchLogs = async () => {
    const { data } = await supabase.from('fan_logs').select('*, log_encounters(*, cosplayer_master(name))').order('event_date', { ascending: false });
    setLogs(data || []);
  };

  const fetchNames = async (input, encId) => {
    if (input.length < 1) return setSuggestions(p => ({ ...p, [encId]: [] }));
    const { data } = await supabase.from('cosplayer_master').select(`id, name, fan_logs(event_date)`).ilike('name', `%${input}%`).limit(4);
    const processed = data?.map(d => ({ ...d, last_date: d.fan_logs?.sort((a,b)=>b.event_date.localeCompare(a.event_date))[0]?.event_date }));
    setSuggestions(p => ({ ...p, [encId]: processed || [] }));
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

  if (loading) return <div className="hud-loader">BOOTING_CORE_SYSTEM...</div>;

  return (
    <div className="hud-root">
      <Head><title>DR // HUD_V3</title></Head>

      <header className="hud-header">
        <div className="header-inner">
          <Link href="/"><span className="nav-item">PORTAL</span></Link>
          <div className="hud-brand">RESONANCE_SCANNER <span>[ALPHA_03]</span></div>
          <button className="record-trigger" onClick={() => setShowModal(true)}>+ INITIATE_LOG</button>
        </div>
      </header>

      <main className="hud-main">
        <div className="timeline-v3">
          {logs.map(log => (
            <div key={log.id} className="archive-item">
              <div className="item-meta">
                <div className="item-date">{log.event_date.replace(/-/g, '/')}</div>
                <div className="item-cat">{log.event_category}</div>
              </div>
              <div className="item-box">
                <h2 className="item-title">{log.event_name}</h2>
                <div className="item-nodes">
                  {log.log_encounters?.map((e, i) => (
                    <span key={i} className={e.is_primary ? 'primary-node' : ''}>@{e.cosplayer_master?.name}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {showModal && (
          <motion.div className="hud-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="hud-modal" initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              
              <div className="hud-modal-header">
                <div className="hud-status-bar">
                  <span className="status-label">UPLINK_STATUS:</span>
                  <span className="status-value">ENCRYPTED</span>
                  <div className="status-led pulse" />
                </div>
                <button className="hud-close" onClick={() => setShowModal(false)}>&times;</button>
              </div>

              <form onSubmit={handleSave} className="hud-form">
                <div className="hud-grid">
                  
                  {/* MODULE_01: MISSION_CORE */}
                  <section className="hud-module">
                    <div className="module-tag">MOD_01 // CORE_INFO</div>
                    <div className="hud-field">
                      <label>TARGET_DATE</label>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="hud-field">
                      <label>MISSION_OBJECTIVE (EVENT)</label>
                      <input type="text" placeholder="REQUIRED_FIELD" value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})} required />
                    </div>
                    <div className="hud-field">
                      <label>ENVIRONMENT (CATEGORY)</label>
                      <div className="hud-select-wrap">
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                          <option value="STAGE">STAGE_EVENT</option>
                          <option value="MKT">MARKET_DOUJIN</option>
                          <option value="SHT">PHOTO_SESSION</option>
                          <option value="CFE">CAFE_GUEST</option>
                          <option value="MEM">MEMORIAL</option>
                          <option value="DIGITAL">DIGITAL_SNS</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* MODULE_02: IDENTITY_SCAN */}
                  <section className="hud-module">
                    <div className="module-tag">MOD_02 // IDENTITY_RECOGNITION</div>
                    <div className="node-stack">
                      {encounters.map((enc) => (
                        <div key={enc.id} className="node-row">
                          <input 
                            placeholder="@IDENTIFIER..." 
                            value={enc.name} 
                            onChange={(e) => {
                              setEncounters(encounters.map(item => item.id === enc.id ? {...item, name: e.target.value} : item));
                              fetchNames(e.target.value, enc.id);
                            }}
                          />
                          <button type="button" 
                                  className={`node-toggle ${enc.is_primary ? 'is-active' : ''}`}
                                  onClick={() => setEncounters(encounters.map(item => ({...item, is_primary: item.id === enc.id})))}>
                            {enc.is_primary ? 'PRI' : 'SEC'}
                          </button>
                          {suggestions[enc.id]?.length > 0 && (
                            <div className="hud-suggest">
                              {suggestions[enc.id].map((s, i) => (
                                <div key={i} className="s-row" onClick={() => {
                                  setEncounters(encounters.map(item => item.id === enc.id ? {...item, name: s.name} : item));
                                  setSuggestions(p => ({...p, [enc.id]: []}));
                                }}>
                                  {s.name} <span className="s-meta">{s.last_date || 'NEW'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      <button type="button" className="add-node-btn" onClick={() => setEncounters([...encounters, {id: Date.now(), name:'', is_primary:false}])}>
                        [ + ATTACH_NEW_NODE ]
                      </button>
                    </div>
                  </section>

                  {/* MODULE_03: PASSION_METRICS */}
                  <section className="hud-module">
                    <div className="module-tag">MOD_03 // PASSION_GAUGE</div>
                    <div className="gauge-wrap">
                      <div className="gauge-bars">
                        {[1,2,3,4,5].map(v => (
                          <div key={v} className={`bar ${formData.fervor >= v ? 'active' : ''}`} onClick={() => setFormData({...formData, fervor: v})} />
                        ))}
                      </div>
                      <div className="gauge-label">INTENSITY_LEVEL: 0{formData.fervor}</div>
                    </div>
                    
                    <div className="spark-box">
                      <label>FIRST_SPARK_DETECTED</label>
                      <div className={`hud-toggle ${formData.is_first_spark ? 'on' : ''}`} onClick={() => setFormData({...formData, is_first_spark: !formData.is_first_spark})}>
                        <div className="knob" />
                      </div>
                    </div>
                  </section>

                  {/* MODULE_04: MEMORY_SCAN */}
                  <section className="hud-module">
                    <div className="module-tag">MOD_04 // THOUGHT_LOG</div>
                    <div className="memo-wrapper">
                      {isScanning && <div className="hud-scan-line" />}
                      <textarea rows="6" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="ENTERING_LOG_DATA..." />
                    </div>
                    <div className="ocr-action">
                      <input type="file" id="ocr-v3" hidden onChange={e => handleOcr(e.target.files[0])} />
                      <label htmlFor="ocr-v3" className="ocr-trigger-v3">
                        <i className="fas fa-expand" /> {isScanning ? 'ANALYZING...' : 'INITIATE_OPTICAL_SCAN'}
                      </label>
                    </div>
                  </section>

                </div>

                <button type="submit" className="hud-submit">EXECUTE_SYSTEM_SYNC</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #050507; --v-panel: rgba(15, 15, 20, 0.95); }
        body { background: var(--v-bg); color: #fff; font-family: 'Montserrat', sans-serif; letter-spacing: 0.05em; }

        /* 画面全体のオーバーレイと背景 */
        .hud-overlay {
          position: fixed; inset: 0; background: radial-gradient(circle at center, rgba(20,0,20,0.8) 0%, #000 100%);
          backdrop-filter: blur(20px); z-index: 9999; display: flex; align-items: flex-start; justify-content: center;
          padding: 40px; overflow-y: auto;
        }

        /* モーダルの重厚感 */
        .hud-modal {
          background: var(--v-panel); width: 1100px; padding: 40px; border: 1px solid rgba(255,255,255,0.08);
          position: relative; box-shadow: 0 0 100px rgba(0,0,0,0.8);
          background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 20px 20px; /* 方眼紙グリッド */
        }

        /* ヘッダー装飾 */
        .hud-modal-header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #222; padding-bottom: 15px; }
        .hud-status-bar { display: flex; align-items: center; gap: 15px; font-size: 10px; font-weight: 800; color: #555; }
        .status-value { color: var(--v-cyn); }
        .status-led { width: 8px; height: 8px; border-radius: 50%; background: var(--v-cyn); box-shadow: 0 0 10px var(--v-cyn); }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

        /* レイアウト：グリッドの密度 */
        .hud-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; }
        .hud-module { background: rgba(0,0,0,0.4); padding: 25px; border: 1px solid rgba(255,255,255,0.03); position: relative; }
        .module-tag { position: absolute; top: -10px; left: 15px; background: #000; color: #444; font-size: 8px; font-weight: 800; padding: 0 10px; border: 1px solid #222; }

        /* 入力フォームの高級感 */
        .hud-field { margin-bottom: 25px; }
        .hud-field label { display: block; font-size: 9px; font-weight: 800; color: #666; margin-bottom: 10px; letter-spacing: 0.2em; }
        input, textarea, .hud-select-wrap select {
          width: 100%; background: #0a0a0c; border: 1px solid #222; padding: 12px 15px;
          color: #fff; font-size: 13px; outline: none; transition: 0.3s;
        }
        input:focus, textarea:focus { border-color: var(--v-mag); box-shadow: 0 0 10px rgba(255,0,255,0.1); }

        /* セレクトボックスの白飛び完全解決 */
        .hud-select-wrap select { appearance: none; color: #fff; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ff00ff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 15px center; }
        .hud-select-wrap select option { background: #0a0a0c; color: #fff; }

        /* ゲージ：マゼンタの光 */
        .gauge-wrap { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
        .gauge-bars { display: flex; gap: 5px; }
        .bar { width: 35px; height: 12px; background: #111; cursor: pointer; transition: 0.3s; skew: -20deg; transform: skewX(-20deg); }
        .bar.active { background: var(--v-mag); box-shadow: 0 0 15px var(--v-mag); }
        .gauge-label { font-size: 10px; font-weight: 800; color: var(--v-mag); }

        /* トグル：ネオン */
        .spark-box { display: flex; justify-content: space-between; align-items: center; }
        .spark-box label { font-size: 9px; font-weight: 800; color: #666; }
        .hud-toggle { width: 44px; height: 20px; background: #111; border: 1px solid #222; position: relative; cursor: pointer; transition: 0.4s; }
        .hud-toggle.on { border-color: var(--v-cyn); box-shadow: 0 0 10px var(--v-cyn); }
        .knob { position: absolute; top: 3px; left: 3px; width: 12px; height: 12px; background: #333; transition: 0.4s; }
        .hud-toggle.on .knob { transform: translateX(24px); background: var(--v-cyn); }

        /* スキャン演出 */
        .memo-wrapper { position: relative; overflow: hidden; }
        .hud-scan-line { position: absolute; width: 100%; height: 2px; background: var(--v-mag); box-shadow: 0 0 15px var(--v-mag); animation: scanV3 2s infinite linear; z-index: 10; }
        @keyframes scanV3 { 0% { top: -10%; } 100% { top: 110%; } }

        /* 実行ボタン */
        .hud-submit {
          width: 100%; margin-top: 40px; padding: 25px; background: none; border: 1px solid var(--v-mag);
          color: var(--v-mag); font-weight: 800; font-size: 11px; letter-spacing: 0.6em; transition: 0.5s;
        }
        .hud-submit:hover { background: var(--v-mag); color: #fff; box-shadow: 0 0 50px rgba(255,0,255,0.4); }

        /* その他：Nodeリスト等 */
        .node-row { display: flex; gap: 10px; margin-bottom: 10px; position: relative; }
        .node-toggle { font-size: 8px; font-weight: 800; background: #111; border: 1px solid #222; padding: 0 10px; color: #444; }
        .node-toggle.is-active { color: var(--v-cyn); border-color: var(--v-cyn); }
        .add-node-btn { font-size: 8px; font-weight: 800; color: #444; margin-top: 10px; }
        .hud-suggest { position: absolute; top: 40px; width: 100%; background: #000; border: 1px solid #222; z-index: 50; }
        .s-row { padding: 10px; font-size: 11px; display: flex; justify-content: space-between; cursor: pointer; }
        .s-row:hover { background: #111; color: var(--v-cyn); }

        .hud-loader { height: 100vh; background: #000; color: var(--v-cyn); display: flex; align-items: center; justify-content: center; font-weight: 800; letter-spacing: 0.5em; }
      `}</style>
    </div>
  );
}
