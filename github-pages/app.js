'use strict';

const gallery = [
  { src: 'assets/canjian-home.png', title: '小程序首页', alt: '餐谏餐饮设计小程序首页：海报与展架设计入口' },
  { src: 'assets/canjian-templates.png', title: '选择海报模板', alt: '模板选择页面：按门店类型和尺寸筛选海报' },
  { src: 'assets/canjian-preview.png', title: '预览与保存广告', alt: '广告预览页面：保存图片、下载制作文件与分享' },
  { src: 'assets/canjian-account-private.png', title: '个人中心', alt: '个人中心：账号和余额已隐藏，展示任务列表与快捷入口' },
  { src: 'assets/canjian-topics.png', title: '主题与内容', alt: '主题页面：餐饮经营文章与海报设计内容' },
  { src: 'assets/canjian-website.png', title: '官网策划服务首屏', alt: '餐谏官网策划服务首屏，品牌介绍与服务入口', kind: 'website' },
  { src: 'assets/canjian-marketing.png', title: '官网营销服务首屏', alt: '餐谏官网营销服务首屏，内容营销介绍与业务导航', kind: 'website' },
  { src: 'assets/canjian-training.png', title: '官网培训与工具首屏', alt: '餐谏官网培训与工具服务首屏，旺店餐谏与餐饮经营课程', kind: 'website' },
  { src: 'assets/canjian-contact.png', title: '官网联系与预约页面', alt: '餐谏官网联系我们页面，品牌诊断预约与联系方式', kind: 'website' },
];
const lightboxGallery = gallery.filter(item => item.kind !== 'website');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const dialog = document.querySelector('.image-dialog');
const image = document.querySelector('#gallery-image');
const title = document.querySelector('#gallery-title');
const counter = document.querySelector('#gallery-counter');
const galleryStatus = document.querySelector('#gallery-status');
let galleryIndex = 0;
let galleryTrigger = null;

function showImage(index) {
  galleryIndex = (index + lightboxGallery.length) % lightboxGallery.length;
  const item = lightboxGallery[galleryIndex];
  dialog.classList.toggle('is-wide', item.kind === 'website');
  galleryStatus.hidden = false;
  galleryStatus.textContent = '正在加载图片…';
  image.src = item.src;
  image.alt = item.alt;
  title.textContent = item.title;
  counter.textContent = `${String(galleryIndex + 1).padStart(2, '0')} / ${String(lightboxGallery.length).padStart(2, '0')}`;
}

image.addEventListener('load', () => { galleryStatus.hidden = true; });
image.addEventListener('error', () => {
  galleryStatus.hidden = false;
  galleryStatus.textContent = '图片未能加载，请关闭后重新打开，或切换到另一张。';
});

function openGallery(index, trigger) {
  galleryTrigger = trigger;
  showImage(index);
  dialog.showModal();
  document.body.classList.add('gallery-open');
}
document.querySelectorAll('[data-gallery-index]').forEach(button => {
  button.addEventListener('click', () => openGallery(Number(button.dataset.galleryIndex), button));
});
document.querySelector('.gallery-prev').addEventListener('click', () => showImage(galleryIndex - 1));
document.querySelector('.gallery-next').addEventListener('click', () => showImage(galleryIndex + 1));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('gallery-open');
  galleryTrigger?.focus({ preventScroll: true });
});
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    showImage(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});

const codeTrigger = document.querySelector('#miniapp-code-trigger');
const codeDialog = document.querySelector('#miniapp-code-dialog');
codeTrigger.addEventListener('click', () => {
  codeDialog.showModal();
  document.body.classList.add('miniapp-code-open');
});
codeDialog.querySelector('.miniapp-code-close').addEventListener('click', () => codeDialog.close());
codeDialog.addEventListener('click', event => {
  if (event.target !== codeDialog) return;
  const bounds = codeDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) codeDialog.close();
});
codeDialog.addEventListener('close', () => {
  document.body.classList.remove('miniapp-code-open');
  codeTrigger.focus({ preventScroll: true });
});

// Manual tabs keep page changes predictable and offer a keyboard equivalent.
function bindTablist(list, onSelect) {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  function select(tab, moveFocus = false) {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    onSelect(tab);
    if (moveFocus && !list.inert) tab.focus({ preventScroll: true });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(tabs[next], true);
    });
  });
  select(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
  return select;
}

