const axios = require('axios');
const config = require('../config.json');
const { getHierarchyLevels, getAllGroups } = require('./otalioService');

async function getOtalioToken(req) {
  return req.session.otalioToken;
}

async function getArticleClassDetails(articleEntityIds, token) {
  try {
    const classifQuery = articleEntityIds.length === 1
      ? `articleEntityId==${articleEntityIds[0]}`
      : `articleEntityId=in=(${articleEntityIds.join(',')})`;
    const url = `${config.baseUrl}/pos/v1/article-classifications?search=${encodeURIComponent(classifQuery)};hierarchyId==1;isDeleted==false`;

    const classifRes = await axios.get(url, { headers: { Authorization: token } });

    const classifContent = classifRes.data?.responsePayload?.content || [];

    const articleClassIds = [...new Set(classifContent.map(r => r.articleClass).filter(Boolean))];

    let articleClassMap = {};
    let articleClassDescMap = {};
    if (articleClassIds.length > 0) {
      const classRes = await axios.get(
        `${config.baseUrl}/pos/v1/article-classes?search=entityId=in=(${articleClassIds.join(',')})`,
        { headers: { Authorization: token } }
      );
      const classList = classRes.data?.responsePayload?.content || [];
      articleClassMap = Object.fromEntries(
        classList.map(row => [row.entityId, row.cd || row.code || '-'])
      );
      articleClassDescMap = Object.fromEntries(
        classList.map(row => [
          row.entityId,
          row.translations?.en?.description || row.description || row.cd || row.code || '-'
        ])
      );
    }

    const mapping = classifContent.map(row => ({
      articleEntityId: row.articleEntityId,
      articleClassId: row.articleClass || null,
      articleClassCode: articleClassMap[row.articleClass] || '-',
      articleClassDescription: articleClassDescMap[row.articleClass] || '-',
      classificationSeq: row.classificationSeq,
      hierarchyId: row.hierarchyId,
    }));

    return mapping;
  } catch (error) {
    throw error;
  }
}

async function updateArticleClassCode(entityId, newClassCode, token, hierarchyId = 1) {
  const classifRes = await axios.get(
    `${config.baseUrl}/pos/v1/article-classifications?search=articleEntityId==${entityId};hierarchyId==${hierarchyId}`,
    { headers: { Authorization: token } }
  );
  const classifRow = classifRes.data?.responsePayload?.content?.[0];
  if (!classifRow) throw new Error('You cannot modify the ArticleClass at this hierarchical level');

  const classRes = await axios.get(
    `${config.baseUrl}/pos/v1/article-classes?search=code==${newClassCode}`,
    { headers: { Authorization: token } }
  );
  const classRow = classRes.data?.responsePayload?.content?.[0];
  if (!classRow) throw new Error('Article class not found by code');

  classifRow.articleClass = classRow.entityId;

  await axios.put(
    `${config.baseUrl}/pos/v1/article-classifications/${classifRow.entityId}?hierarchyId=${hierarchyId}`,
    classifRow,
    { headers: { Authorization: token } }
  );

  return true;
}

async function deleteOverride(entityId, hierarchyId, token) {
  const articleRes = await axios.get(
    `${config.baseUrl}/pos/v1/articles/${entityId}`,
    { headers: { Authorization: token } }
  );
  const articleData = articleRes.data?.responsePayload;
  if (!articleData) throw new Error('Article not found (disable step)');

  articleData.enabled = false;
  if ('is_enabled' in articleData) delete articleData.is_enabled;

  await axios.put(
    `${config.baseUrl}/pos/v1/articles/${entityId}?hierarchyId=${hierarchyId}`,
    articleData,
    { headers: { Authorization: token } }
  );
  const payload = [{ entityId, hierarchyId }];
  await axios.post(
    `${config.baseUrl}/pos/v1/articles/delete`,
    payload,
    { headers: { Authorization: token } }
  );
  return true;
}

