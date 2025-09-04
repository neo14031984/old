const { app, BrowserWindow } = require('electron');
const path = require('path');

// Avvia Express direttamente
const expressServer = require('./app'); // Importa il tuo app.js che esporta il server

app.commandLine.appendSwitch('ignore-certificate-errors');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadURL('https://localhost:3001');
}

app.whenReady().then(() => {
  // Avvia il server Express qui
  expressServer.listen(3001, () => {
    console.log("✅ Express avviato su https://localhost:3001");
    createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});