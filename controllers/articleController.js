const articleService = require('../services/articleService');
const { getHierarchyLevels } = require('../services/otalioService');

exports.renderLogin = articleService.renderLogin;
exports.handleLogin = articleService.handleLogin;
exports.logout = articleService.logout;

exports.renderHome = async (req, res) => {
  let hierarchyLevels = [];
  try {
    hierarchyLevels = await getHierarchyLevels(await articleService.getOtalioToken(req));
  } catch (e) {
    hierarchyLevels = [{ id: 1, description: 'Enterprise', nave: '' }];
  }
  res.render('index', {
    results: null,
    code: '',
    description: '',
    externalCode: '',
    user: req.session.username,
    hierarchyLevels,
    hierarchyId: 1
  });
};

exports.searchArticles = (req, res) => {
  const { code, description, externalCode, hierarchyId } = req.query;
  const searchDone = code || description || externalCode || hierarchyId;
  if (!searchDone) {
    return res.render('search', {
      results: null,
      code: '',
      description: '',
      externalCode: '',
      hierarchyId: '',
      searchDone: false,
      user: req.session.username
    });
  }
  return articleService.searchArticles(req, res);
};

exports.getAllGroups = (req, res) => articleService.getAllGroups(req, res);

exports.getAllClasses = (req, res) => articleService.getAllClasses(req, res);

exports.deleteOverride = (req, res) => articleService.deleteOverride(req, res);

exports.overrideArticle = async (req, res) => {
  try {
    await articleService.overrideArticle(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updatePrice = (req, res) => articleService.updatePrice(req, res);
exports.updateDescription = (req, res) => articleService.updateDescription(req, res);
exports.updateEnable = (req, res) => articleService.updateEnable(req, res);
exports.updateGroup = (req, res) => articleService.updateGroup(req, res);

exports.updateArticleClassCode = (req, res) => {
  const { entityId, newClassCode } = req.body || {};

  let hierarchyId = req.body.hierarchyId;
  if (!hierarchyId && req.query.hierarchyId) {
    hierarchyId = req.query.hierarchyId;
  }
  if (!hierarchyId && req.headers.referer) {
    try {
      const qs = req.headers.referer.split('?')[1];
      if (qs) {
        const params = new URLSearchParams(qs);
        hierarchyId = params.get('hierarchyId');
      }
    } catch (err) {
      hierarchyId = undefined;
    }
  }
  if (!hierarchyId) hierarchyId = '1';

  if (!entityId || !newClassCode) {
    return res.status(400).json({ success: false, error: 'Parametri mancanti' });
  }
  if (!(hierarchyId === '1' || hierarchyId === 1)) {
    return res.status(400).json({
      success: false,
      error: 'Article Class modification allowed only at MSC Enterprise level.'
    });
  }
  articleService.updateArticleClassCode(entityId, newClassCode, req.session.otalioToken, hierarchyId)
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error(err);
      res.status(400).json({ success: false, error: err.message });
    });
};