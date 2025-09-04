document.addEventListener('DOMContentLoaded', function () {
  // Event delegation: works also on buttons added later!
  document.body.addEventListener('click', async function(e) {
    const btn = e.target.closest('.btn-query-prezzi');
    if (!btn) return;
    const entityId = btn.dataset.entityId || btn.getAttribute('data-entity-id');
    const codice = btn.dataset.code || btn.getAttribute('data-code');
    const descrizione = btn.dataset.description || btn.getAttribute('data-description');
    if (!entityId) return alert('Article EntityId missing!');
    const modal = document.getElementById('queryPrezziModal');
    const table = document.getElementById('queryPrezziTable');
    const header = document.getElementById('queryPrezziModalHeader');
    modal.style.display = 'block';
    table.innerHTML = '<tr><td colspan="10">Loading...</td></tr>';
    header.innerHTML = `<b>${codice || ''}</b> ${descrizione || ''}`;
    try {
      const resp = await fetch(`/query-prices?entityId=${encodeURIComponent(entityId)}`);
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || 'Error');
      if (!json.prezzi || json.prezzi.length === 0) {
        table.innerHTML = '<tr><td colspan="10">No prices found.</td></tr>';
      } else {
        table.innerHTML = '';
        json.prezzi.forEach(p => {
  table.innerHTML += `
    <tr>
      <td>${p.gerarchia}</td>
      <td>${p.price}</td>
      <td>${p.effectivenessGroup}</td>
      <td>${p.priceSeq}</td>
      <td>${p.levelType}</td>
    </tr>
  `;
});
      }
    } catch (e) {
      table.innerHTML = `<tr><td colspan="10">Error: ${e.message}</td></tr>`;
    }
  });

  const closeBtn = document.getElementById('closeQueryModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('queryPrezziModal').style.display = 'none';
    });
  }
});