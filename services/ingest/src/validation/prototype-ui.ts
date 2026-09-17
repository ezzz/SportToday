export function uxPrototypeHtml(): string {
  return `<!doctype html>
<html lang="fr" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>SportToday — Prototype UX</title>
  <style>
    :root {
      color-scheme: light;
      --page:#f5f7fa;
      --surface:#fbfcfe;
      --surface-strong:#ffffff;
      --ink:#192132;
      --muted:#616b7c;
      --faint:#8c94a1;
      --line:#d9dfe8;
      --line-soft:#e9edf2;
      --accent:#2b59a2;
      --accent-strong:#1c3968;
      --accent-bright:#3d70bd;
      --accent-soft:#e6edf8;
      --highlight:#d58a28;
      --highlight-soft:#fff1dc;
      --live:#d72d2d;
      --focus:var(--accent-bright);
      --shadow:0 14px 40px rgba(22,28,27,.09);
      font-family:Inter,"Avenir Next","Segoe UI",Roboto,Helvetica,Arial,system-ui,-apple-system,sans-serif;
    }
    html[data-theme="dark"] {
      color-scheme:dark;
      --page:#12151b;
      --surface:#191d25;
      --surface-strong:#202631;
      --ink:#f2f4f7;
      --muted:#abb3c0;
      --faint:#788291;
      --line:#363e4b;
      --line-soft:#292f39;
      --accent:#80adf0;
      --accent-strong:#bdd3f5;
      --accent-bright:#6494dc;
      --accent-soft:#202e44;
      --highlight:#efb35c;
      --highlight-soft:#3b2d1c;
      --live:#ff5c5c;
      --shadow:0 18px 46px rgba(0,0,0,.28);
    }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; background:var(--page); color:var(--ink); }
    button,input { font:inherit; }
    button { color:inherit; }
    button:focus-visible,input:focus-visible,summary:focus-visible { outline:3px solid color-mix(in srgb,var(--focus) 45%,transparent); outline-offset:3px; }
    .site-header { background:color-mix(in srgb,var(--surface) 94%,transparent); border-top:3px solid var(--accent-bright); border-bottom:1px solid var(--line); position:sticky; top:0; z-index:20; backdrop-filter:blur(12px); }
    .header-inner { width:calc(100% - 32px); max-width:980px; min-height:66px; margin:auto; display:flex; align-items:center; gap:22px; }
    .brand { color:var(--ink); text-decoration:none; font-size:20px; font-weight:750; letter-spacing:-.045em; white-space:nowrap; }
    .brand-mark { color:var(--accent-bright); }
    .search { flex:1; position:relative; max-width:420px; margin-left:auto; }
    .search svg { position:absolute; width:16px; height:16px; left:13px; top:50%; transform:translateY(-50%); color:var(--muted); pointer-events:none; }
    .search input { width:100%; height:38px; padding:0 14px 0 39px; border:1px solid var(--line); border-radius:999px; color:var(--ink); background:var(--page); transition:border-color .15s ease,box-shadow .15s ease; }
    .search input:focus { border-color:var(--accent-bright); box-shadow:0 0 0 3px color-mix(in srgb,var(--accent-bright) 13%,transparent); }
    .search input::placeholder { color:var(--faint); }
    .header-actions { display:flex; align-items:center; gap:4px; }
    .plain-button,.icon-button { border:0; background:transparent; cursor:pointer; border-radius:9px; }
    .plain-button { padding:9px 10px; color:var(--muted); font-size:13px; }
    .plain-button:hover,.icon-button:hover { background:var(--accent-soft); color:var(--ink); }
    .icon-button { width:38px; height:38px; display:grid; place-items:center; }
    .icon-button svg { width:19px; height:19px; }
    main { width:calc(100% - 32px); max-width:800px; margin:0 auto; padding:28px 0 52px; }
    .prototype-note { margin:0 0 22px; color:var(--faint); font-size:11px; letter-spacing:.05em; text-transform:uppercase; }
    .date-nav { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); border-bottom:1px solid var(--line); margin-bottom:24px; }
    .date-tab { min-width:0; border:0; border-bottom:2px solid transparent; padding:11px 5px 12px; margin-bottom:-1px; background:transparent; color:var(--muted); cursor:pointer; font-weight:650; }
    .date-tab[aria-selected="true"] { border-bottom-color:var(--accent-bright); color:var(--accent-strong); background:var(--accent-soft); border-radius:10px 10px 0 0; }
    .date-tab small { display:block; margin-top:2px; color:var(--faint); font-weight:450; font-size:10px; }
    .day-panel[hidden] { display:none; }
    .day-intro { display:flex; align-items:end; justify-content:space-between; gap:16px; margin-bottom:18px; }
    .day-intro h1 { margin:0; color:var(--accent-strong); font-size:clamp(25px,4vw,34px); letter-spacing:-.045em; line-height:1.05; }
    .day-intro p { margin:7px 0 0; color:var(--muted); font-size:13px; }
    .day-action { border:0; padding:5px 0; background:none; color:var(--accent); cursor:pointer; font-size:12px; font-weight:700; white-space:nowrap; }
    .sport { position:relative; margin:0 0 24px; padding-left:15px; }
    .sport::before { content:""; position:absolute; left:0; top:2px; bottom:0; width:3px; border-radius:99px; background:color-mix(in srgb,var(--accent-bright) 66%,var(--line)); }
    .sport.secondary-sport[hidden],.event.extra-event[hidden],.event.finished[hidden] { display:none; }
    .sport-header { display:flex; align-items:center; gap:9px; min-height:31px; margin-bottom:5px; }
    .sport-icon { display:none; }
    .sport-header h2 { margin:0; color:var(--accent-strong); font-size:18px; font-weight:760; letter-spacing:-.025em; }
    .sport-header .sport-count { margin-left:auto; color:var(--muted); font-size:12px; font-weight:620; }
    .competition { border-top:2px solid color-mix(in srgb,var(--accent) 18%,var(--line)); }
    .competition + .competition { margin-top:10px; }
    .competition-header { min-height:42px; display:flex; align-items:center; gap:7px; padding:8px 2px 6px; }
    .competition-header h3 { margin:0; font-size:15px; font-weight:720; letter-spacing:-.015em; }
    .competition-header .meta { color:var(--muted); font-size:12px; font-weight:520; }
    .competition-header .meta::before { content:"/"; margin-right:7px; color:var(--faint); }
    .expand-competition { margin-left:auto; border:1px solid color-mix(in srgb,var(--accent) 28%,var(--line)); border-radius:999px; padding:6px 11px; background:var(--accent-soft); color:var(--accent-strong); cursor:pointer; font-size:11px; font-weight:750; white-space:nowrap; }
    .event { border-bottom:1px solid var(--line-soft); }
    .event[data-preference-hidden="true"],.sport[data-preference-hidden="true"] { display:none!important; }
    .event summary { list-style:none; cursor:pointer; display:grid; grid-template-columns:58px minmax(0,1fr) minmax(95px,auto) 18px; align-items:center; gap:10px; min-height:45px; padding:6px 2px; transition:background .15s ease; }
    .event summary:hover { background:color-mix(in srgb,var(--accent-soft) 55%,transparent); }
    .event summary::-webkit-details-marker { display:none; }
    .time { font-variant-numeric:tabular-nums; font-weight:760; font-size:14px; }
    .event-title { min-width:0; font-size:14px; font-weight:570; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .channel { color:var(--accent-strong); font-size:12px; font-weight:700; text-align:right; line-height:1.25; }
    .chevron { width:15px; height:15px; color:var(--faint); transition:transform .15s ease; }
    .event[open] .chevron { transform:rotate(180deg); }
    .live-state { display:inline-flex; align-items:center; gap:5px; color:var(--live); font-size:10px; font-weight:800; letter-spacing:.035em; margin-right:7px; vertical-align:1px; }
    .live-dot { width:7px; height:7px; border-radius:50%; background:var(--live); box-shadow:0 0 0 3px color-mix(in srgb,var(--live) 14%,transparent); }
    .event-detail { margin:0 28px 10px 68px; padding:9px 12px; border-left:2px solid var(--line); color:var(--muted); font-size:12px; line-height:1.55; }
    .event-detail p { margin:0 0 4px; }
    .event-detail p:last-child { margin-bottom:0; }
    .detail-actions { display:flex; gap:12px; margin-top:8px; }
    .detail-actions button { border:0; padding:0; background:none; color:var(--accent); cursor:pointer; font-size:11px; font-weight:700; }
    .day-label { display:inline-block; min-width:72px; color:var(--muted); font-size:11px; font-weight:700; }
    .global-more { width:100%; border:1px solid var(--line); border-radius:10px; padding:11px; background:var(--surface); color:var(--accent); cursor:pointer; font-weight:700; font-size:12px; }
    .global-more:hover { background:var(--accent-soft); }
    .empty-search { border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:32px 0; color:var(--muted); text-align:center; font-size:13px; }
    .page-footer { margin-top:27px; padding-top:14px; border-top:1px solid var(--line); display:flex; justify-content:space-between; gap:14px; color:var(--faint); font-size:10px; }
    dialog { width:min(92vw,520px); max-height:85vh; padding:0; border:1px solid var(--line); border-radius:16px; background:var(--surface-strong); color:var(--ink); box-shadow:var(--shadow); }
    dialog::backdrop { background:rgba(11,14,13,.48); backdrop-filter:blur(3px); }
    .dialog-head { display:flex; align-items:center; padding:18px 20px; border-bottom:1px solid var(--line); }
    .dialog-head h2 { margin:0; font-size:19px; }
    .dialog-head .icon-button { margin-left:auto; }
    .dialog-body { padding:20px; overflow:auto; }
    .setting-section + .setting-section { margin-top:24px; padding-top:20px; border-top:1px solid var(--line); }
    .setting-section h3 { margin:0 0 5px; font-size:14px; }
    .setting-help { margin:0 0 13px; color:var(--muted); font-size:12px; line-height:1.45; }
    .option-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 14px; }
    .option { display:flex; align-items:center; gap:9px; min-height:34px; font-size:13px; }
    .option input { width:16px; height:16px; accent-color:var(--accent); }
    .theme-choice { display:flex; gap:8px; }
    .theme-choice button { flex:1; border:1px solid var(--line); border-radius:9px; padding:9px; background:var(--surface); cursor:pointer; }
    .theme-choice button.active { border-color:var(--accent); background:var(--accent-soft); color:var(--accent); font-weight:700; }
    .dialog-footer { display:flex; justify-content:flex-end; gap:8px; padding:14px 20px; border-top:1px solid var(--line); }
    .dialog-footer button { border:1px solid var(--line); border-radius:9px; padding:9px 13px; background:var(--surface); cursor:pointer; }
    .dialog-footer .primary { border-color:var(--accent); background:var(--accent); color:var(--surface-strong); }
    .about-copy { color:var(--muted); font-size:13px; line-height:1.65; }
    .about-copy strong { color:var(--ink); }
    @media (max-width:650px) {
      .header-inner { width:calc(100% - 24px); max-width:800px; min-height:58px; gap:8px; flex-wrap:wrap; padding:9px 0 10px; }
      .brand { font-size:18px; }
      .search { order:3; flex-basis:100%; max-width:none; }
      .plain-button { font-size:12px; padding:8px 7px; }
      main { width:calc(100% - 24px); max-width:800px; padding-top:20px; }
      .prototype-note { display:none; }
      .date-nav { margin-bottom:23px; }
      .date-tab { font-size:13px; overflow:hidden; }
      .date-tab small { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .day-intro { display:block; }
      .day-action { margin-top:8px; }
      .day-intro h1 { font-size:27px; }
      .event summary { grid-template-columns:50px minmax(0,1fr) 17px; gap:8px; }
      .channel { grid-column:2; text-align:left; margin-top:-8px; padding-bottom:3px; }
      .chevron { grid-column:3; grid-row:1 / span 2; }
      .event-title { white-space:normal; line-height:1.25; }
      .event-detail { margin-left:58px; margin-right:18px; }
      .page-footer { display:block; line-height:1.7; }
      .option-list { grid-template-columns:1fr; }
    }
    @media (prefers-reduced-motion:reduce) { * { scroll-behavior:auto!important; transition:none!important; } }
  </style>
</head>
<body>
  <svg aria-hidden="true" width="0" height="0" style="position:absolute;overflow:hidden">
    <defs>
      <symbol id="sport-motorsport" viewBox="0 0 24 24">
        <path fill="currentColor" d="M2 13.2c0-.8.6-1.5 1.4-1.6l3.2-.5 2-3.1h6.1l2.4 3.1 3.4.5c.9.1 1.5.9 1.5 1.8V16h-2.2a3 3 0 0 1-5.6 0H9.8a3 3 0 0 1-5.6 0H2v-2.8Zm7.3-2.3h5.2l-1.2-1.5h-3l-1 1.5Z"/>
        <circle cx="7" cy="16" r="1.8" fill="currentColor"/><circle cx="17" cy="16" r="1.8" fill="currentColor"/>
      </symbol>
      <symbol id="sport-football" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="currentColor"/>
        <path d="m9.2 8.5 2.8-2 2.8 2-1.1 3.3h-3.4L9.2 8.5ZM4.1 9.3l5.1-.8m5.6 0 5.1.8M7 18.9l3.3-7.1m6.7 7.1-3.3-7.1M4.5 15l4.1 3.4m10.9-3.4-4.1 3.4" fill="none" stroke="var(--surface-strong)" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
      </symbol>
      <symbol id="sport-cycling" viewBox="0 0 24 24">
        <circle cx="5.5" cy="16.5" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="18.5" cy="16.5" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/>
        <path d="m5.5 16.5 4-7.2 3.2 7.2h5.8m-9-7.2h5m-2.5-3h3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </symbol>
      <symbol id="sport-tennis" viewBox="0 0 24 24">
        <path fill="currentColor" d="M5.1 3.7C8.3.5 13.5 1 16.3 3.8c2.8 2.8 3.3 8 .1 11.2-2.6 2.6-6.4 2.7-9.3.8l-1.5 1.5 1.1 1.1-3.4 3.4-1.1-1.1 3.4-3.4 1.1 1.1 1.5-1.5c-1.9-2.9-1.7-6.7.9-9.2Zm2.1 2.1c-2.2 2.2-2 6 .4 8.4 2.4 2.4 6.2 2.6 8.4.4 2.2-2.2 2-6-.4-8.4-2.4-2.4-6.2-2.6-8.4-.4Z"/>
        <path d="M6.6 13.6c2.5-3.8 5.4-6.7 9-9M8.4 5c2.4 2.4 4.9 4.9 7.3 7.3" fill="none" stroke="currentColor" stroke-width="1.15"/>
      </symbol>
      <symbol id="sport-rugby" viewBox="0 0 24 24">
        <path fill="currentColor" d="M3.2 18.9C1.7 14.7 4 8.2 8.4 4.5c4-3.4 9-3.4 12.4-1.9 1.5 4.2-.8 10.7-5.2 14.4-4 3.4-9 3.4-12.4 1.9Z"/>
        <path d="m7.2 16.8 9.7-10.5m-6.6 6.7 3 2.7m-1.2-4.7 3 2.7m-1.2-4.7 3 2.7" fill="none" stroke="var(--surface-strong)" stroke-width="1.25" stroke-linecap="round"/>
      </symbol>
    </defs>
  </svg>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="#">Sport<span class="brand-mark">Today</span></a>
      <label class="search">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
        <input id="search" type="search" placeholder="Rechercher un sport, une équipe, une chaîne…" autocomplete="off">
      </label>
      <nav class="header-actions" aria-label="Navigation secondaire">
        <button class="plain-button" id="about-open">À propos</button>
        <button class="icon-button" id="settings-open" aria-label="Ouvrir les réglages" title="Réglages">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.5v-.1A1.7 1.7 0 0 0 8.4 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2.2V9.5h.1A1.7 1.7 0 0 0 4 8.4a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.46 3.6l.06.06A1.7 1.7 0 0 0 8.4 4a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 9.8 2.3v-.1h4.1v.1A1.7 1.7 0 0 0 15 4a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.4a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4.1h-.1A1.7 1.7 0 0 0 19.4 15Z"/></svg>
        </button>
      </nav>
    </div>
  </header>

  <main>
    <p class="prototype-note">Prototype d’organisation · données de démonstration</p>
    <nav class="date-nav" role="tablist" aria-label="Période">
      <button class="date-tab" role="tab" aria-selected="true" data-panel="today">Aujourd’hui<small>Dim. 20 sept.</small></button>
      <button class="date-tab" role="tab" aria-selected="false" data-panel="tomorrow">Demain<small>Lun. 21 sept.</small></button>
      <button class="date-tab" role="tab" aria-selected="false" data-panel="upcoming">À venir<small>Jusqu’à dimanche</small></button>
    </nav>

    <section class="day-panel" id="today" role="tabpanel">
      <div class="day-intro"><div><h1>Aujourd’hui</h1><p>Les rendez-vous qui comptent, selon vos préférences.</p></div><button class="day-action show-finished">Voir toute la journée</button></div>

      <section class="sport" data-sport="Formule 1">
        <header class="sport-header">
          <svg class="sport-icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#sport-motorsport"/></svg>
          <h2>Formule 1</h2><span class="sport-count">Dès 15:00</span>
        </header>
        <div class="competition">
          <div class="competition-header"><h3>Grand Prix d’Espagne</h3><span class="meta">12e Grand Prix de la saison</span></div>
          <details class="event" data-package="canal" data-search="formule 1 f1 grand prix espagne course canal plus sport">
            <summary><span class="time">15:00</span><span class="event-title">Grand Prix d’Espagne — Course</span><span class="channel">Canal+ Sport</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary>
            <div class="event-detail"><p>Départ officiel à 15:00 · Circuit de Barcelona-Catalunya.</p><p>Diffusion TV annoncée de 14:40 à 17:10.</p><div class="detail-actions"><button>☆ Favori</button><button>⋯ Signaler</button></div></div>
          </details>
        </div>
      </section>

      <section class="sport" data-sport="Football">
        <header class="sport-header">
          <svg class="sport-icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#sport-football"/></svg>
          <h2>Football</h2><span class="sport-count">Dès 17:00</span>
        </header>
        <div class="competition">
          <div class="competition-header"><h3>Ligue 1</h3><span class="meta">3e journée</span><button class="expand-competition" data-more="ligue1">Afficher les 2 autres matchs</button></div>
          <details class="event" data-package="canal" data-search="football ligue 1 marseille lille om canal plus foot">
            <summary><span class="time">17:00</span><span class="event-title">Marseille / Lille</span><span class="channel">Canal+ Foot</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary>
            <div class="event-detail"><p>Horaire officiel : 17:00 · Diffusion annoncée de 16:52 à 19:05.</p><p>Sélectionné car Marseille fait partie de vos équipes favorites.</p><div class="detail-actions"><button>★ Favori</button><button>⋯ Signaler</button></div></div>
          </details>
          <details class="event" data-package="canal" data-search="football ligue 1 lyon monaco ligue 1 plus">
            <summary><span class="time">20:45</span><span class="event-title">Lyon / Monaco</span><span class="channel">Ligue 1+</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary>
            <div class="event-detail"><p>Horaire officiel : 20:45 · Diffusion annoncée de 20:37 à 22:50.</p><div class="detail-actions"><button>☆ Favori</button><button>⋯ Signaler</button></div></div>
          </details>
          <details class="event extra-event" data-package="canal" data-more-group="ligue1" hidden data-search="football ligue 1 nantes rennes ligue 1 plus">
            <summary><span class="time">15:00</span><span class="event-title">Nantes / Rennes</span><span class="channel">Ligue 1+</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary>
            <div class="event-detail"><p>Affiche secondaire révélée à la demande.</p></div>
          </details>
          <details class="event extra-event" data-package="canal" data-more-group="ligue1" hidden data-search="football ligue 1 toulouse angers ligue 1 plus">
            <summary><span class="time">17:15</span><span class="event-title">Toulouse / Angers</span><span class="channel">Ligue 1+</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary>
            <div class="event-detail"><p>Affiche secondaire révélée à la demande.</p></div>
          </details>
        </div>
        <div class="competition">
          <div class="competition-header"><h3>Premier League</h3><span class="meta">5e journée</span></div>
          <details class="event" data-package="canal" data-search="football premier league arsenal manchester city canal plus foot">
            <summary><span class="time">17:30</span><span class="event-title">Arsenal / Manchester City</span><span class="channel">Canal+ Foot</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary>
            <div class="event-detail"><p>Deux grands clubs · horaire officiel concordant avec le créneau TV.</p><div class="detail-actions"><button>☆ Favori</button><button>⋯ Signaler</button></div></div>
          </details>
          <details class="event" data-package="canal" data-search="football premier league liverpool chelsea canal plus sport 360">
            <summary><span class="time">19:45</span><span class="event-title">Liverpool / Chelsea</span><span class="channel">Canal+ Sport 360</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary>
            <div class="event-detail"><p>Affiche retenue pour la notoriété des deux clubs.</p></div>
          </details>
        </div>
      </section>

      <section class="sport" data-sport="Cyclisme">
        <header class="sport-header"><svg class="sport-icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#sport-cycling"/></svg><h2>Cyclisme</h2><span class="sport-count">Dès 14:00</span></header>
        <div class="competition">
          <div class="competition-header"><h3>Tour de France</h3><span class="meta">15e étape</span></div>
          <details class="event" data-package="free" data-search="cyclisme vélo tour de france étape alpe huez france 2">
            <summary><span class="time">14:00</span><span class="event-title"><span class="live-state"><span class="live-dot"></span>DIRECT</span>Étape 15 — arrivée à l’Alpe d’Huez</span><span class="channel">France 2</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary>
            <div class="event-detail"><p>Départ à 13:10 · arrivée estimée vers 17:25.</p><p>La diffusion est en cours depuis 13:45.</p><div class="detail-actions"><button>☆ Favori</button><button>⋯ Signaler</button></div></div>
          </details>
        </div>
      </section>

      <section class="sport secondary-sport" data-sport="Tennis" hidden>
        <header class="sport-header"><svg class="sport-icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#sport-tennis"/></svg><h2>Tennis</h2><span class="sport-count">Dès 14:30</span></header>
        <div class="competition"><div class="competition-header"><h3>ATP Halle</h3><span class="meta">Finale</span></div><details class="event" data-package="eurosport" data-search="tennis atp halle finale eurosport"><summary><span class="time">14:30</span><span class="event-title">ATP Hommes — Finale</span><span class="channel">Eurosport 1</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary><div class="event-detail"><p>14:30 A. Zverev / J. Sinner.</p></div></details></div>
      </section>

      <section class="sport secondary-sport" data-sport="Rugby" hidden>
        <header class="sport-header"><svg class="sport-icon" aria-hidden="true" viewBox="0 0 24 24"><use href="#sport-rugby"/></svg><h2>Rugby</h2><span class="sport-count">Dès 21:05</span></header>
        <div class="competition"><div class="competition-header"><h3>Top 14</h3></div><details class="event" data-package="canal" data-search="rugby top 14 toulouse bordeaux canal plus"><summary><span class="time">21:05</span><span class="event-title">Toulouse / Bordeaux-Bègles</span><span class="channel">Canal+</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary><div class="event-detail"><p>Horaire officiel : 21:05.</p></div></details></div>
      </section>

      <details class="event finished" data-package="canal" hidden data-search="football ligue 1 paris nice terminé"><summary><span class="time">13:00</span><span class="event-title">Paris / Nice — terminé</span><span class="channel">Ligue 1+</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary><div class="event-detail"><p>Événement terminé, uniquement visible dans la journée complète.</p></div></details>
      <button class="global-more" data-secondary-toggle>+ 2 autres sports</button>
    </section>

    <section class="day-panel" id="tomorrow" role="tabpanel" hidden>
      <div class="day-intro"><div><h1>Demain</h1><p>Une sélection courte pour préparer la journée.</p></div></div>
      <section class="sport" data-sport="Football"><header class="sport-header"><svg class="sport-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="m9.2 9 2.8-2 2.8 2-1.1 3.3h-3.4L9.2 9Z"/></svg><h2>Football</h2><span class="sport-count">2 affiches</span></header><div class="competition"><div class="competition-header"><h3>Champions League</h3></div><details class="event" data-package="canal" data-search="football champions league real madrid arsenal canal plus"><summary><span class="time">21:00</span><span class="event-title">Real Madrid / Arsenal</span><span class="channel">Canal+</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary><div class="event-detail"><p>Compétition majeure · deux grands clubs.</p></div></details><details class="event" data-package="canal" data-search="football champions league paris inter milan canal plus foot"><summary><span class="time">21:00</span><span class="event-title">Paris SG / Inter Milan</span><span class="channel">Canal+ Foot</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary><div class="event-detail"><p>Équipe française prioritaire.</p></div></details></div></section>
      <section class="sport" data-sport="Tennis"><header class="sport-header"><svg class="sport-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="8" r="5"/><path d="m12.5 11.5 7 7"/></svg><h2>Tennis</h2><span class="sport-count">2 tableaux</span></header><div class="competition"><div class="competition-header"><h3>US Open</h3><span class="meta">Quarts de finale</span></div><details class="event" data-package="eurosport" data-search="tennis us open wta femmes eurosport"><summary><span class="time">17:40</span><span class="event-title">WTA Femmes — Quarts de finale</span><span class="channel">Eurosport 1 · 2</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary><div class="event-detail"><p>17:40 T. Townsend / A. Sabalenka · 18:45 L. Noskova / M. Andreeva.</p></div></details><details class="event" data-package="eurosport" data-search="tennis us open atp hommes eurosport"><summary><span class="time">20:10</span><span class="event-title">ATP Hommes — Quarts de finale</span><span class="channel">Eurosport 1 · 2</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary><div class="event-detail"><p>20:10 C. Alcaraz / T. Paul · 21:35 F. Tiafoe / D. Medvedev.</p></div></details></div></section>
    </section>

    <section class="day-panel" id="upcoming" role="tabpanel" hidden>
      <div class="day-intro"><div><h1>À venir</h1><p>Les principaux rendez-vous d’ici dimanche, toujours organisés par sport.</p></div></div>
      <section class="sport" data-sport="Formule 1"><header class="sport-header"><svg class="sport-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 16h14l3-4h-5l-2-3H8l-2 3H3v4Z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg><h2>Formule 1</h2></header><div class="competition"><div class="competition-header"><h3>Grand Prix d’Italie</h3><span class="meta">Week-end</span></div><details class="event" data-package="canal" data-search="formule 1 f1 grand prix italie qualifications canal plus sport"><summary><span class="time"><span class="day-label">Samedi</span>16:00</span><span class="event-title">Qualifications</span><span class="channel">Canal+ Sport</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary><div class="event-detail"><p>Deuxième rendez-vous du week-end.</p></div></details><details class="event" data-package="canal" data-search="formule 1 f1 grand prix italie course canal plus sport"><summary><span class="time"><span class="day-label">Dimanche</span>15:00</span><span class="event-title">Grand Prix d’Italie — Course</span><span class="channel">Canal+ Sport</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary><div class="event-detail"><p>Épreuve principale du week-end, prioritaire dans la synthèse.</p></div></details></div></section>
      <section class="sport" data-sport="Football"><header class="sport-header"><svg class="sport-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="m9.2 9 2.8-2 2.8 2-1.1 3.3h-3.4L9.2 9Z"/></svg><h2>Football</h2><span class="sport-count">3 affiches</span></header><div class="competition"><div class="competition-header"><h3>Ligue 1</h3></div><details class="event" data-package="canal" data-search="football ligue 1 marseille monaco canal plus"><summary><span class="time"><span class="day-label">Samedi</span>21:05</span><span class="event-title">Marseille / Monaco</span><span class="channel">Canal+</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary><div class="event-detail"><p>Votre équipe favorite est prioritaire.</p></div></details></div><div class="competition"><div class="competition-header"><h3>Premier League</h3></div><details class="event" data-package="canal" data-search="football premier league manchester city liverpool canal plus"><summary><span class="time"><span class="day-label">Dimanche</span>17:30</span><span class="event-title">Manchester City / Liverpool</span><span class="channel">Canal+ Foot</span><svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 9 6 6 6-6"/></svg></summary><div class="event-detail"><p>Affiche majeure du week-end.</p></div></details></div></section>
      <button class="global-more" data-secondary-toggle>+ 2 autres sports</button>
    </section>

    <div class="empty-search" id="empty-search" hidden>Aucun rendez-vous ne correspond à cette recherche dans l’onglet courant.</div>
    <footer class="page-footer"><span>Sélection : 4 sports · 8 rendez-vous · données actualisées à 08:12</span><span>Prototype UX v1</span></footer>
  </main>

  <dialog id="settings-dialog">
    <div class="dialog-head"><h2>Réglages</h2><button class="icon-button dialog-close" aria-label="Fermer">×</button></div>
    <div class="dialog-body">
      <section class="setting-section"><h3>Mes sports</h3><p class="setting-help">Décochez les sports que vous ne souhaitez pas voir. Les choix restent sur cet appareil.</p><div class="option-list" id="sports-options"><label class="option"><input type="checkbox" value="Formule 1" checked>Formule 1</label><label class="option"><input type="checkbox" value="Football" checked>Football</label><label class="option"><input type="checkbox" value="Cyclisme" checked>Cyclisme</label><label class="option"><input type="checkbox" value="Tennis" checked>Tennis</label><label class="option"><input type="checkbox" value="Rugby" checked>Rugby</label></div></section>
      <section class="setting-section"><h3>Mes accès TV</h3><p class="setting-help">Un événement proposé uniquement sur un bouquet décoché disparaît, même s’il est favori.</p><div class="option-list" id="packages-options"><label class="option"><input type="checkbox" value="free" checked>TNT et chaînes gratuites</label><label class="option"><input type="checkbox" value="canal" checked>Canal+</label><label class="option"><input type="checkbox" value="bein" checked>beIN Sports</label><label class="option"><input type="checkbox" value="eurosport" checked>Eurosport</label><label class="option"><input type="checkbox" value="dazn">DAZN</label></div></section>
      <section class="setting-section"><h3>Apparence</h3><p class="setting-help">Le mode choisi est mémorisé par le navigateur.</p><div class="theme-choice"><button data-theme-choice="light" class="active">Clair</button><button data-theme-choice="dark">Sombre</button><button data-theme-choice="system">Système</button></div></section>
    </div>
    <div class="dialog-footer"><button class="primary dialog-close">Terminé</button></div>
  </dialog>

  <dialog id="about-dialog">
    <div class="dialog-head"><h2>À propos</h2><button class="icon-button dialog-close" aria-label="Fermer">×</button></div>
    <div class="dialog-body about-copy"><p><strong>SportToday</strong> aide à choisir rapidement les événements sportifs importants à regarder, selon vos sports et vos abonnements.</p><p>Les horaires et diffuseurs sont consolidés depuis plusieurs sources. Ils peuvent évoluer ou comporter des erreurs. SportToday n’est affilié ni aux compétitions ni aux chaînes citées.</p><p>Prototype UX v1 · bêta privée.</p></div>
  </dialog>

  <script>
    const sportContext={
      tomorrow:{'Football':'Dès 21:00','Tennis':'Dès 17:40'},
      upcoming:{'Formule 1':'Samedi','Football':'Samedi'}
    };
    Object.entries(sportContext).forEach(function(entry){
      const panel=document.querySelector('#'+entry[0]);
      Object.entries(entry[1]).forEach(function(item){
        const header=panel?.querySelector('[data-sport="'+item[0]+'"] .sport-header');
        if(!header)return;
        let context=header.querySelector('.sport-count');
        if(!context){context=document.createElement('span');context.className='sport-count';header.append(context);}
        context.textContent=item[1];
      });
    });
    const tabs=[...document.querySelectorAll('.date-tab')];
    const panels=[...document.querySelectorAll('.day-panel')];
    const search=document.querySelector('#search');
    const emptySearch=document.querySelector('#empty-search');
    let activePanel='today';
    function switchPanel(id){
      activePanel=id;
      tabs.forEach(function(tab){tab.setAttribute('aria-selected',String(tab.dataset.panel===id));});
      panels.forEach(function(panel){panel.hidden=panel.id!==id;});
      applySearch();
    }
    tabs.forEach(function(tab){tab.addEventListener('click',function(){switchPanel(tab.dataset.panel||'today');});});
    document.querySelectorAll('[data-more]').forEach(function(button){button.addEventListener('click',function(){
      const group=button.dataset.more;
      const items=[...document.querySelectorAll('[data-more-group="'+group+'"]')];
      const opening=items.some(function(item){return item.hidden;});
      items.forEach(function(item){item.hidden=!opening;});
      button.textContent=opening?'Réduire':'Afficher les '+items.length+' autres matchs';
    });});
    document.querySelectorAll('[data-secondary-toggle]').forEach(function(button){button.addEventListener('click',function(){
      const panel=button.closest('.day-panel');
      const sports=[...panel.querySelectorAll('.secondary-sport')];
      const opening=sports.some(function(sport){return sport.hidden;});
      sports.forEach(function(sport){sport.hidden=!opening;});
      button.textContent=opening?'Réduire la synthèse':'+ '+sports.length+' autres sports';
    });});
    document.querySelectorAll('.show-finished').forEach(function(button){button.addEventListener('click',function(){
      const panel=button.closest('.day-panel');
      const finished=[...panel.querySelectorAll('.finished')];
      const opening=finished.some(function(item){return item.hidden;});
      finished.forEach(function(item){item.hidden=!opening;});
      button.textContent=opening?'Masquer les événements terminés':'Voir toute la journée';
    });});
    function applySearch(){
      const query=search.value.trim().toLocaleLowerCase('fr');
      const panel=document.querySelector('#'+activePanel);
      let visible=0;
      panel.querySelectorAll('.event').forEach(function(event){
        const sport=event.closest('.sport');
        const allowed=event.dataset.preferenceHidden!=='true'&&(!sport||sport.dataset.preferenceHidden!=='true');
        const matches=allowed&&(!query||(event.dataset.search||'').toLocaleLowerCase('fr').includes(query));
        event.style.display=matches?'':'none';
        if(matches&&!event.hidden)visible+=1;
      });
      panel.querySelectorAll('.competition').forEach(function(comp){comp.style.display=[...comp.querySelectorAll('.event')].some(function(event){return event.style.display!=='none'&&!event.hidden&&event.dataset.preferenceHidden!=='true';})?'':'none';});
      panel.querySelectorAll('.sport').forEach(function(sport){
        const hasEvent=[...sport.querySelectorAll('.event')].some(function(event){return event.style.display!=='none'&&!event.hidden&&event.dataset.preferenceHidden!=='true';});
        sport.style.display=sport.dataset.preferenceHidden==='true'||!hasEvent?'none':'';
      });
      emptySearch.hidden=visible>0||!query;
    }
    search.addEventListener('input',applySearch);
    const settings=document.querySelector('#settings-dialog');
    const about=document.querySelector('#about-dialog');
    document.querySelector('#settings-open').addEventListener('click',function(){settings.showModal();});
    document.querySelector('#about-open').addEventListener('click',function(){about.showModal();});
    document.querySelectorAll('.dialog-close').forEach(function(button){button.addEventListener('click',function(){button.closest('dialog').close();});});
    document.querySelectorAll('dialog').forEach(function(dialog){dialog.addEventListener('click',function(event){if(event.target===dialog)dialog.close();});});
    function applyPreferences(){
      const enabledSports=new Set([...document.querySelectorAll('#sports-options input:checked')].map(function(input){return input.value;}));
      const enabledPackages=new Set([...document.querySelectorAll('#packages-options input:checked')].map(function(input){return input.value;}));
      document.querySelectorAll('[data-sport]').forEach(function(sport){sport.dataset.preferenceHidden=enabledSports.has(sport.dataset.sport)?'false':'true';});
      document.querySelectorAll('.event[data-package]').forEach(function(event){event.dataset.preferenceHidden=enabledPackages.has(event.dataset.package)?'false':'true';});
      applySearch();
    }
    document.querySelectorAll('#sports-options input,#packages-options input').forEach(function(input){input.addEventListener('change',applyPreferences);});
    const themeButtons=[...document.querySelectorAll('[data-theme-choice]')];
    function applyTheme(value){
      const resolved=value==='system'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):value;
      document.documentElement.dataset.theme=resolved;
      themeButtons.forEach(function(button){button.classList.toggle('active',button.dataset.themeChoice===value);});
      localStorage.setItem('sporttoday-prototype-theme',value);
    }
    themeButtons.forEach(function(button){button.addEventListener('click',function(){applyTheme(button.dataset.themeChoice||'light');});});
    applyTheme(localStorage.getItem('sporttoday-prototype-theme')||'light');
    applyPreferences();
  </script>
</body>
</html>`;
}
