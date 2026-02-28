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

  // search コマンドと pickup コマンドの両方に対応
  if (interaction.type === 2 && (interaction.data.name === 'search' || interaction.data.name === 'pickup')) {
    const commandName = interaction.data.name;
    const options = interaction.data.options || [];
    const cosplayerOpt = options.find(opt => opt.name === 'cosplayer');
    const memberOpt = options.find(opt => opt.name === 'member');

    const rawCosplayer = cosplayerOpt ? cosplayerOpt.value : '';
    const rawMember = memberOpt ? memberOpt.value : '';

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
        let matchedItems = []; // ヒットした画像をすべて貯める箱

        for (let i = rows.length - 1; i > 0; i--) {
          const rowData = rows[i];
          let isMatch = false;

          if (searchCosplayer && searchMember) {
            isMatch = rowData.includes(searchCosplayer) && rowData.includes(searchMember);
          } else {
            isMatch = rowData.includes(searchCosplayer);
          }

          if (isMatch) {
            const cols = rowData.split('","');
            const name = cols[idxCos].replace(/"/g, '').replace(/さん$/, '');
            let url = cols[idxImg].replace(/"/g, '');
            if (url.includes('pbs.twimg.com')) {
               url = url.split('?')[0] + "?format=jpg&name=large";
            }
            // 貯金箱に入れる
            matchedItems.push({ name, url });
          }
        }

        if (matchedItems.length > 0) {
          const matchCount = matchedItems.length;
          const matchedName = matchedItems[0].name;
          const siteUrl = `https://${req.headers.host}`;
          const portfolioUrl = `${siteUrl}/?cosplayer=${encodeURIComponent(matchedName)}`;
          
          let displayImageUrl = '';

          if (commandName === 'pickup') {
            // ★ ピックアップモード：ランダム抽出（ガチャ）
            const randomIndex = Math.floor(Math.random() * matchCount);
            displayImageUrl = matchedItems[randomIndex].url;
            
            resultMessage = `🏆 **今日のピックアップ！**\n✨ **${matchedName}** さんの素敵なアーカイブをご紹介！\n\n📸 **全${matchCount}枚の中からランダムで1枚表示中:**\n${displayImageUrl}\n\n🌟 **すべての写真を見る（ポートフォリオへ）**\n${portfolioUrl}`;
            
          } else {
            // ★ 通常の検索モード：最新の1枚
            displayImageUrl = matchedItems[0].url;
            
            resultMessage = `✨ **${matchedName}** さんの **${searchMember ? searchMember + ' ' : ''}**アーカイブが **${matchCount}件** 見つかりました！\n\n📸 **最新の1枚:**\n${displayImageUrl}\n\n🌟 **すべての写真を見る（ポートフォリオへ）**\n${portfolioUrl}`;
          }
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
