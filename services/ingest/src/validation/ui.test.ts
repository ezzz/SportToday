import assert from "node:assert/strict";
import test from "node:test";

import { validationHtml } from "./ui.js";

test("sauvegarde un commentaire sans reconstruire la carte et perdre le focus", () => {
  const html = validationHtml();
  assert.match(html, /async function saveItem\(id, patch, rerender=true\)/u);
  assert.match(html, /saveItem\(id,\{note:value\},false\)/u);
  assert.match(html, /if \(rerender\) render\(\);/u);
  assert.match(html, /data-category="uncertain">À confirmer/u);
  assert.match(html, /timeRangeLabel\|\|b\.timeLabel/u);
  assert.match(html, /function diversifiedSelection\(items,limit\)/u);
});
