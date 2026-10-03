import assert from "node:assert/strict";
import { describe, it } from "node:test";

import "./utils/register.js";

import { FlowMeshSettings } from "../../src/elements/noflo-mesh-settings.js";

customElements.define("noflo-mesh-settings", FlowMeshSettings);

// Jedison cannot render in happy-dom; the settings element only mounts a
// noflo-json-form and listens for its form-change events, so a stub that
// reports the assigned data as valid covers the wiring
if (!customElements.get("noflo-json-form")) {
  customElements.define(
    "noflo-json-form",
    class extends HTMLElement {
      set schema(value) {
        this._schema = value;
      }
      get schema() {
        return this._schema;
      }
      set data(value) {
        this._data = value;
        this.dispatchEvent(
          new CustomEvent("form-change", {
            detail: { data: value ?? {}, isValid: true, errors: [] },
            bubbles: true,
            composed: true,
          }),
        );
      }
    },
  );
}

const websocketSchema = {
  type: "object",
  properties: {
    url: { type: "string", title: "URL" },
    name: { type: "string", title: "Name" },
  },
};

/**
 * @returns {FlowMeshSettings}
 */
function makeElement() {
  const el = /** @type {FlowMeshSettings} */ (
    document.createElement("noflo-mesh-settings")
  );
  document.body.appendChild(el);
  return el;
}

