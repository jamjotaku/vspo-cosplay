const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

function createWindow() {
  // メインモニターのサイズを取得して、右下に配置する計算
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const widgetWidth = 320;
  const widgetHeight = 500; // 設定画面の余裕を見て少し高めに設定

  const win = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    // 右下に配置（余白20px）
    x: width - widgetWidth - 20,
    y: height - widgetHeight - 20,
    frame: false,             // 枠を消す
    alwaysOnTop: true,        // 常に最前面
    transparent: true,        // 背景を透過
    resizable: false,         // サイズ固定
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // 【重要】VercelにデプロイしたURLに書き換えてください
  // ローカルテスト時は 'http://localhost:3000/widget'
  win.loadURL('https://vspo-cosplay.vercel.app/widget'); 
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
