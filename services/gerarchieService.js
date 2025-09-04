const fs = require('fs');
const path = require('path');

const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/OT_HIERARCHY.json'), 'utf8'));

function getGerarchiaDescrizione(hierarchyId) {
  return mapping[hierarchyId] || hierarchyId; // fallback all'id se non trovato
}

module.exports = { getGerarchiaDescrizione };