export default async function handler(req, res) {
  // ① ご自身の「Application ID」を ' ' の中に貼り付けてください
  const APP_ID = '1477157860684202086'; 
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  // 登録するコマンドのリスト（search と pickup の2つ）
  const commands = [
    {
      name: 'search',
      description: 'アーカイブからコスプレイヤーさんやメンバーを検索します',
      options: [
        { name: 'cosplayer', description: 'コスプレイヤーの名前', type: 3, required: true },
        { name: 'member', description: 'ぶいすぽメンバーの名前 ※任意', type: 3, required: false }
      ]
    },
    {
      name: 'pickup',
      description: '【運営用】指定した条件からランダムな1枚をピックアップして紹介します！',
      options: [
        { name: 'cosplayer', description: 'コスプレイヤーの名前', type: 3, required: true },
        { name: 'member', description: 'ぶいすぽメンバーの名前 ※任意', type: 3, required: false }
      ]
    }
  ];

  // PUTメソッドを使って、Discordのコマンド一覧をまるごと上書きします
  const response = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${BOT_TOKEN}`
    },
    body: JSON.stringify(commands)
  });

  if (response.ok) {
    res.status(200).send('🎉 search と pickup の2つのコマンド登録に成功しました！');
  } else {
    const error = await response.text();
    res.status(500).send(`⚠️ エラー: ${error}`);
  }
}
