import assert from "node:assert/strict";
import test from "node:test";

import { parseXmltv, sportSignals } from "./parser.js";

test("conserve le sous-titre et le marqueur XMLTV de rediffusion", () => {
  const parsed = parseXmltv(`<?xml version="1.0" encoding="UTF-8"?>
    <tv>
      <channel id="golf.fr"><display-name>Golf+</display-name></channel>
      <programme start="20260821072900 +0200" stop="20260821092800 +0200" channel="golf.fr">
        <title>Open de St. Louis</title>
        <sub-title>Open de St. Louis. 1er tour. Circuit américain.</sub-title>
        <category>Sport</category>
        <previously-shown/>
      </programme>
      <programme start="20260821210000 +0200" stop="20260822005900 +0200" channel="golf.fr">
        <title>Arsenal / Coventry City</title>
        <sub-title>Football. Premier League. 1re journée.</sub-title>
        <category>Sport</category>
      </programme>
    </tv>`, "xmltvfr");

  assert.equal(parsed.programmes[0]?.subTitle, "Open de St. Louis. 1er tour. Circuit américain.");
  assert.equal(parsed.programmes[0]?.isPreviouslyShown, true);
  assert.equal(parsed.programmes[1]?.isPreviouslyShown, false);
  assert.deepEqual(sportSignals(parsed.programmes[1]!), ["football"]);
});