async function overrideArticle(article, targetHierarchyId, token) {
  const overridePayload = { ...article };
  overridePayload.hierarchyId = targetHierarchyId;
  overridePayload.priority = overridePayload.priority && overridePayload.priority >= 1 ? overridePayload.priority : 1;
  overridePayload.articleGroup = overridePayload.articleGroup
    || overridePayload.groupId
    || overridePayload.group_id
    || '';
  overridePayload.enabled = true;
  delete overridePayload.id;
  delete overridePayload.when;
  delete overridePayload.creationDTTMLocal;
  delete overridePayload.updatedDTTMLocal;
  delete overridePayload.prices;
  delete overridePayload.fullArticle;
  delete overridePayload.groupCode;
  delete overridePayload.groupDesc;
  delete overridePayload.isEnabled;
  delete overridePayload.inherited;
  delete overridePayload.targetHierarchyId;

  Object.keys(overridePayload).forEach(k => {
    if (overridePayload[k] === null && k !== 'comments') {
      delete overridePayload[k];
    }
    if (Array.isArray(overridePayload[k]) && overridePayload[k].length === 0) {
      delete overridePayload[k];
    }
  });

  if (!overridePayload.translations || !overridePayload.translations.en) {
    overridePayload.translations = {
      en: { description: overridePayload.description || '' }
    };
  }

  const response = await axios.post(
    `${config.baseUrl}/pos/v1/articles`,
    overridePayload,
    { headers: { Authorization: token } }
  );
  return response.data;
}

async function updatePrice(priceId, newPrice, hierarchyId, token) {
  const usedHierarchyId = hierarchyId || 1;
  const priceRes = await axios.get(`${config.baseUrl}${config.articlePricesEndpoint}?search=id==${priceId}&contextSearch=true`, {
    headers: { Authorization: token }
  });
  const priceData = priceRes.data?.responsePayload?.content?.[0];
  if (!priceData) throw new Error('Price not found');

  priceData.price = String(newPrice);
  delete priceData.hierarchyId;
  await axios.put(
    `${config.baseUrl}${config.articlePricesEndpoint}/${priceData.entityId}?hierarchyId=${usedHierarchyId}`,
    priceData,
    { headers: { Authorization: token } }
  );
  return true;
}

async function updateDescription(entityId, nuovaDescrizione, hierarchyId, token) {
  const articleRes = await axios.get(`${config.baseUrl}/pos/v1/articles/${entityId}`, {
    headers: { Authorization: token }
  });
  const articleData = articleRes.data?.responsePayload;
  if (!articleData) throw new Error('Article not found');

  articleData.translations = articleData.translations || {};
  articleData.translations.en = articleData.translations.en || {};
  articleData.translations.en.description = nuovaDescrizione;

  await axios.put(
    `${config.baseUrl}/pos/v1/articles/${entityId}?hierarchyId=${hierarchyId}`,
    articleData,
    { headers: { Authorization: token } }
  );
  return true;
}

async function updateEnable(entityId, newEnable, hierarchyId, token) {
  const articleRes = await axios.get(
    `${config.baseUrl}/pos/v1/articles/${entityId}?hierarchyId=${hierarchyId}`,
    { headers: { Authorization: token } }
  );
  const articleData = articleRes.data?.responsePayload;
  if (!articleData) throw new Error('Article not found (missing override)');
  articleData.enabled = !!newEnable;
  if ('is_enabled' in articleData) delete articleData.is_enabled;
  await axios.put(
    `${config.baseUrl}/pos/v1/articles/${entityId}?hierarchyId=${hierarchyId}`,
    articleData,
    { headers: { Authorization: token } }
  );
  return true;
}

async function updateGroup(entityId, nuovoGroupId, hierarchyId, token) {
  const articleRes = await axios.get(
    `${config.baseUrl}/pos/v1/articles/${entityId}?hierarchyId=${hierarchyId}`,
    { headers: { Authorization: token } }
  );
  const articleData = articleRes.data?.responsePayload;
  if (!articleData) throw new Error('Article not found (missing override)');
  articleData.articleGroup = nuovoGroupId;
  await axios.put(
    `${config.baseUrl}/pos/v1/articles/${entityId}?hierarchyId=${hierarchyId}`,
    articleData,
    { headers: { Authorization: token } }
  );
  return true;
}

async function getAllClasses(token) {
  const url = `${config.baseUrl}/pos/v1/article-classes`;
  const res = await axios.get(url, { headers: { Authorization: token } });
  return res.data?.responsePayload?.content || [];
}

module.exports = {
  getOtalioToken,
  getArticleClassDetails,
  updateArticleClassCode,
  getAllGroups,
  getHierarchyLevels,
  deleteOverride,
  overrideArticle,
  updatePrice,
  updateDescription,
  updateEnable,
  updateGroup,
  getAllClasses
};