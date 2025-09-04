document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', async function(e) {
    const btn = e.target.closest('.badge-edit-class');
    if (!btn) return;

    if (btn.getAttribute('disabled') !== null) return;

    const entityId = btn.getAttribute('data-entity-id');
    const oldCode = btn.getAttribute('data-class-code');
    if (!entityId || !oldCode) {
      alert('Missing attributes! (entity-id/class-code)');
      return;
    }

    const inputEntity = document.getElementById('editClassEntityId');
    const inputOldCode = document.getElementById('editClassOldCode');
    if (!inputEntity || !inputOldCode) {
      alert('Hidden field not found! Check DOM/modal.');
      return;
    }
    inputEntity.value = entityId;
    inputOldCode.value = oldCode;

    let classList = window.articleClassList;
    if (!classList) {
      try {
        const res = await fetch('/pos/v1/article-classes');
        const json = await res.json();
        if (Array.isArray(json)) classList = json;
        else if (json.success && Array.isArray(json.classes)) classList = json.classes;
        else classList = [];
        window.articleClassList = classList;
      } catch (err) {
        classList = [];
      }
    }

    setTimeout(function() {
      const select = $('#editClassNewCode');
      if (select.length && typeof select.select2 === 'function') {
        select.select2({
          dropdownParent: $('#modalEditArticleClass'),
          width: '100%'
        });
      }
    }, 0);

    function renderClassOptions(filter = "") {
      const select = document.getElementById('editClassNewCode');
      if (!select) return;
      select.innerHTML = '<option value="">Select...</option>';
      classList
        .filter(c => {
          if (!filter) return true;
          const txt = `${c.code} ${c.description}`.toLowerCase();
          return txt.includes(filter.toLowerCase());
        })
        .forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.code;
          opt.textContent = `${c.code} — ${c.description}`;
          if (c.code === oldCode) opt.selected = true;
          select.appendChild(opt);
        });
      if (typeof $ !== "undefined" && typeof $('#editClassNewCode').select2 === "function") {
        $('#editClassNewCode').trigger('change.select2');
      }
    }
    renderClassOptions();

    const searchInput = document.getElementById('editClassSearch');
    if (searchInput) {
      searchInput.value = '';
      searchInput.oninput = () => renderClassOptions(searchInput.value);
    }

    const modalEl = document.getElementById('modalEditArticleClass');
    if (!modalEl) {
      alert('ArticleClass modal not found! Check that the ID is correct.');
      return;
    }
    if (typeof bootstrap === "undefined" || !bootstrap.Modal) {
      alert('Bootstrap JS is not loaded! The modal cannot open.');
      return;
    }
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  });

  document.querySelectorAll('.override-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const entityId = btn.getAttribute('data-entityid');
      const hierarchyId = btn.getAttribute('data-hierarchyid');
      const article = window.articles && window.articles.find(a => a.entityId === entityId);
      if (!article) return alert('Article not found!');
      const response = await fetch('/overrideArticle', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ article, targetHierarchyId: hierarchyId })
      });
      const res = await response.json();
      if (res.success) {
        alert('Override created successfully!');
        location.reload();
      } else {
        alert('Error: ' + (res.error || 'Unexpected error'));
      }
    });
  });

  document.querySelectorAll('.badge-delete-override').forEach(btn => {
    btn.addEventListener('click', async function() {
      if (!confirm('Are you sure you want to delete this override?')) return;
      const entityId = btn.getAttribute('data-entity-id');
      const hierarchyId = btn.getAttribute('data-entity-id');
      const response = await fetch('/deleteOverride', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ entityId, hierarchyId })
      });
      const res = await response.json();
      if (res.success) {
        alert('Override deleted successfully!');
        location.reload();
      } else {
        alert('Error: ' + (res.error || 'Unexpected error'));
      }
    });
  });

  const formEditClass = document.getElementById('formEditArticleClass');
  if (formEditClass) {
    formEditClass.addEventListener('submit', async function(e) {
      e.preventDefault();
      const entityId = document.getElementById('editClassEntityId').value;
      const newClassCode = document.getElementById('editClassNewCode').value;
      if (!entityId || !newClassCode) return alert('Fill in all fields!');
      const response = await fetch('/update-article-class-code', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ entityId, newClassCode })
      });
      const res = await response.json();
      if (res.success) {
        alert('ArticleClass Code updated successfully!');
        location.reload();
      } else {
        alert('Error: ' + (res.error || 'Unexpected error'));
      }
    });
  }

  if (typeof $ !== 'undefined' && $('#hierarchy-select').length) {
    $('#hierarchy-select').on('select2:select', function(e) {
      const searchBtn = document.querySelector('button[type="submit"], button.btn-primary');
      if (searchBtn) {
        searchBtn.click();
      } else {
        const form = $('#hierarchy-select').closest('form')[0];
        if (form) form.submit();
      }
    });
  }
});