const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const https = require('https');
const app = express();

const port = 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.json());

app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 1000
  }
}));

const routes = require('./routes');
app.use('/', routes);

const queryPricesRouter = require('./routes/queryPrices');
app.use('/query-prices', queryPricesRouter);

// --- HTTPS SERVER CON MKCERT PER LOCALHOST ---
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost.pem'))
};

// Invece di avviare subito il server, lo esporti
const server = https.createServer(httpsOptions, app);

module.exports = server;
// Error handler
app.use(function (err, req, res, next) {
  console.error('Express Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// --- DEBUG PAUSA SOLO SE LANCIATO DIRETTAMENTE DA NODE ---
if (require.main === module) {
  server.listen(port, () => {
    console.log(`✅ Server HTTPS avviato su https://localhost:${port}`);
    console.log("Premi invio per chiudere il programma...");
    process.stdin.resume();
  });
}

// Esporta il server HTTPS per Electron
module.exports = server;