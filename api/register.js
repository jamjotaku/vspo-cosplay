export default async function handler(req, res) {
  // ① さっきメモした「Application ID」を ' ' の中に貼り付けます
  const APP_ID = 'ここにApplication IDを貼る'; 
  
  // ② Vercelに登録したBotトークンを呼び出します
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  // Discordに「/search」コマンドを登録するリクエストを送信
  const response = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${BOT_TOKEN}`
    },
    body: JSON.stringify({
      name: 'search',
      description: 'アーカイブからコスプレイヤーさんやイベントを検索します',
      options: [{
        name: 'keyword',
        description: '検索したい名前（例：小雪うの、VGGC）',
        type: 3,
        required: true
      }]
    })
  });

  if (response.ok) {
    res.status(200).send('🎉 コマンドの登録に成功しました！Discordのチャット欄で /search と打ってみてください。');
  } else {
    const error = await response.text();
    res.status(500).send(`⚠️ エラーが発生しました: ${error}`);
  }
}