describe("FlowMeshSettings (work document #21)", () => {
  it("renders config, identity hash, and grants", () => {
    const el = makeElement();
    el.open(
      {
        enabled: true,
        room: "noflo-ui",
        identity: "abc",
        interfaces: [
          {
            id: "i1",
            type: "websocket",
            options: { url: "wss://rns.example" },
            enabled: true,
          },
        ],
      },
      "abcd1234abcd1234",
      { websocket: websocketSchema },
    );
    el.setDacarState({
      anchor: { hash: "b".repeat(32), owner: true },
      grants: [
        {
          id: "grant-1",
          peerHash: "deadbeef",
          role: "operator",
          issued: 1,
          revoked: null,
          status: "verified",
        },
        {
          id: "grant-2",
          peerHash: "c0ffee",
          role: "observer",
          issued: 1,
          revoked: 5,
          status: "revoked",
        },
      ],
      wallet: [],
    });

    assert.ok(!el.hasAttribute("hidden"), "open() reveals the dialog");
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(shadow.querySelector("#identity-hash"), "identity hash shown");
    assert.match(
      /** @type {HTMLElement} */ (shadow.querySelector("#identity-hash"))
        .textContent ?? "",
      /abcd1234/,
    );
    assert.equal(
      shadow.querySelector("#interface-list")?.children.length,
      1,
      "interface row listed",
    );
    assert.match(
      /** @type {HTMLElement} */ (shadow.querySelector("#interface-list"))
        .textContent ?? "",
      /wss:\/\/rns\.example/,
    );
    assert.equal(
      shadow.querySelector("#grant-list")?.children.length,
      2,
      "both grants listed",
    );
    // Verification badges reflect the Engine's Dacar verdicts
    assert.match(
      /** @type {HTMLElement} */ (shadow.querySelector("#grant-list"))
        .textContent ?? "",
      /verified/,
    );
    assert.match(
      /** @type {HTMLElement} */ (shadow.querySelector("#grant-list"))
        .textContent ?? "",
      /revoked/,
    );
    // Only the non-revoked grant offers Revoke
    assert.equal(shadow.querySelectorAll("[data-grant-revoke]").length, 1);
    // The anchor panel shows ownership
    assert.match(
      /** @type {HTMLElement} */ (shadow.querySelector("#trust-anchor-role"))
        .textContent ?? "",
      /holds the project's Trust Anchor private key/,
    );
    el.close();
    assert.ok(el.hasAttribute("hidden"), "close() hides the dialog again");
    el.remove();
  });

  it("copies the invite and emits mesh-join", () => {
    const el = makeElement();
    /** @type {any[]} */
    const joins = [];
    el.addEventListener("mesh-join", (e) =>
      joins.push(/** @type {any} */ (e).detail),
    );
    el.open({ enabled: false, identity: "", interfaces: [], webrtc: {} }, "", {
      websocket: websocketSchema,
    });
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    // Without a generated invite, the section offers generation
    const generate = shadow.querySelector('[data-action="create-invite"]');
    assert.ok(generate, "invite generation offered");
    const input = /** @type {HTMLInputElement} */ (
      shadow.querySelector("#join-room")
    );
    input.value =
      "noflo://join/a1b2c3d4e5f60718293a4b5c6d7e8f90/11223344556677889900aabbccddeeff";
    /** @type {HTMLElement} */ (
      shadow.querySelector('[data-action="join"]')
    ).click();
    assert.deepEqual(joins, [
      {
        invite:
          "noflo://join/a1b2c3d4e5f60718293a4b5c6d7e8f90/11223344556677889900aabbccddeeff",
      },
    ]);
    assert.equal(input.value, "", "input cleared after join");
    el.remove();
  });

  it("shows a generated invite URI with a copy button", () => {
    const el = makeElement();
    el.open({ enabled: false, identity: "", interfaces: [], webrtc: {} }, "", {
      websocket: websocketSchema,
    });
    const uri =
      "noflo://join/a1b2c3d4e5f60718293a4b5c6d7e8f90/11223344556677889900aabbccddeeff";
    el.setInvite(uri);
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const chip = /** @type {HTMLElement} */ (
      shadow.querySelector("#mesh-invite")
    );
    assert.match(chip.textContent ?? "", /noflo:\/\/join\//);
    assert.ok(
      shadow.querySelector('[data-action="copy-invite"]'),
      "copy button shown for the invite",
    );
    assert.ok(
      !shadow.querySelector('[data-action="create-invite"]'),
      "generation replaced by the generated URI",
    );
    el.remove();
  });

  it("emits mesh-configure when toggling enabled", () => {
    const el = makeElement();
    /** @type {any[]} */
    const events = [];
    el.addEventListener("mesh-configure", (e) =>
      events.push(/** @type {any} */ (e).detail),
    );
    el.open({ enabled: false, room: "old", identity: "", interfaces: [] }, "", {
      websocket: websocketSchema,
    });
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const enabled = /** @type {HTMLInputElement} */ (
      shadow.querySelector("#mesh-enabled")
    );
    enabled.checked = true;
    enabled.dispatchEvent(new Event("change"));
    assert.equal(events.length, 1);
    assert.equal(events[0].config.enabled, true);

    el.remove();
  });

  it("opens a schema-driven interface form and reports options", async () => {
    const el = makeElement();
    el.open({ enabled: true, room: "r", identity: "", interfaces: [] }, "", {
      websocket: websocketSchema,
    });
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    /** @type {HTMLElement} */ (
      shadow.querySelector('[data-action="add-interface"]')
    ).click();
    const form = shadow.querySelector("#interface-form-host noflo-json-form");
    assert.ok(form, "JSON Schema form mounted for the interface type");
    assert.deepEqual(
      /** @type {any} */ (form).schema.properties.url,
      { type: "string", title: "URL" },
      "the interface type's own schema drives the form",
    );
    // The stub reports the assigned data as valid
    /** @type {any} */ (form).data = { url: "wss://mesh.example" };
    await new Promise((resolve) => setTimeout(resolve, 20));

    /** @type {any[]} */
    const events = [];
    el.addEventListener("mesh-configure", (e) =>
      events.push(/** @type {any} */ (e).detail),
    );
    const save = /** @type {HTMLElement} */ (
      shadow.querySelector('[data-form-action="save"]')
    );
    save.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(events.length, 1, "configure emitted on save");
    assert.equal(
      events[0].config.interfaces[0].options.url,
      "wss://mesh.example",
    );
    el.remove();
  });

  it("emits grant and revoke intents", () => {
    const el = makeElement();
    /** @type {any[]} */
    const granted = [];
    /** @type {any[]} */
    const revoked = [];
    el.addEventListener("mesh-grant", (e) =>
      granted.push(/** @type {any} */ (e).detail),
    );
    el.addEventListener("mesh-revoke", (e) =>
      revoked.push(/** @type {any} */ (e).detail),
    );
    el.open(
      {
        enabled: false,
        room: "r",
        identity: "",
        interfaces: [],
      },
      "",
      { websocket: websocketSchema },
    );
    el.setDacarState({
      anchor: { hash: "b".repeat(32), owner: true },
      grants: [
        {
          id: "grant-9",
          peerHash: "p",
          role: "observer",
          issued: 1,
          revoked: null,
          status: "verified",
        },
      ],
      wallet: [],
    });
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const peer = /** @type {HTMLInputElement} */ (
      shadow.querySelector("#new-grant-peer")
    );
    peer.value = "abc123hash";
    /** @type {HTMLElement} */ (
      shadow.querySelector('[data-action="add-grant"]')
    ).click();
    assert.deepEqual(granted, [{ peerHash: "abc123hash", role: "observer" }]);
    /** @type {HTMLElement} */ (
      shadow.querySelector('[data-grant-revoke="grant-9"]')
    ).click();
    assert.deepEqual(revoked, [{ id: "grant-9" }]);
    el.remove();
  });
});

describe("mesh error display (work document #21)", () => {
  it("shows the mesh error banner and disables sync when identity generation is impossible", () => {
    const el = makeElement();
    el.open(
      { enabled: true, identity: "", interfaces: [], webrtc: {} },
      "",
      { websocket: websocketSchema },
      [],
      "Identity generation failed: The operation is not supported.",
    );
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    const banner = /** @type {HTMLElement} */ (
      shadow.querySelector("#mesh-error")
    );
    assert.match(banner.textContent ?? "", /not supported/, "error surfaced");
    const enabled = /** @type {HTMLInputElement} */ (
      shadow.querySelector("#mesh-enabled")
    );
    assert.ok(enabled.disabled, "sync toggle disabled: mesh cannot run");
    el.remove();
  });

  it("renders no banner when the mesh is healthy", () => {
    const el = makeElement();
    el.open({ enabled: false, identity: "", interfaces: [], webrtc: {} }, "", {
      websocket: websocketSchema,
    });
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(!shadow.querySelector("#mesh-error"));
    assert.ok(
      !(
        /** @type {HTMLInputElement} */ (shadow.querySelector("#mesh-enabled"))
          .disabled
      ),
    );
    el.remove();
  });

  it("renders live sync status once the engine reports connectivity", () => {
    const el = makeElement();
    el.open(
      { enabled: true, identity: "", interfaces: [], webrtc: {} },
      "a".repeat(32),
    );
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(!shadow.querySelector("#mesh-sync-status"), "no status yet");
    el.setSyncStatus({ connected: true, synced: false, peers: 2 });
    const line = /** @type {HTMLElement} */ (
      shadow.querySelector("#mesh-sync-status")
    );
    assert.match(line.textContent ?? "", /connected, 2 peers/);
    el.remove();
  });

  it("renders join progress stages and decline reasons in plain language", () => {
    const el = makeElement();
    el.open(
      { enabled: true, identity: "", interfaces: [], webrtc: {} },
      "a".repeat(32),
    );
    const shadow = /** @type {ShadowRoot} */ (el.shadowRoot);
    assert.ok(!shadow.querySelector("#join-progress"), "no progress yet");
    el.setJoinProgress({ stage: "wait_response" });
    assert.match(
      /** @type {HTMLElement} */ (shadow.querySelector("#join-progress"))
        .textContent ?? "",
      /Waiting for the host/,
    );
    el.setJoinProgress({ stage: "declined", reason: "host_lacks_authority" });
    assert.match(
      /** @type {HTMLElement} */ (shadow.querySelector("#join-progress"))
        .textContent ?? "",
      /cannot grant access/,
    );
    el.setJoinProgress({ stage: "approved", project: { name: "Telemetry" } });
    const approved = /** @type {HTMLElement} */ (
      shadow.querySelector("#join-progress")
    );
    assert.match(approved.textContent ?? "", /Telemetry/);
    assert.ok(
      approved.classList.contains("success"),
      "approved reads as success",
    );
    el.remove();
  });
});
