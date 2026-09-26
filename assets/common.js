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

  function initTheme() {
    var saved = localStorage.getItem('ph-theme');
    var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }

  function bindThemeToggle(btnId) {
    var btn = document.getElementById(btnId || 'themeBtn');
    if (!btn) return;
    btn.onclick = function () {
      var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ph-theme', next);
    };
  }

  initTheme();

  var api = {
    SUPABASE_URL: SUPABASE_URL,
    CONFIG: CONFIG,
    CATEGORIES: CATEGORIES,
    esc: esc,
    copyText: copyText,
    initTheme: initTheme,
    bindThemeToggle: bindThemeToggle,
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
