// // Your JavaScript code will go here
// // --- QR Code generator app script ---

// (function initTheme(){
//   try {
//     const saved = localStorage.getItem('theme');
//     const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
//     const dark = saved ? saved === 'dark' : prefersDark;
//     document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
//   } catch(_) {}
// })();

// // --- Ensure QR library present with CDN fallback ---
// (function bootstrapQRCode(){
//   const primary = document.getElementById('qrcode-lib');
//   function injectFallback(){
//     if (window.QRCode) return Promise.resolve();
//     return new Promise((resolve, reject) => {
//       const s = document.createElement('script');
//       s.src = 'https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js';
//       s.async = true;
//       s.onload = () => resolve();
//       s.onerror = () => reject(new Error('Fallback QRCode library failed to load'));
//       document.head.appendChild(s);
//     });
//   }
//   window.__ensureQRCodeLib = function(){
//     if (window.QRCode) return Promise.resolve();
//     return new Promise((resolve) => {
//       const timer = setTimeout(async () => { try { await injectFallback(); } finally { resolve(); } }, 1200);
//       primary.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once:true });
//       primary.addEventListener('error', async () => { clearTimeout(timer); await injectFallback(); resolve(); }, { once:true });
//     });
//   }
// })();

// // --- PWA registration, guarded for sandbox/non-secure contexts ---
// (function setupPWA(){
//   const pwaStatus = document.getElementById('pwaStatus');
//   const installBtn = document.getElementById('installBtn');
//   let deferredPrompt = null;

//   function canRegisterSW(){
//     return 'serviceWorker' in navigator && window.isSecureContext; // https or localhost
//   }

//   // Try register only when safe; otherwise, skip to avoid errors in sandbox
//   async function tryRegister(){
//     if (!canRegisterSW()) {
//       pwaStatus.textContent = 'PWA: unavailable (non-secure context)';
//       return { ok:false, reason:'insecure-context' };
//     }
//     try {
//       const reg = await navigator.serviceWorker.register('service-worker.js');
//       pwaStatus.textContent = 'PWA: registered';
//       return { ok:true, reg };
//     } catch (err) {
//       pwaStatus.textContent = 'PWA: registration failed';
//       console.warn('SW registration failed:', err);
//       return { ok:false, reason:err?.message || 'registration-failed' };
//     }
//   }

//   // Defer automatic registration; never throw
//   tryRegister();

//   // Install prompt handling
//   window.addEventListener('beforeinstallprompt', (e) => {
//     e.preventDefault();
//     deferredPrompt = e;
//     installBtn.hidden = false;
//   });
//   installBtn.addEventListener('click', async () => {
//     if (!deferredPrompt) return;
//     deferredPrompt.prompt();
//     await deferredPrompt.userChoice;
//     installBtn.hidden = true;
//     deferredPrompt = null;
//   });

//   // Expose for tests
//   window.__pwa = { canRegisterSW, tryRegister };
// })();

// // --- App logic ---
// (function app(){
//   const el = {
//     text: document.getElementById('qrText'),
//     size: document.getElementById('qrSize'),
//     ec: document.getElementById('qrEC'),
//     box: document.getElementById('qrcode'),
//     generate: document.getElementById('generateBtn'),
//     download: document.getElementById('downloadBtn'),
//     clear: document.getElementById('clearBtn'),
//     selfTest: document.getElementById('selfTestBtn'),
//     status: document.getElementById('status'),
//     log: document.getElementById('testlog'),
//     themeToggle: document.getElementById('themeToggle'),
//     themeMeta: document.getElementById('theme-color'),
//   };

//   function setStatus(msg=''){ el.status.textContent = msg; }
//   function setTheme(dark){
//     document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
//     el.themeToggle.textContent = dark ? '☀️ Light Mode' : '🌙 Dark Mode';
//     el.themeMeta && (el.themeMeta.setAttribute('content', dark ? '#0b1220' : '#4f46e5'));
//     try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch(_) {}
//   }

//   // Init theme button label
//   setTheme(document.documentElement.getAttribute('data-theme') === 'dark');
//   el.themeToggle.addEventListener('click', () => {
//     const nowDark = document.documentElement.getAttribute('data-theme') !== 'dark';
//     setTheme(nowDark);
//   });

//   function correctLevelFrom(value) {
//     // Defaults map if library not yet present
//     const CL = window.QRCode?.CorrectLevel;
//     if (CL) return CL[value] ?? CL.M;
//     return {L:1,M:2,Q:3,H:4}[value] ?? 2;
//   }

//   function resetQR(){
//     el.box.innerHTML = '';
//     el.download.disabled = true;
//   }

//   async function generateQR(){
//     const text = el.text.value.trim();
//     if (!text) { setStatus('Enter text or a URL to generate a code.'); resetQR(); return; }
//     setStatus('Loading QR library…');
//     await window.__ensureQRCodeLib();
//     if (typeof window.QRCode === 'undefined') {
//       setStatus('Failed to load QR library.');
//       return;
//     }
//     setStatus('Generating…');
//     resetQR();
//     const size = parseInt(el.size.value, 10);
//     const level = correctLevelFrom(el.ec.value);
//     // eslint-disable-next-line no-new
//     new window.QRCode(el.box, { text, width: size, height: size, correctLevel: level });
//     requestAnimationFrame(() => { el.download.disabled = false; setStatus('Ready.'); });
//   }

//   function downloadPNG(){
//     const node = el.box.querySelector('canvas, img');
//     if (!node) return;
//     let data = '';
//     if (node.tagName.toLowerCase() === 'canvas') data = node.toDataURL('image/png');
//     else data = node.src;
//     if (!data) return;
//     const a = document.createElement('a'); a.href = data; a.download = 'qrcode.png';
//     document.body.appendChild(a); a.click(); a.remove();
//   }

