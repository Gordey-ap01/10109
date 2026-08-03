import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const debugPort = 9333;
const baseUrl = process.argv[2] || "http://127.0.0.1:8082";
const userDataDir = path.join(os.tmpdir(), `service-10109-chrome-${Date.now()}`);
const screenshotDir = process.env.QA_SCREENSHOTS ? path.resolve(process.env.QA_SCREENSHOTS) : null;
const failures = [];
const consoleErrors = [];

const browser = spawn(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${userDataDir}`,
  "about:blank",
]);

try {
  const wsUrl = await waitForWebSocketUrl();
  const cdp = await connect(wsUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  cdp.on("Runtime.exceptionThrown", (event) => {
    consoleErrors.push(event.exceptionDetails?.text || "Runtime exception");
  });
  cdp.on("Runtime.consoleAPICalled", (event) => {
    if (event.type === "error") {
      consoleErrors.push(event.args?.map((arg) => arg.value || arg.description).join(" ") || "console.error");
    }
  });

  await setViewport(cdp, 1440, 1100, false);
  await navigate(cdp, `${baseUrl}/remont/telefony/apple/iphone-15/`);
  await waitFor(cdp, "document.querySelector('.brand-counter') && document.querySelector('.brand-chip-row') && document.querySelector('.model-chip-row')");
  await expect(
    cdp,
    "concise header repair counter",
    "document.querySelector('.site-header [data-header-counter]') !== null && document.querySelector('.header-repair-counter')?.textContent.includes('Отремонтировано')"
  );
  await expect(
    cdp,
    "header devices below large number",
    "Number.parseFloat(getComputedStyle(document.querySelector('.header-repair-counter strong')).fontSize) >= 30 && document.querySelector('.header-repair-counter small').getBoundingClientRect().top >= document.querySelector('.header-repair-counter strong').getBoundingClientRect().bottom - 1"
  );
  await expect(cdp, "header logo", "document.querySelector('.brand__logo')?.naturalWidth >= 246 && document.querySelector('.brand__logo').getBoundingClientRect().width >= 228");
  await expect(cdp, "service age removed from logo", "document.querySelector('.brand__since') === null && document.querySelector('.brand__city') === null");
  await expect(cdp, "site favicons", "document.querySelector('link[rel=\"icon\"][sizes=\"32x32\"]') !== null && document.querySelector('link[rel=\"apple-touch-icon\"]') !== null");
  await expect(
    cdp,
    "category repair counter",
    "document.querySelector('.brand-counter')?.textContent.includes('телефонов') && !document.querySelector('.brand-counter')?.textContent.includes('Apple')"
  );
  await clickCenter(cdp, '.brand-chip-row .chip[href*="/samsung/"]');
  await waitFor(cdp, "location.pathname.includes('/remont/telefony/samsung/')");
  await expect(cdp, "brand selection navigates", "location.pathname.includes('/remont/telefony/samsung/')");
  await navigate(cdp, `${baseUrl}/remont/telefony/apple/iphone-15/`);
  await waitFor(cdp, "document.querySelector('.model-chip-row')");
  await clickCenter(cdp, '.model-chip-row .chip[href*="/iphone-15-pro/"]');
  await waitFor(cdp, "location.pathname.includes('/remont/telefony/apple/iphone-15-pro/')");
  await expect(cdp, "model selection navigates", "location.pathname.includes('/remont/telefony/apple/iphone-15-pro/')");
  await navigate(cdp, `${baseUrl}/remont/telefony/apple/iphone-15/`);
  await waitFor(cdp, "document.querySelector('.catalog-tabs .tab--noutbuki')");
  await clickCenter(cdp, ".catalog-tabs .tab--noutbuki");
  await waitFor(cdp, "location.pathname.includes('/remont/noutbuki/')");
  await expect(cdp, "category selection navigates", "location.pathname.includes('/remont/noutbuki/')");
  await navigate(cdp, `${baseUrl}/remont/telefony/apple/iphone-15/`);
  await waitFor(cdp, "document.querySelectorAll('.price-row').length >= 10 && document.querySelector('.brand-counter')");
  await expect(cdp, "desktop price rows", "document.querySelectorAll('.price-row').length >= 10");
  await expect(cdp, "average price with part column", "document.querySelector('.price-list__head')?.textContent.includes('Средняя цена с деталью')");
  await expect(cdp, "average price populated", "document.querySelector('.price-row__price')?.textContent.includes('После диагностики') && [...document.querySelectorAll('.price-row__price')].some((item) => item.textContent.includes('₽'))");
  await expect(cdp, "repair time grouped under service", "document.querySelector('.price-row__name .price-row__time') !== null && document.querySelector('.price-row > .price-row__time') === null");
  await expect(cdp, "price table contained", "document.querySelector('.price-list__head').getBoundingClientRect().right <= document.querySelector('.prices-panel').getBoundingClientRect().right + 1 && [...document.querySelectorAll('.price-row')].every((row) => row.getBoundingClientRect().right <= document.querySelector('.prices-panel').getBoundingClientRect().right + 1)");
  await expect(cdp, "model scroller controls", "document.querySelector('[data-model-scroller].has-overflow') !== null");
  const modelScrollBefore = await cdp.eval("document.querySelector('[data-model-row]')?.scrollLeft || 0");
  await cdp.eval("document.querySelector('.model-scroller__button--next')?.click()");
  await delay(500);
  const modelScrollAfter = await cdp.eval("document.querySelector('[data-model-row]')?.scrollLeft || 0");
  if (modelScrollAfter.result.value <= modelScrollBefore.result.value) failures.push("desktop model scroller moves");
  await expect(cdp, "category tabs have icons", "document.querySelectorAll('.catalog-tabs .tab-icon').length >= 4");
  await expect(cdp, "console category replaces onsite tab", "document.querySelector('.catalog-tabs .tab--pristavki')?.textContent.includes('Приставки и консоли') && !document.querySelector('.catalog-tabs')?.textContent.includes('Выездной ремонт')");
  await expect(cdp, "active category icon present", "document.querySelector('.catalog-tabs .tab.active .tab-icon') !== null");
  await navigate(cdp, `${baseUrl}/remont/pristavki/`);
  await waitFor(cdp, "document.querySelector('.catalog-tabs .tab--pristavki.active .tab-icon svg') !== null");
  await expect(cdp, "active console icon colored", "document.querySelector('.catalog-tabs .tab--pristavki.active .tab-icon svg') !== null && getComputedStyle(document.querySelector('.catalog-tabs .tab--pristavki.active .tab-icon')).backgroundImage.includes('linear-gradient')");
  await expect(cdp, "console counter uses service baseline", "Number(document.querySelector('[data-brand-counter-value]').textContent.replace(/\\D/g, '')) >= 202 && document.querySelector('.brand-counter__brand').textContent.includes('приставок и консолей')");
  await navigate(cdp, `${baseUrl}/remont/telefony/apple/iphone-15/`);
  await waitFor(cdp, "document.querySelectorAll('.price-row').length >= 10");
  await expect(cdp, "device media tags removed", "document.querySelector('.device-media-tags') === null");
  await expect(cdp, "two device facts", "document.querySelectorAll('.device-facts span').length === 2");
  await expect(cdp, "no repeated page title", "document.querySelector('.page-title') === null");
  await expect(cdp, "no breadcrumbs", "document.querySelector('.breadcrumbs') === null");
  await expect(cdp, "no available works heading", "document.querySelector('.prices-panel__head h2') === null");
  await expect(cdp, "collapsed services button", "document.querySelector('.expand-services')?.textContent.includes('Раскройте')");
  await expect(cdp, "contact block present", "document.querySelector('.contact-section .contact-form') !== null && document.querySelector('.service-map img') !== null");
  await waitFor(cdp, "document.querySelector('.service-map img')?.naturalWidth >= 650", 12000);
  await expect(cdp, "Yandex map has two standalone markers", "document.querySelector('.service-map img')?.src.includes('static-maps.yandex.ru') && document.querySelector('.service-map img')?.src.includes('pt=136.9882456') && document.querySelector('.service-map img')?.src.includes('137.0645113') && !document.querySelector('.service-map img')?.src.includes('rtext=') && !document.querySelector('.service-map img')?.src.includes('pl=')");
  await expect(cdp, "OpenStreetMap removed", "document.querySelector('link[href*=" + '"openstreetmap"' + "]') === null && document.querySelector('script[src*=" + '"leaflet"' + "]') === null && !document.documentElement.innerHTML.includes('tile.openstreetmap.org')");
  await expect(cdp, "brand counter present", "document.querySelector('[data-brand-counter-value]') !== null");
  await expect(cdp, "brand counter spans selector", "document.querySelector('.selection-shell > .brand-counter') !== null && document.querySelector('.selection-shell__main .catalog-controls') !== null");
  await expect(cdp, "brand counter blue", "getComputedStyle(document.querySelector('.selection-shell .brand-counter')).backgroundImage !== 'none' && getComputedStyle(document.querySelector('[data-brand-counter-value]')).color === 'rgb(255, 255, 255)'");
  const brandCounterBefore = await cdp.eval("document.querySelector('[data-brand-counter-value]')?.textContent");
  await delay(2300);
  const brandCounterAfter = await cdp.eval("document.querySelector('[data-brand-counter-value]')?.textContent");
  if (brandCounterBefore.result.value !== brandCounterAfter.result.value) failures.push("category counter remains stable during visit");
  await expect(cdp, "phone counter uses service baseline", "Number(document.querySelector('[data-brand-counter-value]').textContent.replace(/\\D/g, '')) >= 6527 && document.querySelector('.brand-counter__brand').textContent.includes('телефонов и планшетов')");
  await expect(cdp, "desktop no body overflow", "document.documentElement.scrollWidth <= window.innerWidth + 2");
  await expect(
    cdp,
    "service button label",
    "document.querySelector('.price-row .select-service')?.textContent.trim() === 'Выбрать'"
  );
  await cdp.eval("document.querySelectorAll('.price-row .select-service')[1].click()");
  await delay(250);
  await expect(cdp, "booking bar visible", "document.querySelector('.booking-bar.visible') !== null");
  await expect(cdp, "booking contact label", "document.querySelector('.booking-bar button')?.textContent.trim() === 'Связаться'");
  await expect(cdp, "booking contact enlarged", "document.querySelector('.booking-bar button').getBoundingClientRect().height >= 62");
  await cdp.eval("document.querySelector('.booking-bar button').click()");
  await delay(250);
  await expect(cdp, "modal visible", "document.querySelector('.modal.visible') !== null");
  await expect(cdp, "selected service checked", "document.querySelectorAll('.selected-list input:checked').length >= 1");
  await expect(cdp, "two branch cards for phone", "document.querySelectorAll('.branch-card').length === 2");
  await expect(cdp, "complete repair form", "document.querySelector('[name=\"Тип устройства\"]') !== null && document.querySelector('[name=\"Описание неисправности\"]') !== null");
  await expect(
    cdp,
    "email form action",
    "document.querySelector('.booking-form')?.action.includes('shineteatr@gmail.com')"
  );
  await expect(
    cdp,
    "contact form action",
    "document.querySelector('.contact-form')?.action.includes('shineteatr@gmail.com')"
  );
  await expect(cdp, "contact form branch", "document.querySelector('.contact-form [name=\"Филиал\"]') !== null");
  await expect(cdp, "phone info block", "document.querySelector('.device-info')?.textContent.includes('Перед ремонтом телефона')");
  await expect(cdp, "contact details promoted", "document.querySelector('.contact-head .contact-lines--lead') !== null && document.querySelector('.contact-head').compareDocumentPosition(document.querySelector('.contact-grid')) & Node.DOCUMENT_POSITION_FOLLOWING");

  await setViewport(cdp, 390, 1400, true);
  await navigate(cdp, `${baseUrl}/remont/noutbuki/apple/macbook-pro/`);
  await waitFor(cdp, "document.querySelectorAll('.price-row').length >= 5");
  await expect(cdp, "mobile content loaded", "document.querySelectorAll('.price-row').length >= 5");
  await expect(cdp, "mobile no body overflow", "document.documentElement.scrollWidth <= window.innerWidth + 2");
  await expect(
    cdp,
    "mobile device before prices",
    "document.querySelector('.device-card').getBoundingClientRect().top < document.querySelector('.prices-panel').getBoundingClientRect().top"
  );
  await expect(cdp, "mobile horizontal selector gesture", "getComputedStyle(document.querySelector('[data-horizontal-scroll]')).touchAction === 'pan-x'");
  await expect(cdp, "mobile model arrows contained", "getComputedStyle(document.querySelector('.model-scroller__button--next')).display === 'none' && document.querySelector('.model-scroller').getBoundingClientRect().right <= document.documentElement.clientWidth + 1");
  await expect(cdp, "laptop info block", "document.querySelector('.device-info')?.textContent.includes('Что взять вместе с ноутбуком')");
  await cdp.eval("document.querySelectorAll('.price-row .select-service')[1].click()");
  await delay(200);
  await cdp.eval("document.querySelector('.booking-bar button').click()");
  await delay(200);
  await expect(cdp, "onsite branch for laptop", "[...document.querySelectorAll('.branch-card strong')].some((item) => item.textContent.includes('Заказать выезд'))");
  await expect(cdp, "bright blurred modal", "getComputedStyle(document.querySelector('.modal')).backgroundColor !== 'rgba(2, 6, 23, 0.72)' && getComputedStyle(document.querySelector('.modal')).backdropFilter.includes('blur')");
  await expect(cdp, "booking scrollbar stays inside", "document.querySelector('.modal__dialog').scrollHeight <= document.querySelector('.modal__dialog').clientHeight + 1 && getComputedStyle(document.querySelector('.booking-form')).overflowY === 'auto'");

  await navigate(cdp, `${baseUrl}/`);
  await setViewport(cdp, 390, 900, true);
  await delay(300);
  await expect(cdp, "home page class", "document.body.classList.contains('home-page')");
  await expect(cdp, "home light theme class", "document.body.classList.contains('home-page--light')");
  await expect(cdp, "blue header", "getComputedStyle(document.querySelector('.site-header')).backgroundImage.includes('linear-gradient')");
  await expect(cdp, "white booking button", "getComputedStyle(document.querySelector('.site-header .btn-primary')).backgroundColor === 'rgb(255, 255, 255)'");
  await expect(cdp, "animated repair stage present", "document.querySelector('.repair-stage__pulse') !== null && document.querySelectorAll('.repair-float').length === 3");
  await expect(cdp, "revival counter present", "document.querySelector('[data-revival-counter]') !== null");
  await expect(cdp, "revival counter copy", "document.querySelector('.repair-stage__counter')?.textContent.includes('Устройств отремонтировано') && document.querySelector('.repair-stage__counter')?.textContent.includes('счёт продолжает расти')");
  await expect(cdp, "hero action strip", "document.querySelectorAll('.hero-action-bar .hero__actions .btn').length === 3 && document.querySelectorAll('.hero-action-bar .hero-trust span').length === 3");
  await expect(cdp, "hero trust copy", "[...document.querySelectorAll('.hero-trust span')].map((item) => item.textContent.replace(/\\s+/g, ' ').trim()).join('|').includes('2-3 часа типовой ремонт|до 12 мес гарантия|с 2016 года работаем')");
  await expect(cdp, "hero onsite action", "document.querySelector('.hero-action-bar__onsite')?.getAttribute('href') === '#onsite-service' && document.querySelector('.hero-action-bar__onsite')?.textContent.includes('Заказать выезд мастера')");
  await expect(cdp, "onsite follows specialization", "document.querySelector('#specialization').nextElementSibling?.id === 'onsite-service'");
  await expect(cdp, "reviews follow onsite", "document.querySelector('#onsite-service').nextElementSibling?.id === 'reviews'");
  await expect(cdp, "onsite section content", "document.querySelectorAll('.onsite-steps li').length === 3 && document.querySelectorAll('.onsite-scope span').length === 4");
  await expect(cdp, "onsite image source", "document.querySelector('.onsite-media img')?.getAttribute('src')?.endsWith('onsite-master.webp')");
  await expect(cdp, "onsite form", "document.querySelector('.onsite-form')?.action.includes('shineteatr@gmail.com') && document.querySelector('.onsite-form [name=\"Адрес\"]') !== null && document.querySelector('.onsite-form [name=\"Устройство\"]') !== null");
  await expect(cdp, "category background images", "document.querySelectorAll('.cat-card__image').length === 6 && [...document.querySelectorAll('.cat-card__image')].every((image) => image.getAttribute('src')?.endsWith('.png'))");
  await expect(cdp, "repair status widget", "document.querySelector('.status-widget iframe')?.src.includes('app.helloclient.by/check.html')");
  await expect(cdp, "review platform summaries", "document.querySelector('.platform-rating--yandex')?.textContent.includes('26 отзывов') && document.querySelector('.platform-rating--twogis')?.textContent.includes('239 отзывов')");
  await expect(cdp, "2gis addresses enlarged", "[...document.querySelectorAll('.platform-rating__branches a')].every((item) => Number.parseFloat(getComputedStyle(item).fontSize) >= 16)");
  await expect(cdp, "payment methods", "document.querySelectorAll('.payment-card').length === 4 && [...document.querySelectorAll('.payment-card img')].every((image) => image.getAttribute('src')?.endsWith('.webp'))");
  const revivalDuring = await cdp.eval("Number(document.querySelector('[data-revival-counter]')?.textContent.replace(/\\D/g, '') || 0)");
  if (revivalDuring.result.value < 8545) failures.push("revival counter uses service baseline");
  await expect(cdp, "hero and header counters agree", "document.querySelector('[data-revival-counter]').textContent === document.querySelector('[data-header-counter]').textContent");
  await delay(2600);
  const revivalReady = await cdp.eval("Number(document.querySelector('[data-revival-counter]')?.textContent.replace(/\\D/g, '') || 0)");
  if (revivalReady.result.value !== revivalDuring.result.value) failures.push("repair counter remains stable during visit");
  await waitFor(cdp, "document.querySelector('.light-hero__media img')?.naturalWidth > 1000");
  await expect(cdp, "home mobile no body overflow", "document.documentElement.scrollWidth <= window.innerWidth + 2");
  await expect(cdp, "mobile business shortcut", "getComputedStyle(document.querySelector('.site-header .header-b2b')).display === 'none' && getComputedStyle(document.querySelector('.mobile-b2b-strip')).display === 'flex' && getComputedStyle(document.querySelector('.mobile-b2b-strip')).position !== 'fixed' && document.querySelector('.site-header').nextElementSibling?.matches('.mobile-b2b-strip') && document.querySelector('.mobile-b2b-strip').getBoundingClientRect().width >= document.documentElement.clientWidth - 1");
  await expect(cdp, "mobile business shortcut label", "document.querySelector('.mobile-b2b-strip')?.textContent.includes('Организациям') && Number.parseFloat(getComputedStyle(document.querySelector('.mobile-b2b-strip')).fontSize) >= 14 && document.querySelector('.mobile-b2b-strip').getBoundingClientRect().height >= 42");
  await expect(cdp, "mobile business shortcut highlighted", "getComputedStyle(document.querySelector('.mobile-b2b-strip')).backgroundImage.includes('linear-gradient') && getComputedStyle(document.querySelector('.mobile-b2b-strip')).borderBottomColor === 'rgb(250, 204, 21)'");
  await expect(cdp, "mobile header counter does not overlap booking", "document.querySelector('.header-repair-counter').getBoundingClientRect().right <= document.querySelector('.site-header .btn-primary').getBoundingClientRect().left + 1");
  await expect(cdp, "mobile logo enlarged", "document.querySelector('.brand__logo').getBoundingClientRect().width >= 140");
  await expect(cdp, "mobile header names repaired count", "getComputedStyle(document.querySelector('.header-repair-counter > span')).display !== 'none' && document.querySelector('.header-repair-counter > span').textContent.includes('Отремонтировано')");
  await expect(cdp, "mobile contacts lead", "document.querySelector('.contact-lines--lead').getBoundingClientRect().top < document.querySelector('.contact-head__text').getBoundingClientRect().top && Number.parseFloat(getComputedStyle(document.querySelector('.contact-lines--lead a')).fontSize) >= 27");
  await expect(cdp, "light hero image remains visible", "getComputedStyle(document.querySelector('.light-hero__media img')).display !== 'none'");
  await expect(cdp, "mobile onsite action full row", "document.querySelector('.hero-action-bar__onsite').getBoundingClientRect().width > document.querySelector('.hero-action-bar__primary').getBoundingClientRect().width * 1.8");
  await expect(cdp, "mobile onsite order", "document.querySelector('.onsite-media').getBoundingClientRect().top < document.querySelector('.onsite-form').getBoundingClientRect().top");
  await expect(cdp, "mobile category card content does not overlap", "[...document.querySelectorAll('.cat-card')].every((card) => { const head = card.querySelector('.cat-card__head').getBoundingClientRect(); const title = card.querySelector('.cat-title').getBoundingClientRect(); const icon = card.querySelector('.cat-icon').getBoundingClientRect(); const content = card.querySelector('.cat-card__content').getBoundingClientRect(); const action = card.querySelector('.cat-open').getBoundingClientRect(); return icon.left >= title.right + 8 && content.top >= head.bottom && action.top >= content.bottom; })");
  await expect(cdp, "mobile category images hidden for direct navigation", "[...document.querySelectorAll('.cat-card__image')].every((image) => getComputedStyle(image).display === 'none')");
  if (screenshotDir) await captureSection(cdp, "#specialization", "specialization-mobile.png");
  await expect(cdp, "mobile payment copy visible", "[...document.querySelectorAll('.payment-card')].every((card) => { const image = card.querySelector('img').getBoundingClientRect(); const copy = card.querySelector(':scope > div').getBoundingClientRect(); const title = card.querySelector('h3').getBoundingClientRect(); const text = card.querySelector('p').getBoundingClientRect(); return image.bottom <= copy.top + 1 && title.height > 0 && text.height > 0 && copy.bottom <= card.getBoundingClientRect().bottom + 1; })");
  await expect(cdp, "footer contacts use two rows", "getComputedStyle(document.querySelector('.footer__contacts')).display === 'grid' && document.querySelectorAll('.footer__contacts > a').length === 2 && document.querySelector('.footer__contacts a:last-child').getBoundingClientRect().top > document.querySelector('.footer__contacts a:first-child').getBoundingClientRect().top");
  if (screenshotDir) await captureSection(cdp, "#payments", "payments-mobile.png");
  await cdp.eval("window.scrollTo(0, 500)");
  await delay(250);
  await expect(cdp, "mobile business shortcut scrolls away", "document.querySelector('.mobile-b2b-strip').getBoundingClientRect().bottom < 0 && Math.abs(document.querySelector('.site-header').getBoundingClientRect().top) <= 1");
  await cdp.eval("document.querySelector('.service-map').scrollIntoView({ block: 'start' })");
  await delay(300);
  await expect(cdp, "map stays behind fixed header", "document.elementFromPoint(Math.round(innerWidth / 2), 20)?.closest('.site-header') !== null && Number.parseInt(getComputedStyle(document.querySelector('.site-header')).zIndex, 10) > Number.parseInt(getComputedStyle(document.querySelector('.service-map')).zIndex || '0', 10)");

  await setViewport(cdp, 320, 900, true);
  await navigate(cdp, `${baseUrl}/`);
  await expect(cdp, "small mobile no body overflow", "document.documentElement.scrollWidth <= window.innerWidth + 2");
  await expect(cdp, "small mobile hero actions fit", "document.querySelector('.hero-action-bar .hero__actions').getBoundingClientRect().right <= document.documentElement.clientWidth + 1");
  await expect(cdp, "small mobile header fits", "[...document.querySelectorAll('.site-header__inner > *')].every((item) => item.getBoundingClientRect().right <= document.documentElement.clientWidth + 1)");

  await setViewport(cdp, 1280, 900, false);
  await navigate(cdp, `${baseUrl}/`);
  await expect(
    cdp,
    "category images fill cards",
    "[...document.querySelectorAll('.cat-card')].every((card) => { const image = card.querySelector('.cat-card__image'); const a = card.getBoundingClientRect(); const b = image.getBoundingClientRect(); return b.width >= a.width - 2 && b.height >= a.height - 2 && getComputedStyle(image).objectFit === 'cover'; })"
  );
  await expect(cdp, "category titles lead cards", "[...document.querySelectorAll('.cat-card')].every((card) => { const head = card.querySelector('.cat-card__head').getBoundingClientRect(); const title = card.querySelector('.cat-title').getBoundingClientRect(); const icon = card.querySelector('.cat-icon').getBoundingClientRect(); return Math.abs(title.top - head.top) <= 1 && head.top - card.getBoundingClientRect().top <= 22 && icon.width >= 66; })");
  await expect(cdp, "desktop payment images moderately reduced", "[...document.querySelectorAll('.payment-card')].every((card) => { const image = card.querySelector('img').getBoundingClientRect(); const ratio = image.width / card.getBoundingClientRect().width; return ratio >= 0.78 && ratio <= 0.82 && image.height / image.width > 0.74 && image.height / image.width < 0.76; })");
  await expect(cdp, "desktop cta actions moved right", "document.querySelector('.cta-actions').getBoundingClientRect().left > document.querySelector('.cta-band').getBoundingClientRect().left + document.querySelector('.cta-band').getBoundingClientRect().width * 0.55 && [...document.querySelectorAll('.cta-actions .btn')].every((button) => button.getBoundingClientRect().height >= 50)");
  if (screenshotDir) await captureSection(cdp, ".cta-band", "cta-desktop.png");
  if (screenshotDir) await captureSection(cdp, "#specialization", "specialization-desktop.png");
  if (screenshotDir) await captureSection(cdp, "#payments", "payments-desktop.png");
  await expect(
    cdp,
    "review logos fill cards",
    "getComputedStyle(document.querySelector('.platform-rating--yandex'), '::before').content.includes('Яндекс') && getComputedStyle(document.querySelector('.platform-rating--twogis'), '::before').content.includes('2ГИС')"
  );
  await hoverCenter(cdp, ".platform-rating--yandex");
  const yandexHoverBackground = await cdp.eval("getComputedStyle(document.querySelector('.platform-rating--yandex')).backgroundImage");
  await hoverCenter(cdp, ".platform-rating--twogis");
  const twoGisHoverBackground = await cdp.eval("getComputedStyle(document.querySelector('.platform-rating--twogis')).backgroundImage");
  if (yandexHoverBackground.result.value !== twoGisHoverBackground.result.value) failures.push("review cards share one hover highlight");
  if (screenshotDir) await captureSection(cdp, "#reviews", "reviews-desktop.png");
  await expect(cdp, "desktop form and map aligned", "Math.abs(document.querySelector('.contact-form').getBoundingClientRect().height - document.querySelector('.contact-card').getBoundingClientRect().height) <= 2");
  await expect(cdp, "desktop contact details enlarged", "Number.parseFloat(getComputedStyle(document.querySelector('.contact-lines--lead a')).fontSize) >= 34 && Number.parseFloat(getComputedStyle(document.querySelector('.contact-lines--lead a:last-child')).fontSize) >= 24");
  if (screenshotDir) await captureSection(cdp, "#contacts", "contacts-desktop.png");
  await hoverCenter(cdp, ".header-b2b");
  await expect(cdp, "business hover contrast", "getComputedStyle(document.querySelector('.header-b2b')).backgroundColor === 'rgb(255, 255, 255)' && getComputedStyle(document.querySelector('.header-b2b')).color === 'rgb(3, 105, 161)'");
  await expect(cdp, "gray footer with white text", "getComputedStyle(document.querySelector('.footer')).backgroundColor === 'rgb(71, 85, 105)' && getComputedStyle(document.querySelector('.footer__inner')).color === 'rgb(255, 255, 255)'");
  await navigate(cdp, `${baseUrl}/b2b/`);
  await expect(cdp, "b2b page rendered", "document.body.classList.contains('b2b-page') && document.querySelectorAll('.b2b-services article').length === 4");
  await expect(cdp, "b2b slogan", "document.querySelector('.b2b-hero h1')?.textContent.includes('Ваш бизнес работает') && document.querySelector('.b2b-hero h1')?.textContent.includes('Сервисом 101')");
  await expect(cdp, "b2b form", "document.querySelector('.b2b-form')?.action.includes('shineteatr@gmail.com')");
  await expect(cdp, "b2b no body overflow", "document.documentElement.scrollWidth <= window.innerWidth + 2");

  if (consoleErrors.length) {
    failures.push(`console errors: ${consoleErrors.join("; ")}`);
  }
} finally {
  browser.kill();
  await delay(500);
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch {
    // Chrome may keep a profile lock for a moment on Windows; it is safe to leave this temp folder.
  }
}

if (failures.length) {
  console.error(failures.map((item) => `FAIL ${item}`).join("\n"));
  process.exit(1);
}

console.log("Browser verification passed");

async function waitForWebSocketUrl() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      const data = await response.json();
      const page = data.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      await delay(150);
    }
  }
  throw new Error("Chrome DevTools endpoint did not start");
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const handlers = new Map();

    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const callId = ++id;
          ws.send(JSON.stringify({ id: callId, method, params }));
          return new Promise((ok, fail) => pending.set(callId, { ok, fail }));
        },
        eval(expression) {
          return this.send("Runtime.evaluate", {
            expression,
            awaitPromise: true,
            returnByValue: true,
          });
        },
        on(method, handler) {
          handlers.set(method, handler);
        },
      });
    });

    ws.addEventListener("message", (message) => {
      const data = JSON.parse(message.data);
      if (data.id && pending.has(data.id)) {
        const item = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) item.fail(new Error(data.error.message));
        else item.ok(data.result);
      } else if (data.method && handlers.has(data.method)) {
        handlers.get(data.method)(data.params);
      }
    });
    ws.addEventListener("error", reject);
  });
}

async function setViewport(cdp, width, height, mobile) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
}

async function navigate(cdp, url) {
  await cdp.send("Page.navigate", { url });
  await delay(1400);
}

async function expect(cdp, label, expression) {
  const result = await cdp.eval(`Boolean(${expression})`);
  if (!result.result.value) failures.push(label);
}

async function waitFor(cdp, expression, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await cdp.eval(`Boolean(${expression})`);
    if (result.result.value) return true;
    await delay(200);
  }
  failures.push(`timed out waiting for: ${expression}`);
  return false;
}

async function clickCenter(cdp, selector) {
  const found = await cdp.eval(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.scrollIntoView({ block: "center", inline: "center" });
    return true;
  })()`);
  if (!found.result.value) {
    failures.push(`click target missing: ${selector}`);
    return;
  }
  await delay(400);
  const result = await cdp.eval(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  const point = result.result.value;
  if (!point) {
    failures.push(`click target missing: ${selector}`);
    return;
  }
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
}

async function captureSection(cdp, selector, filename) {
  fs.mkdirSync(screenshotDir, { recursive: true });
  await cdp.eval(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, element.offsetTop - 82);
    return true;
  })()`);
  await delay(500);
  const result = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(path.join(screenshotDir, filename), Buffer.from(result.data, "base64"));
}

async function hoverCenter(cdp, selector) {
  const result = await cdp.eval(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  const point = result.result.value;
  if (!point) {
    failures.push(`hover target missing: ${selector}`);
    return;
  }
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
  });
  await delay(250);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
