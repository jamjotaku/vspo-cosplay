import { verifyKey } from 'discord-interactions';

// Vercelの自動処理をオフにし、Discordの暗号通信を生のまま受け取るための必須設定
export const config = {
  api: { bodyParser: false },
};

// 通信データを読み込むための関数
async function getRawBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => { resolve(data); });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('POST only');

  // Discordからの通信か確認するための署名データ
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = await getRawBody(req);

  // Vercelに登録した鍵（PUBLIC KEY）を使って「本物のDiscordからの通信か」を判定
  const isValidRequest = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  if (!isValidRequest) {
    return res.status(401).send('Bad request signature');
  }

  const interaction = JSON.parse(rawBody);

  // ① Discordからの「起きてる？」という生存確認への返事（必須）
  if (interaction.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  // ② ユーザーが「/search」コマンドを打った時の処理
  if (interaction.type === 2 && interaction.data.name === 'search') {
    const keyword = interaction.data.options[0].value;
    
    // スプレッドシート（公開CSV）の読み込み
    const sheetId = '1sW4ppHBQbJp7RZ0in15d2LWOxcBK077wsbqmlZjUI_U';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('シート1')}`;

    let resultMessage = `🔍 **「${keyword}」** に一致するアーカイブは見つかりませんでした...`;

    try {
      const response = await fetch(csvUrl);
      const csvText = await response.text();
      const rows = csvText.split('\n');

      const headers = rows[0].split('","').map(h => h.replace(/"/g, ''));
      const idxCos = headers.findIndex(h => h.match(/cosplayer|レイヤー/i));
      const idxImg = headers.findIndex(h => h.match(/image|画像/i));

      if (idxCos >= 0 && idxImg >= 0) {
        // 下（最新）から検索して、最初にヒットしたものを返す
        for (let i = rows.length - 1; i > 0; i--) {
          if (rows[i].includes(keyword)) {
            const cols = rows[i].split('","');
            const name = cols[idxCos].replace(/"/g, '');
            let url = cols[idxImg].replace(/"/g, '');
            
            // BotがDiscord上でエラーを出さないように画像をリサイズ
            if (url.includes('pbs.twimg.com')) {
               url = url.split('?')[0] + "?format=jpg&name=large";
            }

            resultMessage = `✨ **${name}** さんのアーカイブが見つかりました！\n${url}`;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      resultMessage = "⚠️ データベースの読み込みに失敗しました。";
    }

    // Discordのチャット欄に検索結果を返信する
    return res.status(200).json({
      type: 4,
      data: {
        content: resultMessage
      }
    });
  }

  return res.status(400).send('Unknown interaction type');
}
