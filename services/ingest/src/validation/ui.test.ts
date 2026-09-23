import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";

import { validationHtml } from "./ui.js";
import { upcomingWindow } from './upcoming-window.js';

// Exécute les vraies fonctions du script livré au navigateur avec un DOM minimal.
function upcomingHarness(items: Record<string, unknown>[], overrides: Record<string, unknown> = {}) {
  const html = validationHtml();
  const script = html.slice(html.indexOf('    function renderWeekPreview('), html.indexOf('    function renderEventGroups('));
  const nodes: Record<string, { hidden: boolean; innerHTML: string; textContent: string }> = {};
  const context = {
    state: { availableDates: ['2026-09-18', '2026-09-19', '2026-09-20'], weekPreview: items },
    document: { getElementById: (id: string) => nodes[id] ??= { hidden: false, innerHTML: '', textContent: '' } },
    upcomingMode: true, upcomingAllSports: false, searchQuery: '', preferenceMode: 'preferences',
    expandedCompetitions: new Set(), collapsedSports: new Set(),
    matchesSport: (item: Record<string, unknown>) => item.sport !== 'hidden',
    matchesSearch: () => true,
    matchesChannelPreference: (b: Record<string, unknown>) => b.channel !== 'Excluded',
    canonicalSport: (sport: string) => sport,
    competitionPreferenceKey: (item: Record<string, unknown>) => item.sport+'|'+item.competition,
    ratingFor: () => 3, ratingKey: () => '', preferenceScore: () => 0,
    isFavorite: (item: Record<string, unknown>) => Boolean(item.favorite),
    firstItemStart: (item: Record<string, unknown>) => item.eventStartAtUtc || '',
    sportLabel: (sport: string) => sport,
    upcomingWindow,
    formatShortDate: (date: string) => date,
    eventDetailHtml: () => '<div class="event-detail"></div>',
    escapeHtml: (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    ...overrides
  };
  runInNewContext(script + '\nrenderWeekPreview({date:"2026-09-18",timeZone:"Europe/Paris"},true);', context);
  return { markup: nodes['week-preview-items']!.innerHTML, count: nodes['week-preview-context']!.textContent };
}

function upcomingItem(id: string, extra: Record<string, unknown> = {}) {
  return { id, title: id, date: '2026-09-20', sport: 'football', competition: 'Ligue 1', score: 90,
    eventImportance: 'A', eventStartAtUtc: '2026-09-20T13:00:00Z', broadcasts: [], ...extra };
}

test('fenêtre à venir : vendredi/dimanche, samedi/lundi, dimanche/semaine suivante', () => {
  for(const [base,from,through,label] of [
    ['2026-09-18','2026-09-20','2026-09-20','Après-demain'],
    ['2026-09-19','2026-09-21','2026-09-21','Après-demain'],
    ['2026-09-20','2026-09-22','2026-09-27','À venir'],
    ['2026-09-21','2026-09-23','2026-09-27','À venir'],
    ['2026-10-24','2026-10-26','2026-10-26','Après-demain'],
    ['2026-10-25','2026-10-27','2026-11-01','À venir'],
    ['2027-01-01','2027-01-03','2027-01-03','Après-demain']
  ]) {
    const window=upcomingWindow(base!);
    assert.equal(window.from,from);assert.equal(window.through,through);assert.equal(window.label,label);
  }
  // Exécute aussi la fonction réellement injectée, pas seulement son import TS.
  const declaration=validationHtml().match(/const upcomingWindow = ([\s\S]*?);\n    const verdicts/)?.[1];
  assert.ok(declaration);
  assert.equal(runInNewContext('('+declaration+')("2026-09-19").through'), '2026-09-21');
});

test('la fenêtre exclut Demain même si son rapport est absent et ne dépend pas de l’onglet consulté', () => {
  const items=[upcomingItem('Samedi',{date:'2026-09-19'}),upcomingItem('Dimanche'),upcomingItem('Lundi',{date:'2026-09-21'})];
  const result=upcomingHarness(items,{state:{baseDate:'2026-09-18',availableDates:['2026-09-18'],weekPreview:items}});
  assert.match(result.markup,/Dimanche/);
  assert.doesNotMatch(result.markup,/Samedi|Lundi/);
  const saturday=upcomingHarness(items,{state:{baseDate:'2026-09-19',availableDates:['2026-09-20'],weekPreview:items}});
  assert.match(saturday.markup,/Lundi/);
  assert.doesNotMatch(saturday.markup,/Samedi|Dimanche/);
});

test('aperçu : course prioritaire, regroupement par sport, aucun replay ou bouquet exclu', () => {
  const result = upcomingHarness([
    upcomingItem('Qualifications', { sport: 'f1', competition: 'GP Espagne', eventStage: 'Qualifications', score: 110 }),
    upcomingItem('Course', { sport: 'f1', competition: 'GP Espagne', eventStage: 'Course' }),
    upcomingItem('Masqué', { broadcasts: [{ channel: 'Excluded', liveStatus: 'confirmed' }] }),
    upcomingItem('Rediffusion', { broadcasts: [{ channel: 'Canal+', liveStatus: 'delayed' }] }),
    upcomingItem('Annulé', { eventStatus: 'CANC' }),
    upcomingItem('Demain', { date: '2026-09-19' }),
    upcomingItem('Match du dimanche')
  ]);
  assert.match(result.markup, /data-sport-group="f1"/);
  assert.match(result.markup, /data-sport-group="football"/);
  assert.match(result.markup, /Course/);
  assert.doesNotMatch(result.markup, /Qualifications|Masqué|Rediffusion|Annulé|Demain/);
  assert.match(result.markup, /Diffusion non renseignée/);
  assert.equal(result.count, '2 événements');
});

test('aperçu : sélection favorite, ordre horaire et révélation par compétition', () => {
  const items = [
    upcomingItem('Ordinaire', { score: 100 }),
    upcomingItem('Favori tardif', { favorite: true, eventStartAtUtc: '2026-09-20T19:00:00Z', score: 50 }),
    upcomingItem('Affiche matinale', { score: 120, eventStartAtUtc: '2026-09-20T10:00:00Z' })
  ];
  const result = upcomingHarness(items);
  assert.doesNotMatch(result.markup, /Ordinaire/);
  assert.ok(result.markup.indexOf('Affiche matinale') < result.markup.indexOf('Favori tardif'));
  assert.match(result.markup, /\+1 · Voir les 3/);
  const expanded = upcomingHarness(items, { expandedCompetitions: new Set(['upcoming|football|Ligue 1']) });
  assert.match(expanded.markup, /Ordinaire/);
  assert.equal(expanded.count, '3 événements');
});

test('aperçu : plusieurs jours de tennis conservés et diffusion par droits explicite', () => {
  const items = [
    upcomingItem('WTA', { date: '2026-09-19', sport: 'tennis', eventTimeLabel: 'Horaire non publié', eventStartAtUtc: '',
      broadcasts: [{ channel: 'Eurosport', provenance: 'rights' }], eventRoundLabel: 'Finale' }),
    upcomingItem('ATP', { sport: 'tennis', eventTimeConfidence: 'estimated' })
  ];
  const result = upcomingHarness(items, { state: { availableDates: ['2026-09-17', '2026-09-18'], weekPreview: items } });
  assert.match(result.markup, /Horaire non publié/);
  assert.match(result.markup, /droits de diffusion/);
  assert.match(result.markup, /Finale/);
  assert.match(result.markup, /\(estimé\)/);
  assert.equal(result.count, '2 événements');
});

test('le script navigateur complet reste syntaxiquement valide', () => {
  const script = validationHtml().match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
});

function detailHarness(extra: Record<string, unknown> = {}) {
  const html = validationHtml();
  const script = html.slice(html.indexOf('    function detailTime('), html.indexOf('    function formatEventTime('));
  const context = {
    state: { report: { date: '2026-09-18' } },
    item: { ...upcomingItem('finale'), description: '<img onerror=alert(1)>', eventStartAtUtc: '2026-09-18T18:00:00Z',
      selectionReasons: ['Compétition suivie'], eventSource: 'api-football', ...extra },
    report: { date: '2026-09-18', timeZone: 'Europe/Paris', source: 'xmltvfr', generatedAt: '2026-09-18T15:00:00Z' },
    escapeHtml: (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    broadcastTrustLabel: () => 'Diffusion à vérifier',
    favoriteButton: () => '<button>Favori</button>',
    competitionPreferenceKey: () => 'football|Ligue 1',
    validationFor: () => ({ note: 'Mon retour', verdict: 'wrong_time' }),
    verdicts: [['wrong_time', 'Horaire']],
    result: ''
  };
  runInNewContext(script+'\nresult=eventDetailHtml(item,report);', context);
  return context.result;
}

test('détail : horaires sportifs et TV distincts, diagnostic et signalement repliés', () => {
  const markup = detailHarness({ broadcasts: [{ channel: 'Canal+', startAtUtc: '2026-09-18T17:45:00Z', stopAtUtc: '2026-09-18T20:00:00Z', liveEvidence: 'EPG', provenance: 'xmltv' }] });
  assert.doesNotMatch(markup, /Début sportif|Fin sportive|Tour \/ session|<dt>|À propos de cet événement/);
  assert.match(markup, /class=.detail-actions./);
  assert.match(markup, /19:45 – 22:00/);
  assert.match(markup, /&lt;img/);
  assert.doesNotMatch(markup, /<img/);
  assert.match(markup, /<details class="detail-secondary"><summary title="Sources et diagnostic">Sources/);
  assert.match(markup, /<details class="detail-secondary event-feedback"><summary title="Signaler un problème">/);
  assert.match(markup, /Mon retour/);
  assert.match(markup, /data-date="2026-09-20"/);
  assert.doesNotMatch(markup, /data-rating-key|Priorité A/);
});

test('détail : droits seuls sans horaire TV fabriqué, programmation complète et changement de jour', () => {
  const markup = detailHarness({
    broadcasts: [{ channel: 'Eurosport', provenance: 'rights', startAtUtc: '2026-09-18T17:45:00Z' }],
    eventSchedule: [{ startAtUtc: '2026-09-19T01:00:00Z', participants: ['Aryna Sabalenka', 'Taylor Townsend'], roundLabel: 'Finale' }]
  });
  assert.match(markup, /Créneau TV non confirmé/);
  assert.doesNotMatch(markup, /17:45|19:45/);
  assert.match(markup, /19\/09.*03:00/);
  assert.match(markup, /Aryna Sabalenka \/ Taylor Townsend/);
});

test('vue initiale : la journée remplace une fenêtre de trois heures vide si un événement arrive plus tard', () => {
  const html = validationHtml();
  const script = html.slice(html.indexOf('    function shouldShowWholeDay('), html.indexOf('    function todayInTimeZone('));
  const now = Date.now();
  const report = { viewMode: 'event-first', windowEndUtc: new Date(now + 18 * 3_600_000).toISOString(),
    items: [{ id: 'later', broadcasts: [{ channel: 'Canal+' }], eventStartAtUtc: new Date(now + 8 * 3_600_000).toISOString() }] };
  const context = { activePeriod: 'now', report, filterEventBroadcasts: (item: unknown) => item, filterPreferredBroadcasts: (item: unknown) => item,
    matchesEventCategory: () => true, matchesSport: () => true, matchesSearch: () => true,
    matchesEventPeriod: () => false, firstItemStart: (item: { eventStartAtUtc: string }) => item.eventStartAtUtc };
  assert.equal(runInNewContext(script + '\nshouldShowWholeDay(report)', context), true);
  assert.equal(runInNewContext(script + '\nshouldShowWholeDay(report)', { ...context, matchesEventPeriod: () => true }), false);
  assert.equal(runInNewContext(script + '\nshouldShowWholeDay(report)', { ...context, report: { ...report, items: [] } }), false);
});

test('signalement : date capturée, sauvegarde sans reconstruction et reprise après erreur', async () => {
  const html = validationHtml();
  const script = html.slice(html.indexOf('    function feedbackStatus('), html.indexOf("    document.addEventListener('toggle'"));
  const status = { dataset: { feedbackStatus: 'future', date: '2026-09-20' }, textContent: '' };
  const requests: Record<string, unknown>[] = [];
  let fail = true;
  const context = {
    state: { report: { date: '2026-09-18' }, validation: { items: {} }, weekPreview: [{ id: 'future', date: '2026-09-20', validation: undefined as unknown }] },
    feedbackQueue: Promise.resolve(),
    document: { querySelectorAll: (selector: string) => selector === '[data-feedback-status]' ? [status] : [] },
    setSaving: () => {}, setSaved: () => {},
    render: () => { throw new Error('Ne pas reconstruire la ligne pendant la saisie'); },
    fetch: async (_url: string, options: { body: string }) => {
      requests.push(JSON.parse(options.body));
      return { ok: !fail, text: async () => 'indisponible', json: async () => ({ items: { future: { note: 'corriger', verdict: 'pending' } } }) };
    }
  };
  runInNewContext(script, context);
  await assert.rejects(runInNewContext('saveItem("future",{note:"corriger"},false,"2026-09-20")', context));
  assert.match(status.textContent, /Échec/);
  fail = false;
  await runInNewContext('saveItem("future",{note:"corriger"},false,"2026-09-20")', context);
  assert.equal(requests[1]?.date, '2026-09-20');
  assert.equal(requests[1]?.verdict, undefined);
  assert.deepEqual(context.state.validation.items, {});
  assert.equal((context.state.weekPreview[0]?.validation as { note: string }).note, 'corriger');
  assert.match(status.textContent, /Retour enregistré/);
});

test('aperçu : sports secondaires révélés sans développer tous leurs événements', () => {
  const items = ['football', 'tennis', 'golf', 'rugby', 'basket'].flatMap(sport =>
    [1,2,3].map(n => upcomingItem(sport+n, { sport, competition: sport })));
  const compact = upcomingHarness(items);
  assert.match(compact.markup, /\+1 autres sports/);
  assert.equal(compact.count, '8 événements');
  assert.equal(upcomingHarness(items, { upcomingAllSports: true }).count, '10 événements');
});

test('aperçu : état vide expliqué, compteur effacé et titres échappés', () => {
  assert.match(upcomingHarness([]).markup, /Pas encore de programmation/);
  const filtered = upcomingHarness([upcomingItem('exclu', { sport: 'hidden' })]);
  assert.match(filtered.markup, /préférences ou cette recherche/);
  assert.equal(filtered.count, '');
  assert.match(upcomingHarness([upcomingItem('<script>')]).markup, /&lt;script>/);
});

test("sauvegarde un commentaire sans reconstruire la carte et perdre le focus", () => {
  const html = validationHtml();
  assert.match(html, /async function saveItem\(id, patch, rerender=true, date=state.report.date\)/u);
  assert.match(html, /saveItem\(id,\{note:value\},false,date\)/u);
  assert.doesNotMatch(html.slice(html.indexOf('async function saveItem'),html.indexOf("document.addEventListener('toggle'")), /render\(\)/u);
  assert.match(html, /data-category="live">● Direct/u);
  assert.doesNotMatch(html, /data-category="uncertain">À confirmer/u);
  assert.match(html, /async function loadDate\(date=''\)/u);
  assert.match(html, /data-date=/u);
  assert.match(html, /timeRangeLabel\|\|b\.timeLabel/u);
  assert.match(html, /function diversifiedSelection\(items,limit\)/u);
  assert.match(html, /data-view="events">À voir/u);
  assert.match(html, /Diffuseur non identifié/u);
  assert.match(html, /function renderEventGroups\(items,report\)/u);
  assert.match(html, /function renderEventSelection\(items,report\)/u);
  assert.match(html, /details class="sport-group" data-sport-group=/u);
  assert.match(html, /summary class="sport-heading"/u);
  assert.match(html, /class="summary-footer" id="summary"/u);
  assert.match(html, /details class="exhaustivity-details"/u);
  assert.doesNotMatch(html, /details class="exhaustivity-details" open/u);
  assert.match(html, /\.event-line > \.broadcasts/u);
  assert.match(html, /\.secondary-details > summary::before/u);
  assert.match(html, /const detailsLabel=eventFirst/u);
  assert.match(html, /function channelTone\(values\)/u);
  assert.match(html, /<h3>Diffusions<\/h3>/u);
  assert.match(html, /event-schedule/u);
  assert.match(html, /map\(abbreviateFirstName\)/u);
  assert.match(html, /function abbreviateFirstName\(value\)/u);
  assert.match(html, /eventRoundLabel/u);
  assert.match(html, /entry\.roundLabel/u);
  assert.match(html, /split\(\/\\s\+\/\)/u);
  assert.doesNotMatch(html, /split\(\/s\+\/\)/u);
  assert.match(html, /dayOffset===0\?time:'J'/u);
  assert.match(html, /Détails de l’événement/u);
  assert.doesNotMatch(html, /id="refresh"/u);
  assert.match(html, /data-period="now">Maintenant/u);
  assert.match(html, /data-period="evening">Ce soir/u);
  assert.match(html, /id="site-search"/u);
  assert.match(html, /data-upcoming>À venir/u);
  assert.match(html, /function matchesSearch\(item\)/u);
  assert.match(html, /data-expand-competition/u);
  assert.match(html, /function sportContext\(items,report\)/u);
  assert.match(html, /class="live-state"/u);
  assert.match(html, /Personnaliser et diagnostiquer/u);
  assert.match(html, /Qualité des données et signaler un manque/u);
  assert.match(html, /Couverture EPG des chaînes prioritaires/u);
  assert.match(html, /function renderCoverage\(\)/u);
  assert.doesNotMatch(html, /async function refreshReports()/u);
  assert.match(html, /async function checkForUpdatedReport\(\)/u);
  assert.match(html, /300_000/u);
  assert.match(html, /Mes sports et mes bouquets/u);
  assert.match(html, /sporttoday-preferences-v2/u);
  assert.match(html, /version:2, excludedSports:\[\], excludedCompetitions:\[\], packages:\[\]/u);
  assert.doesNotMatch(html, /keepUnmatched/u);
  assert.match(html, /data-preference-mode="preferences">Ma sélection/u);
  assert.match(html, /data-preference-mode="all">Tout voir/u);
  assert.match(html, /function allPreferenceOptions\(\)/u);
  assert.match(html, /function canonicalSport\(value\)/u);
  assert.match(html, /Suivre ou masquer/u);
  assert.match(html, /for\(const sport of preferences\.excludedSports\) sports\.add\(sport\)/u);
  assert.match(html, /function matchesChannelPreference\(broadcast\)/u);
  assert.match(html, /function filterPreferredBroadcasts\(item\)/u);
  assert.match(html, /item\.broadcasts\.length===0\) return null/u);
  assert.doesNotMatch(html, /data-preference-unmatched/u);
  assert.match(html, /Les événements sans diffuseur restent disponibles dans l.exhaustivité/u);
  assert.match(html, /matchesBroadcast\(item,broadcast,report\)&&matchesChannelPreference\(broadcast\)/u);
  assert.match(html, /Ces choix restent sur cet appareil/u);
  assert.match(html, /function packageForName\(value\)/u);
  assert.match(html, /function isFrenchBroadcast\(broadcast\)/u);
  assert.match(html, /function highlightSelection\(items\)/u);
  assert.match(html, /function broadcastTrustLabel\(values\)/u);
  assert.match(html, /Sélection générée à/u);
  assert.match(html, /hoursUntilStart/u);
  assert.match(html, /class="card .*finished/u);
  assert.match(html, /À venir jusqu’à dimanche/u);
  assert.match(html, /function renderWeekPreview\(report,eventFirst\)/u);
  assert.match(html, /data-rating-key/u);
  assert.match(html, /data-hide-competition/u);
  assert.match(html, /id="debug-note"/u);
  assert.match(html, /\/api\/debug-note/u);
  assert.match(html, /\/feedback\.json/u);
});
