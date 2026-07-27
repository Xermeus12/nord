(() => {
  'use strict';
  const cfg = window.SITE_CONFIG || {};
  const projects = Array.isArray(window.PROJECTS) ? window.PROJECTS : [];
  const readyHomes = Array.isArray(window.READY_HOMES) ? window.READY_HOMES : [];
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const setText = (selector, value) => value && $$(selector).forEach((el) => { el.textContent = value; });
  const setHref = (selector, value) => value && $$(selector).forEach((el) => { el.href = value; });
  setText('[data-brand]', cfg.brand);
  setText('[data-descriptor]', cfg.descriptor);
  setText('[data-phone]', cfg.phone);
  setText('[data-telegram-label]', cfg.telegramLabel);
  setHref('[data-phone-link]', `tel:${cfg.phoneHref || ''}`);
  setHref('[data-telegram]', cfg.telegram);
  setHref('[data-max]', cfg.max);
  if (cfg.address) setText('[data-address]', cfg.address);

  const goal = (name, params = {}) => {
    if (!name) return;
    if (typeof window.ym === 'function' && cfg.yandexMetrikaId) window.ym(cfg.yandexMetrikaId, 'reachGoal', name, params);
  };
  $$('[data-goal]').forEach((el) => el.addEventListener('click', () => goal(el.dataset.goal)));

  if (cfg.yandexMetrikaId) {
    window.ym = window.ym || function(){(window.ym.a=window.ym.a||[]).push(arguments)};
    window.ym.l = 1 * new Date();
    const s = document.createElement('script'); s.async = true; s.src = 'https://mc.yandex.ru/metrika/tag.js'; document.head.appendChild(s);
    window.ym(cfg.yandexMetrikaId, 'init', { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });
  }

  const header = $('[data-header]');
  const scrollTop = $('[data-scroll-top]');
  const onScroll = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 14);
    scrollTop?.classList.toggle('is-visible', window.scrollY > 650);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive:true });
  scrollTop?.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));

  const menuButton = $('[data-menu-toggle]');
  const nav = $('#site-nav');
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.classList.toggle('is-open', open);
    nav?.classList.toggle('is-open', open);
  });
  $$('#site-nav a').forEach((link) => link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded','false'); menuButton?.classList.remove('is-open'); nav?.classList.remove('is-open');
  }));

  const grid = $('[data-project-grid]');
  const projectCard = (p) => `
    <article class="project-card reveal" data-project-id="${p.id}" data-type="${p.type}" data-categories="${[p.type,...p.category].join(' ')}">
      <div class="project-card__media"><img src="${p.image}" alt="${p.title}" loading="lazy"><img class="project-card__plan-thumb" src="${p.plan}" alt="Планировка ${p.title}" loading="lazy"><span class="project-card__badge">${p.badge}</span><span class="project-card__plan-label">Планировка</span></div>
      <div class="project-card__body">
        <div class="project-card__meta"><span>${p.location}</span><span>${p.area}</span></div>
        <h3>${p.title}</h3>
        <p class="project-card__description">${p.description}</p>
        <div class="project-card__specs"><span>${p.bedrooms}</span><span>${p.floors}</span><span>${p.bathrooms}</span></div>
        <div class="project-card__finance"><span><small>Взнос</small><strong>${p.downPayment || 'по расчёту'}</strong></span><span><small>Платёж</small><strong>${p.monthlyPayment || 'по расчёту'}</strong></span></div>
        <div class="project-card__foot"><strong>${p.price}</strong><button class="project-card__open" type="button" data-open-project="${p.id}">Подробнее ↗</button></div>
      </div>
    </article>`;
  if (grid) grid.innerHTML = projects.map(projectCard).join('');

  const filters = $$('[data-filter]');
  filters.forEach((button) => button.addEventListener('click', () => {
    filters.forEach((b) => b.classList.toggle('active', b === button));
    const value = button.dataset.filter;
    $$('.project-card').forEach((card) => card.classList.toggle('is-hidden', value !== 'all' && !card.dataset.categories.split(' ').includes(value)));
    goal('project_filter', { filter:value });
  }));

  const readyGrid = $('[data-ready-grid]');
  const money = (value) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
  const readyRow = (home) => `
    <article class="inventory__row" data-ready-community="${home.community}">
      <div class="inventory__object"><strong>${home.address}</strong><small>${home.community}</small></div>
      <span>${home.community}</span>
      <span><b>${home.area}</b><small>${home.lot}</small></span>
      <span><b>${home.finish}</b><small>${home.areaWithTerrace}</small></span>
      <span class="inventory__price">${money(home.price)}</span>
      <span><i class="status ${home.stage === 'Готов полностью' ? 'status--free' : 'status--hold'}">${home.stage}</i></span>
      <span class="inventory__links"><a href="${home.gallery}" target="_blank" rel="noopener">Фото ↗</a><a href="${home.plan}" target="_blank" rel="noopener">План ↗</a></span>
    </article>`;
  if (readyGrid) readyGrid.innerHTML = readyHomes.map(readyRow).join('');
  $$('[data-ready-filter]').forEach((button) => button.addEventListener('click', () => {
    $$('[data-ready-filter]').forEach((b) => b.classList.toggle('active', b === button));
    const value = button.dataset.readyFilter;
    $$('.inventory__row', readyGrid).forEach((row) => row.classList.toggle('is-hidden', value !== 'all' && row.dataset.readyCommunity !== value));
    goal('ready_filter', { location:value });
  }));

  $$('[data-market-tab]').forEach((button) => button.addEventListener('click', () => {
    const value = button.dataset.marketTab;
    $$('[data-market-tab]').forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    $$('[data-market-panel]').forEach((panel) => {
      const active = panel.dataset.marketPanel === value;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    goal('market_tab', { market:value });
  }));

  $$('[data-plot-request]').forEach((link) => link.addEventListener('click', () => {
    const select = $('[name="interest"]');
    if (select) select.value = 'Земельный участок';
    goal('plot_request');
  }));

  const modal = $('[data-project-modal]');
  const modalNodes = {
    image:$('[data-modal-image]'), badge:$('[data-modal-badge]'), location:$('[data-modal-location]'), title:$('[data-modal-title]'), description:$('[data-modal-description]'),
    area:$('[data-modal-area]'), bedrooms:$('[data-modal-bedrooms]'), floors:$('[data-modal-floors]'), price:$('[data-modal-price]'),
    downPayment:$('[data-modal-downpayment]'), monthly:$('[data-modal-monthly]'), plan:$('[data-modal-plan]')
  };
  const openModal = (id) => {
    const p = projects.find((item) => item.id === id); if (!p || !modal) return;
    modalNodes.image.src=p.image; modalNodes.image.alt=p.title; modalNodes.badge.textContent=p.badge; modalNodes.location.textContent=p.location;
    modalNodes.title.textContent=p.title; modalNodes.description.textContent=p.description; modalNodes.area.textContent=p.area; modalNodes.bedrooms.textContent=p.bedrooms;
    modalNodes.floors.textContent=p.floors; modalNodes.price.textContent=p.price; modalNodes.downPayment.textContent=p.downPayment || 'по расчёту';
    modalNodes.monthly.textContent=p.monthlyPayment || 'по расчёту'; modalNodes.plan.src=p.plan; modalNodes.plan.alt=`Планировка ${p.title}`;
    modalNodes.image.dataset.viewerSrc = p.poster || p.image;
    modalNodes.plan.dataset.viewerSrc = p.plan;
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
    goal('project_open', { project:p.id });
    setTimeout(() => $('[data-modal-close]', modal)?.focus(), 30);
  };
  const closeModal = () => { if (!modal) return; modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); };
  document.addEventListener('click', (event) => { const trigger = event.target.closest('[data-open-project]'); if (trigger) openModal(trigger.dataset.openProject); });
  $$('[data-modal-close]').forEach((el) => el.addEventListener('click', closeModal));

  const viewer = $('[data-viewer]');
  const viewerImage = $('[data-viewer-image]');
  const openViewer = (src, alt='Изображение') => {
    if (!viewer || !viewerImage || !src) return;
    viewerImage.src = src;
    viewerImage.alt = alt;
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
  };
  const closeViewer = () => {
    if (!viewer) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden','true');
    if (!modal?.classList.contains('is-open')) document.body.classList.remove('modal-open');
  };
  ['[data-modal-image]', '[data-modal-plan]'].forEach((selector) => {
    const el = $(selector);
    el?.addEventListener('click', () => openViewer(el.dataset.viewerSrc || el.currentSrc || el.src, el.alt || 'Изображение'));
  });
  $$('[data-zoom-target]').forEach((el) => {
    el.addEventListener('click', () => {
      const img = $('img', el);
      openViewer(img?.dataset.viewerSrc || img?.currentSrc || img?.src, img?.alt || 'Изображение');
    });
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const img = $('img', el);
        openViewer(img?.dataset.viewerSrc || img?.currentSrc || img?.src, img?.alt || 'Изображение');
      }
    });
  });
  $$('[data-viewer-close]').forEach((el) => el.addEventListener('click', closeViewer));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (viewer?.classList.contains('is-open')) closeViewer();
      else closeModal();
    }
  });

  $$('[data-lead-form]').forEach((form) => form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = $('.form-status', form);
    if (!form.checkValidity()) { form.reportValidity(); status.textContent='Проверьте обязательные поля.'; status.classList.add('is-error'); return; }
    status.classList.remove('is-error');
    const data = Object.fromEntries(new FormData(form).entries());
    data.page = window.location.href;
    data.referrer = document.referrer || '';
    data.utm_source = new URLSearchParams(window.location.search).get('utm_source') || '';
    data.utm_campaign = new URLSearchParams(window.location.search).get('utm_campaign') || '';
    data.utm_content = new URLSearchParams(window.location.search).get('utm_content') || '';
    data.utm_term = new URLSearchParams(window.location.search).get('utm_term') || '';
    try {
      if (cfg.leadEndpoint) {
        const response = await fetch(cfg.leadEndpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
        if (!response.ok) throw new Error('Lead endpoint error');
      }
      status.textContent = cfg.leadEndpoint ? 'Спасибо! Заявка отправлена специалисту в MAX.' : 'Демо-форма готова. После подключения токена заявки будут приходить в MAX.';
      form.reset(); goal('lead_submit', { interest:data.interest || '' });
    } catch (error) {
      status.textContent=`Не удалось отправить. Позвоните: ${cfg.phone || ''}`; status.classList.add('is-error');
    }
  }));

  const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
  }, { threshold:.09, rootMargin:'0px 0px -40px' }) : null;
  $$('.reveal').forEach((el) => revealObserver ? revealObserver.observe(el) : el.classList.add('is-visible'));
})();
