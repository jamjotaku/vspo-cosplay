import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Papa from 'papaparse';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQgV5MvOa8ZUcpQ9jL1HhYQOLS_y78ZoOnQI96iru-5JZVTrRc5Li4hBkN7igEyB5p73EuaaEfLC38G/pub?gid=0&single=true&output=csv";

export default function GlobalCommander({ children }) {
  const router = useRouter();
  const [allData, setAllData] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [profile, setProfile] = useState({ theme_color: '#00f2ff', oshi_member: '全員', favorite_cosplayer: '全員' });
  const [loading, setLoading] = useState(true);

  // 1. プロファイル同期 & ログインチェック
  const syncProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      if (router.pathname !== '/login') router.push('/login');
      setLoading(false);
      return;
    }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (prof) {
      setProfile(prof);
      document.documentElement.style.setProperty('--v-accent', prof.theme_color || '#00f2ff');
    }
    setLoading(false);
  };

  useEffect(() => {
    syncProfile();
    // CSVロード
    Papa.parse(CSV_URL, {
      download: true, header: true,
      complete: (res) => {
        const data = res.data.filter(d => d.image || d.url).map(d => ({
          member: (d.member || d['名前'] || "").trim(),
          image: (d.image || d['画像'] || d.link || d.url || "").replace('name=medium', 'name=large'),
          cosplayer: (d.cosplayer || d['レイヤー'] || "Unknown").trim(),
        }));
        setAllData(data);
      }
    });
  }, [router.pathname]);

  // 2. グローバル背景ローテーション
  const rotateBackground = useCallback(() => {
    if (allData.length === 0) return;
    let pool = allData.filter(p => 
      (profile.oshi_member === '全員' || p.member === profile.oshi_member) &&
      (profile.favorite_cosplayer === '全員' || p.cosplayer === profile.favorite_cosplayer)
    );
    if (pool.length === 0) pool = allData;
    setFeatured(pool[Math.floor(Math.random() * pool.length)]);
  }, [allData, profile]);

  useEffect(() => {
    rotateBackground();
    const timer = setInterval(rotateBackground, 15000);
    return () => clearInterval(timer);
  }, [rotateBackground]);

  if (loading && router.pathname !== '/login') return <div className="p-loader">SYNCHRONIZING_COMMAND_CORE...</div>;

  return (
    <div className="global-root">
      {/* 共通の背景演出 */}
      <div className="p-grain" />
      <div className="p-ambient">
        {featured && <div className="p-glow-wrap" key={featured.image}><img src={featured.image} alt="" /></div>}
        <div className="p-mask" />
      </div>

      {/* ページ本体 */}
      <div className="page-content">
        {children}
      </div>

      <style jsx global>{`
        :root { --v-accent: #00f2ff; --v-bg: #030305; }
        body { margin:0; background:var(--v-bg); color:#fff; font-family:'Montserrat', sans-serif; overflow-x:hidden; }
        .p-grain { position:fixed; inset:0; background:url('https://grainy-gradients.vercel.app/noise.svg'); opacity:0.04; pointer-events:none; z-index:1; }
        .p-ambient { position:fixed; inset:0; z-index:2; pointer-events:none; }
        .p-glow-wrap { position:absolute; inset:-10%; filter:blur(100px); opacity:0.4; transition:3s ease-in-out; }
        .p-glow-wrap img { width:100%; height:100%; object-fit:cover; }
        .p-mask { position:absolute; inset:0; background:radial-gradient(circle at center, transparent 10%, #000 90%); }
        .page-content { position:relative; z-index:10; }
        .p-loader { height:100vh; background:#000; color:var(--v-accent); display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono'; letter-spacing:1em; }
      `}</style>
    </div>
  );
}