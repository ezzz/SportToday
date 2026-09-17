export function validationHtml(): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SportToday — Quel sport regarder ?</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f4f6fa; color:#182033; }
    * { box-sizing:border-box; }
    body { margin:0; }
    header { background:#172033; color:white; padding:24px max(20px, calc((100vw - 1180px)/2)); }
    header h1 { margin:0 0 6px; font-size:24px; }
    header p { margin:0; color:#cbd3e1; }
    main { max-width:1180px; margin:0 auto; padding:20px; }
    .toolbar,.missing { background:white; border:1px solid #dfe4ec; border-radius:12px; padding:14px; margin-bottom:16px; }
    .view-row { padding-top:0; }
    .filter-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; padding:7px 0; }
    .filter-row + .filter-row { border-top:1px solid #edf0f4; }
    .filter-label { width:92px; color:#637087; font-size:13px; font-weight:700; }
    .primary-row { display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
    .primary-row .filter-row { flex:1 1 280px; min-width:260px; padding:0; }
    .primary-row .filter-label { width:auto; }
    .advanced-filters { margin-top:12px; border-top:1px solid #edf0f4; padding-top:10px; }
    .advanced-filters > summary { cursor:pointer; color:#50627e; font-size:13px; font-weight:700; }
    .advanced-filters[open] > summary { margin-bottom:4px; }
    .preferences { margin:8px 0 2px; padding:9px 0 0; border-top:1px solid #edf0f4; }
    .preferences > summary { cursor:pointer; color:#50627e; font-size:13px; font-weight:700; }
    .preferences[open] > summary { margin-bottom:8px; }
    .preference-mode { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:8px; }
    .preference-help { color:#637087; font-size:12px; margin:0 0 9px; line-height:1.4; }
    .preference-options { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px 18px; }
    .preference-options h3 { margin:0 0 5px; color:#50627e; font-size:12px; }
    .preference-choice { display:flex; align-items:center; gap:6px; padding:3px 0; font-size:13px; }
    .preference-choice input { accent-color:#172033; }
    .preference-chips { display:flex; flex-wrap:wrap; gap:6px; }
    .preference-chip { padding:6px 9px; font-size:12px; }
    .preference-chip[aria-pressed="true"] { background:#fbe8e8; border-color:#efbcbc; color:#9a3030; text-decoration:line-through; }
    .access-summary { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .access-summary .preference-mode { margin:0; }
    .access-label { color:#637087; font-size:12px; }
    .toolbar-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:9px; padding-top:12px; border-top:1px solid #edf0f4; }
    .toolbar-actions .spacer { flex:1; }
    button,.button { appearance:none; border:1px solid #cbd3df; background:white; color:#182033; border-radius:8px; padding:8px 12px; cursor:pointer; font:inherit; text-decoration:none; }
    button:hover,.button:hover { border-color:#50627e; }
    button.active { background:#172033; color:white; border-color:#172033; }
    .save-state { color:#637087; font-size:13px; }
    .summary-footer { color:#637087; font-size:12px; line-height:1.4; margin:0; padding:2px 4px; text-align:right; }
    .cards { display:grid; gap:14px; }
    .highlights { display:grid; gap:8px; margin-bottom:8px; }
    .highlight-reason { margin:5px 0 0; color:#50627e; font-size:12px; font-weight:700; }
    .section-heading { display:flex; align-items:baseline; justify-content:space-between; gap:8px; margin:4px 2px; color:#26334b; }
    .section-heading h2 { margin:0; font-size:17px; }
    .section-heading span { color:#637087; font-size:12px; }
    .sport-group { display:grid; gap:8px; background:#f9fbfd; border:1px solid #dfe4ec; border-radius:12px; padding:0 10px 8px; }
    .sport-heading { display:flex; align-items:baseline; gap:9px; margin:0 -10px; padding:10px 12px; color:#26334b; background:#eef2f7; border-left:4px solid #50627e; border-radius:11px 11px 0 0; cursor:pointer; list-style:none; }
    .sport-heading::-webkit-details-marker { display:none; }
    .sport-heading::before { content:'▾'; color:#50627e; font-size:16px; line-height:1; }
    .sport-group:not([open]) .sport-heading::before { content:'▸'; }
    .sport-heading h2 { margin:0; font-size:18px; }
    .sport-heading span { margin-left:auto; color:#50627e; font-size:12px; font-weight:700; }
    .competition-group { display:grid; gap:8px; }
    .competition-heading { display:flex; align-items:baseline; gap:9px; margin:4px 0 0 20px; padding:4px 8px; color:#50627e; border-left:3px solid #b9c4d4; border-bottom:1px solid #e5e9ef; }
    .competition-heading h2 { margin:0; font-size:15px; }
    .competition-heading span { margin-left:auto; color:#7b8799; font-size:12px; }
    .card { background:white; border:1px solid #dfe4ec; border-left:5px solid #9ba7ba; border-radius:12px; padding:16px; }
    .compact-card { padding:10px 12px; border-left-width:3px; }
    .compact-card .event-line { gap:8px; }
    .compact-card h2 { font-size:16px; margin:0; }
    .compact-card .official-time { margin:0; padding:4px 7px; font-size:13px; }
    .compact-card .broadcasts { margin:0 0 0 auto; }
    .compact-card .broadcast { padding:4px 7px; }
    .platform { font-weight:700; }
    .favorite { padding:4px 7px; font-size:13px; }
    .favorite[aria-pressed="true"] { background:#fff3cf; color:#765500; }
    .period-context { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin:0 0 12px; color:#50627e; font-size:13px; }
    .card[data-verdict="ok"] { border-left-color:#1d9b5f; }
    .card[data-verdict="doubt"] { border-left-color:#d69a00; }
    .card[data-verdict^="wrong_"],.card[data-verdict="off_topic"],.card[data-verdict="duplicate"] { border-left-color:#cf4b4b; }
    .card.finished { opacity:.62; background:#f0f2f5; border-color:#c7ced8; }
    .card.finished .official-time { background:#e0e4e9; color:#596273; }
    .finished-label { color:#687386; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
    .card-head { display:flex; gap:14px; align-items:flex-start; }
    .card-main { flex:1; min-width:0; }
    .event-line { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .event-line h2 { margin:0; flex:1 1 260px; min-width:0; }
    .event-schedule { margin:5px 32px 0 0; color:#718096; font-size:11px; line-height:1.45; }
    h2 { margin:0 0 7px; font-size:19px; }
    .badges,.broadcasts { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
    .event-line > .broadcasts { flex:0 1 52%; justify-content:flex-end; margin:0 0 0 auto; min-width:220px; }
    .badge { background:#eef1f6; border-radius:999px; padding:4px 8px; font-size:12px; }
    .broadcast { border-radius:7px; padding:6px 9px; font-size:13px; border:1px solid transparent; }
    .broadcast[data-tone="green"] { background:#dff5e7; color:#176540; border-color:#b7e4c5; }
    .broadcast[data-tone="yellow"] { background:#fff3cf; color:#765500; border-color:#ead48b; }
    .broadcast[data-tone="red"] { background:#fbe8e8; color:#9a3030; border-color:#efbcbc; }
    .official-time { display:inline-flex; align-items:center; background:#e7f7ee; color:#176540; border-radius:8px; padding:7px 10px; margin:4px 0 7px; font-size:14px; }
    .unmatched { background:#fff3cf; color:#765500; border-radius:8px; padding:8px 10px; margin:8px 0; font-size:13px; }
    .source-note { color:#637087; font-size:12px; margin-left:5px; }
    .description { color:#4f5c70; margin:10px 0; line-height:1.45; }
    .detail-broadcasts { display:flex; flex-wrap:wrap; gap:6px; margin:10px 0; }
    details { color:#637087; font-size:13px; }
    .validation { border-top:1px solid #e8ebf0; margin-top:13px; padding-top:13px; }
    .verdicts { display:flex; flex-wrap:wrap; gap:7px; }
    .verdicts button.selected { box-shadow:0 0 0 2px #172033 inset; font-weight:700; }
    .verdicts button[data-value="ok"] { background:#e3f6eb; }
    .verdicts button[data-value="doubt"] { background:#fff3cf; }
    .verdicts button[data-value="off_topic"],.verdicts button[data-value^="wrong_"],.verdicts button[data-value="duplicate"] { background:#fbe8e8; }
    textarea { width:100%; border:1px solid #cbd3df; border-radius:8px; padding:9px; margin-top:9px; resize:vertical; font:inherit; min-height:42px; }
    .missing label { display:block; font-weight:700; margin-bottom:6px; }
    .result-note { color:#637087; font-size:13px; margin:0; }
    .source-warning { background:#fff3cf; color:#765500; border:1px solid #ead48b; border-radius:9px; padding:10px 12px; margin:0 0 14px; }
    .freshness { color:#cbd3e1; font-size:12px; }
    .empty { text-align:center; color:#637087; padding:36px; }
    .bottom-panels { display:grid; gap:10px; margin-top:16px; }
    .exhaustivity-panel { background:white; border:1px solid #dfe4ec; border-radius:12px; padding:0; }
    .exhaustivity-details > summary { cursor:pointer; padding:12px 14px; color:#50627e; font-size:13px; font-weight:700; list-style-position:inside; }
    .exhaustivity-details[open] > summary { border-bottom:1px solid #edf0f4; }
    .exhaustivity-content { padding:0 14px 14px; }
    .exhaustivity-panel h2 { font-size:16px; margin:0 0 8px; }
    .bottom-panels .source-warning,.bottom-panels .result-note { margin:0; }
    .coverage-panel { margin-top:12px; border-top:1px solid #edf0f4; padding-top:12px; }
    .coverage-metrics { display:flex; flex-wrap:wrap; gap:7px; margin:8px 0 10px; }
    .coverage-metric { background:#eef1f6; border-radius:8px; padding:6px 9px; font-size:12px; }
    .coverage-metric strong { font-size:15px; margin-right:4px; }
    .coverage-table { width:100%; border-collapse:collapse; font-size:12px; }
    .coverage-table th,.coverage-table td { text-align:left; border-bottom:1px solid #edf0f4; padding:6px 4px; vertical-align:top; }
    .coverage-table th { color:#637087; font-weight:700; }
    .coverage-status { border-radius:999px; padding:3px 7px; white-space:nowrap; }
    .coverage-status[data-status="present"] { background:#dff5e7; color:#176540; }
    .coverage-status[data-status="present_empty"] { background:#fff3cf; color:#765500; }
    .coverage-status[data-status="missing"] { background:#fbe8e8; color:#9a3030; }
    .coverage-events { margin-top:10px; }
    .coverage-events > summary { cursor:pointer; }
    .coverage-events ul { margin:8px 0 0; padding-left:20px; }
    .coverage-events li { margin:4px 0; }
    .coverage-events li[data-status="unmatched"] { color:#9a3030; }
    .coverage-muted { color:#637087; }
    .secondary-details { margin:0 0 0 auto; flex:0 0 auto; }
    .secondary-details > summary { cursor:pointer; width:24px; min-height:24px; padding:3px 0; text-align:right; list-style:none; color:#50627e; }
    .secondary-details > summary::-webkit-details-marker { display:none; }
    .secondary-details > summary::before { content:'▸'; display:inline-block; font-size:18px; line-height:18px; }
    .secondary-details[open] > summary::before { content:'▾'; }
    .secondary-details[open] { flex-basis:100%; }
    .secondary-details[open] > summary { margin-left:auto; }
    .secondary-details .badges { margin-top:8px; }
    .rating-controls { display:flex; align-items:center; flex-wrap:wrap; gap:8px 14px; margin:8px 0; }
    .rating-controls label { display:flex; align-items:center; gap:6px; font-weight:700; }
    .rating-controls select { border:1px solid #cbd3df; border-radius:7px; background:white; padding:5px 7px; font:inherit; }
    .danger-link { color:#9a3030; padding:5px 8px; font-size:12px; }
    .week-preview { margin-top:18px; display:grid; gap:7px; }
    .week-preview[hidden] { display:none; }
    .week-preview-list { display:grid; gap:6px; }
    .week-preview-item { display:grid; grid-template-columns:minmax(125px,auto) minmax(0,1fr) auto; align-items:center; gap:10px; background:white; border:1px solid #dfe4ec; border-radius:9px; padding:9px 11px; font-size:13px; }
    .week-preview-when { color:#50627e; font-weight:800; white-space:nowrap; }
    .week-preview-title { min-width:0; }
    .week-preview-channels { color:#50627e; font-size:12px; text-align:right; }
    .debug-feedback { border-top:1px solid #edf0f4; margin-top:14px; padding-top:12px; }
    .debug-feedback label { display:block; font-weight:700; }
    .debug-feedback .button { display:inline-block; margin-top:7px; }
    @media (max-width:700px) {
      .card-head { display:block; }
      .event-line { align-items:flex-start; }
      .event-line h2 { flex-basis:calc(100% - 38px); }
      .event-line > .broadcasts { flex-basis:100%; min-width:0; justify-content:flex-start; margin:0; }
      .secondary-details { margin-left:auto; }
      .secondary-details[open] { flex-basis:100%; }
      .filter-label { width:100%; }
      .toolbar-actions .spacer { display:none; width:100%; }
      .week-preview-item { grid-template-columns:1fr; gap:3px; }
      .week-preview-channels { text-align:left; }
    }

    /* MVP1 — direction visuelle validée */
    :root {
      --page:#f5f7fa; --surface:#fbfcfe; --surface-strong:#fff; --ink:#192132;
      --muted:#616b7c; --faint:#8c94a1; --line:#d9dfe8; --line-soft:#e9edf2;
      --accent:#2b59a2; --accent-strong:#1c3968; --accent-bright:#3d70bd; --accent-soft:#e6edf8;
      --live:#d72d2d; --shadow:0 14px 40px rgba(22,28,45,.09);
    }
    body { background:var(--page); color:var(--ink); }
    body > header.site-header { position:sticky; top:0; z-index:20; padding:0; background:color-mix(in srgb,var(--surface) 94%,transparent); color:var(--ink); border-top:3px solid var(--accent-bright); border-bottom:1px solid var(--line); backdrop-filter:blur(12px); }
    .header-inner { width:calc(100% - 32px); max-width:980px; min-height:66px; margin:auto; display:flex; align-items:center; gap:22px; }
    .brand { color:var(--ink); text-decoration:none; font-size:20px; font-weight:800; letter-spacing:-.045em; white-space:nowrap; }
    .brand-mark { color:var(--accent-bright); }
    .site-search { flex:1; position:relative; max-width:420px; margin-left:auto; }
    .site-search svg { position:absolute; width:16px; height:16px; left:13px; top:50%; transform:translateY(-50%); color:var(--muted); pointer-events:none; }
    .site-search input { width:100%; height:38px; padding:0 14px 0 39px; border:1px solid var(--line); border-radius:999px; color:var(--ink); background:var(--page); font:inherit; }
    .site-search input:focus { outline:3px solid color-mix(in srgb,var(--accent-bright) 18%,transparent); border-color:var(--accent-bright); }
    .header-actions { display:flex; align-items:center; gap:4px; }
    .header-link { border:0; background:transparent; color:var(--muted); padding:9px 10px; font-size:13px; }
    .header-link:hover { background:var(--accent-soft); border-color:transparent; color:var(--ink); }
    main { width:calc(100% - 32px); max-width:800px; margin:0 auto; padding:28px 0 52px; }
    .date-nav { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); border-bottom:1px solid var(--line); margin-bottom:24px; }
    .date-nav #date-buttons { display:contents; }
    .date-nav .date-filter { min-width:0; border:0; border-bottom:2px solid transparent; border-radius:0; padding:11px 5px 12px; margin-bottom:-1px; background:transparent; color:var(--muted); font-weight:700; }
    .date-nav .date-filter.active { border-bottom-color:var(--accent-bright); color:var(--accent-strong); background:var(--accent-soft); border-radius:10px 10px 0 0; }
    .date-nav .date-filter small { display:block; margin-top:2px; color:var(--faint); font-size:10px; font-weight:500; }
    .day-intro { display:flex; align-items:end; justify-content:space-between; gap:16px; margin-bottom:18px; }
    .day-intro h1 { margin:0; color:var(--accent-strong); font-size:clamp(25px,4vw,34px); letter-spacing:-.045em; line-height:1.05; }
    .day-intro #subtitle { margin:7px 0 0; color:var(--muted); font-size:13px; }
    .freshness { margin:4px 0 0; color:var(--faint); font-size:11px; }
    .toolbar { padding:0; background:transparent; border:0; border-radius:0; }
    .toolbar:not(.settings-visible) { display:none; }
    .toolbar > .primary-row { display:none; }
    .advanced-filters { margin:0 0 18px; padding:0; border:0; }
    .advanced-filters > summary { width:max-content; margin-left:auto; padding:5px 0; color:var(--accent); }
    .advanced-filters[open] { padding:12px 14px; background:var(--surface-strong); border:1px solid var(--line); border-radius:12px; }
    .period-context { justify-content:flex-end; margin:0 0 10px; color:var(--faint); font-size:11px; }
    .cards { display:grid; gap:24px; }
    .highlights,.section-heading { display:none; }
    .sport-group { position:relative; display:block; margin:0; padding:0 0 0 15px; background:transparent; border:0; border-radius:0; }
    .sport-group::before { content:""; position:absolute; left:0; top:2px; bottom:0; width:3px; border-radius:99px; background:color-mix(in srgb,var(--accent-bright) 66%,var(--line)); }
    .sport-heading { display:flex; align-items:center; gap:9px; min-height:31px; margin:0 0 5px; padding:0; color:var(--accent-strong); background:transparent; border:0; border-radius:0; }
    .sport-heading::before { display:none; }
    .sport-heading h2 { font-size:18px; font-weight:800; letter-spacing:-.025em; }
    .sport-heading span { color:var(--muted); font-size:12px; font-weight:620; }
    .competition-group { display:block; border-top:2px solid color-mix(in srgb,var(--accent) 18%,var(--line)); }
    .competition-group + .competition-group { margin-top:10px; }
    .competition-heading { min-height:42px; display:flex; align-items:center; gap:7px; margin:0; padding:8px 2px 6px; color:var(--ink); border:0; }
    .competition-heading h2 { font-size:15px; font-weight:750; letter-spacing:-.015em; }
    .competition-heading span { margin-left:0; color:var(--muted); font-size:12px; font-weight:520; }
    .competition-heading span::before { content:"/"; margin-right:7px; color:var(--faint); }
    .competition-more { margin-left:auto; border:1px solid color-mix(in srgb,var(--accent) 28%,var(--line)); border-radius:999px; padding:6px 11px; background:var(--accent-soft); color:var(--accent-strong); font-size:11px; font-weight:750; white-space:nowrap; }
    .card,.compact-card { padding:0; background:transparent; border:0; border-bottom:1px solid var(--line-soft); border-radius:0; }
    .card.finished { opacity:.58; background:transparent; border-color:var(--line); }
    .card-head,.card-main { display:block; }
    .event-line { display:grid; grid-template-columns:58px minmax(0,1fr) minmax(95px,auto) 18px; align-items:center; gap:10px; min-height:45px; padding:6px 2px; transition:background .15s ease; }
    .event-line:hover { background:color-mix(in srgb,var(--accent-soft) 55%,transparent); }
    .official-time { display:block; margin:0; padding:0; color:var(--ink); background:transparent; border-radius:0; font-size:14px; font-variant-numeric:tabular-nums; }
    .event-line h2,.compact-card h2 { margin:0; min-width:0; color:var(--ink); font-size:14px; font-weight:570; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .event-line > .broadcasts { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:4px 7px; min-width:95px; margin:0; }
    .broadcast,.broadcast[data-tone] { padding:0; color:var(--accent-strong); background:transparent; border:0; border-radius:0; font-size:12px; font-weight:700; }
    .broadcast + .broadcast::before { content:"·"; margin-right:7px; color:var(--faint); }
    .live-state { display:inline-flex; align-items:center; gap:5px; margin-right:7px; color:var(--live); font-size:10px; font-weight:800; letter-spacing:.035em; vertical-align:1px; }
    .live-dot { width:7px; height:7px; border-radius:50%; background:var(--live); box-shadow:0 0 0 3px color-mix(in srgb,var(--live) 14%,transparent); }
    .secondary-details { grid-column:4; grid-row:1; margin:0; }
    .secondary-details[open] { grid-column:1 / -1; grid-row:2; padding:8px 12px 12px 68px; }
    .event-schedule { margin:2px 28px 8px 68px; color:var(--faint); }
    .highlight-reason { display:none; }
    .week-preview { margin-top:0; }
    .bottom-panels { margin-top:24px; }
    .summary-footer { color:var(--faint); font-size:10px; }
    .about-dialog { width:min(92vw,500px); border:1px solid var(--line); border-radius:16px; background:var(--surface-strong); color:var(--ink); box-shadow:var(--shadow); }
    .about-dialog::backdrop { background:rgba(15,20,30,.48); }
    .about-dialog > div { padding:20px; }
    .about-dialog h2 { margin:0 0 12px; }
    .about-dialog p { color:var(--muted); line-height:1.55; }
    @media (max-width:700px) {
      .header-inner { width:calc(100% - 24px); min-height:58px; gap:8px; flex-wrap:wrap; padding:9px 0 10px; }
      .site-search { order:3; flex-basis:100%; max-width:none; }
      .brand { font-size:18px; }
      main { width:calc(100% - 24px); padding-top:20px; }
      .date-nav .date-filter { font-size:13px; overflow:hidden; }
      .day-intro { display:block; }
      .event-line { grid-template-columns:50px minmax(0,1fr) 17px; gap:8px; }
      .event-line > .broadcasts { grid-column:2; justify-content:flex-start; margin-top:-7px; padding-bottom:3px; }
      .secondary-details { grid-column:3; grid-row:1 / span 2; }
      .secondary-details[open] { grid-column:1 / -1; grid-row:3; padding-left:58px; }
      .event-line h2 { white-space:normal; line-height:1.25; }
      .competition-heading { flex-wrap:wrap; }
      .competition-more { margin-left:auto; max-width:100%; white-space:normal; }
      .broadcast,.broadcast[data-tone] { white-space:normal; }
      .access-summary,.access-label { min-width:0; }
      .access-label { overflow-wrap:anywhere; }
      .event-schedule { margin-left:58px; }
    }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/">Sport<span class="brand-mark">Today</span></a>
      <label class="site-search">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
        <input id="site-search" type="search" placeholder="Rechercher un sport, une équipe, une chaîne…" autocomplete="off">
      </label>
      <nav class="header-actions" aria-label="Navigation secondaire">
        <button class="header-link" id="about-open">À propos</button>
        <button class="header-link" id="settings-open">Réglages</button>
      </nav>
    </div>
  </header>
  <main>
    <nav class="date-nav" aria-label="Période">
      <span id="date-buttons"><button class="date-filter active">Chargement…</button></span>
      <button class="date-filter upcoming-filter" data-upcoming>À venir<small>Jusqu’à dimanche</small></button>
    </nav>
    <section class="day-intro">
      <div><h1 id="day-title">Aujourd’hui</h1><p id="subtitle">Chargement de la sélection…</p><p class="freshness" id="freshness"></p></div>
      <button class="period-filter header-link" id="show-day" data-period="day">Voir toute la journée</button>
    </section>
    <section class="toolbar">
      <div class="filter-row">
        <span class="filter-label">Quand</span>
        <button class="period-filter active" data-period="now">Maintenant</button>
        <button class="period-filter" data-period="evening">Ce soir</button>
        <button class="period-filter" data-period="day">Toute la journée</button>
      </div>
      <div class="filter-row access-summary">
        <span class="filter-label">Affichage</span>
        <div class="preference-mode">
          <button class="preference-mode-filter active" data-preference-mode="preferences">Ma sélection</button>
          <button class="preference-mode-filter" data-preference-mode="all">Tout voir</button>
        </div>
        <span class="access-label" id="access-label">Diffuseurs français · tous les sports</span>
      </div>
      <details class="advanced-filters">
        <summary>Personnaliser et diagnostiquer</summary>
        <div class="filter-row view-row" id="view-filters" hidden>
          <span class="filter-label">Vue</span>
          <button class="view-filter active" data-view="events">À voir</button>
          <button class="view-filter" data-view="programmes">Agenda TV</button>
        </div>
        <div class="filter-row">
          <span class="filter-label">Programme</span>
          <button class="category-filter active" data-category="live">● Direct</button>
          <button class="category-filter" data-category="delayed">Différé</button>
          <button class="category-filter" data-category="editorial">Émission</button>
          <button class="category-filter" data-category="all">Tous</button>
        </div>
        <div class="filter-row" id="sport-filters">
          <span class="filter-label">Sport</span>
          <span id="sport-buttons"><button class="sport-filter active" data-sport="all">Tous les sports</button></span>
        </div>
        <details class="preferences">
          <summary>Mes sports et mes bouquets</summary>
          <div id="preferences-content"></div>
        </details>
        <div class="filter-row">
          <span class="filter-label">Validation</span>
          <button class="validation-filter active" data-validation="all">Tous</button>
          <button class="validation-filter" data-validation="pending">À valider</button>
          <button class="validation-filter" data-validation="ok">OK</button>
          <button class="validation-filter" data-validation="issues">Doutes / erreurs</button>
        </div>
        <div class="toolbar-actions">
          <span class="save-state" id="save-state">Connexion…</span>
          <span class="spacer"></span>
          <a class="button" id="export-csv" href="/export.csv?category=live&amp;period=evening">Exporter CSV</a>
          <a class="button" id="export-xlsx" href="/export.xlsx?category=live&amp;period=evening">Exporter XLSX</a>
        </div>
      </details>
    </section>
    <div class="period-context"><span id="period-context"></span></div>
    <section class="cards" id="cards"><div class="empty">Chargement…</div></section>
    <section class="week-preview" id="week-preview" hidden>
      <div class="section-heading"><h2>À venir jusqu’à dimanche</h2><span id="week-preview-context"></span></div>
      <div class="week-preview-list" id="week-preview-items"></div>
    </section>
    <section class="bottom-panels">
      <section class="exhaustivity-panel">
        <details class="exhaustivity-details">
          <summary>Qualité des données et signaler un manque</summary>
          <div class="exhaustivity-content">
            <p class="source-warning" id="source-warning" hidden></p>
            <p class="result-note" id="result-note"></p>
            <section class="missing">
              <label for="missing-event">Un événement majeur manque-t-il ?</label>
              <textarea id="missing-event" placeholder="Facultatif — indique ici un événement important absent"></textarea>
            </section>
            <section class="debug-feedback">
              <label for="debug-note">Commentaire général / debug</label>
              <textarea id="debug-note" placeholder="Ex. : affiche terminée encore visible, diffuseur incorrect, problème d’affichage…"></textarea>
              <p class="preference-help">Enregistré sur le serveur pour cette date. Tu peux récupérer l’ensemble des retours en JSON.</p>
              <a class="button" href="/feedback.json" download>Télécharger les retours</a>
            </section>
            <section class="coverage-panel" id="coverage-panel" hidden>
              <h2>Couverture EPG des chaînes prioritaires</h2>
              <div class="coverage-metrics" id="coverage-metrics"></div>
              <div id="coverage-table-wrap"></div>
              <details class="coverage-events">
                <summary id="coverage-events-summary">Événements de référence non rattachés</summary>
                <div id="coverage-events-list"></div>
              </details>
            </section>
          </div>
        </details>
      </section>
      <p class="summary-footer" id="summary"></p>
    </section>
  </main>
  <dialog class="about-dialog" id="about-dialog">
    <div>
      <h2>À propos</h2>
      <p><strong>SportToday</strong> aide à identifier rapidement les événements sportifs importants à regarder selon vos préférences et vos abonnements.</p>
      <p>Les horaires et diffuseurs sont consolidés depuis plusieurs sources et peuvent évoluer. SportToday n’est affilié ni aux compétitions ni aux chaînes citées.</p>
      <button id="about-close">Fermer</button>
    </div>
  </dialog>
  <script>
    const verdicts = [
      ['ok','✓ OK'],['doubt','? Doute'],['off_topic','✗ Hors sujet'],
      ['wrong_channel','✗ Chaîne'],['wrong_time','✗ Horaire'],
      ['wrong_live','✗ Live/Différé'],['duplicate','✗ Doublon']
    ];
    let state = null;
    let activeCategory = 'live';
    let activePeriod = 'now';
    let activeValidation = 'all';
    let activeView = 'events';
    let activeSports = new Set();
    let upcomingMode = false;
    let searchQuery = '';
    let noteTimer = null;
    let missingTimer = null;
    let debugTimer = null;
    let favorites = new Set();
    const preferenceStorageKey = 'sporttoday-preferences-v2';
    const previousPreferenceStorageKey = 'sporttoday-preferences-v1';
    let preferenceMode = 'preferences';
    let preferences = { version:2, excludedSports:[], excludedCompetitions:[], packages:[] };
    const ratingStorageKey = 'sporttoday-ratings-v1';
    let ratings = {};
    const expandedCompetitions = new Set();
    try {
      const saved = JSON.parse(localStorage.getItem('sporttoday-favorites') || '[]');
      if (Array.isArray(saved)) favorites = new Set(saved.filter(value=>typeof value==='string'));
    } catch {}
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceStorageKey) || 'null');
      if (saved && saved.version === 2 && Array.isArray(saved.excludedSports) && Array.isArray(saved.packages)) {
        preferences = {
          version:2,
          excludedSports:[...new Set(saved.excludedSports.filter(value=>typeof value==='string'&&value).map(canonicalSport))],
          excludedCompetitions:Array.isArray(saved.excludedCompetitions)?[...new Set(saved.excludedCompetitions.filter(value=>typeof value==='string'&&value))]:[],
          packages:[...new Set(saved.packages.filter(value=>typeof value==='string'&&value))]
        };
        preferenceMode=saved.mode==='all'?'all':'preferences';
      } else {
        const previous=JSON.parse(localStorage.getItem(previousPreferenceStorageKey)||'null');
        if(previous&&Array.isArray(previous.channels)) {
          preferences.packages=[...new Set(previous.channels.map(channel=>packageForName(channel?.label||channel?.id||'')).filter(Boolean))];
        }
      }
    } catch {}
    try {
      const saved=JSON.parse(localStorage.getItem(ratingStorageKey)||'{}');
      if(saved&&typeof saved==='object'&&!Array.isArray(saved)) ratings=Object.fromEntries(Object.entries(saved).filter(([,value])=>Number.isInteger(value)&&value>=1&&value<=5));
    } catch {}
    const collapsedSports = new Set();

    function favoriteKey(kind,item,value) { return kind+':'+item.sport+':'+value; }
    function favoriteButton(kind,item,value) {
      const key=favoriteKey(kind,item,value), selected=favorites.has(key);
      return '<button class="favorite" data-favorite="'+escapeHtml(key)+'" aria-pressed="'+selected+'" title="Suivre '+escapeHtml(value)+'">'+(selected?'★':'☆')+' '+escapeHtml(value)+'</button>';
    }
    function isFavorite(item) {
      return favorites.has(favoriteKey('competition',item,item.competition))
        || (item.participants||'').split(' | ').filter(Boolean).some(team=>favorites.has(favoriteKey('team',item,team)));
    }

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const validationFor = id => state.validation.items[id] || { verdict:'pending', note:'' };
    const issue = verdict => !['pending','ok'].includes(verdict);

    async function loadDate(date='') {
      const query = date ? '?date='+encodeURIComponent(date) : '';
      const response = await fetch('/api/report'+query);
      if (!response.ok) throw new Error('Impossible de charger la sélection.');
      state = await response.json();
      upcomingMode=false;
      activePeriod=state.report.date===todayInTimeZone(state.report.timeZone)?'now':'day';
      if (state.programmeReport) document.getElementById('view-filters').hidden=false;
      document.getElementById('missing-event').value = state.validation.missingEventNote || '';
      document.getElementById('debug-note').value = state.validation.debugNote || '';
      renderDateFilters();
      renderSportFilters();
      renderPreferences();
      syncFilterButtons();
      setSaved();
      render();
    }

    async function load() { await loadDate(); }

    function todayInTimeZone(timeZone) {
      return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    }

    function syncFilterButtons() {
      document.querySelectorAll('.period-filter').forEach(button=>button.classList.toggle('active',button.dataset.period===activePeriod));
      document.querySelectorAll('.preference-mode-filter').forEach(button=>button.classList.toggle('active',button.dataset.preferenceMode===preferenceMode));
    }

    async function checkForUpdatedReport() {
      if (!state || document.activeElement?.matches('textarea')) return;
      try {
        const response = await fetch('/api/report?date='+encodeURIComponent(state.report.date));
        if (!response.ok) return;
        const next = await response.json();
        if (next.report.generatedAt === state.report.generatedAt) return;
        state = next;
        document.getElementById('missing-event').value = state.validation.missingEventNote || '';
        document.getElementById('debug-note').value = state.validation.debugNote || '';
        renderDateFilters();
        renderSportFilters();
        renderPreferences();
        render();
      } catch (error) {
        // The scheduler is best effort; keep the current page usable while the
        // next poll retries after a transient network/restart error.
        console.warn('Actualisation automatique indisponible', error);
      }
    }

    function renderDateFilters() {
      const dates = (state.availableDates || [state.report.date]).slice(0,2);
      const selected = state.report.date;
      const labels = ['Aujourd’hui','Demain'];
      const buttons = dates.map((date,index) => '<button class="date-filter '+(!upcomingMode&&date===selected?'active':'')+'" data-date="'+escapeHtml(date)+'">'+(labels[index]||escapeHtml(date))+' <small>'+escapeHtml(formatShortDate(date))+'</small></button>');
      document.getElementById('date-buttons').innerHTML = buttons.join('');
      document.querySelector('[data-upcoming]').classList.toggle('active',upcomingMode);
    }

    function formatShortDate(value) {
      return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit'}).format(new Date(value+'T12:00:00Z'));
    }

    function render() {
      const report=currentReport();
      updateSubtitle(report);
      const eventFirst=report.viewMode==='event-first';
      const matching = eventFirst
        ? report.items.map(filterEventBroadcasts).map(filterPreferredBroadcasts).filter(Boolean).filter(item=>item.broadcasts.length>0).filter(item=>matchesEventCategory(item)).filter(item=>matchesEventPeriod(item,report)).filter(matchesSport).filter(matchesSearch)
        : report.items.map(item=>({...item,broadcasts:item.broadcasts.filter(broadcast=>matchesBroadcast(item,broadcast,report)&&matchesChannelPreference(broadcast))})).filter(item=>item.broadcasts.length>0).filter(matchesSport).filter(matchesSearch);
      const stats = matching.reduce((acc,item) => { const v=validationFor(item.id).verdict; acc[v==='pending'?'pending':v==='ok'?'ok':'issues']++; return acc; }, {pending:0,ok:0,issues:0});
      const filtered = eventFirst ? matching.filter(item => { const v=validationFor(item.id).verdict; return activeValidation==='all'||activeValidation===v||(activeValidation==='issues'&&issue(v)); }) : matching;
      const visible = eventFirst ? filtered : diversifiedSelection(filtered,report.limit);
      const dayCount=report.items.map(item=>eventFirst?filterEventBroadcasts(item):item).filter(item=>eventFirst?item.broadcasts.length>0&&matchesEventCategory(item):true).filter(matchesSport).map(filterPreferredBroadcasts).filter(Boolean).length;
      const preferenceLabel=preferenceMode==='preferences'?' · Ma sélection':'';
      const periodLabels={now:'Maintenant et dans les 3 prochaines heures',evening:'Ce soir · dès 20 h',day:'Toute la journée'};
      document.getElementById('period-context').textContent=periodLabels[activePeriod]+preferenceLabel+' · '+matching.length+' événement'+(matching.length>1?'s':'')+(activePeriod!=='day'?' / '+dayCount+' sur la journée':'');
      document.getElementById('show-day').hidden=upcomingMode||activePeriod==='day';
      const summary=eventFirst
        ? [['Compétitions',new Set(matching.map(item=>item.competition||'Autre')).size],['Événements',matching.length],['Catalogue',report.catalogueEventCount??matching.length],['Chaîne ou plateforme',matching.filter(item=>item.broadcasts.length).length],['Sans diffuseur',matching.filter(item=>!item.broadcasts.length).length],['À valider',stats.pending],['Validés OK',stats.ok],['Doutes / erreurs',stats.issues]]
        : [['Programmes regroupés',matching.length],['Affichés',visible.length]];
      const summaryText=eventFirst
        ? [
            summary[0][1]+' compétitions',
            summary[1][1]+' événements',
            summary[3][1]+' avec chaîne ou plateforme',
            summary[6][1]+' vérifiés',
            summary[7][1]+' signalements'
          ].join(' · ')
        : summary.map(([label,value]) => value+' '+label.toLocaleLowerCase('fr-FR')).join(' · ');
      document.getElementById('summary').textContent = summaryText;
      const sourceErrors=eventFirst?(report.eventSourceErrors||[]):[];
      const sourceWarning=document.getElementById('source-warning');
      sourceWarning.hidden=sourceErrors.length===0;
      sourceWarning.textContent=sourceErrors.length?'Source incomplète · '+sourceErrors.join(' · '):'';
      const hidden=filtered.length-visible.length;
      document.getElementById('result-note').textContent = eventFirst
        ? (activeCategory==='live' ? 'Événements officiels avec une chaîne ou une plateforme identifiée. Les événements sans diffuseur restent disponibles dans l’exhaustivité.' : visible.length+' événement'+(visible.length>1?'s':'')+' officiel'+(visible.length>1?'s':'')+' avec diffusion dans le catalogue filtré.')
        : hidden>0 ? visible.length+' événements principaux affichés sur '+filtered.length+' · maximum 2 par compétition pour diversifier la sélection.' : '';
      renderCoverage();
      document.getElementById('cards').innerHTML = visible.length
        ? (eventFirst ? renderEventSelection(visible,report) : visible.map(item=>cardHtml(item,report)).join(''))
        : '<div class="empty">'+(searchQuery?'Aucun événement ne correspond à cette recherche.':activePeriod==='now'?'Rien en cours ou dans les trois prochaines heures.':'Aucun événement dans ce filtre.')+'</div>';
      renderWeekPreview(report,eventFirst);
      document.getElementById('cards').hidden=upcomingMode;
      document.querySelector('.toolbar').hidden=upcomingMode;
      document.querySelector('.period-context').hidden=upcomingMode;
      document.querySelector('.bottom-panels').hidden=upcomingMode;
      if(!upcomingMode)document.getElementById('week-preview').hidden=true;
      const selectedSports = [...activeSports].sort().map(encodeURIComponent).join('%2C');
      const query = '?category='+encodeURIComponent(activeCategory)+'&period='+encodeURIComponent(activePeriod)+(selectedSports?'&sports='+selectedSports:'');
      const dateQuery='&date='+encodeURIComponent(report.date);
      document.getElementById('export-csv').href='/export.csv'+query+dateQuery;
      document.getElementById('export-xlsx').href='/export.xlsx'+query+dateQuery;
      document.querySelector('.toolbar-actions').hidden=!eventFirst;
      document.querySelector('.missing').hidden=!eventFirst;
      document.querySelectorAll('.validation-filter').forEach(button=>button.disabled=!eventFirst);
      updateAccessSummary();
    }

    function renderCoverage() {
      const coverage=state.coverageReport;
      const panel=document.getElementById('coverage-panel');
      if (!coverage) { panel.hidden=true; return; }
      panel.hidden=false;
      const metrics=[
        [coverage.sourceChannelCount,'chaînes dans le flux'],
        [coverage.observedPriorityChannelCount,'prioritaires alimentées'],
        [coverage.missingPriorityChannelCount,'prioritaires absentes'],
        [coverage.emptyPriorityChannelCount,'prioritaires vides'],
        [coverage.rightsOnlyEventCount||0,'événements couverts par droits'],
        [coverage.matchedEventCount+'/'+coverage.expectedEventCount,'événements rattachés']
      ];
      document.getElementById('coverage-metrics').innerHTML=metrics.map(([value,label])=>'<span class="coverage-metric"><strong>'+escapeHtml(value)+'</strong>'+escapeHtml(label)+'</span>').join('');
      const statusLabel={present:'Programmes trouvés',present_empty:'Chaîne présente · aucun programme',missing:'Chaîne absente du flux'};
      document.getElementById('coverage-table-wrap').innerHTML='<table class="coverage-table"><thead><tr><th>Chaîne</th><th>Statut</th><th>Programmes</th><th>Sport</th><th>Nom observé</th></tr></thead><tbody>'+coverage.channels.map(channel=>'<tr><td>'+escapeHtml(channel.label)+'</td><td><span class="coverage-status" data-status="'+escapeHtml(channel.status)+'">'+escapeHtml(statusLabel[channel.status])+'</span></td><td>'+channel.programmeCount+'</td><td>'+channel.sportProgrammeCount+'</td><td class="coverage-muted">'+escapeHtml(channel.observedChannelNames.join(', ')||'—')+'</td></tr>').join('')+'</tbody></table>';
      const unmatched=coverage.events.filter(event=>event.status==='unmatched');
      const rightsOnly=coverage.events.filter(event=>event.status==='rights_only');
      const noEpg=unmatched.length+rightsOnly.length;
      document.getElementById('coverage-events-summary').textContent=noEpg+' événement'+(noEpg>1?'s':'')+' sans EPG'+(rightsOnly.length?' · '+rightsOnly.length+' couvert'+(rightsOnly.length>1?'s':'')+' par les droits':'')+(unmatched.length?' · '+unmatched.length+' sans diffuseur':'');
      document.getElementById('coverage-events-list').innerHTML=unmatched.length?'<ul>'+unmatched.slice(0,20).map(event=>'<li data-status="unmatched"><strong>'+escapeHtml(event.importance)+' · '+escapeHtml(event.title)+'</strong> <span class="coverage-muted">('+escapeHtml(event.competition)+' · '+escapeHtml(formatCoverageTime(event.startAtUtc))+')</span></li>').join('')+'</ul>':'<p class="coverage-muted">Tous les événements de référence ont au moins une diffusion rattachée.</p>';
    }

    function formatCoverageTime(value) {
      return new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short',timeZone:state.report.timeZone}).format(new Date(value));
    }

    function renderSportFilters() {
      const counts = new Map();
      currentReport().items.forEach(item => counts.set(item.sport,(counts.get(item.sport)||0)+1));
      const sports = [...counts.keys()].sort((left,right)=>sportLabel(left).localeCompare(sportLabel(right),'fr'));
      const buttons = ['<button class="sport-filter '+(activeSports.size===0?'active':'')+'" data-sport="all">Tous les sports</button>']
        .concat(sports.map(sport=>'<button class="sport-filter '+(activeSports.has(sport)?'active':'')+'" data-sport="'+escapeHtml(sport)+'">'+escapeHtml(sportLabel(sport))+' <small>('+counts.get(sport)+')</small></button>'));
      document.getElementById('sport-buttons').innerHTML=buttons.join('');
    }

    function allPreferenceOptions() {
      const reports=[state?.report,state?.programmeReport].filter(Boolean);
      const sports=new Set();
      for(const report of reports) for(const item of report.items||[]) {
        if(item.sport) sports.add(canonicalSport(item.sport));
      }
      for(const sport of preferences.excludedSports) sports.add(sport);
      return { sports:[...sports].sort((a,b)=>sportLabel(a).localeCompare(sportLabel(b),'fr')) };
    }

    function renderPreferences() {
      const options=allPreferenceOptions();
      const excludedSports=new Set(preferences.excludedSports), selectedPackages=new Set(preferences.packages);
      const sportChoices=options.sports.length?'<div class="preference-chips">'+options.sports.map(sport=>'<button class="preference-chip" data-excluded-sport="'+escapeHtml(sport)+'" aria-pressed="'+excludedSports.has(sport)+'">'+(excludedSports.has(sport)?'× ':'')+escapeHtml(sportLabel(sport))+'</button>').join('')+'</div>':'<p class="preference-help">Aucun sport disponible pour le moment.</p>';
      const competitionChoices=preferences.excludedCompetitions.length?'<div class="preference-chips">'+preferences.excludedCompetitions.map(key=>'<button class="preference-chip" data-excluded-competition="'+escapeHtml(key)+'" aria-pressed="true">× '+escapeHtml(competitionLabelFromKey(key))+'</button>').join('')+'</div>':'<p class="preference-help">Aucune compétition masquée.</p>';
      const packageChoices=accessPackages.map(value=>'<label class="preference-choice"><input type="checkbox" data-preference-package="'+escapeHtml(value.id)+'" '+(selectedPackages.has(value.id)?'checked':'')+'> '+escapeHtml(value.label)+'</label>').join('');
      const help=preferenceMode==='preferences'
        ? 'Les sports barrés sont masqués. Sans bouquet coché, tous les diffuseurs français sont proposés.'
        : 'Tout voir inclut temporairement les sports masqués et les chaînes étrangères.';
      document.getElementById('preferences-content').innerHTML='<p class="preference-help">'+escapeHtml(help)+' Ces choix restent sur cet appareil.</p><div class="preference-options"><section><h3>Sports à masquer</h3>'+sportChoices+'</section><section><h3>Compétitions masquées</h3>'+competitionChoices+'</section><section><h3>Mes bouquets et services</h3>'+packageChoices+'</section></div>';
      syncFilterButtons();
    }

    function savePreferences() {
      try { localStorage.setItem(preferenceStorageKey,JSON.stringify({...preferences,mode:preferenceMode})); }
      catch { showError(new Error('Impossible de mémoriser les préférences sur cet appareil.')); }
    }

    const accessPackages = [
      {id:'free',label:'Chaînes gratuites françaises'},
      {id:'canal',label:'Canal+ et Golf+'},
      {id:'bein',label:'beIN Sports'},
      {id:'dazn',label:'DAZN et Ligue 1+'},
      {id:'eurosport',label:'Eurosport'},
      {id:'rmc',label:'RMC Sport'},
      {id:'other',label:'Autres diffuseurs français'}
    ];

    function packageForName(value) {
      const name=String(value||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('fr-FR');
      if(/canal|golf\\+|golf plus/.test(name))return 'canal';
      if(/bein/.test(name))return 'bein';
      if(/dazn|ligue 1\\+/.test(name))return 'dazn';
      if(/eurosport/.test(name))return 'eurosport';
      if(/rmc sport/.test(name))return 'rmc';
      if(/france [2345]|france\\.tv|l.?equipe|sport en france|tf1|tmc|m6|w9/.test(name))return 'free';
      return 'other';
    }

    function isFrenchBroadcast(broadcast) {
      const name=String(broadcast.platform||broadcast.channel||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('fr-FR');
      return !/\\brts\\s*[12]?\\b|tipik|la une|club rtl|voosport|rtbf/.test(name);
    }

    function updateAccessSummary() {
      const hidden=preferences.excludedSports.length;
      const hiddenCompetitions=preferences.excludedCompetitions.length;
      const packages=preferences.packages.map(id=>accessPackages.find(value=>value.id===id)?.label).filter(Boolean);
      document.getElementById('access-label').textContent=preferenceMode==='all'
        ? 'Tous les sports et diffuseurs'
        : (packages.length?packages.join(' · '):'Tous les diffuseurs français')+(hidden?' · '+hidden+' sport'+(hidden>1?'s':'')+' masqué'+(hidden>1?'s':''):' · tous les sports')+(hiddenCompetitions?' · '+hiddenCompetitions+' compétition'+(hiddenCompetitions>1?'s':'')+' masquée'+(hiddenCompetitions>1?'s':''):'');
    }

    function sportLabel(value) {
      const labels={football:'Football',footvolley:'FootVolley',tennis:'Tennis',cyclisme:'Cyclisme',rugby:'Rugby',boxe:'Boxe',basket:'Basket',golf:'Golf',f1:'Formule 1',motonautisme:'Motonautisme',motogp:'MotoGP',judo:'Judo',ski:'Ski',handball:'Handball',volley:'Volley',volleyball:'Volley',athletics:'Athlétisme',athlétisme:'Athlétisme',natation:'Natation'};
      return labels[value]||value.charAt(0).toLocaleUpperCase('fr-FR')+value.slice(1);
    }

    function canonicalSport(value) {
      return value==='athlétisme'?'athletics':value==='volley'?'volleyball':value;
    }

    function competitionPreferenceKey(item) { return canonicalSport(item.sport)+'|'+String(item.competition||'Compétition non précisée').trim(); }
    function competitionLabelFromKey(key) { return String(key).split('|').slice(1).join('|')||key; }
    function ratingKey(kind,item) { return kind==='sport'?'sport:'+canonicalSport(item.sport):'competition:'+competitionPreferenceKey(item); }
    function ratingFor(key) { return ratings[key]||3; }
    function ratingOptions(selected) { return [1,2,3,4,5].map(value=>'<option value="'+value+'" '+(value===selected?'selected':'')+'>'+value+'/5</option>').join(''); }
    function ratingControls(item) {
      const sportKey=ratingKey('sport',item),competitionKey=ratingKey('competition',item);
      return '<div class="rating-controls"><label>Intérêt '+escapeHtml(sportLabel(item.sport))+' <select data-rating-key="'+escapeHtml(sportKey)+'">'+ratingOptions(ratingFor(sportKey))+'</select></label><label>Intérêt '+escapeHtml(item.competition)+' <select data-rating-key="'+escapeHtml(competitionKey)+'">'+ratingOptions(ratingFor(competitionKey))+'</select></label></div>';
    }
    function preferenceScore(item) { return (ratingFor(ratingKey('sport',item))-3)*40+(ratingFor(ratingKey('competition',item))-3)*60; }

    function currentReport() { return activeView==='programmes'&&state.programmeReport ? state.programmeReport : state.report; }

    function updateSubtitle(report) {
      const date = new Intl.DateTimeFormat('fr-FR',{dateStyle:'full',timeZone:report.timeZone}).format(new Date(report.date+'T12:00:00Z'));
      const generated=new Intl.DateTimeFormat('fr-FR',{timeZone:report.timeZone,hour:'2-digit',minute:'2-digit'}).format(new Date(report.generatedAt));
      const today=report.date===todayInTimeZone(report.timeZone);
      document.getElementById('day-title').textContent=upcomingMode?'À venir':today?'Aujourd’hui':'Demain';
      document.getElementById('subtitle').textContent = upcomingMode?'Les principaux événements jusqu’à dimanche, organisés par sport.':date+' · '+(report.viewMode==='event-first'?'La sélection sportive du jour':'Agenda TV détaillé');
      document.getElementById('freshness').textContent='Sélection générée à '+generated+((report.eventSourceErrors||[]).length?' · données partielles':'');
    }

    function matchesEventCategory(item) {
      if (activeCategory==='all') return true;
      if (activeCategory==='live') return item.contentCategory!=='Emission'&&item.broadcasts.some(b=>b.liveStatus!=='delayed');
      if (activeCategory==='uncertain') return item.broadcastMatchConfidence==='none'||item.broadcasts.some(b=>b.liveStatus==='unknown');
      if (activeCategory==='delayed') return item.broadcasts.some(b=>b.liveStatus==='delayed');
      return false;
    }

    function filterEventBroadcasts(item) {
      if(activeCategory==='all')return item;
      const broadcasts=item.broadcasts.filter(b=>activeCategory==='live'?b.liveStatus!=='delayed':activeCategory==='uncertain'?b.liveStatus==='unknown':activeCategory==='delayed'?b.liveStatus==='delayed':false);
      return {...item,broadcasts};
    }

    function matchesEventPeriod(item,report) {
      if (activePeriod==='day') return true;
      if(activePeriod==='now') {
        const now=Date.now(),overlaps=(startValue,stopValue)=>{const start=Date.parse(startValue),parsedStop=Date.parse(stopValue),stop=Number.isFinite(parsedStop)&&parsedStop>start?parsedStop:start+3*60*60_000;return Number.isFinite(start)&&start<=now+3*60*60_000&&stop>now};
        if(item.eventTimeConfidence!=='estimated'&&item.eventStartAtUtc)return overlaps(item.eventStartAtUtc,item.eventEndAtUtc||'');
        return item.broadcasts.some(b=>overlaps(b.startAtUtc,b.stopAtUtc));
      }
      const start=Date.parse(report.eveningStartUtc),end=Date.parse(report.windowEndUtc);
      if(item.eventTimeConfidence==='estimated')return item.broadcasts.length===0||item.broadcasts.some(b=>{const value=Date.parse(b.startAtUtc),parsedStop=Date.parse(b.stopAtUtc),stop=Number.isFinite(parsedStop)&&parsedStop>value?parsedStop:value;return value<end&&(stop>start||value>=start)});
      const eventStart=Date.parse(item.eventStartAtUtc),eventEnd=Date.parse(item.eventEndAtUtc||item.eventStartAtUtc);
      return eventStart<end&&(eventEnd>start||eventStart>=start);
    }

    function matchesBroadcast(item,broadcast,report) {
      const categoryMatch=activeCategory==='all'||(activeCategory==='live'&&item.contentCategory!=='Emission'&&broadcast.liveStatus!=='delayed')||(activeCategory==='uncertain'&&broadcast.liveStatus==='unknown'&&item.contentCategory!=='Emission')||(activeCategory==='delayed'&&broadcast.liveStatus==='delayed')||(activeCategory==='editorial'&&item.contentCategory==='Emission');
      if (!categoryMatch) return false;
      if (activePeriod==='day') return true;
      if(activePeriod==='now') {
        const value=Date.parse(broadcast.startAtUtc),parsedStop=Date.parse(broadcast.stopAtUtc),stop=Number.isFinite(parsedStop)&&parsedStop>value?parsedStop:value+3*60*60_000,now=Date.now();
        return value<=now+3*60*60_000&&stop>now;
      }
      const start=Date.parse(report.eveningStartUtc),end=Date.parse(report.windowEndUtc);
      const value=Date.parse(broadcast.startAtUtc),parsedStop=Date.parse(broadcast.stopAtUtc),stop=Number.isFinite(parsedStop)&&parsedStop>value?parsedStop:value;
      return value<end&&(stop>start||value>=start);
    }

    function matchesSport(item) {
      const temporaryMatch=activeSports.size===0||activeSports.has(item.sport);
      const preferenceMatch=preferenceMode!=='preferences'||(!preferences.excludedSports.includes(canonicalSport(item.sport))&&!preferences.excludedCompetitions.includes(competitionPreferenceKey(item)));
      return temporaryMatch&&preferenceMatch;
    }

    function matchesSearch(item) {
      if(!searchQuery)return true;
      const value=[item.sport,sportLabel(item.sport),item.competition,item.title,item.participants,...(item.broadcasts||[]).map(b=>b.platform||b.channel)].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR');
      return value.includes(searchQuery);
    }

    function matchesChannelPreference(broadcast) {
      if(preferenceMode!=='preferences')return true;
      if(!isFrenchBroadcast(broadcast))return false;
      return preferences.packages.length===0||preferences.packages.includes(packageForName(broadcast.platform||broadcast.channel));
    }

    function filterPreferredBroadcasts(item) {
      if(item.broadcasts.length===0) return null;
      if(preferenceMode!=='preferences') return item;
      if(preferences.packages.length===0) {
        const broadcasts=item.broadcasts.filter(matchesChannelPreference);
        return broadcasts.length?{...item,broadcasts}:null;
      }
      const broadcasts=item.broadcasts.filter(matchesChannelPreference);
      if(broadcasts.length) return {...item,broadcasts};
      return null;
    }

    function diversifiedSelection(items,limit) {
      const selected=[],counts=new Map();
      for (const item of items) {
        if (selected.length>=limit) break;
        const competition=(item.competition||'').trim().toLocaleLowerCase('fr-FR');
        const key=item.sport+'|'+(competition||item.title.toLocaleLowerCase('fr-FR'));
        const count=counts.get(key)||0;
        if (count>=2) continue;
        counts.set(key,count+1); selected.push(item);
      }
      return selected;
    }

    function renderEventSelection(items,report) {
      return renderEventGroups(items,report);
    }

    function highlightSelection(items) {
      const ranked=items.filter(item=>!isFinished(item,currentReport())&&(isFavorite(item)||item.broadcasts.some(b=>b.liveStatus==='confirmed'||b.liveStatus==='probable'))).sort((left,right)=>highlightScore(right)-highlightScore(left)||firstItemStart(left).localeCompare(firstItemStart(right)));
      const selected=[],sports=new Map(),competitions=new Map();
      for(const item of ranked) {
        const competition=item.sport+'|'+item.competition;
        if((sports.get(item.sport)||0)>=2||(competitions.get(competition)||0)>=2)continue;
        selected.push(item);sports.set(item.sport,(sports.get(item.sport)||0)+1);competitions.set(competition,(competitions.get(competition)||0)+1);
        if(selected.length===5)break;
      }
      return selected.sort((left,right)=>firstItemStart(left).localeCompare(firstItemStart(right)));
    }

    function highlightScore(item) {
      const importance={A:25,B:10,C:0}[item.eventImportance]||0;
      const favorite=isFavorite(item)?1000:0;
      const keyMoment=/finale|course|sprint|1\\/2|1\\/4|demi|quart/i.test((item.title||'')+' '+(item.eventRoundLabel||''))?15:0;
      const start=Date.parse(firstItemStart(item)),hoursUntilStart=(start-Date.now())/3_600_000;
      const urgency=activePeriod==='now'&&Number.isFinite(hoursUntilStart)?(hoursUntilStart<=0?20:Math.max(0,20-hoursUntilStart*6)):0;
      return favorite+preferenceScore(item)+importance+keyMoment+urgency+item.score;
    }

    function highlightReason(item) {
      if(isFavorite(item))return 'Favori suivi';
      if(item.eventRoundLabel)return item.eventRoundLabel;
      if(/finale/i.test(item.title))return 'Finale';
      if(/course/i.test(item.title))return 'Course principale';
      if(/sprint/i.test(item.title))return 'Sprint';
      if(item.eventStage)return item.eventStage;
      return item.eventImportance==='A'?'Compétition prioritaire':'Rendez-vous du jour';
    }

    function renderWeekPreview(report,eventFirst) {
      const panel=document.getElementById('week-preview');
      if(!eventFirst||!Array.isArray(state.weekPreview)) { panel.hidden=true; return; }
      const detailedThrough=(state.availableDates||[]).slice(0,2).at(-1)||report.date;
      let candidates=state.weekPreview.filter(item=>item.date>detailedThrough&&matchesSport(item)&&matchesSearch(item));
      candidates=candidates.filter(item=>['A','B'].includes(item.eventImportance)||item.score>=85||ratingFor(ratingKey('sport',item))>=4||ratingFor(ratingKey('competition',item))>=4);
      const motorGroups=new Map();
      for(const item of candidates.filter(item=>['f1','motogp'].includes(canonicalSport(item.sport)))) {
        const key=competitionPreferenceKey(item);
        if(!motorGroups.has(key))motorGroups.set(key,[]);
        motorGroups.get(key).push(item);
      }
      const retainedMotor=new Set();
      for(const group of motorGroups.values()) {
        const race=group.filter(item=>/course|\\brace\\b/i.test((item.title||'')+' '+(item.eventStage||''))&&!/sprint|qualification|qualif|practice|essai/i.test((item.title||'')+' '+(item.eventStage||''))).sort((a,b)=>previewScore(b)-previewScore(a))[0];
        const fallback=group.sort((a,b)=>previewScore(b)-previewScore(a))[0];
        if(race||fallback)retainedMotor.add((race||fallback).id);
      }
      candidates=candidates.filter(item=>!['f1','motogp'].includes(canonicalSport(item.sport))||retainedMotor.has(item.id));
      const compactSports=new Set(['f1','motogp','golf','tennis','athletics','cyclisme']);
      const deduplicated=new Map();
      for(const item of candidates) {
        const key=compactSports.has(canonicalSport(item.sport))?competitionPreferenceKey(item):item.id;
        const current=deduplicated.get(key);
        if(!current||previewScore(item)>previewScore(current))deduplicated.set(key,item);
      }
      const ranked=[...deduplicated.values()].sort((a,b)=>previewScore(b)-previewScore(a)||firstItemStart(a).localeCompare(firstItemStart(b)));
      const picked=[],competitionCounts=new Map();
      for(const item of ranked) {
        const key=competitionPreferenceKey(item),count=competitionCounts.get(key)||0;
        if(count>=2)continue;
        picked.push(item);competitionCounts.set(key,count+1);
        if(picked.length===8)break;
      }
      const selected=picked.sort((a,b)=>firstItemStart(a).localeCompare(firstItemStart(b)));
      panel.hidden=selected.length===0&&!upcomingMode;
      if(!selected.length){document.getElementById('week-preview-items').innerHTML='<div class="empty">Aucun événement majeur disponible jusqu’à dimanche.</div>';return;}
      document.getElementById('week-preview-context').textContent=selected.length+' rendez-vous principaux';
      document.getElementById('week-preview-items').innerHTML=selected.map(item=>weekPreviewHtml(item,report)).join('');
    }

    function previewScore(item) {
      const importance={A:40,B:15,C:0}[item.eventImportance]||0;
      const main=/finale|course|\\brace\\b|demi|quart/i.test((item.title||'')+' '+(item.eventStage||''))?25:0;
      return preferenceScore(item)+importance+main+(item.score||0);
    }

    function weekPreviewHtml(item,report) {
      const instant=new Date(firstItemStart(item));
      const day=new Intl.DateTimeFormat('fr-FR',{timeZone:report.timeZone,weekday:'long'}).format(instant);
      const time=item.eventTimeLabel==='Horaire non publié'?'':new Intl.DateTimeFormat('fr-FR',{timeZone:report.timeZone,hour:'2-digit',minute:'2-digit'}).format(instant).replace(':','h');
      const normalizedCompetition=String(item.competition||'').trim().toLocaleLowerCase('fr-FR');
      const normalizedTitle=String(item.title||'').trim().toLocaleLowerCase('fr-FR');
      const title=normalizedTitle&&normalizedTitle!==normalizedCompetition?' — '+item.title:'';
      const stage=item.eventStage&&!normalizedTitle.includes(String(item.eventStage).toLocaleLowerCase('fr-FR'))?' — '+item.eventStage:'';
      const channels=[...new Set((item.broadcasts||[]).filter(matchesChannelPreference).map(b=>b.platform||b.channel))].sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}));
      return '<article class="week-preview-item"><span class="week-preview-when">'+escapeHtml(day+(time?' · '+time:''))+'</span><span class="week-preview-title"><strong>'+escapeHtml(sportLabel(item.sport))+'</strong> · '+escapeHtml(item.competition)+escapeHtml(title)+escapeHtml(stage)+'</span><span class="week-preview-channels">'+escapeHtml(channels.join(' · ')||'Diffuseur à confirmer')+'</span></article>';
    }

    function renderEventGroups(items,report) {
      const sports=new Map();
      for (const item of items) {
        const sportKey=item.sport||'autre';
        const competition=(item.competition||'Compétition non précisée').trim();
        if (!sports.has(sportKey)) sports.set(sportKey,new Map());
        const competitions=sports.get(sportKey);
        if (!competitions.has(competition)) competitions.set(competition,[]);
        competitions.get(competition).push(item);
      }
      return [...sports.entries()].sort((left,right)=>Math.max(...[...right[1].values()].flat().map(item=>item.score))-Math.max(...[...left[1].values()].flat().map(item=>item.score))||sportLabel(left[0]).localeCompare(sportLabel(right[0]),'fr')).map(([sport,competitions])=>{
        const sportItems=[...competitions.values()].flat();
        const competitionHtml=[...competitions.entries()].sort((left,right)=>Math.max(...right[1].map(item=>item.score))-Math.max(...left[1].map(item=>item.score))||left[0].localeCompare(right[0],'fr')).map(([competition,group])=>{
          const key=sport+'|'+competition,expanded=expandedCompetitions.has(key);
          const sorted=group.sort((left,right)=>firstItemStart(left).localeCompare(firstItemStart(right))||right.score-left.score);
          const shown=expanded?sorted:sorted.slice(0,2),hidden=sorted.length-shown.length;
          const context=competitionContext(sorted);
          const more=hidden>0?'<button class="competition-more" data-expand-competition="'+escapeHtml(key)+'">Afficher les '+hidden+' autre'+(hidden>1?'s':'')+'</button>':expanded&&sorted.length>2?'<button class="competition-more" data-expand-competition="'+escapeHtml(key)+'">Réduire</button>':'';
          return '<section class="competition-group"><div class="competition-heading"><h2>'+escapeHtml(competition)+'</h2>'+(context?'<span>'+escapeHtml(context)+'</span>':'')+more+'</div>'+shown.map(item=>cardHtml(item,report,true)).join('')+'</section>';
        }).join('');
        return '<details class="sport-group" data-sport-group="'+escapeHtml(sport)+'" '+(collapsedSports.has(sport)?'':'open')+'><summary class="sport-heading"><h2>'+escapeHtml(sportLabel(sport))+'</h2><span>'+escapeHtml(sportContext(sportItems,report))+'</span></summary>'+competitionHtml+'</details>';
      }).join('');
    }

    function competitionContext(items) {
      return items.map(item=>item.eventRoundLabel||item.eventStage||'').find(Boolean)||'';
    }

    function sportContext(items,report) {
      const start=items.map(firstItemStart).filter(Boolean).sort()[0];
      if(!start)return '';
      const instant=new Date(start);
      const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:report.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(instant);
      if(localDate!==report.date)return new Intl.DateTimeFormat('fr-FR',{timeZone:report.timeZone,weekday:'long'}).format(instant).replace(/^./,letter=>letter.toLocaleUpperCase('fr-FR'));
      return 'Dès '+new Intl.DateTimeFormat('fr-FR',{timeZone:report.timeZone,hour:'2-digit',minute:'2-digit'}).format(instant);
    }

    function firstItemStart(item) {
      return item.eventStartAtUtc||item.broadcasts[0]?.startAtUtc||'';
    }

    function isFinished(item,report) {
      if(report.viewMode!=='event-first')return false;
      const status=String(item.eventStatus||'').trim();
      if(/^(FT|AOT|PEN|FINAL|FINISHED|ENDED|CLOSED)$/i.test(status)||/termin|finished|ended/i.test(status))return true;
      if(report.date!==todayInTimeZone(report.timeZone))return false;
      const end=Date.parse(item.eventEndAtUtc||'');
      if(Number.isFinite(end))return end<Date.now();
      const stops=item.broadcasts.map(b=>Date.parse(b.stopAtUtc)).filter(Number.isFinite);
      return stops.length>0&&Math.max(...stops)<Date.now();
    }

    function isLiveNow(item) {
      const now=Date.now();
      const overlaps=(startValue,stopValue)=>{const start=Date.parse(startValue||''),stop=Date.parse(stopValue||'');return Number.isFinite(start)&&Number.isFinite(stop)&&start<=now&&stop>now;};
      if(overlaps(item.eventStartAtUtc,item.eventEndAtUtc))return true;
      return item.broadcasts.some(b=>b.liveStatus!=='delayed'&&overlaps(b.startAtUtc,b.stopAtUtc));
    }

    function cardHtml(item,report,compact=false,highlight=false) {
      const validation = validationFor(item.id);
      const eventFirst=report.viewMode==='event-first';
      const liveLabels={confirmed:'Direct',probable:'Direct',unknown:'Diffusion à identifier',delayed:'Replay'};
      const visibleStatuses=[...new Set(item.broadcasts.map(b=>b.liveStatus))];
      const category=eventFirst?'Événement sportif':item.contentCategory==='Emission'?'Emission':visibleStatuses.some(status=>status==='confirmed'||status==='probable')?'Sport Live':visibleStatuses.length&&visibleStatuses.every(status=>status==='delayed')?'Sport différé':'À confirmer';
      const statusBadge=visibleStatuses.length>1?'Statuts mixtes':liveLabels[visibleStatuses[0]];
      const rights = item.broadcasts.filter(b=>b.provenance==='rights');
      const badges = [item.sport,item.competition,item.participants,eventFirst&&item.eventImportance?'Priorité '+item.eventImportance:'',category,statusBadge,rights.length?'Droits officiels':'',item.titleQuality==='unclear'?'Intitulé peu précis':''].filter(Boolean);
      const buttons = verdicts.map(([value,label]) => '<button data-action="verdict" data-id="'+item.id+'" data-value="'+value+'" class="'+(validation.verdict===value?'selected':'')+'">'+label+'</button>').join('');
      const official=eventFirst?'<span class="official-time"><strong>'+escapeHtml(item.eventTimeLabel)+'</strong></span>':'';
      const finished=isFinished(item,report);
      const tennisRound=eventFirst&&item.sport==='tennis'&&item.eventRoundLabel?' - '+item.eventRoundLabel:'';
      const titleWithRound=item.title+tennisRound;
      const displayTitle=highlight&&eventFirst?sportLabel(item.sport)+' · '+item.competition+' — '+titleWithRound:titleWithRound;
      const liveIndicator=eventFirst&&isLiveNow(item)?'<span class="live-state"><span class="live-dot"></span>DIRECT</span>':'';
      const channelGroups=new Map();
      for(const b of item.broadcasts){const name=b.platform||b.channel;if(!channelGroups.has(name))channelGroups.set(name,[]);channelGroups.get(name).push(b)}
      const broadcasts=channelGroups.size?'<div class="broadcasts">'+[...channelGroups.entries()].sort((a,b)=>a[0].localeCompare(b[0],'fr',{numeric:true})).map(([name,values])=>'<span class="broadcast" data-tone="'+channelTone(values)+'" title="'+escapeHtml(broadcastTrustLabel(values))+'" aria-label="'+escapeHtml(name+' · '+broadcastTrustLabel(values))+'">'+escapeHtml(name)+'</span>').join('')+'</div>':'<div class="unmatched">Diffuseur non identifié</div>';
      const schedule=item.eventSchedule?.length?'<div class="event-schedule">'+item.eventSchedule.map(entry=>'<span><strong>'+escapeHtml(entry.timeConfirmed===false?'Horaire à venir':formatEventTime(entry.startAtUtc))+'</strong> '+escapeHtml((entry.participants||[]).map(abbreviateFirstName).join(' / '))+(entry.roundLabel&&typeof item.eventRoundRank==='number'&&typeof entry.roundRank==='number'&&entry.roundRank<item.eventRoundRank?' ('+escapeHtml(entry.roundLabel)+')':'')+'</span>').join(' · ')+'</div>':'';
      const broadcastDetails=item.broadcasts.length?'<div class="detail-broadcasts"><strong>Diffusions :</strong> '+item.broadcasts.map(b=>'<span>'+escapeHtml(b.timeRangeLabel||b.timeLabel)+' · '+escapeHtml(b.platform||b.channel)+' · '+escapeHtml(broadcastTrustLabel([b]))+'</span>').join(' · ')+'</div>':'';
      const detailsLabel=eventFirst?'Détails et validation ponctuelle':'Détails du programme';
      const favoriteControls=eventFirst?'<div class="badges">'+favoriteButton('competition',item,item.competition)+(item.participants||'').split(' | ').filter(Boolean).map(team=>favoriteButton('team',item,team)).join('')+'</div>'+ratingControls(item)+'<button class="danger-link" data-hide-competition="'+escapeHtml(competitionPreferenceKey(item))+'">Masquer cette compétition</button><p>Favoris et intérêt restent sur cet appareil et personnalisent « À ne pas manquer ».</p>':'';
      const details = '<details class="secondary-details"><summary aria-label="'+escapeHtml(detailsLabel)+'" title="'+escapeHtml(detailsLabel)+'"></summary>'+
        favoriteControls+
        '<div class="badges">'+badges.map(value=>'<span class="badge">'+escapeHtml(value)+'</span>').join('')+'</div>'+
        (item.description?'<p class="description">'+escapeHtml(item.description)+'</p>':'')+
        broadcastDetails+
        '<p><strong>Pourquoi ?</strong> Score '+item.score+' · '+escapeHtml(item.selectionReasons.join(' · '))+'</p>'+
        (eventFirst?'<div class="validation"><div class="verdicts">'+buttons+'</div><textarea data-action="note" data-id="'+item.id+'" placeholder="Commentaire facultatif">'+escapeHtml(validation.note)+'</textarea></div>':'')+
        '</details>';
      return '<article class="card '+(compact?'compact-card ':'')+(finished?'finished':'')+'" data-verdict="'+validation.verdict+'">'+
        '<div class="card-head"><div class="card-main"><div class="event-line">'+official+'<h2>'+(finished?'<span class="finished-label">Terminé · </span>':'')+liveIndicator+escapeHtml(displayTitle)+'</h2>'+
        broadcasts+
        details+'</div>'+(highlight?'<p class="highlight-reason">'+escapeHtml(highlightReason(item))+'</p>':'')+schedule+'</div></div></article>';
    }

    function formatEventTime(value) {
      const instant=new Date(value);
      const time=new Intl.DateTimeFormat('fr-FR',{timeZone:state.report.timeZone,hour:'2-digit',minute:'2-digit'}).format(instant).replace(':','h');
      const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:state.report.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(instant);
      const dayOffset=Math.round((Date.parse(localDate+'T00:00:00Z')-Date.parse(state.report.date+'T00:00:00Z'))/86400000);
      return dayOffset===0?time:'J'+(dayOffset>0?'+':'')+dayOffset+' · '+time;
    }

    function abbreviateFirstName(value) {
      const parts=String(value||'').trim().split(/\\s+/).filter(Boolean);
      if(parts.length<2)return parts[0]||'';
      const first=parts.shift();
      const initials=first.split('-').filter(Boolean).map(part=>part.slice(0,1).toLocaleUpperCase('fr-FR')+'.').join('-');
      return initials+' '+parts.join(' ');
    }

    function channelTone(values) {
      if(values.every(b=>b.liveStatus==='delayed'))return 'red';
      if(values.some(b=>b.provenance==='rights')||values.some(b=>/multiplex/i.test(String(b.platform||b.channel||''))))return 'yellow';
      if(values.some(b=>b.liveStatus==='confirmed'||(b.liveStatus==='probable'&&b.broadcastAlignedToEvent)))return 'green';
      return 'yellow';
    }

    function broadcastTrustLabel(values) {
      if(values.every(b=>b.liveStatus==='delayed'))return 'Rediffusion';
      if(values.some(b=>b.provenance==='rights'))return 'Disponible selon les droits annoncés · chaîne exacte non vérifiée';
      const name=String(values[0]?.platform||values[0]?.channel||'');
      if(/multiplex/i.test(name))return 'Multiplex · canal individuel non identifié';
      if(values.some(b=>b.liveStatus==='confirmed'))return 'Direct indiqué par la grille TV';
      if(values.some(b=>b.liveStatus==='probable'&&b.broadcastAlignedToEvent))return 'Horaire TV aligné avec le début sportif';
      return 'Diffusion trouvée · direct à confirmer';
    }

    function broadcastTone(broadcast) {
      if (broadcast.liveStatus==='delayed') return 'red';
      if (broadcast.liveStatus==='confirmed'||(broadcast.liveStatus==='probable'&&broadcast.broadcastAlignedToEvent)) return 'green';
      return 'yellow';
    }

    async function saveItem(id, patch, rerender=true) {
      const current = validationFor(id);
      setSaving();
      const response = await fetch('/api/validation', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({date:state.report.date,itemId:id,verdict:patch.verdict||current.verdict,note:patch.note ?? current.note}) });
      if (!response.ok) throw new Error(await response.text());
      state.validation = await response.json();
      setSaved();
      if (rerender) render();
    }

    document.addEventListener('toggle', event => {
      const group=event.target;
      if (!group.matches?.('.sport-group') || !group.isConnected) return;
      if(group.open) collapsedSports.delete(group.dataset.sportGroup);
      else collapsedSports.add(group.dataset.sportGroup);
    }, true);

    document.addEventListener('click', event => {
      const competitionToggle=event.target.closest('[data-expand-competition]');
      if(competitionToggle) {
        const key=competitionToggle.dataset.expandCompetition;
        if(expandedCompetitions.has(key))expandedCompetitions.delete(key);else expandedCompetitions.add(key);
        render();return;
      }
      const upcoming=event.target.closest('[data-upcoming]');
      if(upcoming) { upcomingMode=true; renderDateFilters(); render(); return; }
      const favorite=event.target.closest('[data-favorite]');
      if(favorite) {
        const key=favorite.dataset.favorite;
        if(favorites.has(key)) favorites.delete(key); else favorites.add(key);
        try { localStorage.setItem('sporttoday-favorites',JSON.stringify([...favorites])); } catch { showError(new Error('Impossible de mémoriser les favoris sur cet appareil.')); }
        render(); return;
      }
      const preferenceModeButton=event.target.closest('.preference-mode-filter');
      if(preferenceModeButton) { preferenceMode=preferenceModeButton.dataset.preferenceMode; savePreferences(); renderPreferences(); render(); return; }
      const excludedSport=event.target.closest('[data-excluded-sport]');
      if(excludedSport) {
        const sport=excludedSport.dataset.excludedSport;
        preferences.excludedSports=preferences.excludedSports.includes(sport)?preferences.excludedSports.filter(value=>value!==sport):[...preferences.excludedSports,sport];
        savePreferences();renderPreferences();render();return;
      }
      const excludedCompetition=event.target.closest('[data-excluded-competition]');
      if(excludedCompetition) {
        const key=excludedCompetition.dataset.excludedCompetition;
        preferences.excludedCompetitions=preferences.excludedCompetitions.filter(value=>value!==key);
        savePreferences();renderPreferences();render();return;
      }
      const hiddenCompetition=event.target.closest('[data-hide-competition]');
      if(hiddenCompetition) {
        const key=hiddenCompetition.dataset.hideCompetition;
        preferences.excludedCompetitions=[...new Set([...preferences.excludedCompetitions,key])];
        savePreferences();renderPreferences();render();return;
      }
      const date = event.target.closest('.date-filter');
      if (date && date.dataset.date) { upcomingMode=false; loadDate(date.dataset.date).catch(showError); return; }
      const view = event.target.closest('.view-filter');
      if (view) { activeView=view.dataset.view; activeSports.clear(); document.querySelectorAll('.view-filter').forEach(b=>b.classList.toggle('active',b===view)); renderSportFilters(); render(); return; }
      const category = event.target.closest('.category-filter');
      if (category) { activeCategory=category.dataset.category; document.querySelectorAll('.category-filter').forEach(b=>b.classList.toggle('active',b===category)); render(); return; }
      const period = event.target.closest('.period-filter');
      if (period) { activePeriod=period.dataset.period; document.querySelectorAll('.period-filter').forEach(b=>b.classList.toggle('active',b===period)); render(); return; }
      const sport = event.target.closest('.sport-filter');
      if (sport) {
        const value=sport.dataset.sport;
        if (value==='all') activeSports.clear();
        else if (activeSports.has(value)) activeSports.delete(value);
        else activeSports.add(value);
        renderSportFilters(); render(); return;
      }
      const validation = event.target.closest('.validation-filter');
      if (validation) { activeValidation=validation.dataset.validation; document.querySelectorAll('.validation-filter').forEach(b=>b.classList.toggle('active',b===validation)); render(); return; }
      const button = event.target.closest('[data-action="verdict"]');
      if (button) saveItem(button.dataset.id,{verdict:button.dataset.value}).catch(showError);
    });

    document.addEventListener('input', event => {
      if(event.target.id==='site-search') {
        searchQuery=event.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('fr-FR');
        render();return;
      }
      if (event.target.matches('[data-action="note"]')) {
        clearTimeout(noteTimer); const id=event.target.dataset.id,value=event.target.value;
        noteTimer=setTimeout(()=>saveItem(id,{note:value},false).catch(showError),500);
      }
      if (event.target.id==='missing-event') {
        clearTimeout(missingTimer); const note=event.target.value; setSaving();
        missingTimer=setTimeout(async()=>{try{const response=await fetch('/api/missing-event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date:state.report.date,note})});if(!response.ok)throw new Error(await response.text());state.validation=await response.json();setSaved();}catch(error){showError(error)}},500);
      }
      if (event.target.id==='debug-note') {
        clearTimeout(debugTimer); const note=event.target.value; setSaving();
        debugTimer=setTimeout(async()=>{try{const response=await fetch('/api/debug-note',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date:state.report.date,note})});if(!response.ok)throw new Error(await response.text());state.validation=await response.json();setSaved();}catch(error){showError(error)}},500);
      }
    });

    document.addEventListener('change', event => {
      const target=event.target;
      if(target.matches('[data-rating-key]')) {
        ratings[target.dataset.ratingKey]=Number(target.value);
        try { localStorage.setItem(ratingStorageKey,JSON.stringify(ratings)); } catch { showError(new Error('Impossible de mémoriser les notes sur cet appareil.')); }
        render(); return;
      }
      if(target.matches('[data-preference-package]')) {
        const value=target.dataset.preferencePackage;
        preferences.packages=target.checked?[...new Set([...preferences.packages,value])]:preferences.packages.filter(id=>id!==value);
        savePreferences(); renderPreferences(); render();
      }
    });

    function setSaving(){document.getElementById('save-state').textContent='Sauvegarde…';}
    function setSaved(){document.getElementById('save-state').textContent=state.validation.updatedAt?'Sauvegardé automatiquement':'Prêt à valider';}
    function showError(error){document.getElementById('save-state').textContent='Erreur de sauvegarde';console.error(error);}
    const aboutDialog=document.getElementById('about-dialog');
    document.getElementById('about-open').addEventListener('click',()=>aboutDialog.showModal());
    document.getElementById('about-close').addEventListener('click',()=>aboutDialog.close());
    document.getElementById('settings-open').addEventListener('click',()=>{
      if(upcomingMode){upcomingMode=false;renderDateFilters();render();}
      const toolbar=document.querySelector('.toolbar'),details=document.querySelector('.advanced-filters');
      toolbar.classList.toggle('settings-visible');
      if(toolbar.classList.contains('settings-visible')){details.open=true;toolbar.scrollIntoView({behavior:'smooth',block:'start'});}
    });
    load().then(() => {
      setInterval(() => { void checkForUpdatedReport(); }, 300_000);
    }).catch(error => { showError(error); document.getElementById('cards').innerHTML='<div class="empty">'+escapeHtml(error.message)+'</div>'; });
  </script>
</body>
</html>`;
}
