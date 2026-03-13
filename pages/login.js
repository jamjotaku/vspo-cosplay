import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function LoginGateway() {
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [status, setStatus] = useState('IDLE'); // IDLE, BUSY, SUCCESS, FAIL
  const [isRegisterMode, setIsRegisterMode] = useState(false); // 新機能: 登録モード切替
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/');
    });
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setStatus('BUSY');
    
    const finalEmail = id.includes('@') ? id : `${id}@vspo-internal.local`;

    if (isRegisterMode) {
      // --- 新規登録プロトコル ---
      const { data, error } = await supabase.auth.signUp({
        email: finalEmail,
        password: pass,
        options: { data: { display_name: id } }
      });

      if (error) {
        alert(`REGISTRATION_FAILED: ${error.message}`);
        setStatus('FAIL');
        setTimeout(() => setStatus('IDLE'), 2000);
      } else {
        alert("NEW_COMMANDER_LINKED: 登録完了。そのままログインしてください。");
        setIsRegisterMode(false);
        setStatus('IDLE');
      }
    } else {
      // --- ログインプロトコル ---
      const { error } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: pass
      });

      if (error) {
        setStatus('FAIL');
        setTimeout(() => setStatus('IDLE'), 2000);
      } else {
        setStatus('SUCCESS');
        router.push('/');
      }
    }
  };

  return (
    <div className="gate-root">
      <Head>
        <title>VSPO! ARCHIVE // GATEWAY</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&family=Montserrat:wght@900&display=swap" rel="stylesheet" />
      </Head>

      <div className="scanner-bg" />
      
      <main className="gate-container">
        <div className="gate-header">
          <div className="security-tag" style={{ color: isRegisterMode ? '#00f2ff' : '#ff00ff' }}>
            {isRegisterMode ? 'NEW_COMMANDER_RECRUIT' : 'LEVEL_5_RESTRICTED'}
          </div>
          <h1 className="gate-title">VSPO! ARCHIVE</h1>
          <div className="gate-ver">CORE_v5.0_OSHI_JACK_PREP</div>
        </div>

        <form onSubmit={handleAuth} className="gate-form">
          <div className="field">
            <label>COMMANDER_ID</label>
            <input type="text" value={id} onChange={e => setId(e.target.value)} placeholder="ENTER_ID" required />
          </div>
          <div className="field">
            <label>ACCESS_PASS</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="PASSWORD" required />
          </div>
          <button type="submit" className={status}>
            {status === 'BUSY' ? 'UPLINKING...' : 
             status === 'SUCCESS' ? 'LINK_ESTABLISHED' : 
             status === 'FAIL' ? 'ACCESS_DENIED' : 
             isRegisterMode ? 'INITIALIZE_RECRUITMENT' : 'INITIATE_AUTH_SEQUENCE'}
          </button>
        </form>

        <footer className="gate-footer">
          {/* モード切替リンク */}
          <div className="mode-toggle" onClick={() => setIsRegisterMode(!isRegisterMode)}>
             {isRegisterMode ? "← RETURN_TO_LOGIN" : "CREATE_NEW_COMMANDER_ID?"}
          </div>
          <p>AUTHORIZED_PERSONNEL_ONLY // © 2026 VSPO_COMMAND</p>
        </footer>
      </main>

      <style jsx>{`
        .gate-root { height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; color: #fff; position: relative; overflow: hidden; }
        .scanner-bg { position: absolute; inset: 0; background: radial-gradient(circle at center, #0a0a0c 0%, #000 100%); }
        .scanner-bg::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #00f2ff; opacity: 0.1; box-shadow: 0 0 20px #00f2ff; animation: scan 4s linear infinite; }
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }

        .gate-container { width: 380px; padding: 60px; background: rgba(10,10,12,0.9); border: 1px solid #1a1a1c; backdrop-filter: blur(20px); z-index: 10; position: relative; border-radius: 2px; }
        .gate-header { text-align: center; margin-bottom: 40px; }
        .security-tag { font-size: 8px; letter-spacing: 0.5em; margin-bottom: 12px; transition: 0.3s; }
        .gate-title { font-family: 'Montserrat', sans-serif; font-size: 26px; margin: 0; letter-spacing: -0.02em; }
        .gate-ver { font-size: 8px; color: #333; margin-top: 6px; }

        .gate-form { display: flex; flex-direction: column; gap: 20px; }
        .field label { display: block; font-size: 9px; color: #444; margin-bottom: 8px; letter-spacing: 0.2em; }
        input { width: 100%; background: #08080a; border: 1px solid #1a1a1c; padding: 16px; color: #fff; font-size: 14px; outline: none; box-sizing: border-box; font-family: 'JetBrains Mono'; }
        input:focus { border-color: #00f2ff; box-shadow: 0 0 10px rgba(0,242,255,0.1); }

        button { padding: 18px; border: none; font-weight: 800; font-size: 11px; cursor: pointer; transition: 0.4s; letter-spacing: 0.2em; background: #fff; color: #000; font-family: 'JetBrains Mono'; }
        button:hover { background: #00f2ff; box-shadow: 0 0 30px rgba(0,242,255,0.4); }
        button.BUSY { background: #111; color: #444; cursor: wait; }
        button.FAIL { background: #ff0055; color: #fff; }
        button.SUCCESS { background: #00f2ff; color: #000; }

        .gate-footer { margin-top: 50px; text-align: center; font-size: 8px; color: #222; letter-spacing: 0.1em; }
        .mode-toggle { color: #555; cursor: pointer; margin-bottom: 20px; transition: 0.3s; font-size: 10px; }
        .mode-toggle:hover { color: #fff; text-shadow: 0 0 10px #fff; }
      `}</style>
    </div>
  );
}
