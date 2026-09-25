(function () {
  'use strict';

  var SUPABASE_URL = 'https://bwtblyvnsiguhopmxggi.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_BKBleSWgGlggg-MPaBBBcg_zTObBTW8';

  var CONFIG = {};

  var CATEGORIES = {
    image: { label: 'AI Images', icon: '🖼️' },
    video: { label: 'AI Video', icon: '🎬' },
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
        
