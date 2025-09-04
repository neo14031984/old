const axios = require('axios');
const config = require('../config.json');
const NAVI_MAP = require('../utils/naviMap');

async function getHierarchyLevels(token) {
  try {
    const res = await axios.get(`${config.baseUrl}/metadata/v1/hierarchies-pageable`, {
      headers: { Authorization: token }
    });
    const items = res.data?.responsePayload?.content || [];
    return items
      .map(h => ({
        id: h.id,
        description: h.translations?.en?.description || h.code || `Hierarchy ${h.id}`,
        nave: NAVI_MAP[h.parentHierarchyId] || ''
      }))
      .sort((a, b) => (a.description).localeCompare(b.description));
  } catch (e) {
    return [{ id: 1, description: 'Enterprise', nave: '' }];
  }
}

async function getAllGroups(token) {
  try {
    const groups = [];
    let page = 0;
    let totalPages = 1;
    while (page < totalPages) {
      const res = await axios.get(`${config.baseUrl}/pos/v1/article-groups?page=${page}&size=200`, {
        headers: { Authorization: token }
      });
      const payload = res.data?.responsePayload;
      if (payload?.content) groups.push(...payload.content);
      totalPages = payload?.totalPages || 1;
      page++;
    }
    return groups;
  } catch (e) {
    return [];
  }
}

module.exports = {
  getHierarchyLevels,
  getAllGroups,
  NAVI_MAP
};