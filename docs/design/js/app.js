/* Audicon — Shared App JS */

// Sidebar toggle (mobile/tablet)
function initSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const openBtn = document.querySelector('.topbar-menu-btn');
  if (!sidebar) return;

  function open() {
    sidebar.classList.add('open');
    overlay && overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    sidebar.classList.remove('open');
    overlay && overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  openBtn && openBtn.addEventListener('click', open);
  overlay && overlay.addEventListener('click', close);
}

// Modal helper
function initModals() {
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.modalOpen);
      target && target.classList.add('open');
    });
  });

  document.querySelectorAll('[data-modal-close], .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
      if (el.classList.contains('modal-overlay') && e.target !== el) return;
      const overlay = el.closest('.modal-overlay') || document.getElementById(el.dataset.modalClose);
      overlay && overlay.classList.remove('open');
    });
  });
}

// Tab switching
function initTabs() {
  document.querySelectorAll('.tabs').forEach(tabGroup => {
    const items = tabGroup.querySelectorAll('.tab-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const target = item.dataset.tab;
        if (target) {
          document.querySelectorAll('[data-tab-panel]').forEach(panel => {
            panel.style.display = panel.dataset.tabPanel === target ? '' : 'none';
          });
        }
      });
    });
  });
}

// Simulate nav active state from URL hash
function initNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    if (item.dataset.page === path) item.classList.add('active');
  });
}

// Toast notification
function showToast(message, type = 'success') {
  const existing = document.getElementById('toast-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 9999;
    display: flex; flex-direction: column; gap: 8px;
  `;

  const toast = document.createElement('div');
  const colors = {
    success: '#16a34a',
    error:   '#dc2626',
    info:    '#2563eb',
    warning: '#d97706',
  };

  toast.style.cssText = `
    background: #0f172a; color: white; padding: 10px 16px;
    border-radius: 8px; font-size: 13.5px; font-family: inherit;
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-left: 3px solid ${colors[type] || colors.info};
    animation: slideIn 0.2s ease;
    max-width: 340px;
  `;

  toast.innerHTML = `
    <style>@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}</style>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  document.body.appendChild(container);

  setTimeout(() => { container.style.opacity = '0'; setTimeout(() => container.remove(), 300); }, 3000);
}

// Initialize all on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initModals();
  initTabs();
  initNav();
});
