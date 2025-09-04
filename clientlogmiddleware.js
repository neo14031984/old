function clientLogMiddleware(app) {
  app.post('/api/client-log', (req, res) => {
    let body = req.body;
    if (!body) return res.status(400).end();
    console.log(`[CLIENT-LOG] ${body.msg || ''} | Details: ${JSON.stringify(body.data || {})}`);
    res.status(200).end();
  });
}
module.exports = clientLogMiddleware;