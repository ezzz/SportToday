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
    .toolbar { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
    .toolbar .spacer { flex:1; }
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
    .empty { text-align:center; color:#637087; padding:36px; }
    @media (max-width:700px) { .card-head { display:block; } .toolbar .spacer { display:none; width:100%; } }
  </style>
</head>
<body>
  <header><h1>Quel sport regarder ce soir ?</h1><p id="subtitle">Chargement de la sélection…</p></header>
  <main>
    <section class="toolbar">
      <button class="filter active" data-filter="all">Tous</button>
      <button class="filter" data-filter="pending">À valider</button>
      <button class="filter" data-filter="ok">OK</button>
      <button class="filter" data-filter="issues">Doutes / erreurs</button>
      <span class="spacer"></span>
      <span class="save-state" id="save-state">Connexion…</span>
      <a class="button" href="/export.csv">Exporter CSV</a>
      <a class="button" href="/export.xlsx">Exporter XLSX</a>
    </section>
    <section class="summary" id="summary"></section>
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
    let activeFilter = 'all';
    let noteTimer = null;
    let missingTimer = null;

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const validationFor = id => state.validation.items[id] || { verdict:'pending', note:'' };
    const issue = verdict => !['pending','ok'].includes(verdict);

    async function load() {
      const response = await fetch('/api/report');
      if (!response.ok) throw new Error('Impossible de charger la sélection.');
      state = await response.json();
      document.getElementById('subtitle').textContent = state.report.date + ' · ' + state.report.timeZone + ' · ' + state.report.selectedCount + ' événements sélectionnés';
      document.getElementById('missing-event').value = state.validation.missingEventNote || '';
      setSaved();
      render();
    }

    function render() {
      const items = state.report.items;
      const stats = items.reduce((acc,item) => { const v=validationFor(item.id).verdict; acc[v==='pending'?'pending':v==='ok'?'ok':'issues']++; return acc; }, {pending:0,ok:0,issues:0});
      document.getElementById('summary').innerHTML = [
        ['Sélection',items.length],['À valider',stats.pending],['Validés OK',stats.ok],['Doutes / erreurs',stats.issues]
      ].map(([label,value]) => '<div class="metric"><strong>'+value+'</strong><span>'+label+'</span></div>').join('');
      const visible = items.filter(item => { const v=validationFor(item.id).verdict; return activeFilter==='all'||activeFilter===v||(activeFilter==='issues'&&issue(v)); });
      document.getElementById('cards').innerHTML = visible.length ? visible.map(cardHtml).join('') : '<div class="empty">Aucun événement dans ce filtre.</div>';
    }

    function cardHtml(item) {
      const validation = validationFor(item.id);
      const badges = [item.sport,item.competition,item.participants,item.contentCategory,item.isLive==='true'?'Live':item.isLive==='false'?'Non-live':'Live à confirmer'].filter(Boolean);
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

    async function saveItem(id, patch) {
      const current = validationFor(id);
      setSaving();
      const response = await fetch('/api/validation', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({itemId:id,verdict:patch.verdict||current.verdict,note:patch.note ?? current.note}) });
      if (!response.ok) throw new Error(await response.text());
      state.validation = await response.json();
      setSaved();
      render();
    }

    document.addEventListener('click', event => {
      const filter = event.target.closest('.filter');
      if (filter) { activeFilter=filter.dataset.filter; document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b===filter)); render(); return; }
      const button = event.target.closest('[data-action="verdict"]');
      if (button) saveItem(button.dataset.id,{verdict:button.dataset.value}).catch(showError);
    });

    document.addEventListener('input', event => {
      if (event.target.matches('[data-action="note"]')) {
        clearTimeout(noteTimer); const id=event.target.dataset.id,value=event.target.value;
        noteTimer=setTimeout(()=>saveItem(id,{note:value}).catch(showError),500);
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
