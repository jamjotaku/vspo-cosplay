export default async function handler(req, res) {
  // ① 前回と同じく「Application ID」を ' ' の中に貼り付けてください
  const APP_ID = '1477157860684202086'; 
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  const response = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${BOT_TOKEN}`
    },
    body: JSON.stringify({
      name: 'search',
      description: 'アーカイブからコスプレイヤーさんやメンバーを検索します',
      options: [
        {
          name: 'cosplayer',
          description: 'コスプレイヤーの名前（例：小雪うの）',
          type: 3,
          required: true
        },
        {
          name: 'member',
          description: 'ぶいすぽっ！メンバーの名前（例：花芽すみれ）※任意',
          type: 3,
          required: false // 任意入力にしておきます
        }
      ]
    })
  });

  if (response.ok) {
    res.status(200).send('🎉 コマンドのアップデートに成功しました！');
  } else {
    const error = await response.text();
    res.status(500).send(`⚠️ エラー: ${error}`);
  }
}
