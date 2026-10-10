// node_modules/@noflo/assembly/src/index.js
import { Component as NoFloComponent } from "../noflo.js";
var validators = {
  def: (val) => val !== void 0,
  set: (val) => val !== void 0 && val !== null,
  ok: (val) => !!val,
  num: (val) => typeof val === "number",
  str: (val) => typeof val === "string",
  obj: (val) => typeof val === "object" && val !== null,
  func: (val) => typeof val === "function",
  ">0": (val) => val > 0
};
var errorMessages = {
  def: (key) => `${key} is undefined`,
  set: (key) => `${key} is not set`,
  ok: (key) => `${key} is false or empty`,
  num: (key, val) => `${key} is not a number: ${val}`,
  str: (key, val) => `${key} is not a string: ${val}`,
  obj: (key, val) => `${key} is not an object: ${val}`,
  func: (key, val) => `${key} is not a function: ${val}`,
  ">0": (key, val) => `${key} is not positive: ${val}`
};
function fail(msg, err) {
  if (!Array.isArray(msg.errors)) {
    throw new Error("Message.errors is not an array");
  }
  const errs = Array.isArray(err) ? err : [err];
  for (const e of errs) {
    msg.errors.push(e);
  }
  return msg;
}
function failed(msg) {
  return msg.errors && Array.isArray(msg.errors) && msg.errors.length > 0;
}
function normalizePorts(options, direction) {
  const key = `${direction}Ports`;
  const result = options;
  if (key in options) {
    if (Array.isArray(options[key])) {
      const tmp = {};
      const portsArray = (
        /** @type {Array<string>} */
        options[key]
      );
      portsArray.forEach((name) => {
        tmp[name] = { datatype: "all" };
      });
      result[key] = tmp;
    }
  } else {
    const dir = direction === "out" ? "Outgoing" : "Incoming";
    result[key] = {
      [direction]: {
        datatype: "object",
        description: `${dir} message`,
        required: true
      }
    };
  }
  return result;
}
function normalizeValidators(rules) {
  if (Array.isArray(rules)) {
    const res = {};
    rules.forEach((f) => {
      res[f] = "ok";
    });
    return res;
  }
  return rules;
}
var Component = class extends NoFloComponent {
  /**
   * Create the component. Port definitions may be given as arrays of names
   * (typed `all`), full NoFlo port definitions, or omitted for a single
   * default message port. Validation rules from `validates` apply to the
   * `relay` hook.
   *
   * @param {AssemblyComponentOptions} [options]
   */
  constructor(options = {}) {
    let opts = normalizePorts(options, "in");
    opts = normalizePorts(opts, "out");
    super(opts);
    if (options.validates) {
      this.validates = normalizeValidators(options.validates);
    }
    const relay = (
      /** @type {RelayFunction|undefined} */
      /** @type {unknown} */
      this.relay
    );
    if (typeof relay === "function") {
      const func = relay.bind(this);
      this.process((input, output) => {
        if (!input.hasData("in")) {
          return;
        }
        const msg = input.getData("in");
        if (!this.validate(msg)) {
          output.sendDone(msg);
          return;
        }
        func(msg, output);
      });
    }
    const processMessage = (
      /** @type {undefined | ((input: any, output: any) => any)} */
      /** @type {unknown} */
      this.processMessage
    );
    if (typeof processMessage === "function") {
      this.process(processMessage);
    }
  }
  /**
   * Check the fields of a message against validation rules, collecting an
   * Error for every violated rule. Paths may be dotted (`parent.field`).
   *
   * @param {AssemblyMessage} msg
   * @param {AssemblyValidators} rules
   * @returns {Array<Error>}
   */
  checkFields(msg, rules) {
    const errors = [];
    function checkField(obj, objPath, path, validator) {
      if (!obj || path.length <= 0) {
        return;
      }
      const key = (
        /** @type {string} */
        path.shift()
      );
      const v = path.length === 0 ? validator : "obj";
      if (!validators[v](obj[key])) {
        errors.push(new Error(errorMessages[v](`${objPath}.${key}`, obj[key])));
        return;
      }
      if (path.length > 0) {
        checkField(obj[key], `${objPath}.${key}`, path, validator);
      }
    }
    Object.keys(rules).forEach((f) => {
      const path = f.indexOf(".") > 0 ? f.split(".") : [f];
      let v = rules[f];
      if (!(v in validators)) {
        v = "ok";
      }
      checkField(msg, "msg", path, v);
    });
    return errors;
  }
  /**
   * Validate a message against the given rules (defaulting to the rules
   * given at construction). Violations are appended to the message's
   * `errors` array; a message that already carries errors fails without
   * re-validation.
   *
   * @param {AssemblyMessage} msg
   * @param {AssemblyValidators|Array<string>} [rules]
   */
  validate(msg, rules = this.validates) {
    if (failed(msg)) {
      return false;
    }
    if (rules && typeof rules === "object") {
      rules = normalizeValidators(rules);
      const errs = this.checkFields(msg, rules);
      if (errs.length > 0) {
        fail(msg, errs);
        return false;
      }
    }
    return true;
  }
};
function fork(msg, excludeKeys = [], cloneKeys = []) {
  const newMsg = {
    errors: cloneKeys.includes("error") ? msg.errors.slice(0) : msg.errors
  };
  Object.keys(msg).forEach((key) => {
    if (key === "errors") {
      return;
    }
    if (excludeKeys.includes(key)) {
      return;
    }
    if (cloneKeys.includes(key)) {
      newMsg[key] = JSON.parse(JSON.stringify(msg[key]));
    } else {
      newMsg[key] = msg[key];
    }
  });
  return newMsg;
}
function merge(base, extra) {
  const combined = base;
  const baseKeys = Object.keys(base);
  Object.keys(extra).forEach((key) => {
    if ((baseKeys.indexOf(key) === -1 || base[key] === void 0) && extra[key] !== void 0) {
      combined[key] = extra[key];
    }
  });
  return combined;
}
var src_default = Component;
export {
  Component,
  src_default as default,
  fail,
  failed,
  fork,
  merge
};
