/**
 * @file Chat pipeline (work document #53 extraction 3): the verify stage.
 * Cryptographic proof that the sender holds the sender identity's private
 * key — the transport verifies on the direct path, but propagation-synced
 * messages whose sender is not yet recalled arrive unverified and are
 * dropped (a re-sync after the announce lands re-delivers them).
 */

import { Component } from "../../../vendor/assembly.js";

/**
 * The chat pipeline's verify capability as an assembly component. The
 * process is strictly sequential: inbound messages must run in arrival
 * order (the chat surface's serialization guarantee), so the async
 * verification holds a per-component promise chain.
 */
export class Verify extends Component {
  constructor() {
    super({
      description: "Verifies the sender's signature over the link",
      icon: "fingerprint",
      inPorts: {
        parsed: { datatype: "object" },
        verifysender: { datatype: "object", control: true },
        senderidentityhash: { datatype: "object", control: true },
      },
      outPorts: {
        verified: { datatype: "object" },
        dropped: { datatype: "object" },
      },
    });
    /** @type {Promise<void>} */
    this.chain = Promise.resolve();
  }

  /**
   * @param {any} input
   * @param {any} output
   */
  processMessage(input, output) {
    if (!input.hasData("verifysender")) return;
    if (!input.has("parsed")) return;

    const parsed = input.getData("parsed");
    const verifySender = input.getData("verifysender");
    const senderIdentityHash = input.getData("senderidentityhash");
    // Strict arrival order: chain the async verification so message N+1's
    // verdict never lands before message N's (work document #44's
    // serialization guarantee, as a component's explicit behavior)
    this.chain = this.chain
      .then(async () => {
        const proof = await verifySender(parsed.raw);
        if (proof !== "verified") {
          output.send({
            dropped: { parsed, reason: `${proof} signature` },
          });
          return;
        }
        // The claimant's identity hash rides the verified envelope: the
        // gate's claim path persists it as the owner identity
        const identityHash = senderIdentityHash
          ? await senderIdentityHash(parsed.raw)
          : null;
        output.send({ verified: { ...parsed, identityHash } });
      })
      .catch(() => {
        output.send({
          dropped: { parsed, reason: "verification failed" },
        });
      });
    output.done();
  }
}

/**
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  return new Verify();
}
