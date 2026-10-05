/**
 * @file Type-level tripwires for the event contract (work document #11):
 * every `@ts-expect-error` guards an error `npm run types` must catch — a
 * passing check proves each error case was actually enforced, per the
 * verification methodology in work document #11 update #1. This module is
 * never imported at runtime; it exists to be type-checked.
 */

import { emit, on } from "./events.js";

const target = new EventTarget();

// Unknown event names are refused
// @ts-expect-error "nonexistent-event" is not in the map
emit(target, "nonexistent-event", {});

// Missing payload fields are refused
// @ts-expect-error identityHash is missing
emit(target, "sync-approve", {});

// Wrong payload field types are refused
// @ts-expect-error identityHash must be a string
emit(target, "sync-approve", { identityHash: 42 });

// Required details cannot be omitted
// @ts-expect-error the detail is required
emit(target, "sync-approve");

// Extra unknown payload fields are refused
// @ts-expect-error extra is not part of the payload
emit(target, "sync-approve", { identityHash: "a".repeat(32), extra: true });

// Listeners receive fully typed details
on(target, "nodes-moved", (event) => {
  const name = event.detail.nodes[0].name;
  // @ts-expect-error name is a string, not a number
  name.toFixed();
});

// Valid usage type-checks cleanly — no expect-error guards here
on(target, "nodes-moved", (event) => {
  console.log(event.detail.nodes[0].name, event.detail.nodes[0].position.x);
});
emit(target, "navigate-up-attempt", undefined);
emit(target, "sync-approve", { identityHash: "a".repeat(32) });
