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

  // --- 1. PING (生存確認) ---
  if (interaction.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  const sheetId = '1sW4ppHBQbJp7RZ0in15d2LWOxcBK077wsbqmlZjUI_U';
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('シート1')}`;

  // --- 2. AUTOCOMPLETE (入力候補の提示) ---
  if (interaction.type === 4) {
    const options = interaction.data.options;
    const focusedOption = options.find(opt => opt.focused); // 現在入力中の項目を特定
    const searchText = focusedOption.value.toLowerCase();

    try {
      const response = await fetch(csvUrl);
      const csvText = await response.text();
      const rows = csvText.split('\n');
      const headers = rows[0].split('","').map(h => h.replace(/"/g, ''));
      
      // 検索対象の列を決定
      let colIndex = -1;
      if (focusedOption.name === 'cosplayer') {
        colIndex = headers.findIndex(h => h.match(/cosplayer|レイヤー/i));
      } else if (focusedOption.name === 'member') {
        colIndex = headers.findIndex(h => h.match(/member|メンバー/i));
      }

      if (colIndex === -1) return res.status(200).json({ type: 8, data: { choices: [] } });

      // 重複のない名前リストを作成
      const nameSet = new Set();
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split('","');
        if (cols[colIndex]) {
          const name = cols[colIndex].replace(/"/g, '').trim();
          if (name) nameSet.add(name);
        }
      }

      // 入力された文字に一致するものを抽出（最大25件まで）
      const choices = Array.from(nameSet)
        .filter(name => name.toLowerCase().includes(searchText))
        .slice(0, 25)
        .map(name => ({ name: name, value: name }));

      return res.status(200).json({
        type: 8,
        data: { choices: choices }
      });
    } catch (e) {
      console.error(e);
      return res.status(200).json({ type: 8, data: { choices: [] } });
    }
  }

  // --- 3. APPLICATION_COMMAND (検索・ピックアップ実行) ---
  if (interaction.type === 2 && (interaction.data.name === 'search' || interaction.data.name === 'pickup')) {
    const commandName = interaction.data.name;
    const options = interaction.data.options || [];
    const cosplayerOpt = options.find(opt => opt.name === 'cosplayer');
    const memberOpt = options.find(opt => opt.name === 'member');

    const rawCosplayer = cosplayerOpt ? cosplayerOpt.value : '';
    const rawMember = memberOpt ? memberOpt.value : '';

    const searchCosplayer = rawCosplayer.replace(/さん$/, '').trim();
    const searchMember = rawMember.replace(/さん$/, '').trim();

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
        let matchedItems = [];

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
            const randomIndex = Math.floor(Math.random() * matchCount);
            displayImageUrl = matchedItems[randomIndex].url;
            resultMessage = `🏆 **今日のピックアップ！**\n✨ **${matchedName}** さんの素敵なアーカイブをご紹介！\n\n📸 **全${matchCount}枚の中からランダムで1枚表示中:**\n${displayImageUrl}\n\n🌟 **すべての写真を見る（ポートフォリオへ）**\n${portfolioUrl}`;
          } else {
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
