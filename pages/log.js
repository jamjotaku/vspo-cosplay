import React, { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createWorker } from 'tesseract.js';
import { supabase } from '../lib/supabaseClient';

export default function GrandResonanceMapSync() {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [systemLogs, setSystemLogs] = useState([]); 

  // --- NEW: LOCATION SCAN STATE ---
  const [locationStatus, setLocationStatus] = useState('IDLE'); // IDLE, SCANNING, OK, FAIL

  const workerRef = useRef(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    event: '', 
    location: '', 
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
    addSystemLog("RESONANCE_KERNEL_LOADED", "INFO");
  }, []);

  useEffect(() => { if (user) fetchLogs(); }, [user]);

  const addSystemLog = (msg, type = "NORMAL") => {
    const newLog = { id: Date.now(), msg, type, time: new Date().toLocaleTimeString() };
    setSystemLogs(prev => [newLog, ...prev].slice(0, 5));
  };

  const fetchLogs = async () => {
    addSystemLog("SYNCHRONIZING_ARCHIVES...", "INFO");
    const { data } = await supabase
      .from('fan_logs')
      .select('*, log_encounters(*, cosplayer_master(name))')
      .order('event_date', { ascending: false });
    setLogs(data || []);
    addSystemLog("SYNC_COMPLETE", "SUCCESS");
  };

  // --- NEW: LOCATION VERIFICATION LOGIC ---
  const checkLocation = async () => {
    if (!formData.location) return;
    setLocationStatus('SCANNING');
    addSystemLog(`SCANNING_LOCATION: ${formData.location}`, "WAIT");
    
    try {
      // 命中精度を上げるため「日本」を付与してOSM(Nominatim)に問い合わせ
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent("日本 " + formData.location)}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        setLocationStatus('OK');
        addSystemLog("LOCATION_VERIFIED_SUCCESS", "SUCCESS");
      } else {
        setLocationStatus('FAIL');
        addSystemLog("LOCATION_NOT_FOUND_IN_ATLAS", "ERROR");
      }
    } catch (err) {
      setLocationStatus('FAIL');
      addSystemLog("GEO_SERVER_TIMEOUT", "ERROR");
    }
  };

  const fetchNames = async (input, encId) => {
    if (input.length < 1) return;
    const { data } = await supabase
      .from('cosplayer_master')
      .select(`id, name, fan_logs(event_date)`)
      .ilike('name', `%${input}%`)
      .limit(4);

    const processed = data?.map(d => ({
      ...d,
      last_date: d.fan_logs?.sort((a,b) => b.event_date.localeCompare(a.event_date))[0]?.event_date
    }));
    setSuggestions(p => ({ ...p, [encId]: processed || [] }));
  };

  const prepareOcr = async () => {
    if (!workerRef.current) {
      addSystemLog("PRE-WARMING_OCR_ENGINE...", "WAIT");
      const worker = await createWorker('jpn+eng');
      workerRef.current = worker;
      addSystemLog("OCR_ENGINE_READY", "SUCCESS");
    }
  };

  const handleOcr = async (file) => {
    if (!file) return;
    setIsScanning(true);
    addSystemLog("SCANNING_OPTICAL_DATA...", "WAIT");
    try {
      if (!workerRef.current) await prepareOcr();
      const { data: { text } } = await workerRef.current.recognize(file);
      setFormData(prev => ({ ...prev, note: prev.note + "\n" + text }));
      addSystemLog("SCAN_SUCCESSFUL", "SUCCESS");
    } catch (err) {
      addSystemLog("SCAN_FAILED", "ERROR");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    addSystemLog("INITIATING_UPLINK...", "WAIT");
    const payload = {
      event_date: formData.date, 
      event_name: formData.event, 
      location: formData.location, 
      event_category: formData.category, 
      fervor_score: formData.fervor,
      is_first_spark: formData.is_first_spark, 
      memory_note: formData.note, 
      word_count: formData.note.length
    };

    try {
      let logId = editingId;
      if (editingId) {
        await supabase.from('fan_logs').update(payload).eq('id', editingId);
        await supabase.from('log_encounters').delete().eq('log_id', editingId);
      } else {
        const { data } = await supabase.from('fan_logs').insert([payload]).select().single();
        logId = data.id;
      }

      for (const enc of encounters) {
        if (!enc.name) continue;
        let { data: master } = await supabase.from('cosplayer_master').select('id').eq('name', enc.name).single();
        if (!master) {
          const { data: nm } = await supabase.from('cosplayer_master').insert([{ name: enc.name, genesis_catalyst: 'SERENDIPITY', genesis_type: 'REAL' }]).select().single();
          master = nm;
        }
        await supabase.from('log_encounters').insert([{ log_id: logId, cosplayer_id: master.id, is_primary: enc.is_primary }]);
      }

      addSystemLog("RESONANCE_SYNC_COMPLETE", "SUCCESS");
      closeModal(); fetchLogs();
    } catch (err) {
      addSystemLog(`CRITICAL_ERROR: ${err.message}`, "ERROR");
    }
  };

  const openEdit = (log) => {
    setEditingId(log.id);
    setFormData({
      date: log.event_date, 
      event: log.event_name, 
      location: log.location || '', 
      category: log.event_category, 
      fervor: log.fervor_score,
      note: log.memory_note, 
      is_first_spark: log.is_first_spark
    });
    setEncounters(log.log_encounters?.map(e => ({ id: e.id, name: e.cosplayer_master.name, is_primary: e.is_primary })) || []);
    setShowModal(true);
    prepareOcr();
  };

  const closeModal = () => {
    setShowModal(false); setEditingId(null); setLocationStatus('IDLE');
    setFormData({ date: new Date().toISOString().split('T')[0], event: '', location: '', category: 'STAGE', fervor: 3, note: '', is_first_spark: false });
    setEncounters([{ id: Date.now(), name: '', is_primary: true }]);
  };

  const handleDelete = async (id) => {
    if (!confirm("アーカイブログを抹消しますか？")) return;
    await supabase.from('fan_logs').delete().eq('id', id);
    addSystemLog("DATA_PURGED", "SUCCESS");
    fetchLogs();
  };

  if (loading) return <div className="full-loader">RESONANCE_SYSTEM_INIT_...</div>;

  return (
    <div className="res-root">
      <Head>
        <title>DEEP_RESONANCE // COMMAND_CENTER</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;800&family=Montserrat:wght@100;400;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      <header className="res-header">
        <div className="header-inner">
          <Link href="/"><span className="nav-back">←_UPLINK_HOME</span></Link>
          <div className="header-brand">RESONANCE_ARCHIVE <span>[CORE_v4.5]</span></div>
          <button className="add-trigger" onClick={() => { prepareOcr(); setShowModal(true); }}>+ RECORD_MISSION</button>
        </div>
      </header>

      <main className="res-container">
        <div className="res-timeline">
          {logs.map(log => (
            <motion.div key={log.id} className={`res-card ${log.is_first_spark ? 'spark-mode' : ''}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="card-top-accent" />
              <div className="card-header">
                <span className="card-id">LOG_ID: {log.id.substring(0,8)}</span>
                <span className={`card-cat-tag ${log.event_category}`}>{log.event_category}</span>
              </div>
              <div className="card-body">
                <div className="card-date-wrap">
                  <span className="c-year">{log.event_date.split('-')[0]}</span>
                  <span className="c-day">{log.event_date.split('-')[1]}.{log.event_date.split('-')[2]}</span>
                </div>
                <div className="card-content">
                  <h2 className="card-title">{log.event_name}</h2>
                  <div className="card-loc-tag">
                    <i className="fas fa-map-marker-alt" /> {log.location || 'UNKNOWN_STATION'}
                  </div>
                  <div className="card-enc-list">
                    {log.log_encounters?.map((e, idx) => (
                      <span key={idx} className={e.is_primary ? 'is-pri' : ''}>@{e.cosplayer_master?.name}</span>
                    ))}
                  </div>
                  <p className="card-note-excerpt">{log.memory_note}</p>
                </div>
              </div>
              <div className="card-actions">
                <button onClick={() => openEdit(log)} className="edit-btn"><i className="fas fa-sliders" /> EDIT</button>
                <button onClick={() => handleDelete(log.id)} className="del-btn"><i className="fas fa-trash-alt" /> PURGE</button>
              </div>
              <div className="card-fervor-gauge">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`gauge-dot ${i < log.fervor_score ? 'active' : ''}`} />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {showModal && (
          <div className="m-overlay">
            <motion.div className="m-glass-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              
              <div className="m-header">
                <div className="m-status-row">
                  <span className="s-led pulse" /> STATUS: <span className="s-val">UPLINK_READY</span>
                </div>
                <div className="m-title-large">COMMAND_CENTER // {editingId ? 'EDIT_CHRONICLE' : 'NEW_MISSION_SCAN'}</div>
                <button className="m-close" onClick={closeModal}>&times;</button>
              </div>

              <form onSubmit={handleSave} className="m-form">
                <div className="m-grid">
                  <div className="m-col">
                    <div className="f-row">
                      <label><i className="fas fa-calendar-alt" /> MISSION_DATE</label>
                      <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="f-row">
                      <label><i className="fas fa-bullseye" /> MISSION_OBJECTIVE (EVENT)</label>
                      <input type="text" placeholder="TYPE_MISSION_NAME..." value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})} required />
                    </div>
                    
                    {/* --- UPDATED: MISSION_LOCATION WITH SCAN TEST --- */}
                    <div className="f-row">
                      <label><i className="fas fa-map-marker-alt" /> MISSION_LOCATION (FOR_GPS_SYNC)</label>
                      <div className="scan-input-group">
                        <input 
                          type="text" 
                          placeholder="ENTER_STATION_NAME (e.g. Akihabara, Makuhari...)" 
                          value={formData.location} 
                          onChange={e => {
                            setFormData({...formData, location: e.target.value});
                            setLocationStatus('IDLE');
                          }} 
                        />
                        <button 
                          type="button" 
                          className={`scan-check-btn ${locationStatus}`}
                          onClick={checkLocation}
                        >
                          {locationStatus === 'SCANNING' ? 'SCANNING...' : 
                           locationStatus === 'OK' ? '✓_DETECTED' : 
                           locationStatus === 'FAIL' ? '❌_FAILED' : 'SCAN_TEST'}
                        </button>
                      </div>
                      {locationStatus === 'FAIL' && (
                        <span className="scan-err">※地名が見つかりません。都市名を加えてください。</span>
                      )}
                    </div>

                    <div className="f-row">
                      <label><i className="fas fa-layer-group" /> SECTOR (CATEGORY)</label>
                      <div className="custom-select-v3">
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                          <option value="STAGE">STAGE_EVENT (BIG)</option>
                          <option value="MKT">MARKET_DOUJIN (VGGC)</option>
                          <option value="SHT">PHOTO_SESSION</option>
                          <option value="CFE">CAFE_GUEST</option>
                          <option value="MEM">MEMORIAL_DAY</option>
                          <option value="DIGITAL">DIGITAL_RESONANCE</option>
                        </select>
                      </div>
                    </div>
                    <div className="f-row">
                      <label><i className="fas fa-satellite-dish" /> IDENTITY_RECOGNITION (NODES)</label>
                      <div className="node-stack">
                        {encounters.map(enc => (
                          <div key={enc.id} className="node-input-wrap">
                            <input placeholder="@RECOGNITION_ID..." value={enc.name} onChange={(e) => {
                              setEncounters(encounters.map(item => item.id === enc.id ? {...item, name: e.target.value} : item));
                              fetchNames(e.target.value, enc.id);
                            }} />
                            <button type="button" className={enc.is_primary ? 'is-p' : ''} onClick={() => setEncounters(encounters.map(i => ({...i, is_primary: i.id === enc.id})))}>
                              {enc.is_primary ? 'PRI' : 'SEC'}
                            </button>
                            {suggestions[enc.id]?.length > 0 && (
                              <div className="node-suggest">
                                {suggestions[enc.id].map((s, i) => (
                                  <div key={i} className="s-item" onClick={() => {
                                    setEncounters(encounters.map(item => item.id === enc.id ? {...item, name: s.name} : item));
                                    setSuggestions(p => ({...p, [enc.id]: []}));
                                  }}>
                                    {s.name} <span className="s-date">{s.last_date || 'NEW'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        <button type="button" className="add-node-btn" onClick={() => setEncounters([...encounters, {id: Date.now(), name: '', is_primary: false}])}>[ + ATTACH_NODE ]</button>
                      </div>
                    </div>
                  </div>

                  <div className="m-col">
                    <div className="f-row">
                      <label><i className="fas fa-bolt" /> FERVOR_GAUGE</label>
                      <div className="fervor-gauge-v3">
                        {[1,2,3,4,5].map(v => (
                          <div key={v} className={`gauge-bar-v3 ${formData.fervor >= v ? 'active' : ''}`} onClick={() => setFormData({...formData, fervor: v})} />
                        ))}
                      </div>
                    </div>
                    <div className="f-row relative">
                      <label><i className="fas fa-keyboard" /> MEMORY_LOG (CHARS: {formData.note.length})</label>
                      {isScanning && <div className="scan-laser" />}
                      <textarea rows="8" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="ENTER_THOUGHTS_AND_ENCOUNTERS..." />
                    </div>
                    <div className="f-row">
                      <label><i className="fas fa-microchip" /> ANALOG_MEDIA_SCAN (OCR)</label>
                      <div className="ocr-hub-v3">
                        <input type="file" id="ocr-v3" hidden onChange={e => handleOcr(e.target.files[0])} />
                        <label htmlFor="ocr-v3" className={isScanning ? 'is-scanning' : ''}>
                          {isScanning ? 'ANALYZING_DATA...' : 'UPLOAD_IMAGE_FOR_OPTICAL_ANALYSIS'}
                        </label>
                      </div>
                    </div>
                    <div className="f-row-flex">
                      <label>FIRST_SPARK_DETECTED</label>
                      <div className={`sys-toggle ${formData.is_first_spark ? 'on' : ''}`} onClick={() => setFormData({...formData, is_first_spark: !formData.is_first_spark})}>
                        <div className="knob" />
                      </div>
                    </div>
                  </div>
                </div>
                <button type="submit" className="execute-final-btn">EXECUTE_RESONANCE_SYNC_PROTOCOL</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="sys-terminal">
        {systemLogs.map(log => (
          <div key={log.id} className={`terminal-line ${log.type}`}>
            <span className="t-time">[{log.time}]</span> {log.msg}
          </div>
        ))}
      </div>

      <style jsx global>{`
        :root { --v-mag: #ff00ff; --v-cyn: #00f2ff; --v-bg: #030305; --panel: rgba(12,12,14,0.95); }
        body { background: var(--v-bg); color: #eee; font-family: 'Montserrat', sans-serif; margin: 0; overflow-x: hidden; }

        .header-brand, .m-title-large, .id-tag, .card-id, .nav-back, .t-time, .gauge-bar-v3, .card-loc-tag, button, label { font-family: 'JetBrains Mono', monospace; font-weight: 800; }

        .res-header { position: fixed; top: 0; width: 100%; height: 75px; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); z-index: 1000; border-bottom: 1px solid #111; }
        .header-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; height: 100%; padding: 0 40px; }
        .header-brand { font-size: 14px; letter-spacing: 0.3em; }
        .header-brand span { color: var(--v-mag); text-shadow: 0 0 10px var(--v-mag); }
        .nav-back { font-size: 10px; color: #444; letter-spacing: 0.1em; }
        .add-trigger { background: #fff; color: #000; padding: 10px 25px; border-radius: 2px; font-size: 10px; cursor: pointer; border: none; }

        .res-container { max-width: 900px; margin: 0 auto; padding: 130px 20px; }
        .res-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 50px; padding: 35px; position: relative; overflow: hidden; }
        .card-top-accent { position: absolute; top: 0; left: 0; width: 60px; height: 2px; background: var(--v-mag); box-shadow: 0 0 15px var(--v-mag); }
        .spark-mode { border-left: 2px solid var(--v-cyn); }
        
        .card-header { display: flex; justify-content: space-between; margin-bottom: 25px; }
        .card-id { font-size: 8px; color: #222; }
        .card-cat-tag { font-size: 9px; color: var(--v-cyn); letter-spacing: 0.2em; }

        .card-body { display: flex; gap: 40px; }
        .card-date-wrap { width: 70px; flex-shrink: 0; }
        .c-year { display: block; font-size: 10px; color: #333; }
        .c-day { font-size: 22px; font-weight: 200; color: #fff; }

        .card-title { font-size: 24px; font-weight: 400; margin: 0 0 5px; }
        .card-loc-tag { font-size: 10px; color: #555; margin-bottom: 15px; letter-spacing: 0.1em; }
        .card-loc-tag i { color: var(--v-mag); margin-right: 5px; }
        
        .card-enc-list { display: flex; gap: 15px; font-size: 12px; margin-bottom: 20px; font-family: 'JetBrains Mono'; }
        .card-enc-list .is-pri { color: var(--v-cyn); text-shadow: 0 0 5px var(--v-cyn); }
        .card-note-excerpt { color: #888; line-height: 1.8; font-size: 14px; white-space: pre-wrap; }

        .card-actions { position: absolute; top: 30px; right: 30px; display: flex; gap: 15px; opacity: 0; transition: 0.3s; }
        .res-card:hover .card-actions { opacity: 1; }
        .card-actions button { font-size: 9px; color: #555; border: 1px solid #222; padding: 5px 12px; background: none; cursor: pointer; }

        .card-fervor-gauge { display: flex; gap: 5px; margin-top: 30px; }
        .gauge-dot { width: 5px; height: 5px; background: #111; border-radius: 50%; }
        .gauge-dot.active { background: var(--v-mag); box-shadow: 0 0 8px var(--v-mag); }

        .m-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(30px); z-index: 5000; display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; padding: 40px; }
        .m-glass-card { background: var(--panel); width: 1100px; padding: 60px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 0 100px #000; position: relative; }
        
        .m-header { margin-bottom: 50px; border-bottom: 1px solid #222; padding-bottom: 25px; }
        .m-status-row { font-size: 9px; color: #444; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .s-led { width: 7px; height: 7px; background: var(--v-cyn); border-radius: 50%; box-shadow: 0 0 10px var(--v-cyn); }
        .m-title-large { font-size: 12px; letter-spacing: 0.4em; color: #eee; }
        .m-close { position: absolute; top: 40px; right: 50px; font-size: 32px; color: #333; cursor: pointer; background: none; border: none; }

        .m-grid { display: grid; grid-template-cols: 1fr 1.2fr; gap: 60px; }
        .f-row { margin-bottom: 35px; }
        .f-row label { display: block; font-size: 9px; color: #444; margin-bottom: 12px; letter-spacing: 0.1em; }

        input, textarea, .custom-select-v3 select {
          width: 100%; background: rgba(255,255,255,0.02); border: none; border-bottom: 1px solid #1a1a1c;
          padding: 15px 5px; color: #fff; font-size: 14px; outline: none; transition: 0.4s; border-radius: 0;
        }
        input:focus, textarea:focus { border-color: var(--v-cyn); background: rgba(255,255,255,0.05); }

        /* --- NEW: SCAN INPUT GROUP STYLING --- */
        .scan-input-group { display: flex; gap: 10px; }
        .scan-check-btn { 
          padding: 0 15px; background: #111; border: 1px solid #222; color: #444; 
          font-size: 9px; cursor: pointer; white-space: nowrap; transition: 0.3s;
        }
        .scan-check-btn.SCANNING { color: var(--v-mag); border-color: var(--v-mag); }
        .scan-check-btn.OK { color: var(--v-cyn); border-color: var(--v-cyn); text-shadow: 0 0 5px var(--v-cyn); }
        .scan-check-btn.FAIL { color: var(--v-mag); border-color: var(--v-mag); }
        .scan-err { display: block; font-size: 8px; color: var(--v-mag); margin-top: 5px; font-family: 'JetBrains Mono'; }

        .fervor-gauge-v3 { display: flex; gap: 10px; }
        .gauge-bar-v3 { flex: 1; height: 8px; background: #111; cursor: pointer; transform: skewX(-20deg); transition: 0.3s; }
        .gauge-bar-v3.active { background: var(--v-mag); box-shadow: 0 0 20px var(--v-mag); }

        .node-stack { padding-left: 20px; border-left: 1px dashed #1a1a1c; }
        .node-input-wrap { position: relative; margin-bottom: 15px; display: flex; gap: 10px; }
        .node-input-wrap button { font-size: 8px; color: #333; border: 1px solid #222; padding: 0 10px; background: none; }
        .node-input-wrap button.is-p { color: var(--v-cyn); border-color: var(--v-cyn); }
        .node-suggest { position: absolute; top: 45px; left: 0; width: 100%; background: #000; border: 1px solid #1a1a1c; z-index: 100; }
        .s-item { padding: 12px; font-size: 11px; display: flex; justify-content: space-between; cursor: pointer; }
        .add-node-btn { font-size: 8px; color: #222; margin-top: 10px; background: none; border: none; cursor: pointer; }

        .scan-laser { position: absolute; left: 0; width: 100%; height: 2px; background: var(--v-mag); box-shadow: 0 0 20px var(--v-mag); animation: sl 1.5s infinite linear; pointer-events: none; }
        @keyframes sl { 0% { top: 0; } 100% { top: 100%; } }
        .ocr-hub-v3 { border: 1px dashed #222; padding: 25px; text-align: center; }
        .ocr-hub-v3 label { font-size: 9px; color: #444; cursor: pointer; }

        .f-row-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px; }
        .sys-toggle { width: 44px; height: 22px; background: #111; border: 1px solid #222; position: relative; cursor: pointer; }
        .knob { position: absolute; top: 4px; left: 4px; width: 12px; height: 12px; background: #333; transition: 0.4s; }
        .sys-toggle.on .knob { transform: translateX(22px); background: var(--v-cyn); }

        .execute-final-btn { width: 100%; margin-top: 50px; padding: 25px; background: none; border: 1px solid #222; color: #fff; font-size: 11px; letter-spacing: 0.6em; cursor: pointer; transition: 0.5s; }
        .execute-final-btn:hover { background: var(--v-mag); border-color: var(--v-mag); box-shadow: 0 0 50px rgba(255,0,255,0.4); }

        .sys-terminal { position: fixed; bottom: 30px; right: 30px; width: 300px; z-index: 6000; pointer-events: none; }
        .terminal-line { font-size: 9px; margin-bottom: 5px; opacity: 0.7; }
        .t-time { color: #333; margin-right: 8px; }
        .SUCCESS { color: var(--v-cyn); }
        .ERROR { color: #ff0055; }
        .WAIT { color: var(--v-mag); }

        .full-loader { height: 100vh; background: #000; color: var(--v-cyn); display: flex; align-items: center; justify-content: center; font-weight: 800; letter-spacing: 0.8em; font-size: 12px; }

        .pulse { animation: p-glow 2s infinite; }
        @keyframes p-glow { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
}
