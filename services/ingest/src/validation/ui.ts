export function validationHtml(): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SportToday — Validation du soir</title>
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
    .toolbar-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:9px; padding-top:12px; border-top:1px solid #edf0f4; }
    .toolbar-actions .spacer { flex:1; }
    button,.button { appearance:none; border:1px solid #cbd3df; background:white; color:#182033; border-radius:8px; padding:8px 12px; cursor:pointer; font:inherit; text-decoration:none; }
    button:hover,.button:hover { border-color:#50627e; }
    button.active { background:#172033; color:white; border-color:#172033; }
    .save-state { color:#637087; font-size:13px; }
    .summary-footer { color:#637087; font-size:12px; line-height:1.4; margin:0; padding:2px 4px; text-align:right; }
    .cards { display:grid; gap:14px; }
    .highlights { display:grid; gap:8px; margin-bottom:8px; }
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
    .card[data-verdict="ok"] { border-left-color:#1d9b5f; }
    .card[data-verdict="doubt"] { border-left-color:#d69a00; }
    .card[data-verdict^="wrong_"],.card[data-verdict="off_topic"],.card[data-verdict="duplicate"] { border-left-color:#cf4b4b; }
    .card-head { display:flex; gap:14px; align-items:flex-start; }
    .card-main { flex:1; min-width:0; }
    .event-line { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .event-line h2 { margin:0; flex:1 1 260px; min-width:0; }
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
    @media (max-width:700px) {
      .card-head { display:block; }
      .event-line { align-items:flex-start; }
      .event-line h2 { flex-basis:calc(100% - 38px); }
      .event-line > .broadcasts { flex-basis:100%; min-width:0; justify-content:flex-start; margin:0; }
      .secondary-details { margin-left:auto; }
      .secondary-details[open] { flex-basis:100%; }
      .filter-label { width:100%; }
      .toolbar-actions .spacer { display:none; width:100%; }
    }
  </style>
</head>
<body>
  <header><h1>Quel sport regarder ?</h1><p id="subtitle">Chargement de la sélection…</p></header>
  <main>
    <section class="toolbar">
      <div class="primary-row">
        <div class="filter-row view-row" id="view-filters" hidden>
          <span class="filter-label">Vue</span>
          <button class="view-filter active" data-view="events">À voir</button>
          <button class="view-filter" data-view="programmes">Agenda TV</button>
        </div>
        <div class="filter-row date-row" id="date-filters">
          <span class="filter-label">Date</span>
          <span id="date-buttons"><button class="date-filter active">Chargement…</button></span>
        </div>
      </div>
      <details class="advanced-filters">
        <summary>Filtres supplémentaires et validation</summary>
        <div class="filter-row">
          <span class="filter-label">Programme</span>
          <button class="category-filter active" data-category="live">● Direct</button>
          <button class="category-filter" data-category="delayed">Différé</button>
          <button class="category-filter" data-category="editorial">Émission</button>
          <button class="category-filter" data-category="all">Tous</button>
        </div>
        <div class="filter-row">
          <span class="filter-label">Période</span>
          <button class="period-filter active" data-period="evening">Soirée · en cours dès 20 h</button>
          <button class="period-filter" data-period="day">Aujourd’hui · journée complète</button>
        </div>
        <div class="filter-row" id="sport-filters">
          <span class="filter-label">Sport</span>
          <span id="sport-buttons"><button class="sport-filter active" data-sport="all">Tous les sports</button></span>
        </div>
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
    <section class="cards" id="cards"><div class="empty">Chargement…</div></section>
    <section class="missing">
      <label for="missing-event">Un événement majeur manque-t-il à cette sélection ?</label>
      <textarea id="missing-event" placeholder="Facultatif — indique ici un événement important absent"></textarea>
    </section>
    <section class="bottom-panels">
      <section class="exhaustivity-panel">
        <details class="exhaustivity-details">
          <summary>Exhaustivité et qualité des sources</summary>
          <div class="exhaustivity-content">
            <p class="source-warning" id="source-warning" hidden></p>
            <p class="result-note" id="result-note"></p>
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
  <script>
    const verdicts = [
      ['ok','✓ OK'],['doubt','? Doute'],['off_topic','✗ Hors sujet'],
      ['wrong_channel','✗ Chaîne'],['wrong_time','✗ Horaire'],
      ['wrong_live','✗ Live/Différé'],['duplicate','✗ Doublon']
    ];
    let state = null;
    let activeCategory = 'live';
    let activePeriod = 'evening';
    let activeValidation = 'all';
    let activeView = 'events';
    let activeSports = new Set();
    let noteTimer = null;
    let missingTimer = null;

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const validationFor = id => state.validation.items[id] || { verdict:'pending', note:'' };
    const issue = verdict => !['pending','ok'].includes(verdict);

    async function loadDate(date='') {
      const query = date ? '?date='+encodeURIComponent(date) : '';
      const response = await fetch('/api/report'+query);
      if (!response.ok) throw new Error('Impossible de charger la sélection.');
      state = await response.json();
      if (state.programmeReport) document.getElementById('view-filters').hidden=false;
      document.getElementById('missing-event').value = state.validation.missingEventNote || '';
      renderDateFilters();
      renderSportFilters();
      setSaved();
      render();
    }

    async function load() { await loadDate(); }

    async function checkForUpdatedReport() {
      if (!state || document.activeElement?.matches('textarea')) return;
      const response = await fetch('/api/report?date='+encodeURIComponent(state.report.date));
      if (!response.ok) return;
      const next = await response.json();
      if (next.report.generatedAt === state.report.generatedAt) return;
      state = next;
      document.getElementById('missing-event').value = state.validation.missingEventNote || '';
      renderDateFilters();
      renderSportFilters();
      render();
    }

    function renderDateFilters() {
      const dates = state.availableDates || [state.report.date];
      const selected = state.report.date;
      const labels = ['Aujourd’hui','Demain'];
      const buttons = dates.map((date,index) => '<button class="date-filter '+(date===selected?'active':'')+'" data-date="'+escapeHtml(date)+'">'+(labels[index]||escapeHtml(date))+' <small>'+escapeHtml(formatShortDate(date))+'</small></button>');
      document.getElementById('date-buttons').innerHTML = buttons.join('');
    }

    function formatShortDate(value) {
      return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'2-digit'}).format(new Date(value+'T12:00:00Z'));
    }

    function render() {
      const report=currentReport();
      updateSubtitle(report);
      const eventFirst=report.viewMode==='event-first';
      const matching = eventFirst
        ? report.items.filter(item=>matchesEventCategory(item)).filter(item=>matchesEventPeriod(item,report)).filter(matchesSport)
        : report.items.map(item=>({...item,broadcasts:item.broadcasts.filter(broadcast=>matchesBroadcast(item,broadcast,report))})).filter(item=>item.broadcasts.length>0).filter(matchesSport);
      const stats = matching.reduce((acc,item) => { const v=validationFor(item.id).verdict; acc[v==='pending'?'pending':v==='ok'?'ok':'issues']++; return acc; }, {pending:0,ok:0,issues:0});
      const filtered = eventFirst ? matching.filter(item => { const v=validationFor(item.id).verdict; return activeValidation==='all'||activeValidation===v||(activeValidation==='issues'&&issue(v)); }) : matching;
      const visible = eventFirst ? filtered : diversifiedSelection(filtered,report.limit);
      const summary=eventFirst
        ? [['Compétitions',new Set(matching.map(item=>item.competition||'Autre')).size],['Événements',matching.length],['Catalogue',report.catalogueEventCount??matching.length],['Chaîne ou plateforme',matching.filter(item=>item.broadcasts.length).length],['Sans diffuseur',matching.filter(item=>!item.broadcasts.length).length],['À valider',stats.pending],['Validés OK',stats.ok],['Doutes / erreurs',stats.issues]]
        : [['Programmes regroupés',matching.length],['Affichés',visible.length]];
      const summaryText=eventFirst
        ? [
            summary[0][1]+' compétitions',
            summary[1][1]+' événements',
            summary[3][1]+' avec chaîne ou plateforme',
            summary[4][1]+' sans diffuseur',
            summary[5][1]+' à valider',
            summary[6][1]+' validés',
            summary[7][1]+' doutes / erreurs'
          ].join(' · ')
        : summary.map(([label,value]) => value+' '+label.toLocaleLowerCase('fr-FR')).join(' · ');
      document.getElementById('summary').textContent = summaryText;
      const sourceErrors=eventFirst?(report.eventSourceErrors||[]):[];
      const sourceWarning=document.getElementById('source-warning');
      sourceWarning.hidden=sourceErrors.length===0;
      sourceWarning.textContent=sourceErrors.length?'Source incomplète · '+sourceErrors.join(' · '):'';
      const hidden=filtered.length-visible.length;
      document.getElementById('result-note').textContent = eventFirst
        ? (activeCategory==='live' ? 'Les événements officiels avec une chaîne ou une plateforme identifiée sont mis en avant. Les autres restent visibles dans l’agenda.' : visible.length+' événement'+(visible.length>1?'s':'')+' officiel'+(visible.length>1?'s':'')+' dans le catalogue filtré.')
        : hidden>0 ? visible.length+' événements principaux affichés sur '+filtered.length+' · maximum 2 par compétition pour diversifier la sélection.' : '';
      renderCoverage();
      document.getElementById('cards').innerHTML = visible.length
        ? (eventFirst ? renderEventSelection(visible,report) : visible.map(item=>cardHtml(item,report)).join(''))
        : '<div class="empty">Aucun événement dans ce filtre.</div>';
      const selectedSports = [...activeSports].sort().map(encodeURIComponent).join('%2C');
      const query = '?category='+encodeURIComponent(activeCategory)+'&period='+encodeURIComponent(activePeriod)+(selectedSports?'&sports='+selectedSports:'');
      const dateQuery='&date='+encodeURIComponent(report.date);
      document.getElementById('export-csv').href='/export.csv'+query+dateQuery;
      document.getElementById('export-xlsx').href='/export.xlsx'+query+dateQuery;
      document.querySelector('.toolbar-actions').hidden=!eventFirst;
      document.querySelector('.missing').hidden=!eventFirst;
      document.querySelectorAll('.validation-filter').forEach(button=>button.disabled=!eventFirst);
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

    function sportLabel(value) {
      const labels={football:'Football',footvolley:'FootVolley',tennis:'Tennis',cyclisme:'Cyclisme',rugby:'Rugby',boxe:'Boxe',basket:'Basket',golf:'Golf',f1:'Formule 1',motonautisme:'Motonautisme',motogp:'MotoGP',judo:'Judo',ski:'Ski',handball:'Handball',volley:'Volley',volleyball:'Volleyball',athlétisme:'Athlétisme',natation:'Natation'};
      return labels[value]||value.charAt(0).toLocaleUpperCase('fr-FR')+value.slice(1);
    }

    function currentReport() { return activeView==='programmes'&&state.programmeReport ? state.programmeReport : state.report; }

    function updateSubtitle(report) {
      const date = new Intl.DateTimeFormat('fr-FR',{dateStyle:'full',timeZone:report.timeZone}).format(new Date(report.date+'T12:00:00Z'));
      document.getElementById('subtitle').textContent = date+' · '+report.source+' · '+(report.viewMode==='event-first'?'sélection construite depuis les événements officiels':'grille issue des programmes XMLTV');
    }

    function matchesEventCategory(item) {
      if (activeCategory==='all') return true;
      if (activeCategory==='live') return item.contentCategory!=='Emission'&&(item.broadcasts.length===0||item.broadcasts.some(b=>b.liveStatus!=='delayed'));
      if (activeCategory==='uncertain') return item.broadcastMatchConfidence==='none'||item.broadcasts.some(b=>b.liveStatus==='unknown');
      if (activeCategory==='delayed') return item.broadcasts.some(b=>b.liveStatus==='delayed');
      return false;
    }

    function matchesEventPeriod(item,report) {
      if (activePeriod==='day') return true;
      const start=Date.parse(report.eveningStartUtc),end=Date.parse(report.windowEndUtc);
      const eventStart=Date.parse(item.eventStartAtUtc),eventEnd=Date.parse(item.eventEndAtUtc||item.eventStartAtUtc);
      return eventStart<end&&(eventEnd>start||eventStart>=start);
    }

    function matchesBroadcast(item,broadcast,report) {
      const categoryMatch=activeCategory==='all'||(activeCategory==='live'&&item.contentCategory!=='Emission'&&broadcast.liveStatus!=='delayed')||(activeCategory==='uncertain'&&broadcast.liveStatus==='unknown'&&item.contentCategory!=='Emission')||(activeCategory==='delayed'&&broadcast.liveStatus==='delayed')||(activeCategory==='editorial'&&item.contentCategory==='Emission');
      if (!categoryMatch) return false;
      if (activePeriod==='day') return true;
      const start=Date.parse(report.eveningStartUtc),end=Date.parse(report.windowEndUtc);
      const value=Date.parse(broadcast.startAtUtc),parsedStop=Date.parse(broadcast.stopAtUtc),stop=Number.isFinite(parsedStop)&&parsedStop>value?parsedStop:value;
      return value<end&&(stop>start||value>=start);
    }

    function matchesSport(item) {
      return activeSports.size===0||activeSports.has(item.sport);
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
      const ranked=items.filter(item=>item.broadcasts.length>0).sort((left,right)=>right.score-left.score||firstItemStart(left).localeCompare(firstItemStart(right)));
      const highlights=ranked.slice(0,3);
      const highlightIds=new Set(highlights.map(item=>item.id));
      const highlightHtml=highlights.length?'<section class="highlights"><div class="section-heading"><h2>À ne pas manquer</h2><span>'+highlights.length+' sélection'+(highlights.length>1?'s':'')+'</span></div>'+highlights.map(item=>cardHtml(item,report,true,true)).join('')+'</section>':'';
      const rest=items.filter(item=>!highlightIds.has(item.id));
      return highlightHtml+renderEventGroups(rest,report);
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
      return [...sports.entries()].sort((left,right)=>Math.max(...[...left[1].values()].flat().map(item=>item.score))-Math.max(...[...right[1].values()].flat().map(item=>item.score))||sportLabel(left[0]).localeCompare(sportLabel(right[0]),'fr')).map(([sport,competitions])=>{
        const total=[...competitions.values()].flat().length;
        const competitionHtml=[...competitions.entries()].sort((left,right)=>Math.max(...left[1].map(item=>item.score))-Math.max(...right[1].map(item=>item.score))||left[0].localeCompare(right[0],'fr')).map(([competition,group])=>'<section class="competition-group"><div class="competition-heading"><h2>'+escapeHtml(competition)+'</h2><span>'+group.length+' match'+(group.length>1?'s':'')+'</span></div>'+group.sort((left,right)=>firstItemStart(left).localeCompare(firstItemStart(right))||right.score-left.score).map(item=>cardHtml(item,report,true)).join('')+'</section>').join('');
        return '<details class="sport-group" open><summary class="sport-heading"><h2>'+escapeHtml(sportLabel(sport))+'</h2><span>'+total+' événement'+(total>1?'s':'')+'</span></summary>'+competitionHtml+'</details>';
      }).join('');
    }

    function firstItemStart(item) {
      return item.eventStartAtUtc||item.broadcasts[0]?.startAtUtc||'';
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
      const displayTitle=highlight&&eventFirst?sportLabel(item.sport)+' · '+item.competition+' — '+item.title:item.title;
      const broadcasts=item.broadcasts.length?'<div class="broadcasts">'+item.broadcasts.map(b=>'<span class="broadcast" data-tone="'+broadcastTone(b)+'" data-live="'+escapeHtml(b.liveStatus)+'" data-aligned="'+(b.liveStatus==='confirmed'||(b.liveStatus==='probable'&&b.broadcastAlignedToEvent)?'true':'false')+'"><strong>'+escapeHtml(b.timeRangeLabel||b.timeLabel)+'</strong> · '+(b.platform?'<span class="platform">'+escapeHtml(b.platform)+'</span>':escapeHtml(b.channel))+'</span>').join('')+'</div>':'<div class="unmatched">Diffuseur non identifié</div>';
      const detailsLabel=eventFirst?'Détails et validation ponctuelle':'Détails du programme';
      const details = '<details class="secondary-details"><summary aria-label="'+escapeHtml(detailsLabel)+'" title="'+escapeHtml(detailsLabel)+'"></summary>'+
        '<div class="badges">'+badges.map(value=>'<span class="badge">'+escapeHtml(value)+'</span>').join('')+'</div>'+
        (item.description?'<p class="description">'+escapeHtml(item.description)+'</p>':'')+
        '<p><strong>Pourquoi ?</strong> Score '+item.score+' · '+escapeHtml(item.selectionReasons.join(' · '))+'</p>'+
        (eventFirst?'<div class="validation"><div class="verdicts">'+buttons+'</div><textarea data-action="note" data-id="'+item.id+'" placeholder="Commentaire facultatif">'+escapeHtml(validation.note)+'</textarea></div>':'')+
        '</details>';
      return '<article class="card '+(compact?'compact-card':'')+'" data-verdict="'+validation.verdict+'">'+
        '<div class="card-head"><div class="card-main"><div class="event-line">'+official+'<h2>'+escapeHtml(displayTitle)+'</h2>'+
        broadcasts+
        details+'</div></div></div></article>';
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

    document.addEventListener('click', event => {
      const date = event.target.closest('.date-filter');
      if (date && date.dataset.date) { loadDate(date.dataset.date).catch(showError); return; }
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
      if (event.target.matches('[data-action="note"]')) {
        clearTimeout(noteTimer); const id=event.target.dataset.id,value=event.target.value;
        noteTimer=setTimeout(()=>saveItem(id,{note:value},false).catch(showError),500);
      }
      if (event.target.id==='missing-event') {
        clearTimeout(missingTimer); const note=event.target.value; setSaving();
        missingTimer=setTimeout(async()=>{try{const response=await fetch('/api/missing-event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date:state.report.date,note})});if(!response.ok)throw new Error(await response.text());state.validation=await response.json();setSaved();}catch(error){showError(error)}},500);
      }
    });

    function setSaving(){document.getElementById('save-state').textContent='Sauvegarde…';}
    function setSaved(){document.getElementById('save-state').textContent=state.validation.updatedAt?'Sauvegardé automatiquement':'Prêt à valider';}
    function showError(error){document.getElementById('save-state').textContent='Erreur de sauvegarde';console.error(error);}
    load().then(() => {
      setInterval(() => { void checkForUpdatedReport(); }, 300_000);
    }).catch(error => { showError(error); document.getElementById('cards').innerHTML='<div class="empty">'+escapeHtml(error.message)+'</div>'; });
  </script>
</body>
</html>`;
}
