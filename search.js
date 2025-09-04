const axios = require('axios');
const config = require('./config.json');

async function searchArticlePrices(articleEntityId) {
  const url = `${config.baseUrl}${config.articlePricesEndpoint}?search=articleEntityId==${articleEntityId}&contextSearch=true`;
  const auth = {
    username: config.apiUsername,
    password: config.apiPassword
  };

  try {
    const res = await axios.get(url, { auth });
    const items = res.data?.responsePayload?.content || [];

    const output = items.map(p => {
      const main = Object.entries(p.mainLevels || {}).find(([k, v]) => v)?.[0] || '-';
      const sub = Object.entries(p.subLevels || {}).find(([k, v]) => v)?.[0] || '-';
      const custom = Object.entries(p.customLevels || {}).find(([k, v]) => v)?.[0] || '-';

      return {
        id: p.id,
        price: p.price,
        effectivenessGroup: p.effectivenessGroup,
        priceSeq: p.priceSeq,
        levelType: `${main}/${sub}/${custom}`
      };
    });

    return output;
  } catch (err) {
    console.error('❌ API Error:', err.response?.data || err.message);
    return [];
  }
}

module.exports = { searchArticlePrices };
