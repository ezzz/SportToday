import assert from "node:assert/strict";
import test from "node:test";

import { HttpDataSource } from "./data-source.js";

test("borne le téléchargement HTTP XMLTV avec un signal d'expiration", async () => {
  const originalFetch = globalThis.fetch;
  let receivedSignal: AbortSignal | undefined;
  globalThis.fetch = async (_input, init) => {
    receivedSignal = init?.signal as AbortSignal | undefined;
    return new Response("<tv />", { headers: { "content-type": "application/xml" } });
  };
  try {
    const snapshot = await new TestSource().fetch();
    assert.ok(receivedSignal);
    assert.equal(snapshot.body.toString("utf8"), "<tv />");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

class TestSource extends HttpDataSource {
  readonly id = "xmltvfr" as const;
  protected readonly url = "https://example.test/programme.xml";
}
