const { app, BrowserWindow } = require('electron');

function createWindow () {
  const win = new BrowserWindow({
    width: 350,
    height: 500,
    frame: false,        // ウィジェットっぽく枠を消す
    alwaysOnTop: true,   // 推しを常に最前面に！
    transparent: true,   // 背景を透過
    webPreferences: {
      nodeIntegration: true
    }
  });

  // VercelにデプロイしたURLを読み込む
  // ここを自分のURLに書き換えるだけでOK！
  win.loadURL('https://vspo-cosplay.vercel.app//widget'); 
}

app.whenReady().then(createWindow);

// 全てのウィンドウが閉じられたらアプリを終了する
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
