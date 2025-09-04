const express = require('express');
const router = express.Router();
const pricesService = require('../services/pricesService');

router.get('/', async (req, res) => {
  const entityId = req.query.entityId;
  if (!entityId) return res.status(400).json({ error: 'entityId mancante' });

  try {
    const prezzi = await pricesService.getPrices(entityId);
    res.json({ success: true, prezzi });
  } catch (err) {
    res.status(500).json({ error: 'Price query error', details: err.message });
  }
});

module.exports = router;