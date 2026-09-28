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

  var COUNTRIES = [
    ["Afghanistan","AF","93"],["Albania","AL","355"],["Algeria","DZ","213"],["Andorra","AD","376"],
    ["Angola","AO","244"],["Argentina","AR","54"],["Armenia","AM","374"],["Australia","AU","61"],
    ["Austria","AT","43"],["Azerbaijan","AZ","994"],["Bahamas","BS","1"],["Bahrain","BH","973"],
    ["Bangladesh","BD","880"],["Barbados","BB","1"],["Belarus","BY","375"],["Belgium","BE","32"],
    ["Belize","BZ","501"],["Benin","BJ","229"],["Bhutan","BT","975"],["Bolivia","BO","591"],
    ["Bosnia and Herzegovina","BA","387"],["Botswana","BW","267"],["Brazil","BR","55"],["Brunei","BN","673"],
    ["Bulgaria","BG","359"],["Burkina Faso","BF","226"],["Burundi","BI","257"],["Cambodia","KH","855"],
    ["Cameroon","CM","237"],["Canada","CA","1"],["Cape Verde","CV","238"],["Central African Republic","CF","236"],
    ["Chad","TD","235"],["Chile","CL","56"],["China","CN","86"],["Colombia","CO","57"],
    ["Comoros","KM","269"],["Congo","CG","242"],["Costa Rica","CR","506"],["Croatia","HR","385"],
    ["Cuba","CU","53"],["Cyprus","CY","357"],["Czech Republic","CZ","420"],["Denmark","DK","45"],
    ["Djibouti","DJ","253"],["Dominica","DM","1"],["Dominican Republic","DO","1"],["Ecuador","EC","593"],
    ["Egypt","EG","20"],["El Salvador","SV","503"],["Equatorial Guinea","GQ","240"],["Eritrea","ER","291"],
    ["Estonia","EE","372"],["Eswatini","SZ","268"],["Ethiopia","ET","251"],["Fiji","FJ","679"],
    ["Finland","FI","358"],["France","FR","33"],["Gabon","GA","241"],["Gambia","GM","220"],
    ["Georgia","GE","995"],["Germany","DE","49"],["Ghana","GH","233"],["Greece","GR","30"],
    ["Grenada","GD","1"],["Guatemala","GT","502"],["Guinea","GN","224"],["Guinea-Bissau","GW","245"],
    ["Guyana","GY","592"],["Haiti","HT","509"],["Honduras","HN","504"],["Hong Kong","HK","852"],
    ["Hungary","HU","36"],["Iceland","IS","354"],["India","IN","91"],["Indonesia","ID","62"],
    ["Iran","IR","98"],["Iraq","IQ","964"],["Ireland","IE","353"],["Israel","IL","972"],
    ["Italy","IT","39"],["Ivory Coast","CI","225"],["Jamaica","JM","1"],["Japan","JP","81"],
    ["Jordan","JO","962"],["Kazakhstan","KZ","7"],["Kenya","KE","254"],["Kiribati","KI","686"],
    ["Kosovo","XK","383"],["Kuwait","KW","965"],["Kyrgyzstan","KG","996"],["Laos","LA","856"],
    ["Latvia","LV","371"],["Lebanon","LB","961"],["Lesotho","LS","266"],["Liberia","LR","231"],
    ["Libya","LY","218"],["Liechtenstein","LI","423"],["Lithuania","LT","370"],["Luxembourg","LU","352"],
    ["Macau","MO","853"],["Madagascar","MG","261"],["Malawi","MW","265"],["Malaysia","MY","60"],
    ["Maldives","MV","960"],["Mali","ML","223"],["Malta","MT","356"],["Marshall Islands","MH","692"],
    ["Mauritania","MR","222"],["Mauritius","MU","230"],["Mexico","MX","52"],["Micronesia","FM","691"],
    ["Moldova","MD","373"],["Monaco","MC","377"],["Mongolia","MN","976"],["Montenegro","ME","382"],
    ["Morocco","MA","212"],["Mozambique","MZ","258"],["Myanmar","MM","95"],["Namibia","NA","264"],
    ["Nauru","NR","674"],["Nepal","NP","977"],["Netherlands","NL","31"],["New Zealand","NZ","64"],
    ["Nicaragua","NI","505"],["Niger","NE","227"],["Nigeria","NG","234"],["North Korea","KP","850"],
    ["North Macedonia","MK","389"],["Norway","NO","47"],["Oman","OM","968"],["Pakistan","PK","92"],
    ["Palau","PW","680"],["Palestine","PS","970"],["Panama","PA","507"],["Papua New Guinea","PG","675"],
    ["Paraguay","PY","595"],["Peru","PE","51"],["Philippines","PH","63"],["Poland","PL","48"],
    ["Portugal","PT","351"],["Qatar","QA","974"],["Romania","RO","40"],["Russia","RU","7"],
    ["Rwanda","RW","250"],["Saint Lucia","LC","1"],["Samoa","WS","685"],["San Marino","SM","378"],
    ["Saudi Arabia","SA","966"],["Senegal","SN","221"],["Serbia","RS","381"],["Seychelles","SC","248"],
    ["Sierra Leone","SL","232"],["Singapore","SG","65"],["Slovakia","SK","421"],["Slovenia","SI","386"],
    ["Solomon Islands","SB","677"],["Somalia","SO","252"],["South Africa","ZA","27"],["South Korea","KR","82"],
    ["South Sudan","SS","211"],["Spain","ES","34"],["Sri Lanka","LK","94"],["Sudan","SD","249"],
    ["Suriname","SR","597"],["Sweden","SE","46"],["Switzerland","CH","41"],["Syria","SY","963"],
    ["Taiwan","TW","886"],["Tajikistan","TJ","992"],["Tanzania","TZ","255"],["Thailand","TH","66"],
    ["Timor-Leste","TL","670"],["Togo","TG","228"],["Tonga","TO","676"],["Trinidad and Tobago","TT","1"],
    ["Tunisia","TN","216"],["Turkey","TR","90"],["Turkmenistan","TM","993"],["Tuvalu","TV","688"],
    ["Uganda","UG","256"],["Ukraine","UA","380"],["United Arab Emirates","AE","971"],["United Kingdom","GB","44"],
    ["United States","US","1"],["Uruguay","UY","598"],["Uzbekistan","UZ","998"],["Vanuatu","VU","678"],
    ["Vatican City","VA","379"],["Venezuela","VE","58"],["Vietnam","VN","84"],["Yemen","YE","967"],
    ["Zambia","ZM","260"],["Zimbabwe","ZW","263"]
  ].map(function(c){return {name:c[0],iso2:c[1],dial:'+'+c[2]}});

  function flagEmoji(iso2) {
    if (!iso2 || iso2.length !== 2) return '';
    var cps = iso2.toUpperCase().split('').map(function (c) { return 127397 + c.charCodeAt(0); });
    return String.fromCodePoint.apply(null, cps);
  }

  function countryByName(name) {
    return COUNTRIES.find(function (c) { return c.name === name; }) || null;
  }

  function slugifyName(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  async function generateUniqueUsername(db, base) {
    base = slugifyName(base) || 'user';
    var candidate = base, n = 0;
    while (true) {
      var r = await db.from('profiles').select('id').eq('username', candidate).maybeSingle();
      if (!r.data) return candidate;
      n++;
      candidate = base + n;
    }
  }

  async function ensureProfile(user) {
    var db = api.db;
    var r = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (r.data) return r.data;
    var fullName = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || '';
    var base = slugifyName(fullName) || slugifyName((user.email || '').split('@')[0]) || 'user';
    var username = await generateUniqueUsername(db, base);
    var ins = await db.from('profiles').insert({
      id: user.id,
      full_name: fullName,
      username: username,
      website_url: location.origin
    }).select().single();
    return ins.data || null;
  }

  var REQUIRED_PROFILE_FIELDS = ['full_name','username','bio','country','city','phone_number','website_url','occupation','education'];
  function isProfileComplete(p) {
    if (!p) return false;
    return REQUIRED_PROFILE_FIELDS.every(function (k) { return p[k] != null && String(p[k]).trim() !== ''; });
  }

  async function requireCompleteProfile() {
    var db = api.db;
    var s = await db.auth.getSession();
    var user = s.data && s.data.session ? s.data.session.user : null;
    if (!user) return true;
    var prof = await ensureProfile(user);
    if (!isProfileComplete(prof)) {
      if (location.pathname.indexOf('account.html') === -1) {
        location.href = 'account.html?complete=1';
      }
      return false;
    }
    return true;
  }

  function mountSearch(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    mount.style.position = 'relative';
    mount.innerHTML =
      '<button class="theme-btn" id="phSearchBtn" type="button" aria-label="Search people">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
      '</button>' +
      '<div id="phSearchPanel" style="position:absolute;top:44px;right:0;width:280px;max-width:80vw;background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);padding:10px;display:none;z-index:60">' +
      '<input id="phSearchInput" type="text" placeholder="Search name or username…" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--soft);color:var(--text);font:inherit;box-sizing:border-box">' +
      '<div id="phSearchResults" style="max-height:300px;overflow:auto;margin-top:8px"></div>' +
      '</div>';

    var btn = document.getElementById('phSearchBtn');
    var panel = document.getElementById('phSearchPanel');
    var input = document.getElementById('phSearchInput');
    var results = document.getElementById('phSearchResults');

    btn.onclick = function () {
      var opening = panel.style.display !== 'block';
      panel.style.display = opening ? 'block' : 'none';
      if (opening) input.focus();
    };
    document.addEventListener('click', function (e) {
      if (!mount.contains(e.target)) panel.style.display = 'none';
    });

    var timer = null;
    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(timer);
      if (!q) { results.innerHTML = ''; return; }
      timer = setTimeout(async function () {
        var safe = q.replace(/[%,]/g, '');
        var r = await api.db.from('profiles')
          .select('id,full_name,username,avatar_url')
          .or('full_name.ilike.%' + safe + '%,username.ilike.%' + safe + '%')
          .limit(15);
        var list = r.error ? [] : (r.data || []);
        if (!list.length) {
          results.innerHTML = '<div style="padding:8px 6px;color:var(--muted);font-size:13px">No users found.</div>';
          return;
        }
        results.innerHTML = list.map(function (u) {
          var av = u.avatar_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23e5e5e5"/></svg>';
          return '<a href="profile.html?u=' + esc(u.id) + '" style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-radius:10px;text-decoration:none;color:inherit">' +
            '<img src="' + esc(av) + '" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;background:var(--soft)">' +
            '<div style="min-width:0"><b style="display:block;font-size:13.5px">' + esc(u.full_name || 'User') + '</b><span style="display:block;font-size:12px;color:var(--muted)">' + (u.username ? '@' + esc(u.username) : '') + '</span></div>' +
            '</a>';
        }).join('');
      }, 250);
    });
  }

  async function mountLogo(mountId) {
    var el = document.getElementById(mountId);
    if (!el) return;
    var DEF = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23e5e5e5"/><circle cx="20" cy="15" r="7" fill="%23a0a0a0"/><path d="M6 36c2-9 9.5-13.5 14-13.5S32 27 34 36" fill="%23a0a0a0"/></svg>';
    var av = null;
    try {
      var s = await api.db.auth.getSession();
      var user = s.data && s.data.session ? s.data.session.user : null;
      if (user) {
        var r = await api.db.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
        av = (r.data && r.data.avatar_url) || null;
      }
    } catch (e) {}
    el.innerHTML = '<img src="' + esc(av || DEF) + '" alt="Your profile" style="width:34px;height:34px;border-radius:50%;object-fit:cover;background:var(--soft);display:block">';
  }

  /* ---------- time ago ---------- */
  function timeAgo(iso) {
    if (!iso) return '';
    var d = new Date(iso).getTime();
    if (isNaN(d)) return '';
    var s = Math.max(0, Math.floor((Date.now() - d) / 1000));
    if (s < 60) return 'now';
    var m = Math.floor(s / 60); if (m < 60) return m + 'm';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h';
    var days = Math.floor(h / 24); if (days < 30) return days + 'd';
    var mo = Math.floor(days / 30); if (mo < 12) return mo + 'mo';
    return Math.floor(mo / 12) + 'y';
  }

  /* ---------- verified badge ---------- */
  function verifiedBadge(isVerified) {
    if (!isVerified) return '';
    return '<svg class="verified-badge" viewBox="0 0 24 24" fill="#3897f0" title="Verified"><path d="M12 2l2.4 2.2 3.2-.6.9 3.1 3 1.3-1 3.1 1 3.1-3 1.3-.9 3.1-3.2-.6L12 22l-2.4-2.2-3.2.6-.9-3.1-3-1.3 1-3.1-1-3.1 3-1.3.9-3.1 3.2.6z"/><path d="M8.5 12.2l2.3 2.3 4.5-4.7" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* ---------- blocking ---------- */
  async function getBlockedSet(userId) {
    var set = new Set();
    if (!userId) return set;
    try {
      var r = await api.db.from('user_blocks').select('blocked_id').eq('blocker_id', userId);
      (r.data || []).forEach(function (x) { set.add(x.blocked_id); });
    } catch (e) {}
    return set;
  }

  /* ---------- notifications bell ---------- */
  var NOTIF_LABEL = {
    like: 'liked your prompt',
    comment: 'commented on your prompt',
    reply: 'replied to your comment',
    follow: 'started following you'
  };
  async function mountNotifications(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    var s = await api.db.auth.getSession();
    var user = s.data && s.data.session ? s.data.session.user : null;
    if (!user) { mount.innerHTML = ''; return; }

    mount.style.position = 'relative';
    mount.innerHTML =
      '<button class="theme-btn" id="phNotifBtn" type="button" aria-label="Notifications">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>' +
      '<span id="phNotifDot" class="notif-dot" hidden></span>' +
      '</button>' +
      '<div id="phNotifPanel" class="notif-panel" style="display:none">' +
      '<div id="phNotifList" class="notif-list"><div class="comment-loading" style="padding:12px">Loading…</div></div>' +
      '</div>';

    var btn = document.getElementById('phNotifBtn');
    var panel = document.getElementById('phNotifPanel');
    var dot = document.getElementById('phNotifDot');
    var loaded = false;

    async function refreshCount() {
      var r = await api.db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
      if (r.error) console.error('Notifications count error:', r.error);
      var d = document.getElementById('phNotifDot');
      if (d && panel.style.display !== 'block') d.hidden = !(r.count && r.count > 0);
    }
    async function loadList() {
      var r = await api.db.from('notifications')
        .select('id,type,is_read,created_at,prompt_id,actor:profiles!notifications_actor_id_fkey(id,username,full_name,avatar_url)')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(30);
      var list = r.error ? [] : (r.data || []);
      var listEl = document.getElementById('phNotifList');
      if (!listEl) return;
      if (r.error) { console.error('Notifications load error:', r.error); listEl.innerHTML = '<div class="comment-loading" style="padding:12px">Could not load notifications: ' + esc(r.error.message || 'unknown error') + '</div>'; return; }
      if (!list.length) { listEl.innerHTML = '<div class="comment-loading" style="padding:12px">No notifications yet.</div>'; return; }
      var DEF = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23e5e5e5"/></svg>';
      listEl.innerHTML = list.map(function (n) {
        var a = n.actor || {};
        var name = a.username ? ('@' + esc(a.username)) : esc(a.full_name || 'Someone');
        var href = n.type === 'follow' ? ('profile.html?u=' + esc(a.id || '')) : (n.prompt_id ? 'prompts.html?view=' + esc(n.prompt_id) : 'prompts.html');
        return '<a class="notif-item' + (n.is_read ? '' : ' unread') + '" href="' + href + '">' +
          '<img src="' + esc(a.avatar_url || DEF) + '" alt="">' +
          '<div><b>' + name + '</b> ' + (NOTIF_LABEL[n.type] || '') + '<span class="notif-time">' + timeAgo(n.created_at) + '</span></div>' +
          '</a>';
      }).join('');
    }
    btn.onclick = async function () {
      var opening = panel.style.display !== 'block';
      panel.style.display = opening ? 'block' : 'none';
      if (opening) {
        await loadList();
        dot.hidden = true;
        await api.db.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      }
    };
    if (window.__phNotifDocHandler) document.removeEventListener('click', window.__phNotifDocHandler);
    window.__phNotifDocHandler = function (e) {
      if (!mount.contains(e.target)) panel.style.display = 'none';
    };
    document.addEventListener('click', window.__phNotifDocHandler);
    if (window.__phNotifTimer) clearInterval(window.__phNotifTimer);
    window.__phNotifTimer = setInterval(refreshCount, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshCount(); });
    refreshCount();
  }

  var api = {
    SUPABASE_URL: SUPABASE_URL,
    CONFIG: CONFIG,
    CATEGORIES: CATEGORIES,
    COUNTRIES: COUNTRIES,
    esc: esc,
    copyText: copyText,
    initTheme: initTheme,
    bindThemeToggle: bindThemeToggle,
    flagEmoji: flagEmoji,
    countryByName: countryByName,
    slugifyName: slugifyName,
    ensureProfile: ensureProfile,
    isProfileComplete: isProfileComplete,
    requiredProfileFields: REQUIRED_PROFILE_FIELDS,
    requireCompleteProfile: requireCompleteProfile,
    mountSearch: mountSearch,
    mountLogo: mountLogo,
    timeAgo: timeAgo,
    verifiedBadge: verifiedBadge,
    getBlockedSet: getBlockedSet,
    mountNotifications: mountNotifications,
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
