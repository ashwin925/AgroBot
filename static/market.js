document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('market-search');
  const btn = document.getElementById('market-search-btn');
  const results = document.getElementById('market-results');

  async function search(product) {
    results.innerHTML = '<p>Searching...</p>';
    try {
      const res = await fetch(`/market_online?product=${encodeURIComponent(product)}`);
      const data = await res.json();
      if (data.error) {
        results.innerHTML = `<div class="product-card">Error: ${escapeHtml(data.error)}</div>`;
        return;
      }
      if (!data.results || !data.results.length) {
        results.innerHTML = `<div class="product-card">No results found for ${escapeHtml(product)}</div>`;
        return;
      }
      results.innerHTML = data.results.map(item => {
        const title = item.title || product;
        const desc = (item.description || '').replace(/\n/g, '<br/>');
        const price = item.price_in_inr_per_kg || item.price || '';
        const extra = item.extra || item.details || null;
        const image = item.image || '';
        let extraHtml = '';
        if (extra && typeof extra === 'object') {
          Object.keys(extra).forEach(k => {
            extraHtml += `<div class="product-card-extra"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(extra[k]))}</div>`;
          });
        } else if (extra) {
          extraHtml = `<div class="product-card-extra">${escapeHtml(String(extra))}</div>`;
        }

        const imgHtml = image ? `<div><img src="${escapeHtml(image)}" style="max-width:160px;border-radius:8px;"/></div>` : '';

        return `<div class="product-card">
                  <div style="display:flex;gap:12px;align-items:flex-start;">
                    ${imgHtml}
                    <div>
                      <div class="product-card-title">${escapeHtml(title)}</div>
                      <div class="product-card-desc">${desc}</div>
                      <div class="product-card-price"><strong>Price:</strong> ${escapeHtml(price)}</div>
                      ${extraHtml}
                    </div>
                  </div>
                </div>`;
      }).join('');
    } catch (e) {
      results.innerHTML = `<div class="product-card">Failed to fetch data: ${escapeHtml(String(e))}</div>`;
    }
  }

  btn.addEventListener('click', () => {
    const v = input.value.trim();
    if (!v) return alert('Enter a product to search');
    search(v);
  });

  // helper
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
});
