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
    // 2つの入力枠からデータを取得する
    const options = interaction.data.options || [];
    const cosplayerOpt = options.find(opt => opt.name === 'cosplayer');
    const memberOpt = options.find(opt => opt.name === 'member');

    const rawCosplayer = cosplayerOpt ? cosplayerOpt.value : '';
    const rawMember = memberOpt ? memberOpt.value : ''; // 任意なので空っぽの可能性あり

    // 「さん」を抜いて検索しやすくする
    const searchCosplayer = rawCosplayer.replace(/さん$/, '').trim();
    const searchMember = rawMember.replace(/さん$/, '').trim();

    const sheetId = '1sW4ppHBQbJp7RZ0in15d2LWOxcBK077wsbqmlZjUI_U';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('シート1')}`;

    let displayKeyword = searchMember ? `${searchCosplayer} さんの ${searchMember}` : `${searchCosplayer}`;
    let resultMessage = `🔍 **「${displayKeyword}」** のアーカイブは見つかりませんでした...`;

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

        for (let i = rows.length - 1; i > 0; i--) {
          const rowData = rows[i];
          let isMatch = false;

          // ★ AND検索のロジック
          // メンバー名も入力されている場合は、レイヤー名とメンバー名の「両方」が含まれているかチェック
          if (searchCosplayer && searchMember) {
            isMatch = rowData.includes(searchCosplayer) && rowData.includes(searchMember);
          } else {
            // レイヤー名だけの場合は今まで通り
            isMatch = rowData.includes(searchCosplayer);
          }

          if (isMatch) {
            matchCount++;
            if (matchCount === 1) {
              const cols = rowData.split('","');
              matchedName = cols[idxCos].replace(/"/g, '').replace(/さん$/, '');
              
              let url = cols[idxImg].replace(/"/g, '');
              if (url.includes('pbs.twimg.com')) {
                 url = url.split('?')[0] + "?format=jpg&name=large";
              }
              latestImageUrl = url;
            }
          }
        }

        if (matchCount > 0) {
          const siteUrl = `https://${req.headers.host}`;
          const portfolioUrl = `${siteUrl}/?cosplayer=${encodeURIComponent(matchedName)}`;
          
          resultMessage = `✨ **${matchedName}** さんの **${searchMember ? searchMember + ' ' : ''}**アーカイブが **${matchCount}件** 見つかりました！\n\n📸 **最新の1枚:**\n${latestImageUrl}\n\n🌟 **すべての写真を見る（ポートフォリオへ）**\n${portfolioUrl}`;
        }
      }
    } catch (e) {
      console.error(e);
      resultMessage = "⚠️ データベースの読み込みに失敗しました。";
    }

    return res.status(200).json({
      type: 4,
      data: { content: resultMessage }
    });
  }

  return res.status(400).send('Unknown interaction type');
}
