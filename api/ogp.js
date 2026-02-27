export default async function handler(req, res) {
  // URLからレイヤー名を取得
  const cosplayer = req.query.cosplayer || 'ゲスト';
  
  // スプレッドシートの「公開CSV」URL（API制限なしで超高速に読み込めます）
  const sheetId = '1sW4ppHBQbJp7RZ0in15d2LWOxcBK077wsbqmlZjUI_U';
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('シート1')}`;

  // デフォルト画像
  let imageUrl = 'https://pbs.twimg.com/media/HCIsGx4a0AE4EWk?format=png&name=small';

  try {
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    const rows = csvText.split('\n');
    if (rows.length > 0) {
      const headers = rows[0].split('","').map(h => h.replace(/"/g, ''));
      const idxCos = headers.findIndex(h => h.match(/cosplayer|レイヤー/i));
      const idxImg = headers.findIndex(h => h.match(/image|画像/i));

      if (idxCos >= 0 && idxImg >= 0) {
        const cleanTarget = cosplayer.replace("さん", "").trim();
        // 下（最新）から検索
        for (let i = rows.length - 1; i > 0; i--) {
          if (rows[i].includes(cleanTarget)) {
            const cols = rows[i].split('","');
            if (cols.length > Math.max(idxCos, idxImg)) {
              let foundUrl = cols[idxImg].replace(/"/g, '');
              if (foundUrl.startsWith('http')) {
                imageUrl = foundUrl;
                break;
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Error fetching sheet:", e);
  }

  // Discord Bot対策: Twitter画像を標準サイズに強制変換
  if (imageUrl.includes('pbs.twimg.com')) {
    imageUrl = imageUrl.split('?')[0] + "?format=jpg&name=large";
  }

  // Vercel上の本サイト（自分のドメイン）へジャンプさせるURLを生成
  const siteUrl = `https://${req.headers.host}`;
  const targetUrl = `${siteUrl}/?cosplayer=${encodeURIComponent(cosplayer)}`;

  // Botが確実に読める「生のHTML」を出力
  const html = `
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="utf-8">
    <title>${cosplayer}のポートフォリオ | VSPO! COSPLAY</title>
    <meta property="og:title" content="${cosplayer}のポートフォリオ | VSPO! COSPLAY">
    <meta property="og:description" content="ぶいすぽっ！コスプレアーカイブ ${cosplayer}さんのまとめページです。">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="theme-color" content="#3ea6ff">
    <script>
      // 人間が開いたら即座に本来のページへ飛ばす
      window.location.replace("${targetUrl}");
    </script>
  </head>
  <body style="background:#121212; color:#fff; text-align:center; padding-top:50px; font-family:sans-serif;">
    <p>Loading Portfolio...</p>
  </body>
  </html>`;

  // HTMLとして出力（ここがGASにはできなかったVercelの強みです！）
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
