import assert from "node:assert/strict";
import test from "node:test";

import { validationHtml } from "./ui.js";

test("sauvegarde un commentaire sans reconstruire la carte et perdre le focus", () => {
  const html = validationHtml();
  assert.match(html, /async function saveItem\(id, patch, rerender=true\)/u);
  assert.match(html, /saveItem\(id,\{note:value\},false\)/u);
  assert.match(html, /if \(rerender\) render\(\);/u);
  assert.match(html, /data-category="live">● Direct \+ à confirmer/u);
  assert.doesNotMatch(html, /data-category="uncertain">À confirmer/u);
  assert.match(html, /async function loadDate\(date=''\)/u);
  assert.match(html, /data-date=/u);
  assert.match(html, /timeRangeLabel\|\|b\.timeLabel/u);
  assert.match(html, /function diversifiedSelection\(items,limit\)/u);
  assert.match(html, /data-view="events">À la une/u);
  assert.match(html, /Diffusion française non retrouvée/u);
  assert.match(html, /function renderEventGroups\(items,report\)/u);
  assert.match(html, /data-aligned=/u);
  assert.match(html, /Détails et validation ponctuelle/u);
  assert.match(html, /id="refresh"/u);
  assert.match(html, /Filtres supplémentaires et validation/u);
  assert.match(html, /Exhaustivité et qualité des sources/u);
  assert.match(html, /async function refreshReports()/u);
});
