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
        const price = item.price_in_inr_per_kg || '';
        return `<div class="product-card">
                  <div class="product-card-title">${escapeHtml(title)}</div>
                  <div class="product-card-desc">${desc}</div>
                  <div><strong>Price:</strong> ${escapeHtml(price)}</div>
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
