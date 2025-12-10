(function initTheme() {
  try {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (_) { }
})();

// --- Ensure QR library present with CDN fallback ---
(function bootstrapQRCode() {
  const primary = document.getElementById('qrcode-lib');
  function injectFallback() {
    if (window.QRCode) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Fallback QRCode library failed to load'));
      document.head.appendChild(s);
    });
  }
  window.__ensureQRCodeLib = function () {
    if (window.QRCode) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(async () => { try { await injectFallback(); } finally { resolve(); } }, 1200);
      primary.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
      primary.addEventListener('error', async () => { clearTimeout(timer); await injectFallback(); resolve(); }, { once: true });
    });
  }
})();

// --- logic ---
(function app() {
  const el = {
    // Tabs
    tabs: document.querySelectorAll('.tab-btn'),
    contents: document.querySelectorAll('.tab-content'),

    // Common
    size: document.getElementById('qrSize'),
    ec: document.getElementById('qrEC'),
    box: document.getElementById('qrcode'),
    generate: document.getElementById('generateBtn'),
    download: document.getElementById('downloadBtn'),
    clear: document.getElementById('clearBtn'),
    status: document.getElementById('status'),
    themeToggle: document.getElementById('themeToggle'),
    themeMeta: document.getElementById('theme-color'),

    // Inputs
    text: document.getElementById('qrText'),

    // WiFi
    wifiSSID: document.getElementById('wifiSSID'),
    wifiPass: document.getElementById('wifiPass'),
    wifiType: document.getElementById('wifiType'),
    wifiHidden: document.getElementById('wifiHidden'),

    // vCard
    vcFirst: document.getElementById('vcFirst'),
    vcLast: document.getElementById('vcLast'),
    vcPhone: document.getElementById('vcPhone'),
    vcEmail: document.getElementById('vcEmail'),
    vcOrg: document.getElementById('vcOrg'),
    vcTitle: document.getElementById('vcTitle'),

    // Email
    emailAddr: document.getElementById('emailAddr'),
    emailSub: document.getElementById('emailSub'),
    emailBody: document.getElementById('emailBody'),
  };

  let activeTab = 'url';

  function setStatus(msg = '') { if (el.status) el.status.textContent = msg; }
  function setTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    el.themeMeta && (el.themeMeta.setAttribute('content', dark ? '#0f172a' : '#6366f1'));
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (_) { }
  }

  // Init theme
  setTheme(document.documentElement.getAttribute('data-theme') === 'dark');
  if (el.themeToggle) {
    el.themeToggle.addEventListener('click', () => {
      const nowDark = document.documentElement.getAttribute('data-theme') !== 'dark';
      setTheme(nowDark);
    });
  }

  // Tab Switching
  el.tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      el.tabs.forEach(b => b.classList.remove('active'));
      el.contents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      document.getElementById(`tab-${activeTab}`).classList.add('active');
    });
  });

  function correctLevelFrom(value) {
    const CL = window.QRCode?.CorrectLevel;
    if (CL) return CL[value] ?? CL.M;
    return { L: 1, M: 2, Q: 3, H: 4 }[value] ?? 2;
  }

  function resetQR() {
    if (el.box) el.box.innerHTML = '';
    if (el.download) el.download.disabled = true;
  }

  function getQRData() {
    switch (activeTab) {
      case 'url':
        return el.text.value.trim();

      case 'wifi':
        const ssid = el.wifiSSID.value.trim();
        const pass = el.wifiPass.value.trim();
        const type = el.wifiType.value;
        const hidden = el.wifiHidden.checked;
        if (!ssid) return null;
        return `WIFI:T:${type};S:${ssid};P:${pass};H:${hidden};;`;

      case 'vcard':
        const n = `${el.vcLast.value.trim()};${el.vcFirst.value.trim()};;;`;
        const fn = `${el.vcFirst.value.trim()} ${el.vcLast.value.trim()}`;
        const tel = el.vcPhone.value.trim();
        const email = el.vcEmail.value.trim();
        const org = el.vcOrg.value.trim();
        const title = el.vcTitle.value.trim();

        if (!fn.trim() && !tel && !email) return null;

        return `BEGIN:VCARD\nVERSION:3.0\nN:${n}\nFN:${fn}\nORG:${org}\nTITLE:${title}\nTEL;TYPE=CELL:${tel}\nEMAIL:${email}\nEND:VCARD`;

      case 'email':
        const addr = el.emailAddr.value.trim();
        const sub = el.emailSub.value.trim();
        const body = el.emailBody.value.trim();
        if (!addr) return null;
        return `mailto:${addr}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;

      default: return null;
    }
  }

  async function generateQR() {
    const text = getQRData();
    if (!text) { setStatus('Please enter valid content.'); resetQR(); return; }

    setStatus('Loading QR library…');
    await window.__ensureQRCodeLib();
    if (typeof window.QRCode === 'undefined') {
      setStatus('Failed to load QR library.');
      return;
    }

    setStatus('Generating…');
    resetQR();
    const size = parseInt(el.size.value, 10);
    const level = correctLevelFrom(el.ec.value);

    try {
      new window.QRCode(el.box, { text, width: size, height: size, correctLevel: level });
      requestAnimationFrame(() => {
        if (el.download) el.download.disabled = false;
        setStatus('Ready.');
      });
    } catch (e) {
      setStatus('Error generating code.');
      console.error(e);
    }
  }

  function downloadPNG() {
    const node = el.box.querySelector('canvas, img');
    if (!node) return;
    let data = '';
    if (node.tagName.toLowerCase() === 'canvas') data = node.toDataURL('image/png');
    else data = node.src;
    if (!data) return;
    const a = document.createElement('a'); a.href = data; a.download = `qrcode-${activeTab}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function clearAll() {
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(i => {
      if (i.type === 'checkbox') i.checked = false;
      else i.value = '';
    });
    resetQR();
    setStatus('Cleared.');
  }

  // Events
  if (el.generate) el.generate.addEventListener('click', (e) => { e.preventDefault(); generateQR(); });
  if (el.download) el.download.addEventListener('click', (e) => { e.preventDefault(); downloadPNG(); });
  if (el.clear) el.clear.addEventListener('click', (e) => { e.preventDefault(); clearAll(); });

  // Enter key support for simple inputs
  const simpleInputs = [el.text, el.wifiSSID, el.wifiPass, el.emailAddr, el.emailSub];
  simpleInputs.forEach(input => {
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); generateQR(); } });
  });

  // Focus input on ready
  if (el.text) window.addEventListener('DOMContentLoaded', () => el.text.focus());

  // Expose for debugging
  window.__qrapp = { generateQR, downloadPNG, clearAll };
})();

document.getElementById("year").textContent = new Date().getFullYear();
