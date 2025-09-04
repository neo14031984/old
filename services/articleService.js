const helpers = require('./articleHelpers');
const axios = require('axios');
const config = require('../config.json');

exports.renderLogin = (req, res) => {
  res.render('login', { error: null });
};

exports.handleLogin = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('login', { error: 'Enter username and password.' });
  }
  try {
    const response = await axios.post(`${config.baseUrl}/iam/v1/sso/login`, {
      login: username,
      password: password
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const otalioToken = response.data?.responsePayload?.access_token;
    if (!otalioToken) {
      return res.render('login', { error: 'Credenziali non valide.' });
    }

    req.session.username = username;
    req.session.otalioToken = `Bearer ${otalioToken}`;

    req.session.authenticated = true;
    req.session.save(err => {
      if (err) {
        return res.render('login', { error: 'Session error.' });
      }
      res.redirect('/');
    });
  } catch (error) {
    console.error('Authentication error:', error.message, error?.response?.data);
    return res.render('login', { error: 'Invalid credentials or authentication error.' });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
};

exports.searchArticles = async (req, res) => {
  const { code, description, externalCode } = req.query;
  const hierarchyId = req.query.hierarchyId || 1;
  const searchParams = [];
  if (code) {
    if (code.includes(',')) {
      const codesList = code.split(',').map(s => s.trim()).filter(Boolean);
      if (codesList.length === 1) {
        searchParams.push(`code==*${codesList[0]}*`);
      } else if (codesList.length > 1) {
        searchParams.push(`code=in=(${codesList.join(',')})`);
      }
    } else {
      searchParams.push(`code==*${code}*`);
    }
  }
  if (description) searchParams.push(`description==*${description}*`);
  if (externalCode) searchParams.push(`articleExternalCodeLinks.externalCode==*${externalCode}*`);
  searchParams.push(`hierarchyId==${hierarchyId}`);
  const searchQuery = searchParams.join(';');
  try {
    const token = await helpers.getOtalioToken(req);
    const hierarchyLevels = await helpers.getHierarchyLevels(token);

    const articleRes = await axios.get(
      `${config.baseUrl}${config.articleSearchEndpoint}?search=${encodeURIComponent(searchQuery)}`,
      { headers: { Authorization: token } }
    );
    let articles = articleRes.data?.responsePayload?.content || [];
    let inheritedArticles = [];

    if (hierarchyId != 1) {
      const entSearchParams = searchParams.filter(p => !p.startsWith('hierarchyId')).concat('hierarchyId==1');
      const entSearchQuery = entSearchParams.join(';');
      const entRes = await axios.get(
        `${config.baseUrl}${config.articleSearchEndpoint}?search=${encodeURIComponent(entSearchQuery)}`,
        { headers: { Authorization: token } }
      );
      inheritedArticles = entRes.data?.responsePayload?.content || [];
      inheritedArticles = inheritedArticles.map(a => ({
        ...a,
        inherited: true,
        hierarchyId
      }));
      articles = articles.map(a => ({
        ...a,
        inherited: false,
        hierarchyId
      }));
      const overrideCodes = new Set(articles.map(a => a.code));
      inheritedArticles = inheritedArticles.filter(a => !overrideCodes.has(a.code));
    } else {
      articles = articles.map(a => ({
        ...a,
        inherited: false,
        hierarchyId
      }));
    }

    const allArticles = [...articles, ...inheritedArticles];

    if (allArticles.length === 0) {
      return res.render('index', {
        results: [],
        code,
        description,
        externalCode,
        user: req.session.username,
        hierarchyLevels,
        hierarchyId
      });
    }

    const entityIds = allArticles.map(a => a.entityId);

    let articleClassDetails = {};
    try {
      articleClassDetails = await helpers.getArticleClassDetails(entityIds, token, { isDeleted: false });
    } catch (e) {
      articleClassDetails = {};
    }

    const articleClassDetailsMap = {};
    const articleClassDetailsListMap = {};
    if (Array.isArray(articleClassDetails)) {
      articleClassDetails.forEach(row => {
        articleClassDetailsMap[row.articleEntityId] = row;
        if (!articleClassDetailsListMap[row.articleEntityId]) articleClassDetailsListMap[row.articleEntityId] = [];
        articleClassDetailsListMap[row.articleEntityId].push({
          code: row.articleClassCode || '-',
          description: row.articleClassDescription || '-'
        });
      });
    }

    const priceQuery = entityIds.length === 1
      ? `articleEntityId==${entityIds[0]}`
      : `articleEntityId=in=(${entityIds.join(',')})`;
    const priceRes = await axios.get(
      `${config.baseUrl}${config.articlePricesEndpoint}?search=${encodeURIComponent(priceQuery)}&contextSearch=true`,
      { headers: { Authorization: token } }
    );
    const rawPrices = (priceRes.data?.responsePayload?.content || []).filter(
      p => p.hierarchyId == hierarchyId || p.hierarchyId == 1
    );

    function priceRowKey(p) {
      return [
        p.effectivenessGroup || p.effectivenessGroupId || '',
        p.priceSeq || '',
        p.classificationSeq || p.classification_seq || '',
        p.mainLevels?.level1 || '',
        p.subLevels?.level1 || '',
        p.customLevels?.level1 || ''
      ].join('_');
    }
    const priceMapByEntity = {};
    for (const articleId of entityIds) {
      const prices = rawPrices.filter(p => p.articleEntityId == articleId);
      const keyToBestPrice = {};
      for (const p of prices) {
        const key = priceRowKey(p);
        if (!keyToBestPrice[key] || p.hierarchyId == hierarchyId) {
          keyToBestPrice[key] = p;
        }
      }
      priceMapByEntity[articleId] = Object.values(keyToBestPrice);
    }

    const allVisiblePrices = Object.values(priceMapByEntity).flat();
    const effectivenessIds = [...new Set(allVisiblePrices.map(p => p.effectivenessGroup).filter(Boolean))];
    let effectivenessMap = {};
    if (effectivenessIds.length > 0) {
      try {
        const effRes = await axios.get(
          `${config.baseUrl}/pos/v1/effectiveness-groups?search=id=in=(${effectivenessIds.join(',')})`,
          { headers: { Authorization: token } }
        );
        const effList = effRes.data?.responsePayload?.content || [];
        effectivenessMap = Object.fromEntries(
          effList.map(eff => [eff.id, eff.translations?.en?.description || eff.code || eff.id])
        );
      } catch (e) { effectivenessMap = {}; }
    }
    for (const prices of Object.values(priceMapByEntity)) {
      for (const p of prices) {
        p._effectivenessDesc = effectivenessMap[p.effectivenessGroup || p.effectivenessGroupId] || p.effectivenessGroup;
      }
    }

    const groupIds = [...new Set(allArticles.map(a => a.articleGroup || a.article_group).filter(Boolean))];
    let groupDetailsMap = {};
    if (groupIds.length > 0) {
      try {
        const groupRes = await axios.get(
          `${config.baseUrl}/pos/v1/article-groups?search=entityId=in=(${groupIds.join(',')})`,
          { headers: { Authorization: token } }
        );
        const groupDetails = groupRes.data?.responsePayload?.content || [];
        groupDetailsMap = Object.fromEntries(
          groupDetails.map(g => [
            g.entityId,
            {
              code: g.cd || g.code || '-',
              description: (g.translations?.en?.description || g.translations?.it?.description || '-')
            }
          ])
        );
      } catch (e) { groupDetailsMap = {}; }
    }

    const enriched = allArticles.map(a => {
      const priceList = (priceMapByEntity[a.entityId] || []).map(p => ({
        id: p.id,
        price: p.price,
        classificationSeq: p.classificationSeq !== undefined ? p.classificationSeq : p.classification_seq,
        effectivenessGroup: p._effectivenessDesc,
        priceSeq: p.priceSeq,
        levelType: `${p.mainLevels?.level1 || ''} / ${p.subLevels?.level1 || ''} / ${p.customLevels?.level1 || ''}`
      }));
      priceList.sort((a, b) => Number(a.priceSeq || 0) - Number(b.priceSeq || 0));
      let groupCode = '-';
      let groupDesc = '-';
      const groupId = a.articleGroup || a.article_group;
      if (groupId && groupDetailsMap[groupId]) {
        groupCode = groupDetailsMap[groupId].code;
        groupDesc = groupDetailsMap[groupId].description;
      }
      const articleClassStuff = articleClassDetailsMap[a.entityId] || {};
      const articleClasses = articleClassDetailsListMap[a.entityId] || (articleClassStuff.articleClassCode ? [{ code: articleClassStuff.articleClassCode, description: articleClassStuff.articleClassDescription }] : []);
      return {
        code: a.code,
        description: a.translations?.en?.description || '-',
        entityId: a.entityId,
        groupCode,
        groupDesc,
        groupId,
        isEnabled: !!a.enabled,
        hierarchyId: a.hierarchyId,
        inherited: !!a.inherited,
        fullArticle: a,
        prices: priceList,
        articleClassCode: articleClassStuff.articleClassCode || '-',
        articleClassDescription: articleClassStuff.articleClassDescription || '-',
        articleClassId: articleClassStuff.articleClassId || null,
        articleClasses
      };
    });

    res.render('index', {
      results: enriched,
      code,
      description,
      externalCode,
      user: req.session.username,
      hierarchyLevels,
      hierarchyId
    });
  } catch (err) {
    let hierarchyLevels = [];
    try {
      hierarchyLevels = await helpers.getHierarchyLevels(await helpers.getOtalioToken(req));
    } catch {
      hierarchyLevels = [{ id: 1, description: 'Enterprise', nave: '' }];
    }
    res.render('index', {
      results: [],
      code,
      description,
      externalCode,
      user: req.session.username,
      hierarchyLevels,
      hierarchyId
    });
  }
};

exports.getAllClasses = async (req, res) => {
  try {
    const token = await helpers.getOtalioToken(req);
    const classes = await helpers.getAllClasses(token);
    const dropdownList = classes.map(c => ({
      code: c.code || c.cd || '-',
      description: (c.translations?.en?.description || c.translations?.it?.description || c.description || '-')
    }));
    res.json({ success: true, classes: dropdownList });
  } catch (err) {
    res.json({ success: false, classes: [] });
  }
};

exports.getAllGroups = async (req, res) => {
  try {
    const token = await helpers.getOtalioToken(req);
    const groups = await helpers.getAllGroups(token);
    const dropdownList = groups.map(g => ({
      entityId: g.entityId,
      code: g.cd || g.code || '-',
      description: (g.translations?.en?.description || g.translations?.it?.description || '-')
    }));
    res.json({ success: true, groups: dropdownList });
  } catch (err) {
    res.json({ success: false, groups: [] });
  }
};

exports.deleteOverride = async (req, res) => {
  const { entityId, hierarchyId } = req.body;
  if (!entityId || !hierarchyId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    const token = await helpers.getOtalioToken(req);
    await helpers.deleteOverride(entityId, hierarchyId, token);
    res.json({ success: true });
  } catch (err) {
    let message = err.message || "Error during disable or delete override";
    res.status(500).json({ error: message });
  }
};

exports.overrideArticle = async (req, res) => {
  const { article, targetHierarchyId } = req.body;
  if (!article || !targetHierarchyId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    const token = await helpers.getOtalioToken(req);
    const response = await helpers.overrideArticle(article, targetHierarchyId, token);
    res.json({ success: true, response });
  } catch (err) {
    res.status(500).json({ error: 'Article override error', details: err.message });
  }
};

exports.updatePrice = async (req, res) => {
  const { priceId, newPrice, hierarchyId } = req.body;
  if (!priceId || newPrice === undefined) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    const token = await helpers.getOtalioToken(req);
    await helpers.updatePrice(priceId, newPrice, hierarchyId, token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error updating price' });
  }
};

exports.updateDescription = async (req, res) => {
  const { entityId, nuovaDescrizione, hierarchyId } = req.body;
  if (!entityId || !nuovaDescrizione || !hierarchyId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    const token = await helpers.getOtalioToken(req);
    await helpers.updateDescription(entityId, nuovaDescrizione, hierarchyId, token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error updating description' });
  }
};

exports.updateEnable = async (req, res) => {
  const { entityId, newEnable, hierarchyId } = req.body;
  if (!entityId || typeof newEnable === "undefined" || !hierarchyId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    const token = await helpers.getOtalioToken(req);
    await helpers.updateEnable(entityId, newEnable, hierarchyId, token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error updating enabled/disabled status' });
  }
};

exports.updateGroup = async (req, res) => {
  const { entityId, nuovoGroupId, hierarchyId } = req.body;
  if (!entityId || !nuovoGroupId || !hierarchyId) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  try {
    const token = await helpers.getOtalioToken(req);
    await helpers.updateGroup(entityId, nuovoGroupId, hierarchyId, token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error updating article group' });
  }
};

exports.updateArticleClassCode = async (entityId, newClassCode, otalioToken, hierarchyId = 1) => {
  return helpers.updateArticleClassCode(entityId, newClassCode, otalioToken, hierarchyId);
};