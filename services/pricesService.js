const axios = require('axios');
const config = require('../config.json');
const fs = require('fs');
const path = require('path');

const hierarchyMapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/OT_HIERARCHY.json'), 'utf8')
);

const effMapping = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/OT_EFGroup.json'), 'utf8')
);

function getHierarchyDescrizione(hierarchyId) {
  return hierarchyMapping[String(hierarchyId)] || hierarchyId;
}

function getEffDescrizione(effId) {
  return effMapping[String(effId)] || effId;
}

async function getPrices(entityId) {
  const url = `${config.baseUrl}/pos/v1/article-prices?search=articleEntityId==${entityId}&contextSearch=true`;
  const auth = { username: config.apiUsername, password: config.apiPassword };

  const res = await axios.get(url, { auth });
  const content = res.data?.responsePayload?.content || [];

  // Mapping dei prezzi con descrizione gerarchia ed Eff
  const prezzi = content.map(p => {
    return {
      id: p.id,
      price: p.price,
      effectivenessGroup: getEffDescrizione(p.effectivenessGroup),
      priceSeq: p.priceSeq,
      levelType: getLevelLabel(p),
      gerarchia: getHierarchyDescrizione(p.hierarchyId)
    };
  });

  // Ordinamento: gerarchia > seq > livello
  prezzi.sort((a, b) => {
    if (a.gerarchia < b.gerarchia) return -1;
    if (a.gerarchia > b.gerarchia) return 1;
    if (a.priceSeq < b.priceSeq) return -1;
    if (a.priceSeq > b.priceSeq) return 1;
    if (a.levelType < b.levelType) return -1;
    if (a.levelType > b.levelType) return 1;
    return 0;
  });

  return prezzi;
}

function getLevelLabel(p) {
  const m = Object.entries(p.mainLevels || {}).find(([k, v]) => v)?.[0];
  const s = Object.entries(p.subLevels || {}).find(([k, v]) => v)?.[0];
  const c = Object.entries(p.customLevels || {}).find(([k, v]) => v)?.[0];
  return [m, s, c].filter(Boolean).join('/');
}

module.exports = { getPrices };