const demoDescriptions = [
  '小程序首页，点按闪烁提示体验页面切换。',
  '选择海报模板，点按闪烁提示继续浏览。',
  '查看海报预览，点按闪烁提示返回首页。',
  '个人中心的账号和余额已隐藏，保留签到、分享任务以及门店和推广入口。',
  '主题页面展示餐饮经营文章与设计内容，与核心工具一起服务商户。',
];
const demoRoutes = [
  [{ x: 5, y: 12, w: 90, h: 29, to: 1, label: '选海报模板' }, { x: 27, y: 88, w: 22, h: 9, to: 4, label: '主题' }, { x: 76, y: 88, w: 21, h: 9, to: 3, label: '我的' }],
  [{ x: 5, y: 26, w: 43, h: 29, to: 2, label: '示例预览' }],
  [{ x: 3, y: 8, w: 12, h: 6, to: 0, label: '首页' }],
  [{ x: 4, y: 88, w: 20, h: 9, to: 0, label: '首页' }, { x: 27, y: 88, w: 22, h: 9, to: 4, label: '主题' }],
  [{ x: 4, y: 88, w: 20, h: 9, to: 0, label: '首页' }, { x: 76, y: 88, w: 21, h: 9, to: 3, label: '我的' }],
];
// All five captured screens share the same actual phone size; only their
// surrounding screenshot gutters differ. Reserve one immutable viewport.
const demoCrops = [[9, 6, 533, 1152], [6, 7, 533, 1152], [20, 27, 533, 1152], [20, 13, 533, 1152], [11, 8, 533, 1152]];
const demoScreens = gallery.slice(0, 5).map((item, index) => {
  const preload = new Image();
  preload.src = item.src;
  const ready = preload.decode().then(() => true, () => false);
  return { ...item, crop: demoCrops[index], preload, ready };
});
const demoViewport = document.querySelector('#demo-screen');
const demoImage = document.querySelector('#demo-screen-image');
const demoTitle = document.querySelector('#demo-screen-title');
const demoPanel = document.querySelector('#demo-panel');
const hotspots = document.querySelector('#demo-hotspots');
let demoRequest = 0;
const selectDemoTab = bindTablist(document.querySelector('.demo-tabs'), tab => {
  const index = Number(tab.dataset.demoScreen);
  const item = demoScreens[index];
  const request = ++demoRequest;
  demoPanel.setAttribute('aria-busy', 'true');
  function commit(loaded) {
    // Keep the previous image visible while loading; a late image must not
    // overwrite a newer selection after rapid taps.
    if (request !== demoRequest) return;
    demoPanel.setAttribute('aria-busy', 'false');
    if (!loaded) return;
    const [cx, cy, cw, ch] = item.crop;
    const { naturalWidth: width, naturalHeight: height } = item.preload;
    demoPanel.setAttribute('aria-labelledby', tab.id);
    demoImage.setAttribute('width', String(width));
    demoImage.setAttribute('height', String(height));
    demoImage.setAttribute('href', item.src);
    demoViewport.setAttribute('viewBox', item.crop.join(' '));
    demoTitle.textContent = item.alt;
    document.querySelector('#demo-caption').textContent = demoDescriptions[index];
    hotspots.replaceChildren();
    demoRoutes[index].forEach(route => {
      const button = document.createElement('button');
      button.className = 'demo-hotspot';
      button.setAttribute('aria-label', `切换到${gallery[route.to].title}`);
      const left = Math.max(0, (route.x * width / 100 - cx) / cw * 100);
      const top = Math.max(0, (route.y * height / 100 - cy) / ch * 100);
      const right = Math.min(100, ((route.x + route.w) * width / 100 - cx) / cw * 100);
      const bottom = Math.min(100, ((route.y + route.h) * height / 100 - cy) / ch * 100);
      button.style.cssText = `left:${left}%;top:${top}%;width:${right - left}%;height:${bottom - top}%;`;
      button.dataset.hint = route.label;
      button.addEventListener('click', () => {
        selectDemoTab(document.querySelector(`[data-demo-screen="${route.to}"]`), true);
      });
      hotspots.append(button);
    });
  }
  if (item.preload.complete && item.preload.naturalWidth) commit(true);
  else item.ready.then(commit);
});

