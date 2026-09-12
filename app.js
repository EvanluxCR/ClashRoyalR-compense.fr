
(() => {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));

  const apiState = document.querySelector('[data-api-state]');
  if (apiState && typeof API_BASE !== 'undefined') {
    fetch(`${API_BASE}/health`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { apiState.innerHTML = `<span class="status-dot"></span>API en ligne`; apiState.title = `Worker v${d.version || '?'}`; })
      .catch(() => { apiState.textContent = 'API indisponible'; });
  }
})();
