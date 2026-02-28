import { verifyKey } from 'discord-interactions';

export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => { resolve(data); });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('POST only');

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = await getRawBody(req);

  const isValidRequest = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  if (!isValidRequest) {
    return res.status(401).send('Bad request signature');
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  if (interaction.type === 2 && interaction.data.name === 'search') {
    const rawKeyword = interaction.data.options[0].value;
    // 検索キーワードから「さん」を抜いてヒットしやすくする
    const keyword = rawKeyword.replace(/さん$/, '').trim();
    
    const sheetId = '1sW4ppHBQbJp7RZ0in15d2LWOxcBK077wsbqmlZjUI_U';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('シート1')}`;

    let resultMessage = `🔍 **「${rawKeyword}」** に一致するアーカイブは見つかりませんでした...`;

    try {
      const response = await fetch(csvUrl);
      const csvText = await response.text();
      const rows = csvText.split('\n');

      const headers = rows[0].split('","').map(h => h.replace(/"/g, ''));
      const idxCos = headers.findIndex(h => h.match(/cosplayer|レイヤー/i));
      const idxImg = headers.findIndex(h => h.match(/image|画像/i));

      if (idxCos >= 0 && idxImg >= 0) {
        let matchCount = 0;
        let latestImageUrl = '';
        let matchedName = '';

        // 下（最新）から順番にすべて検索し、件数をカウントする
        for (let i = rows.length - 1; i > 0; i--) {
          if (rows[i].includes(keyword)) {
            matchCount++; // ヒットした件数を増やす
            
            // 最初の1回目（一番新しい画像）だけデータを保存しておく
            if (matchCount === 1) {
              const cols = rows[i].split('","');
              matchedName = cols[idxCos].replace(/"/g, '').replace(/さん$/, ''); // 「さん」を削除して綺麗に
              
              let url = cols[idxImg].replace(/"/g, '');
              if (url.includes('pbs.twimg.com')) {
                 url = url.split('?')[0] + "?format=jpg&name=large";
              }
              latestImageUrl = url;
            }
          }
        }

        // 1件以上見つかった場合、メッセージを組み立てる
        if (matchCount > 0) {
          const siteUrl = `https://${req.headers.host}`;
          const portfolioUrl = `${siteUrl}/?cosplayer=${encodeURIComponent(matchedName)}`;
          
          resultMessage = `✨ **${matchedName}** さんのアーカイブが **${matchCount}件** 見つかりました！\n\n📸 **最新の1枚:**\n${latestImageUrl}\n\n🌟 **すべてのコスプレ写真を見る（ポートフォリオへ）**\n${portfolioUrl}`;
        }
      }
    } catch (e) {
      console.error(e);
      resultMessage = "⚠️ データベースの読み込みに失敗しました。";
    }

    return res.status(200).json({
      type: 4,
      data: {
        content: resultMessage
      }
    });
  }

  return res.status(400).send('Unknown interaction type');
}
