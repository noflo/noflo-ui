var require = () => ({}); var fs = {};
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, { get: (a, b) => (typeof require !== "undefined" ? require : a)[b] }) : x)(function(x) {
	if (typeof require !== "undefined") return require.apply(this, arguments);
	throw Error("Calling `require` for \"" + x + "\" in an environment that doesn't expose the `require` function. See https://rolldown.rs/in-depth/bundling-cjs#require-external-modules for more details.");
});
//#endregion
//#region node_modules/eventemitter3/index.js
var require_eventemitter3 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var has = Object.prototype.hasOwnProperty, prefix = "~";
	/**
	* Constructor to create a storage for our `EE` objects.
	* An `Events` instance is a plain object whose properties are event names.
	*
	* @constructor
	* @private
	*/
	function Events() {}
	if (Object.create) {
		Events.prototype = Object.create(null);
		if (!new Events().__proto__) prefix = false;
	}
	/**
	* Representation of a single event listener.
	*
	* @param {Function} fn The listener function.
	* @param {*} context The context to invoke the listener with.
	* @param {Boolean} [once=false] Specify if the listener is a one-time listener.
	* @constructor
	* @private
	*/
	function EE(fn, context, once) {
		this.fn = fn;
		this.context = context;
		this.once = once || false;
	}
	/**
	* Add a listener for a given event.
	*
	* @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	* @param {(String|Symbol)} event The event name.
	* @param {Function} fn The listener function.
	* @param {*} context The context to invoke the listener with.
	* @param {Boolean} once Specify if the listener is a one-time listener.
	* @returns {EventEmitter}
	* @private
	*/
	function addListener(emitter, event, fn, context, once) {
		if (typeof fn !== "function") throw new TypeError("The listener must be a function");
		var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
		if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
		else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
		else emitter._events[evt] = [emitter._events[evt], listener];
		return emitter;
	}
	/**
	* Clear event by name.
	*
	* @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	* @param {(String|Symbol)} evt The Event name.
	* @private
	*/
	function clearEvent(emitter, evt) {
		if (--emitter._eventsCount === 0) emitter._events = new Events();
		else delete emitter._events[evt];
	}
	/**
	* Minimal `EventEmitter` interface that is molded against the Node.js
	* `EventEmitter` interface.
	*
	* @constructor
	* @public
	*/
	function EventEmitter() {
		this._events = new Events();
		this._eventsCount = 0;
	}
	/**
	* Return an array listing the events for which the emitter has registered
	* listeners.
	*
	* @returns {Array}
	* @public
	*/
	EventEmitter.prototype.eventNames = function eventNames() {
		var names = [], events, name;
		if (this._eventsCount === 0) return names;
		for (name in events = this._events) if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
		if (Object.getOwnPropertySymbols) return names.concat(Object.getOwnPropertySymbols(events));
		return names;
	};
	/**
	* Return the listeners registered for a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @returns {Array} The registered listeners.
	* @public
	*/
	EventEmitter.prototype.listeners = function listeners(event) {
		var evt = prefix ? prefix + event : event, handlers = this._events[evt];
		if (!handlers) return [];
		if (handlers.fn) return [handlers.fn];
		for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) ee[i] = handlers[i].fn;
		return ee;
	};
	/**
	* Return the number of listeners listening to a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @returns {Number} The number of listeners.
	* @public
	*/
	EventEmitter.prototype.listenerCount = function listenerCount(event) {
		var evt = prefix ? prefix + event : event, listeners = this._events[evt];
		if (!listeners) return 0;
		if (listeners.fn) return 1;
		return listeners.length;
	};
	/**
	* Calls each of the listeners registered for a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @returns {Boolean} `true` if the event had listeners, else `false`.
	* @public
	*/
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
		var evt = prefix ? prefix + event : event;
		if (!this._events[evt]) return false;
		var listeners = this._events[evt], len = arguments.length, args, i;
		if (listeners.fn) {
			if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
			switch (len) {
				case 1: return listeners.fn.call(listeners.context), true;
				case 2: return listeners.fn.call(listeners.context, a1), true;
				case 3: return listeners.fn.call(listeners.context, a1, a2), true;
				case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
				case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
				case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
			}
			for (i = 1, args = new Array(len - 1); i < len; i++) args[i - 1] = arguments[i];
			listeners.fn.apply(listeners.context, args);
		} else {
			var length = listeners.length, j;
			for (i = 0; i < length; i++) {
				if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
				switch (len) {
					case 1:
						listeners[i].fn.call(listeners[i].context);
						break;
					case 2:
						listeners[i].fn.call(listeners[i].context, a1);
						break;
					case 3:
						listeners[i].fn.call(listeners[i].context, a1, a2);
						break;
					case 4:
						listeners[i].fn.call(listeners[i].context, a1, a2, a3);
						break;
					default:
						if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) args[j - 1] = arguments[j];
						listeners[i].fn.apply(listeners[i].context, args);
				}
			}
		}
		return true;
	};
	/**
	* Add a listener for a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @param {Function} fn The listener function.
	* @param {*} [context=this] The context to invoke the listener with.
	* @returns {EventEmitter} `this`.
	* @public
	*/
	EventEmitter.prototype.on = function on(event, fn, context) {
		return addListener(this, event, fn, context, false);
	};
	/**
	* Add a one-time listener for a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @param {Function} fn The listener function.
	* @param {*} [context=this] The context to invoke the listener with.
	* @returns {EventEmitter} `this`.
	* @public
	*/
	EventEmitter.prototype.once = function once(event, fn, context) {
		return addListener(this, event, fn, context, true);
	};
	/**
	* Remove the listeners of a given event.
	*
	* @param {(String|Symbol)} event The event name.
	* @param {Function} fn Only remove the listeners that match this function.
	* @param {*} context Only remove the listeners that have this context.
	* @param {Boolean} once Only remove one-time listeners.
	* @returns {EventEmitter} `this`.
	* @public
	*/
	EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
		var evt = prefix ? prefix + event : event;
		if (!this._events[evt]) return this;
		if (!fn) {
			clearEvent(this, evt);
			return this;
		}
		var listeners = this._events[evt];
		if (listeners.fn) {
			if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) clearEvent(this, evt);
		} else {
			for (var i = 0, events = [], length = listeners.length; i < length; i++) if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) events.push(listeners[i]);
			if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
			else clearEvent(this, evt);
		}
		return this;
	};
	/**
	* Remove all listeners, or those of the specified event.
	*
	* @param {(String|Symbol)} [event] The event name.
	* @returns {EventEmitter} `this`.
	* @public
	*/
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
		var evt;
		if (event) {
			evt = prefix ? prefix + event : event;
			if (this._events[evt]) clearEvent(this, evt);
		} else {
			this._events = new Events();
			this._eventsCount = 0;
		}
		return this;
	};
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;
	EventEmitter.prefixed = prefix;
	EventEmitter.EventEmitter = EventEmitter;
	if ("undefined" !== typeof module) module.exports = EventEmitter;
}));
//#endregion
//#region node_modules/clone/clone.js
var require_clone = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var clone = (function() {
		"use strict";
		function _instanceof(obj, type) {
			return type != null && obj instanceof type;
		}
		var nativeMap;
		try {
			nativeMap = Map;
		} catch (_) {
			nativeMap = function() {};
		}
		var nativeSet;
		try {
			nativeSet = Set;
		} catch (_) {
			nativeSet = function() {};
		}
		var nativePromise;
		try {
			nativePromise = Promise;
		} catch (_) {
			nativePromise = function() {};
		}
		/**
		* Clones (copies) an Object using deep copying.
		*
		* This function supports circular references by default, but if you are certain
		* there are no circular references in your object, you can save some CPU time
		* by calling clone(obj, false).
		*
		* Caution: if `circular` is false and `parent` contains circular references,
		* your program may enter an infinite loop and crash.
		*
		* @param `parent` - the object to be cloned
		* @param `circular` - set to true if the object to be cloned may contain
		*    circular references. (optional - true by default)
		* @param `depth` - set to a number if the object is only to be cloned to
		*    a particular depth. (optional - defaults to Infinity)
		* @param `prototype` - sets the prototype to be used when cloning an object.
		*    (optional - defaults to parent prototype).
		* @param `includeNonEnumerable` - set to true if the non-enumerable properties
		*    should be cloned as well. Non-enumerable properties on the prototype
		*    chain will be ignored. (optional - false by default)
		*/
		function clone(parent, circular, depth, prototype, includeNonEnumerable) {
			if (typeof circular === "object") {
				depth = circular.depth;
				prototype = circular.prototype;
				includeNonEnumerable = circular.includeNonEnumerable;
				circular = circular.circular;
			}
			var allParents = [];
			var allChildren = [];
			var useBuffer = typeof Buffer != "undefined";
			if (typeof circular == "undefined") circular = true;
			if (typeof depth == "undefined") depth = Infinity;
			function _clone(parent, depth) {
				if (parent === null) return null;
				if (depth === 0) return parent;
				var child;
				var proto;
				if (typeof parent != "object") return parent;
				if (_instanceof(parent, nativeMap)) child = new nativeMap();
				else if (_instanceof(parent, nativeSet)) child = new nativeSet();
				else if (_instanceof(parent, nativePromise)) child = new nativePromise(function(resolve, reject) {
					parent.then(function(value) {
						resolve(_clone(value, depth - 1));
					}, function(err) {
						reject(_clone(err, depth - 1));
					});
				});
				else if (clone.__isArray(parent)) child = [];
				else if (clone.__isRegExp(parent)) {
					child = new RegExp(parent.source, __getRegExpFlags(parent));
					if (parent.lastIndex) child.lastIndex = parent.lastIndex;
				} else if (clone.__isDate(parent)) child = new Date(parent.getTime());
				else if (useBuffer && Buffer.isBuffer(parent)) {
					if (Buffer.allocUnsafe) child = Buffer.allocUnsafe(parent.length);
					else child = new Buffer(parent.length);
					parent.copy(child);
					return child;
				} else if (_instanceof(parent, Error)) child = Object.create(parent);
				else if (typeof prototype == "undefined") {
					proto = Object.getPrototypeOf(parent);
					child = Object.create(proto);
				} else {
					child = Object.create(prototype);
					proto = prototype;
				}
				if (circular) {
					var index = allParents.indexOf(parent);
					if (index != -1) return allChildren[index];
					allParents.push(parent);
					allChildren.push(child);
				}
				if (_instanceof(parent, nativeMap)) parent.forEach(function(value, key) {
					var keyChild = _clone(key, depth - 1);
					var valueChild = _clone(value, depth - 1);
					child.set(keyChild, valueChild);
				});
				if (_instanceof(parent, nativeSet)) parent.forEach(function(value) {
					var entryChild = _clone(value, depth - 1);
					child.add(entryChild);
				});
				for (var i in parent) {
					var attrs;
					if (proto) attrs = Object.getOwnPropertyDescriptor(proto, i);
					if (attrs && attrs.set == null) continue;
					child[i] = _clone(parent[i], depth - 1);
				}
				if (Object.getOwnPropertySymbols) {
					var symbols = Object.getOwnPropertySymbols(parent);
					for (var i = 0; i < symbols.length; i++) {
						var symbol = symbols[i];
						var descriptor = Object.getOwnPropertyDescriptor(parent, symbol);
						if (descriptor && !descriptor.enumerable && !includeNonEnumerable) continue;
						child[symbol] = _clone(parent[symbol], depth - 1);
						if (!descriptor.enumerable) Object.defineProperty(child, symbol, { enumerable: false });
					}
				}
				if (includeNonEnumerable) {
					var allPropertyNames = Object.getOwnPropertyNames(parent);
					for (var i = 0; i < allPropertyNames.length; i++) {
						var propertyName = allPropertyNames[i];
						var descriptor = Object.getOwnPropertyDescriptor(parent, propertyName);
						if (descriptor && descriptor.enumerable) continue;
						child[propertyName] = _clone(parent[propertyName], depth - 1);
						Object.defineProperty(child, propertyName, { enumerable: false });
					}
				}
				return child;
			}
			return _clone(parent, depth);
		}
		/**
		* Simple flat clone using prototype, accepts only objects, usefull for property
		* override on FLAT configuration object (no nested props).
		*
		* USE WITH CAUTION! This may not behave as you wish if you do not know how this
		* works.
		*/
		clone.clonePrototype = function clonePrototype(parent) {
			if (parent === null) return null;
			var c = function() {};
			c.prototype = parent;
			return new c();
		};
		function __objToStr(o) {
			return Object.prototype.toString.call(o);
		}
		clone.__objToStr = __objToStr;
		function __isDate(o) {
			return typeof o === "object" && __objToStr(o) === "[object Date]";
		}
		clone.__isDate = __isDate;
		function __isArray(o) {
			return typeof o === "object" && __objToStr(o) === "[object Array]";
		}
		clone.__isArray = __isArray;
		function __isRegExp(o) {
			return typeof o === "object" && __objToStr(o) === "[object RegExp]";
		}
		clone.__isRegExp = __isRegExp;
		function __getRegExpFlags(re) {
			var flags = "";
			if (re.global) flags += "g";
			if (re.ignoreCase) flags += "i";
			if (re.multiline) flags += "m";
			return flags;
		}
		clone.__getRegExpFlags = __getRegExpFlags;
		return clone;
	})();
	if (typeof module === "object" && module.exports) module.exports = clone;
}));
//#endregion
//#region node_modules/fbp-graph/lib/JournalStore.js
var require_JournalStore = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	const events_1 = require_eventemitter3();
	/**
	* General interface for journal storage
	*/
	var JournalStore = class extends events_1.EventEmitter {
		constructor(graph) {
			super();
			this.graph = graph;
			this.lastRevision = 0;
		}
		countTransactions() {
			return 0;
		}
		putTransaction(revId, entries) {
			if (revId > this.lastRevision) this.lastRevision = revId;
			this.emit("transaction", revId, entries);
		}
		fetchTransaction(revId) {
			return [];
		}
	};
	exports.default = JournalStore;
}));
//#endregion
//#region node_modules/fbp-graph/lib/MemoryJournalStore.js
var require_MemoryJournalStore = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	const JournalStore_1 = require_JournalStore();
	/**
	* In-memory journal storage
	*
	*/
	var MemoryJournalStore = class extends JournalStore_1.default {
		constructor(graph) {
			super(graph);
			this.transactions = [];
		}
		countTransactions() {
			return this.transactions.length;
		}
		putTransaction(revId, entries) {
			super.putTransaction(revId, entries);
			this.transactions[revId] = entries;
		}
		fetchTransaction(revId) {
			return this.transactions[revId];
		}
	};
	exports.default = MemoryJournalStore;
}));
//#endregion
//#region node_modules/fbp-graph/lib/Journal.js
var require_Journal = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.MemoryJournalStore = exports.JournalStore = exports.Journal = void 0;
	const events_1 = require_eventemitter3();
	const clone = require_clone();
	exports.JournalStore = require_JournalStore().default;
	const MemoryJournalStore_1 = require_MemoryJournalStore();
	exports.MemoryJournalStore = MemoryJournalStore_1.default;
	function entryToPrettyString(entry) {
		const a = entry.args;
		switch (entry.cmd) {
			case "addNode": return `${a.id}(${a.component})`;
			case "removeNode": return `DEL ${a.id}(${a.component})`;
			case "renameNode": return `RENAME ${a.oldId} ${a.newId}`;
			case "changeNode": return `META ${a.id}`;
			case "addEdge": return `${a.from.node} ${a.from.port} -> ${a.to.port} ${a.to.node}`;
			case "removeEdge": return `${a.from.node} ${a.from.port} -X> ${a.to.port} ${a.to.node}`;
			case "changeEdge": return `META ${a.from.node} ${a.from.port} -> ${a.to.port} ${a.to.node}`;
			case "addInitial": return `'${a.from.data}' -> ${a.to.port} ${a.to.node}`;
			case "removeInitial": return `'${a.from.data}' -X> ${a.to.port} ${a.to.node}`;
			case "startTransaction": return `>>> ${entry.rev}: ${a.id}`;
			case "endTransaction": return `<<< ${entry.rev}: ${a.id}`;
			case "changeProperties": return "PROPERTIES";
			case "addGroup": return `GROUP ${a.name}`;
			case "renameGroup": return `RENAME GROUP ${a.oldName} ${a.newName}`;
			case "removeGroup": return `DEL GROUP ${a.name}`;
			case "changeGroup": return `META GROUP ${a.name}`;
			case "addInport": return `INPORT ${a.name}`;
			case "removeInport": return `DEL INPORT ${a.name}`;
			case "renameInport": return `RENAME INPORT ${a.oldId} ${a.newId}`;
			case "changeInport": return `META INPORT ${a.name}`;
			case "addOutport": return `OUTPORT ${a.name}`;
			case "removeOutport": return `DEL OUTPORT ${a.name}`;
			case "renameOutport": return `RENAME OUTPORT ${a.oldId} ${a.newId}`;
			case "changeOutport": return `META OUTPORT ${a.name}`;
			default: throw new Error(`Unknown journal entry: ${entry.cmd}`);
		}
	}
	function calculateMeta(oldMeta, newMeta) {
		const setMeta = {};
		Object.keys(oldMeta).forEach((k) => {
			setMeta[k] = null;
		});
		Object.keys(newMeta).forEach((k) => {
			setMeta[k] = newMeta[k];
		});
		return setMeta;
	}
	var Journal$1 = class extends events_1.EventEmitter {
		constructor(graph, metadata, store) {
			super();
			this.graph = graph;
			this.entries = [];
			this.subscribed = true;
			this.store = store || new MemoryJournalStore_1.default(this.graph);
			if (this.store.countTransactions() === 0) {
				this.currentRevision = -1;
				this.startTransaction("initial", metadata || {});
				this.graph.nodes.forEach((node) => {
					this.appendCommand("addNode", node);
				});
				this.graph.edges.forEach((edge) => {
					this.appendCommand("addEdge", edge);
				});
				this.graph.initializers.forEach((iip) => {
					this.appendCommand("addInitial", iip);
				});
				if (Object.keys(this.graph.properties).length > 0) this.appendCommand("changeProperties", this.graph.properties);
				Object.keys(this.graph.inports).forEach((name) => {
					const port = this.graph.inports[name];
					this.appendCommand("addInport", {
						name,
						port
					});
				});
				Object.keys(this.graph.outports).forEach((name) => {
					const port = this.graph.outports[name];
					this.appendCommand("addOutport", {
						name,
						port
					});
				});
				this.graph.groups.forEach((group) => {
					this.appendCommand("addGroup", group);
				});
				this.endTransaction("initial", metadata || {});
			} else this.currentRevision = this.store.lastRevision;
			this.graph.on("addNode", (node) => {
				this.appendCommand("addNode", node);
			});
			this.graph.on("removeNode", (node) => {
				this.appendCommand("removeNode", node);
			});
			this.graph.on("renameNode", (oldId, newId) => {
				const args = {
					oldId,
					newId
				};
				this.appendCommand("renameNode", args);
			});
			this.graph.on("changeNode", (node, oldMeta) => {
				this.appendCommand("changeNode", {
					id: node.id,
					new: node.metadata,
					old: oldMeta
				});
			});
			this.graph.on("addEdge", (edge) => {
				this.appendCommand("addEdge", edge);
			});
			this.graph.on("removeEdge", (edge) => {
				this.appendCommand("removeEdge", edge);
			});
			this.graph.on("changeEdge", (edge, oldMeta) => {
				this.appendCommand("changeEdge", {
					from: edge.from,
					to: edge.to,
					new: edge.metadata,
					old: oldMeta
				});
			});
			this.graph.on("addInitial", (iip) => {
				this.appendCommand("addInitial", iip);
			});
			this.graph.on("removeInitial", (iip) => {
				this.appendCommand("removeInitial", iip);
			});
			this.graph.on("changeProperties", (newProps, oldProps) => this.appendCommand("changeProperties", {
				new: newProps,
				old: oldProps
			}));
			this.graph.on("addGroup", (group) => this.appendCommand("addGroup", group));
			this.graph.on("renameGroup", (oldName, newName) => this.appendCommand("renameGroup", {
				oldName,
				newName
			}));
			this.graph.on("removeGroup", (group) => this.appendCommand("removeGroup", group));
			this.graph.on("changeGroup", (group, oldMeta) => this.appendCommand("changeGroup", {
				name: group.name,
				new: group.metadata,
				old: oldMeta
			}));
			this.graph.on("addExport", (exported) => this.appendCommand("addExport", exported));
			this.graph.on("removeExport", (exported) => this.appendCommand("removeExport", exported));
			this.graph.on("addInport", (name, port) => this.appendCommand("addInport", {
				name,
				port
			}));
			this.graph.on("removeInport", (name, port) => this.appendCommand("removeInport", {
				name,
				port
			}));
			this.graph.on("renameInport", (oldId, newId) => this.appendCommand("renameInport", {
				oldId,
				newId
			}));
			this.graph.on("changeInport", (name, port, oldMeta) => this.appendCommand("changeInport", {
				name,
				new: port.metadata,
				old: oldMeta
			}));
			this.graph.on("addOutport", (name, port) => this.appendCommand("addOutport", {
				name,
				port
			}));
			this.graph.on("removeOutport", (name, port) => this.appendCommand("removeOutport", {
				name,
				port
			}));
			this.graph.on("renameOutport", (oldId, newId) => this.appendCommand("renameOutport", {
				oldId,
				newId
			}));
			this.graph.on("changeOutport", (name, port, oldMeta) => this.appendCommand("changeOutport", {
				name,
				new: port.metadata,
				old: oldMeta
			}));
			this.graph.on("startTransaction", (id, meta) => {
				this.startTransaction(id, meta);
			});
			this.graph.on("endTransaction", (id, meta) => {
				this.endTransaction(id, meta);
			});
		}
		startTransaction(id, meta) {
			if (!this.subscribed) return;
			if (this.entries.length > 0) throw Error("Inconsistent @entries");
			this.currentRevision += 1;
			this.appendCommand("startTransaction", {
				id,
				metadata: meta
			}, this.currentRevision);
		}
		endTransaction(id, meta) {
			if (!this.subscribed) return;
			this.appendCommand("endTransaction", {
				id,
				metadata: meta
			}, this.currentRevision);
			this.store.putTransaction(this.currentRevision, this.entries);
			this.entries = [];
		}
		appendCommand(cmd, args, rev = null) {
			if (!this.subscribed) return;
			const entry = {
				cmd,
				args: clone(args),
				rev
			};
			this.entries.push(entry);
		}
		executeEntry(entry) {
			const a = entry.args;
			switch (entry.cmd) {
				case "addNode":
					this.graph.addNode(a.id, a.component);
					break;
				case "removeNode":
					this.graph.removeNode(a.id);
					break;
				case "renameNode":
					this.graph.renameNode(a.oldId, a.newId);
					break;
				case "changeNode":
					this.graph.setNodeMetadata(a.id, calculateMeta(a.old, a.new));
					break;
				case "addEdge":
					this.graph.addEdge(a.from.node, a.from.port, a.to.node, a.to.port);
					break;
				case "removeEdge":
					this.graph.removeEdge(a.from.node, a.from.port, a.to.node, a.to.port);
					break;
				case "changeEdge":
					this.graph.setEdgeMetadata(a.from.node, a.from.port, a.to.node, a.to.port, calculateMeta(a.old, a.new));
					break;
				case "addInitial":
					if (typeof a.to.index === "number") this.graph.addInitialIndex(a.from.data, a.to.node, a.to.port, a.to.index, a.metadata);
					else this.graph.addInitial(a.from.data, a.to.node, a.to.port, a.metadata);
					break;
				case "removeInitial":
					this.graph.removeInitial(a.to.node, a.to.port);
					break;
				case "startTransaction": break;
				case "endTransaction": break;
				case "changeProperties":
					this.graph.setProperties(a.new);
					break;
				case "addGroup":
					this.graph.addGroup(a.name, a.nodes, a.metadata);
					break;
				case "renameGroup":
					this.graph.renameGroup(a.oldName, a.newName);
					break;
				case "removeGroup":
					this.graph.removeGroup(a.name);
					break;
				case "changeGroup":
					this.graph.setGroupMetadata(a.name, calculateMeta(a.old, a.new));
					break;
				case "addInport":
					this.graph.addInport(a.name, a.port.process, a.port.port, a.port.metadata);
					break;
				case "removeInport":
					this.graph.removeInport(a.name);
					break;
				case "renameInport":
					this.graph.renameInport(a.oldId, a.newId);
					break;
				case "changeInport":
					this.graph.setInportMetadata(a.name, calculateMeta(a.old, a.new));
					break;
				case "addOutport":
					this.graph.addOutport(a.name, a.port.process, a.port.port, a.port.metadata(a.name));
					break;
				case "removeOutport":
					this.graph.removeOutport(a.name);
					break;
				case "renameOutport":
					this.graph.renameOutport(a.oldId, a.newId);
					break;
				case "changeOutport":
					this.graph.setOutportMetadata(a.name, calculateMeta(a.old, a.new));
					break;
				default: throw new Error(`Unknown journal entry: ${entry.cmd}`);
			}
		}
		executeEntryInversed(entry) {
			const a = entry.args;
			switch (entry.cmd) {
				case "addNode":
					this.graph.removeNode(a.id);
					break;
				case "removeNode":
					this.graph.addNode(a.id, a.component);
					break;
				case "renameNode":
					this.graph.renameNode(a.newId, a.oldId);
					break;
				case "changeNode":
					this.graph.setNodeMetadata(a.id, calculateMeta(a.new, a.old));
					break;
				case "addEdge":
					this.graph.removeEdge(a.from.node, a.from.port, a.to.node, a.to.port);
					break;
				case "removeEdge":
					this.graph.addEdge(a.from.node, a.from.port, a.to.node, a.to.port);
					break;
				case "changeEdge":
					this.graph.setEdgeMetadata(a.from.node, a.from.port, a.to.node, a.to.port, calculateMeta(a.new, a.old));
					break;
				case "addInitial":
					this.graph.removeInitial(a.to.node, a.to.port);
					break;
				case "removeInitial":
					if (typeof a.to.index === "number") this.graph.addInitialIndex(a.from.data, a.to.node, a.to.port, a.to.index, a.metadata);
					else this.graph.addInitial(a.from.data, a.to.node, a.to.port, a.metadata);
					break;
				case "startTransaction": break;
				case "endTransaction": break;
				case "changeProperties":
					this.graph.setProperties(a.old);
					break;
				case "addGroup":
					this.graph.removeGroup(a.name);
					break;
				case "renameGroup":
					this.graph.renameGroup(a.newName, a.oldName);
					break;
				case "removeGroup":
					this.graph.addGroup(a.name, a.nodes, a.metadata);
					break;
				case "changeGroup":
					this.graph.setGroupMetadata(a.name, calculateMeta(a.new, a.old));
					break;
				case "addInport":
					this.graph.removeInport(a.name);
					break;
				case "removeInport":
					this.graph.addInport(a.name, a.port.process, a.port.port, a.port.metadata);
					break;
				case "renameInport":
					this.graph.renameInport(a.newId, a.oldId);
					break;
				case "changeInport":
					this.graph.setInportMetadata(a.name, calculateMeta(a.new, a.old));
					break;
				case "addOutport":
					this.graph.removeOutport(a.name);
					break;
				case "removeOutport":
					this.graph.addOutport(a.name, a.port.process, a.port.port, a.port.metadata);
					break;
				case "renameOutport":
					this.graph.renameOutport(a.newId, a.oldId);
					break;
				case "changeOutport":
					this.graph.setOutportMetadata(a.name, calculateMeta(a.new, a.old));
					break;
				default: throw new Error(`Unknown journal entry: ${entry.cmd}`);
			}
		}
		moveToRevision(revId) {
			if (revId === this.currentRevision) return;
			this.subscribed = false;
			if (revId > this.currentRevision) for (let start = this.currentRevision + 1, r = start, end = revId, asc = start <= end; asc ? r <= end : r >= end; asc ? r += 1 : r -= 1) this.store.fetchTransaction(r).forEach((entry) => {
				this.executeEntry(entry);
			});
			else for (let r = this.currentRevision, end = revId + 1; r >= end; r -= 1) {
				const entries = this.store.fetchTransaction(r).slice(0);
				entries.reverse();
				entries.forEach((entry) => {
					this.executeEntryInversed(entry);
				});
			}
			this.currentRevision = revId;
			this.subscribed = true;
		}
		undo() {
			if (!this.canUndo()) return;
			this.moveToRevision(this.currentRevision - 1);
		}
		canUndo() {
			return this.currentRevision > 0;
		}
		redo() {
			if (!this.canRedo()) return;
			this.moveToRevision(this.currentRevision + 1);
		}
		canRedo() {
			return this.currentRevision < this.store.lastRevision;
		}
		toPrettyString(startRev = 0, endRevParam) {
			const endRev = endRevParam || this.store.lastRevision;
			const lines = [];
			for (let r = startRev, end = endRev, asc = startRev <= end; asc ? r < end : r > end; asc ? r += 1 : r -= 1) this.store.fetchTransaction(r).forEach((entry) => {
				lines.push(entryToPrettyString(entry));
			});
			return lines.join("\n");
		}
		toJSON(startRev = 0, endRevParam = null) {
			const endRev = endRevParam || this.store.lastRevision;
			const entries = [];
			for (let r = startRev, end = endRev; r < end; r += 1) this.store.fetchTransaction(r).forEach((entry) => {
				entries.push(entryToPrettyString(entry));
			});
			return entries;
		}
		save(file, callback) {
			const promise = new Promise((resolve, reject) => {
				const json = JSON.stringify(this.toJSON(), null, 4);
				const { writeFile } = __require("fs");
				writeFile(`${file}.json`, json, "utf-8", (err) => {
					if (err) {
						reject(err);
						return;
					}
					resolve();
				});
			});
			if (callback) {
				promise.then(() => {
					callback(null);
				}, callback);
				return;
			}
			return promise;
		}
	};
	exports.Journal = Journal$1;
}));
//#endregion
//#region node_modules/fbp-graph/lib/Platform.js
var require_Platform = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.isBrowser = void 0;
	function isBrowser() {
		if (typeof process !== "undefined" && process.execPath && process.execPath.match(/node|iojs/)) return false;
		return true;
	}
	exports.isBrowser = isBrowser;
}));
//#endregion
//#region node_modules/tv4/tv4.js
var require_tv4 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(global, factory) {
		if (typeof define === "function" && define.amd) define([], factory);
		else if (typeof module !== "undefined" && module.exports) module.exports = factory();
		else global.tv4 = factory();
	})(exports, function() {
		if (!Object.keys) Object.keys = (function() {
			var hasOwnProperty = Object.prototype.hasOwnProperty, hasDontEnumBug = !{ toString: null }.propertyIsEnumerable("toString"), dontEnums = [
				"toString",
				"toLocaleString",
				"valueOf",
				"hasOwnProperty",
				"isPrototypeOf",
				"propertyIsEnumerable",
				"constructor"
			], dontEnumsLength = dontEnums.length;
			return function(obj) {
				if (typeof obj !== "object" && typeof obj !== "function" || obj === null) throw new TypeError("Object.keys called on non-object");
				var result = [];
				for (var prop in obj) if (hasOwnProperty.call(obj, prop)) result.push(prop);
				if (hasDontEnumBug) {
					for (var i = 0; i < dontEnumsLength; i++) if (hasOwnProperty.call(obj, dontEnums[i])) result.push(dontEnums[i]);
				}
				return result;
			};
		})();
		if (!Object.create) Object.create = (function() {
			function F() {}
			return function(o) {
				if (arguments.length !== 1) throw new Error("Object.create implementation only accepts one parameter.");
				F.prototype = o;
				return new F();
			};
		})();
		if (!Array.isArray) Array.isArray = function(vArg) {
			return Object.prototype.toString.call(vArg) === "[object Array]";
		};
		if (!Array.prototype.indexOf) Array.prototype.indexOf = function(searchElement) {
			if (this === null) throw new TypeError();
			var t = Object(this);
			var len = t.length >>> 0;
			if (len === 0) return -1;
			var n = 0;
			if (arguments.length > 1) {
				n = Number(arguments[1]);
				if (n !== n) n = 0;
				else if (n !== 0 && n !== Infinity && n !== -Infinity) n = (n > 0 || -1) * Math.floor(Math.abs(n));
			}
			if (n >= len) return -1;
			var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
			for (; k < len; k++) if (k in t && t[k] === searchElement) return k;
			return -1;
		};
		if (!Object.isFrozen) Object.isFrozen = function(obj) {
			var key = "tv4_test_frozen_key";
			while (obj.hasOwnProperty(key)) key += Math.random();
			try {
				obj[key] = true;
				delete obj[key];
				return false;
			} catch (e) {
				return true;
			}
		};
		var uriTemplateGlobalModifiers = {
			"+": true,
			"#": true,
			".": true,
			"/": true,
			";": true,
			"?": true,
			"&": true
		};
		var uriTemplateSuffices = { "*": true };
		function notReallyPercentEncode(string) {
			return encodeURI(string).replace(/%25[0-9][0-9]/g, function(doubleEncoded) {
				return "%" + doubleEncoded.substring(3);
			});
		}
		function uriTemplateSubstitution(spec) {
			var modifier = "";
			if (uriTemplateGlobalModifiers[spec.charAt(0)]) {
				modifier = spec.charAt(0);
				spec = spec.substring(1);
			}
			var separator = "";
			var prefix = "";
			var shouldEscape = true;
			var showVariables = false;
			var trimEmptyString = false;
			if (modifier === "+") shouldEscape = false;
			else if (modifier === ".") {
				prefix = ".";
				separator = ".";
			} else if (modifier === "/") {
				prefix = "/";
				separator = "/";
			} else if (modifier === "#") {
				prefix = "#";
				shouldEscape = false;
			} else if (modifier === ";") {
				prefix = ";";
				separator = ";";
				showVariables = true;
				trimEmptyString = true;
			} else if (modifier === "?") {
				prefix = "?";
				separator = "&";
				showVariables = true;
			} else if (modifier === "&") {
				prefix = "&";
				separator = "&";
				showVariables = true;
			}
			var varNames = [];
			var varList = spec.split(",");
			var varSpecs = [];
			var varSpecMap = {};
			for (var i = 0; i < varList.length; i++) {
				var varName = varList[i];
				var truncate = null;
				if (varName.indexOf(":") !== -1) {
					var parts = varName.split(":");
					varName = parts[0];
					truncate = parseInt(parts[1], 10);
				}
				var suffices = {};
				while (uriTemplateSuffices[varName.charAt(varName.length - 1)]) {
					suffices[varName.charAt(varName.length - 1)] = true;
					varName = varName.substring(0, varName.length - 1);
				}
				var varSpec = {
					truncate,
					name: varName,
					suffices
				};
				varSpecs.push(varSpec);
				varSpecMap[varName] = varSpec;
				varNames.push(varName);
			}
			var subFunction = function(valueFunction) {
				var result = "";
				var startIndex = 0;
				for (var i = 0; i < varSpecs.length; i++) {
					var varSpec = varSpecs[i];
					var value = valueFunction(varSpec.name);
					if (value === null || value === void 0 || Array.isArray(value) && value.length === 0 || typeof value === "object" && Object.keys(value).length === 0) {
						startIndex++;
						continue;
					}
					if (i === startIndex) result += prefix;
					else result += separator || ",";
					if (Array.isArray(value)) {
						if (showVariables) result += varSpec.name + "=";
						for (var j = 0; j < value.length; j++) {
							if (j > 0) {
								result += varSpec.suffices["*"] ? separator || "," : ",";
								if (varSpec.suffices["*"] && showVariables) result += varSpec.name + "=";
							}
							result += shouldEscape ? encodeURIComponent(value[j]).replace(/!/g, "%21") : notReallyPercentEncode(value[j]);
						}
					} else if (typeof value === "object") {
						if (showVariables && !varSpec.suffices["*"]) result += varSpec.name + "=";
						var first = true;
						for (var key in value) {
							if (!first) result += varSpec.suffices["*"] ? separator || "," : ",";
							first = false;
							result += shouldEscape ? encodeURIComponent(key).replace(/!/g, "%21") : notReallyPercentEncode(key);
							result += varSpec.suffices["*"] ? "=" : ",";
							result += shouldEscape ? encodeURIComponent(value[key]).replace(/!/g, "%21") : notReallyPercentEncode(value[key]);
						}
					} else {
						if (showVariables) {
							result += varSpec.name;
							if (!trimEmptyString || value !== "") result += "=";
						}
						if (varSpec.truncate != null) value = value.substring(0, varSpec.truncate);
						result += shouldEscape ? encodeURIComponent(value).replace(/!/g, "%21") : notReallyPercentEncode(value);
					}
				}
				return result;
			};
			subFunction.varNames = varNames;
			return {
				prefix,
				substitution: subFunction
			};
		}
		function UriTemplate(template) {
			if (!(this instanceof UriTemplate)) return new UriTemplate(template);
			var parts = template.split("{");
			var textParts = [parts.shift()];
			var prefixes = [];
			var substitutions = [];
			var varNames = [];
			while (parts.length > 0) {
				var part = parts.shift();
				var spec = part.split("}")[0];
				var remainder = part.substring(spec.length + 1);
				var funcs = uriTemplateSubstitution(spec);
				substitutions.push(funcs.substitution);
				prefixes.push(funcs.prefix);
				textParts.push(remainder);
				varNames = varNames.concat(funcs.substitution.varNames);
			}
			this.fill = function(valueFunction) {
				var result = textParts[0];
				for (var i = 0; i < substitutions.length; i++) {
					var substitution = substitutions[i];
					result += substitution(valueFunction);
					result += textParts[i + 1];
				}
				return result;
			};
			this.varNames = varNames;
			this.template = template;
		}
		UriTemplate.prototype = {
			toString: function() {
				return this.template;
			},
			fillFromObject: function(obj) {
				return this.fill(function(varName) {
					return obj[varName];
				});
			}
		};
		var ValidatorContext = function ValidatorContext(parent, collectMultiple, errorReporter, checkRecursive, trackUnknownProperties) {
			this.missing = [];
			this.missingMap = {};
			this.formatValidators = parent ? Object.create(parent.formatValidators) : {};
			this.schemas = parent ? Object.create(parent.schemas) : {};
			this.collectMultiple = collectMultiple;
			this.errors = [];
			this.handleError = collectMultiple ? this.collectError : this.returnError;
			if (checkRecursive) {
				this.checkRecursive = true;
				this.scanned = [];
				this.scannedFrozen = [];
				this.scannedFrozenSchemas = [];
				this.scannedFrozenValidationErrors = [];
				this.validatedSchemasKey = "tv4_validation_id";
				this.validationErrorsKey = "tv4_validation_errors_id";
			}
			if (trackUnknownProperties) {
				this.trackUnknownProperties = true;
				this.knownPropertyPaths = {};
				this.unknownPropertyPaths = {};
			}
			this.errorReporter = errorReporter || defaultErrorReporter("en");
			if (typeof this.errorReporter === "string") throw new Error("debug");
			this.definedKeywords = {};
			if (parent) for (var key in parent.definedKeywords) this.definedKeywords[key] = parent.definedKeywords[key].slice(0);
		};
		ValidatorContext.prototype.defineKeyword = function(keyword, keywordFunction) {
			this.definedKeywords[keyword] = this.definedKeywords[keyword] || [];
			this.definedKeywords[keyword].push(keywordFunction);
		};
		ValidatorContext.prototype.createError = function(code, messageParams, dataPath, schemaPath, subErrors, data, schema) {
			var error = new ValidationError(code, messageParams, dataPath, schemaPath, subErrors);
			error.message = this.errorReporter(error, data, schema);
			return error;
		};
		ValidatorContext.prototype.returnError = function(error) {
			return error;
		};
		ValidatorContext.prototype.collectError = function(error) {
			if (error) this.errors.push(error);
			return null;
		};
		ValidatorContext.prototype.prefixErrors = function(startIndex, dataPath, schemaPath) {
			for (var i = startIndex; i < this.errors.length; i++) this.errors[i] = this.errors[i].prefixWith(dataPath, schemaPath);
			return this;
		};
		ValidatorContext.prototype.banUnknownProperties = function(data, schema) {
			for (var unknownPath in this.unknownPropertyPaths) {
				var error = this.createError(ErrorCodes.UNKNOWN_PROPERTY, { path: unknownPath }, unknownPath, "", null, data, schema);
				var result = this.handleError(error);
				if (result) return result;
			}
			return null;
		};
		ValidatorContext.prototype.addFormat = function(format, validator) {
			if (typeof format === "object") {
				for (var key in format) this.addFormat(key, format[key]);
				return this;
			}
			this.formatValidators[format] = validator;
		};
		ValidatorContext.prototype.resolveRefs = function(schema, urlHistory) {
			if (schema["$ref"] !== void 0) {
				urlHistory = urlHistory || {};
				if (urlHistory[schema["$ref"]]) return this.createError(ErrorCodes.CIRCULAR_REFERENCE, { urls: Object.keys(urlHistory).join(", ") }, "", "", null, void 0, schema);
				urlHistory[schema["$ref"]] = true;
				schema = this.getSchema(schema["$ref"], urlHistory);
			}
			return schema;
		};
		ValidatorContext.prototype.getSchema = function(url, urlHistory) {
			var schema;
			if (this.schemas[url] !== void 0) {
				schema = this.schemas[url];
				return this.resolveRefs(schema, urlHistory);
			}
			var baseUrl = url;
			var fragment = "";
			if (url.indexOf("#") !== -1) {
				fragment = url.substring(url.indexOf("#") + 1);
				baseUrl = url.substring(0, url.indexOf("#"));
			}
			if (typeof this.schemas[baseUrl] === "object") {
				schema = this.schemas[baseUrl];
				var pointerPath = decodeURIComponent(fragment);
				if (pointerPath === "") return this.resolveRefs(schema, urlHistory);
				else if (pointerPath.charAt(0) !== "/") return;
				var parts = pointerPath.split("/").slice(1);
				for (var i = 0; i < parts.length; i++) {
					var component = parts[i].replace(/~1/g, "/").replace(/~0/g, "~");
					if (schema[component] === void 0) {
						schema = void 0;
						break;
					}
					schema = schema[component];
				}
				if (schema !== void 0) return this.resolveRefs(schema, urlHistory);
			}
			if (this.missing[baseUrl] === void 0) {
				this.missing.push(baseUrl);
				this.missing[baseUrl] = baseUrl;
				this.missingMap[baseUrl] = baseUrl;
			}
		};
		ValidatorContext.prototype.searchSchemas = function(schema, url) {
			if (Array.isArray(schema)) for (var i = 0; i < schema.length; i++) this.searchSchemas(schema[i], url);
			else if (schema && typeof schema === "object") {
				if (typeof schema.id === "string") {
					if (isTrustedUrl(url, schema.id)) {
						if (this.schemas[schema.id] === void 0) this.schemas[schema.id] = schema;
					}
				}
				for (var key in schema) if (key !== "enum") {
					if (typeof schema[key] === "object") this.searchSchemas(schema[key], url);
					else if (key === "$ref") {
						var uri = getDocumentUri(schema[key]);
						if (uri && this.schemas[uri] === void 0 && this.missingMap[uri] === void 0) this.missingMap[uri] = uri;
					}
				}
			}
		};
		ValidatorContext.prototype.addSchema = function(url, schema) {
			if (typeof url !== "string" || typeof schema === "undefined") if (typeof url === "object" && typeof url.id === "string") {
				schema = url;
				url = schema.id;
			} else return;
			if (url === getDocumentUri(url) + "#") url = getDocumentUri(url);
			this.schemas[url] = schema;
			delete this.missingMap[url];
			normSchema(schema, url);
			this.searchSchemas(schema, url);
		};
		ValidatorContext.prototype.getSchemaMap = function() {
			var map = {};
			for (var key in this.schemas) map[key] = this.schemas[key];
			return map;
		};
		ValidatorContext.prototype.getSchemaUris = function(filterRegExp) {
			var list = [];
			for (var key in this.schemas) if (!filterRegExp || filterRegExp.test(key)) list.push(key);
			return list;
		};
		ValidatorContext.prototype.getMissingUris = function(filterRegExp) {
			var list = [];
			for (var key in this.missingMap) if (!filterRegExp || filterRegExp.test(key)) list.push(key);
			return list;
		};
		ValidatorContext.prototype.dropSchemas = function() {
			this.schemas = {};
			this.reset();
		};
		ValidatorContext.prototype.reset = function() {
			this.missing = [];
			this.missingMap = {};
			this.errors = [];
		};
		ValidatorContext.prototype.validateAll = function(data, schema, dataPathParts, schemaPathParts, dataPointerPath) {
			var topLevel;
			schema = this.resolveRefs(schema);
			if (!schema) return null;
			else if (schema instanceof ValidationError) {
				this.errors.push(schema);
				return schema;
			}
			var startErrorCount = this.errors.length;
			var frozenIndex, scannedFrozenSchemaIndex = null, scannedSchemasIndex = null;
			if (this.checkRecursive && data && typeof data === "object") {
				topLevel = !this.scanned.length;
				if (data[this.validatedSchemasKey]) {
					var schemaIndex = data[this.validatedSchemasKey].indexOf(schema);
					if (schemaIndex !== -1) {
						this.errors = this.errors.concat(data[this.validationErrorsKey][schemaIndex]);
						return null;
					}
				}
				if (Object.isFrozen(data)) {
					frozenIndex = this.scannedFrozen.indexOf(data);
					if (frozenIndex !== -1) {
						var frozenSchemaIndex = this.scannedFrozenSchemas[frozenIndex].indexOf(schema);
						if (frozenSchemaIndex !== -1) {
							this.errors = this.errors.concat(this.scannedFrozenValidationErrors[frozenIndex][frozenSchemaIndex]);
							return null;
						}
					}
				}
				this.scanned.push(data);
				if (Object.isFrozen(data)) {
					if (frozenIndex === -1) {
						frozenIndex = this.scannedFrozen.length;
						this.scannedFrozen.push(data);
						this.scannedFrozenSchemas.push([]);
					}
					scannedFrozenSchemaIndex = this.scannedFrozenSchemas[frozenIndex].length;
					this.scannedFrozenSchemas[frozenIndex][scannedFrozenSchemaIndex] = schema;
					this.scannedFrozenValidationErrors[frozenIndex][scannedFrozenSchemaIndex] = [];
				} else {
					if (!data[this.validatedSchemasKey]) try {
						Object.defineProperty(data, this.validatedSchemasKey, {
							value: [],
							configurable: true
						});
						Object.defineProperty(data, this.validationErrorsKey, {
							value: [],
							configurable: true
						});
					} catch (e) {
						data[this.validatedSchemasKey] = [];
						data[this.validationErrorsKey] = [];
					}
					scannedSchemasIndex = data[this.validatedSchemasKey].length;
					data[this.validatedSchemasKey][scannedSchemasIndex] = schema;
					data[this.validationErrorsKey][scannedSchemasIndex] = [];
				}
			}
			var errorCount = this.errors.length;
			var error = this.validateBasic(data, schema, dataPointerPath) || this.validateNumeric(data, schema, dataPointerPath) || this.validateString(data, schema, dataPointerPath) || this.validateArray(data, schema, dataPointerPath) || this.validateObject(data, schema, dataPointerPath) || this.validateCombinations(data, schema, dataPointerPath) || this.validateHypermedia(data, schema, dataPointerPath) || this.validateFormat(data, schema, dataPointerPath) || this.validateDefinedKeywords(data, schema, dataPointerPath) || null;
			if (topLevel) {
				while (this.scanned.length) {
					var item = this.scanned.pop();
					delete item[this.validatedSchemasKey];
				}
				this.scannedFrozen = [];
				this.scannedFrozenSchemas = [];
			}
			if (error || errorCount !== this.errors.length) while (dataPathParts && dataPathParts.length || schemaPathParts && schemaPathParts.length) {
				var dataPart = dataPathParts && dataPathParts.length ? "" + dataPathParts.pop() : null;
				var schemaPart = schemaPathParts && schemaPathParts.length ? "" + schemaPathParts.pop() : null;
				if (error) error = error.prefixWith(dataPart, schemaPart);
				this.prefixErrors(errorCount, dataPart, schemaPart);
			}
			if (scannedFrozenSchemaIndex !== null) this.scannedFrozenValidationErrors[frozenIndex][scannedFrozenSchemaIndex] = this.errors.slice(startErrorCount);
			else if (scannedSchemasIndex !== null) data[this.validationErrorsKey][scannedSchemasIndex] = this.errors.slice(startErrorCount);
			return this.handleError(error);
		};
		ValidatorContext.prototype.validateFormat = function(data, schema) {
			if (typeof schema.format !== "string" || !this.formatValidators[schema.format]) return null;
			var errorMessage = this.formatValidators[schema.format].call(null, data, schema);
			if (typeof errorMessage === "string" || typeof errorMessage === "number") return this.createError(ErrorCodes.FORMAT_CUSTOM, { message: errorMessage }, "", "/format", null, data, schema);
			else if (errorMessage && typeof errorMessage === "object") return this.createError(ErrorCodes.FORMAT_CUSTOM, { message: errorMessage.message || "?" }, errorMessage.dataPath || "", errorMessage.schemaPath || "/format", null, data, schema);
			return null;
		};
		ValidatorContext.prototype.validateDefinedKeywords = function(data, schema, dataPointerPath) {
			for (var key in this.definedKeywords) {
				if (typeof schema[key] === "undefined") continue;
				var validationFunctions = this.definedKeywords[key];
				for (var i = 0; i < validationFunctions.length; i++) {
					var func = validationFunctions[i];
					var result = func(data, schema[key], schema, dataPointerPath);
					if (typeof result === "string" || typeof result === "number") return this.createError(ErrorCodes.KEYWORD_CUSTOM, {
						key,
						message: result
					}, "", "", null, data, schema).prefixWith(null, key);
					else if (result && typeof result === "object") {
						var code = result.code;
						if (typeof code === "string") {
							if (!ErrorCodes[code]) throw new Error("Undefined error code (use defineError): " + code);
							code = ErrorCodes[code];
						} else if (typeof code !== "number") code = ErrorCodes.KEYWORD_CUSTOM;
						var messageParams = typeof result.message === "object" ? result.message : {
							key,
							message: result.message || "?"
						};
						var schemaPath = result.schemaPath || "/" + key.replace(/~/g, "~0").replace(/\//g, "~1");
						return this.createError(code, messageParams, result.dataPath || null, schemaPath, null, data, schema);
					}
				}
			}
			return null;
		};
		function recursiveCompare(A, B) {
			if (A === B) return true;
			if (A && B && typeof A === "object" && typeof B === "object") {
				if (Array.isArray(A) !== Array.isArray(B)) return false;
				else if (Array.isArray(A)) {
					if (A.length !== B.length) return false;
					for (var i = 0; i < A.length; i++) if (!recursiveCompare(A[i], B[i])) return false;
				} else {
					var key;
					for (key in A) if (B[key] === void 0 && A[key] !== void 0) return false;
					for (key in B) if (A[key] === void 0 && B[key] !== void 0) return false;
					for (key in A) if (!recursiveCompare(A[key], B[key])) return false;
				}
				return true;
			}
			return false;
		}
		ValidatorContext.prototype.validateBasic = function validateBasic(data, schema, dataPointerPath) {
			var error;
			if (error = this.validateType(data, schema, dataPointerPath)) return error.prefixWith(null, "type");
			if (error = this.validateEnum(data, schema, dataPointerPath)) return error.prefixWith(null, "type");
			return null;
		};
		ValidatorContext.prototype.validateType = function validateType(data, schema) {
			if (schema.type === void 0) return null;
			var dataType = typeof data;
			if (data === null) dataType = "null";
			else if (Array.isArray(data)) dataType = "array";
			var allowedTypes = schema.type;
			if (!Array.isArray(allowedTypes)) allowedTypes = [allowedTypes];
			for (var i = 0; i < allowedTypes.length; i++) {
				var type = allowedTypes[i];
				if (type === dataType || type === "integer" && dataType === "number" && data % 1 === 0) return null;
			}
			return this.createError(ErrorCodes.INVALID_TYPE, {
				type: dataType,
				expected: allowedTypes.join("/")
			}, "", "", null, data, schema);
		};
		ValidatorContext.prototype.validateEnum = function validateEnum(data, schema) {
			if (schema["enum"] === void 0) return null;
			for (var i = 0; i < schema["enum"].length; i++) {
				var enumVal = schema["enum"][i];
				if (recursiveCompare(data, enumVal)) return null;
			}
			return this.createError(ErrorCodes.ENUM_MISMATCH, { value: typeof JSON !== "undefined" ? JSON.stringify(data) : data }, "", "", null, data, schema);
		};
		ValidatorContext.prototype.validateNumeric = function validateNumeric(data, schema, dataPointerPath) {
			return this.validateMultipleOf(data, schema, dataPointerPath) || this.validateMinMax(data, schema, dataPointerPath) || this.validateNaN(data, schema, dataPointerPath) || null;
		};
		var CLOSE_ENOUGH_LOW = Math.pow(2, -51);
		var CLOSE_ENOUGH_HIGH = 1 - CLOSE_ENOUGH_LOW;
		ValidatorContext.prototype.validateMultipleOf = function validateMultipleOf(data, schema) {
			var multipleOf = schema.multipleOf || schema.divisibleBy;
			if (multipleOf === void 0) return null;
			if (typeof data === "number") {
				var remainder = data / multipleOf % 1;
				if (remainder >= CLOSE_ENOUGH_LOW && remainder < CLOSE_ENOUGH_HIGH) return this.createError(ErrorCodes.NUMBER_MULTIPLE_OF, {
					value: data,
					multipleOf
				}, "", "", null, data, schema);
			}
			return null;
		};
		ValidatorContext.prototype.validateMinMax = function validateMinMax(data, schema) {
			if (typeof data !== "number") return null;
			if (schema.minimum !== void 0) {
				if (data < schema.minimum) return this.createError(ErrorCodes.NUMBER_MINIMUM, {
					value: data,
					minimum: schema.minimum
				}, "", "/minimum", null, data, schema);
				if (schema.exclusiveMinimum && data === schema.minimum) return this.createError(ErrorCodes.NUMBER_MINIMUM_EXCLUSIVE, {
					value: data,
					minimum: schema.minimum
				}, "", "/exclusiveMinimum", null, data, schema);
			}
			if (schema.maximum !== void 0) {
				if (data > schema.maximum) return this.createError(ErrorCodes.NUMBER_MAXIMUM, {
					value: data,
					maximum: schema.maximum
				}, "", "/maximum", null, data, schema);
				if (schema.exclusiveMaximum && data === schema.maximum) return this.createError(ErrorCodes.NUMBER_MAXIMUM_EXCLUSIVE, {
					value: data,
					maximum: schema.maximum
				}, "", "/exclusiveMaximum", null, data, schema);
			}
			return null;
		};
		ValidatorContext.prototype.validateNaN = function validateNaN(data, schema) {
			if (typeof data !== "number") return null;
			if (isNaN(data) === true || data === Infinity || data === -Infinity) return this.createError(ErrorCodes.NUMBER_NOT_A_NUMBER, { value: data }, "", "/type", null, data, schema);
			return null;
		};
		ValidatorContext.prototype.validateString = function validateString(data, schema, dataPointerPath) {
			return this.validateStringLength(data, schema, dataPointerPath) || this.validateStringPattern(data, schema, dataPointerPath) || null;
		};
		ValidatorContext.prototype.validateStringLength = function validateStringLength(data, schema) {
			if (typeof data !== "string") return null;
			if (schema.minLength !== void 0) {
				if (data.length < schema.minLength) return this.createError(ErrorCodes.STRING_LENGTH_SHORT, {
					length: data.length,
					minimum: schema.minLength
				}, "", "/minLength", null, data, schema);
			}
			if (schema.maxLength !== void 0) {
				if (data.length > schema.maxLength) return this.createError(ErrorCodes.STRING_LENGTH_LONG, {
					length: data.length,
					maximum: schema.maxLength
				}, "", "/maxLength", null, data, schema);
			}
			return null;
		};
		ValidatorContext.prototype.validateStringPattern = function validateStringPattern(data, schema) {
			if (typeof data !== "string" || typeof schema.pattern !== "string" && !(schema.pattern instanceof RegExp)) return null;
			var regexp;
			if (schema.pattern instanceof RegExp) regexp = schema.pattern;
			else {
				var body, flags = "";
				var literal = schema.pattern.match(/^\/(.+)\/([img]*)$/);
				if (literal) {
					body = literal[1];
					flags = literal[2];
				} else body = schema.pattern;
				regexp = new RegExp(body, flags);
			}
			if (!regexp.test(data)) return this.createError(ErrorCodes.STRING_PATTERN, { pattern: schema.pattern }, "", "/pattern", null, data, schema);
			return null;
		};
		ValidatorContext.prototype.validateArray = function validateArray(data, schema, dataPointerPath) {
			if (!Array.isArray(data)) return null;
			return this.validateArrayLength(data, schema, dataPointerPath) || this.validateArrayUniqueItems(data, schema, dataPointerPath) || this.validateArrayItems(data, schema, dataPointerPath) || null;
		};
		ValidatorContext.prototype.validateArrayLength = function validateArrayLength(data, schema) {
			var error;
			if (schema.minItems !== void 0) {
				if (data.length < schema.minItems) {
					error = this.createError(ErrorCodes.ARRAY_LENGTH_SHORT, {
						length: data.length,
						minimum: schema.minItems
					}, "", "/minItems", null, data, schema);
					if (this.handleError(error)) return error;
				}
			}
			if (schema.maxItems !== void 0) {
				if (data.length > schema.maxItems) {
					error = this.createError(ErrorCodes.ARRAY_LENGTH_LONG, {
						length: data.length,
						maximum: schema.maxItems
					}, "", "/maxItems", null, data, schema);
					if (this.handleError(error)) return error;
				}
			}
			return null;
		};
		ValidatorContext.prototype.validateArrayUniqueItems = function validateArrayUniqueItems(data, schema) {
			if (schema.uniqueItems) {
				for (var i = 0; i < data.length; i++) for (var j = i + 1; j < data.length; j++) if (recursiveCompare(data[i], data[j])) {
					var error = this.createError(ErrorCodes.ARRAY_UNIQUE, {
						match1: i,
						match2: j
					}, "", "/uniqueItems", null, data, schema);
					if (this.handleError(error)) return error;
				}
			}
			return null;
		};
		ValidatorContext.prototype.validateArrayItems = function validateArrayItems(data, schema, dataPointerPath) {
			if (schema.items === void 0) return null;
			var error, i;
			if (Array.isArray(schema.items)) {
				for (i = 0; i < data.length; i++) if (i < schema.items.length) {
					if (error = this.validateAll(data[i], schema.items[i], [i], ["items", i], dataPointerPath + "/" + i)) return error;
				} else if (schema.additionalItems !== void 0) {
					if (typeof schema.additionalItems === "boolean") {
						if (!schema.additionalItems) {
							error = this.createError(ErrorCodes.ARRAY_ADDITIONAL_ITEMS, {}, "/" + i, "/additionalItems", null, data, schema);
							if (this.handleError(error)) return error;
						}
					} else if (error = this.validateAll(data[i], schema.additionalItems, [i], ["additionalItems"], dataPointerPath + "/" + i)) return error;
				}
			} else for (i = 0; i < data.length; i++) if (error = this.validateAll(data[i], schema.items, [i], ["items"], dataPointerPath + "/" + i)) return error;
			return null;
		};
		ValidatorContext.prototype.validateObject = function validateObject(data, schema, dataPointerPath) {
			if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
			return this.validateObjectMinMaxProperties(data, schema, dataPointerPath) || this.validateObjectRequiredProperties(data, schema, dataPointerPath) || this.validateObjectProperties(data, schema, dataPointerPath) || this.validateObjectDependencies(data, schema, dataPointerPath) || null;
		};
		ValidatorContext.prototype.validateObjectMinMaxProperties = function validateObjectMinMaxProperties(data, schema) {
			var keys = Object.keys(data);
			var error;
			if (schema.minProperties !== void 0) {
				if (keys.length < schema.minProperties) {
					error = this.createError(ErrorCodes.OBJECT_PROPERTIES_MINIMUM, {
						propertyCount: keys.length,
						minimum: schema.minProperties
					}, "", "/minProperties", null, data, schema);
					if (this.handleError(error)) return error;
				}
			}
			if (schema.maxProperties !== void 0) {
				if (keys.length > schema.maxProperties) {
					error = this.createError(ErrorCodes.OBJECT_PROPERTIES_MAXIMUM, {
						propertyCount: keys.length,
						maximum: schema.maxProperties
					}, "", "/maxProperties", null, data, schema);
					if (this.handleError(error)) return error;
				}
			}
			return null;
		};
		ValidatorContext.prototype.validateObjectRequiredProperties = function validateObjectRequiredProperties(data, schema) {
			if (schema.required !== void 0) for (var i = 0; i < schema.required.length; i++) {
				var key = schema.required[i];
				if (data[key] === void 0) {
					var error = this.createError(ErrorCodes.OBJECT_REQUIRED, { key }, "", "/required/" + i, null, data, schema);
					if (this.handleError(error)) return error;
				}
			}
			return null;
		};
		ValidatorContext.prototype.validateObjectProperties = function validateObjectProperties(data, schema, dataPointerPath) {
			var error;
			for (var key in data) {
				var keyPointerPath = dataPointerPath + "/" + key.replace(/~/g, "~0").replace(/\//g, "~1");
				var foundMatch = false;
				if (schema.properties !== void 0 && schema.properties[key] !== void 0) {
					foundMatch = true;
					if (error = this.validateAll(data[key], schema.properties[key], [key], ["properties", key], keyPointerPath)) return error;
				}
				if (schema.patternProperties !== void 0) {
					for (var patternKey in schema.patternProperties) if (new RegExp(patternKey).test(key)) {
						foundMatch = true;
						if (error = this.validateAll(data[key], schema.patternProperties[patternKey], [key], ["patternProperties", patternKey], keyPointerPath)) return error;
					}
				}
				if (!foundMatch) {
					if (schema.additionalProperties !== void 0) {
						if (this.trackUnknownProperties) {
							this.knownPropertyPaths[keyPointerPath] = true;
							delete this.unknownPropertyPaths[keyPointerPath];
						}
						if (typeof schema.additionalProperties === "boolean") {
							if (!schema.additionalProperties) {
								error = this.createError(ErrorCodes.OBJECT_ADDITIONAL_PROPERTIES, { key }, "", "/additionalProperties", null, data, schema).prefixWith(key, null);
								if (this.handleError(error)) return error;
							}
						} else if (error = this.validateAll(data[key], schema.additionalProperties, [key], ["additionalProperties"], keyPointerPath)) return error;
					} else if (this.trackUnknownProperties && !this.knownPropertyPaths[keyPointerPath]) this.unknownPropertyPaths[keyPointerPath] = true;
				} else if (this.trackUnknownProperties) {
					this.knownPropertyPaths[keyPointerPath] = true;
					delete this.unknownPropertyPaths[keyPointerPath];
				}
			}
			return null;
		};
		ValidatorContext.prototype.validateObjectDependencies = function validateObjectDependencies(data, schema, dataPointerPath) {
			var error;
			if (schema.dependencies !== void 0) {
				for (var depKey in schema.dependencies) if (data[depKey] !== void 0) {
					var dep = schema.dependencies[depKey];
					if (typeof dep === "string") {
						if (data[dep] === void 0) {
							error = this.createError(ErrorCodes.OBJECT_DEPENDENCY_KEY, {
								key: depKey,
								missing: dep
							}, "", "", null, data, schema).prefixWith(null, depKey).prefixWith(null, "dependencies");
							if (this.handleError(error)) return error;
						}
					} else if (Array.isArray(dep)) for (var i = 0; i < dep.length; i++) {
						var requiredKey = dep[i];
						if (data[requiredKey] === void 0) {
							error = this.createError(ErrorCodes.OBJECT_DEPENDENCY_KEY, {
								key: depKey,
								missing: requiredKey
							}, "", "/" + i, null, data, schema).prefixWith(null, depKey).prefixWith(null, "dependencies");
							if (this.handleError(error)) return error;
						}
					}
					else if (error = this.validateAll(data, dep, [], ["dependencies", depKey], dataPointerPath)) return error;
				}
			}
			return null;
		};
		ValidatorContext.prototype.validateCombinations = function validateCombinations(data, schema, dataPointerPath) {
			return this.validateAllOf(data, schema, dataPointerPath) || this.validateAnyOf(data, schema, dataPointerPath) || this.validateOneOf(data, schema, dataPointerPath) || this.validateNot(data, schema, dataPointerPath) || null;
		};
		ValidatorContext.prototype.validateAllOf = function validateAllOf(data, schema, dataPointerPath) {
			if (schema.allOf === void 0) return null;
			var error;
			for (var i = 0; i < schema.allOf.length; i++) {
				var subSchema = schema.allOf[i];
				if (error = this.validateAll(data, subSchema, [], ["allOf", i], dataPointerPath)) return error;
			}
			return null;
		};
		ValidatorContext.prototype.validateAnyOf = function validateAnyOf(data, schema, dataPointerPath) {
			if (schema.anyOf === void 0) return null;
			var errors = [];
			var startErrorCount = this.errors.length;
			var oldUnknownPropertyPaths, oldKnownPropertyPaths;
			if (this.trackUnknownProperties) {
				oldUnknownPropertyPaths = this.unknownPropertyPaths;
				oldKnownPropertyPaths = this.knownPropertyPaths;
			}
			var errorAtEnd = true;
			for (var i = 0; i < schema.anyOf.length; i++) {
				if (this.trackUnknownProperties) {
					this.unknownPropertyPaths = {};
					this.knownPropertyPaths = {};
				}
				var subSchema = schema.anyOf[i];
				var errorCount = this.errors.length;
				var error = this.validateAll(data, subSchema, [], ["anyOf", i], dataPointerPath);
				if (error === null && errorCount === this.errors.length) {
					this.errors = this.errors.slice(0, startErrorCount);
					if (this.trackUnknownProperties) {
						for (var knownKey in this.knownPropertyPaths) {
							oldKnownPropertyPaths[knownKey] = true;
							delete oldUnknownPropertyPaths[knownKey];
						}
						for (var unknownKey in this.unknownPropertyPaths) if (!oldKnownPropertyPaths[unknownKey]) oldUnknownPropertyPaths[unknownKey] = true;
						errorAtEnd = false;
						continue;
					}
					return null;
				}
				if (error) errors.push(error.prefixWith(null, "" + i).prefixWith(null, "anyOf"));
			}
			if (this.trackUnknownProperties) {
				this.unknownPropertyPaths = oldUnknownPropertyPaths;
				this.knownPropertyPaths = oldKnownPropertyPaths;
			}
			if (errorAtEnd) {
				errors = errors.concat(this.errors.slice(startErrorCount));
				this.errors = this.errors.slice(0, startErrorCount);
				return this.createError(ErrorCodes.ANY_OF_MISSING, {}, "", "/anyOf", errors, data, schema);
			}
		};
		ValidatorContext.prototype.validateOneOf = function validateOneOf(data, schema, dataPointerPath) {
			if (schema.oneOf === void 0) return null;
			var validIndex = null;
			var errors = [];
			var startErrorCount = this.errors.length;
			var oldUnknownPropertyPaths, oldKnownPropertyPaths;
			if (this.trackUnknownProperties) {
				oldUnknownPropertyPaths = this.unknownPropertyPaths;
				oldKnownPropertyPaths = this.knownPropertyPaths;
			}
			for (var i = 0; i < schema.oneOf.length; i++) {
				if (this.trackUnknownProperties) {
					this.unknownPropertyPaths = {};
					this.knownPropertyPaths = {};
				}
				var subSchema = schema.oneOf[i];
				var errorCount = this.errors.length;
				var error = this.validateAll(data, subSchema, [], ["oneOf", i], dataPointerPath);
				if (error === null && errorCount === this.errors.length) {
					if (validIndex === null) validIndex = i;
					else {
						this.errors = this.errors.slice(0, startErrorCount);
						return this.createError(ErrorCodes.ONE_OF_MULTIPLE, {
							index1: validIndex,
							index2: i
						}, "", "/oneOf", null, data, schema);
					}
					if (this.trackUnknownProperties) {
						for (var knownKey in this.knownPropertyPaths) {
							oldKnownPropertyPaths[knownKey] = true;
							delete oldUnknownPropertyPaths[knownKey];
						}
						for (var unknownKey in this.unknownPropertyPaths) if (!oldKnownPropertyPaths[unknownKey]) oldUnknownPropertyPaths[unknownKey] = true;
					}
				} else if (error) errors.push(error);
			}
			if (this.trackUnknownProperties) {
				this.unknownPropertyPaths = oldUnknownPropertyPaths;
				this.knownPropertyPaths = oldKnownPropertyPaths;
			}
			if (validIndex === null) {
				errors = errors.concat(this.errors.slice(startErrorCount));
				this.errors = this.errors.slice(0, startErrorCount);
				return this.createError(ErrorCodes.ONE_OF_MISSING, {}, "", "/oneOf", errors, data, schema);
			} else this.errors = this.errors.slice(0, startErrorCount);
			return null;
		};
		ValidatorContext.prototype.validateNot = function validateNot(data, schema, dataPointerPath) {
			if (schema.not === void 0) return null;
			var oldErrorCount = this.errors.length;
			var oldUnknownPropertyPaths, oldKnownPropertyPaths;
			if (this.trackUnknownProperties) {
				oldUnknownPropertyPaths = this.unknownPropertyPaths;
				oldKnownPropertyPaths = this.knownPropertyPaths;
				this.unknownPropertyPaths = {};
				this.knownPropertyPaths = {};
			}
			var error = this.validateAll(data, schema.not, null, null, dataPointerPath);
			var notErrors = this.errors.slice(oldErrorCount);
			this.errors = this.errors.slice(0, oldErrorCount);
			if (this.trackUnknownProperties) {
				this.unknownPropertyPaths = oldUnknownPropertyPaths;
				this.knownPropertyPaths = oldKnownPropertyPaths;
			}
			if (error === null && notErrors.length === 0) return this.createError(ErrorCodes.NOT_PASSED, {}, "", "/not", null, data, schema);
			return null;
		};
		ValidatorContext.prototype.validateHypermedia = function validateCombinations(data, schema, dataPointerPath) {
			if (!schema.links) return null;
			var error;
			for (var i = 0; i < schema.links.length; i++) {
				var ldo = schema.links[i];
				if (ldo.rel === "describedby") {
					var template = new UriTemplate(ldo.href);
					var allPresent = true;
					for (var j = 0; j < template.varNames.length; j++) if (!(template.varNames[j] in data)) {
						allPresent = false;
						break;
					}
					if (allPresent) {
						var subSchema = { "$ref": template.fillFromObject(data) };
						if (error = this.validateAll(data, subSchema, [], ["links", i], dataPointerPath)) return error;
					}
				}
			}
		};
		function parseURI(url) {
			var m = String(url).replace(/^\s+|\s+$/g, "").match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
			return m ? {
				href: m[0] || "",
				protocol: m[1] || "",
				authority: m[2] || "",
				host: m[3] || "",
				hostname: m[4] || "",
				port: m[5] || "",
				pathname: m[6] || "",
				search: m[7] || "",
				hash: m[8] || ""
			} : null;
		}
		function resolveUrl(base, href) {
			function removeDotSegments(input) {
				var output = [];
				input.replace(/^(\.\.?(\/|$))+/, "").replace(/\/(\.(\/|$))+/g, "/").replace(/\/\.\.$/, "/../").replace(/\/?[^\/]*/g, function(p) {
					if (p === "/..") output.pop();
					else output.push(p);
				});
				return output.join("").replace(/^\//, input.charAt(0) === "/" ? "/" : "");
			}
			href = parseURI(href || "");
			base = parseURI(base || "");
			return !href || !base ? null : (href.protocol || base.protocol) + (href.protocol || href.authority ? href.authority : base.authority) + removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === "/" ? href.pathname : href.pathname ? (base.authority && !base.pathname ? "/" : "") + base.pathname.slice(0, base.pathname.lastIndexOf("/") + 1) + href.pathname : base.pathname) + (href.protocol || href.authority || href.pathname ? href.search : href.search || base.search) + href.hash;
		}
		function getDocumentUri(uri) {
			return uri.split("#")[0];
		}
		function normSchema(schema, baseUri) {
			if (schema && typeof schema === "object") {
				if (baseUri === void 0) baseUri = schema.id;
				else if (typeof schema.id === "string") {
					baseUri = resolveUrl(baseUri, schema.id);
					schema.id = baseUri;
				}
				if (Array.isArray(schema)) for (var i = 0; i < schema.length; i++) normSchema(schema[i], baseUri);
				else {
					if (typeof schema["$ref"] === "string") schema["$ref"] = resolveUrl(baseUri, schema["$ref"]);
					for (var key in schema) if (key !== "enum") normSchema(schema[key], baseUri);
				}
			}
		}
		function defaultErrorReporter(language) {
			language = language || "en";
			var errorMessages = languages[language];
			return function(error) {
				var messageTemplate = errorMessages[error.code] || ErrorMessagesDefault[error.code];
				if (typeof messageTemplate !== "string") return "Unknown error code " + error.code + ": " + JSON.stringify(error.messageParams);
				var messageParams = error.params;
				return messageTemplate.replace(/\{([^{}]*)\}/g, function(whole, varName) {
					var subValue = messageParams[varName];
					return typeof subValue === "string" || typeof subValue === "number" ? subValue : whole;
				});
			};
		}
		var ErrorCodes = {
			INVALID_TYPE: 0,
			ENUM_MISMATCH: 1,
			ANY_OF_MISSING: 10,
			ONE_OF_MISSING: 11,
			ONE_OF_MULTIPLE: 12,
			NOT_PASSED: 13,
			NUMBER_MULTIPLE_OF: 100,
			NUMBER_MINIMUM: 101,
			NUMBER_MINIMUM_EXCLUSIVE: 102,
			NUMBER_MAXIMUM: 103,
			NUMBER_MAXIMUM_EXCLUSIVE: 104,
			NUMBER_NOT_A_NUMBER: 105,
			STRING_LENGTH_SHORT: 200,
			STRING_LENGTH_LONG: 201,
			STRING_PATTERN: 202,
			OBJECT_PROPERTIES_MINIMUM: 300,
			OBJECT_PROPERTIES_MAXIMUM: 301,
			OBJECT_REQUIRED: 302,
			OBJECT_ADDITIONAL_PROPERTIES: 303,
			OBJECT_DEPENDENCY_KEY: 304,
			ARRAY_LENGTH_SHORT: 400,
			ARRAY_LENGTH_LONG: 401,
			ARRAY_UNIQUE: 402,
			ARRAY_ADDITIONAL_ITEMS: 403,
			FORMAT_CUSTOM: 500,
			KEYWORD_CUSTOM: 501,
			CIRCULAR_REFERENCE: 600,
			UNKNOWN_PROPERTY: 1e3
		};
		var ErrorCodeLookup = {};
		for (var key in ErrorCodes) ErrorCodeLookup[ErrorCodes[key]] = key;
		var ErrorMessagesDefault = {
			INVALID_TYPE: "Invalid type: {type} (expected {expected})",
			ENUM_MISMATCH: "No enum match for: {value}",
			ANY_OF_MISSING: "Data does not match any schemas from \"anyOf\"",
			ONE_OF_MISSING: "Data does not match any schemas from \"oneOf\"",
			ONE_OF_MULTIPLE: "Data is valid against more than one schema from \"oneOf\": indices {index1} and {index2}",
			NOT_PASSED: "Data matches schema from \"not\"",
			NUMBER_MULTIPLE_OF: "Value {value} is not a multiple of {multipleOf}",
			NUMBER_MINIMUM: "Value {value} is less than minimum {minimum}",
			NUMBER_MINIMUM_EXCLUSIVE: "Value {value} is equal to exclusive minimum {minimum}",
			NUMBER_MAXIMUM: "Value {value} is greater than maximum {maximum}",
			NUMBER_MAXIMUM_EXCLUSIVE: "Value {value} is equal to exclusive maximum {maximum}",
			NUMBER_NOT_A_NUMBER: "Value {value} is not a valid number",
			STRING_LENGTH_SHORT: "String is too short ({length} chars), minimum {minimum}",
			STRING_LENGTH_LONG: "String is too long ({length} chars), maximum {maximum}",
			STRING_PATTERN: "String does not match pattern: {pattern}",
			OBJECT_PROPERTIES_MINIMUM: "Too few properties defined ({propertyCount}), minimum {minimum}",
			OBJECT_PROPERTIES_MAXIMUM: "Too many properties defined ({propertyCount}), maximum {maximum}",
			OBJECT_REQUIRED: "Missing required property: {key}",
			OBJECT_ADDITIONAL_PROPERTIES: "Additional properties not allowed",
			OBJECT_DEPENDENCY_KEY: "Dependency failed - key must exist: {missing} (due to key: {key})",
			ARRAY_LENGTH_SHORT: "Array is too short ({length}), minimum {minimum}",
			ARRAY_LENGTH_LONG: "Array is too long ({length}), maximum {maximum}",
			ARRAY_UNIQUE: "Array items are not unique (indices {match1} and {match2})",
			ARRAY_ADDITIONAL_ITEMS: "Additional items not allowed",
			FORMAT_CUSTOM: "Format validation failed ({message})",
			KEYWORD_CUSTOM: "Keyword failed: {key} ({message})",
			CIRCULAR_REFERENCE: "Circular $refs: {urls}",
			UNKNOWN_PROPERTY: "Unknown property (not in schema)"
		};
		function ValidationError(code, params, dataPath, schemaPath, subErrors) {
			Error.call(this);
			if (code === void 0) throw new Error("No error code supplied: " + schemaPath);
			this.message = "";
			this.params = params;
			this.code = code;
			this.dataPath = dataPath || "";
			this.schemaPath = schemaPath || "";
			this.subErrors = subErrors || null;
			var err = new Error(this.message);
			this.stack = err.stack || err.stacktrace;
			if (!this.stack) try {
				throw err;
			} catch (err) {
				this.stack = err.stack || err.stacktrace;
			}
		}
		ValidationError.prototype = Object.create(Error.prototype);
		ValidationError.prototype.constructor = ValidationError;
		ValidationError.prototype.name = "ValidationError";
		ValidationError.prototype.prefixWith = function(dataPrefix, schemaPrefix) {
			if (dataPrefix !== null) {
				dataPrefix = dataPrefix.replace(/~/g, "~0").replace(/\//g, "~1");
				this.dataPath = "/" + dataPrefix + this.dataPath;
			}
			if (schemaPrefix !== null) {
				schemaPrefix = schemaPrefix.replace(/~/g, "~0").replace(/\//g, "~1");
				this.schemaPath = "/" + schemaPrefix + this.schemaPath;
			}
			if (this.subErrors !== null) for (var i = 0; i < this.subErrors.length; i++) this.subErrors[i].prefixWith(dataPrefix, schemaPrefix);
			return this;
		};
		function isTrustedUrl(baseUrl, testUrl) {
			if (testUrl.substring(0, baseUrl.length) === baseUrl) {
				var remainder = testUrl.substring(baseUrl.length);
				if (testUrl.length > 0 && testUrl.charAt(baseUrl.length - 1) === "/" || remainder.charAt(0) === "#" || remainder.charAt(0) === "?") return true;
			}
			return false;
		}
		var languages = {};
		function createApi(language) {
			var globalContext = new ValidatorContext();
			var currentLanguage;
			var customErrorReporter;
			var api = {
				setErrorReporter: function(reporter) {
					if (typeof reporter === "string") return this.language(reporter);
					customErrorReporter = reporter;
					return true;
				},
				addFormat: function() {
					globalContext.addFormat.apply(globalContext, arguments);
				},
				language: function(code) {
					if (!code) return currentLanguage;
					if (!languages[code]) code = code.split("-")[0];
					if (languages[code]) {
						currentLanguage = code;
						return code;
					}
					return false;
				},
				addLanguage: function(code, messageMap) {
					var key;
					for (key in ErrorCodes) if (messageMap[key] && !messageMap[ErrorCodes[key]]) messageMap[ErrorCodes[key]] = messageMap[key];
					var rootCode = code.split("-")[0];
					if (!languages[rootCode]) {
						languages[code] = messageMap;
						languages[rootCode] = messageMap;
					} else {
						languages[code] = Object.create(languages[rootCode]);
						for (key in messageMap) {
							if (typeof languages[rootCode][key] === "undefined") languages[rootCode][key] = messageMap[key];
							languages[code][key] = messageMap[key];
						}
					}
					return this;
				},
				freshApi: function(language) {
					var result = createApi();
					if (language) result.language(language);
					return result;
				},
				validate: function(data, schema, checkRecursive, banUnknownProperties) {
					var def = defaultErrorReporter(currentLanguage);
					var context = new ValidatorContext(globalContext, false, customErrorReporter ? function(error, data, schema) {
						return customErrorReporter(error, data, schema) || def(error, data, schema);
					} : def, checkRecursive, banUnknownProperties);
					if (typeof schema === "string") schema = { "$ref": schema };
					context.addSchema("", schema);
					var error = context.validateAll(data, schema, null, null, "");
					if (!error && banUnknownProperties) error = context.banUnknownProperties(data, schema);
					this.error = error;
					this.missing = context.missing;
					this.valid = error === null;
					return this.valid;
				},
				validateResult: function() {
					var result = { toString: function() {
						return this.valid ? "valid" : this.error.message;
					} };
					this.validate.apply(result, arguments);
					return result;
				},
				validateMultiple: function(data, schema, checkRecursive, banUnknownProperties) {
					var def = defaultErrorReporter(currentLanguage);
					var context = new ValidatorContext(globalContext, true, customErrorReporter ? function(error, data, schema) {
						return customErrorReporter(error, data, schema) || def(error, data, schema);
					} : def, checkRecursive, banUnknownProperties);
					if (typeof schema === "string") schema = { "$ref": schema };
					context.addSchema("", schema);
					context.validateAll(data, schema, null, null, "");
					if (banUnknownProperties) context.banUnknownProperties(data, schema);
					var result = { toString: function() {
						return this.valid ? "valid" : this.error.message;
					} };
					result.errors = context.errors;
					result.missing = context.missing;
					result.valid = result.errors.length === 0;
					return result;
				},
				addSchema: function() {
					return globalContext.addSchema.apply(globalContext, arguments);
				},
				getSchema: function() {
					return globalContext.getSchema.apply(globalContext, arguments);
				},
				getSchemaMap: function() {
					return globalContext.getSchemaMap.apply(globalContext, arguments);
				},
				getSchemaUris: function() {
					return globalContext.getSchemaUris.apply(globalContext, arguments);
				},
				getMissingUris: function() {
					return globalContext.getMissingUris.apply(globalContext, arguments);
				},
				dropSchemas: function() {
					globalContext.dropSchemas.apply(globalContext, arguments);
				},
				defineKeyword: function() {
					globalContext.defineKeyword.apply(globalContext, arguments);
				},
				defineError: function(codeName, codeNumber, defaultMessage) {
					if (typeof codeName !== "string" || !/^[A-Z]+(_[A-Z]+)*$/.test(codeName)) throw new Error("Code name must be a string in UPPER_CASE_WITH_UNDERSCORES");
					if (typeof codeNumber !== "number" || codeNumber % 1 !== 0 || codeNumber < 1e4) throw new Error("Code number must be an integer > 10000");
					if (typeof ErrorCodes[codeName] !== "undefined") throw new Error("Error already defined: " + codeName + " as " + ErrorCodes[codeName]);
					if (typeof ErrorCodeLookup[codeNumber] !== "undefined") throw new Error("Error code already used: " + ErrorCodeLookup[codeNumber] + " as " + codeNumber);
					ErrorCodes[codeName] = codeNumber;
					ErrorCodeLookup[codeNumber] = codeName;
					ErrorMessagesDefault[codeName] = ErrorMessagesDefault[codeNumber] = defaultMessage;
					for (var langCode in languages) {
						var language = languages[langCode];
						if (language[codeName]) language[codeNumber] = language[codeNumber] || language[codeName];
					}
				},
				reset: function() {
					globalContext.reset();
					this.error = null;
					this.missing = [];
					this.valid = true;
				},
				missing: [],
				error: null,
				valid: true,
				normSchema,
				resolveUrl,
				getDocumentUri,
				errorCodes: ErrorCodes
			};
			api.language(language || "en");
			return api;
		}
		var tv4 = createApi();
		tv4.addLanguage("en-gb", ErrorMessagesDefault);
		tv4.tv4 = tv4;
		return tv4;
	});
}));
//#endregion
//#region node_modules/fbp/schema/graph.json
var require_graph = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		"$schema": "http://json-schema.org/draft-04/schema",
		"id": "graph.json",
		"title": "FBP graph",
		"description": "A graph of FBP processes and connections between them.\nThis is the primary way of specifying FBP programs.\n",
		"name": "graph",
		"type": "object",
		"additionalProperties": false,
		"properties": {
			"caseSensitive": {
				"type": "boolean",
				"description": "Whether the graph port identifiers should be treated as case-sensitive"
			},
			"properties": {
				"type": "object",
				"description": "User-defined properties attached to the graph.",
				"additionalProperties": true,
				"properties": {
					"name": {
						"type": "string",
						"description": "Name of the graph"
					},
					"environment": {
						"type": "object",
						"description": "Information about the execution environment for the graph",
						"additionalProperties": true,
						"required": ["type"],
						"properties": {
							"type": {
								"type": "string",
								"description": "Runtime type the graph is for",
								"example": "noflo-nodejs"
							},
							"content": {
								"type": "string",
								"description": "HTML fixture for browser-based graphs"
							}
						}
					},
					"description": {
						"type": "string",
						"description": "Graph description"
					},
					"icon": {
						"type": "string",
						"description": "Name of the icon that can be used for depicting the graph"
					}
				}
			},
			"inports": {
				"type": ["object", "undefined"],
				"description": "Exported inports of the graph",
				"additionalProperties": true,
				"patternProperties": { "[a-z0-9]+": {
					"type": "object",
					"properties": {
						"process": { "type": "string" },
						"port": { "type": "string" },
						"metadata": {
							"type": "object",
							"additionalProperties": true,
							"required": [],
							"properties": {
								"x": {
									"type": "integer",
									"description": "X coordinate of a graph inport"
								},
								"y": {
									"type": "integer",
									"description": "Y coordinate of a graph inport"
								}
							}
						}
					}
				} }
			},
			"outports": {
				"type": ["object", "undefined"],
				"description": "Exported outports of the graph",
				"additionalProperties": true,
				"patternProperties": { "[a-z0-9]+": {
					"type": "object",
					"properties": {
						"process": { "type": "string" },
						"port": { "type": "string" },
						"metadata": {
							"type": "object",
							"required": [],
							"additionalProperties": true,
							"properties": {
								"x": {
									"type": "integer",
									"description": "X coordinate of a graph outport"
								},
								"y": {
									"type": "integer",
									"description": "Y coordinate of a graph outport"
								}
							}
						}
					}
				} }
			},
			"groups": {
				"type": "array",
				"description": "List of groups of processes",
				"items": {
					"type": "object",
					"additionalProperties": false,
					"properties": {
						"name": { "type": "string" },
						"nodes": {
							"type": "array",
							"items": { "type": "string" }
						},
						"metadata": {
							"type": "object",
							"additionalProperties": true,
							"required": [],
							"properties": { "description": { "type": "string" } }
						}
					}
				}
			},
			"processes": {
				"type": "object",
				"description": "The processes of this graph.\nEach process is an instance of a component.\n",
				"additionalProperties": false,
				"patternProperties": { "[a-zA-Z0-9_]+": {
					"type": "object",
					"properties": {
						"component": { "type": "string" },
						"metadata": {
							"type": "object",
							"additionalProperties": true,
							"required": [],
							"properties": {
								"x": {
									"type": "integer",
									"description": "X coordinate of a graph node"
								},
								"y": {
									"type": "integer",
									"description": "Y coordinate of a graph node"
								}
							}
						}
					}
				} }
			},
			"connections": {
				"type": "array",
				"description": "Connections of the graph.\nA connection either connects ports of two processes, or specifices an IIP as initial input packet to a port.\n",
				"items": {
					"type": "object",
					"additionalProperties": false,
					"properties": {
						"src": {
							"type": "object",
							"additionalProperties": false,
							"properties": {
								"process": { "type": "string" },
								"port": { "type": "string" },
								"index": { "type": "integer" }
							}
						},
						"tgt": {
							"type": "object",
							"additionalProperties": false,
							"properties": {
								"process": { "type": "string" },
								"port": { "type": "string" },
								"index": { "type": "integer" }
							}
						},
						"data": {},
						"metadata": {
							"type": "object",
							"additionalProperties": true,
							"required": [],
							"properties": {
								"route": {
									"type": "integer",
									"description": "Route identifier of a graph edge"
								},
								"schema": {
									"type": "string",
									"format": "uri",
									"description": "JSON schema associated with a graph edge"
								},
								"secure": {
									"type": "boolean",
									"description": "Whether edge data should be treated as secure"
								}
							}
						}
					}
				}
			}
		}
	};
}));
//#endregion
//#region node_modules/fbp/lib/fbp.js
var require_fbp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = (function() {
		"use strict";
		function peg$subclass(child, parent) {
			function ctor() {
				this.constructor = child;
			}
			ctor.prototype = parent.prototype;
			child.prototype = new ctor();
		}
		function peg$SyntaxError(message, expected, found, location) {
			this.message = message;
			this.expected = expected;
			this.found = found;
			this.location = location;
			this.name = "SyntaxError";
			if (typeof Error.captureStackTrace === "function") Error.captureStackTrace(this, peg$SyntaxError);
		}
		peg$subclass(peg$SyntaxError, Error);
		function peg$parse(input) {
			var options = arguments.length > 1 ? arguments[1] : {}, parser = this, peg$FAILED = {}, peg$startRuleFunctions = { start: peg$parsestart }, peg$startRuleFunction = peg$parsestart, peg$c0 = function() {
				return parser.getResult();
			}, peg$c1 = "INPORT=", peg$c2 = {
				type: "literal",
				value: "INPORT=",
				description: "\"INPORT=\""
			}, peg$c3 = ".", peg$c4 = {
				type: "literal",
				value: ".",
				description: "\".\""
			}, peg$c5 = ":", peg$c6 = {
				type: "literal",
				value: ":",
				description: "\":\""
			}, peg$c7 = function(node, port, pub) {
				return parser.registerInports(node, port, pub);
			}, peg$c8 = "OUTPORT=", peg$c9 = {
				type: "literal",
				value: "OUTPORT=",
				description: "\"OUTPORT=\""
			}, peg$c10 = function(node, port, pub) {
				return parser.registerOutports(node, port, pub);
			}, peg$c11 = "DEFAULT_INPORT=", peg$c12 = {
				type: "literal",
				value: "DEFAULT_INPORT=",
				description: "\"DEFAULT_INPORT=\""
			}, peg$c13 = function(name) {
				defaultInPort = name;
			}, peg$c14 = "DEFAULT_OUTPORT=", peg$c15 = {
				type: "literal",
				value: "DEFAULT_OUTPORT=",
				description: "\"DEFAULT_OUTPORT=\""
			}, peg$c16 = function(name) {
				defaultOutPort = name;
			}, peg$c17 = function(annotation) {
				return parser.registerAnnotation(annotation[0], annotation[1]);
			}, peg$c18 = function(edges) {
				return parser.registerEdges(edges);
			}, peg$c19 = ",", peg$c20 = {
				type: "literal",
				value: ",",
				description: "\",\""
			}, peg$c21 = /^[\n\r\u2028\u2029]/, peg$c22 = {
				type: "class",
				value: "[\\n\\r\\u2028\\u2029]",
				description: "[\\n\\r\\u2028\\u2029]"
			}, peg$c23 = "#", peg$c24 = {
				type: "literal",
				value: "#",
				description: "\"#\""
			}, peg$c25 = "->", peg$c26 = {
				type: "literal",
				value: "->",
				description: "\"->\""
			}, peg$c27 = function(x, y) {
				return [x, y];
			}, peg$c28 = function(x, proc, y) {
				return [{ "tgt": makeInPort(proc, x) }, { "src": makeOutPort(proc, y) }];
			}, peg$c29 = function(proc, port) {
				return { "src": makeOutPort(proc, port) };
			}, peg$c30 = function(port, proc) {
				return { "tgt": makeInPort(proc, port) };
			}, peg$c31 = "'", peg$c32 = {
				type: "literal",
				value: "'",
				description: "\"'\""
			}, peg$c33 = function(iip) {
				return { "data": iip.join("") };
			}, peg$c34 = function(iip) {
				return { "data": iip };
			}, peg$c35 = function(name) {
				return name;
			}, peg$c36 = /^[a-zA-Z_]/, peg$c37 = {
				type: "class",
				value: "[a-zA-Z_]",
				description: "[a-zA-Z_]"
			}, peg$c38 = /^[a-zA-Z0-9_\-]/, peg$c39 = {
				type: "class",
				value: "[a-zA-Z0-9_\\-]",
				description: "[a-zA-Z0-9_\\-]"
			}, peg$c40 = function(name) {
				return makeName(name);
			}, peg$c41 = function(name, comp) {
				parser.addNode(name, comp);
				return name;
			}, peg$c42 = function(comp) {
				return parser.addAnonymousNode(comp, location().start.offset);
			}, peg$c43 = "(", peg$c44 = {
				type: "literal",
				value: "(",
				description: "\"(\""
			}, peg$c45 = /^[a-zA-Z\/\-0-9_]/, peg$c46 = {
				type: "class",
				value: "[a-zA-Z/\\-0-9_]",
				description: "[a-zA-Z/\\-0-9_]"
			}, peg$c47 = ")", peg$c48 = {
				type: "literal",
				value: ")",
				description: "\")\""
			}, peg$c49 = function(comp, meta) {
				var o = {};
				comp ? o.comp = comp.join("") : o.comp = "";
				meta && (o.meta = meta.join("").split(","));
				return o;
			}, peg$c50 = /^[a-zA-Z\/=_,0-9]/, peg$c51 = {
				type: "class",
				value: "[a-zA-Z/=_,0-9]",
				description: "[a-zA-Z/=_,0-9]"
			}, peg$c52 = function(meta) {
				return meta;
			}, peg$c53 = "@", peg$c54 = {
				type: "literal",
				value: "@",
				description: "\"@\""
			}, peg$c55 = /^[a-zA-Z0-9\-_]/, peg$c56 = {
				type: "class",
				value: "[a-zA-Z0-9\\-_]",
				description: "[a-zA-Z0-9\\-_]"
			}, peg$c57 = /^[a-zA-Z0-9\-_ .]/, peg$c58 = {
				type: "class",
				value: "[a-zA-Z0-9\\-_ \\.]",
				description: "[a-zA-Z0-9\\-_ \\.]"
			}, peg$c59 = function(key, value) {
				return [key.join(""), value.join("")];
			}, peg$c60 = function(portname, portindex) {
				return {
					port: options.caseSensitive ? portname : portname.toLowerCase(),
					index: portindex != null ? portindex : void 0
				};
			}, peg$c61 = function(port) {
				return port;
			}, peg$c62 = /^[a-zA-Z.0-9_]/, peg$c63 = {
				type: "class",
				value: "[a-zA-Z.0-9_]",
				description: "[a-zA-Z.0-9_]"
			}, peg$c64 = function(portname) {
				return makeName(portname);
			}, peg$c65 = "[", peg$c66 = {
				type: "literal",
				value: "[",
				description: "\"[\""
			}, peg$c67 = /^[0-9]/, peg$c68 = {
				type: "class",
				value: "[0-9]",
				description: "[0-9]"
			}, peg$c69 = "]", peg$c70 = {
				type: "literal",
				value: "]",
				description: "\"]\""
			}, peg$c71 = function(portindex) {
				return parseInt(portindex.join(""));
			}, peg$c72 = /^[^\n\r\u2028\u2029]/, peg$c73 = {
				type: "class",
				value: "[^\\n\\r\\u2028\\u2029]",
				description: "[^\\n\\r\\u2028\\u2029]"
			}, peg$c74 = /^[\\]/, peg$c75 = {
				type: "class",
				value: "[\\\\]",
				description: "[\\\\]"
			}, peg$c76 = /^[']/, peg$c77 = {
				type: "class",
				value: "[']",
				description: "[']"
			}, peg$c78 = function() {
				return "'";
			}, peg$c79 = /^[^']/, peg$c80 = {
				type: "class",
				value: "[^']",
				description: "[^']"
			}, peg$c81 = " ", peg$c82 = {
				type: "literal",
				value: " ",
				description: "\" \""
			}, peg$c83 = function(value) {
				return value;
			}, peg$c84 = "{", peg$c85 = {
				type: "literal",
				value: "{",
				description: "\"{\""
			}, peg$c86 = "}", peg$c87 = {
				type: "literal",
				value: "}",
				description: "\"}\""
			}, peg$c88 = {
				type: "other",
				description: "whitespace"
			}, peg$c89 = /^[ \t\n\r]/, peg$c90 = {
				type: "class",
				value: "[ \\t\\n\\r]",
				description: "[ \\t\\n\\r]"
			}, peg$c91 = "false", peg$c92 = {
				type: "literal",
				value: "false",
				description: "\"false\""
			}, peg$c93 = function() {
				return false;
			}, peg$c94 = "null", peg$c95 = {
				type: "literal",
				value: "null",
				description: "\"null\""
			}, peg$c96 = function() {
				return null;
			}, peg$c97 = "true", peg$c98 = {
				type: "literal",
				value: "true",
				description: "\"true\""
			}, peg$c99 = function() {
				return true;
			}, peg$c100 = function(head, m) {
				return m;
			}, peg$c101 = function(head, tail) {
				var result = {}, i;
				result[head.name] = head.value;
				for (i = 0; i < tail.length; i++) result[tail[i].name] = tail[i].value;
				return result;
			}, peg$c102 = function(members) {
				return members !== null ? members : {};
			}, peg$c103 = function(name, value) {
				return {
					name,
					value
				};
			}, peg$c104 = function(head, v) {
				return v;
			}, peg$c105 = function(head, tail) {
				return [head].concat(tail);
			}, peg$c106 = function(values) {
				return values !== null ? values : [];
			}, peg$c107 = {
				type: "other",
				description: "number"
			}, peg$c108 = function() {
				return parseFloat(text());
			}, peg$c109 = /^[1-9]/, peg$c110 = {
				type: "class",
				value: "[1-9]",
				description: "[1-9]"
			}, peg$c111 = /^[eE]/, peg$c112 = {
				type: "class",
				value: "[eE]",
				description: "[eE]"
			}, peg$c113 = "-", peg$c114 = {
				type: "literal",
				value: "-",
				description: "\"-\""
			}, peg$c115 = "+", peg$c116 = {
				type: "literal",
				value: "+",
				description: "\"+\""
			}, peg$c117 = "0", peg$c118 = {
				type: "literal",
				value: "0",
				description: "\"0\""
			}, peg$c119 = {
				type: "other",
				description: "string"
			}, peg$c120 = function(chars) {
				return chars.join("");
			}, peg$c121 = "\"", peg$c122 = {
				type: "literal",
				value: "\"",
				description: "\"\\\"\""
			}, peg$c123 = "\\", peg$c124 = {
				type: "literal",
				value: "\\",
				description: "\"\\\\\""
			}, peg$c125 = "/", peg$c126 = {
				type: "literal",
				value: "/",
				description: "\"/\""
			}, peg$c127 = "b", peg$c128 = {
				type: "literal",
				value: "b",
				description: "\"b\""
			}, peg$c129 = function() {
				return "\b";
			}, peg$c130 = "f", peg$c131 = {
				type: "literal",
				value: "f",
				description: "\"f\""
			}, peg$c132 = function() {
				return "\f";
			}, peg$c133 = "n", peg$c134 = {
				type: "literal",
				value: "n",
				description: "\"n\""
			}, peg$c135 = function() {
				return "\n";
			}, peg$c136 = "r", peg$c137 = {
				type: "literal",
				value: "r",
				description: "\"r\""
			}, peg$c138 = function() {
				return "\r";
			}, peg$c139 = "t", peg$c140 = {
				type: "literal",
				value: "t",
				description: "\"t\""
			}, peg$c141 = function() {
				return "	";
			}, peg$c142 = "u", peg$c143 = {
				type: "literal",
				value: "u",
				description: "\"u\""
			}, peg$c144 = function(digits) {
				return String.fromCharCode(parseInt(digits, 16));
			}, peg$c145 = function(sequence) {
				return sequence;
			}, peg$c146 = /^[^\0-\x1F"\\]/, peg$c147 = {
				type: "class",
				value: "[^\\0-\\x1F\\x22\\x5C]",
				description: "[^\\0-\\x1F\\x22\\x5C]"
			}, peg$c148 = /^[0-9a-f]/i, peg$c149 = {
				type: "class",
				value: "[0-9a-f]i",
				description: "[0-9a-f]i"
			}, peg$currPos = 0, peg$savedPos = 0, peg$posDetailsCache = [{
				line: 1,
				column: 1,
				seenCR: false
			}], peg$maxFailPos = 0, peg$maxFailExpected = [], peg$silentFails = 0, peg$result;
			if ("startRule" in options) {
				if (!(options.startRule in peg$startRuleFunctions)) throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
				peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
			}
			function text() {
				return input.substring(peg$savedPos, peg$currPos);
			}
			function location() {
				return peg$computeLocation(peg$savedPos, peg$currPos);
			}
			function peg$computePosDetails(pos) {
				var details = peg$posDetailsCache[pos], p, ch;
				if (details) return details;
				else {
					p = pos - 1;
					while (!peg$posDetailsCache[p]) p--;
					details = peg$posDetailsCache[p];
					details = {
						line: details.line,
						column: details.column,
						seenCR: details.seenCR
					};
					while (p < pos) {
						ch = input.charAt(p);
						if (ch === "\n") {
							if (!details.seenCR) details.line++;
							details.column = 1;
							details.seenCR = false;
						} else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
							details.line++;
							details.column = 1;
							details.seenCR = true;
						} else {
							details.column++;
							details.seenCR = false;
						}
						p++;
					}
					peg$posDetailsCache[pos] = details;
					return details;
				}
			}
			function peg$computeLocation(startPos, endPos) {
				var startPosDetails = peg$computePosDetails(startPos), endPosDetails = peg$computePosDetails(endPos);
				return {
					start: {
						offset: startPos,
						line: startPosDetails.line,
						column: startPosDetails.column
					},
					end: {
						offset: endPos,
						line: endPosDetails.line,
						column: endPosDetails.column
					}
				};
			}
			function peg$fail(expected) {
				if (peg$currPos < peg$maxFailPos) return;
				if (peg$currPos > peg$maxFailPos) {
					peg$maxFailPos = peg$currPos;
					peg$maxFailExpected = [];
				}
				peg$maxFailExpected.push(expected);
			}
			function peg$buildException(message, expected, found, location) {
				function cleanupExpected(expected) {
					var i = 1;
					expected.sort(function(a, b) {
						if (a.description < b.description) return -1;
						else if (a.description > b.description) return 1;
						else return 0;
					});
					while (i < expected.length) if (expected[i - 1] === expected[i]) expected.splice(i, 1);
					else i++;
				}
				function buildMessage(expected, found) {
					function stringEscape(s) {
						function hex(ch) {
							return ch.charCodeAt(0).toString(16).toUpperCase();
						}
						return s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\x08/g, "\\b").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\f/g, "\\f").replace(/\r/g, "\\r").replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) {
							return "\\x0" + hex(ch);
						}).replace(/[\x10-\x1F\x80-\xFF]/g, function(ch) {
							return "\\x" + hex(ch);
						}).replace(/[\u0100-\u0FFF]/g, function(ch) {
							return "\\u0" + hex(ch);
						}).replace(/[\u1000-\uFFFF]/g, function(ch) {
							return "\\u" + hex(ch);
						});
					}
					var expectedDescs = new Array(expected.length), expectedDesc, foundDesc, i;
					for (i = 0; i < expected.length; i++) expectedDescs[i] = expected[i].description;
					expectedDesc = expected.length > 1 ? expectedDescs.slice(0, -1).join(", ") + " or " + expectedDescs[expected.length - 1] : expectedDescs[0];
					foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";
					return "Expected " + expectedDesc + " but " + foundDesc + " found.";
				}
				if (expected !== null) cleanupExpected(expected);
				return new peg$SyntaxError(message !== null ? message : buildMessage(expected, found), expected, found, location);
			}
			function peg$parsestart() {
				var s0 = peg$currPos, s1 = [], s2 = peg$parseline();
				while (s2 !== peg$FAILED) {
					s1.push(s2);
					s2 = peg$parseline();
				}
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c0();
				}
				s0 = s1;
				return s0;
			}
			function peg$parseline() {
				var s0 = peg$currPos, s1 = peg$parse_(), s2, s3, s4, s5, s6, s7, s8, s9;
				if (s1 !== peg$FAILED) {
					if (input.substr(peg$currPos, 7) === peg$c1) {
						s2 = peg$c1;
						peg$currPos += 7;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c2);
					}
					if (s2 !== peg$FAILED) {
						s3 = peg$parsenode();
						if (s3 !== peg$FAILED) {
							if (input.charCodeAt(peg$currPos) === 46) {
								s4 = peg$c3;
								peg$currPos++;
							} else {
								s4 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c4);
							}
							if (s4 !== peg$FAILED) {
								s5 = peg$parseportName();
								if (s5 !== peg$FAILED) {
									if (input.charCodeAt(peg$currPos) === 58) {
										s6 = peg$c5;
										peg$currPos++;
									} else {
										s6 = peg$FAILED;
										if (peg$silentFails === 0) peg$fail(peg$c6);
									}
									if (s6 !== peg$FAILED) {
										s7 = peg$parseportName();
										if (s7 !== peg$FAILED) {
											s8 = peg$parse_();
											if (s8 !== peg$FAILED) {
												s9 = peg$parseLineTerminator();
												if (s9 === peg$FAILED) s9 = null;
												if (s9 !== peg$FAILED) {
													peg$savedPos = s0;
													s1 = peg$c7(s3, s5, s7);
													s0 = s1;
												} else {
													peg$currPos = s0;
													s0 = peg$FAILED;
												}
											} else {
												peg$currPos = s0;
												s0 = peg$FAILED;
											}
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					s1 = peg$parse_();
					if (s1 !== peg$FAILED) {
						if (input.substr(peg$currPos, 8) === peg$c8) {
							s2 = peg$c8;
							peg$currPos += 8;
						} else {
							s2 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c9);
						}
						if (s2 !== peg$FAILED) {
							s3 = peg$parsenode();
							if (s3 !== peg$FAILED) {
								if (input.charCodeAt(peg$currPos) === 46) {
									s4 = peg$c3;
									peg$currPos++;
								} else {
									s4 = peg$FAILED;
									if (peg$silentFails === 0) peg$fail(peg$c4);
								}
								if (s4 !== peg$FAILED) {
									s5 = peg$parseportName();
									if (s5 !== peg$FAILED) {
										if (input.charCodeAt(peg$currPos) === 58) {
											s6 = peg$c5;
											peg$currPos++;
										} else {
											s6 = peg$FAILED;
											if (peg$silentFails === 0) peg$fail(peg$c6);
										}
										if (s6 !== peg$FAILED) {
											s7 = peg$parseportName();
											if (s7 !== peg$FAILED) {
												s8 = peg$parse_();
												if (s8 !== peg$FAILED) {
													s9 = peg$parseLineTerminator();
													if (s9 === peg$FAILED) s9 = null;
													if (s9 !== peg$FAILED) {
														peg$savedPos = s0;
														s1 = peg$c10(s3, s5, s7);
														s0 = s1;
													} else {
														peg$currPos = s0;
														s0 = peg$FAILED;
													}
												} else {
													peg$currPos = s0;
													s0 = peg$FAILED;
												}
											} else {
												peg$currPos = s0;
												s0 = peg$FAILED;
											}
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
					if (s0 === peg$FAILED) {
						s0 = peg$currPos;
						s1 = peg$parse_();
						if (s1 !== peg$FAILED) {
							if (input.substr(peg$currPos, 15) === peg$c11) {
								s2 = peg$c11;
								peg$currPos += 15;
							} else {
								s2 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c12);
							}
							if (s2 !== peg$FAILED) {
								s3 = peg$parseportName();
								if (s3 !== peg$FAILED) {
									s4 = peg$parse_();
									if (s4 !== peg$FAILED) {
										s5 = peg$parseLineTerminator();
										if (s5 === peg$FAILED) s5 = null;
										if (s5 !== peg$FAILED) {
											peg$savedPos = s0;
											s1 = peg$c13(s3);
											s0 = s1;
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
						if (s0 === peg$FAILED) {
							s0 = peg$currPos;
							s1 = peg$parse_();
							if (s1 !== peg$FAILED) {
								if (input.substr(peg$currPos, 16) === peg$c14) {
									s2 = peg$c14;
									peg$currPos += 16;
								} else {
									s2 = peg$FAILED;
									if (peg$silentFails === 0) peg$fail(peg$c15);
								}
								if (s2 !== peg$FAILED) {
									s3 = peg$parseportName();
									if (s3 !== peg$FAILED) {
										s4 = peg$parse_();
										if (s4 !== peg$FAILED) {
											s5 = peg$parseLineTerminator();
											if (s5 === peg$FAILED) s5 = null;
											if (s5 !== peg$FAILED) {
												peg$savedPos = s0;
												s1 = peg$c16(s3);
												s0 = s1;
											} else {
												peg$currPos = s0;
												s0 = peg$FAILED;
											}
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
							if (s0 === peg$FAILED) {
								s0 = peg$currPos;
								s1 = peg$parseannotation();
								if (s1 !== peg$FAILED) {
									s2 = peg$parsenewline();
									if (s2 !== peg$FAILED) {
										peg$savedPos = s0;
										s1 = peg$c17(s1);
										s0 = s1;
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
								if (s0 === peg$FAILED) {
									s0 = peg$currPos;
									s1 = peg$parsecomment();
									if (s1 !== peg$FAILED) {
										s2 = peg$parsenewline();
										if (s2 === peg$FAILED) s2 = null;
										if (s2 !== peg$FAILED) {
											s1 = [s1, s2];
											s0 = s1;
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
									if (s0 === peg$FAILED) {
										s0 = peg$currPos;
										s1 = peg$parse_();
										if (s1 !== peg$FAILED) {
											s2 = peg$parsenewline();
											if (s2 !== peg$FAILED) {
												s1 = [s1, s2];
												s0 = s1;
											} else {
												peg$currPos = s0;
												s0 = peg$FAILED;
											}
										} else {
											peg$currPos = s0;
											s0 = peg$FAILED;
										}
										if (s0 === peg$FAILED) {
											s0 = peg$currPos;
											s1 = peg$parse_();
											if (s1 !== peg$FAILED) {
												s2 = peg$parseconnection();
												if (s2 !== peg$FAILED) {
													s3 = peg$parse_();
													if (s3 !== peg$FAILED) {
														s4 = peg$parseLineTerminator();
														if (s4 === peg$FAILED) s4 = null;
														if (s4 !== peg$FAILED) {
															peg$savedPos = s0;
															s1 = peg$c18(s2);
															s0 = s1;
														} else {
															peg$currPos = s0;
															s0 = peg$FAILED;
														}
													} else {
														peg$currPos = s0;
														s0 = peg$FAILED;
													}
												} else {
													peg$currPos = s0;
													s0 = peg$FAILED;
												}
											} else {
												peg$currPos = s0;
												s0 = peg$FAILED;
											}
										}
									}
								}
							}
						}
					}
				}
				return s0;
			}
			function peg$parseLineTerminator() {
				var s0 = peg$currPos, s1 = peg$parse_(), s2, s3, s4;
				if (s1 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 44) {
						s2 = peg$c19;
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c20);
					}
					if (s2 === peg$FAILED) s2 = null;
					if (s2 !== peg$FAILED) {
						s3 = peg$parsecomment();
						if (s3 === peg$FAILED) s3 = null;
						if (s3 !== peg$FAILED) {
							s4 = peg$parsenewline();
							if (s4 === peg$FAILED) s4 = null;
							if (s4 !== peg$FAILED) {
								s1 = [
									s1,
									s2,
									s3,
									s4
								];
								s0 = s1;
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsenewline() {
				var s0;
				if (peg$c21.test(input.charAt(peg$currPos))) {
					s0 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c22);
				}
				return s0;
			}
			function peg$parsecomment() {
				var s0 = peg$currPos, s1 = peg$parse_(), s2, s3, s4;
				if (s1 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 35) {
						s2 = peg$c23;
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c24);
					}
					if (s2 !== peg$FAILED) {
						s3 = [];
						s4 = peg$parseanychar();
						while (s4 !== peg$FAILED) {
							s3.push(s4);
							s4 = peg$parseanychar();
						}
						if (s3 !== peg$FAILED) {
							s1 = [
								s1,
								s2,
								s3
							];
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parseconnection() {
				var s0 = peg$currPos, s1 = peg$parsesource(), s2, s3, s4, s5;
				if (s1 !== peg$FAILED) {
					s2 = peg$parse_();
					if (s2 !== peg$FAILED) {
						if (input.substr(peg$currPos, 2) === peg$c25) {
							s3 = peg$c25;
							peg$currPos += 2;
						} else {
							s3 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c26);
						}
						if (s3 !== peg$FAILED) {
							s4 = peg$parse_();
							if (s4 !== peg$FAILED) {
								s5 = peg$parseconnection();
								if (s5 !== peg$FAILED) {
									peg$savedPos = s0;
									s1 = peg$c27(s1, s5);
									s0 = s1;
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				if (s0 === peg$FAILED) s0 = peg$parsedestination();
				return s0;
			}
			function peg$parsesource() {
				var s0 = peg$parsebridge();
				if (s0 === peg$FAILED) {
					s0 = peg$parseoutport();
					if (s0 === peg$FAILED) s0 = peg$parseiip();
				}
				return s0;
			}
			function peg$parsedestination() {
				var s0 = peg$parseinport();
				if (s0 === peg$FAILED) s0 = peg$parsebridge();
				return s0;
			}
			function peg$parsebridge() {
				var s0 = peg$currPos, s1 = peg$parseport__(), s2, s3;
				if (s1 !== peg$FAILED) {
					s2 = peg$parsenode();
					if (s2 !== peg$FAILED) {
						s3 = peg$parse__port();
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c28(s1, s2, s3);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					s1 = peg$parseport__();
					if (s1 === peg$FAILED) s1 = null;
					if (s1 !== peg$FAILED) {
						s2 = peg$parsenodeWithComponent();
						if (s2 !== peg$FAILED) {
							s3 = peg$parse__port();
							if (s3 === peg$FAILED) s3 = null;
							if (s3 !== peg$FAILED) {
								peg$savedPos = s0;
								s1 = peg$c28(s1, s2, s3);
								s0 = s1;
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				}
				return s0;
			}
			function peg$parseoutport() {
				var s0 = peg$currPos, s1 = peg$parsenode(), s2;
				if (s1 !== peg$FAILED) {
					s2 = peg$parse__port();
					if (s2 === peg$FAILED) s2 = null;
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c29(s1, s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parseinport() {
				var s0 = peg$currPos, s1 = peg$parseport__(), s2;
				if (s1 === peg$FAILED) s1 = null;
				if (s1 !== peg$FAILED) {
					s2 = peg$parsenode();
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c30(s1, s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parseiip() {
				var s0 = peg$currPos, s1, s2, s3;
				if (input.charCodeAt(peg$currPos) === 39) {
					s1 = peg$c31;
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c32);
				}
				if (s1 !== peg$FAILED) {
					s2 = [];
					s3 = peg$parseiipchar();
					while (s3 !== peg$FAILED) {
						s2.push(s3);
						s3 = peg$parseiipchar();
					}
					if (s2 !== peg$FAILED) {
						if (input.charCodeAt(peg$currPos) === 39) {
							s3 = peg$c31;
							peg$currPos++;
						} else {
							s3 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c32);
						}
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c33(s2);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					s1 = peg$parseJSON_text();
					if (s1 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c34(s1);
					}
					s0 = s1;
				}
				return s0;
			}
			function peg$parsenode() {
				var s0 = peg$currPos, s1 = peg$parsenodeNameAndComponent();
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c35(s1);
				}
				s0 = s1;
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					s1 = peg$parsenodeName();
					if (s1 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c35(s1);
					}
					s0 = s1;
					if (s0 === peg$FAILED) {
						s0 = peg$currPos;
						s1 = peg$parsenodeComponent();
						if (s1 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c35(s1);
						}
						s0 = s1;
					}
				}
				return s0;
			}
			function peg$parsenodeName() {
				var s0 = peg$currPos, s1 = peg$currPos, s2, s3, s4;
				if (peg$c36.test(input.charAt(peg$currPos))) {
					s2 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s2 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c37);
				}
				if (s2 !== peg$FAILED) {
					s3 = [];
					if (peg$c38.test(input.charAt(peg$currPos))) {
						s4 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s4 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c39);
					}
					while (s4 !== peg$FAILED) {
						s3.push(s4);
						if (peg$c38.test(input.charAt(peg$currPos))) {
							s4 = input.charAt(peg$currPos);
							peg$currPos++;
						} else {
							s4 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c39);
						}
					}
					if (s3 !== peg$FAILED) {
						s2 = [s2, s3];
						s1 = s2;
					} else {
						peg$currPos = s1;
						s1 = peg$FAILED;
					}
				} else {
					peg$currPos = s1;
					s1 = peg$FAILED;
				}
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c40(s1);
				}
				s0 = s1;
				return s0;
			}
			function peg$parsenodeNameAndComponent() {
				var s0 = peg$currPos, s1 = peg$parsenodeName(), s2;
				if (s1 !== peg$FAILED) {
					s2 = peg$parsecomponent();
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c41(s1, s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsenodeComponent() {
				var s0 = peg$currPos, s1 = peg$parsecomponent();
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c42(s1);
				}
				s0 = s1;
				return s0;
			}
			function peg$parsenodeWithComponent() {
				var s0 = peg$parsenodeNameAndComponent();
				if (s0 === peg$FAILED) s0 = peg$parsenodeComponent();
				return s0;
			}
			function peg$parsecomponent() {
				var s0 = peg$currPos, s1, s2, s3, s4;
				if (input.charCodeAt(peg$currPos) === 40) {
					s1 = peg$c43;
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c44);
				}
				if (s1 !== peg$FAILED) {
					s2 = [];
					if (peg$c45.test(input.charAt(peg$currPos))) {
						s3 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c46);
					}
					while (s3 !== peg$FAILED) {
						s2.push(s3);
						if (peg$c45.test(input.charAt(peg$currPos))) {
							s3 = input.charAt(peg$currPos);
							peg$currPos++;
						} else {
							s3 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c46);
						}
					}
					if (s2 === peg$FAILED) s2 = null;
					if (s2 !== peg$FAILED) {
						s3 = peg$parsecompMeta();
						if (s3 === peg$FAILED) s3 = null;
						if (s3 !== peg$FAILED) {
							if (input.charCodeAt(peg$currPos) === 41) {
								s4 = peg$c47;
								peg$currPos++;
							} else {
								s4 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c48);
							}
							if (s4 !== peg$FAILED) {
								peg$savedPos = s0;
								s1 = peg$c49(s2, s3);
								s0 = s1;
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsecompMeta() {
				var s0 = peg$currPos, s1, s2, s3;
				if (input.charCodeAt(peg$currPos) === 58) {
					s1 = peg$c5;
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c6);
				}
				if (s1 !== peg$FAILED) {
					s2 = [];
					if (peg$c50.test(input.charAt(peg$currPos))) {
						s3 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c51);
					}
					if (s3 !== peg$FAILED) while (s3 !== peg$FAILED) {
						s2.push(s3);
						if (peg$c50.test(input.charAt(peg$currPos))) {
							s3 = input.charAt(peg$currPos);
							peg$currPos++;
						} else {
							s3 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c51);
						}
					}
					else s2 = peg$FAILED;
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c52(s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parseannotation() {
				var s0 = peg$currPos, s1, s2, s3, s4, s5, s6, s7;
				if (input.charCodeAt(peg$currPos) === 35) {
					s1 = peg$c23;
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c24);
				}
				if (s1 !== peg$FAILED) {
					s2 = peg$parse__();
					if (s2 !== peg$FAILED) {
						if (input.charCodeAt(peg$currPos) === 64) {
							s3 = peg$c53;
							peg$currPos++;
						} else {
							s3 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c54);
						}
						if (s3 !== peg$FAILED) {
							s4 = [];
							if (peg$c55.test(input.charAt(peg$currPos))) {
								s5 = input.charAt(peg$currPos);
								peg$currPos++;
							} else {
								s5 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c56);
							}
							if (s5 !== peg$FAILED) while (s5 !== peg$FAILED) {
								s4.push(s5);
								if (peg$c55.test(input.charAt(peg$currPos))) {
									s5 = input.charAt(peg$currPos);
									peg$currPos++;
								} else {
									s5 = peg$FAILED;
									if (peg$silentFails === 0) peg$fail(peg$c56);
								}
							}
							else s4 = peg$FAILED;
							if (s4 !== peg$FAILED) {
								s5 = peg$parse__();
								if (s5 !== peg$FAILED) {
									s6 = [];
									if (peg$c57.test(input.charAt(peg$currPos))) {
										s7 = input.charAt(peg$currPos);
										peg$currPos++;
									} else {
										s7 = peg$FAILED;
										if (peg$silentFails === 0) peg$fail(peg$c58);
									}
									if (s7 !== peg$FAILED) while (s7 !== peg$FAILED) {
										s6.push(s7);
										if (peg$c57.test(input.charAt(peg$currPos))) {
											s7 = input.charAt(peg$currPos);
											peg$currPos++;
										} else {
											s7 = peg$FAILED;
											if (peg$silentFails === 0) peg$fail(peg$c58);
										}
									}
									else s6 = peg$FAILED;
									if (s6 !== peg$FAILED) {
										peg$savedPos = s0;
										s1 = peg$c59(s4, s6);
										s0 = s1;
									} else {
										peg$currPos = s0;
										s0 = peg$FAILED;
									}
								} else {
									peg$currPos = s0;
									s0 = peg$FAILED;
								}
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parseport() {
				var s0 = peg$currPos, s1 = peg$parseportName(), s2;
				if (s1 !== peg$FAILED) {
					s2 = peg$parseportIndex();
					if (s2 === peg$FAILED) s2 = null;
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c60(s1, s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parseport__() {
				var s0 = peg$currPos, s1 = peg$parseport(), s2;
				if (s1 !== peg$FAILED) {
					s2 = peg$parse__();
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c61(s1);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parse__port() {
				var s0 = peg$currPos, s1 = peg$parse__(), s2;
				if (s1 !== peg$FAILED) {
					s2 = peg$parseport();
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c61(s2);
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parseportName() {
				var s0 = peg$currPos, s1 = peg$currPos, s2, s3, s4;
				if (peg$c36.test(input.charAt(peg$currPos))) {
					s2 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s2 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c37);
				}
				if (s2 !== peg$FAILED) {
					s3 = [];
					if (peg$c62.test(input.charAt(peg$currPos))) {
						s4 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s4 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c63);
					}
					while (s4 !== peg$FAILED) {
						s3.push(s4);
						if (peg$c62.test(input.charAt(peg$currPos))) {
							s4 = input.charAt(peg$currPos);
							peg$currPos++;
						} else {
							s4 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c63);
						}
					}
					if (s3 !== peg$FAILED) {
						s2 = [s2, s3];
						s1 = s2;
					} else {
						peg$currPos = s1;
						s1 = peg$FAILED;
					}
				} else {
					peg$currPos = s1;
					s1 = peg$FAILED;
				}
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c64(s1);
				}
				s0 = s1;
				return s0;
			}
			function peg$parseportIndex() {
				var s0 = peg$currPos, s1, s2, s3;
				if (input.charCodeAt(peg$currPos) === 91) {
					s1 = peg$c65;
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c66);
				}
				if (s1 !== peg$FAILED) {
					s2 = [];
					if (peg$c67.test(input.charAt(peg$currPos))) {
						s3 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s3 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c68);
					}
					if (s3 !== peg$FAILED) while (s3 !== peg$FAILED) {
						s2.push(s3);
						if (peg$c67.test(input.charAt(peg$currPos))) {
							s3 = input.charAt(peg$currPos);
							peg$currPos++;
						} else {
							s3 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c68);
						}
					}
					else s2 = peg$FAILED;
					if (s2 !== peg$FAILED) {
						if (input.charCodeAt(peg$currPos) === 93) {
							s3 = peg$c69;
							peg$currPos++;
						} else {
							s3 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c70);
						}
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c71(s2);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parseanychar() {
				var s0;
				if (peg$c72.test(input.charAt(peg$currPos))) {
					s0 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c73);
				}
				return s0;
			}
			function peg$parseiipchar() {
				var s0 = peg$currPos, s1, s2;
				if (peg$c74.test(input.charAt(peg$currPos))) {
					s1 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c75);
				}
				if (s1 !== peg$FAILED) {
					if (peg$c76.test(input.charAt(peg$currPos))) {
						s2 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c77);
					}
					if (s2 !== peg$FAILED) {
						peg$savedPos = s0;
						s1 = peg$c78();
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				if (s0 === peg$FAILED) if (peg$c79.test(input.charAt(peg$currPos))) {
					s0 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c80);
				}
				return s0;
			}
			function peg$parse_() {
				var s0 = [], s1;
				if (input.charCodeAt(peg$currPos) === 32) {
					s1 = peg$c81;
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c82);
				}
				while (s1 !== peg$FAILED) {
					s0.push(s1);
					if (input.charCodeAt(peg$currPos) === 32) {
						s1 = peg$c81;
						peg$currPos++;
					} else {
						s1 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c82);
					}
				}
				if (s0 === peg$FAILED) s0 = null;
				return s0;
			}
			function peg$parse__() {
				var s0 = [], s1;
				if (input.charCodeAt(peg$currPos) === 32) {
					s1 = peg$c81;
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c82);
				}
				if (s1 !== peg$FAILED) while (s1 !== peg$FAILED) {
					s0.push(s1);
					if (input.charCodeAt(peg$currPos) === 32) {
						s1 = peg$c81;
						peg$currPos++;
					} else {
						s1 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c82);
					}
				}
				else s0 = peg$FAILED;
				return s0;
			}
			function peg$parseJSON_text() {
				var s0 = peg$currPos, s1 = peg$parsews(), s2, s3;
				if (s1 !== peg$FAILED) {
					s2 = peg$parsevalue();
					if (s2 !== peg$FAILED) {
						s3 = peg$parsews();
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c83(s2);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsebegin_array() {
				var s0 = peg$currPos, s1 = peg$parsews(), s2, s3;
				if (s1 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 91) {
						s2 = peg$c65;
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c66);
					}
					if (s2 !== peg$FAILED) {
						s3 = peg$parsews();
						if (s3 !== peg$FAILED) {
							s1 = [
								s1,
								s2,
								s3
							];
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsebegin_object() {
				var s0 = peg$currPos, s1 = peg$parsews(), s2, s3;
				if (s1 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 123) {
						s2 = peg$c84;
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c85);
					}
					if (s2 !== peg$FAILED) {
						s3 = peg$parsews();
						if (s3 !== peg$FAILED) {
							s1 = [
								s1,
								s2,
								s3
							];
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parseend_array() {
				var s0 = peg$currPos, s1 = peg$parsews(), s2, s3;
				if (s1 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 93) {
						s2 = peg$c69;
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c70);
					}
					if (s2 !== peg$FAILED) {
						s3 = peg$parsews();
						if (s3 !== peg$FAILED) {
							s1 = [
								s1,
								s2,
								s3
							];
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parseend_object() {
				var s0 = peg$currPos, s1 = peg$parsews(), s2, s3;
				if (s1 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 125) {
						s2 = peg$c86;
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c87);
					}
					if (s2 !== peg$FAILED) {
						s3 = peg$parsews();
						if (s3 !== peg$FAILED) {
							s1 = [
								s1,
								s2,
								s3
							];
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsename_separator() {
				var s0 = peg$currPos, s1 = peg$parsews(), s2, s3;
				if (s1 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 58) {
						s2 = peg$c5;
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c6);
					}
					if (s2 !== peg$FAILED) {
						s3 = peg$parsews();
						if (s3 !== peg$FAILED) {
							s1 = [
								s1,
								s2,
								s3
							];
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsevalue_separator() {
				var s0 = peg$currPos, s1 = peg$parsews(), s2, s3;
				if (s1 !== peg$FAILED) {
					if (input.charCodeAt(peg$currPos) === 44) {
						s2 = peg$c19;
						peg$currPos++;
					} else {
						s2 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c20);
					}
					if (s2 !== peg$FAILED) {
						s3 = peg$parsews();
						if (s3 !== peg$FAILED) {
							s1 = [
								s1,
								s2,
								s3
							];
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsews() {
				var s0, s1;
				peg$silentFails++;
				s0 = [];
				if (peg$c89.test(input.charAt(peg$currPos))) {
					s1 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c90);
				}
				while (s1 !== peg$FAILED) {
					s0.push(s1);
					if (peg$c89.test(input.charAt(peg$currPos))) {
						s1 = input.charAt(peg$currPos);
						peg$currPos++;
					} else {
						s1 = peg$FAILED;
						if (peg$silentFails === 0) peg$fail(peg$c90);
					}
				}
				peg$silentFails--;
				if (s0 === peg$FAILED) {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c88);
				}
				return s0;
			}
			function peg$parsevalue() {
				var s0 = peg$parsefalse();
				if (s0 === peg$FAILED) {
					s0 = peg$parsenull();
					if (s0 === peg$FAILED) {
						s0 = peg$parsetrue();
						if (s0 === peg$FAILED) {
							s0 = peg$parseobject();
							if (s0 === peg$FAILED) {
								s0 = peg$parsearray();
								if (s0 === peg$FAILED) {
									s0 = peg$parsenumber();
									if (s0 === peg$FAILED) s0 = peg$parsestring();
								}
							}
						}
					}
				}
				return s0;
			}
			function peg$parsefalse() {
				var s0 = peg$currPos, s1;
				if (input.substr(peg$currPos, 5) === peg$c91) {
					s1 = peg$c91;
					peg$currPos += 5;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c92);
				}
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c93();
				}
				s0 = s1;
				return s0;
			}
			function peg$parsenull() {
				var s0 = peg$currPos, s1;
				if (input.substr(peg$currPos, 4) === peg$c94) {
					s1 = peg$c94;
					peg$currPos += 4;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c95);
				}
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c96();
				}
				s0 = s1;
				return s0;
			}
			function peg$parsetrue() {
				var s0 = peg$currPos, s1;
				if (input.substr(peg$currPos, 4) === peg$c97) {
					s1 = peg$c97;
					peg$currPos += 4;
				} else {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c98);
				}
				if (s1 !== peg$FAILED) {
					peg$savedPos = s0;
					s1 = peg$c99();
				}
				s0 = s1;
				return s0;
			}
			function peg$parseobject() {
				var s0 = peg$currPos, s1 = peg$parsebegin_object(), s2, s3, s4, s5, s6, s7;
				if (s1 !== peg$FAILED) {
					s2 = peg$currPos;
					s3 = peg$parsemember();
					if (s3 !== peg$FAILED) {
						s4 = [];
						s5 = peg$currPos;
						s6 = peg$parsevalue_separator();
						if (s6 !== peg$FAILED) {
							s7 = peg$parsemember();
							if (s7 !== peg$FAILED) {
								peg$savedPos = s5;
								s6 = peg$c100(s3, s7);
								s5 = s6;
							} else {
								peg$currPos = s5;
								s5 = peg$FAILED;
							}
						} else {
							peg$currPos = s5;
							s5 = peg$FAILED;
						}
						while (s5 !== peg$FAILED) {
							s4.push(s5);
							s5 = peg$currPos;
							s6 = peg$parsevalue_separator();
							if (s6 !== peg$FAILED) {
								s7 = peg$parsemember();
								if (s7 !== peg$FAILED) {
									peg$savedPos = s5;
									s6 = peg$c100(s3, s7);
									s5 = s6;
								} else {
									peg$currPos = s5;
									s5 = peg$FAILED;
								}
							} else {
								peg$currPos = s5;
								s5 = peg$FAILED;
							}
						}
						if (s4 !== peg$FAILED) {
							peg$savedPos = s2;
							s3 = peg$c101(s3, s4);
							s2 = s3;
						} else {
							peg$currPos = s2;
							s2 = peg$FAILED;
						}
					} else {
						peg$currPos = s2;
						s2 = peg$FAILED;
					}
					if (s2 === peg$FAILED) s2 = null;
					if (s2 !== peg$FAILED) {
						s3 = peg$parseend_object();
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c102(s2);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsemember() {
				var s0 = peg$currPos, s1 = peg$parsestring(), s2, s3;
				if (s1 !== peg$FAILED) {
					s2 = peg$parsename_separator();
					if (s2 !== peg$FAILED) {
						s3 = peg$parsevalue();
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c103(s1, s3);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsearray() {
				var s0 = peg$currPos, s1 = peg$parsebegin_array(), s2, s3, s4, s5, s6, s7;
				if (s1 !== peg$FAILED) {
					s2 = peg$currPos;
					s3 = peg$parsevalue();
					if (s3 !== peg$FAILED) {
						s4 = [];
						s5 = peg$currPos;
						s6 = peg$parsevalue_separator();
						if (s6 !== peg$FAILED) {
							s7 = peg$parsevalue();
							if (s7 !== peg$FAILED) {
								peg$savedPos = s5;
								s6 = peg$c104(s3, s7);
								s5 = s6;
							} else {
								peg$currPos = s5;
								s5 = peg$FAILED;
							}
						} else {
							peg$currPos = s5;
							s5 = peg$FAILED;
						}
						while (s5 !== peg$FAILED) {
							s4.push(s5);
							s5 = peg$currPos;
							s6 = peg$parsevalue_separator();
							if (s6 !== peg$FAILED) {
								s7 = peg$parsevalue();
								if (s7 !== peg$FAILED) {
									peg$savedPos = s5;
									s6 = peg$c104(s3, s7);
									s5 = s6;
								} else {
									peg$currPos = s5;
									s5 = peg$FAILED;
								}
							} else {
								peg$currPos = s5;
								s5 = peg$FAILED;
							}
						}
						if (s4 !== peg$FAILED) {
							peg$savedPos = s2;
							s3 = peg$c105(s3, s4);
							s2 = s3;
						} else {
							peg$currPos = s2;
							s2 = peg$FAILED;
						}
					} else {
						peg$currPos = s2;
						s2 = peg$FAILED;
					}
					if (s2 === peg$FAILED) s2 = null;
					if (s2 !== peg$FAILED) {
						s3 = peg$parseend_array();
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c106(s2);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsenumber() {
				var s0, s1, s2, s3, s4;
				peg$silentFails++;
				s0 = peg$currPos;
				s1 = peg$parseminus();
				if (s1 === peg$FAILED) s1 = null;
				if (s1 !== peg$FAILED) {
					s2 = peg$parseint();
					if (s2 !== peg$FAILED) {
						s3 = peg$parsefrac();
						if (s3 === peg$FAILED) s3 = null;
						if (s3 !== peg$FAILED) {
							s4 = peg$parseexp();
							if (s4 === peg$FAILED) s4 = null;
							if (s4 !== peg$FAILED) {
								peg$savedPos = s0;
								s1 = peg$c108();
								s0 = s1;
							} else {
								peg$currPos = s0;
								s0 = peg$FAILED;
							}
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				peg$silentFails--;
				if (s0 === peg$FAILED) {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c107);
				}
				return s0;
			}
			function peg$parsedecimal_point() {
				var s0;
				if (input.charCodeAt(peg$currPos) === 46) {
					s0 = peg$c3;
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c4);
				}
				return s0;
			}
			function peg$parsedigit1_9() {
				var s0;
				if (peg$c109.test(input.charAt(peg$currPos))) {
					s0 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c110);
				}
				return s0;
			}
			function peg$parsee() {
				var s0;
				if (peg$c111.test(input.charAt(peg$currPos))) {
					s0 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c112);
				}
				return s0;
			}
			function peg$parseexp() {
				var s0 = peg$currPos, s1 = peg$parsee(), s2, s3, s4;
				if (s1 !== peg$FAILED) {
					s2 = peg$parseminus();
					if (s2 === peg$FAILED) s2 = peg$parseplus();
					if (s2 === peg$FAILED) s2 = null;
					if (s2 !== peg$FAILED) {
						s3 = [];
						s4 = peg$parseDIGIT();
						if (s4 !== peg$FAILED) while (s4 !== peg$FAILED) {
							s3.push(s4);
							s4 = peg$parseDIGIT();
						}
						else s3 = peg$FAILED;
						if (s3 !== peg$FAILED) {
							s1 = [
								s1,
								s2,
								s3
							];
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parsefrac() {
				var s0 = peg$currPos, s1 = peg$parsedecimal_point(), s2, s3;
				if (s1 !== peg$FAILED) {
					s2 = [];
					s3 = peg$parseDIGIT();
					if (s3 !== peg$FAILED) while (s3 !== peg$FAILED) {
						s2.push(s3);
						s3 = peg$parseDIGIT();
					}
					else s2 = peg$FAILED;
					if (s2 !== peg$FAILED) {
						s1 = [s1, s2];
						s0 = s1;
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				return s0;
			}
			function peg$parseint() {
				var s0 = peg$parsezero(), s1, s2, s3;
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					s1 = peg$parsedigit1_9();
					if (s1 !== peg$FAILED) {
						s2 = [];
						s3 = peg$parseDIGIT();
						while (s3 !== peg$FAILED) {
							s2.push(s3);
							s3 = peg$parseDIGIT();
						}
						if (s2 !== peg$FAILED) {
							s1 = [s1, s2];
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				}
				return s0;
			}
			function peg$parseminus() {
				var s0;
				if (input.charCodeAt(peg$currPos) === 45) {
					s0 = peg$c113;
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c114);
				}
				return s0;
			}
			function peg$parseplus() {
				var s0;
				if (input.charCodeAt(peg$currPos) === 43) {
					s0 = peg$c115;
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c116);
				}
				return s0;
			}
			function peg$parsezero() {
				var s0;
				if (input.charCodeAt(peg$currPos) === 48) {
					s0 = peg$c117;
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c118);
				}
				return s0;
			}
			function peg$parsestring() {
				var s0, s1, s2, s3;
				peg$silentFails++;
				s0 = peg$currPos;
				s1 = peg$parsequotation_mark();
				if (s1 !== peg$FAILED) {
					s2 = [];
					s3 = peg$parsechar();
					while (s3 !== peg$FAILED) {
						s2.push(s3);
						s3 = peg$parsechar();
					}
					if (s2 !== peg$FAILED) {
						s3 = peg$parsequotation_mark();
						if (s3 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c120(s2);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				} else {
					peg$currPos = s0;
					s0 = peg$FAILED;
				}
				peg$silentFails--;
				if (s0 === peg$FAILED) {
					s1 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c119);
				}
				return s0;
			}
			function peg$parsechar() {
				var s0 = peg$parseunescaped(), s1, s2, s3, s4, s5, s6, s7, s8, s9;
				if (s0 === peg$FAILED) {
					s0 = peg$currPos;
					s1 = peg$parseescape();
					if (s1 !== peg$FAILED) {
						if (input.charCodeAt(peg$currPos) === 34) {
							s2 = peg$c121;
							peg$currPos++;
						} else {
							s2 = peg$FAILED;
							if (peg$silentFails === 0) peg$fail(peg$c122);
						}
						if (s2 === peg$FAILED) {
							if (input.charCodeAt(peg$currPos) === 92) {
								s2 = peg$c123;
								peg$currPos++;
							} else {
								s2 = peg$FAILED;
								if (peg$silentFails === 0) peg$fail(peg$c124);
							}
							if (s2 === peg$FAILED) {
								if (input.charCodeAt(peg$currPos) === 47) {
									s2 = peg$c125;
									peg$currPos++;
								} else {
									s2 = peg$FAILED;
									if (peg$silentFails === 0) peg$fail(peg$c126);
								}
								if (s2 === peg$FAILED) {
									s2 = peg$currPos;
									if (input.charCodeAt(peg$currPos) === 98) {
										s3 = peg$c127;
										peg$currPos++;
									} else {
										s3 = peg$FAILED;
										if (peg$silentFails === 0) peg$fail(peg$c128);
									}
									if (s3 !== peg$FAILED) {
										peg$savedPos = s2;
										s3 = peg$c129();
									}
									s2 = s3;
									if (s2 === peg$FAILED) {
										s2 = peg$currPos;
										if (input.charCodeAt(peg$currPos) === 102) {
											s3 = peg$c130;
											peg$currPos++;
										} else {
											s3 = peg$FAILED;
											if (peg$silentFails === 0) peg$fail(peg$c131);
										}
										if (s3 !== peg$FAILED) {
											peg$savedPos = s2;
											s3 = peg$c132();
										}
										s2 = s3;
										if (s2 === peg$FAILED) {
											s2 = peg$currPos;
											if (input.charCodeAt(peg$currPos) === 110) {
												s3 = peg$c133;
												peg$currPos++;
											} else {
												s3 = peg$FAILED;
												if (peg$silentFails === 0) peg$fail(peg$c134);
											}
											if (s3 !== peg$FAILED) {
												peg$savedPos = s2;
												s3 = peg$c135();
											}
											s2 = s3;
											if (s2 === peg$FAILED) {
												s2 = peg$currPos;
												if (input.charCodeAt(peg$currPos) === 114) {
													s3 = peg$c136;
													peg$currPos++;
												} else {
													s3 = peg$FAILED;
													if (peg$silentFails === 0) peg$fail(peg$c137);
												}
												if (s3 !== peg$FAILED) {
													peg$savedPos = s2;
													s3 = peg$c138();
												}
												s2 = s3;
												if (s2 === peg$FAILED) {
													s2 = peg$currPos;
													if (input.charCodeAt(peg$currPos) === 116) {
														s3 = peg$c139;
														peg$currPos++;
													} else {
														s3 = peg$FAILED;
														if (peg$silentFails === 0) peg$fail(peg$c140);
													}
													if (s3 !== peg$FAILED) {
														peg$savedPos = s2;
														s3 = peg$c141();
													}
													s2 = s3;
													if (s2 === peg$FAILED) {
														s2 = peg$currPos;
														if (input.charCodeAt(peg$currPos) === 117) {
															s3 = peg$c142;
															peg$currPos++;
														} else {
															s3 = peg$FAILED;
															if (peg$silentFails === 0) peg$fail(peg$c143);
														}
														if (s3 !== peg$FAILED) {
															s4 = peg$currPos;
															s5 = peg$currPos;
															s6 = peg$parseHEXDIG();
															if (s6 !== peg$FAILED) {
																s7 = peg$parseHEXDIG();
																if (s7 !== peg$FAILED) {
																	s8 = peg$parseHEXDIG();
																	if (s8 !== peg$FAILED) {
																		s9 = peg$parseHEXDIG();
																		if (s9 !== peg$FAILED) {
																			s6 = [
																				s6,
																				s7,
																				s8,
																				s9
																			];
																			s5 = s6;
																		} else {
																			peg$currPos = s5;
																			s5 = peg$FAILED;
																		}
																	} else {
																		peg$currPos = s5;
																		s5 = peg$FAILED;
																	}
																} else {
																	peg$currPos = s5;
																	s5 = peg$FAILED;
																}
															} else {
																peg$currPos = s5;
																s5 = peg$FAILED;
															}
															if (s5 !== peg$FAILED) s4 = input.substring(s4, peg$currPos);
															else s4 = s5;
															if (s4 !== peg$FAILED) {
																peg$savedPos = s2;
																s3 = peg$c144(s4);
																s2 = s3;
															} else {
																peg$currPos = s2;
																s2 = peg$FAILED;
															}
														} else {
															peg$currPos = s2;
															s2 = peg$FAILED;
														}
													}
												}
											}
										}
									}
								}
							}
						}
						if (s2 !== peg$FAILED) {
							peg$savedPos = s0;
							s1 = peg$c145(s2);
							s0 = s1;
						} else {
							peg$currPos = s0;
							s0 = peg$FAILED;
						}
					} else {
						peg$currPos = s0;
						s0 = peg$FAILED;
					}
				}
				return s0;
			}
			function peg$parseescape() {
				var s0;
				if (input.charCodeAt(peg$currPos) === 92) {
					s0 = peg$c123;
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c124);
				}
				return s0;
			}
			function peg$parsequotation_mark() {
				var s0;
				if (input.charCodeAt(peg$currPos) === 34) {
					s0 = peg$c121;
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c122);
				}
				return s0;
			}
			function peg$parseunescaped() {
				var s0;
				if (peg$c146.test(input.charAt(peg$currPos))) {
					s0 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c147);
				}
				return s0;
			}
			function peg$parseDIGIT() {
				var s0;
				if (peg$c67.test(input.charAt(peg$currPos))) {
					s0 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c68);
				}
				return s0;
			}
			function peg$parseHEXDIG() {
				var s0;
				if (peg$c148.test(input.charAt(peg$currPos))) {
					s0 = input.charAt(peg$currPos);
					peg$currPos++;
				} else {
					s0 = peg$FAILED;
					if (peg$silentFails === 0) peg$fail(peg$c149);
				}
				return s0;
			}
			var parser, nodes;
			var defaultInPort = "IN", defaultOutPort = "OUT";
			parser = this;
			delete parser.properties;
			delete parser.inports;
			delete parser.outports;
			delete parser.groups;
			parser.edges = [];
			nodes = {};
			[].indexOf;
			parser.validateContents = function(graph, options) {
				if (graph.processes) Object.keys(graph.processes).forEach(function(node) {
					if (!graph.processes[node].component) throw new Error("Node \"" + node + "\" does not have a component defined");
				});
				if (graph.inports) Object.keys(graph.inports).forEach(function(port) {
					var portDef = graph.inports[port];
					if (!graph.processes[portDef.process]) throw new Error("Inport \"" + port + "\" is connected to an undefined target node \"" + portDef.process + "\"");
				});
				if (graph.outports) Object.keys(graph.outports).forEach(function(port) {
					var portDef = graph.outports[port];
					if (!graph.processes[portDef.process]) throw new Error("Outport \"" + port + "\" is connected to an undefined source node \"" + portDef.process + "\"");
				});
				if (graph.connections) graph.connections.forEach(function(edge) {
					if (edge.tgt && !graph.processes[edge.tgt.process]) {
						if (edge.data) throw new Error("IIP containing \"" + edge.data + "\" is connected to an undefined target node \"" + edge.tgt.process + "\"");
						throw new Error("Edge from \"" + edge.src.process + "\" port \"" + edge.src.port + "\" is connected to an undefined target node \"" + edge.tgt.process + "\"");
					}
					if (edge.src && !graph.processes[edge.src.process]) throw new Error("Edge to \"" + edge.tgt.process + "\" port \"" + edge.tgt.port + "\" is connected to an undefined source node \"" + edge.src.process + "\"");
				});
			};
			parser.addNode = function(nodeName, comp) {
				if (!nodes[nodeName]) nodes[nodeName] = {};
				if (!!comp.comp) nodes[nodeName].component = comp.comp;
				if (!!comp.meta) {
					var metadata = {};
					for (var i = 0; i < comp.meta.length; i++) {
						var item = comp.meta[i].split("=");
						if (item.length === 1) item = ["routes", item[0]];
						var key = item[0];
						var value = item[1];
						if (key === "x" || key === "y") value = parseFloat(value);
						metadata[key] = value;
					}
					nodes[nodeName].metadata = metadata;
				}
			};
			var anonymousIndexes = {};
			var anonymousNodeNames = {};
			parser.addAnonymousNode = function(comp, offset) {
				if (!anonymousNodeNames[offset]) {
					var componentName = comp.comp.replace(/[^a-zA-Z0-9]+/, "_");
					anonymousIndexes[componentName] = (anonymousIndexes[componentName] || 0) + 1;
					anonymousNodeNames[offset] = "_" + componentName + "_" + anonymousIndexes[componentName];
					this.addNode(anonymousNodeNames[offset], comp);
				}
				return anonymousNodeNames[offset];
			};
			parser.getResult = function() {
				var result = {
					inports: parser.inports || {},
					outports: parser.outports || {},
					groups: parser.groups || [],
					processes: nodes || {},
					connections: parser.processEdges()
				};
				if (parser.properties) result.properties = parser.properties;
				result.caseSensitive = options.caseSensitive || false;
				var validateSchema = parser.validateSchema;
				if (typeof options.validateSchema !== "undefined") validateSchema = options.validateSchema;
				if (validateSchema) {
					if (typeof tv4 === "undefined") var tv4 = require_tv4();
					var schema = require_graph();
					var validation = tv4.validateMultiple(result, schema);
					if (!validation.valid) throw new Error("fbp: Did not validate againt graph schema:\n" + JSON.stringify(validation.errors, null, 2));
				}
				if (typeof options.validateContents === "undefined" || options.validateContents) parser.validateContents(result);
				return result;
			};
			var flatten = function(array, isShallow) {
				var index = -1, length = array ? array.length : 0, result = [];
				while (++index < length) {
					var value = array[index];
					if (value instanceof Array) Array.prototype.push.apply(result, isShallow ? value : flatten(value));
					else result.push(value);
				}
				return result;
			};
			parser.registerAnnotation = function(key, value) {
				if (!parser.properties) parser.properties = {};
				if (key === "runtime") {
					parser.properties.environment = {};
					parser.properties.environment.type = value;
					return;
				}
				parser.properties[key] = value;
			};
			parser.registerInports = function(node, port, pub) {
				if (!parser.inports) parser.inports = {};
				if (!options.caseSensitive) {
					pub = pub.toLowerCase();
					port = port.toLowerCase();
				}
				parser.inports[pub] = {
					process: node,
					port
				};
			};
			parser.registerOutports = function(node, port, pub) {
				if (!parser.outports) parser.outports = {};
				if (!options.caseSensitive) {
					pub = pub.toLowerCase();
					port = port.toLowerCase();
				}
				parser.outports[pub] = {
					process: node,
					port
				};
			};
			parser.registerEdges = function(edges) {
				if (Array.isArray(edges)) edges.forEach(function(o, i) {
					parser.edges.push(o);
				});
			};
			parser.processEdges = function() {
				var flats = flatten(parser.edges), grouped = [];
				for (var i = 1; i < flats.length; i += 1) if (("src" in flats[i - 1] || "data" in flats[i - 1]) && "tgt" in flats[i]) {
					flats[i - 1].tgt = flats[i].tgt;
					grouped.push(flats[i - 1]);
					i++;
				}
				return grouped;
			};
			function makeName(s) {
				return s[0] + s[1].join("");
			}
			function makePort(process, port, defaultPort) {
				if (!options.caseSensitive) defaultPort = defaultPort.toLowerCase();
				var p = {
					process,
					port: port ? port.port : defaultPort
				};
				if (port && port.index != null) p.index = port.index;
				return p;
			}
			function makeInPort(process, port) {
				return makePort(process, port, defaultInPort);
			}
			function makeOutPort(process, port) {
				return makePort(process, port, defaultOutPort);
			}
			peg$result = peg$startRuleFunction();
			if (peg$result !== peg$FAILED && peg$currPos === input.length) return peg$result;
			else {
				if (peg$result !== peg$FAILED && peg$currPos < input.length) peg$fail({
					type: "end",
					description: "end of input"
				});
				throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
			}
		}
		return {
			SyntaxError: peg$SyntaxError,
			parse: peg$parse
		};
	})();
}));
//#endregion
//#region node_modules/fbp/lib/serialize.js
var require_serialize = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var indexOf = [].indexOf || function(item) {
		for (var i = 0, l = this.length; i < l; i++) if (i in this && this[i] === item) return i;
		return -1;
	};
	module.exports = function serialize(graph, options) {
		var conn, getInOutName, getName, i, inPort, input, len, name, namedComponents, outPort, output, process, ref, ref1, ref2, src, srcName, srcPort, srcProcess, tgt, tgtName, tgtPort, tgtProcess;
		if (options == null) options = {};
		if (typeof graph === "string") input = JSON.parse(graph);
		else input = graph;
		namedComponents = [];
		output = "";
		getName = function(name) {
			if (input.processes[name].metadata != null) name = input.processes[name].metadata.label;
			if (name.indexOf("/") > -1) name = name.split("/").pop();
			return name;
		};
		getInOutName = function(name, data) {
			if (data.process != null && input.processes[data.process].metadata != null) name = input.processes[data.process].metadata.label;
			else if (data.process != null) name = data.process;
			if (name.indexOf("/") > -1) name = name.split("/").pop();
			return name;
		};
		if (input.properties) {
			if (input.properties.environment && input.properties.environment.type) output += "# @runtime " + input.properties.environment.type + "\n";
			Object.keys(input.properties).forEach(function(prop) {
				if (!prop.match(/^[a-zA-Z0-9\-_]+$/)) return;
				var propval = input.properties[prop];
				if (typeof propval !== "string") return;
				if (!propval.match(/^[a-zA-Z0-9\-_\s\.]+$/)) return;
				output += "# @" + prop + " " + propval + "\n";
			});
		}
		ref = input.inports;
		for (name in ref) {
			inPort = ref[name];
			process = getInOutName(name, inPort);
			name = input.caseSensitive ? name : name.toUpperCase();
			inPort.port = input.caseSensitive ? inPort.port : inPort.port.toUpperCase();
			output += "INPORT=" + process + "." + inPort.port + ":" + name + "\n";
		}
		ref1 = input.outports;
		for (name in ref1) {
			outPort = ref1[name];
			process = getInOutName(name, outPort);
			name = input.caseSensitive ? name : name.toUpperCase();
			outPort.port = input.caseSensitive ? outPort.port : outPort.port.toUpperCase();
			output += "OUTPORT=" + process + "." + outPort.port + ":" + name + "\n";
		}
		output += "\n";
		ref2 = input.connections;
		for (i = 0, len = ref2.length; i < len; i++) {
			conn = ref2[i];
			if (conn.data != null) {
				tgtPort = input.caseSensitive ? conn.tgt.port : conn.tgt.port.toUpperCase();
				tgtName = conn.tgt.process;
				tgtProcess = input.processes[tgtName].component;
				tgt = getName(tgtName);
				if (indexOf.call(namedComponents, tgtProcess) < 0) {
					tgt += "(" + tgtProcess + ")";
					namedComponents.push(tgtProcess);
				}
				output += "\"" + conn.data + "\"" + (" -> " + tgtPort + " " + tgt + "\n");
			} else {
				srcPort = input.caseSensitive ? conn.src.port : conn.src.port.toUpperCase();
				srcName = conn.src.process;
				srcProcess = input.processes[srcName].component;
				src = getName(srcName);
				if (indexOf.call(namedComponents, srcProcess) < 0) {
					src += "(" + srcProcess + ")";
					namedComponents.push(srcProcess);
				}
				tgtPort = input.caseSensitive ? conn.tgt.port : conn.tgt.port.toUpperCase();
				tgtName = conn.tgt.process;
				tgtProcess = input.processes[tgtName].component;
				tgt = getName(tgtName);
				if (indexOf.call(namedComponents, tgtProcess) < 0) {
					tgt += "(" + tgtProcess + ")";
					namedComponents.push(tgtProcess);
				}
				output += src + " " + srcPort + " -> " + tgtPort + " " + tgt + "\n";
			}
		}
		return output;
	};
}));
//#endregion
//#region node_modules/fbp/lib/index.js
var require_lib$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parser = require_fbp();
	var serialize = require_serialize();
	module.exports = {
		SyntaxError: parser.SyntaxError,
		parse: parser.parse,
		serialize
	};
}));
//#endregion
//#region node_modules/fbp-graph/lib/Graph.js
var require_Graph = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.mergeResolveTheirs = exports.equivalent = exports.loadFile = exports.loadFBP = exports.loadJSON = exports.createGraph = exports.Graph = void 0;
	const events_1 = require_eventemitter3();
	const clone = require_clone();
	const fs_1 = __require("fs");
	const Platform_1 = require_Platform();
	var Graph = class extends events_1.EventEmitter {
		constructor(name = "", options = {}) {
			super();
			this.name = name;
			this.properties = {};
			this.nodes = [];
			this.edges = [];
			this.initializers = [];
			this.inports = {};
			this.outports = {};
			this.groups = [];
			this.transaction = {
				id: null,
				depth: 0
			};
			this.caseSensitive = options.caseSensitive || false;
		}
		getPortName(port = "") {
			if (this.caseSensitive) return port;
			return port.toLowerCase();
		}
		startTransaction(id, metadata = {}) {
			if (this.transaction.id) throw Error("Nested transactions not supported");
			this.transaction.id = id;
			this.transaction.depth = 1;
			this.emit("startTransaction", id, metadata);
			return this;
		}
		endTransaction(id, metadata = {}) {
			if (!this.transaction.id) throw Error("Attempted to end non-existing transaction");
			this.transaction.id = null;
			this.transaction.depth = 0;
			this.emit("endTransaction", id, metadata);
			return this;
		}
		checkTransactionStart() {
			if (!this.transaction.id) this.startTransaction("implicit");
			else if (this.transaction.id === "implicit") this.transaction.depth += 1;
			return this;
		}
		checkTransactionEnd() {
			if (this.transaction.id === "implicit") this.transaction.depth -= 1;
			if (this.transaction.depth === 0) this.endTransaction("implicit");
			return this;
		}
		setProperties(properties) {
			this.checkTransactionStart();
			const before = clone(this.properties);
			Object.keys(properties).forEach((item) => {
				const val = properties[item];
				this.properties[item] = val;
			});
			this.emit("changeProperties", this.properties, before);
			this.checkTransactionEnd();
			return this;
		}
		addInport(publicPort, nodeKey, portKey, metadata = {}) {
			if (!this.getNode(nodeKey)) return this;
			const portName = this.getPortName(publicPort);
			this.checkTransactionStart();
			this.inports[portName] = {
				process: nodeKey,
				port: this.getPortName(portKey),
				metadata
			};
			this.emit("addInport", portName, this.inports[portName]);
			this.checkTransactionEnd();
			return this;
		}
		removeInport(publicPort) {
			const portName = this.getPortName(publicPort);
			if (!this.inports[portName]) return this;
			this.checkTransactionStart();
			const port = this.inports[portName];
			this.setInportMetadata(portName, {});
			delete this.inports[portName];
			this.emit("removeInport", portName, port);
			this.checkTransactionEnd();
			return this;
		}
		renameInport(oldPort, newPort) {
			const oldPortName = this.getPortName(oldPort);
			const newPortName = this.getPortName(newPort);
			if (!this.inports[oldPortName]) return this;
			if (newPortName === oldPortName) return this;
			this.checkTransactionStart();
			this.inports[newPortName] = this.inports[oldPortName];
			delete this.inports[oldPortName];
			this.emit("renameInport", oldPortName, newPortName);
			this.checkTransactionEnd();
			return this;
		}
		setInportMetadata(publicPort, metadata) {
			const portName = this.getPortName(publicPort);
			if (!this.inports[portName]) return this;
			this.checkTransactionStart();
			if (!this.inports[portName].metadata) this.inports[portName].metadata = {};
			const before = clone(this.inports[portName].metadata);
			Object.keys(metadata).forEach((item) => {
				const val = metadata[item];
				const existingMeta = this.inports[portName].metadata;
				if (!existingMeta) return;
				if (val != null) existingMeta[item] = val;
				else delete existingMeta[item];
			});
			this.emit("changeInport", portName, this.inports[portName], before, metadata);
			this.checkTransactionEnd();
			return this;
		}
		addOutport(publicPort, nodeKey, portKey, metadata = {}) {
			if (!this.getNode(nodeKey)) return this;
			const portName = this.getPortName(publicPort);
			this.checkTransactionStart();
			this.outports[portName] = {
				process: nodeKey,
				port: this.getPortName(portKey),
				metadata
			};
			this.emit("addOutport", portName, this.outports[portName]);
			this.checkTransactionEnd();
			return this;
		}
		removeOutport(publicPort) {
			const portName = this.getPortName(publicPort);
			if (!this.outports[portName]) return this;
			this.checkTransactionStart();
			const port = this.outports[portName];
			this.setOutportMetadata(portName, {});
			delete this.outports[portName];
			this.emit("removeOutport", portName, port);
			this.checkTransactionEnd();
			return this;
		}
		renameOutport(oldPort, newPort) {
			const oldPortName = this.getPortName(oldPort);
			const newPortName = this.getPortName(newPort);
			if (!this.outports[oldPortName]) return this;
			this.checkTransactionStart();
			this.outports[newPortName] = this.outports[oldPortName];
			delete this.outports[oldPortName];
			this.emit("renameOutport", oldPortName, newPortName);
			this.checkTransactionEnd();
			return this;
		}
		setOutportMetadata(publicPort, metadata) {
			const portName = this.getPortName(publicPort);
			if (!this.outports[portName]) return this;
			this.checkTransactionStart();
			const before = clone(this.outports[portName].metadata);
			if (!this.outports[portName].metadata) this.outports[portName].metadata = {};
			Object.keys(metadata).forEach((item) => {
				const val = metadata[item];
				const existingMeta = this.outports[portName].metadata;
				if (!existingMeta) return;
				if (val != null) existingMeta[item] = val;
				else delete existingMeta[item];
			});
			this.emit("changeOutport", portName, this.outports[portName], before, metadata);
			this.checkTransactionEnd();
			return this;
		}
		addGroup(group, nodes, metadata) {
			this.checkTransactionStart();
			const g = {
				name: group,
				nodes,
				metadata
			};
			this.groups.push(g);
			this.emit("addGroup", g);
			this.checkTransactionEnd();
			return this;
		}
		renameGroup(oldName, newName) {
			this.checkTransactionStart();
			this.groups.forEach((group) => {
				if (!group) return;
				if (group.name !== oldName) return;
				const g = group;
				g.name = newName;
				this.emit("renameGroup", oldName, newName);
			});
			this.checkTransactionEnd();
			return this;
		}
		removeGroup(groupName) {
			this.checkTransactionStart();
			this.groups = this.groups.filter((group) => {
				if (!group) return false;
				if (group.name !== groupName) return true;
				this.setGroupMetadata(group.name, {});
				this.emit("removeGroup", group);
				return false;
			});
			this.checkTransactionEnd();
			return this;
		}
		setGroupMetadata(groupName, metadata) {
			this.checkTransactionStart();
			this.groups.forEach((group) => {
				if (!group) return;
				if (group.name !== groupName) return;
				const before = clone(group.metadata);
				Object.keys(metadata).forEach((item) => {
					const val = metadata[item];
					const g = group;
					if (!g.metadata) return;
					if (val != null) g.metadata[item] = val;
					else delete g.metadata[item];
				});
				this.emit("changeGroup", group, before, metadata);
			});
			this.checkTransactionEnd();
			return this;
		}
		addNode(id, component, metadata = {}) {
			this.checkTransactionStart();
			const node = {
				id,
				component,
				metadata
			};
			this.nodes.push(node);
			this.emit("addNode", node);
			this.checkTransactionEnd();
			return this;
		}
		removeNode(id) {
			const node = this.getNode(id);
			if (!node) return this;
			this.checkTransactionStart();
			this.edges.forEach((edge) => {
				if (edge.from.node === node.id || edge.to.node === node.id) this.removeEdge(edge.from.node, edge.from.port, edge.to.node, edge.to.port);
			});
			this.initializers.forEach((initializer) => {
				if (initializer.to.node === node.id) this.removeInitial(initializer.to.node, initializer.to.port);
			});
			Object.keys(this.inports).forEach((pub) => {
				if (this.inports[pub].process === id) this.removeInport(pub);
			});
			Object.keys(this.outports).forEach((pub) => {
				if (this.outports[pub].process === id) this.removeOutport(pub);
			});
			this.groups.forEach((group) => {
				if (!group) return;
				const index = group.nodes.indexOf(id);
				if (index === -1) return;
				group.nodes.splice(index, 1);
				if (group.nodes.length === 0) this.removeGroup(group.name);
			});
			this.setNodeMetadata(id, {});
			this.nodes = this.nodes.filter((n) => n !== node);
			this.emit("removeNode", node);
			this.checkTransactionEnd();
			return this;
		}
		getNode(id) {
			const node = this.nodes.find((node) => node && node.id === id);
			if (!node) return null;
			return node;
		}
		renameNode(oldId, newId) {
			this.checkTransactionStart();
			const node = this.getNode(oldId);
			if (!node) return this;
			node.id = newId;
			this.edges.forEach((e) => {
				const edge = e;
				if (!edge) return;
				if (edge.from.node === oldId) edge.from.node = newId;
				if (edge.to.node === oldId) edge.to.node = newId;
			});
			this.initializers.forEach((i) => {
				const iip = i;
				if (!iip) return;
				if (iip.to.node === oldId) iip.to.node = newId;
			});
			Object.keys(this.inports).forEach((pub) => {
				const priv = this.inports[pub];
				if (priv.process === oldId) priv.process = newId;
			});
			Object.keys(this.outports).forEach((pub) => {
				const priv = this.outports[pub];
				if (priv.process === oldId) priv.process = newId;
			});
			this.groups.forEach((group) => {
				if (!group) return;
				const index = group.nodes.indexOf(oldId);
				if (index === -1) return;
				const g = group;
				g.nodes[index] = newId;
			});
			this.emit("renameNode", oldId, newId);
			this.checkTransactionEnd();
			return this;
		}
		setNodeMetadata(id, metadata) {
			const node = this.getNode(id);
			if (!node) return this;
			this.checkTransactionStart();
			if (!node.metadata) node.metadata = {};
			const before = clone(node.metadata);
			Object.keys(metadata).forEach((item) => {
				if (!node.metadata) return;
				const val = metadata[item];
				if (val != null) node.metadata[item] = val;
				else delete node.metadata[item];
			});
			this.emit("changeNode", node, before, metadata);
			this.checkTransactionEnd();
			return this;
		}
		addEdge(outNode, outPort, inNode, inPort, metadata = {}) {
			const outPortName = this.getPortName(outPort);
			const inPortName = this.getPortName(inPort);
			if (this.edges.some((edge) => {
				if (edge.from.node === outNode && edge.from.port === outPortName && edge.to.node === inNode && edge.to.port === inPortName) return true;
				return false;
			})) return this;
			if (!this.getNode(outNode)) return this;
			if (!this.getNode(inNode)) return this;
			this.checkTransactionStart();
			const edge = {
				from: {
					node: outNode,
					port: outPortName
				},
				to: {
					node: inNode,
					port: inPortName
				},
				metadata
			};
			this.edges.push(edge);
			this.emit("addEdge", edge);
			this.checkTransactionEnd();
			return this;
		}
		addEdgeIndex(outNode, outPort, outIndex, inNode, inPort, inIndex, metadata = {}) {
			const outPortName = this.getPortName(outPort);
			const inPortName = this.getPortName(inPort);
			const inIndexVal = inIndex === null ? void 0 : inIndex;
			const outIndexVal = outIndex === null ? void 0 : outIndex;
			if (this.edges.some((edge) => {
				if (edge.from.node === outNode && edge.from.port === outPortName && edge.from.index === outIndexVal && edge.to.node === inNode && edge.to.port === inPortName && edge.to.index === inIndexVal) return true;
				return false;
			})) return this;
			if (!this.getNode(outNode)) return this;
			if (!this.getNode(inNode)) return this;
			this.checkTransactionStart();
			const edge = {
				from: {
					node: outNode,
					port: outPortName,
					index: outIndexVal
				},
				to: {
					node: inNode,
					port: inPortName,
					index: inIndexVal
				},
				metadata
			};
			this.edges.push(edge);
			this.emit("addEdge", edge);
			this.checkTransactionEnd();
			return this;
		}
		removeEdge(node, port, node2, port2) {
			if (!this.getEdge(node, port, node2, port2)) return this;
			this.checkTransactionStart();
			const outPort = this.getPortName(port);
			const inPort = this.getPortName(port2);
			this.edges = this.edges.filter((edge) => {
				if (node2 && inPort) {
					if (edge.from.node === node && edge.from.port === outPort && edge.to.node === node2 && edge.to.port === inPort) {
						this.setEdgeMetadata(edge.from.node, edge.from.port, edge.to.node, edge.to.port, {});
						this.emit("removeEdge", edge);
						return false;
					}
				} else if (edge.from.node === node && edge.from.port === outPort || edge.to.node === node && edge.to.port === outPort) {
					this.setEdgeMetadata(edge.from.node, edge.from.port, edge.to.node, edge.to.port, {});
					this.emit("removeEdge", edge);
					return false;
				}
				return true;
			});
			this.checkTransactionEnd();
			return this;
		}
		getEdge(node, port, node2, port2) {
			const outPort = this.getPortName(port);
			const inPort = this.getPortName(port2);
			const edge = this.edges.find((edge) => {
				if (!edge) return false;
				if (edge.from.node === node && edge.from.port === outPort && edge.to.node === node2 && edge.to.port === inPort) return true;
				return false;
			});
			if (!edge) return null;
			return edge;
		}
		setEdgeMetadata(node, port, node2, port2, metadata) {
			const edge = this.getEdge(node, port, node2, port2);
			if (!edge) return this;
			this.checkTransactionStart();
			if (!edge.metadata) edge.metadata = {};
			const before = clone(edge.metadata);
			Object.keys(metadata).forEach((item) => {
				const val = metadata[item];
				if (!edge.metadata) edge.metadata = {};
				if (val !== null) edge.metadata[item] = val;
				else delete edge.metadata[item];
			});
			this.emit("changeEdge", edge, before, metadata);
			this.checkTransactionEnd();
			return this;
		}
		addInitial(data, node, port, metadata = {}) {
			if (!this.getNode(node)) return this;
			const portName = this.getPortName(port);
			this.checkTransactionStart();
			const initializer = {
				from: { data },
				to: {
					node,
					port: portName
				},
				metadata
			};
			this.initializers.push(initializer);
			this.emit("addInitial", initializer);
			this.checkTransactionEnd();
			return this;
		}
		addInitialIndex(data, node, port, index, metadata = {}) {
			if (!this.getNode(node)) return this;
			const indexVal = index === null ? void 0 : index;
			const portName = this.getPortName(port);
			this.checkTransactionStart();
			const initializer = {
				from: { data },
				to: {
					node,
					port: portName,
					index: indexVal
				},
				metadata
			};
			this.initializers.push(initializer);
			this.emit("addInitial", initializer);
			this.checkTransactionEnd();
			return this;
		}
		addGraphInitial(data, node, metadata = {}) {
			const inport = this.inports[node];
			if (!inport) return this;
			return this.addInitial(data, inport.process, inport.port, metadata);
		}
		addGraphInitialIndex(data, node, index, metadata = {}) {
			const inport = this.inports[node];
			if (!inport) return this;
			return this.addInitialIndex(data, inport.process, inport.port, index, metadata);
		}
		removeInitial(node, port) {
			const portName = this.getPortName(port);
			this.checkTransactionStart();
			this.initializers = this.initializers.filter((iip) => {
				if (iip.to.node === node && iip.to.port === portName) {
					this.emit("removeInitial", iip);
					return false;
				}
				return true;
			});
			this.checkTransactionEnd();
			return this;
		}
		removeGraphInitial(node) {
			const inport = this.inports[node];
			if (!inport) return this;
			this.removeInitial(inport.process, inport.port);
			return this;
		}
		toDOT() {
			const cleanId = (id) => id.replace(/"/g, "\\\"");
			const cleanPort = (port) => port.replace(/\./g, "");
			const wrapQuotes = (id) => `"${cleanId(id)}"`;
			let dot = "digraph {\n";
			this.nodes.forEach((node) => {
				dot += `    ${wrapQuotes(node.id)} [label=${wrapQuotes(node.id)} shape=box]\n`;
			});
			this.initializers.forEach((initializer, id) => {
				let data;
				if (typeof initializer.from.data === "function") data = "Function";
				else data = JSON.stringify(initializer.from.data);
				dot += `    data${id} [label=${wrapQuotes(data)} shape=plaintext]\n`;
				dot += `    data${id} -> ${wrapQuotes(initializer.to.node)}[headlabel=${cleanPort(initializer.to.port)} labelfontcolor=blue labelfontsize=8.0]\n`;
			});
			this.edges.forEach((edge) => {
				dot += `    ${wrapQuotes(edge.from.node)} -> ${wrapQuotes(edge.to.node)}[taillabel=${cleanPort(edge.from.port)} headlabel=${cleanPort(edge.to.port)} labelfontcolor=blue labelfontsize=8.0]\n`;
			});
			dot += "}";
			return dot;
		}
		toYUML() {
			const yuml = [];
			this.initializers.forEach((initializer) => {
				yuml.push(`(start)[${initializer.to.port}]->(${initializer.to.node})`);
			});
			this.edges.forEach((edge) => {
				yuml.push(`(${edge.from.node})[${edge.from.port}]->(${edge.to.node})`);
			});
			return yuml.join(",");
		}
		toJSON() {
			const json = {
				caseSensitive: this.caseSensitive,
				properties: {
					name: this.name,
					...this.properties
				},
				inports: { ...this.inports },
				outports: { ...this.outports },
				groups: this.groups.map((group) => {
					const groupData = {
						name: group.name,
						nodes: group.nodes
					};
					if (group.metadata && Object.keys(group.metadata).length) groupData.metadata = { ...group.metadata };
					return groupData;
				}),
				processes: {},
				connections: []
			};
			if (json && json.properties) {
				delete json.properties.baseDir;
				delete json.properties.componentLoader;
			}
			this.nodes.forEach((node) => {
				if (!json.processes) json.processes = {};
				json.processes[node.id] = { component: node.component };
				if (node.metadata) json.processes[node.id].metadata = { ...node.metadata };
			});
			this.edges.forEach((edge) => {
				const connection = {
					src: {
						process: edge.from.node,
						port: edge.from.port,
						index: edge.from.index
					},
					tgt: {
						process: edge.to.node,
						port: edge.to.port,
						index: edge.to.index
					}
				};
				if (edge.metadata && Object.keys(edge.metadata).length) connection.metadata = { ...edge.metadata };
				if (!json.connections) json.connections = [];
				json.connections.push(connection);
			});
			this.initializers.forEach((initializer) => {
				const iip = {
					data: initializer.from.data,
					tgt: {
						process: initializer.to.node,
						port: initializer.to.port,
						index: initializer.to.index
					}
				};
				if (initializer.metadata && Object.keys(initializer.metadata).length) iip.metadata = { ...initializer.metadata };
				if (!json.connections) json.connections = [];
				json.connections.push(iip);
			});
			return json;
		}
		save(file, callback) {
			let promise;
			if (Platform_1.isBrowser()) promise = Promise.reject(/* @__PURE__ */ new Error("Saving graphs not supported on browser"));
			else promise = new Promise((resolve, reject) => {
				const json = JSON.stringify(this.toJSON(), null, 4);
				let filename = file;
				if (!filename.match(/\.json$/)) filename = `${file}.json`;
				fs_1.writeFile(filename, json, "utf-8", (err) => {
					if (err) {
						reject(err);
						return;
					}
					resolve(filename);
				});
			});
			if (callback) {
				promise.then((filename) => {
					callback(null, filename);
				}, callback);
				return;
			}
			return promise;
		}
	};
	exports.Graph = Graph;
	function createGraph(name, options) {
		return new Graph(name, options);
	}
	exports.createGraph = createGraph;
	function loadJSON(passedDefinition, callback, metadata = {}) {
		const promise = new Promise((resolve) => {
			let definition;
			if (typeof passedDefinition === "string") definition = JSON.parse(passedDefinition);
			else definition = clone(passedDefinition);
			if (!definition.properties) definition.properties = {};
			if (!definition.processes) definition.processes = {};
			if (!definition.connections) definition.connections = [];
			const graph = new Graph(definition.properties.name, { caseSensitive: definition.caseSensitive || false });
			graph.startTransaction("loadJSON", metadata);
			const properties = {};
			Object.keys(definition.properties).forEach((property) => {
				if (property === "name") return;
				if (!definition.properties) return;
				properties[property] = definition.properties[property];
			});
			graph.setProperties(properties);
			Object.keys(definition.processes).forEach((id) => {
				if (!definition.processes) return;
				const def = definition.processes[id];
				if (!def.metadata) def.metadata = {};
				graph.addNode(id, def.component, def.metadata);
			});
			definition.connections.forEach((conn) => {
				const meta = conn.metadata ? conn.metadata : {};
				if (typeof conn.data !== "undefined") {
					if (typeof conn.tgt.index === "number") graph.addInitialIndex(conn.data, conn.tgt.process, graph.getPortName(conn.tgt.port), conn.tgt.index, meta);
					else graph.addInitial(conn.data, conn.tgt.process, graph.getPortName(conn.tgt.port), meta);
					return;
				}
				if (typeof conn.src === "undefined") return;
				if (typeof conn.src.index === "number" || typeof conn.tgt.index === "number") {
					graph.addEdgeIndex(conn.src.process, graph.getPortName(conn.src.port), conn.src.index, conn.tgt.process, graph.getPortName(conn.tgt.port), conn.tgt.index, meta);
					return;
				}
				graph.addEdge(conn.src.process, graph.getPortName(conn.src.port), conn.tgt.process, graph.getPortName(conn.tgt.port), meta);
			});
			if (definition.inports) Object.keys(definition.inports).forEach((pub) => {
				if (!definition.inports || !definition.inports[pub]) return;
				const priv = definition.inports[pub];
				graph.addInport(pub, priv.process, graph.getPortName(priv.port), priv.metadata || {});
			});
			if (definition.outports) Object.keys(definition.outports).forEach((pub) => {
				if (!definition.outports || !definition.outports[pub]) return;
				const priv = definition.outports[pub];
				graph.addOutport(pub, priv.process, graph.getPortName(priv.port), priv.metadata || {});
			});
			if (definition.groups) definition.groups.forEach((group) => {
				graph.addGroup(group.name, group.nodes, group.metadata || {});
			});
			graph.endTransaction("loadJSON");
			resolve(graph);
		});
		if (callback) promise.then((graph) => {
			callback(null, graph);
		}, callback);
		return promise;
	}
	exports.loadJSON = loadJSON;
	function loadFBP(fbpData, callback, metadata = {}, caseSensitive = false) {
		const promise = new Promise((resolve) => {
			resolve(require_lib$1().parse(fbpData, { caseSensitive }));
		}).then((def) => loadJSON(def));
		if (callback) promise.then((graph) => {
			callback(null, graph);
		}, callback);
		return promise;
	}
	exports.loadFBP = loadFBP;
	function loadHTTP(url, callback) {
		const promise = new Promise((resolve, reject) => {
			const req = new XMLHttpRequest();
			req.onreadystatechange = () => {
				if (req.readyState !== 4) return;
				if (req.status !== 200) {
					reject(/* @__PURE__ */ new Error(`Failed to load ${url}: HTTP ${req.status}`));
					return;
				}
				resolve(req.responseText);
			};
			req.open("GET", url, true);
			req.send();
		});
		if (callback) promise.then((content) => {
			callback(null, content);
		}, callback);
		return promise;
	}
	function loadFile(file, callback, metadata = {}, caseSensitive = false) {
		let ioPromise;
		if (Platform_1.isBrowser()) ioPromise = loadHTTP(file);
		else ioPromise = new Promise((resolve, reject) => {
			fs_1.readFile(file, "utf-8", (err, data) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(data);
			});
		});
		const promise = ioPromise.then((content) => {
			if (file.split(".").pop() === "fbp") return loadFBP(content);
			return loadJSON(content);
		});
		if (callback) promise.then((content) => {
			callback(null, content);
		}, callback);
		return promise;
	}
	exports.loadFile = loadFile;
	function resetGraph(graph) {
		graph.groups.reverse();
		graph.groups.forEach((group) => {
			if (group != null) graph.removeGroup(group.name);
		});
		Object.keys(graph.outports).forEach((port) => {
			graph.removeOutport(port);
		});
		Object.keys(graph.inports).forEach((port) => {
			graph.removeInport(port);
		});
		graph.setProperties({});
		graph.initializers.reverse();
		graph.initializers.forEach((iip) => {
			graph.removeInitial(iip.to.node, iip.to.port);
		});
		graph.edges.reverse();
		graph.edges.forEach((edge) => {
			graph.removeEdge(edge.from.node, edge.from.port, edge.to.node, edge.to.port);
		});
		graph.nodes.reverse();
		graph.nodes.forEach((node) => {
			graph.removeNode(node.id);
		});
	}
	function mergeResolveTheirsNaive(base, to) {
		resetGraph(base);
		to.nodes.forEach((node) => {
			base.addNode(node.id, node.component, node.metadata);
		});
		to.edges.forEach((edge) => {
			base.addEdge(edge.from.node, edge.from.port, edge.to.node, edge.to.port, edge.metadata);
		});
		to.initializers.forEach((iip) => {
			if (typeof iip.to.index === "number") {
				base.addInitialIndex(iip.from.data, iip.to.node, iip.to.port, iip.to.index, iip.metadata || {});
				return;
			}
			base.addInitial(iip.from.data, iip.to.node, iip.to.port, iip.metadata || {});
		});
		base.setProperties(to.properties);
		Object.keys(to.inports).forEach((pub) => {
			const priv = to.inports[pub];
			base.addInport(pub, priv.process, priv.port, priv.metadata || {});
		});
		Object.keys(to.outports).forEach((pub) => {
			const priv = to.outports[pub];
			base.addOutport(pub, priv.process, priv.port, priv.metadata || {});
		});
		to.groups.forEach((group) => {
			base.addGroup(group.name, group.nodes, group.metadata || {});
		});
	}
	exports.mergeResolveTheirs = mergeResolveTheirsNaive;
	function equivalent(a, b) {
		return JSON.stringify(a) === JSON.stringify(b);
	}
	exports.equivalent = equivalent;
}));
//#endregion
//#region node_modules/fbp-graph/lib/index.js
var require_lib = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.Graph = exports.Journal = exports.graph = exports.journal = void 0;
	exports.journal = require_Journal();
	exports.graph = require_Graph();
	var Journal_1 = require_Journal();
	Object.defineProperty(exports, "Journal", {
		enumerable: true,
		get: function() {
			return Journal_1.Journal;
		}
	});
	var Graph_1 = require_Graph();
	Object.defineProperty(exports, "Graph", {
		enumerable: true,
		get: function() {
			return Graph_1.Graph;
		}
	});
}));
//#endregion
//#region node_modules/eventemitter3/index.mjs
var import_lib = require_lib();
var import_eventemitter3 = /* @__PURE__ */ __toESM(require_eventemitter3(), 1);
//#endregion
//#region node_modules/noflo/src/lib/IP.js
/**
* @typedef {Object<string, boolean|string>} IPOptions
*/
var IP = class IP {
	/**
	* @param {any} obj
	* @returns {boolean}
	*/
	static isIP(obj) {
		return obj && typeof obj === "object" && obj.isIP === true;
	}
	/**
	* @param {string} type
	* @param {any} data
	* @param {IPOptions} [options]
	*/
	constructor(type, data = null, options = {}) {
		this.type = type || "data";
		this.data = data;
		this.isIP = true;
		/** @type {string|null} */
		this.scope = null;
		/** @type {import("./Component").Component|null} */
		this.owner = null;
		this.clonable = false;
		/** @type {number|null} */
		this.index = null;
		this.schema = null;
		this.datatype = "all";
		this.initial = false;
		if (typeof options === "object") Object.keys(options).forEach((key) => {
			this[key] = options[key];
		});
	}
	/**
	* @returns {IP}
	*/
	clone() {
		const ip = new IP(this.type);
		Object.keys(this).forEach((key) => {
			const val = this[key];
			if (key === "owner") return;
			if (val === null) return;
			if (typeof val === "object") ip[key] = JSON.parse(JSON.stringify(val));
			else ip[key] = val;
		});
		return ip;
	}
	/**
	* @param {import("./Component").Component|null} owner
	*/
	move(owner) {
		this.owner = owner;
		return this;
	}
	drop() {
		Object.keys(this).forEach((key) => {
			delete this[key];
		});
	}
};
//#endregion
//#region node_modules/noflo/src/lib/Platform.js
/**
* @returns {boolean}
*/
function isBrowser() {
	if (typeof process !== "undefined" && process.execPath && process.execPath.match(/node|iojs/)) return false;
	return true;
}
/**
* @param {string} message
* @returns {void}
*/
function deprecated(message) {
	if (isBrowser()) {
		console.warn(message);
		return;
	}
	if (process.env.NOFLO_FATAL_DEPRECATED) throw new Error(message);
	console.warn(message);
}
/**
* @param {Function} func
* @returns {void}
*/
function makeAsync(func, sameLoop = false) {
	if (isBrowser()) {
		setTimeout(func, 0);
		return;
	}
	if (sameLoop) {
		setImmediate(() => {
			func();
		});
		return;
	}
	process.nextTick(func);
}
//#endregion
//#region node_modules/noflo/src/lib/InternalSocket.js
var InternalSocket_exports = /* @__PURE__ */ __exportAll({
	InternalSocket: () => InternalSocket,
	createSocket: () => createSocket
});
function legacyToIp(event, payload) {
	if (IP.isIP(payload)) return payload;
	switch (event) {
		case "begingroup": return new IP("openBracket", payload);
		case "endgroup": return new IP("closeBracket");
		case "data": return new IP("data", payload);
		default: return null;
	}
}
function ipToLegacy(ip) {
	switch (ip.type) {
		case "openBracket": return {
			event: "begingroup",
			payload: ip.data
		};
		case "data": return {
			event: "data",
			payload: ip.data
		};
		case "closeBracket": return {
			event: "endgroup",
			payload: ip.data
		};
		default: return null;
	}
}
/**
* @typedef SocketError
* @property {Error} error
* @property {string} [id]
* @property {import("fbp-graph/lib/Types").GraphNodeMetadata} [metadata]
*/
var InternalSocket = class extends import_eventemitter3.default {
	/**
	* @private
	*/
	regularEmitEvent(event, data) {
		this.emit(event, data);
	}
	/**
	* @private
	*/
	debugEmitEvent(event, data) {
		try {
			this.emit(event, data);
		} catch (error) {
			if (error.id && error.metadata && error.error) {
				if (this.listeners("error").length === 0) throw error.error;
				this.emit("error", error);
				return;
			}
			if (this.listeners("error").length === 0) throw error;
			this.emit("error", {
				id: this.to ? this.to.process.id : null,
				error,
				metadata: this.metadata
			});
		}
	}
	/**
	* @typedef InternalSocketOptions
	* @property {boolean} [debug] - Whether to catch exceptions caused by IP transmission
	* @property {boolean} [async] - Whether IP transmission should be asynchronous
	*/
	/**
	* @param {import("fbp-graph/lib/Types").GraphEdgeMetadata} [metadata]
	* @param {InternalSocketOptions} [options]
	*/
	constructor(metadata = {}, options = {}) {
		super();
		this.metadata = metadata;
		this.brackets = [];
		this.connected = false;
		this.dataDelegate = null;
		this.debug = options.debug || false;
		this.async = options.async || false;
		this.from = null;
		this.to = null;
	}
	emitEvent(event, data) {
		if (this.debug) {
			if (this.async) {
				makeAsync(() => this.debugEmitEvent(event, data));
				return;
			}
			this.debugEmitEvent(event, data);
			return;
		}
		if (this.async) {
			makeAsync(() => this.regularEmitEvent(event, data));
			return;
		}
		this.regularEmitEvent(event, data);
	}
	connect() {
		if (this.connected) return;
		this.connected = true;
		this.emitEvent("connect", null);
	}
	disconnect() {
		if (!this.connected) return;
		this.connected = false;
		this.emitEvent("disconnect", null);
	}
	isConnected() {
		return this.connected;
	}
	send(data) {
		if (data === void 0 && typeof this.dataDelegate === "function") {
			this.handleSocketEvent("data", this.dataDelegate());
			return;
		}
		this.handleSocketEvent("data", data);
	}
	post(packet, autoDisconnect = true) {
		let ip = packet;
		if (ip === void 0 && typeof this.dataDelegate === "function") ip = this.dataDelegate();
		if (!this.isConnected() && this.brackets.length === 0) this.connect();
		this.handleSocketEvent("ip", ip, false);
		if (autoDisconnect && this.isConnected() && this.brackets.length === 0) this.disconnect();
	}
	beginGroup(group) {
		this.handleSocketEvent("begingroup", group);
	}
	endGroup() {
		this.handleSocketEvent("endgroup");
	}
	setDataDelegate(delegate) {
		if (typeof delegate !== "function") throw Error("A data delegate must be a function.");
		this.dataDelegate = delegate;
	}
	setDebug(active) {
		this.debug = active;
	}
	getId() {
		const fromStr = (from) => `${from.process.id}() ${from.port.toUpperCase()}`;
		const toStr = (to) => `${to.port.toUpperCase()} ${to.process.id}()`;
		if (!this.from && !this.to) return "UNDEFINED";
		if (this.from && !this.to) return `${fromStr(this.from)} -> ANON`;
		if (!this.from) return `DATA -> ${toStr(this.to)}`;
		return `${fromStr(this.from)} -> ${toStr(this.to)}`;
	}
	handleSocketEvent(event, payload, autoConnect = true) {
		const isIP = event === "ip" && IP.isIP(payload);
		const ip = isIP ? payload : legacyToIp(event, payload);
		if (!ip) return;
		if (!this.isConnected() && autoConnect && this.brackets.length === 0) this.connect();
		if (event === "begingroup") this.brackets.push(payload);
		if (isIP && ip.type === "openBracket") this.brackets.push(ip.data);
		if (event === "endgroup") {
			if (this.brackets.length === 0) return;
			ip.data = this.brackets.pop();
			payload = ip.data;
		}
		if (isIP && payload.type === "closeBracket") {
			if (this.brackets.length === 0) return;
			this.brackets.pop();
		}
		this.emitEvent("ip", ip);
		if (!ip?.type) return;
		if (isIP) {
			const legacy = ipToLegacy(ip);
			({event, payload} = legacy);
		}
		if (event === "connect") this.connected = true;
		if (event === "disconnect") this.connected = false;
		this.emitEvent(event, payload);
	}
};
/**
* @param {import("fbp-graph/lib/Types").GraphEdgeMetadata} [metadata]
* @param {InternalSocketOptions} [options]
* @returns {InternalSocket}
*/
function createSocket(metadata = {}, options = {}) {
	return new InternalSocket(metadata, options);
}
//#endregion
//#region node_modules/noflo-component-loader/lib/loader.js
var require_loader = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function registerCustomLoaders(loader, loaders, callback) {
		if (!loaders.length) {
			callback();
			return;
		}
		const customLoader = loaders.shift();
		loader.registerLoader(customLoader, (err) => {
			if (err) {
				callback(err);
				return;
			}
			registerCustomLoaders(loader, loaders, callback);
		});
	}
	function setSource(sources, loader, packageId, name, originalSource, language, callback) {
		let implementation;
		let source = originalSource;
		if (language === "coffeescript") {
			if (typeof window !== "undefined" && !window.CoffeeScript) {
				callback(/* @__PURE__ */ new Error(`CoffeeScript compiler needed for ${packageId}/${name} not available`));
				return;
			}
			try {
				source = window.CoffeeScript.compile(source, { bare: true });
			} catch (e) {
				callback(e);
				return;
			}
		}
		if (language === "es6" || language === "es2015") {
			if (typeof window !== "undefined" && window.babel) try {
				source = window.babel.transform(source).code;
			} catch (e) {
				callback(e);
				return;
			}
		}
		try {
			const withExports = `(function () { var exports = {}; ${source}; return exports; })();`;
			implementation = eval(withExports);
		} catch (e) {
			callback(e);
			return;
		}
		if (typeof implementation !== "function" && (!implementation.getComponent || typeof implementation.getComponent !== "function")) {
			callback(/* @__PURE__ */ new Error(`Provided source for ${packageId}/${name} failed to create a runnable component`));
			return;
		}
		const fullName = `${packageId}/${name}`;
		sources[fullName] = {
			language,
			source: originalSource
		};
		loader.registerComponent(packageId, name, implementation, callback);
	}
	function getSource(sources, loader, name, callback) {
		if (!loader.components[name]) {
			callback(/* @__PURE__ */ new Error(`Component ${name} not available`));
			return;
		}
		const component = loader.components[name];
		let componentData;
		if (name.indexOf("/") !== -1) {
			const nameParts = name.split("/");
			componentData = {
				name: nameParts[1],
				library: nameParts[0]
			};
		} else componentData = {
			name,
			library: ""
		};
		if (loader.isGraph(component)) {
			componentData.code = JSON.stringify(component, null, 2);
			componentData.language = "json";
			callback(null, componentData);
			return;
		}
		if (sources[name]) {
			componentData.code = sources[name].source;
			componentData.language = sources[name].language;
			componentData.tests = sources[name].tests;
			callback(null, componentData);
			return;
		}
		if (typeof component === "function") {
			componentData.code = component.toString();
			componentData.language = "javascript";
			callback(null, componentData);
			return;
		}
		if (typeof component.getComponent === "function") {
			componentData.code = component.getComponent.toString();
			componentData.language = "javascript";
			callback(null, componentData);
			return;
		}
		callback(/* @__PURE__ */ new Error(`Unable to get sources for ${name}`));
	}
	function getLanguages() {
		const languages = ["javascript", "es2015"];
		if (typeof window !== "undefined" && window.CoffeeScript) languages.push("coffeescript");
		return languages;
	}
	module.exports = {
		registerCustomLoaders,
		setSource,
		getSource,
		getLanguages
	};
}));
//#endregion
//#region node_modules/noflo/src/lib/loader/register.js
var require_register = /* @__PURE__ */ __commonJSMin(((exports) => {
	const baseLoader = require_loader();
	const sources = {};
	exports.setSource = function(loader, packageId, name, source, language, callback) {
		baseLoader.setSource(sources, loader, packageId, name, source, language, callback);
	};
	exports.getSource = function(loader, name, callback) {
		baseLoader.getSource(sources, loader, name, callback);
	};
	exports.getLanguages = baseLoader.getLanguages;
	exports.register = function(loader, callback) {
		baseLoader.registerCustomLoaders(loader, [], callback);
	};
}));
//#endregion
//#region node_modules/noflo/src/lib/ComponentLoader.js
var import_register = /* @__PURE__ */ __toESM(require_register());
/**
* @callback ComponentFactory
* @param {import("fbp-graph/lib/Types").GraphNodeMetadata} [metadata]
* @returns {import("./Component").Component}
*/
/**
* @typedef {Object} ModuleComponent
* @property {ComponentFactory} getComponent
*/
/** @typedef {string | ModuleComponent | ComponentFactory | import("fbp-graph").Graph } ComponentDefinition */
/** @typedef {string | ModuleComponent | ComponentFactory } ComponentDefinitionWithoutGraph */
/**
* @typedef {Object<string, ComponentDefinition>} ComponentList
*/
/**
* @typedef {Object} ComponentSources
* @property {string} name
* @property {string} library
* @property {string} code
* @property {string} language
* @property {string} [tests]
*/
/**
* @typedef ComponentLoaderOptions
* @property {boolean} [cache]
* @property {boolean} [discover]
* @property {boolean} [recursive]
* @property {string[]} [runtimes]
* @property {string} [manifest]
*/
var ComponentLoader = class {
	/**
	* @param {string} baseDir
	* @param {ComponentLoaderOptions} [options]
	*/
	constructor(baseDir, options = {}) {
		this.baseDir = baseDir;
		this.options = options;
		/** @type {ComponentList|null} */
		this.components = null;
		/** @type {Object<string, string>} */
		this.libraryIcons = {};
		/** @type {Object<string, Object>} */
		this.sourcesForComponents = {};
		/** @type {Object<string, string>} */
		this.specsForComponents = {};
		/** @type {Promise<ComponentList> | null}; */
		this.processing = null;
		this.ready = false;
	}
	/**
	* @param {string} name
	* @returns {string}
	*/
	getModulePrefix(name) {
		if (!name) return "";
		let res = name;
		if (res === "noflo") return "";
		if (res[0] === "@") res = res.replace(/@[a-z-]+\//, "");
		return res.replace(/^noflo-/, "");
	}
	/**
	* @param {any} [callback] - Legacy callback
	* @returning {Promise<ComponentList>} Promise resolving to list of loaded components
	*/
	listComponents(callback) {
		let promise;
		if (this.processing) promise = this.processing;
		else if (this.ready && this.components) promise = Promise.resolve(this.components);
		else {
			this.components = {};
			this.ready = false;
			this.processing = new Promise((resolve, reject) => {
				makeAsync(() => {
					import_register.register(this, (err) => {
						if (err) {
							reject(err);
							return;
						}
						this.ready = true;
						this.processing = null;
						resolve(this.components);
					});
				});
			});
			promise = this.processing;
		}
		if (callback) {
			deprecated("Providing a callback to ComponentLoader.listComponents is deprecated, use Promises");
			promise.then((components) => {
				callback(null, components);
			}, callback);
		}
		return promise;
	}
	/**
	* @param {string} name - Component name
	* @param {import("fbp-graph/lib/Types").GraphNodeMetadata} meta - Node metadata
	* @param {any} [cb] - Legacy callback
	* @returns {Promise<import("./Component").Component>}
	*/
	load(name, meta, cb) {
		let metadata = meta;
		let callback = cb;
		if (typeof meta === "function") {
			callback = meta;
			metadata = cb;
		}
		if (!this.ready) return this.listComponents().then(() => this.load(name, meta, cb));
		const promise = new Promise((resolve, reject) => {
			if (!this.components) {
				reject(/* @__PURE__ */ new Error(`Component ${name} not available with base ${this.baseDir}`));
				return;
			}
			let component = this.components[name];
			if (!component) {
				const keys = Object.keys(this.components);
				for (let i = 0; i < keys.length; i += 1) {
					const componentName = keys[i];
					if (componentName.split("/")[1] === name) {
						component = this.components[componentName];
						break;
					}
				}
				if (!component) {
					reject(/* @__PURE__ */ new Error(`Component ${name} not available with base ${this.baseDir}`));
					return;
				}
			}
			resolve(component);
		}).then((component) => {
			if (this.isGraph(component)) return this.loadGraph(name, component, metadata);
			return this.createComponent(name, component, metadata).then((instance) => {
				if (!instance) return Promise.reject(/* @__PURE__ */ new Error(`Component ${name} could not be loaded.`));
				const inst = instance;
				if (name === "Graph") inst.baseDir = this.baseDir;
				if (typeof name === "string") inst.componentName = name;
				if (inst.isLegacy()) deprecated(`Component ${name} uses legacy NoFlo APIs. Please port to Process API`);
				this.setIcon(name, inst);
				return inst;
			});
		});
		if (callback) {
			deprecated("Providing a callback to ComponentLoader.load is deprecated, use Promises");
			promise.then((instance) => {
				callback(null, instance);
			}, callback);
		}
		return promise;
	}
	/**
	* Creates an instance of a component.
	* @param {string} name
	* @param {ComponentDefinitionWithoutGraph} component
	* @param {import("fbp-graph/lib/Types").GraphNodeMetadata} metadata
	* @returns {Promise<import("./Component").Component>}
	*/
	createComponent(name, component, metadata) {
		const implementation = component;
		if (!implementation) return Promise.reject(/* @__PURE__ */ new Error(`Component ${name} not available`));
		if (typeof implementation === "string") {
			if (typeof import_register.dynamicLoad === "function") return new Promise((resolve, reject) => {
				import_register.dynamicLoad(name, implementation, metadata, (err, instance) => {
					if (err) {
						reject(err);
						return;
					}
					resolve(instance);
				});
			});
			return Promise.reject(Error(`Dynamic loading of ${implementation} for component ${name} not available on this platform.`));
		}
		let instance;
		const impl = implementation;
		if (typeof impl.getComponent === "function") try {
			instance = impl.getComponent(metadata);
		} catch (error) {
			return Promise.reject(error);
		}
		else if (typeof implementation === "function") try {
			instance = implementation(metadata);
		} catch (error) {
			return Promise.reject(error);
		}
		else return Promise.reject(/* @__PURE__ */ new Error(`Invalid type ${typeof implementation} for component ${name}.`));
		return Promise.resolve(instance);
	}
	/**
	* @param {import("fbp-graph").Graph|object|string} cPath
	* @returns {boolean}
	*/
	isGraph(cPath) {
		if (typeof cPath === "object" && (cPath instanceof import_lib.Graph || Array.isArray(cPath.nodes) && Array.isArray(cPath.edges) && Array.isArray(cPath.initializers))) return true;
		if (typeof cPath === "object" && cPath.processes && cPath.connections) return true;
		if (typeof cPath !== "string") return false;
		return cPath.indexOf(".fbp") !== -1 || cPath.indexOf(".json") !== -1;
	}
	/**
	* @protected
	* @param {string} name
	* @param {import("fbp-graph").Graph} component
	* @param {import("fbp-graph/lib/Types").GraphNodeMetadata} metadata
	* @returns {Promise<import("../components/Graph").Graph>}
	*/
	loadGraph(name, component, metadata) {
		const graphComponent = this.components.Graph;
		return this.createComponent(name, graphComponent, metadata).then((graph) => {
			const g = graph;
			g.loader = this;
			g.baseDir = this.baseDir;
			g.inPorts.remove("graph");
			this.setIcon(name, g);
			return g.setGraph(component).then(() => g);
		});
	}
	/**
	* @param {string} name - Icon to set
	* @param {import("./Component").Component} instance
	*/
	setIcon(name, instance) {
		if (!instance.getIcon || instance.getIcon()) return;
		const [library, componentName] = name.split("/");
		if (componentName && this.getLibraryIcon(library)) {
			instance.setIcon(this.getLibraryIcon(library));
			return;
		}
		if (instance.isSubgraph()) {
			instance.setIcon("sitemap");
			return;
		}
		instance.setIcon("gear");
	}
	/**
	* @param {string} prefix
	* @returns {string|null}
	*/
	getLibraryIcon(prefix) {
		if (this.libraryIcons[prefix]) return this.libraryIcons[prefix];
		return null;
	}
	/**
	* @param {string} prefix
	* @param {string} icon
	*/
	setLibraryIcon(prefix, icon) {
		this.libraryIcons[prefix] = icon;
	}
	/**
	* @param {string} packageId
	* @param {string} name
	* @returns {string}
	*/
	normalizeName(packageId, name) {
		let fullName = `${this.getModulePrefix(packageId)}/${name}`;
		if (!packageId) fullName = name;
		return fullName;
	}
	/**
	* @callback ErrorableCallback
	* @param {Error|null} error
	* @returns {void}
	*/
	/**
	* @param {string} packageId
	* @param {string} name
	* @param {ComponentDefinition} cPath
	* @param {ErrorableCallback} [callback]
	*/
	registerComponent(packageId, name, cPath, callback) {
		const fullName = this.normalizeName(packageId, name);
		this.components[fullName] = cPath;
		if (callback) callback(null);
	}
	/**
	* @param {string} packageId
	* @param {string} name
	* @param {import("fbp-graph").Graph} gPath
	* @param {ErrorableCallback} [callback]
	*/
	registerGraph(packageId, name, gPath, callback) {
		this.registerComponent(packageId, name, gPath, callback);
	}
	/**
	* @callback CustomLoader
	* @param {ComponentLoader} loader
	* @param {ErrorableCallback} callback
	* @returns {void}
	*/
	/**
	* @param {CustomLoader} loader
	* @param {ErrorableCallback} callback
	*/
	registerLoader(loader, callback) {
		loader(this, callback);
	}
	/**
	* @param {string} packageId
	* @param {string} name
	* @param {string} source
	* @param {string} language
	* @param {ErrorableCallback} [callback]
	* @returns {Promise<void>}
	*/
	setSource(packageId, name, source, language, callback) {
		if (!this.ready) return this.listComponents().then(() => this.setSource(packageId, name, source, language, callback));
		let promise;
		if (!import_register.setSource) promise = Promise.reject(/* @__PURE__ */ new Error("setSource not allowed"));
		else promise = new Promise((resolve, reject) => {
			import_register.setSource(this, packageId, name, source, language, (err) => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
		if (callback) {
			deprecated("Providing a callback to ComponentLoader.setSource is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	/**
	* @callback SourceCallback
	* @param {Error|null} error
	* @param {ComponentSources} [source]
	*/
	/**
	* @param {string} name
	* @param {SourceCallback} [callback]
	* @returns {Promise<ComponentSources>}
	*/
	getSource(name, callback) {
		if (!this.ready) return this.listComponents().then(() => this.getSource(name, callback));
		let promise;
		if (!import_register.getSource) promise = Promise.reject(/* @__PURE__ */ new Error("getSource not allowed"));
		else promise = new Promise((resolve, reject) => {
			import_register.getSource(this, name, (err, source) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(source);
			});
		});
		if (callback) {
			deprecated("Providing a callback to ComponentLoader.getSource is deprecated, use Promises");
			promise.then((source) => {
				callback(null, source);
			}, callback);
		}
		return promise;
	}
	getLanguages() {
		if (!import_register.getLanguages) return ["javascript", "es2015"];
		return import_register.getLanguages();
	}
	clear() {
		this.components = null;
		this.sourcesForComponents = {};
		this.specsForComponents = {};
		this.ready = false;
		this.processing = null;
	}
};
//#endregion
//#region node_modules/noflo/src/lib/Utils.js
/**
* @param {Function} func
* @param {number} wait
* @param {boolean} [immediate]
* @returns {Function}
*/
function debounce(func, wait, immediate) {
	/** @type {any} */
	let timeout;
	/** @type {IArguments|null} */
	let args;
	/** @type {any} */
	let context;
	/** @type {number} */
	let timestamp;
	/** @type {any} */
	let result;
	function later() {
		const last = Date.now() - timestamp;
		if (last < wait && last >= 0) timeout = setTimeout(later, wait - last);
		else {
			timeout = null;
			if (!immediate) {
				result = func.apply(context, args);
				if (!timeout) {
					context = null;
					args = null;
				}
			}
		}
	}
	return function after() {
		context = this;
		args = arguments;
		timestamp = Date.now();
		const callNow = immediate && !timeout;
		if (!timeout) timeout = setTimeout(later, wait);
		if (callNow) {
			result = func.apply(context, args);
			context = null;
			args = null;
		}
		return result;
	};
}
//#endregion
//#region node_modules/noflo/src/lib/BaseNetwork.js
/**
* @typedef NetworkProcess
* @property {string} id
* @property {string} [componentName]
* @property {import("./Component").Component} [component]
*/
/**
* @typedef NetworkIIP
* @property {internalSocket.InternalSocket} socket
* @property {any} data
*/
/**
* @typedef NetworkEvent
* @property {string} type
* @property {Object} payload
*/
/**
* @param {internalSocket.InternalSocket} socket
* @param {NetworkProcess} process
* @param {string} port
* @param {number|null} index
* @param {boolean} inbound
* @returns {Promise<internalSocket.InternalSocket>}
*/
function connectPort(socket, process, port, index, inbound) {
	if (inbound) {
		socket.to = {
			process,
			port,
			index
		};
		if (!process.component?.inPorts?.ports[port]) return Promise.reject(/* @__PURE__ */ new Error(`No inport '${port}' defined in process ${process.id} (${socket.getId()})`));
		if (process.component.inPorts.ports[port].isAddressable()) {
			process.component.inPorts.ports[port].attach(socket, index);
			return Promise.resolve(socket);
		}
		process.component.inPorts.ports[port].attach(socket);
		return Promise.resolve(socket);
	}
	socket.from = {
		process,
		port,
		index
	};
	if (!process.component?.outPorts?.ports[port]) return Promise.reject(/* @__PURE__ */ new Error(`No outport '${port}' defined in process ${process.id} (${socket.getId()})`));
	if (process.component.outPorts.ports[port].isAddressable()) {
		process.component.outPorts.ports[port].attach(socket, index);
		return Promise.resolve(socket);
	}
	process.component.outPorts.ports[port].attach(socket);
	return Promise.resolve(socket);
}
/**
* @typedef NetworkOwnOptions
* @property {string} [baseDir] - Project base directory for component loading
* @property {ComponentLoader} [componentLoader] - Component loader instance to use, if any
* @property {Object} [flowtrace] - Flowtrace instance to use for tracing this network run
* @property {boolean} [asyncDelivery] - Make Information Packet delivery asynchronous
*/
/**
* @typedef { NetworkOwnOptions & import("./ComponentLoader").ComponentLoaderOptions} NetworkOptions
*/
var BaseNetwork = class extends import_eventemitter3.default {
	/**
	* All NoFlo networks are instantiated with a graph. Upon instantiation
	* they will load all the needed components, instantiate them, and
	* set up the defined connections and IIPs.
	*
	* @param {import("fbp-graph").Graph} graph - Graph definition to build a Network for
	* @param {NetworkOptions} options - Network options
	*/
	constructor(graph, options = {}) {
		super();
		this.options = options;
		/** @type {Object<string, NetworkProcess>} */
		this.processes = {};
		/** @type {Array<internalSocket.InternalSocket>} */
		this.connections = [];
		/** @type {Array<NetworkIIP>} */
		this.initials = [];
		/** @type {Array<NetworkIIP>} */
		this.nextInitials = [];
		/** @type {Array<import("./InternalSocket").InternalSocket>} */
		this.defaults = [];
		this.graph = graph;
		this.started = false;
		this.stopped = true;
		this.debug = true;
		this.asyncDelivery = options.asyncDelivery || false;
		/** @type {Array<NetworkEvent>} */
		this.eventBuffer = [];
		if (graph.properties.baseDir && !options.baseDir) deprecated("Passing baseDir via Graph properties is deprecated, pass via Network options instead");
		this.baseDir = null;
		if (!isBrowser()) this.baseDir = options.baseDir || graph.properties.baseDir || process.cwd();
		else this.baseDir = options.baseDir || graph.properties.baseDir || "/";
		/** @type {Date | null} */
		this.startupDate = null;
		if (options.componentLoader)
 /** @type {ComponentLoader} */
		this.loader = options.componentLoader;
		else if (graph.properties.componentLoader) {
			deprecated("Passing componentLoader via Graph properties is deprecated, pass via Network options instead");
			/** @type {ComponentLoader} */
			this.loader = graph.properties.componentLoader;
		} else
 /** @type {ComponentLoader} */
		this.loader = new ComponentLoader(this.baseDir, this.options);
		this.flowtraceName = null;
		this.setFlowtrace(options.flowtrace || false, null);
	}
	/**
	* @returns {number}
	*/
	uptime() {
		if (!this.startupDate) return 0;
		return Date.now() - this.startupDate.getTime();
	}
	/**
	* @returns {string[]}
	*/
	getActiveProcesses() {
		/** @type {Array<string>} */
		const active = [];
		if (!this.started) return active;
		Object.keys(this.processes).forEach((name) => {
			const process = this.processes[name];
			if (!process?.component) return;
			if (process.component.load > 0) active.push(name);
			if (process.component.__openConnections > 0) active.push(name);
		});
		return active;
	}
	/**
	* @param {string} event
	* @param {any} payload
	* @private
	*/
	traceEvent(event, payload) {
		if (!this.flowtrace) return;
		if (this.flowtraceName && this.flowtraceName !== this.flowtrace.mainGraph) return;
		switch (event) {
			case "ip": {
				let type = "data";
				if (payload.type === "openBracket") type = "begingroup";
				else if (payload.type === "closeBracket") type = "endgroup";
				const src = payload.socket.from ? {
					node: payload.socket.from.process.id,
					port: payload.socket.from.port
				} : null;
				const tgt = payload.socket.to ? {
					node: payload.socket.to.process.id,
					port: payload.socket.to.port
				} : null;
				this.flowtrace.addNetworkPacket(`network:${type}`, src, tgt, this.flowtraceName, {
					subgraph: payload.subgraph,
					group: payload.group,
					datatype: payload.datatype,
					schema: payload.schema,
					data: payload.data
				});
				break;
			}
			case "start":
				this.flowtrace.addNetworkStarted(this.flowtraceName);
				break;
			case "end":
				this.flowtrace.addNetworkStopped(this.flowtraceName);
				break;
			case "error":
				this.flowtrace.addNetworkError(this.flowtraceName, payload);
				break;
			default:
		}
	}
	/**
	* @param {string} event
	* @param {any} payload
	* @protected
	*/
	bufferedEmit(event, payload) {
		this.traceEvent(event, payload);
		if ([
			"icon",
			"error",
			"process-error",
			"end"
		].includes(event)) {
			this.emit(event, payload);
			return;
		}
		if (!this.isStarted() && event !== "end") {
			this.eventBuffer.push({
				type: event,
				payload
			});
			return;
		}
		this.emit(event, payload);
		if (event === "start") {
			this.eventBuffer.forEach((ev) => {
				this.emit(ev.type, ev.payload);
			});
			this.eventBuffer = [];
		}
		if (event === "ip") switch (payload.type) {
			case "openBracket":
				this.bufferedEmit("begingroup", payload);
				return;
			case "closeBracket":
				this.bufferedEmit("endgroup", payload);
				return;
			case "data":
				this.bufferedEmit("data", payload);
				break;
			default:
		}
	}
	/**
	* @callback ComponentLoadCallback
	* @param {Error|null} err
	* @param {import("./Component").Component} [component]
	* @returns {void}
	*/
	/**
	* @param {string} component
	* @param {import("fbp-graph/lib/Types").GraphNodeMetadata} metadata
	* @param {ComponentLoadCallback} [callback]
	* @returns {Promise<import("./Component").Component>}
	*/
	load(component, metadata, callback) {
		const promise = this.loader.load(component, metadata);
		if (callback) {
			deprecated("Providing a callback to Network.load is deprecated, use Promises");
			promise.then((instance) => {
				callback(null, instance);
			}, callback);
		}
		return promise;
	}
	/**
	* @callback AddNodeCallback
	* @param {Error|null} error
	* @param {NetworkProcess} [process]
	* @returns {void}
	*/
	/**
	* @param {import("fbp-graph/lib/Types").GraphNode} node
	* @param {Object} options
	* @param {AddNodeCallback} [callback]
	* @returns {Promise<NetworkProcess>}
	*/
	addNode(node, options, callback) {
		if (typeof options === "function") {
			callback = options;
			options = {};
		}
		let promise;
		if (this.processes[node.id]) promise = Promise.resolve(this.processes[node.id]);
		else {
			/** @type {NetworkProcess} */
			const process = { id: node.id };
			if (!node.component) {
				this.processes[process.id] = process;
				promise = Promise.resolve(process);
			} else promise = this.load(node.component, node.metadata).then((instance) => {
				instance.nodeId = node.id;
				process.component = instance;
				process.componentName = node.component;
				const inPorts = process.component.inPorts.ports;
				const outPorts = process.component.outPorts.ports;
				Object.keys(inPorts).forEach((name) => {
					const port = inPorts[name];
					port.node = node.id;
					port.nodeInstance = instance;
					port.name = name;
				});
				Object.keys(outPorts).forEach((name) => {
					const port = outPorts[name];
					port.node = node.id;
					port.nodeInstance = instance;
					port.name = name;
				});
				if (instance.isSubgraph()) this.subscribeSubgraph(process);
				this.subscribeNode(process);
				this.processes[process.id] = process;
				return process;
			});
		}
		if (callback) {
			deprecated("Providing a callback to Network.addNode is deprecated, use Promises");
			promise.then((process) => {
				callback(null, process);
			}, callback);
		}
		return promise;
	}
	/**
	* @param {import("fbp-graph/lib/Types").GraphNode} node
	* @param {ErrorableCallback} [callback]
	* @returns {Promise<void>}
	*/
	removeNode(node, callback) {
		let promise;
		const process = this.getNode(node.id);
		if (!process) promise = Promise.reject(/* @__PURE__ */ new Error(`Node ${node.id} not found`));
		else {
			if (!process.component) {
				delete this.processes[node.id];
				return Promise.resolve();
			}
			promise = process.component.shutdown().then(() => {
				delete this.processes[node.id];
				return Promise.resolve();
			});
		}
		if (callback) {
			deprecated("Providing a callback to Network.removeNode is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	/**
	* @param {string} oldId
	* @param {string} newId
	* @param {ErrorableCallback} [callback]
	* @returns {Promise<void>}
	*/
	renameNode(oldId, newId, callback) {
		const process = this.getNode(oldId);
		let promise;
		if (!process) promise = Promise.reject(/* @__PURE__ */ new Error(`Process ${oldId} not found`));
		else {
			process.id = newId;
			if (process.component) {
				const inPorts = process.component.inPorts.ports;
				const outPorts = process.component.outPorts.ports;
				Object.keys(inPorts).forEach((name) => {
					const port = inPorts[name];
					if (!port) return;
					port.node = newId;
				});
				Object.keys(outPorts).forEach((name) => {
					const port = outPorts[name];
					if (!port) return;
					port.node = newId;
				});
			}
			this.processes[newId] = process;
			delete this.processes[oldId];
			promise = Promise.resolve();
		}
		if (callback) {
			deprecated("Providing a callback to Network.renameNode is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	/**
	* @param {string} id compone
	* @returns {NetworkProcess|void}
	*/
	getNode(id) {
		return this.processes[id];
	}
	/**
	* @callback ErrorableCallback
	* @param {Error|null} [err]
	* @returns {void}
	*/
	/**
	* @param {ErrorableCallback} [callback]
	* @returns {Promise<this>}
	*/
	connect(callback) {
		/**
		* @param {string} key
		* @param {string} method
		* @returns {Promise<any>}
		*/
		const handleAll = (key, method) => this.graph[key].reduce((chain, entity) => chain.then(() => this[method](entity, { initial: true })), Promise.resolve());
		const promise = Promise.resolve().then(() => handleAll("nodes", "addNode")).then(() => handleAll("edges", "addEdge")).then(() => handleAll("initializers", "addInitial")).then(() => handleAll("nodes", "addDefaults")).then(() => this);
		if (callback) {
			deprecated("Providing a callback to Network.connect is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	/**
	* @private
	* @param {NetworkProcess} node
	*/
	subscribeSubgraph(node) {
		if (!node.component) return;
		if (!node.component.isReady()) {
			node.component.once("ready", () => {
				this.subscribeSubgraph(node);
			});
			return;
		}
		const instance = node.component;
		if (!instance.network) return;
		instance.network.setDebug(this.debug);
		instance.network.setAsyncDelivery(this.asyncDelivery);
		if (this.flowtrace) instance.network.setFlowtrace(this.flowtrace, node.componentName, false);
		/**
		* @param {string} type
		* @param {any} data
		*/
		const emitSub = (type, data) => {
			if (type === "process-error" && this.listeners("process-error").length === 0) {
				if (data.id && data.metadata && data.error) throw data.error;
				throw data;
			}
			if (!data) data = {};
			if (data.subgraph) {
				if (!data.subgraph.unshift) data.subgraph = [data.subgraph];
				data.subgraph.unshift(node.id);
			} else data.subgraph = [node.id];
			this.bufferedEmit(type, data);
		};
		/**
		* @type {IP} data
		*/
		instance.network.on("ip", (data) => {
			emitSub("ip", data);
		});
		/**
		* @type {Error} data
		*/
		instance.network.on("process-error", (data) => {
			emitSub("process-error", data);
		});
	}
	/**
	* @param {internalSocket.InternalSocket} socket
	* @param {NetworkProcess} [source]
	*/
	subscribeSocket(socket, source) {
		socket.on("ip", (ip) => {
			this.bufferedEmit("ip", {
				id: socket.getId(),
				type: ip.type,
				socket,
				data: ip.data,
				metadata: socket.metadata
			});
		});
		socket.on("error", (event) => {
			if (this.listeners("process-error").length === 0) {
				if (event.id && event.metadata && event.error) throw event.error;
				throw event;
			}
			this.bufferedEmit("process-error", event);
		});
		if (!source?.component?.isLegacy()) return;
		const comp = source.component;
		socket.on("connect", () => {
			if (!comp.__openConnections) comp.__openConnections = 0;
			comp.__openConnections += 1;
		});
		socket.on("disconnect", () => {
			comp.__openConnections -= 1;
			if (comp.__openConnections < 0) comp.__openConnections = 0;
			if (comp.__openConnections === 0) this.checkIfFinished();
		});
	}
	/**
	* @param {NetworkProcess} node
	*/
	subscribeNode(node) {
		if (!node.component) return;
		const instance = node.component;
		instance.on("activate", () => {
			if (this.debouncedEnd) this.abortDebounce = true;
		});
		instance.on("deactivate", (load) => {
			if (load > 0) return;
			this.checkIfFinished();
		});
		if (!instance.getIcon) return;
		instance.on("icon", () => {
			this.bufferedEmit("icon", {
				id: node.id,
				icon: instance.getIcon()
			});
		});
	}
	/**
	* @protected
	* @param {string} node
	* @param {string} direction
	* @returns Promise<NetworkProcess>
	*/
	ensureNode(node, direction) {
		const instance = this.getNode(node);
		if (!instance) return Promise.reject(/* @__PURE__ */ new Error(`No process defined for ${direction} node ${node}`));
		if (!instance.component) return Promise.reject(/* @__PURE__ */ new Error(`No component defined for ${direction} node ${node}`));
		const comp = instance.component;
		if (!comp.isReady()) return new Promise((resolve) => {
			comp.once("ready", () => {
				resolve(instance);
			});
		});
		return Promise.resolve(instance);
	}
	/**
	* @callback AddEdgeCallback
	* @param {Error|null} error
	* @param {internalSocket.InternalSocket} [socket]
	* @returns {void}
	*/
	/**
	* @param {import("fbp-graph/lib/Types").GraphEdge} edge
	* @param {Object} options
	* @param {AddEdgeCallback} [callback]
	* @returns {Promise<internalSocket.InternalSocket>}
	*/
	addEdge(edge, options, callback) {
		if (typeof options === "function") {
			callback = options;
			options = {};
		}
		const promise = this.ensureNode(edge.from.node, "outbound").then((from) => {
			const socket = createSocket(edge.metadata, {
				debug: this.debug,
				async: this.asyncDelivery
			});
			return this.ensureNode(edge.to.node, "inbound").then((to) => {
				this.subscribeSocket(socket, from);
				return connectPort(socket, to, edge.to.port, edge.to.index, true);
			}).then(() => connectPort(socket, from, edge.from.port, edge.from.index, false)).then(() => {
				this.connections.push(socket);
				return socket;
			});
		});
		if (callback) {
			deprecated("Providing a callback to Network.addEdge is deprecated, use Promises");
			promise.then((socket) => {
				callback(null, socket);
			}, callback);
		}
		return promise;
	}
	/**
	* @param {import("fbp-graph/lib/Types").GraphEdge} edge
	* @param {ErrorableCallback} [callback]
	* @returns {Promise<void>}
	*/
	removeEdge(edge, callback) {
		this.connections.forEach((connection) => {
			if (!connection) return;
			if (edge.to.node !== connection.to.process.id || edge.to.port !== connection.to.port) return;
			connection.to.process.component.inPorts[connection.to.port].detach(connection);
			if (edge.from.node) {
				if (connection.from && edge.from.node === connection.from.process.id && edge.from.port === connection.from.port) connection.from.process.component.outPorts[connection.from.port].detach(connection);
			}
			this.connections.splice(this.connections.indexOf(connection), 1);
		});
		if (callback) {
			deprecated("Providing a callback to Network.removeEdge is deprecated, use Promises");
			callback(null);
		}
		return Promise.resolve();
	}
	/**
	* @protected
	* @param {import("fbp-graph/lib/Types").GraphNode} node
	* @returns {Promise<void>}
	*/
	addDefaults(node) {
		return this.ensureNode(node.id, "inbound").then((process) => Promise.all(Object.keys(process.component.inPorts.ports).map((key) => {
			const port = process.component.inPorts.ports[key];
			if (!port.hasDefault() || port.isAttached()) return Promise.resolve();
			const socket = createSocket({}, {
				debug: this.debug,
				async: this.asyncDelivery
			});
			this.subscribeSocket(socket);
			return connectPort(socket, process, key, void 0, true).then(() => {
				this.connections.push(socket);
				this.defaults.push(socket);
			});
		}))).then(() => {});
	}
	/**
	* @param {import("fbp-graph/lib/Types").GraphIIP} initializer
	* @param {Object} options
	* @param {AddEdgeCallback} [callback]
	* @returns {Promise<internalSocket.InternalSocket>}
	*/
	addInitial(initializer, options, callback) {
		if (typeof options === "function") {
			callback = options;
			options = {};
		}
		const promise = this.ensureNode(initializer.to.node, "inbound").then((to) => {
			const socket = createSocket(initializer.metadata, {
				debug: this.debug,
				async: this.asyncDelivery
			});
			this.subscribeSocket(socket);
			return connectPort(socket, to, initializer.to.port, initializer.to.index, true);
		}).then((socket) => {
			this.connections.push(socket);
			const init = {
				socket,
				data: initializer.from.data
			};
			this.initials.push(init);
			this.nextInitials.push(init);
			if (this.isRunning()) this.sendInitials();
			else if (!this.isStopped()) {
				this.setStarted(true);
				this.sendInitials();
			}
			return socket;
		});
		if (callback) {
			deprecated("Providing a callback to Network.addInitial is deprecated, use Promises");
			promise.then((socket) => {
				callback(null, socket);
			}, callback);
		}
		return promise;
	}
	/**
	* @param {import("fbp-graph/lib/Types").GraphIIP} initializer
	* @param {ErrorableCallback} [callback]
	* @returns {Promise<void>}
	*/
	removeInitial(initializer, callback) {
		this.connections.forEach((connection) => {
			if (!connection) return;
			if (initializer.to.node !== connection.to.process.id || initializer.to.port !== connection.to.port) return;
			connection.to.process.component.inPorts[connection.to.port].detach(connection);
			this.connections.splice(this.connections.indexOf(connection), 1);
			for (let i = 0; i < this.initials.length; i += 1) {
				const init = this.initials[i];
				if (!init) return;
				if (init.socket !== connection) return;
				this.initials.splice(this.initials.indexOf(init), 1);
			}
			for (let i = 0; i < this.nextInitials.length; i += 1) {
				const init = this.nextInitials[i];
				if (!init) return;
				if (init.socket !== connection) return;
				this.nextInitials.splice(this.nextInitials.indexOf(init), 1);
			}
		});
		if (callback) {
			deprecated("Providing a callback to Network.removeInitial is deprecated, use Promises");
			callback(null);
		}
		return Promise.resolve();
	}
	/**
	* @returns Promise<void>
	*/
	sendInitials() {
		return new Promise((resolve) => {
			makeAsync(resolve, true);
		}).then(() => this.initials.reduce((chain, initial) => chain.then(() => {
			initial.socket.post(new IP("data", initial.data, { initial: true }));
			return Promise.resolve();
		}), Promise.resolve())).then(() => {
			this.initials = [];
			return Promise.resolve();
		});
	}
	isStarted() {
		return this.started;
	}
	isStopped() {
		return this.stopped;
	}
	isRunning() {
		return this.getActiveProcesses().length > 0;
	}
	/**
	* @protected
	* @returns {Promise<void>}
	*/
	startComponents() {
		if (!this.processes || !Object.keys(this.processes).length) return Promise.resolve();
		return Promise.all(Object.keys(this.processes).map((id) => {
			const process = this.processes[id];
			if (!process.component) return Promise.resolve();
			return process.component.start();
		})).then(() => {});
	}
	/**
	* @returns Promise<void>
	*/
	sendDefaults() {
		return Promise.all(this.defaults.map((socket) => {
			if (socket.to.process.component.inPorts[socket.to.port].sockets.length !== 1) return Promise.resolve();
			socket.connect();
			socket.send();
			socket.disconnect();
			return Promise.resolve();
		})).then(() => {});
	}
	/**
	* @param {ErrorableCallback} [callback]
	* @returns {Promise<this>}
	*/
	start(callback) {
		if (this.debouncedEnd) this.abortDebounce = true;
		let promise;
		if (this.started) promise = this.stop().then(() => this.start());
		else {
			this.initials = this.nextInitials.slice(0);
			this.eventBuffer = [];
			promise = this.startComponents().then(() => this.sendInitials()).then(() => this.sendDefaults()).then(() => {
				this.setStarted(true);
				return Promise.resolve(this);
			});
		}
		if (callback) {
			deprecated("Providing a callback to Network.start is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	/**
	* @param {ErrorableCallback} [callback]
	* @returns {Promise<this>}
	*/
	stop(callback) {
		if (this.debouncedEnd) this.abortDebounce = true;
		let promise;
		if (!this.started) {
			this.stopped = true;
			promise = Promise.resolve(this);
		} else {
			this.connections.forEach((connection) => {
				if (!connection.isConnected()) return;
				connection.disconnect();
			});
			if (!this.processes || !Object.keys(this.processes).length) {
				this.setStarted(false);
				this.stopped = true;
				promise = Promise.resolve(this);
			} else promise = Promise.all(Object.keys(this.processes).map((id) => {
				if (!this.processes[id].component) return Promise.resolve();
				return this.processes[id].component.shutdown();
			})).then(() => {
				this.setStarted(false);
				this.stopped = true;
				return Promise.resolve(this);
			});
		}
		if (callback) {
			deprecated("Providing a callback to Network.stop is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	/**
	* @param {boolean} started
	*/
	setStarted(started) {
		if (this.started === started) return;
		if (!started) {
			this.started = false;
			this.bufferedEmit("end", {
				start: this.startupDate,
				end: /* @__PURE__ */ new Date(),
				uptime: this.uptime()
			});
			return;
		}
		if (!this.startupDate) this.startupDate = /* @__PURE__ */ new Date();
		this.started = true;
		this.stopped = false;
		this.bufferedEmit("start", { start: this.startupDate });
	}
	checkIfFinished() {
		if (this.isRunning()) return;
		delete this.abortDebounce;
		if (!this.debouncedEnd) this.debouncedEnd = debounce(() => {
			if (this.abortDebounce) return;
			if (this.isRunning()) return;
			this.setStarted(false);
		}, 50);
		this.debouncedEnd();
	}
	getDebug() {
		return this.debug;
	}
	/**
	* @param {boolean} active
	*/
	setDebug(active) {
		if (active === this.debug) return;
		this.debug = active;
		this.connections.forEach((socket) => {
			socket.setDebug(active);
		});
		Object.keys(this.processes).forEach((processId) => {
			const process = this.processes[processId];
			if (!process.component) return;
			const instance = process.component;
			if (instance.isSubgraph()) instance.network.setDebug(active);
		});
	}
	/**
	* @param {boolean} active
	*/
	setAsyncDelivery(active) {
		if (active === this.asyncDelivery) return;
		this.asyncDelivery = active;
		this.connections.forEach((socket) => {
			socket.async = this.asyncDelivery;
		});
		Object.keys(this.processes).forEach((processId) => {
			const process = this.processes[processId];
			if (!process.component) return;
			const instance = process.component;
			if (instance.isSubgraph()) instance.network.setAsyncDelivery(active);
		});
	}
	/**
	* @param {Object|null} flowtrace
	* @param {string|null} [name]
	* @param {boolean} [main]
	*/
	setFlowtrace(flowtrace, name = null, main = true) {
		if (!flowtrace) {
			this.flowtraceName = null;
			this.flowtrace = null;
			return;
		}
		if (this.flowtrace) return;
		this.flowtrace = flowtrace;
		this.flowtraceName = name || this.graph.name;
		this.flowtrace.addGraph(this.flowtraceName, this.graph, main);
		Object.keys(this.processes).forEach((nodeId) => {
			const node = this.processes[nodeId];
			const inst = node.component;
			if (!inst.isSubgraph() || !inst.network) return;
			inst.network.setFlowtrace(this.flowtrace, node.componentName, false);
		});
	}
};
//#endregion
//#region node_modules/noflo/src/lib/Network.js
/**
* @typedef NetworkProcess
* @property {string} id
* @property {string} [componentName]
* @property {import("./Component").Component} [component]
*/
var Network = class extends BaseNetwork {
	/**
	* @param {import("fbp-graph/lib/Types").GraphNode} node
	* @param {Object} options
	* @returns {Promise<NetworkProcess>}
	*/
	addNode(node, options, callback) {
		if (typeof options === "function") {
			callback = options;
			options = {};
		}
		options = options || {};
		const promise = super.addNode(node, options).then((process) => {
			if (!options.initial) this.graph.addNode(node.id, node.component, node.metadata);
			return process;
		});
		if (callback) {
			deprecated("Providing a callback to Network.addNode is deprecated, use Promises");
			promise.then((process) => {
				callback(null, process);
			}, callback);
		}
		return promise;
	}
	removeNode(node, callback) {
		const promise = super.removeNode(node).then(() => {
			this.graph.removeNode(node.id);
			return null;
		});
		if (callback) {
			deprecated("Providing a callback to Network.removeNode is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	renameNode(oldId, newId, callback) {
		const promise = super.renameNode(oldId, newId).then(() => {
			this.graph.renameNode(oldId, newId);
		});
		if (callback) {
			deprecated("Providing a callback to Network.renameNode is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	addEdge(edge, options, callback) {
		if (typeof options === "function") {
			callback = options;
			options = {};
		}
		options = options || {};
		const promise = super.addEdge(edge, options).then((socket) => {
			if (!options.initial) this.graph.addEdgeIndex(edge.from.node, edge.from.port, edge.from.index, edge.to.node, edge.to.port, edge.to.index, edge.metadata);
			return socket;
		});
		if (callback) {
			deprecated("Providing a callback to Network.addEdge is deprecated, use Promises");
			promise.then((socket) => {
				callback(null, socket);
			}, callback);
		}
		return promise;
	}
	removeEdge(edge, callback) {
		const promise = super.removeEdge(edge).then(() => {
			this.graph.removeEdge(edge.from.node, edge.from.port, edge.to.node, edge.to.port);
			return null;
		});
		if (callback) {
			deprecated("Providing a callback to Network.removeEdge is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	addInitial(iip, options, callback) {
		if (typeof options === "function") {
			callback = options;
			options = {};
		}
		options = options || {};
		const promise = super.addInitial(iip, options).then((socket) => {
			if (!options.initial) this.graph.addInitialIndex(iip.from.data, iip.to.node, iip.to.port, iip.to.index, iip.metadata);
			return socket;
		});
		if (callback) {
			deprecated("Providing a callback to Network.addInitial is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	removeInitial(iip, callback) {
		const promise = super.removeInitial(iip).then(() => {
			this.graph.removeInitial(iip.to.node, iip.to.port);
		});
		if (callback) {
			deprecated("Providing a callback to Network.removeInitial is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
};
//#endregion
//#region node_modules/noflo/src/lib/LegacyNetwork.js
var LegacyNetwork = class extends BaseNetwork {
	constructor(graph, options = {}) {
		deprecated("subscribeGraph: true is deprecated. Live-edit network graphs via the network methods instead");
		super(graph, options);
	}
	/**
	* @callback ErrorableCallback
	* @param {Error|null} [err]
	* @returns {void}
	*/
	/**
	* @param {ErrorableCallback} [callback]
	* @returns {Promise<this>}
	*/
	connect(callback) {
		const promise = super.connect().then(() => {
			this.subscribeGraph();
			return this;
		});
		if (callback) {
			deprecated("Providing a callback to Network.connect is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	subscribeGraph() {
		const graphOps = [];
		let processing = false;
		const registerOp = (op, details) => {
			graphOps.push({
				op,
				details
			});
		};
		const processOps = (err) => {
			if (err) {
				if (this.listeners("process-error").length === 0) throw err;
				this.bufferedEmit("process-error", err);
			}
			if (!graphOps.length) {
				processing = false;
				return;
			}
			processing = true;
			const op = graphOps.shift();
			const cb = processOps;
			switch (op.op) {
				case "renameNode":
					this.renameNode(op.details.from, op.details.to, cb);
					break;
				default: this[op.op](op.details, cb);
			}
		};
		this.graph.on("addNode", (node) => {
			registerOp("addNode", node);
			if (!processing) processOps();
		});
		this.graph.on("removeNode", (node) => {
			registerOp("removeNode", node);
			if (!processing) processOps();
		});
		this.graph.on("renameNode", (oldId, newId) => {
			registerOp("renameNode", {
				from: oldId,
				to: newId
			});
			if (!processing) processOps();
		});
		this.graph.on("addEdge", (edge) => {
			registerOp("addEdge", edge);
			if (!processing) processOps();
		});
		this.graph.on("removeEdge", (edge) => {
			registerOp("removeEdge", edge);
			if (!processing) processOps();
		});
		this.graph.on("addInitial", (iip) => {
			registerOp("addInitial", iip);
			if (!processing) processOps();
		});
		return this.graph.on("removeInitial", (iip) => {
			registerOp("removeInitial", iip);
			if (!processing) processOps();
		});
	}
};
//#endregion
//#region node_modules/ms/index.js
var require_ms = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Helpers.
	*/
	var s = 1e3;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var w = d * 7;
	var y = d * 365.25;
	/**
	* Parse or format the given `val`.
	*
	* Options:
	*
	*  - `long` verbose formatting [false]
	*
	* @param {String|Number} val
	* @param {Object} [options]
	* @throws {Error} throw an error if val is not a non-empty string or a number
	* @return {String|Number}
	* @api public
	*/
	module.exports = function(val, options) {
		options = options || {};
		var type = typeof val;
		if (type === "string" && val.length > 0) return parse(val);
		else if (type === "number" && isFinite(val)) return options.long ? fmtLong(val) : fmtShort(val);
		throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
	};
	/**
	* Parse the given `str` and return milliseconds.
	*
	* @param {String} str
	* @return {Number}
	* @api private
	*/
	function parse(str) {
		str = String(str);
		if (str.length > 100) return;
		var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
		if (!match) return;
		var n = parseFloat(match[1]);
		switch ((match[2] || "ms").toLowerCase()) {
			case "years":
			case "year":
			case "yrs":
			case "yr":
			case "y": return n * y;
			case "weeks":
			case "week":
			case "w": return n * w;
			case "days":
			case "day":
			case "d": return n * d;
			case "hours":
			case "hour":
			case "hrs":
			case "hr":
			case "h": return n * h;
			case "minutes":
			case "minute":
			case "mins":
			case "min":
			case "m": return n * m;
			case "seconds":
			case "second":
			case "secs":
			case "sec":
			case "s": return n * s;
			case "milliseconds":
			case "millisecond":
			case "msecs":
			case "msec":
			case "ms": return n;
			default: return;
		}
	}
	/**
	* Short format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtShort(ms) {
		var msAbs = Math.abs(ms);
		if (msAbs >= d) return Math.round(ms / d) + "d";
		if (msAbs >= h) return Math.round(ms / h) + "h";
		if (msAbs >= m) return Math.round(ms / m) + "m";
		if (msAbs >= s) return Math.round(ms / s) + "s";
		return ms + "ms";
	}
	/**
	* Long format for `ms`.
	*
	* @param {Number} ms
	* @return {String}
	* @api private
	*/
	function fmtLong(ms) {
		var msAbs = Math.abs(ms);
		if (msAbs >= d) return plural(ms, msAbs, d, "day");
		if (msAbs >= h) return plural(ms, msAbs, h, "hour");
		if (msAbs >= m) return plural(ms, msAbs, m, "minute");
		if (msAbs >= s) return plural(ms, msAbs, s, "second");
		return ms + " ms";
	}
	/**
	* Pluralization helper.
	*/
	function plural(ms, msAbs, n, name) {
		var isPlural = msAbs >= n * 1.5;
		return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
	}
}));
//#endregion
//#region node_modules/debug/src/common.js
var require_common = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This is the common logic for both the Node.js and web browser
	* implementations of `debug()`.
	*/
	function setup(env) {
		createDebug.debug = createDebug;
		createDebug.default = createDebug;
		createDebug.coerce = coerce;
		createDebug.disable = disable;
		createDebug.enable = enable;
		createDebug.enabled = enabled;
		createDebug.humanize = require_ms();
		createDebug.destroy = destroy;
		Object.keys(env).forEach((key) => {
			createDebug[key] = env[key];
		});
		/**
		* The currently active debug mode names, and names to skip.
		*/
		createDebug.names = [];
		createDebug.skips = [];
		/**
		* Map of special "%n" handling functions, for the debug "format" argument.
		*
		* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
		*/
		createDebug.formatters = {};
		/**
		* Selects a color for a debug namespace
		* @param {String} namespace The namespace string for the debug instance to be colored
		* @return {Number|String} An ANSI color code for the given namespace
		* @api private
		*/
		function selectColor(namespace) {
			let hash = 0;
			for (let i = 0; i < namespace.length; i++) {
				hash = (hash << 5) - hash + namespace.charCodeAt(i);
				hash |= 0;
			}
			return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
		}
		createDebug.selectColor = selectColor;
		/**
		* Create a debugger with the given `namespace`.
		*
		* @param {String} namespace
		* @return {Function}
		* @api public
		*/
		function createDebug(namespace) {
			let prevTime;
			let enableOverride = null;
			let namespacesCache;
			let enabledCache;
			function debug(...args) {
				if (!debug.enabled) return;
				const self = debug;
				const curr = Number(/* @__PURE__ */ new Date());
				self.diff = curr - (prevTime || curr);
				self.prev = prevTime;
				self.curr = curr;
				prevTime = curr;
				args[0] = createDebug.coerce(args[0]);
				if (typeof args[0] !== "string") args.unshift("%O");
				let index = 0;
				args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
					if (match === "%%") return "%";
					index++;
					const formatter = createDebug.formatters[format];
					if (typeof formatter === "function") {
						const val = args[index];
						match = formatter.call(self, val);
						args.splice(index, 1);
						index--;
					}
					return match;
				});
				createDebug.formatArgs.call(self, args);
				(self.log || createDebug.log).apply(self, args);
			}
			debug.namespace = namespace;
			debug.useColors = createDebug.useColors();
			debug.color = createDebug.selectColor(namespace);
			debug.extend = extend;
			debug.destroy = createDebug.destroy;
			Object.defineProperty(debug, "enabled", {
				enumerable: true,
				configurable: false,
				get: () => {
					if (enableOverride !== null) return enableOverride;
					if (namespacesCache !== createDebug.namespaces) {
						namespacesCache = createDebug.namespaces;
						enabledCache = createDebug.enabled(namespace);
					}
					return enabledCache;
				},
				set: (v) => {
					enableOverride = v;
				}
			});
			if (typeof createDebug.init === "function") createDebug.init(debug);
			return debug;
		}
		function extend(namespace, delimiter) {
			const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
			newDebug.log = this.log;
			return newDebug;
		}
		/**
		* Enables a debug mode by namespaces. This can include modes
		* separated by a colon and wildcards.
		*
		* @param {String} namespaces
		* @api public
		*/
		function enable(namespaces) {
			createDebug.save(namespaces);
			createDebug.namespaces = namespaces;
			createDebug.names = [];
			createDebug.skips = [];
			const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
			for (const ns of split) if (ns[0] === "-") createDebug.skips.push(ns.slice(1));
			else createDebug.names.push(ns);
		}
		/**
		* Checks if the given string matches a namespace template, honoring
		* asterisks as wildcards.
		*
		* @param {String} search
		* @param {String} template
		* @return {Boolean}
		*/
		function matchesTemplate(search, template) {
			let searchIndex = 0;
			let templateIndex = 0;
			let starIndex = -1;
			let matchIndex = 0;
			while (searchIndex < search.length) if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) if (template[templateIndex] === "*") {
				starIndex = templateIndex;
				matchIndex = searchIndex;
				templateIndex++;
			} else {
				searchIndex++;
				templateIndex++;
			}
			else if (starIndex !== -1) {
				templateIndex = starIndex + 1;
				matchIndex++;
				searchIndex = matchIndex;
			} else return false;
			while (templateIndex < template.length && template[templateIndex] === "*") templateIndex++;
			return templateIndex === template.length;
		}
		/**
		* Disable debug output.
		*
		* @return {String} namespaces
		* @api public
		*/
		function disable() {
			const namespaces = [...createDebug.names, ...createDebug.skips.map((namespace) => "-" + namespace)].join(",");
			createDebug.enable("");
			return namespaces;
		}
		/**
		* Returns true if the given mode name is enabled, false otherwise.
		*
		* @param {String} name
		* @return {Boolean}
		* @api public
		*/
		function enabled(name) {
			for (const skip of createDebug.skips) if (matchesTemplate(name, skip)) return false;
			for (const ns of createDebug.names) if (matchesTemplate(name, ns)) return true;
			return false;
		}
		/**
		* Coerce `val`.
		*
		* @param {Mixed} val
		* @return {Mixed}
		* @api private
		*/
		function coerce(val) {
			if (val instanceof Error) return val.stack || val.message;
			return val;
		}
		/**
		* XXX DO NOT USE. This is a temporary stub function.
		* XXX It WILL be removed in the next major release.
		*/
		function destroy() {
			console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
		}
		createDebug.enable(createDebug.load());
		return createDebug;
	}
	module.exports = setup;
}));
//#endregion
//#region node_modules/debug/src/browser.js
var require_browser = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* This is the web browser implementation of `debug()`.
	*/
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = localstorage();
	exports.destroy = (() => {
		let warned = false;
		return () => {
			if (!warned) {
				warned = true;
				console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
			}
		};
	})();
	/**
	* Colors.
	*/
	exports.colors = [
		"#0000CC",
		"#0000FF",
		"#0033CC",
		"#0033FF",
		"#0066CC",
		"#0066FF",
		"#0099CC",
		"#0099FF",
		"#00CC00",
		"#00CC33",
		"#00CC66",
		"#00CC99",
		"#00CCCC",
		"#00CCFF",
		"#3300CC",
		"#3300FF",
		"#3333CC",
		"#3333FF",
		"#3366CC",
		"#3366FF",
		"#3399CC",
		"#3399FF",
		"#33CC00",
		"#33CC33",
		"#33CC66",
		"#33CC99",
		"#33CCCC",
		"#33CCFF",
		"#6600CC",
		"#6600FF",
		"#6633CC",
		"#6633FF",
		"#66CC00",
		"#66CC33",
		"#9900CC",
		"#9900FF",
		"#9933CC",
		"#9933FF",
		"#99CC00",
		"#99CC33",
		"#CC0000",
		"#CC0033",
		"#CC0066",
		"#CC0099",
		"#CC00CC",
		"#CC00FF",
		"#CC3300",
		"#CC3333",
		"#CC3366",
		"#CC3399",
		"#CC33CC",
		"#CC33FF",
		"#CC6600",
		"#CC6633",
		"#CC9900",
		"#CC9933",
		"#CCCC00",
		"#CCCC33",
		"#FF0000",
		"#FF0033",
		"#FF0066",
		"#FF0099",
		"#FF00CC",
		"#FF00FF",
		"#FF3300",
		"#FF3333",
		"#FF3366",
		"#FF3399",
		"#FF33CC",
		"#FF33FF",
		"#FF6600",
		"#FF6633",
		"#FF9900",
		"#FF9933",
		"#FFCC00",
		"#FFCC33"
	];
	/**
	* Currently only WebKit-based Web Inspectors, Firefox >= v31,
	* and the Firebug extension (any Firefox version) are known
	* to support "%c" CSS customizations.
	*
	* TODO: add a `localStorage` variable to explicitly enable/disable colors
	*/
	function useColors() {
		if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) return true;
		if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) return false;
		let m;
		return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
	}
	/**
	* Colorize log arguments if enabled.
	*
	* @api public
	*/
	function formatArgs(args) {
		args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
		if (!this.useColors) return;
		const c = "color: " + this.color;
		args.splice(1, 0, c, "color: inherit");
		let index = 0;
		let lastC = 0;
		args[0].replace(/%[a-zA-Z%]/g, (match) => {
			if (match === "%%") return;
			index++;
			if (match === "%c") lastC = index;
		});
		args.splice(lastC, 0, c);
	}
	/**
	* Invokes `console.debug()` when available.
	* No-op when `console.debug` is not a "function".
	* If `console.debug` is not available, falls back
	* to `console.log`.
	*
	* @api public
	*/
	exports.log = console.debug || console.log || (() => {});
	/**
	* Save `namespaces`.
	*
	* @param {String} namespaces
	* @api private
	*/
	function save(namespaces) {
		try {
			if (namespaces) exports.storage.setItem("debug", namespaces);
			else exports.storage.removeItem("debug");
		} catch (error) {}
	}
	/**
	* Load `namespaces`.
	*
	* @return {String} returns the previously persisted debug modes
	* @api private
	*/
	function load() {
		let r;
		try {
			r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
		} catch (error) {}
		if (!r && typeof process !== "undefined" && "env" in process) r = process.env.DEBUG;
		return r;
	}
	/**
	* Localstorage attempts to return the localstorage.
	*
	* This is necessary because safari throws
	* when a user disables cookies/localstorage
	* and you attempt to access it.
	*
	* @return {LocalStorage}
	* @api private
	*/
	function localstorage() {
		try {
			return localStorage;
		} catch (error) {}
	}
	module.exports = require_common()(exports);
	const { formatters } = module.exports;
	/**
	* Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	*/
	formatters.j = function(v) {
		try {
			return JSON.stringify(v);
		} catch (error) {
			return "[UnexpectedJSONParseError]: " + error.message;
		}
	};
}));
//#endregion
//#region node_modules/noflo/src/lib/BasePort.js
var import_browser = /* @__PURE__ */ __toESM(require_browser());
const validTypes = [
	"all",
	"string",
	"number",
	"int",
	"object",
	"array",
	"boolean",
	"color",
	"date",
	"bang",
	"function",
	"buffer",
	"stream"
];
/**
* @typedef {Object} BaseOptions - Options for configuring all types of ports
* @property {string} [description='']
* @property {boolean} [addressable=false]
* @property {boolean} [buffered=false]
* @property {string} [datatype='all']
* @property {string} [schema=null]
* @property {string} [type=null]
* @property {boolean} [required=false]
* @property {boolean} [scoped=true]
*/
/**
* @template {BaseOptions} BaseportOptions
* @param {BaseportOptions} options
* @return {BaseportOptions}
*/
function handleOptions(options) {
	let datatype = options.datatype || "all";
	if (datatype === "integer") datatype = "int";
	const required = options.required || false;
	if (validTypes.indexOf(datatype) === -1) throw new Error(`Invalid port datatype '${datatype}' specified, valid are ${validTypes.join(", ")}`);
	const schema = options.schema || options.type;
	if (schema && schema.indexOf("/") === -1) throw new Error(`Invalid port schema '${schema}' specified. Should be URL or MIME type`);
	const scoped = typeof options.scoped === "boolean" ? options.scoped : true;
	const description = options.description || "";
	return Object.assign({}, options, {
		description,
		datatype,
		required,
		schema,
		scoped
	});
}
var BasePort = class extends import_eventemitter3.default {
	/**
	* @param {BaseOptions} options
	*/
	constructor(options) {
		super();
		this.options = handleOptions(options);
		/** @type {Array<import("./InternalSocket").InternalSocket|void>} */
		this.sockets = [];
		/** @type {string|null} */
		this.node = null;
		/** @type {import("./Component").Component|null} */
		this.nodeInstance = null;
		/** @type {string|null} */
		this.name = null;
	}
	getId() {
		if (!this.node || !this.name) return "Port";
		return `${this.node} ${this.name.toUpperCase()}`;
	}
	/**
	* @returns {string}
	*/
	getDataType() {
		return this.options.datatype || "all";
	}
	getSchema() {
		return this.options.schema || null;
	}
	getDescription() {
		return this.options.description;
	}
	/**
	* @param {import("./InternalSocket").InternalSocket} socket
	* @param {number|null} [index]
	*/
	attach(socket, index = null) {
		let idx = index;
		if (!this.isAddressable() || index === null) idx = this.sockets.length;
		this.sockets[idx] = socket;
		this.attachSocket(socket, idx);
		if (this.isAddressable()) {
			this.emit("attach", socket, idx);
			return;
		}
		this.emit("attach", socket);
	}
	/**
	* @param {import("./InternalSocket").InternalSocket} socket
	* @param {number|null} [index]
	*/
	attachSocket(socket, index = null) {}
	/**
	* @param {import("./InternalSocket").InternalSocket} socket
	*/
	detach(socket) {
		const index = this.sockets.indexOf(socket);
		if (index === -1) return;
		this.sockets[index] = void 0;
		if (this.isAddressable()) {
			this.emit("detach", socket, index);
			return;
		}
		this.emit("detach", socket);
	}
	isAddressable() {
		if (this.options.addressable) return true;
		return false;
	}
	isBuffered() {
		if (this.options.buffered) return true;
		return false;
	}
	isRequired() {
		if (this.options.required) return true;
		return false;
	}
	/**
	* @param {number|null} socketId
	* @returns {boolean}
	*/
	isAttached(socketId = null) {
		if (this.isAddressable() && socketId !== null) {
			if (this.sockets[socketId]) return true;
			return false;
		}
		if (this.sockets.length) return true;
		return false;
	}
	listAttached() {
		const attached = [];
		for (let idx = 0; idx < this.sockets.length; idx += 1) if (this.sockets[idx]) attached.push(idx);
		return attached;
	}
	/**
	* @param {number|null} socketId
	* @returns {boolean}
	*/
	isConnected(socketId = null) {
		if (this.isAddressable()) {
			if (socketId === null) throw new Error(`${this.getId()}: Socket ID required`);
			if (!this.sockets[socketId]) throw new Error(`${this.getId()}: Socket ${socketId} not available`);
			return this.sockets[socketId].isConnected();
		}
		let connected = false;
		this.sockets.forEach((socket) => {
			if (!socket) return;
			if (socket.isConnected()) connected = true;
		});
		return connected;
	}
	canAttach() {
		return true;
	}
};
//#endregion
//#region node_modules/noflo/src/lib/InPort.js
/**
* @typedef InPortOptions
* @property {any} [default]
* @property {Array<any>} [values]
* @property {boolean} [control]
* @property {boolean} [triggering]
*/
/**
* @callback HasValidationCallback
* @param {import("./IP").default} ip
* @returns {boolean}
*/
/**
* @typedef {import("./BasePort").BaseOptions & InPortOptions} PortOptions
*/
var InPort = class extends BasePort {
	/**
	* @param {PortOptions} [options]
	*/
	constructor(options = {}) {
		const opts = options;
		if (opts.control == null) opts.control = false;
		if (opts.scoped == null) opts.scoped = true;
		if (opts.triggering == null) opts.triggering = true;
		super(opts);
		const baseOptions = this.options;
		this.options = baseOptions;
		/** @type {import("./Component").Component|null} */
		this.nodeInstance = null;
		this.prepareBuffer();
	}
	/**
	* Assign a delegate for retrieving data should this inPort
	*
	* @param {import("./InternalSocket").InternalSocket} socket
	* @param {number|null} [localId]
	*/
	attachSocket(socket, localId = null) {
		if (this.hasDefault()) socket.setDataDelegate(() => this.options.default);
		socket.on("connect", () => this.handleSocketEvent("connect", socket, localId));
		socket.on("begingroup", (group) => this.handleSocketEvent("begingroup", group, localId));
		socket.on("data", (data) => {
			this.validateData(data);
			return this.handleSocketEvent("data", data, localId);
		});
		socket.on("endgroup", (group) => this.handleSocketEvent("endgroup", group, localId));
		socket.on("disconnect", () => this.handleSocketEvent("disconnect", socket, localId));
		socket.on("ip", (ip) => this.handleIP(ip, localId));
	}
	/**
	* @param {import("./IP").default} packet
	* @param {number|null} [index]
	*/
	handleIP(packet, index = null) {
		if (this.options.control && packet.type !== "data") return;
		const ip = packet;
		ip.owner = this.nodeInstance;
		if (this.isAddressable()) ip.index = index;
		if (ip.datatype === "all") ip.datatype = this.getDataType();
		if (this.getSchema() && !ip.schema) ip.schema = this.getSchema();
		const buf = this.prepareBufferForIP(ip);
		buf.push(ip);
		if (this.options.control && buf.length > 1) buf.shift();
		this.emit("ip", ip, index);
	}
	/**
	* @param {string} event
	* @param {any} payload
	* @param {number} [id]
	*/
	handleSocketEvent(event, payload, id) {
		if (this.isAddressable()) return this.emit(event, payload, id);
		return this.emit(event, payload);
	}
	hasDefault() {
		return this.options.default !== void 0;
	}
	prepareBuffer() {
		if (this.isAddressable()) {
			if (this.options.scoped)
 /** @type {Object<string,Object<number,Array<import("./IP").default>>>} */
			this.indexedScopedBuffer = {};
			/** @type {Object<number,Array<import("./IP").default>>} */
			this.indexedIipBuffer = {};
			/** @type {Object<number,Array<import("./IP").default>>} */
			this.indexedBuffer = {};
			return;
		}
		if (this.options.scoped)
 /** @type {Object<string,Array<import("./IP").default>>} */
		this.scopedBuffer = {};
		/** @type {Array<import("./IP").default>} */
		this.iipBuffer = [];
		/** @type {Array<import("./IP").default>} */
		this.buffer = [];
	}
	/**
	* @param {import("./IP").default} ip
	* @returns {Array<import("./IP").default>}
	*/
	prepareBufferForIP(ip) {
		if (this.isAddressable()) {
			if (ip.scope != null && this.options.scoped) {
				if (!(ip.scope in this.indexedScopedBuffer)) this.indexedScopedBuffer[ip.scope] = [];
				if (!(ip.index in this.indexedScopedBuffer[ip.scope])) this.indexedScopedBuffer[ip.scope][ip.index] = [];
				return this.indexedScopedBuffer[ip.scope][ip.index];
			}
			if (ip.initial) {
				if (!(ip.index in this.indexedIipBuffer)) this.indexedIipBuffer[ip.index] = [];
				return this.indexedIipBuffer[ip.index];
			}
			if (!(ip.index in this.indexedBuffer)) this.indexedBuffer[ip.index] = [];
			return this.indexedBuffer[ip.index];
		}
		if (ip.scope != null && this.options.scoped) {
			if (!(ip.scope in this.scopedBuffer)) this.scopedBuffer[ip.scope] = [];
			return this.scopedBuffer[ip.scope];
		}
		if (ip.initial) return this.iipBuffer;
		return this.buffer;
	}
	/**
	* @param {any} data
	*/
	validateData(data) {
		if (!this.options.values) return;
		if (this.options.values.indexOf(data) === -1) throw new Error(`Invalid data='${data}' received, not in [${this.options.values}]`);
	}
	/**
	* @param {string|null} scope
	* @param {number|null} index
	* @param {boolean} [initial]
	* @returns {Array<import("./IP").default>}
	*/
	getBuffer(scope, index, initial = false) {
		if (this.isAddressable()) {
			if (scope != null && this.options.scoped) {
				if (!(scope in this.indexedScopedBuffer)) return;
				if (!(index in this.indexedScopedBuffer[scope])) return;
				return this.indexedScopedBuffer[scope][index];
			}
			if (initial) {
				if (!(index in this.indexedIipBuffer)) return;
				return this.indexedIipBuffer[index];
			}
			if (!(index in this.indexedBuffer)) return;
			return this.indexedBuffer[index];
		}
		if (scope != null && this.options.scoped) {
			if (!(scope in this.scopedBuffer)) return;
			return this.scopedBuffer[scope];
		}
		if (initial) return this.iipBuffer;
		return this.buffer;
	}
	/**
	* @param {string|null} scope
	* @param {number|null} index
	* @param {boolean} [initial]
	* @returns {import("./IP").default|void}
	*/
	getFromBuffer(scope, index, initial = false) {
		const buf = this.getBuffer(scope, index, initial);
		if (!(buf != null ? buf.length : void 0)) return;
		if (this.options.control) return buf[buf.length - 1];
		return buf.shift();
	}
	/**
	* Fetches a packet from the port
	* @param {string|null} scope
	* @param {number|null} [index]
	*/
	get(scope, index = null) {
		const res = this.getFromBuffer(scope, index);
		if (res !== void 0) return res;
		return this.getFromBuffer(null, index, true);
	}
	/**
	* Fetches a packet from the port
	* @param {string|null} scope
	* @param {number|null} index
	* @param {HasValidationCallback} validate
	* @param {boolean} [initial]
	*/
	hasIPinBuffer(scope, index, validate, initial = false) {
		const buf = this.getBuffer(scope, index, initial);
		if (!(buf != null ? buf.length : void 0)) return false;
		for (let i = 0; i < buf.length; i += 1) if (validate(buf[i])) return true;
		return false;
	}
	/**
	* @param {number|null} index
	* @param {HasValidationCallback} validate
	*/
	hasIIP(index, validate) {
		return this.hasIPinBuffer(null, index, validate, true);
	}
	/**
	* Returns true if port contains packet(s) matching the validator
	* @param {string|null} scope
	* @param {number|null|HasValidationCallback} index
	* @param {HasValidationCallback} [validate]
	*/
	has(scope, index, validate) {
		let valid = validate;
		/** @type {number|null} */
		let idx;
		if (typeof index === "function") {
			valid = index;
			idx = null;
		} else idx = index;
		if (this.hasIPinBuffer(scope, idx, valid)) return true;
		if (this.hasIIP(idx, valid)) return true;
		return false;
	}
	/**
	* Returns the number of data packets in an inport
	* @param {string|null} scope
	* @param {number|null} [index]
	* @returns {number}
	*/
	length(scope, index = null) {
		const buf = this.getBuffer(scope, index);
		if (!buf) return 0;
		return buf.length;
	}
	/**
	* Tells if buffer has packets or not
	* @param {string|null} scope
	*/
	ready(scope) {
		return this.length(scope) > 0;
	}
	clear() {
		return this.prepareBuffer();
	}
};
//#endregion
//#region node_modules/noflo/src/lib/OutPort.js
/**
* @typedef OutPortOptions
* @property {boolean} [caching]
*/
/**
* @typedef {import("./BasePort").BaseOptions & OutPortOptions} PortOptions
*/
var OutPort = class extends BasePort {
	/**
	* @param {PortOptions} options - Options for the outport
	*/
	constructor(options = {}) {
		const opts = options;
		if (opts.scoped == null) opts.scoped = true;
		if (typeof opts.caching !== "boolean") opts.caching = false;
		super(opts);
		const baseOptions = this.options;
		this.options = baseOptions;
		/** @type {Object<string, IP>} */
		this.cache = {};
	}
	/**
	* @param {import("./InternalSocket").InternalSocket} socket
	* @param {number|null} [index]
	*/
	attach(socket, index = null) {
		super.attach(socket, index);
		if (this.isCaching() && this.cache[`${index}`] != null) this.send(this.cache[`${index}`], index);
	}
	/**
	* @param {number|null} [index]
	*/
	connect(index = null) {
		const sockets = this.getSockets(index);
		this.checkRequired(sockets);
		sockets.forEach((socket) => {
			if (!socket) return;
			socket.connect();
		});
	}
	/**
	* @param {string} group
	* @param {number|null} [index]
	*/
	beginGroup(group, index = null) {
		const sockets = this.getSockets(index);
		this.checkRequired(sockets);
		sockets.forEach((socket) => {
			if (!socket) return;
			socket.beginGroup(group);
		});
	}
	/**
	* @param {any} data
	* @param {number|null} [index]
	*/
	send(data, index = null) {
		const sockets = this.getSockets(index);
		this.checkRequired(sockets);
		if (this.isCaching() && data !== this.cache[`${index}`]) this.cache[`${index}`] = data;
		sockets.forEach((socket) => {
			if (!socket) return;
			socket.send(data);
		});
	}
	/**
	* @param {number|null} [index]
	*/
	endGroup(index = null) {
		const sockets = this.getSockets(index);
		this.checkRequired(sockets);
		sockets.forEach((socket) => {
			if (!socket) return;
			socket.endGroup();
		});
	}
	/**
	* @param {number|null} [index]
	*/
	disconnect(index = null) {
		const sockets = this.getSockets(index);
		this.checkRequired(sockets);
		sockets.forEach((socket) => {
			if (!socket) return;
			socket.disconnect();
		});
	}
	/**
	* @param {string|IP} type
	* @param {any} [data]
	* @param {import("./IP").IPOptions} [options]
	* @param {number|null} [index]
	* @param {boolean} [autoConnect]
	*/
	sendIP(type, data, options, index = null, autoConnect = true) {
		/** @type {IP} */
		let ip;
		let idx = index;
		if (IP.isIP(type)) {
			ip = type;
			idx = ip.index;
		} else if (typeof type === "string") ip = new IP(type, data, options);
		else throw new Error("Unknown type for IP type");
		const sockets = this.getSockets(idx);
		this.checkRequired(sockets);
		if (ip.datatype === "all") ip.datatype = this.getDataType();
		if (this.getSchema() && !ip.schema) ip.schema = this.getSchema();
		const cachedData = this.cache[`${idx}`] != null ? this.cache[`${idx}`].data : void 0;
		if (this.isCaching() && data !== cachedData) this.cache[`${idx}`] = ip;
		let pristine = true;
		sockets.forEach((socket) => {
			if (!socket) return;
			if (pristine) {
				socket.post(ip, autoConnect);
				pristine = false;
			} else {
				if (ip.clonable) ip = ip.clone();
				socket.post(ip, autoConnect);
			}
		});
		return this;
	}
	/**
	* @param {string|null} data
	* @param {import("./IP").IPOptions} options
	* @param {number|null} [index]
	*/
	openBracket(data = null, options = {}, index = null) {
		return this.sendIP("openBracket", data, options, index);
	}
	/**
	* @param {any} data
	* @param {import("./IP").IPOptions} options
	* @param {number|null} [index]
	*/
	data(data, options = {}, index = null) {
		return this.sendIP("data", data, options, index);
	}
	/**
	* @param {string|null} data
	* @param {import("./IP").IPOptions} options
	* @param {number|null} [index]
	*/
	closeBracket(data = null, options = {}, index = null) {
		return this.sendIP("closeBracket", data, options, index);
	}
	/**
	* @param {Array<import("./InternalSocket").InternalSocket|void>} sockets
	*/
	checkRequired(sockets) {
		if (sockets.length === 0 && this.isRequired()) throw new Error(`${this.getId()}: No connections available`);
	}
	/**
	* @param {number|null} index
	* @returns {Array<import("./InternalSocket").InternalSocket|void>}
	*/
	getSockets(index) {
		if (this.isAddressable()) {
			if (index === null) throw new Error(`${this.getId()} Socket ID required`);
			const idx = index;
			if (!this.sockets[idx]) return [];
			return [this.sockets[idx]];
		}
		if (index !== null) throw new Error(`${this.getId()} is not addressable port and index ${index} provided`);
		return this.sockets;
	}
	isCaching() {
		if (this.options.caching) return true;
		return false;
	}
};
//#endregion
//#region node_modules/noflo/src/lib/Ports.js
/**
* @typedef {import("./BasePort").BaseOptions} PortOptions
*/
var Ports = class extends import_eventemitter3.default {
	/**
	* @param {Object<string, import("./BasePort").default|PortOptions>} ports
	* @param {typeof import("./BasePort").default} model
	*/
	constructor(ports, model) {
		super();
		this.model = model;
		/** @type {Object<string, import("./BasePort").default>} */
		this.ports = {};
		if (!ports) return;
		Object.keys(ports).forEach((name) => {
			const options = ports[name];
			this.add(name, options);
		});
	}
	/**
	* @param {string} name
	* @param {Object|import("./BasePort").default|PortOptions} [options]
	*/
	add(name, options = {}) {
		if (name === "add" || name === "remove") throw new Error("Add and remove are restricted port names");
		if (!name.match(/^[a-z0-9_./]+$/)) throw new Error(`Port names can only contain lowercase alphanumeric characters and underscores. '${name}' not allowed`);
		if (this.ports[name]) this.remove(name);
		const maybePort = options;
		if (typeof maybePort === "object" && maybePort.canAttach) this.ports[name] = maybePort;
		else {
			const Model = this.model;
			this.ports[name] = new Model(options);
		}
		this[name] = this.ports[name];
		this.emit("add", name);
		return this;
	}
	/**
	* @param {string} name
	*/
	remove(name) {
		if (!this.ports[name]) throw new Error(`Port ${name} not defined`);
		delete this.ports[name];
		delete this[name];
		this.emit("remove", name);
		return this;
	}
};
/**
* @typedef {{ [key: string]: InPort|import("./InPort").PortOptions }} InPortsOptions
*/
var InPorts = class extends Ports {
	/**
	* @param {InPortsOptions} [ports]
	*/
	constructor(ports = {}) {
		super(ports, InPort);
		const basePorts = this.ports;
		this.ports = basePorts;
	}
};
/**
* @typedef {{ [key: string]: OutPort|import("./OutPort").PortOptions }} OutPortsOptions
*/
var OutPorts = class extends Ports {
	/**
	* @param {OutPortsOptions} [ports]
	*/
	constructor(ports = {}) {
		super(ports, OutPort);
		const basePorts = this.ports;
		this.ports = basePorts;
	}
	connect(name, socketId) {
		const port = this.ports[name];
		if (!port) throw new Error(`Port ${name} not available`);
		port.connect(socketId);
	}
	beginGroup(name, group, socketId) {
		const port = this.ports[name];
		if (!port) throw new Error(`Port ${name} not available`);
		port.beginGroup(group, socketId);
	}
	send(name, data, socketId) {
		const port = this.ports[name];
		if (!port) throw new Error(`Port ${name} not available`);
		port.send(data, socketId);
	}
	endGroup(name, socketId) {
		const port = this.ports[name];
		if (!port) throw new Error(`Port ${name} not available`);
		port.endGroup(socketId);
	}
	disconnect(name, socketId) {
		const port = this.ports[name];
		if (!port) throw new Error(`Port ${name} not available`);
		port.disconnect(socketId);
	}
};
/**
* @param {string} name
* @returns {{ name: string, index?: string }}
*/
function normalizePortName(name) {
	const port = { name };
	if (name.indexOf("[") === -1) return port;
	const matched = name.match(/(.*)\[([0-9]+)\]/);
	if (!matched || matched.length < 3) return port;
	return {
		name: matched[1],
		index: matched[2]
	};
}
//#endregion
//#region node_modules/noflo/src/lib/ProcessContext.js
var ProcessContext = class {
	/**
	* @param {import("./IP").default} ip - IP for this processing context
	* @param {import("./Component").Component} nodeInstance - Component being run
	* @param {import("./InPort").default} port - InPort that triggered this context
	* @param {Object<string, any>} result
	*/
	constructor(ip, nodeInstance, port, result) {
		this.ip = ip;
		this.nodeInstance = nodeInstance;
		this.port = port;
		this.result = result;
		this.scope = this.ip.scope;
		this.activated = false;
		this.deactivated = false;
	}
	activate() {
		if (this.result.__resolved || this.nodeInstance.outputQ.indexOf(this.result) === -1) this.result = {};
		this.nodeInstance.activate(this);
	}
	deactivate() {
		if (!this.result.__resolved) this.result.__resolved = true;
		this.nodeInstance.deactivate(this);
	}
};
//#endregion
//#region node_modules/noflo/src/lib/ProcessInput.js
const debugComponent$2 = (0, import_browser.default)("noflo:component");
var ProcessInput = class {
	/**
	* @param {import("./Ports").InPorts} ports - Component inports
	* @param {import("./ProcessContext").default} context - Processing context
	*/
	constructor(ports, context) {
		this.ports = ports;
		this.context = context;
		this.nodeInstance = this.context.nodeInstance;
		this.ip = this.context.ip;
		this.port = this.context.port;
		this.result = this.context.result;
		this.scope = this.context.scope;
	}
	activate() {
		if (this.context.activated) return;
		if (this.nodeInstance.isOrdered()) this.result.__resolved = false;
		this.nodeInstance.activate(this.context);
		if (this.port.isAddressable()) debugComponent$2(`${this.nodeInstance.nodeId} packet on '${this.port.name}[${this.ip.index}]' caused activation ${this.nodeInstance.load}: ${this.ip.type}`);
		else debugComponent$2(`${this.nodeInstance.nodeId} packet on '${this.port.name}' caused activation ${this.nodeInstance.load}: ${this.ip.type}`);
	}
	/**
	* @param {...string} params - Port names to check for attachment
	* @returns {Array<number> | Array<Array<number>>}
	*/
	attached(...params) {
		let args = params;
		if (!args.length) args = ["in"];
		/** @type {Array<Array<number>>} */
		const res = [];
		args.forEach((port) => {
			if (!this.ports.ports[port]) throw new Error(`Node ${this.nodeInstance.nodeId} has no port '${port}'`);
			res.push(this.ports.ports[port].listAttached());
		});
		if (args.length === 1) return res[0];
		return res;
	}
	/**
	* @typedef {string|Array<string|number>} GetArgument
	* @typedef {import("./InPort").HasValidationCallback} HasValidationCallback
	*/
	/**
	* @typedef {GetArgument|HasValidationCallback} HasArgument
	*/
	/**
	* @param {...HasArgument} params
	*/
	has(...params) {
		/** @type {HasValidationCallback} */
		let validate;
		let args = params.filter((p) => typeof p !== "function");
		if (!args.length) args = ["in"];
		if (typeof params[params.length - 1] === "function") validate = params[params.length - 1];
		else validate = () => true;
		for (let i = 0; i < args.length; i += 1) {
			const port = args[i];
			if (Array.isArray(port)) {
				const portImpl = this.ports.ports[port[0]];
				if (!portImpl) throw new Error(`Node ${this.nodeInstance.nodeId} has no port '${port[0]}'`);
				if (!portImpl.isAddressable()) throw new Error(`Non-addressable ports, access must be with string ${port[0]}`);
				const portIdx = typeof port[1] === "string" ? parseInt(port[1], 10) : port[1];
				if (!portImpl.has(this.scope, portIdx, validate)) return false;
			} else if (typeof port === "string") {
				const portImpl = this.ports.ports[port];
				if (!portImpl) throw new Error(`Node ${this.nodeInstance.nodeId} has no port '${port}'`);
				if (portImpl.isAddressable()) throw new Error(`For addressable ports, access must be with array [${port}, idx]`);
				if (!portImpl.has(this.scope, validate)) return false;
			} else throw new Error(`Unknown port type ${typeof port}`);
		}
		return true;
	}
	/**
	* @param {...string} params - Port names to check for data packets
	* @returns {boolean}
	*/
	hasData(...params) {
		let args = params;
		if (!args.length) args = ["in"];
		const hasArgs = [...args, (ip) => ip.type === "data"];
		return this.has(...hasArgs);
	}
	/**
	* @param {...HasArgument} params - Port names to check for streams
	* @returns {boolean}
	*/
	hasStream(...params) {
		let args = params;
		/** @type {Function} */
		let validateStream;
		if (!args.length) args = ["in"];
		if (typeof args[args.length - 1] === "function") validateStream = args.pop();
		else validateStream = () => true;
		for (let i = 0; i < args.length; i += 1) {
			const port = args[i];
			/** @type Array<string> */
			const portBrackets = [];
			let hasData = false;
			/** @type {HasValidationCallback} */
			const validate = (ip) => {
				if (ip.type === "openBracket") {
					portBrackets.push(ip.data);
					return false;
				}
				if (ip.type === "data") {
					hasData = validateStream(ip, portBrackets);
					if (!portBrackets.length) return hasData;
					return false;
				}
				if (ip.type === "closeBracket") {
					portBrackets.pop();
					if (portBrackets.length) return false;
					if (!hasData) return false;
					return true;
				}
				return false;
			};
			if (!this.has(port, validate)) return false;
		}
		return true;
	}
	/**
	* @param {...GetArgument} params
	* @returns {void|IP|Array<IP|void>}
	*/
	get(...params) {
		this.activate();
		let args = params;
		if (!args.length) args = ["in"];
		/** @type {Array<IP|void>} */
		const res = [];
		for (let i = 0; i < args.length; i += 1) {
			const port = args[i];
			let idx;
			let ip;
			let portname;
			if (Array.isArray(port)) {
				[portname, idx] = Array.from(port);
				if (!this.ports.ports[portname].isAddressable()) throw new Error("Non-addressable ports, access must be with string portname");
			} else {
				portname = port;
				if (this.ports.ports[portname].isAddressable()) throw new Error("For addressable ports, access must be with array [portname, idx]");
			}
			const name = portname;
			const idxName = idx;
			if (this.nodeInstance.isForwardingInport(name)) {
				ip = this.__getForForwarding(name, idxName);
				res.push(ip);
			} else {
				ip = this.ports.ports[name].get(this.scope, idxName);
				res.push(ip);
			}
		}
		if (args.length === 1) return res[0];
		return res;
	}
	/**
	* @private
	* @param {string} port
	* @param {number} [idx]
	* @returns {IP|void}
	*/
	__getForForwarding(port, idx) {
		const prefix = [];
		let dataIp;
		let ok = true;
		while (ok) {
			const ip = this.ports.ports[port].get(this.scope, idx);
			if (!ip) break;
			if (ip.type === "data") {
				dataIp = ip;
				ok = false;
				break;
			}
			prefix.push(ip);
		}
		for (let i = 0; i < prefix.length; i += 1) {
			const ip = prefix[i];
			if (ip.type === "closeBracket") {
				if (!this.result.__bracketClosingBefore) this.result.__bracketClosingBefore = [];
				const context = this.nodeInstance.getBracketContext("in", port, this.scope, idx).pop();
				context.closeIp = ip;
				this.result.__bracketClosingBefore.push(context);
			} else if (ip.type === "openBracket") this.nodeInstance.getBracketContext("in", port, this.scope, idx).push({
				ip,
				ports: [],
				source: port
			});
		}
		if (!this.result.__bracketContext) this.result.__bracketContext = {};
		this.result.__bracketContext[port] = this.nodeInstance.getBracketContext("in", port, this.scope, idx).slice(0);
		return dataIp;
	}
	/**
	* @param {...GetArgument} params
	* @returns {any|Array<any>}
	*/
	getData(...params) {
		let args = params;
		if (!args.length) args = ["in"];
		/** @type {Array<any>} */
		const datas = [];
		args.forEach((port) => {
			let packet = this.get(port);
			if (packet == null) {
				datas.push(packet);
				return;
			}
			while (packet.type !== "data") {
				packet = this.get(port);
				if (!packet) break;
			}
			datas.push(packet.data);
		});
		if (args.length === 1) return datas.pop();
		return datas;
	}
	/**
	* @param {...GetArgument} params
	* @returns {void|Array<IP>|Array<void|Array<IP>>}
	*/
	getStream(...params) {
		let args = params;
		if (!args.length) args = ["in"];
		/** @type {Array<Array<IP>|void>} */
		const datas = [];
		for (let i = 0; i < args.length; i += 1) {
			const port = args[i];
			const portBrackets = [];
			/** @type {Array<IP>} */
			let portPackets = [];
			let hasData = false;
			let ip = this.get(port);
			if (!ip) datas.push(void 0);
			while (ip) {
				if (ip.type === "openBracket") {
					if (!portBrackets.length) {
						portPackets = [];
						hasData = false;
					}
					portBrackets.push(ip.data);
					portPackets.push(ip);
				}
				if (ip.type === "data") {
					portPackets.push(ip);
					hasData = true;
					if (!portBrackets.length) break;
				}
				if (ip.type === "closeBracket") {
					portPackets.push(ip);
					portBrackets.pop();
					if (hasData && !portBrackets.length) break;
				}
				ip = this.get(port);
			}
			datas.push(portPackets);
		}
		if (args.length === 1) return datas[0];
		return datas;
	}
};
//#endregion
//#region node_modules/noflo/src/lib/ProcessOutput.js
const debugComponent$1 = (0, import_browser.default)("noflo:component");
/**
* @param {any} err
* @returns {boolean}
*/
function isError(err) {
	return err instanceof Error || Array.isArray(err) && err.length > 0 && err[0] instanceof Error;
}
var ProcessOutput = class {
	/**
	* @param {import("./Ports").OutPorts} ports - Component outports
	* @param {import("./ProcessContext").default} context - Processing context
	*/
	constructor(ports, context) {
		this.ports = ports;
		this.context = context;
		this.nodeInstance = this.context.nodeInstance;
		this.ip = this.context.ip;
		this.result = this.context.result;
		this.scope = this.context.scope;
	}
	/**
	* @param {Error|Error[]} err
	* @returns {void}
	*/
	error(err) {
		const errs = Array.isArray(err) ? err : [err];
		if (this.ports.ports.error && (this.ports.ports.error.isAttached() || !this.ports.ports.error.isRequired())) {
			if (errs.length > 1) this.sendIP("error", new IP("openBracket"));
			errs.forEach((e) => {
				this.sendIP("error", e);
			});
			if (errs.length > 1) this.sendIP("error", new IP("closeBracket"));
		} else errs.forEach((e) => {
			throw e;
		});
	}
	/**
	* @param {string} port - Port to send to
	* @param {IP|any} packet - IP or data to send
	* @returns {void}
	*/
	sendIP(port, packet) {
		const ip = IP.isIP(packet) ? packet : new IP("data", packet);
		if (this.scope !== null && ip.scope === null) ip.scope = this.scope;
		if (!this.nodeInstance.outPorts.ports[port]) throw new Error(`Node ${this.nodeInstance.nodeId} does not have outport ${port}`);
		const portImpl = this.nodeInstance.outPorts.ports[port];
		if (portImpl.isAddressable() && ip.index === null) throw new Error(`Sending packets to addressable port ${this.nodeInstance.nodeId} ${port} requires specifying index`);
		if (this.nodeInstance.isOrdered()) {
			this.nodeInstance.addToResult(this.result, port, ip);
			return;
		}
		if (!portImpl.options.scoped) ip.scope = null;
		portImpl.sendIP(ip);
	}
	/**
	* @param {Error|Array<Error>|Object<string, any>} outputMap
	*/
	send(outputMap) {
		if (isError(outputMap)) {
			const errors = outputMap;
			this.error(errors);
			return;
		}
		/** @type {Array<string>} */
		const componentPorts = [];
		let mapIsInPorts = false;
		Object.keys(this.ports.ports).forEach((port) => {
			if (port !== "error" && port !== "ports" && port !== "_callbacks") componentPorts.push(port);
			if (!mapIsInPorts && outputMap != null && typeof outputMap === "object" && Object.keys(outputMap).indexOf(port) !== -1) mapIsInPorts = true;
		});
		if (componentPorts.length === 1 && !mapIsInPorts) {
			this.sendIP(componentPorts[0], outputMap);
			return;
		}
		if (componentPorts.length > 1 && !mapIsInPorts) throw new Error("Port must be specified for sending output");
		Object.keys(outputMap).forEach((port) => {
			const packet = outputMap[port];
			this.sendIP(port, packet);
		});
	}
	/**
	* @param {Error|Array<Error>|Object<string, any>} outputMap
	*/
	sendDone(outputMap) {
		this.send(outputMap);
		this.done();
	}
	/**
	* @param {any} data
	* @param {Object<string, any>} [options]
	*/
	pass(data, options = {}) {
		if (!("out" in this.ports)) throw new Error("output.pass() requires port \"out\" to be present");
		Object.keys(options).forEach((key) => {
			const val = options[key];
			this.ip[key] = val;
		});
		this.ip.data = data;
		this.sendIP("out", this.ip);
		this.done();
	}
	/**
	* @param {Error|Array<Error>} [error]
	*/
	done(error) {
		this.result.__resolved = true;
		this.nodeInstance.activate(this.context);
		if (error) this.error(error);
		const isLast = () => {
			const resultsOnly = this.nodeInstance.outputQ.filter((q) => {
				if (!q.__resolved) return true;
				if (Object.keys(q).length === 2 && q.__bracketClosingAfter) return false;
				return true;
			});
			const pos = resultsOnly.indexOf(this.result);
			const len = resultsOnly.length;
			const { load } = this.nodeInstance;
			if (pos === len - 1) return true;
			if (pos === -1 && load === len + 1) return true;
			if (len <= 1 && load === 1) return true;
			return false;
		};
		if (this.nodeInstance.isOrdered() && isLast()) Object.keys(this.nodeInstance.bracketContext.in).forEach((port) => {
			const contexts = this.nodeInstance.bracketContext.in[port];
			if (!contexts[this.scope]) return;
			const nodeContext = contexts[this.scope];
			if (!nodeContext.length) return;
			const context = nodeContext[nodeContext.length - 1];
			const inPorts = this.nodeInstance.inPorts.ports[context.source];
			const buf = inPorts.getBuffer(context.ip.scope, context.ip.index);
			while (buf.length > 0 && buf[0].type === "closeBracket") {
				const ip = inPorts.get(context.ip.scope, context.ip.index);
				const ctx = nodeContext.pop();
				ctx.closeIp = ip;
				if (!this.result.__bracketClosingAfter) this.result.__bracketClosingAfter = [];
				this.result.__bracketClosingAfter.push(ctx);
			}
		});
		debugComponent$1(`${this.nodeInstance.nodeId} finished processing ${this.nodeInstance.load}`);
		this.nodeInstance.deactivate(this.context);
	}
};
//#endregion
//#region node_modules/noflo/src/lib/Component.js
const debugComponent = (0, import_browser.default)("noflo:component");
const debugBrackets = (0, import_browser.default)("noflo:component:brackets");
const debugSend = (0, import_browser.default)("noflo:component:send");
/**
* @callback ProcessingFunction
* @param {ProcessInput} input
* @param {ProcessOutput} output
* @param {ProcessContext} context
* @returns {Promise<any> | void}
*/
/**
* @typedef ComponentOptions
* @property {import("./Ports").InPortsOptions | InPorts} [inPorts] - Inports for the component
* @property {import("./Ports").OutPortsOptions | OutPorts} [outPorts] - Outports for the component
* @property {string} [icon]
* @property {string} [description]
* @property {ProcessingFunction} [options.process] - Component processsing function
* @property {boolean} [ordered] - Whether component should send
* packets in same order it received them
* @property {boolean} [autoOrdering]
* @property {boolean} [activateOnInput] - Whether component should
* activate when it receives packets
* @property {Object<string, Array<string>>} [forwardBrackets] - Mappings of forwarding ports
*/
/**
* @typedef BracketContext
* @property {Object<string,Object>} in
* @property {Object<string,Object>} out
*/
/** @typedef {{ __resolved?: boolean, __bracketClosingAfter?: BracketContext[], [key: string]: any }} ProcessResult */
var Component = class extends import_eventemitter3.default {
	/**
	* @param {ComponentOptions} [options]
	*/
	constructor(options = {}) {
		super();
		const opts = options;
		if (!opts.inPorts) opts.inPorts = {};
		if (opts.inPorts instanceof InPorts) this.inPorts = opts.inPorts;
		else this.inPorts = new InPorts(opts.inPorts);
		if (!opts.outPorts) opts.outPorts = {};
		if (opts.outPorts instanceof OutPorts) this.outPorts = opts.outPorts;
		else this.outPorts = new OutPorts(opts.outPorts);
		this.icon = opts.icon ? opts.icon : "";
		this.description = opts.description ? opts.description : "";
		/** @type {string|null} */
		this.componentName = null;
		/** @type {string|null} */
		this.baseDir = null;
		this.started = false;
		this.load = 0;
		this.ordered = opts.ordered != null ? opts.ordered : false;
		this.autoOrdering = opts.autoOrdering != null ? opts.autoOrdering : null;
		/** @type {ProcessResult[]} */
		this.outputQ = [];
		/** @type {BracketContext} */
		this.bracketContext = {
			in: {},
			out: {}
		};
		this.activateOnInput = opts.activateOnInput != null ? opts.activateOnInput : true;
		if (!opts.forwardBrackets) opts.forwardBrackets = { in: ["out", "error"] };
		this.forwardBrackets = opts.forwardBrackets;
		if (typeof opts.process === "function") this.process(opts.process);
		/** @type string | null */
		this.nodeId = null;
		this.__openConnections = 0;
	}
	getDescription() {
		return this.description;
	}
	isReady() {
		return true;
	}
	isSubgraph() {
		return false;
	}
	/**
	* @param {string} icon - Updated icon for the component
	*/
	setIcon(icon) {
		this.icon = icon;
		this.emit("icon", this.icon);
	}
	getIcon() {
		return this.icon;
	}
	/**
	* @param {Error} e
	* @param {Array<string>} [groups]
	* @param {string} [errorPort]
	* @param {string | null} [scope]
	*/
	error(e, groups = [], errorPort = "error", scope = null) {
		const outPort = this.outPorts.ports[errorPort];
		if (outPort && (outPort.isAttached() || !outPort.isRequired())) {
			groups.forEach((group) => {
				outPort.openBracket(group, { scope });
			});
			outPort.data(e, { scope });
			groups.forEach((group) => {
				outPort.closeBracket(group, { scope });
			});
			return;
		}
		throw e;
	}
	/**
	* @callback ErrorableCallback
	* @param {Error | null} error
	*/
	/**
	* @param {ErrorableCallback} callback - Callback for when teardown is ready
	* @returns {Promise<void>}
	*/
	setUp(callback) {
		if (callback) callback(null);
		return Promise.resolve();
	}
	/**
	* @param {ErrorableCallback} callback - Callback for when teardown is ready
	* @returns {Promise<void>}
	*/
	tearDown(callback) {
		if (callback) callback(null);
		return Promise.resolve();
	}
	/**
	* @param {ErrorableCallback} [callback] - Callback for when shutdown is ready
	* @returns {Promise<void>}
	*/
	start(callback) {
		let promise;
		if (this.isStarted()) promise = Promise.resolve();
		else promise = new Promise((resolve, reject) => {
			const res = this.setUp((err) => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
			if (res?.then) res.then(resolve, reject);
		}).then(() => {
			this.started = true;
			this.emit("start");
			return Promise.resolve();
		});
		if (callback) {
			deprecated("Providing a callback to Component.start is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	/**
	* @param {ErrorableCallback} [callback] - Callback for when shutdown is ready
	* @returns {Promise<void>}
	*/
	shutdown(callback) {
		const promise = new Promise((resolve, reject) => {
			const res = this.tearDown((err) => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
			if (res?.then) res.then(resolve, reject);
		}).then(() => new Promise((resolve) => {
			if (this.load > 0) {
				/**
				* @param {number} load
				*/
				const checkLoad = (load) => {
					if (load > 0) return;
					this.removeListener("deactivate", checkLoad);
					resolve();
				};
				this.on("deactivate", checkLoad);
				return;
			}
			resolve();
		})).then(() => {
			const inPorts = this.inPorts.ports || this.inPorts;
			Object.keys(inPorts).forEach((portName) => {
				const inPort = inPorts[portName];
				if (typeof inPort.clear !== "function") return;
				inPort.clear();
			});
			this.bracketContext = {
				in: {},
				out: {}
			};
			if (!this.isStarted()) return Promise.resolve();
			this.started = false;
			this.emit("end");
			return Promise.resolve();
		});
		if (callback) {
			deprecated("Providing a callback to Component.shutdown is deprecated, use Promises");
			promise.then(() => {
				callback(null);
			}, callback);
		}
		return promise;
	}
	isStarted() {
		return this.started;
	}
	prepareForwarding() {
		Object.keys(this.forwardBrackets).forEach((inPort) => {
			const outPorts = this.forwardBrackets[inPort];
			if (!(inPort in this.inPorts.ports)) {
				delete this.forwardBrackets[inPort];
				return;
			}
			/** @type {Array<string>} */
			const tmp = [];
			outPorts.forEach((outPort) => {
				if (outPort in this.outPorts.ports) tmp.push(outPort);
			});
			if (tmp.length === 0) delete this.forwardBrackets[inPort];
			else this.forwardBrackets[inPort] = tmp;
		});
	}
	isLegacy() {
		if (this.handle) return false;
		return true;
	}
	/**
	* @param {ProcessingFunction} handle - Processing function
	* @returns {this}
	*/
	process(handle) {
		if (typeof handle !== "function") throw new Error("Process handler must be a function");
		if (!this.inPorts) throw new Error("Component ports must be defined before process function");
		this.prepareForwarding();
		this.handle = handle;
		Object.keys(this.inPorts.ports).forEach((name) => {
			const port = this.inPorts.ports[name];
			if (!port.name) port.name = name;
			port.on("ip", (ip) => this.handleIP(ip, port));
		});
		return this;
	}
	/**
	* @param {InPort|string} port
	* @returns {boolean}
	*/
	isForwardingInport(port) {
		let portName;
		if (typeof port === "string") portName = port;
		else portName = port.name;
		if (portName && portName in this.forwardBrackets) return true;
		return false;
	}
	/**
	* @param {InPort|string} inport
	* @param {OutPort|string} outport
	* @returns {boolean}
	*/
	isForwardingOutport(inport, outport) {
		let inportName;
		let outportName;
		if (typeof inport === "string") inportName = inport;
		else inportName = inport.name;
		if (typeof outport === "string") outportName = outport;
		else outportName = outport.name;
		if (!inportName || !outportName) return false;
		if (!this.forwardBrackets[inportName]) return false;
		if (this.forwardBrackets[inportName].indexOf(outportName) !== -1) return true;
		return false;
	}
	isOrdered() {
		if (this.ordered) return true;
		if (this.autoOrdering) return true;
		return false;
	}
	/**
	* @param {IP} ip
	* @param {InPort} port
	* @returns {void}
	*/
	handleIP(ip, port) {
		if (!port.options.triggering) return;
		if (ip.type === "openBracket" && this.autoOrdering === null && !this.ordered) {
			debugComponent(`${this.nodeId} port '${port.name}' entered auto-ordering mode`);
			this.autoOrdering = true;
		}
		/** @type {ProcessResult} */
		let result = {};
		if (this.isForwardingInport(port)) {
			if (ip.type === "openBracket") return;
			if (ip.type === "closeBracket") {
				const buf = port.getBuffer(ip.scope, ip.index);
				const dataPackets = buf.filter((p) => p.type === "data");
				if (this.outputQ.length >= this.load && dataPackets.length === 0) {
					if (buf[0] !== ip) return;
					if (!port.name) return;
					port.get(ip.scope, ip.index);
					const bracketCtx = this.getBracketContext("in", port.name, ip.scope, ip.index).pop();
					bracketCtx.closeIp = ip;
					debugBrackets(`${this.nodeId} closeBracket-C from '${bracketCtx.source}' to ${bracketCtx.ports}: '${ip.data}'`);
					result = {
						__resolved: true,
						__bracketClosingAfter: [bracketCtx]
					};
					this.outputQ.push(result);
					this.processOutputQueue();
				}
				if (!dataPackets.length) return;
			}
		}
		const context = new ProcessContext(ip, this, port, result);
		const input = new ProcessInput(this.inPorts, context);
		const output = new ProcessOutput(this.outPorts, context);
		try {
			if (!this.handle) throw new Error("Processing function not defined");
			const res = this.handle(input, output, context);
			if (res && res.then) res.then((data) => output.sendDone(data), (err) => output.done(err));
		} catch (e) {
			this.deactivate(context);
			output.sendDone(e);
		}
		if (context.activated) return;
		if (port.isAddressable()) {
			debugComponent(`${this.nodeId} packet on '${port.name}[${ip.index}]' didn't match preconditions: ${ip.type}`);
			return;
		}
		debugComponent(`${this.nodeId} packet on '${port.name}' didn't match preconditions: ${ip.type}`);
	}
	/**
	* @param {string} type
	* @param {string} port
	* @param {string|null} scope
	* @param {number|null} [idx]
	*/
	getBracketContext(type, port, scope, idx = null) {
		let { name, index } = normalizePortName(port);
		if (idx != null) index = `${idx}`;
		if ((type === "in" ? this.inPorts : this.outPorts).ports[name].isAddressable()) name = `${name}[${index}]`;
		else name = port;
		if (!this.bracketContext[type][name]) this.bracketContext[type][name] = {};
		if (!this.bracketContext[type][name][scope]) this.bracketContext[type][name][scope] = [];
		return this.bracketContext[type][name][scope];
	}
	/**
	* @param {ProcessResult} result
	* @param {Object} port
	* @param {IP} packet
	* @param {boolean} [before]
	*/
	addToResult(result, port, packet, before = false) {
		const res = result;
		const ip = packet;
		const { name, index } = normalizePortName(port);
		const method = before ? "unshift" : "push";
		if (this.outPorts.ports[name].isAddressable()) {
			const idx = index ? parseInt(index, 10) : ip.index;
			if (!res[name]) res[name] = {};
			if (!res[name][idx]) res[name][idx] = [];
			ip.index = idx;
			res[name][idx][method](ip);
			return;
		}
		if (!res[name]) res[name] = [];
		res[name][method](ip);
	}
	/** @private */
	getForwardableContexts(inport, outport, contexts) {
		const { name, index } = normalizePortName(outport);
		const forwardable = [];
		contexts.forEach((ctx, idx) => {
			if (!this.isForwardingOutport(inport, name)) return;
			if (ctx.ports.indexOf(outport) !== -1) return;
			const outContext = this.getBracketContext("out", name, ctx.ip.scope, parseInt(index, 10))[idx];
			if (outContext) {
				if (outContext.ip.data === ctx.ip.data && outContext.ports.indexOf(outport) !== -1) return;
			}
			forwardable.push(ctx);
		});
		return forwardable;
	}
	/** @private */
	addBracketForwards(result) {
		const res = result;
		if (res.__bracketClosingBefore != null ? res.__bracketClosingBefore.length : void 0) res.__bracketClosingBefore.forEach((context) => {
			debugBrackets(`${this.nodeId} closeBracket-A from '${context.source}' to ${context.ports}: '${context.closeIp.data}'`);
			if (!context.ports.length) return;
			context.ports.forEach((port) => {
				const ipClone = context.closeIp.clone();
				this.addToResult(res, port, ipClone, true);
				this.getBracketContext("out", port, ipClone.scope).pop();
			});
		});
		if (res.__bracketContext) Object.keys(res.__bracketContext).reverse().forEach((inport) => {
			const context = res.__bracketContext[inport];
			if (!context.length) return;
			Object.keys(res).forEach((outport) => {
				let datas;
				let forwardedOpens;
				let unforwarded;
				const ips = res[outport];
				if (outport.indexOf("__") === 0) return;
				if (this.outPorts[outport].isAddressable()) {
					Object.keys(ips).forEach((idx) => {
						datas = ips[idx].filter((ip) => ip.type === "data");
						if (!datas.length) return;
						const portIdentifier = `${outport}[${idx}]`;
						unforwarded = this.getForwardableContexts(inport, portIdentifier, context);
						if (!unforwarded.length) return;
						forwardedOpens = [];
						unforwarded.forEach((ctx) => {
							debugBrackets(`${this.nodeId} openBracket from '${inport}' to '${portIdentifier}': '${ctx.ip.data}'`);
							const ipClone = ctx.ip.clone();
							ipClone.index = parseInt(idx, 10);
							forwardedOpens.push(ipClone);
							ctx.ports.push(portIdentifier);
							this.getBracketContext("out", outport, ctx.ip.scope, ipClone.index).push(ctx);
						});
						forwardedOpens.reverse();
						forwardedOpens.forEach((ip) => {
							this.addToResult(res, outport, ip, true);
						});
					});
					return;
				}
				datas = ips.filter((ip) => ip.type === "data");
				if (!datas.length) return;
				unforwarded = this.getForwardableContexts(inport, outport, context);
				if (!unforwarded.length) return;
				forwardedOpens = [];
				unforwarded.forEach((ctx) => {
					debugBrackets(`${this.nodeId} openBracket from '${inport}' to '${outport}': '${ctx.ip.data}'`);
					forwardedOpens.push(ctx.ip.clone());
					ctx.ports.push(outport);
					this.getBracketContext("out", outport, ctx.ip.scope).push(ctx);
				});
				forwardedOpens.reverse();
				forwardedOpens.forEach((ip) => {
					this.addToResult(res, outport, ip, true);
				});
			});
		});
		if (res.__bracketClosingAfter != null ? res.__bracketClosingAfter.length : void 0) res.__bracketClosingAfter.forEach((context) => {
			debugBrackets(`${this.nodeId} closeBracket-B from '${context.source}' to ${context.ports}: '${context.closeIp.data}'`);
			if (!context.ports.length) return;
			context.ports.forEach((port) => {
				const ipClone = context.closeIp.clone();
				this.addToResult(res, port, ipClone, false);
				this.getBracketContext("out", port, ipClone.scope).pop();
			});
		});
		delete res.__bracketClosingBefore;
		delete res.__bracketContext;
		delete res.__bracketClosingAfter;
	}
	/** @private */
	processOutputQueue() {
		while (this.outputQ.length > 0) {
			if (!this.outputQ[0].__resolved) break;
			const result = this.outputQ.shift();
			this.addBracketForwards(result);
			Object.keys(result).forEach((port) => {
				let portIdentifier;
				const ips = result[port];
				if (port.indexOf("__") === 0) return;
				if (this.outPorts.ports[port].isAddressable()) {
					Object.keys(ips).forEach((index) => {
						const idxIps = ips[index];
						const idx = parseInt(index, 10);
						if (!this.outPorts.ports[port].isAttached(idx)) return;
						idxIps.forEach((packet) => {
							const ip = packet;
							portIdentifier = `${port}[${ip.index}]`;
							if (ip.type === "openBracket") debugSend(`${this.nodeId} sending ${portIdentifier} < '${ip.data}'`);
							else if (ip.type === "closeBracket") debugSend(`${this.nodeId} sending ${portIdentifier} > '${ip.data}'`);
							else debugSend(`${this.nodeId} sending ${portIdentifier} DATA`);
							if (!this.outPorts[port].options.scoped) ip.scope = null;
							this.outPorts[port].sendIP(ip);
						});
					});
					return;
				}
				if (!this.outPorts.ports[port].isAttached()) return;
				ips.forEach((packet) => {
					const ip = packet;
					portIdentifier = port;
					if (ip.type === "openBracket") debugSend(`${this.nodeId} sending ${portIdentifier} < '${ip.data}'`);
					else if (ip.type === "closeBracket") debugSend(`${this.nodeId} sending ${portIdentifier} > '${ip.data}'`);
					else debugSend(`${this.nodeId} sending ${portIdentifier} DATA`);
					if (!this.outPorts[port].options.scoped) ip.scope = null;
					this.outPorts[port].sendIP(ip);
				});
			});
		}
	}
	/**
	* @param {Object} context
	* @param {boolean} context.activated
	* @param {boolean} context.deactivated
	* @param {Object} context.result
	*/
	activate(context) {
		if (context.activated) return;
		context.activated = true;
		context.deactivated = false;
		this.load += 1;
		this.emit("activate", this.load);
		if (this.ordered || this.autoOrdering) this.outputQ.push(context.result);
	}
	/**
	* @param {Object} context
	* @param {boolean} context.activated
	* @param {boolean} context.deactivated
	*/
	deactivate(context) {
		if (context.deactivated) return;
		context.deactivated = true;
		context.activated = false;
		if (this.isOrdered()) this.processOutputQueue();
		this.load -= 1;
		this.emit("deactivate", this.load);
	}
};
Component.description = "";
Component.icon = null;
//#endregion
//#region node_modules/noflo/src/lib/AsCallback.js
/**
* @typedef {Graph | string} AsCallbackComponent
*/
/**
* @typedef {Object} AsCallbackOptions
* @property {string} [name] - Name for the wrapped network
* @property {ComponentLoader} [loader] - Component loader instance to use, if any
* @property {string} [baseDir] - Project base directory for component loading
* @property {Object} [flowtrace] - Flowtrace instance to use for tracing this network run
* @property {NetworkCallback} [networkCallback] - Access to Network instance
* @property {boolean} [raw] - Whether the callback should operate on raw noflo.IP objects
* @property {boolean} [asyncDelivery] - Make Information Packet delivery asynchronous
*/
/**
* @typedef {Array<Object<string, IP>>} OutputMap
*/
/**
* @typedef {Object<string, Array<IP|any>>|Array<Object<string, IP|any>>} InputMap
*/
/**
* @param {AsCallbackOptions} options
* @param {AsCallbackComponent} component
* @returns {AsCallbackOptions}
*/
function normalizeOptions(options, component) {
	if (!options) options = {};
	if (!options.name && typeof component === "string") options.name = component;
	if (options.loader) options.baseDir = options.loader.baseDir;
	if (!options.baseDir && process && process.cwd) options.baseDir = process.cwd();
	if (options.baseDir && !options.loader) options.loader = new ComponentLoader(options.baseDir);
	if (!options.raw) options.raw = false;
	if (!options.asyncDelivery) options.asyncDelivery = false;
	return options;
}
/**
* @param {AsCallbackComponent} component
* @param {AsCallbackOptions} options
* @returns {Promise<Network>}
*/
function prepareNetwork(component, options) {
	if (typeof component === "object") return new Network(component, {
		...options,
		componentLoader: options.loader
	}).connect();
	if (!options.loader) return Promise.reject(/* @__PURE__ */ new Error("No component loader provided"));
	return options.loader.load(component, {}).then((instance) => {
		const graph = new import_lib.Graph(options.name);
		const nodeName = options.name || "AsCallback";
		graph.addNode(nodeName, component);
		const inPorts = instance.inPorts.ports;
		const outPorts = instance.outPorts.ports;
		Object.keys(inPorts).forEach((port) => {
			graph.addInport(port, nodeName, port);
		});
		Object.keys(outPorts).forEach((port) => {
			graph.addOutport(port, nodeName, port);
		});
		return new Network(graph, {
			...options,
			componentLoader: options.loader
		}).connect();
	});
}
/**
* @param {Network} network
* @param {any} inputs
* @returns {Promise<OutputMap>}
*/
function runNetwork(network, inputs) {
	return new Promise((resolve, reject) => {
		/** @type {Object<string, import("./InternalSocket").InternalSocket>} */
		let inSockets = {};
		/** @type {Array<Object<string, IP>>} */
		const received = [];
		const outPorts = Object.keys(network.graph.outports);
		/** @type {Object<string, import("./InternalSocket").InternalSocket>} */
		let outSockets = {};
		outPorts.forEach((outport) => {
			const portDef = network.graph.outports[outport];
			const process = network.getNode(portDef.process);
			if (!process) return;
			if (!process.component) return;
			outSockets[outport] = createSocket({}, { debug: false });
			network.subscribeSocket(outSockets[outport]);
			process.component.outPorts.ports[portDef.port].attach(outSockets[outport]);
			outSockets[outport].from = {
				process,
				port: portDef.port
			};
			outSockets[outport].on("ip", (ip) => {
				/** @type Object<string, IP> */
				const res = {};
				res[outport] = ip;
				received.push(res);
			});
		});
		/**
		* @callback EndListener
		* @returns {void}
		*/
		/**
		* @callback ErrorListener
		* @param {import("./InternalSocket").SocketError} err
		* @returns {void}
		*/
		/** @type {EndListener} */
		let onEnd;
		/** @type {ErrorListener} */
		const onError = (err) => {
			reject(err.error);
			network.removeListener("end", onEnd);
		};
		network.once("process-error", onError);
		onEnd = () => {
			Object.keys(outSockets).forEach((port) => {
				const socket = outSockets[port];
				socket.from.process.component.outPorts[socket.from.port].detach(socket);
			});
			outSockets = {};
			inSockets = {};
			resolve(received);
			network.removeListener("process-error", onError);
		};
		network.once("end", onEnd);
		network.start().then(() => {
			for (let i = 0; i < inputs.length; i += 1) {
				const inputMap = inputs[i];
				const keys = Object.keys(inputMap);
				for (let j = 0; j < keys.length; j += 1) {
					const port = keys[j];
					const value = inputMap[port];
					if (!inSockets[port]) {
						const portDef = network.graph.inports[port];
						if (!portDef) {
							reject(/* @__PURE__ */ new Error(`Port ${port} not available in the graph`));
							return;
						}
						const process = network.getNode(portDef.process);
						if (!process) {
							reject(/* @__PURE__ */ new Error(`Process ${portDef.process} for port ${port} not available in the graph`));
							return;
						}
						if (!process.component) {
							reject(/* @__PURE__ */ new Error(`Process ${portDef.process} for port ${port} not available in the graph`));
							return;
						}
						inSockets[port] = createSocket({}, { debug: false });
						network.subscribeSocket(inSockets[port]);
						inSockets[port].to = {
							process,
							port
						};
						process.component.inPorts.ports[portDef.port].attach(inSockets[port]);
					}
					try {
						if (IP.isIP(value)) inSockets[port].post(value);
						else inSockets[port].post(new IP("data", value));
					} catch (e) {
						reject(e);
						network.removeListener("process-error", onError);
						network.removeListener("end", onEnd);
						return;
					}
				}
			}
		}, reject);
	});
}
/**
* @param {any} inputs
* @param {Network} network
* @returns {string}
*/
function getType(inputs, network) {
	if (typeof inputs !== "object" || !inputs) return "simple";
	if (Array.isArray(inputs)) {
		if (inputs.filter((entry) => getType(entry, network) === "map").length === inputs.length) return "sequence";
		return "simple";
	}
	const keys = Object.keys(inputs);
	if (!keys.length) return "simple";
	for (let i = 0; i < keys.length; i += 1) {
		const key = keys[i];
		if (!network.graph.inports[key]) return "simple";
	}
	return "map";
}
/**
* @param {any} inputs
* @param {string} inputType
* @param {Network} network
* @returns {InputMap}
*/
function prepareInputMap(inputs, inputType, network) {
	if (inputType === "sequence") return inputs;
	if (inputType === "map") return [inputs];
	let inPort = Object.keys(network.graph.inports)[0];
	if (!inPort) return {};
	if (network.graph.inports.in) inPort = "in";
	/** @type {InputMap} */
	const map = {};
	map[inPort] = inputs;
	return [map];
}
/**
* @param {Array<IP>} values
* @param {AsCallbackOptions} options
* @returns {Array<any>}
*/
function normalizeOutput(values, options) {
	if (options.raw) return values;
	/** @type {Array<any>} */
	const result = [];
	/** @type {Array<any>|null} */
	let previous = null;
	let current = result;
	values.forEach((packet) => {
		if (packet.type === "openBracket") {
			previous = current;
			current = [];
			previous.push(current);
		}
		if (packet.type === "data") current.push(packet.data);
		if (packet.type === "closeBracket") current = previous;
	});
	if (result.length === 1) return result[0];
	return result;
}
/**
* @param {OutputMap} outputs
* @param {string} resultType
* @param {AsCallbackOptions} options
*/
function sendOutputMap(outputs, resultType, options) {
	const errors = outputs.filter((map) => map.error != null).map((map) => map.error);
	if (errors.length) return Promise.reject(normalizeOutput(errors, options));
	if (resultType === "sequence") return Promise.resolve(outputs.map((map) => {
		/** @type {Object<string, any|IP>} */
		const res = {};
		Object.keys(map).forEach((key) => {
			const val = map[key];
			if (options.raw) {
				res[key] = val;
				return;
			}
			res[key] = normalizeOutput([val], options);
		});
		return res;
	}));
	/** @type {Object<string, Array<any|IP>>} */
	const mappedOutputs = {};
	outputs.forEach((map) => {
		Object.keys(map).forEach((key) => {
			const val = map[key];
			if (!mappedOutputs[key]) mappedOutputs[key] = [];
			mappedOutputs[key].push(val);
		});
	});
	const withValue = Object.keys(mappedOutputs).filter((outport) => mappedOutputs[outport].length > 0);
	if (withValue.length === 0) return Promise.resolve(null);
	if (withValue.length === 1 && resultType === "simple") return Promise.resolve(normalizeOutput(mappedOutputs[withValue[0]], options));
	/** @type {Object<string, any|IP>} */
	const result = {};
	Object.keys(mappedOutputs).forEach((port) => {
		const packets = mappedOutputs[port];
		result[port] = normalizeOutput(packets, options);
	});
	return Promise.resolve(result);
}
/**
* @callback ResultCallback
* @param {Error | null} err
* @param {any} [output]
* @returns {void}
*/
/**
* @callback NetworkAsCallback
* @param {any} input
* @param {ResultCallback} callback
* @returns void
*/
/**
* @callback NetworkAsPromise
* @param {any} input
* @returns {Promise<any>}
*/
/**
* @callback NetworkCallback
* @param {Network} network
* @returns void
*/
/**
* @param {Graph | string} component - Graph or component to load
* @param {Object} options
* @param {string} [options.name] - Name for the wrapped network
* @param {ComponentLoader} [options.loader] - Component loader instance to use, if any
* @param {string} [options.baseDir] - Project base directory for component loading
* @param {Object} [options.flowtrace] - Flowtrace instance to use for tracing this network run
* @param {NetworkCallback} [options.networkCallback] - Access to Network instance
* @param {boolean} [options.raw] - Whether the callback should operate on raw noflo.IP objects
* @returns {NetworkAsPromise}
*/
function asPromise(component, options) {
	if (!component) throw new Error("No component or graph provided");
	options = normalizeOptions(options, component);
	return (inputs) => prepareNetwork(component, options).then((network) => {
		if (options.networkCallback) options.networkCallback(network);
		const resultType = getType(inputs, network);
		return runNetwork(network, prepareInputMap(inputs, resultType, network)).then((outputMap) => sendOutputMap(outputMap, resultType, options));
	});
}
/**
* @param {AsCallbackComponent} component - Graph or component to load
* @param {AsCallbackOptions} options
* @returns {NetworkAsCallback}
*/
function asCallback(component, options) {
	const promised = asPromise(component, options);
	return (inputs, callback) => {
		promised(inputs).then((output) => {
			callback(null, output);
		}, callback);
	};
}
//#endregion
//#region node_modules/get-function-params/src/patterns.js
var require_patterns = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = {
		stringPatterns: [
			/'[^]*?'/g,
			/"[^]*?"/g,
			/`[^]*?`/g
		],
		prePatterns: [
			/\[[^]*?\]/,
			/{[^]*?}/,
			/=>\s*?\([^]*?\)/,
			/=\s*?function\s*?\([^]*(?=[^]*\))/,
			/=\s*?\([^]*(?=[^]*\))/,
			/\s*?=[^>][^,\)]*/
		],
		postPatterns: [/\([^]*?\)/]
	};
}));
//#endregion
//#region node_modules/get-function-params/src/delim.js
var require_delim = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function(id) {
		return [
			":~:",
			id,
			":~:"
		].join("");
	};
}));
//#endregion
//#region node_modules/get-function-params/src/encodeStrings.js
var require_encodeStrings = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var stringPatterns = require_patterns().stringPatterns;
	var delim = require_delim();
	module.exports = function(cache, string) {
		while (true) {
			var shortestString = stringPatterns.reduce(function(arr, pattern) {
				return arr.concat(string.match(pattern) || []);
			}, []).sort(function(a, b) {
				return a.length - b.length;
			})[0];
			if (!shortestString) return string;
			string = string.replace(shortestString, delim(cache.push(shortestString)));
		}
	};
}));
//#endregion
//#region node_modules/get-function-params/src/encode.js
var require_encode = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var delim = require_delim();
	module.exports = function(cache, string, patterns) {
		patterns.forEach(function(pattern) {
			while (pattern.test(string)) {
				var match = pattern.exec(string)[0];
				string = string.replace(match, delim(cache.push(match)));
			}
		});
		return string;
	};
}));
//#endregion
//#region node_modules/get-function-params/src/decode.js
var require_decode = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var delim = require_delim();
	module.exports = function(cache, string, skipEval) {
		var pattern = /:~:(\d+?):~:/;
		while (pattern.test(string)) {
			var id = pattern.exec(string)[1];
			string = string.replace(delim(id), cache[id - 1]);
		}
		return skipEval ? string : eval("(" + string + ")");
	};
}));
//#endregion
//#region node_modules/get-function-params/index.js
var require_get_function_params = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var patterns = require_patterns();
	var encodeStrings = require_encodeStrings();
	var encode = require_encode();
	var decode = require_decode();
	module.exports = function(fn) {
		var cache = [];
		var fnString = fn.toString().replace(/\/\*.*?\*\//g, "");
		fnString = encodeStrings(cache, fnString);
		var params = encode(cache, fnString, patterns.prePatterns).replace(/\n/g, "").replace(/\s*async\s*/, "").match(/(?:function\s*\((.*?)\)|\((.*?)\))|(.*?)\s*=>/);
		params = params[1] || params[2] || params[3] || "";
		return encode(cache, params, patterns.postPatterns).split(",").filter(function(i) {
			return i;
		}).map(function(i) {
			i = decode(cache, i, true);
			var data = i.split("=");
			var obj = { param: data[0].trim() };
			if (data[1]) obj.default = decode(cache, data.slice(1).join("="));
			return obj;
		});
	};
}));
//#endregion
//#region node_modules/noflo/src/lib/AsComponent.js
var import_get_function_params = /* @__PURE__ */ __toESM(require_get_function_params());
/**
* @typedef FuncParam
* @property {string} param
* @property {any} [default]
*/
/**
* @typedef {Object} PortOptions - Options for configuring all types of ports
* @property {string} [description='']
* @property {string} [datatype='all']
* @property {string} [schema=null]
* @property {string} [type=null]
* @property {boolean} [required=false]
* @property {boolean} [scoped=true]
* @property {any} [default]
*/
/**
* @param {Function} func
* @param {Object} options
* @returns {Component}
*/
function asComponent(func, options) {
	let hasCallback = false;
	/** @type {Array<FuncParam>} */
	const params = (0, import_get_function_params.default)(func).filter((p) => {
		if (p.param !== "callback") return true;
		hasCallback = true;
		return false;
	});
	const c = new Component(options);
	params.forEach((p) => {
		/** @type {PortOptions} */
		const portOptions = { required: true };
		if (typeof p.default !== "undefined") {
			portOptions.default = p.default;
			portOptions.required = false;
		}
		c.inPorts.add(p.param, portOptions);
		c.forwardBrackets[p.param] = ["out", "error"];
	});
	if (!params.length) c.inPorts.add("in", { datatype: "bang" });
	c.outPorts.add("out");
	c.outPorts.add("error");
	c.process((input, output) => {
		let values;
		if (params.length) {
			for (let i = 0; i < params.length; i += 1) {
				const p = params[i];
				if (!input.hasData(p.param)) return;
			}
			values = params.map((p) => input.getData(p.param));
		} else {
			if (!input.hasData("in")) return;
			input.getData("in");
			values = [];
		}
		if (hasCallback) {
			/**
			* @param {Error|null} err
			* @param {any} [res]
			*/
			const cb = (err, res) => {
				if (err) {
					output.done(err);
					return;
				}
				output.sendDone(res);
			};
			values.push(cb);
			func(...values);
			return;
		}
		const res = func(...values);
		if (res && typeof res === "object" && typeof res.then === "function") {
			res.then((val) => output.sendDone(val), (err) => output.done(err));
			return;
		}
		output.sendDone(res);
	});
	return c;
}
//#endregion
//#region node_modules/noflo/src/lib/NoFlo.js
/**
* @callback NetworkCallback
* @param {Error | null} err
* @param {Network|LegacyNetwork} [network]
*/
/**
* @typedef CreateNetworkOptions
* @property {boolean} [subscribeGraph] - Whether the Network should monitor the graph
* @property {boolean} [delay] - Whether the Network should be started later
*/
/**
* @typedef { CreateNetworkOptions & import("./BaseNetwork").NetworkOptions} NetworkOptions
*/
/**
* @param {import("fbp-graph").Graph} graphInstance - Graph definition to build a Network for
* @param {NetworkOptions} options - Network options
* @param {NetworkCallback} [callback] - Legacy callback for the created Network
* @returns {Promise<Network|LegacyNetwork>}
*/
function createNetwork(graphInstance, options, callback) {
	if (typeof options !== "object") options = {};
	if (typeof options.subscribeGraph === "undefined") options.subscribeGraph = false;
	const network = new (options.subscribeGraph ? LegacyNetwork : Network)(graphInstance, options);
	const promise = network.loader.listComponents().then(() => {
		if (options.delay) return Promise.resolve(network);
		return network.connect().then(() => network.start());
	});
	if (callback) {
		deprecated("Providing a callback to NoFlo.createNetwork is deprecated, use Promises");
		promise.then((nw) => {
			callback(null, nw);
		}, callback);
	}
	return promise;
}
/**
* @param {string} file
* @param {NetworkOptions} options - Network options
* @param {any} [callback] - Legacy callback
* @returning {Promise<Network>}
*/
function loadFile(file, options, callback) {
	const promise = import_lib.graph.loadFile(file).then((graphInstance) => createNetwork(graphInstance, options));
	if (callback) {
		deprecated("Providing a callback to NoFlo.loadFile is deprecated, use Promises");
		promise.then((network) => {
			callback(null, network);
		}, callback);
	}
	return promise;
}
/**
* @param {graph.Graph} graphInstance
* @param {string} file
* @param {any} [callback] - Legacy callback
* @returning {Promise<string>}
*/
function saveFile(graphInstance, file, callback) {
	return graphInstance.save(file, callback);
}
var NoFlo_default = {
	...import_lib.graph,
	isBrowser,
	ComponentLoader,
	Component,
	InPorts,
	OutPorts,
	InPort,
	OutPort,
	internalSocket: InternalSocket_exports,
	IP,
	createNetwork,
	loadFile,
	saveFile,
	asCallback,
	asPromise,
	asComponent
};
//#endregion
var Graph = import_lib.Graph;
var Journal = import_lib.Journal;
var graph = import_lib.graph;
var journal = import_lib.journal;
export { Component, ComponentLoader, Graph, IP, InPort, InPorts, Journal, OutPort, OutPorts, asCallback, asComponent, asPromise, createNetwork, NoFlo_default as default, graph, InternalSocket_exports as internalSocket, isBrowser, journal, loadFile, saveFile };
