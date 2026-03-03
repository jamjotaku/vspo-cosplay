const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const defaultWidth = 320;
  const defaultHeight = 480;

  const win = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    // 初期位置は右下
    x: width - defaultWidth - 20,
    y: height - defaultHeight - 20,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: true, // プログラムからの変更を許可
    webPreferences: {
      // preload.js を接続
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // あなたのVercel URL
  win.loadURL('https://vspo-cosplay.vercel.app/widget');

  // サイズ変更命令を受け取った時の処理
  ipcMain.on('resize-window', (event, w, h) => {
    win.setSize(w, h);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});