bindTablist(document.querySelector('.case-lenses'), tab => {
  document.querySelectorAll('.lens-panel').forEach(panel => { panel.hidden = panel.id !== tab.dataset.lensTarget; });
});
const websiteScreens = gallery.flatMap((item, index) => item.kind === 'website' ? [index] : []);
const websiteStage = document.querySelector('.website-stage');
const websiteViewport = document.querySelector('#website-screen');
const websiteImage = document.querySelector('#website-screen-image');
const websiteTitle = document.querySelector('#website-screen-title');
let websiteIndex = 0;
let websiteTimer = 0;
let websiteInView = false;
let websiteFocused = false;
function selectWebsiteScreen(position, automatic = false) {
  websiteIndex = (position + websiteScreens.length) % websiteScreens.length;
  const index = websiteScreens[websiteIndex];
  const item = gallery[index];
  websiteStage.classList.add('is-switching');
  window.setTimeout(() => {
    websiteImage.setAttribute('href', item.src);
    const crop = window.WebsiteCrops[item.src.split('/').at(-1)];
    websiteViewport.setAttribute('viewBox', crop.join(' '));
    websiteTitle.textContent = item.alt;
    websiteStage.setAttribute('aria-label', `${item.title}，第 ${websiteIndex + 1} 张，共 ${websiteScreens.length} 张`);
    websiteStage.classList.remove('is-switching');
  }, automatic ? 150 : 0);
}
function syncWebsiteRotation() {
  window.clearInterval(websiteTimer);
  if (websiteFocused || !websiteInView || motionPreference.matches || document.hidden) return;
  websiteTimer = window.setInterval(() => selectWebsiteScreen(websiteIndex + 1, true), 3000);
}
websiteStage.addEventListener('mouseenter', () => { websiteFocused = true; syncWebsiteRotation(); });
websiteStage.addEventListener('mouseleave', () => { websiteFocused = false; syncWebsiteRotation(); });
websiteStage.addEventListener('focusin', () => { websiteFocused = true; syncWebsiteRotation(); });
websiteStage.addEventListener('focusout', event => {
  if (!websiteStage.contains(event.relatedTarget)) { websiteFocused = false; syncWebsiteRotation(); }
});
document.addEventListener('visibilitychange', syncWebsiteRotation);
addEventListener('portfolio:website-visibility', event => { websiteInView = event.detail.visible; syncWebsiteRotation(); });
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    websiteInView = entries.some(entry => entry.isIntersecting);
    syncWebsiteRotation();
  }, { threshold: .2 }).observe(websiteStage);
}
motionPreference.addEventListener('change', () => {
  syncWebsiteRotation();
});
syncWebsiteRotation();

const siteHeader = document.querySelector('.site-header');
const menuToggle = document.querySelector('#menu-toggle');
const headerMenu = document.querySelector('#header-menu');
const mobileNavigation = window.matchMedia('(max-width: 600px)');
function setMobileMenu(open, restoreFocus = false) {
  const expanded = mobileNavigation.matches && open;
  siteHeader.classList.toggle('is-menu-open', expanded);
  menuToggle.setAttribute('aria-expanded', String(expanded));
  menuToggle.setAttribute('aria-label', expanded ? '关闭导航菜单' : '打开导航菜单');
  headerMenu.inert = mobileNavigation.matches && !expanded;
  if (restoreFocus) menuToggle.focus({ preventScroll: true });
}
menuToggle.addEventListener('click', () => {
  setMobileMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
});
headerMenu.addEventListener('click', event => {
  if (mobileNavigation.matches && event.target.closest('a')) setMobileMenu(false);
});
document.addEventListener('click', event => {
  if (mobileNavigation.matches && !siteHeader.contains(event.target)) setMobileMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
    event.preventDefault();
    setMobileMenu(false, true);
  }
});
mobileNavigation.addEventListener('change', () => {
  const restoreFocus = mobileNavigation.matches && headerMenu.contains(document.activeElement);
  setMobileMenu(false, restoreFocus);
});
window.addEventListener('portfolio:home-visibility', event => { if (!event.detail.visible) setMobileMenu(false); });
setMobileMenu(false);

const navLinks = [...document.querySelectorAll('.section-nav a')];
const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
const typewriterElements = [...document.querySelectorAll('[data-typewriter]')];
const typewriterTimers = new Map();
let typewriterObserver;

function resetTypewriter(element) {
  const timer = typewriterTimers.get(element);
  if (timer) clearTimeout(timer);
  typewriterTimers.delete(element);
  element.querySelectorAll('.typewriter-char').forEach(letter => letter.classList.remove('is-revealed'));
  element.classList.remove('is-typing');
  element.classList.add('is-pending');
}

