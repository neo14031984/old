function getOtalioToken(req) {
  if (req.session && req.session.otalioToken) {
    return req.session.otalioToken;
  }
  return null;
}

function otalioAuth(req, res, next) {
  const token = getOtalioToken(req);
  if (!token) {
    console.error('❌ [otalioAuth] Error: Missing Otalio credentials! SESSION:', req.session);
    return res.redirect('/login');
  }
  next();
}

module.exports = {
  getOtalioToken,
  otalioAuth
};