//   function clearAll(){ el.text.value=''; resetQR(); setStatus('Cleared.'); el.text.focus(); }

//   // Events
//   el.generate.addEventListener('click', (e)=>{ e.preventDefault(); generateQR(); });
//   el.download.addEventListener('click', (e)=>{ e.preventDefault(); downloadPNG(); });
//   el.clear.addEventListener('click', (e)=>{ e.preventDefault(); clearAll(); });
//   el.text.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') { e.preventDefault(); generateQR(); } });

//   // --- Self tests ---
//   function log(msg){ el.log.hidden = false; el.log.textContent += `${msg}\n`; }
//   function clearLog(){ el.log.textContent=''; el.log.hidden = true; }
//   async function runSelfTest(){
//     clearLog();
//     log('Self‑test started.');

//     // T1: Empty input should not generate; download disabled
//     clearAll();
//     await generateQR();
//     const t1 = el.box.childElementCount === 0 && el.download.disabled === true;
//     log(`T1 (empty input prevents generation): ${t1 ? 'PASS' : 'FAIL'}`);

//     // T2: Generate a QR for URL
//     el.text.value = 'https://example.com';
//     el.size.value = '160';
//     el.ec.value = 'M';
//     await generateQR();
//     const node2 = el.box.querySelector('canvas, img');
//     const t2 = !!node2 && el.download.disabled === false;
//     log(`T2 (generate & enable download): ${t2 ? 'PASS' : 'FAIL'}`);

//     // T3: Clear removes the QR
//     clearAll();
//     const t3 = el.box.childElementCount === 0;
//     log(`T3 (clear removes QR): ${t3 ? 'PASS' : 'FAIL'}`);

//     // T4: PWA guard should not throw in non-secure context
//     const canSW = window.__pwa?.canRegisterSW?.();
//     const expectedNonSecure = !window.isSecureContext;
//     const t4 = expectedNonSecure ? (canSW === false) : true; // if secure, we skip strict check
//     log(`T4 (service worker guard in sandbox): ${t4 ? 'PASS' : 'SKIP/OK'}`);

//     // T5: Theme toggle updates attribute
//     const current = document.documentElement.getAttribute('data-theme');
//     const target = current === 'dark' ? 'light' : 'dark';
//     document.getElementById('themeToggle').click();
//     const t5 = document.documentElement.getAttribute('data-theme') === target;
//     log(`T5 (dark mode toggle): ${t5 ? 'PASS' : 'FAIL'}`);

//     log('Self‑test finished.');
//   }
//   el.selfTest.addEventListener('click', (e)=>{ e.preventDefault(); runSelfTest(); });

//   // Focus input on ready
//   window.addEventListener('DOMContentLoaded', () => el.text.focus());

//   // Expose for debugging
//   window.__qrapp = { generateQR, downloadPNG, clearAll };
// })();

// --- Theme Initialization ---

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
    text: document.getElementById('qrText'),
    size: document.getElementById('qrSize'),
    ec: document.getElementById('qrEC'),
    box: document.getElementById('qrcode'),
    generate: document.getElementById('generateBtn'),
    download: document.getElementById('downloadBtn'),
    clear: document.getElementById('clearBtn'),
    status: document.getElementById('status'),
    themeToggle: document.getElementById('themeToggle'),
    themeMeta: document.getElementById('theme-color'),
  };

  function setStatus(msg = '') { el.status.textContent = msg; }
  function setTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    // el.themeToggle.textContent = dark ? '🌙':'☀️'; // Removed: using CSS icons now
    el.themeMeta && (el.themeMeta.setAttribute('content', dark ? '#0f172a' : '#6366f1'));
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (_) { }
  }

  // Init theme button label
  setTheme(document.documentElement.getAttribute('data-theme') === 'dark');
  el.themeToggle.addEventListener('click', () => {
    const nowDark = document.documentElement.getAttribute('data-theme') !== 'dark';
    setTheme(nowDark);
  });

  function correctLevelFrom(value) {
    const CL = window.QRCode?.CorrectLevel;
    if (CL) return CL[value] ?? CL.M;
    return { L: 1, M: 2, Q: 3, H: 4 }[value] ?? 2;
  }

  function resetQR() {
    el.box.innerHTML = '';
    el.download.disabled = true;
  }

  async function generateQR() {
    const text = el.text.value.trim();
    if (!text) { setStatus('Enter text or a URL to generate a code.'); resetQR(); return; }
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
    new window.QRCode(el.box, { text, width: size, height: size, correctLevel: level });
    requestAnimationFrame(() => { el.download.disabled = false; setStatus('Ready.'); });
  }

  function downloadPNG() {
    const node = el.box.querySelector('canvas, img');
    if (!node) return;
    let data = '';
    if (node.tagName.toLowerCase() === 'canvas') data = node.toDataURL('image/png');
    else data = node.src;
    if (!data) return;
    const a = document.createElement('a'); a.href = data; a.download = 'qrcode.png';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function clearAll() { el.text.value = ''; resetQR(); setStatus('Cleared.'); el.text.focus(); }

  // Events
  el.generate.addEventListener('click', (e) => { e.preventDefault(); generateQR(); });
  el.download.addEventListener('click', (e) => { e.preventDefault(); downloadPNG(); });
  el.clear.addEventListener('click', (e) => { e.preventDefault(); clearAll(); });
  el.text.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); generateQR(); } });

  // Focus input on ready
  window.addEventListener('DOMContentLoaded', () => el.text.focus());

  // Expose for debugging
  window.__qrapp = { generateQR, downloadPNG, clearAll };
})();

document.getElementById("year").textContent = new Date().getFullYear();
