const { app, BrowserWindow, screen } = require('electron');

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const widgetWidth = 320;
  const widgetHeight = 480;

  const win = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    x: width - widgetWidth - 20, // 右端から20px
    y: height - widgetHeight - 20, // 下端から20px
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // 【重要】あなたのVercelのURLに書き換えてください！
  win.loadURL('https://vspo-cosplay.vercel.app//widget'); 
}

app.whenReady().then(createWindow);
