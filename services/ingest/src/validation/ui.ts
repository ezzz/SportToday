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
    .toolbar,.summary,.missing { background:white; border:1px solid #dfe4ec; border-radius:12px; padding:14px; margin-bottom:16px; }
    .view-row { padding-top:0; }
    .filter-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; padding:7px 0; }
    .filter-row + .filter-row { border-top:1px solid #edf0f4; }
    .filter-label { width:92px; color:#637087; font-size:13px; font-weight:700; }
    .toolbar-actions { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:9px; padding-top:12px; border-top:1px solid #edf0f4; }
    .toolbar-actions .spacer { flex:1; }
    button,.button { appearance:none; border:1px solid #cbd3df; background:white; color:#182033; border-radius:8px; padding:8px 12px; cursor:pointer; font:inherit; text-decoration:none; }
    button:hover,.button:hover { border-color:#50627e; }
    button.active { background:#172033; color:white; border-color:#172033; }
    .save-state { color:#637087; font-size:13px; }
    .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; }
    .metric strong { display:block; font-size:22px; }
    .metric span { color:#637087; font-size:13px; }
    .cards { display:grid; gap:14px; }
    .competition-group { display:grid; gap:8px; }
    .competition-heading { display:flex; align-items:baseline; gap:9px; margin:10px 2px 0; color:#26334b; }
    .competition-heading h2 { margin:0; font-size:17px; }
    .competition-heading span { color:#637087; font-size:12px; }
    .card { background:white; border:1px solid #dfe4ec; border-left:5px solid #9ba7ba; border-radius:12px; padding:16px; }
    .card[data-verdict="ok"] { border-left-color:#1d9b5f; }
    .card[data-verdict="doubt"] { border-left-color:#d69a00; }
    .card[data-verdict^="wrong_"],.card[data-verdict="off_topic"],.card[data-verdict="duplicate"] { border-left-color:#cf4b4b; }
    .card-head { display:flex; gap:14px; align-items:flex-start; }
    .card-main { flex:1; min-width:0; }
    .event-line { display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; }
    .event-line h2 { margin:0; }
    h2 { margin:0 0 7px; font-size:19px; }
    .badges,.broadcasts { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
    .badge { background:#eef1f6; border-radius:999px; padding:4px 8px; font-size:12px; }
    .broadcast { background:#eaf3ff; color:#164d81; border-radius:7px; padding:6px 9px; font-size:13px; }
    .broadcast[data-aligned="true"] { background:#dff5e7; color:#176540; border-color:#b7e4c5; }
    .broadcast[data-live="delayed"] { background:#f3edf9; color:#654080; }
    .broadcast[data-live="unknown"] { background:#f2f3f5; color:#596477; }
    .broadcast small { display:block; margin-top:3px; opacity:.82; }
    .official-time { display:inline-flex; gap:7px; align-items:center; background:#e7f7ee; color:#176540; border-radius:8px; padding:7px 10px; margin:4px 0 7px; font-size:14px; }
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
    .result-note { color:#637087; font-size:13px; margin:-7px 0 14px; }
    .source-warning { background:#fff3cf; color:#765500; border:1px solid #ead48b; border-radius:9px; padding:10px 12px; margin:0 0 14px; }
    .empty { text-align:center; color:#637087; padding:36px; }
    @media (max-width:700px) { .card-head { display:block; } .filter-label { width:100%; } .toolbar-actions .spacer { display:none; width:100%; } }
  </style>
</head>
<body>
  <header><h1>Quel sport regarder ?</h1><p id="subtitle">Chargement de la sélection…</p></header>
  <main>
    <section class="toolbar">
      <div class="filter-row view-row" id="view-filters" hidden>
        <span class="filter-label">Vue</span>
        <button class="view-filter active" data-view="events">À la une</button>
        <button class="view-filter" data-view="programmes">Tous les programmes TV</button>
      </div>
      <div class="filter-row" id="date-filters">
        <span class="filter-label">Date</span>
        <span id="date-buttons"><button class="date-filter active">Chargement…</button></span>
      </div>
      <div class="filter-row">
        <span class="filter-label">Programme</span>
        <button class="category-filter active" data-category="live">● Direct + à confirmer</button>
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
    </section>
    <section class="summary" id="summary"></section>
    <p class="source-warning" id="source-warning" hidden></p>
    <p class="result-note" id="result-note"></p>
    <section class="missing">
      <label for="missing-event">Un événement majeur manque-t-il à cette sélection ?</label>
      <textarea id="missing-event" placeholder="Facultatif — indique ici un événement important absent"></textarea>
    </section>
    <section class="cards" id="cards"><div class="empty">Chargement…</div></section>
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

    function renderDateFilters() {
      const dates = state.availableDates || [state.report.date];
      const selected = state.report.date;
      const labels = ['Aujourd’hui','Demain','Après-demain'];
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
        ? [['Compétitions',new Set(matching.map(item=>item.competition||'Autre')).size],['Événements',matching.length],['Catalogue',report.catalogueEventCount??matching.length],['Diffusion trouvée',matching.filter(item=>item.broadcasts.length).length],['Sans diffusion',matching.filter(item=>!item.broadcasts.length).length],['À valider',stats.pending],['Validés OK',stats.ok],['Doutes / erreurs',stats.issues]]
        : [['Programmes regroupés',matching.length],['Affichés',visible.length]];
      document.getElementById('summary').innerHTML = summary.map(([label,value]) => '<div class="metric"><strong>'+value+'</strong><span>'+label+'</span></div>').join('');
      const sourceErrors=eventFirst?(report.eventSourceErrors||[]):[];
      const sourceWarning=document.getElementById('source-warning');
      sourceWarning.hidden=sourceErrors.length===0;
      sourceWarning.textContent=sourceErrors.length?'Source incomplète · '+sourceErrors.join(' · '):'';
      const hidden=filtered.length-visible.length;
      document.getElementById('result-note').textContent = eventFirst
        ? (activeCategory==='live' ? 'Direct et à confirmer sont regroupés. Les événements sans diffusion XMLTV restent visibles et sont signalés en jaune.' : visible.length+' événement'+(visible.length>1?'s':'')+' officiel'+(visible.length>1?'s':'')+' dans le catalogue filtré.')
        : hidden>0 ? visible.length+' événements principaux affichés sur '+filtered.length+' · maximum 2 par compétition pour diversifier la sélection.' : '';
      document.getElementById('cards').innerHTML = visible.length
        ? (eventFirst ? renderEventGroups(visible,report) : visible.map(item=>cardHtml(item,report)).join(''))
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

    function renderSportFilters() {
      const counts = new Map();
      currentReport().items.forEach(item => counts.set(item.sport,(counts.get(item.sport)||0)+1));
      const sports = [...counts.keys()].sort((left,right)=>sportLabel(left).localeCompare(sportLabel(right),'fr'));
      const buttons = ['<button class="sport-filter '+(activeSports.size===0?'active':'')+'" data-sport="all">Tous les sports</button>']
        .concat(sports.map(sport=>'<button class="sport-filter '+(activeSports.has(sport)?'active':'')+'" data-sport="'+escapeHtml(sport)+'">'+escapeHtml(sportLabel(sport))+' <small>('+counts.get(sport)+')</small></button>'));
      document.getElementById('sport-buttons').innerHTML=buttons.join('');
    }

    function sportLabel(value) {
      const labels={football:'Football',footvolley:'FootVolley',tennis:'Tennis',cyclisme:'Cyclisme',rugby:'Rugby',boxe:'Boxe',basket:'Basket',golf:'Golf',f1:'Formule 1',motonautisme:'Motonautisme',motogp:'MotoGP',judo:'Judo',ski:'Ski',handball:'Handball',volley:'Volley',athlétisme:'Athlétisme',natation:'Natation'};
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

    function renderEventGroups(items,report) {
      const groups=new Map();
      for (const item of items) {
        const key=(item.competition||'Compétition non précisée').trim();
        if (!groups.has(key)) groups.set(key,[]);
        groups.get(key).push(item);
      }
      return [...groups.entries()].sort((left,right)=>{
        const leftScore=Math.max(...left[1].map(item=>item.score));
        const rightScore=Math.max(...right[1].map(item=>item.score));
        return rightScore-leftScore||left[0].localeCompare(right[0],'fr');
      }).map(([competition,group])=>'<section class="competition-group"><div class="competition-heading"><h2>'+escapeHtml(competition)+'</h2><span>'+group.length+' événement'+(group.length>1?'s':'')+'</span></div>'+group.map(item=>cardHtml(item,report)).join('')+'</section>').join('');
    }

    function cardHtml(item,report) {
      const validation = validationFor(item.id);
      const eventFirst=report.viewMode==='event-first';
      const liveLabels={confirmed:'Direct confirmé',probable:'Direct probable',unknown:'Statut à confirmer',delayed:'Différé détecté'};
      const visibleStatuses=[...new Set(item.broadcasts.map(b=>b.liveStatus))];
      const category=eventFirst?'Événement sportif':item.contentCategory==='Emission'?'Emission':visibleStatuses.some(status=>status==='confirmed'||status==='probable')?'Sport Live':visibleStatuses.length&&visibleStatuses.every(status=>status==='delayed')?'Sport différé':'À confirmer';
      const statusBadge=visibleStatuses.length>1?'Statuts mixtes':liveLabels[visibleStatuses[0]];
      const badges = [item.sport,item.competition,item.participants,eventFirst&&item.eventImportance?'Priorité '+item.eventImportance:'',category,statusBadge,item.titleQuality==='unclear'?'Intitulé peu précis':''].filter(Boolean);
      const buttons = verdicts.map(([value,label]) => '<button data-action="verdict" data-id="'+item.id+'" data-value="'+value+'" class="'+(validation.verdict===value?'selected':'')+'">'+label+'</button>').join('');
      const official=eventFirst?'<span class="official-time"><strong>'+escapeHtml(item.eventTimeLabel)+'</strong><span class="source-note">heure officielle · '+escapeHtml(item.eventSource)+'</span></span>':'';
      const broadcasts=item.broadcasts.length?'<div class="broadcasts">'+item.broadcasts.map(b=>'<span class="broadcast" data-live="'+escapeHtml(b.liveStatus)+'" data-aligned="'+(b.liveStatus==='confirmed'||(b.liveStatus==='probable'&&b.broadcastAlignedToEvent)?'true':'false')+'"><strong>'+escapeHtml(b.timeRangeLabel||b.timeLabel)+'</strong> · '+escapeHtml(b.channel)+' · '+escapeHtml(liveLabels[b.liveStatus])+(b.subTitle?'<small>'+escapeHtml(b.subTitle)+'</small>':'')+'</span>').join('')+'</div>':'<div class="unmatched">Diffusion française non retrouvée dans XMLTV pour le moment.</div>';
      const secondary=eventFirst?'<details class="secondary-details"><summary>Détails et validation ponctuelle</summary>'+(item.description?'<p class="description">'+escapeHtml(item.description)+'</p>':'')+'<p><strong>Pourquoi ?</strong> Score '+item.score+' · '+escapeHtml(item.selectionReasons.join(' · '))+'</p><div class="validation"><div class="verdicts">'+buttons+'</div><textarea data-action="note" data-id="'+item.id+'" placeholder="Commentaire facultatif">'+escapeHtml(validation.note)+'</textarea></div></details>':'';
      return '<article class="card" data-verdict="'+validation.verdict+'">'+
        '<div class="card-head"><div class="card-main"><div class="event-line">'+official+'<h2>'+escapeHtml(item.title)+'</h2></div>'+
        '<div class="badges">'+badges.map(value=>'<span class="badge">'+escapeHtml(value)+'</span>').join('')+'</div>'+
        broadcasts+
        (eventFirst?secondary:(item.description?'<p class="description">'+escapeHtml(item.description)+'</p>':'')+'<details><summary>Pourquoi cet événement ? Score '+item.score+'</summary><p>'+escapeHtml(item.selectionReasons.join(' · '))+'</p></details>')+'</div></div></article>';
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
    load().catch(error => { showError(error); document.getElementById('cards').innerHTML='<div class="empty">'+escapeHtml(error.message)+'</div>'; });
  </script>
</body>
</html>`;
}
