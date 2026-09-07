// Vitest setup: polyfills IndexedDB for localProvider.test.ts (jsdom does not
// implement IndexedDB), and stubs crypto.randomUUID if the environment lacks it.
import "fake-indexeddb/auto";

if (!("randomUUID" in crypto)) {
  // @ts-expect-error — minimal polyfill for older Node test environments
  crypto.randomUUID = () => Math.random().toString(36).slice(2);
}
