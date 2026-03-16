import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function LoginGateway() {
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [status, setStatus] = useState('IDLE'); // IDLE, BUSY, SUCCESS, FAIL
  const [errorMsg, setErrorMsg] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/');
    });
  }, [router]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setStatus('BUSY');
    setErrorMsg('');
    
    // 監督こだわりのドメイン自動補完プロトコル
    const finalEmail = id.includes('@') ? id : `${id}@vspo-internal.local`;

    if (isRegisterMode) {
      // --- 新規登録プロトコル ---
      const { error } = await supabase.auth.signUp({
        email: finalEmail,
        password: pass,
        options: { data: { display_name: id } }
      });

      if (error) {
        setErrorMsg(`REG_ERROR: ${error.message.toUpperCase()}`);
        setStatus('FAIL');
        setTimeout(() => setStatus('IDLE'), 3000);
      } else {
        setStatus('SUCCESS');
        setTimeout(() => {
          setIsRegisterMode(false);
          setStatus('IDLE');
          setErrorMsg('ACCOUNT_CREATED. PLEASE_SIGN_IN.');
        }, 1500);
      }
    } else {
      // --- ログインプロトコル ---
      const { error } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: pass
      });

      if (error) {
        setErrorMsg(`AUTH_ERROR: ${error.message.toUpperCase()}`);
        setStatus('FAIL');
        setTimeout(() => setStatus('IDLE'), 3000);
      } else {
        setStatus('SUCCESS');
        router.push('/');
      }
    }
  };

  return (
    <div className="gate-root">
      <Head>
        <title>IDENTIFICATION // VSPO! HUB GATEWAY</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@800&family=Montserrat:wght@900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      {/* 背景レイヤー：スキャナー演出 */}
      <div className="scanner-bg" />
      <div className="vignette" />
      
      <main className="gate-container">
        <div className="gate-header">
          <div className="security-tag" style={{ color: isRegisterMode ? '#00f2ff' : '#ff00ff' }}>
            {isRegisterMode ? 'NEW_COMMANDER_RECRUIT' : 'LEVEL_5_RESTRICTED_ACCESS'}
          </div>
          <h1 className="gate-title">VSPO! ARCHIVE</h1>
          <div className="gate-ver">SYSTEM_v6.0 // STABLE_BUILD</div>
        </div>

        <form onSubmit={handleAuth} className="gate-form">
          {errorMsg && <div className="gate-error-box">{errorMsg}</div>}

          <div className="field">
            <label><i className="fas fa-id-card-alt"></i> COMMANDER_ID</label>
            <input 
              type="text" 
              value={id} 
              onChange={e => setId(e.target.value)} 
              placeholder="ENTER_ID" 
              required 
              autoComplete="username"
            />
          </div>
          
          <div className="field">
            <label><i className="fas fa-key"></i> ACCESS_PASS</label>
            <input 
              type="password" 
              value={pass} 
              onChange={e => setPass(e.target.value)} 
              placeholder="••••••••" 
              required 
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={`submit-btn ${status}`} disabled={status === 'BUSY'}>
            <div className="btn-glitch-effect"></div>
            <span className="btn-text">
              {status === 'BUSY' ? 'UPLINKING...' : 
               status === 'SUCCESS' ? 'LINK_ESTABLISHED' : 
               status === 'FAIL' ? 'ACCESS_DENIED' : 
               isRegisterMode ? 'INITIALIZE_RECRUITMENT' : 'INITIATE_AUTH_SEQUENCE'}
            </span>
          </button>
        </form>

        <footer className="gate-footer">
          <div className="mode-toggle" onClick={() => { setIsRegisterMode(!isRegisterMode); setErrorMsg(''); }}>
             {isRegisterMode ? "← RETURN_TO_LOGIN" : "CREATE_NEW_COMMANDER_ID?"}
          </div>
          <p className="legal">AUTHORIZED_PERSONNEL_ONLY // © 2026 VSPO_COMMAND</p>
        </footer>
      </main>

      <style jsx global>{`
        /* 1. 白い枠を完全に殺すためのグローバル設定 */
        html, body {
          background: #000 !important;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        .gate-root { 
          height: 100vh; 
          width: 100vw;
          background: #000; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-family: 'JetBrains Mono', monospace; 
          color: #fff; 
          position: relative; 
          overflow: hidden; 
        }

        /* 2. 背景スキャナー：深い暗闇へのグラデーション */
        .scanner-bg { 
          position: absolute; 
          inset: 0; 
          background: radial-gradient(circle at center, #0a0a0c 0%, #000 100%); 
          z-index: 1;
        }
        .scanner-bg::after { 
          content: ''; 
          position: absolute; 
          top: 0; left: 0; 
          width: 100%; height: 2px; 
          background: var(--v-accent, #00f2ff); 
          opacity: 0.15; 
          box-shadow: 0 0 20px var(--v-accent, #00f2ff); 
          animation: scan 4s linear infinite; 
        }
        .vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.8) 100%);
          z-index: 2;
          pointer-events: none;
        }
        @keyframes scan { 0% { top: -5%; } 100% { top: 105%; } }

        /* 3. パネル：漆黒のガラス質感 */
        .gate-container { 
          width: 400px; 
          padding: 60px; 
          background: rgba(5, 5, 7, 0.85); 
          border: 1px solid rgba(255, 255, 255, 0.05); 
          backdrop-filter: blur(30px); 
          z-index: 10; 
          position: relative; 
          border-radius: 4px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.8);
        }

        .gate-header { text-align: center; margin-bottom: 45px; }
        .security-tag { 
          font-size: 9px; 
          font-weight: 800;
          letter-spacing: 0.5em; 
          margin-bottom: 12px; 
          transition: 0.3s; 
          text-shadow: 0 0 10px currentColor;
        }
        .gate-title { 
          font-family: 'Montserrat', sans-serif; 
          font-size: 28px; 
          margin: 0; 
          letter-spacing: 0.05em;
          color: #fff;
        }
        .gate-ver { font-size: 8px; color: #222; margin-top: 8px; letter-spacing: 0.1em; }

        .gate-form { display: flex; flex-direction: column; gap: 25px; }
        
        /* エラー表示 */
        .gate-error-box {
          background: rgba(255, 0, 85, 0.1);
          border: 1px solid rgba(255, 0, 85, 0.3);
          color: #ff0055;
          padding: 12px;
          font-size: 10px;
          text-align: center;
          border-radius: 2px;
          text-shadow: 0 0 5px rgba(255,0,85,0.5);
        }

        .field label { 
          display: block; 
          font-size: 9px; 
          color: #555; 
          margin-bottom: 10px; 
          letter-spacing: 0.2em; 
        }
        .field label i { margin-right: 8px; color: #333; }

        input { 
          width: 100%; 
          background: rgba(0,0,0,0.5); 
          border: 1px solid #1a1a1c; 
          padding: 18px; 
          color: #fff; 
          font-size: 14px; 
          outline: none; 
          box-sizing: border-box; 
          font-family: 'JetBrains Mono'; 
          transition: 0.3s;
          border-radius: 2px;
        }
        input:focus { 
          border-color: #00f2ff; 
          background: rgba(0,242,255,0.02);
          box-shadow: 0 0 15px rgba(0,242,255,0.1); 
        }

        /* 4. ボタン：白からネオンへの昇華 */
        .submit-btn { 
          position: relative;
          padding: 20px; 
          border: 1px solid rgba(255,255,255,0.1); 
          font-weight: 800; 
          font-size: 11px; 
          cursor: pointer; 
          transition: 0.4s; 
          letter-spacing: 0.2em; 
          background: #fff; 
          color: #000; 
          font-family: 'JetBrains Mono'; 
          overflow: hidden;
        }
        .submit-btn:hover { 
          background: #00f2ff; 
          border-color: #00f2ff;
          color: #000;
          box-shadow: 0 0 40px rgba(0,242,255,0.5); 
          transform: translateY(-2px);
        }
        .submit-btn.BUSY { background: #08080a; color: #333; border-color: #111; cursor: wait; }
        .submit-btn.FAIL { background: #ff0055; color: #fff; border-color: #ff0055; box-shadow: 0 0 30px rgba(255,0,85,0.3); }
        .submit-btn.SUCCESS { background: #00f2ff; color: #000; border-color: #00f2ff; box-shadow: 0 0 30px rgba(0,242,255,0.4); }

        .gate-footer { margin-top: 50px; text-align: center; }
        .mode-toggle { 
          color: #444; 
          cursor: pointer; 
          margin-bottom: 25px; 
          transition: 0.3s; 
          font-size: 10px; 
          font-weight: 800;
          letter-spacing: 0.1em;
        }
        .mode-toggle:hover { color: #fff; text-shadow: 0 0 10px #fff; }
        .legal { font-size: 8px; color: #1a1a1c; letter-spacing: 0.1em; margin: 0; }

        @media (max-width: 480px) {
          .gate-container { width: 85%; padding: 40px 30px; }
        }
      `}</style>
    </div>
  );
}
