import assert from "node:assert/strict";
import test from "node:test";

import { validationHtml } from "./ui.js";

test("sauvegarde un commentaire sans reconstruire la carte et perdre le focus", () => {
  const html = validationHtml();
  assert.match(html, /async function saveItem\(id, patch, rerender=true\)/u);
  assert.match(html, /saveItem\(id,\{note:value\},false\)/u);
  assert.match(html, /if \(rerender\) render\(\);/u);
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
  assert.match(html, /details class="sport-group" open/u);
  assert.match(html, /summary class="sport-heading"/u);
  assert.match(html, /class="summary-footer" id="summary"/u);
  assert.match(html, /details class="exhaustivity-details"/u);
  assert.doesNotMatch(html, /details class="exhaustivity-details" open/u);
  assert.match(html, /\.event-line > \.broadcasts/u);
  assert.match(html, /\.secondary-details > summary::before/u);
  assert.match(html, /const detailsLabel=eventFirst/u);
  assert.match(html, /data-aligned=/u);
  assert.match(html, /Détails et validation ponctuelle/u);
  assert.doesNotMatch(html, /id="refresh"/u);
  assert.match(html, /Filtres supplémentaires et validation/u);
  assert.match(html, /Exhaustivité et qualité des sources/u);
  assert.match(html, /Couverture EPG des chaînes prioritaires/u);
  assert.match(html, /function renderCoverage\(\)/u);
  assert.doesNotMatch(html, /async function refreshReports()/u);
  assert.match(html, /async function checkForUpdatedReport\(\)/u);
  assert.match(html, /300_000/u);
});
