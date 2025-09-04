const axios = require('axios');
const config = require('./config.json');

async function getHierarchyLevels(token) {
  const res = await axios.get(`${config.baseUrl}/metadata/v1/hierarchies-pageable`, {
    headers: { Authorization: token }
  });
  const items = res.data?.responsePayload?.content || [];
  return items
    .map(h => ({
      id: h.id,
      name: h.translations?.en?.description || h.code || `Hierarchy ${h.id}`
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { getHierarchyLevels };