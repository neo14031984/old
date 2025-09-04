const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');

function requireLogin(req, res, next) {
  if (req.session && req.session.authenticated && req.session.username && req.session.otalioToken) return next();
  return res.redirect('/login');
}

function otalioAuth(req, res, next) { next(); }

router.get('/login', articleController.renderLogin);
router.post('/login', articleController.handleLogin);
router.get('/logout', articleController.logout);

router.get('/', requireLogin, articleController.renderHome);
router.get('/search', requireLogin, otalioAuth, articleController.searchArticles);

router.get('/all-groups', requireLogin, otalioAuth, articleController.getAllGroups);

router.get('/pos/v1/article-classes', requireLogin, otalioAuth, articleController.getAllClasses);

router.post('/delete-override', requireLogin, otalioAuth, articleController.deleteOverride);
router.post('/override-article', requireLogin, otalioAuth, articleController.overrideArticle);
router.post('/update-price', requireLogin, otalioAuth, articleController.updatePrice);
router.post('/update-description', requireLogin, otalioAuth, articleController.updateDescription);
router.post('/update-enable', requireLogin, otalioAuth, articleController.updateEnable);
router.post('/update-group', requireLogin, otalioAuth, articleController.updateGroup);
router.post('/update-article-class-code', requireLogin, otalioAuth, articleController.updateArticleClassCode);

module.exports = router;