function startTypewriter(element) {
  resetTypewriter(element);
  element.classList.remove('is-pending');
  element.classList.add('is-typing');
  const letters = [...element.querySelectorAll('.typewriter-char')];
  const startedAt = performance.now();
  function revealCharacters() {
    const elapsed = performance.now() - startedAt;
    letters.forEach(letter => {
      if (elapsed >= parseFloat(letter.style.getPropertyValue('--type-delay'))) letter.classList.add('is-revealed');
    });
    if (letters.every(letter => letter.classList.contains('is-revealed'))) {
      typewriterTimers.delete(element);
      return;
    }
    typewriterTimers.set(element, setTimeout(revealCharacters, 70));
  }
  revealCharacters();
}

if (!motionPreference.matches && 'IntersectionObserver' in window) {
  typewriterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const homeAllowed = !entry.target.closest('#home')
        || !document.documentElement.classList.contains('tunnel-ready')
        || document.documentElement.dataset.homeVisible === 'true';
      if (entry.isIntersecting && homeAllowed) startTypewriter(entry.target);
      else resetTypewriter(entry.target);
    });
  }, { threshold: 0.25 });

  typewriterElements.forEach(element => {
    const visual = document.createElement('span');
    visual.className = 'typewriter-visual';
    visual.setAttribute('aria-hidden', 'true');
    const accessibleText = document.createElement('span');
    accessibleText.className = 'visually-hidden';
    // The homepage is initially hidden for its fade; innerText would be empty.
    accessibleText.textContent = element.textContent.trim();
    visual.append(...element.childNodes);

    const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    const speed = Number(element.dataset.typewriterSpeed) || 70;
    let delay = Number(element.dataset.typewriterDelay) || 120;
    let lastCharacter;
    textNodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      for (const character of Array.from(node.textContent)) {
        if (/\s/u.test(character)) {
          fragment.append(document.createTextNode(character));
          continue;
        }
        const letter = document.createElement('span');
        letter.className = 'typewriter-char';
        letter.textContent = character;
        letter.style.setProperty('--type-delay', `${delay}ms`);
        fragment.append(letter);
        lastCharacter = letter;
        delay += speed + (/[，、,]/u.test(character) ? 140 : 0);
      }
      node.replaceWith(fragment);
    });
    if (lastCharacter && /[。.!?？！]/u.test(lastCharacter.textContent)) {
      const ending = document.createElement('span');
      ending.className = 'typewriter-ending';
      lastCharacter.replaceWith(ending);
      ending.append(lastCharacter);
    }
    element.replaceChildren(accessibleText, visual);
    element.style.setProperty('--typing-duration', `${delay + 160}ms`);
    element.classList.add('typewriter', 'is-pending');
    typewriterObserver.observe(element);
  });
}

window.addEventListener('portfolio:home-visibility', event => {
  if (motionPreference.matches || !typewriterObserver) return;
  typewriterElements.filter(element => element.closest('#home')).forEach(element => {
    if (!event.detail.visible) { resetTypewriter(element); return; }
    const bounds = element.getBoundingClientRect();
    if (bounds.bottom > 0 && bounds.top < innerHeight && !element.classList.contains('is-typing')) startTypewriter(element);
  });
});

function updateNavigation() {
  const marker = document.querySelector('.site-header').offsetHeight + 80;
  let current = sections[0];
  for (const section of sections) if (section.getBoundingClientRect().top <= marker) current = section;
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 5) current = sections[sections.length - 1];
  navLinks.forEach(link => {
    const active = link.getAttribute('href') === `#${current.id}`;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
function updateScrollExperience() {
  updateNavigation();
  const available = document.documentElement.scrollHeight - window.innerHeight;
  const readingProgress = available > 0 ? Math.min(1, Math.max(0, window.scrollY / available)) : 0;
  document.documentElement.style.setProperty('--read-progress', readingProgress.toFixed(4));

}
let scrollScheduled = false;
window.addEventListener('scroll', () => {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => { updateScrollExperience(); scrollScheduled = false; });
}, { passive: true });
window.addEventListener('resize', updateScrollExperience);
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) {
    typewriterObserver?.disconnect();
    typewriterTimers.forEach(timer => clearTimeout(timer));
    typewriterTimers.clear();
    typewriterElements.forEach(element => element.classList.remove('is-pending', 'is-typing'));
  }
  updateScrollExperience();
});
updateScrollExperience();
document.querySelector('#year').textContent = new Date().getFullYear();
