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
    .card { background:white; border:1px solid #dfe4ec; border-left:5px solid #9ba7ba; border-radius:12px; padding:16px; }
    .card[data-verdict="ok"] { border-left-color:#1d9b5f; }
    .card[data-verdict="doubt"] { border-left-color:#d69a00; }
    .card[data-verdict^="wrong_"],.card[data-verdict="off_topic"],.card[data-verdict="duplicate"] { border-left-color:#cf4b4b; }
    .card-head { display:flex; gap:14px; align-items:flex-start; }
    .card-main { flex:1; min-width:0; }
    h2 { margin:0 0 7px; font-size:19px; }
    .badges,.broadcasts { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
    .badge { background:#eef1f6; border-radius:999px; padding:4px 8px; font-size:12px; }
    .broadcast { background:#eaf3ff; color:#164d81; border-radius:7px; padding:6px 9px; font-size:13px; }
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
    .empty { text-align:center; color:#637087; padding:36px; }
    @media (max-width:700px) { .card-head { display:block; } .filter-label { width:100%; } .toolbar-actions .spacer { display:none; width:100%; } }
  </style>
</head>
<body>
  <header><h1>Quel sport regarder ?</h1><p id="subtitle">Chargement de la sélection…</p></header>
  <main>
    <section class="toolbar">
      <div class="filter-row">
        <span class="filter-label">Programme</span>
        <button class="category-filter active" data-category="live">● Direct / à confirmer</button>
        <button class="category-filter" data-category="delayed">Différé</button>
        <button class="category-filter" data-category="editorial">Émission</button>
        <button class="category-filter" data-category="all">Tous</button>
      </div>
      <div class="filter-row">
        <span class="filter-label">Période</span>
        <button class="period-filter active" data-period="evening">Soirée · dès 20 h</button>
        <button class="period-filter" data-period="day">Aujourd’hui · journée complète</button>
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
    let noteTimer = null;
    let missingTimer = null;

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const validationFor = id => state.validation.items[id] || { verdict:'pending', note:'' };
    const issue = verdict => !['pending','ok'].includes(verdict);

    async function load() {
      const response = await fetch('/api/report');
      if (!response.ok) throw new Error('Impossible de charger la sélection.');
      state = await response.json();
      const date = new Intl.DateTimeFormat('fr-FR',{dateStyle:'full',timeZone:state.report.timeZone}).format(new Date(state.report.date+'T12:00:00Z'));
      document.getElementById('subtitle').textContent = date + ' · ' + state.report.source + ' · soirée à partir de 20 h';
      document.getElementById('missing-event').value = state.validation.missingEventNote || '';
      setSaved();
      render();
    }

    function render() {
      const matching = state.report.items.filter(matchesCategory).filter(matchesPeriod);
      const stats = matching.reduce((acc,item) => { const v=validationFor(item.id).verdict; acc[v==='pending'?'pending':v==='ok'?'ok':'issues']++; return acc; }, {pending:0,ok:0,issues:0});
      const filtered = matching.filter(item => { const v=validationFor(item.id).verdict; return activeValidation==='all'||activeValidation===v||(activeValidation==='issues'&&issue(v)); });
      const visible = filtered.slice(0,state.report.limit);
      document.getElementById('summary').innerHTML = [
        ['Résultats',matching.length],['Affichés',visible.length],['À valider',stats.pending],['Validés OK',stats.ok],['Doutes / erreurs',stats.issues]
      ].map(([label,value]) => '<div class="metric"><strong>'+value+'</strong><span>'+label+'</span></div>').join('');
      document.getElementById('result-note').textContent = filtered.length>state.report.limit ? 'Les '+state.report.limit+' meilleurs résultats de cette vue sont affichés sur '+filtered.length+'.' : '';
      document.getElementById('cards').innerHTML = visible.length ? visible.map(cardHtml).join('') : '<div class="empty">Aucun événement dans ce filtre.</div>';
      const query = '?category='+encodeURIComponent(activeCategory)+'&period='+encodeURIComponent(activePeriod);
      document.getElementById('export-csv').href='/export.csv'+query;
      document.getElementById('export-xlsx').href='/export.xlsx'+query;
    }

    function matchesCategory(item) {
      return activeCategory==='all'||(activeCategory==='live'&&(item.contentCategory==='Sport Live'||(item.contentCategory==='Sport différé'&&item.isLive==='unknown')))||(activeCategory==='delayed'&&item.contentCategory==='Sport différé'&&item.isLive==='false')||(activeCategory==='editorial'&&item.contentCategory==='Emission');
    }

    function matchesPeriod(item) {
      if (activePeriod==='day') return true;
      const start=Date.parse(state.report.eveningStartUtc),end=Date.parse(state.report.windowEndUtc);
      return item.broadcasts.some(broadcast=>{const value=Date.parse(broadcast.startAtUtc);return value>=start&&value<end;});
    }

    function cardHtml(item) {
      const validation = validationFor(item.id);
      const category = item.contentCategory==='Sport différé'&&item.isLive==='unknown'?'Direct à confirmer':item.contentCategory;
      const badges = [item.sport,item.competition,item.participants,category,item.isLive==='true'?'Live confirmé':item.isLive==='false'?'Différé détecté':'Statut à valider'].filter(Boolean);
      const buttons = verdicts.map(([value,label]) => '<button data-action="verdict" data-id="'+item.id+'" data-value="'+value+'" class="'+(validation.verdict===value?'selected':'')+'">'+label+'</button>').join('');
      return '<article class="card" data-verdict="'+validation.verdict+'">'+
        '<div class="card-head"><div class="card-main"><h2>'+escapeHtml(item.title)+'</h2>'+
        '<div class="badges">'+badges.map(value=>'<span class="badge">'+escapeHtml(value)+'</span>').join('')+'</div>'+
        '<div class="broadcasts">'+item.broadcasts.map(b=>'<span class="broadcast"><strong>'+escapeHtml(b.timeLabel)+'</strong> · '+escapeHtml(b.channel)+'</span>').join('')+'</div>'+
        (item.description?'<p class="description">'+escapeHtml(item.description)+'</p>':'')+
        '<details><summary>Pourquoi cet événement ? Score '+item.score+'</summary><p>'+escapeHtml(item.selectionReasons.join(' · '))+'</p></details></div></div>'+
        '<div class="validation"><div class="verdicts">'+buttons+'</div>'+
        '<textarea data-action="note" data-id="'+item.id+'" placeholder="Commentaire facultatif">'+escapeHtml(validation.note)+'</textarea></div></article>';
    }

    async function saveItem(id, patch, rerender=true) {
      const current = validationFor(id);
      setSaving();
      const response = await fetch('/api/validation', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({itemId:id,verdict:patch.verdict||current.verdict,note:patch.note ?? current.note}) });
      if (!response.ok) throw new Error(await response.text());
      state.validation = await response.json();
      setSaved();
      if (rerender) render();
    }

    document.addEventListener('click', event => {
      const category = event.target.closest('.category-filter');
      if (category) { activeCategory=category.dataset.category; document.querySelectorAll('.category-filter').forEach(b=>b.classList.toggle('active',b===category)); render(); return; }
      const period = event.target.closest('.period-filter');
      if (period) { activePeriod=period.dataset.period; document.querySelectorAll('.period-filter').forEach(b=>b.classList.toggle('active',b===period)); render(); return; }
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
        missingTimer=setTimeout(async()=>{try{const response=await fetch('/api/missing-event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({note})});if(!response.ok)throw new Error(await response.text());state.validation=await response.json();setSaved();}catch(error){showError(error)}},500);
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
