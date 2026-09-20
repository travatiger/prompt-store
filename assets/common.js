(function () {
  'use strict';

  var SUPABASE_URL = 'https://bwtblyvnsiguhopmxggi.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_BKBleSWgGlggg-MPaBBBcg_zTObBTW8';

  var CONFIG = {
    paymentInstructions:
      '₿ Binance Pay\n' +
      'Binance UID: 984200359\n\n' +
      'After payment, enter the transaction ID/reference below.\n' +
      'Payments are checked manually by the PromptHub admin.'
  };

  var CATEGORIES = {
    image: { label: 'AI Images', icon: '🖼️' },
    video: { label: 'AI Video', icon: '🎬' },
    youtube: { label: 'YouTube', icon: '▶️' },
    business: { label: 'Business', icon: '💼' }
  };

  function esc(x) {
    return String(x == null ? '' : x).replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
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

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(String(text || ''));
        return true;
      }
    } catch (e) {}

    try {
      var ta = document.createElement('textarea');
      ta.value = String(text || '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  var api = {
    SUPABASE_URL: SUPABASE_URL,
    CONFIG: CONFIG,
    CATEGORIES: CATEGORIES,
    esc: esc,
    money: money,
    copyText: copyText,
    db: null,
    initError: null
  };

  try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('Supabase client library did not load.');
    }
    api.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    api.initError = e;
  }

  window.PH = api;
})();
