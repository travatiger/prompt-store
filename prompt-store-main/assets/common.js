/* PromptHub shared helpers. Edit CONFIG below, everything else can stay as is. */
(function () {
  'use strict';

  var CONFIG = {
    supabaseUrl: 'https://bwtblyvnsiguhopmxggi.supabase.co',
    // Publishable key only. NEVER put a service_role / secret key in front-end code.
    supabaseKey: 'sb_publishable_BKBleSWgGlggg-MPaBBBcg_zTObBTW8',
    // Shown to customers next to the "submit payment" form. Replace with your real details.
    paymentInstructions:
      'Send the exact order amount to: [ADD YOUR PAYMENT DETAILS HERE - e.g. bank account / JazzCash / Easypaisa / PayPal].\n' +
      'Then enter the payment method and the transaction ID below.',
    supportEmail: 'support@example.com'
  };

  var CATEGORIES = {
    image: { label: 'AI Images', icon: '🖼️' },
    video: { label: 'AI Video', icon: '🎬' },
    youtube: { label: 'YouTube', icon: '▶️' },
    business: { label: 'Business', icon: '💼' }
  };

  function esc(x) {
    return String(x == null ? '' : x).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  function money(amount, currency) {
    var n = Number(amount);
    if (!isFinite(n)) return '-';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        minimumFractionDigits: n % 1 === 0 ? 0 : 2
      }).format(n);
    } catch (e) {
      return n + ' ' + (currency || '');
    }
  }

  // Works on http:// and in older browsers too (navigator.clipboard needs https).
  function copyText(text) {
    function fallback() {
      try {
        var t = document.createElement('textarea');
        t.value = text;
        t.setAttribute('readonly', '');
        t.style.position = 'fixed';
        t.style.opacity = '0';
        document.body.appendChild(t);
        t.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(t);
        return ok;
      } catch (e) {
        return false;
      }
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return fallback(); }
      );
    }
    return Promise.resolve(fallback());
  }

  // Remember this BEFORE supabase-js consumes the auth tokens in the URL hash.
  var isRecovery = /type=recovery/.test(location.hash);

  var db = null;
  var initError = null;
  // Keep the REST endpoint values available to pages that need a fallback.
  CONFIG.supabaseUrl = String(CONFIG.supabaseUrl).replace(/\/$/, '');
  try {
    if (!window.supabase) {
      throw new Error('The Supabase library did not load (network problem or blocked CDN).');
    }
    db = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  } catch (e) {
    initError = e;
  }

  window.PH = {
    CONFIG: CONFIG,
    CATEGORIES: CATEGORIES,
    esc: esc,
    money: money,
    copyText: copyText,
    isRecovery: isRecovery,
    db: db,
    initError: initError
  };
})();
