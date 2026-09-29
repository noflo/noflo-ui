var require = () => ({}); var fs = {};
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esmMin = (fn, res, err) => () => {
	if (err) throw err[0];
	try {
		return fn && (res = fn(fn = 0)), res;
	} catch (e) {
		throw err = [e], e;
	}
};
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
var __toCommonJS = (mod) => __hasOwnProp.call(mod, "module.exports") ? mod["module.exports"] : __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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
//#region node_modules/eventemitter3/index.mjs
var import_eventemitter3;
var init_eventemitter3 = __esmMin((() => {
	import_eventemitter3 = /* @__PURE__ */ __toESM(require_eventemitter3(), 1);
}));
//#endregion
//#region src/shims/event-emitter.js
var event_emitter_exports = /* @__PURE__ */ __exportAll({
	EventEmitter: () => EventEmitter,
	default: () => EventEmitter
});
var EventEmitter;
var init_event_emitter = __esmMin((() => {
	init_eventemitter3();
	EventEmitter = class extends import_eventemitter3.default {
		/**
		* Node API no-op: eventemitter3 has no listener cap to raise.
		*
		* @param {number} _n
		* @returns {this}
		*/
		setMaxListeners(_n) {
			return this;
		}
	};
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
	const events_1 = (init_event_emitter(), __toCommonJS(event_emitter_exports));
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
//#region src/worker/empty-fs.js
var empty_fs_exports = /* @__PURE__ */ __exportAll({ default: () => empty_fs_default });
var empty_fs_default;
var init_empty_fs = __esmMin((() => {
	empty_fs_default = {};
}));
//#endregion
//#region node_modules/fbp-graph/lib/Journal.js
var require_Journal = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.MemoryJournalStore = exports.JournalStore = exports.Journal = void 0;
	const events_1 = (init_event_emitter(), __toCommonJS(event_emitter_exports));
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
	var Journal = class extends events_1.EventEmitter {
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
				const { writeFile } = (init_empty_fs(), __toCommonJS(empty_fs_exports));
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
	exports.Journal = Journal;
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
	const events_1 = (init_event_emitter(), __toCommonJS(event_emitter_exports));
	const clone = require_clone();
	const fs_1 = (init_empty_fs(), __toCommonJS(empty_fs_exports));
	const Platform_1 = require_Platform();
	var Graph = class extends events_1.EventEmitter {
		constructor(name = "", options = {}) {
			super();
			this.setMaxListeners(0);
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
//#region node_modules/noflo/src/lib/IP.js
init_event_emitter();
var import_lib = require_lib();
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
function isBrowser$1() {
	if (typeof process !== "undefined" && process.execPath && process.execPath.match(/node|iojs/)) return false;
	return true;
}
/**
* @param {string} message
* @returns {void}
*/
function deprecated(message) {
	if (isBrowser$1()) {
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
	if (isBrowser$1()) {
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
var InternalSocket = class extends EventEmitter {
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
init_event_emitter();
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
var BaseNetwork = class extends EventEmitter {
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
		if (!isBrowser$1()) this.baseDir = options.baseDir || graph.properties.baseDir || process.cwd();
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
init_event_emitter();
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
var BasePort = class extends EventEmitter {
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
init_event_emitter();
/**
* @typedef {import("./BasePort").BaseOptions} PortOptions
*/
var Ports = class extends EventEmitter {
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
init_event_emitter();
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
var Component = class extends EventEmitter {
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
	isBrowser: isBrowser$1,
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
//#region node_modules/lib0/map.js
/**
* Utility module to work with key-value stores.
*
* @module map
*/
/**
* @template K
* @template V
* @typedef {Map<K,V>} GlobalMap
*/
/**
* Creates a new Map instance.
*
* @function
* @return {Map<any, any>}
*
* @function
*/
const create$5 = () => /* @__PURE__ */ new Map();
/**
* Copy a Map object into a fresh Map object.
*
* @function
* @template K,V
* @param {Map<K,V>} m
* @return {Map<K,V>}
*/
const copy = (m) => {
	const r = create$5();
	m.forEach((v, k) => {
		r.set(k, v);
	});
	return r;
};
/**
* Get map property. Create T if property is undefined and set T on map.
*
* ```js
* const listeners = map.setIfUndefined(events, 'eventName', set.create)
* listeners.add(listener)
* ```
*
* @function
* @template {Map<any, any>} MAP
* @template {MAP extends Map<any,infer V> ? function():V : unknown} CF
* @param {MAP} map
* @param {MAP extends Map<infer K,any> ? K : unknown} key
* @param {CF} createT
* @return {ReturnType<CF>}
*/
const setIfUndefined = (map, key, createT) => {
	let set = map.get(key);
	if (set === void 0) map.set(key, set = createT());
	return set;
};
/**
* Creates an Array and populates it with the content of all key-value pairs using the `f(value, key)` function.
*
* @function
* @template K
* @template V
* @template R
* @param {Map<K,V>} m
* @param {function(V,K):R} f
* @return {Array<R>}
*/
const map = (m, f) => {
	const res = [];
	for (const [key, value] of m) res.push(f(value, key));
	return res;
};
/**
* Tests whether any key-value pairs pass the test implemented by `f(value, key)`.
*
* @todo should rename to some - similarly to Array.some
*
* @function
* @template K
* @template V
* @param {Map<K,V>} m
* @param {function(V,K):boolean} f
* @return {boolean}
*/
const any = (m, f) => {
	for (const [key, value] of m) if (f(value, key)) return true;
	return false;
};
//#endregion
//#region node_modules/lib0/set.js
/**
* Utility module to work with sets.
*
* @module set
*/
const create$4 = () => /* @__PURE__ */ new Set();
//#endregion
//#region node_modules/lib0/array.js
/**
* Return the last element of an array. The element must exist
*
* @template L
* @param {ArrayLike<L>} arr
* @return {L}
*/
const last = (arr) => arr[arr.length - 1];
/**
* Append elements from src to dest
*
* @template M
* @param {Array<M>} dest
* @param {Array<M>} src
*/
const appendTo = (dest, src) => {
	for (let i = 0; i < src.length; i++) dest.push(src[i]);
};
/**
* Transforms something array-like to an actual Array.
*
* @function
* @template T
* @param {ArrayLike<T>|Iterable<T>} arraylike
* @return {T}
*/
const from = Array.from;
/**
* True iff condition holds on every element in the Array.
*
* @function
* @template {ArrayLike<any>} ARR
*
* @param {ARR} arr
* @param {ARR extends ArrayLike<infer S> ? ((value:S, index:number, arr:ARR) => boolean) : any} f
* @return {boolean}
*/
const every$1 = (arr, f) => {
	for (let i = 0; i < arr.length; i++) if (!f(arr[i], i, arr)) return false;
	return true;
};
/**
* True iff condition holds on some element in the Array.
*
* @function
* @template {ArrayLike<any>} ARR
*
* @param {ARR} arr
* @param {ARR extends ArrayLike<infer S> ? ((value:S, index:number, arr:ARR) => boolean) : never} f
* @return {boolean}
*/
const some = (arr, f) => {
	for (let i = 0; i < arr.length; i++) if (f(arr[i], i, arr)) return true;
	return false;
};
/**
* @template T
* @param {number} len
* @param {function(number, Array<T>):T} f
* @return {Array<T>}
*/
const unfold = (len, f) => {
	const array = new Array(len);
	for (let i = 0; i < len; i++) array[i] = f(i, array);
	return array;
};
const isArray = Array.isArray;
//#endregion
//#region node_modules/lib0/observable.js
/**
* Observable class prototype.
*
* @module observable
*/
/**
* Handles named events.
* @experimental
*
* This is basically a (better typed) duplicate of Observable, which will replace Observable in the
* next release.
*
* @template {{[key in keyof EVENTS]: function(...any):void}} EVENTS
*/
var ObservableV2 = class {
	constructor() {
		/**
		* Some desc.
		* @type {Map<string, Set<any>>}
		*/
		this._observers = create$5();
	}
	/**
	* @template {keyof EVENTS & string} NAME
	* @param {NAME} name
	* @param {EVENTS[NAME]} f
	*/
	on(name, f) {
		setIfUndefined(this._observers, name, create$4).add(f);
		return f;
	}
	/**
	* @template {keyof EVENTS & string} NAME
	* @param {NAME} name
	* @param {EVENTS[NAME]} f
	*/
	once(name, f) {
		/**
		* @param  {...any} args
		*/
		const _f = (...args) => {
			this.off(name, _f);
			f(...args);
		};
		this.on(name, _f);
	}
	/**
	* @template {keyof EVENTS & string} NAME
	* @param {NAME} name
	* @param {EVENTS[NAME]} f
	*/
	off(name, f) {
		const observers = this._observers.get(name);
		if (observers !== void 0) {
			observers.delete(f);
			if (observers.size === 0) this._observers.delete(name);
		}
	}
	/**
	* Emit a named event. All registered event listeners that listen to the
	* specified name will receive the event.
	*
	* @todo This should catch exceptions
	*
	* @template {keyof EVENTS & string} NAME
	* @param {NAME} name The event name.
	* @param {Parameters<EVENTS[NAME]>} args The arguments that are applied to the event listener.
	*/
	emit(name, args) {
		return from((this._observers.get(name) || create$5()).values()).forEach((f) => f(...args));
	}
	destroy() {
		this._observers = create$5();
	}
};
/* c8 ignore start */
/**
* Handles named events.
*
* @deprecated
* @template N
*/
var Observable = class {
	constructor() {
		/**
		* Some desc.
		* @type {Map<N, any>}
		*/
		this._observers = create$5();
	}
	/**
	* @param {N} name
	* @param {function} f
	*/
	on(name, f) {
		setIfUndefined(this._observers, name, create$4).add(f);
	}
	/**
	* @param {N} name
	* @param {function} f
	*/
	once(name, f) {
		/**
		* @param  {...any} args
		*/
		const _f = (...args) => {
			this.off(name, _f);
			f(...args);
		};
		this.on(name, _f);
	}
	/**
	* @param {N} name
	* @param {function} f
	*/
	off(name, f) {
		const observers = this._observers.get(name);
		if (observers !== void 0) {
			observers.delete(f);
			if (observers.size === 0) this._observers.delete(name);
		}
	}
	/**
	* Emit a named event. All registered event listeners that listen to the
	* specified name will receive the event.
	*
	* @todo This should catch exceptions
	*
	* @param {N} name The event name.
	* @param {Array<any>} args The arguments that are applied to the event listener.
	*/
	emit(name, args) {
		return from((this._observers.get(name) || create$5()).values()).forEach((f) => f(...args));
	}
	destroy() {
		this._observers = create$5();
	}
};
/* c8 ignore end */
//#endregion
//#region node_modules/lib0/math.js
/**
* Common Math expressions.
*
* @module math
*/
const floor = Math.floor;
const abs = Math.abs;
/**
* @function
* @param {number} a
* @param {number} b
* @return {number} The smaller element of a and b
*/
const min = (a, b) => a < b ? a : b;
/**
* @function
* @param {number} a
* @param {number} b
* @return {number} The bigger element of a and b
*/
const max = (a, b) => a > b ? a : b;
const isNaN$2 = Number.isNaN;
/**
* Check whether n is negative, while considering the -0 edge case. While `-0 < 0` is false, this
* function returns true for -0,-1,,.. and returns false for 0,1,2,...
* @param {number} n
* @return {boolean} Wether n is negative. This function also distinguishes between -0 and +0
*/
const isNegativeZero = (n) => n !== 0 ? n < 0 : 1 / n < 0;
//#endregion
//#region node_modules/lib0/binary.js
/**
* Binary data constants.
*
* @module binary
*/
/**
* n-th bit activated.
*
* @type {number}
*/
const BIT1 = 1;
const BIT2 = 2;
const BIT3 = 4;
const BIT4 = 8;
const BIT6 = 32;
const BIT7 = 64;
const BIT8 = 128;
const BIT18 = 1 << 17;
const BIT19 = 1 << 18;
const BIT20 = 1 << 19;
const BIT21 = 1 << 20;
const BIT22 = 1 << 21;
const BIT23 = 1 << 22;
const BIT24 = 1 << 23;
const BIT25 = 1 << 24;
const BIT26 = 1 << 25;
const BIT27 = 1 << 26;
const BIT28 = 1 << 27;
const BIT29 = 1 << 28;
const BIT30 = 1 << 29;
const BIT31 = 1 << 30;
const BITS5 = 31;
const BITS6 = 63;
const BITS7 = 127;
const BITS17 = BIT18 - 1;
const BITS18 = BIT19 - 1;
const BITS19 = BIT20 - 1;
const BITS20 = BIT21 - 1;
const BITS21 = BIT22 - 1;
const BITS22 = BIT23 - 1;
const BITS23 = BIT24 - 1;
const BITS24 = BIT25 - 1;
const BITS25 = BIT26 - 1;
const BITS26 = BIT27 - 1;
const BITS27 = BIT28 - 1;
const BITS28 = BIT29 - 1;
const BITS29 = BIT30 - 1;
const BITS30 = BIT31 - 1;
/**
* @type {number}
*/
const BITS31 = 2147483647;
//#endregion
//#region node_modules/lib0/number.js
/**
* Utility helpers for working with numbers.
*
* @module number
*/
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;
/* c8 ignore next */
const isInteger = Number.isInteger || ((num) => typeof num === "number" && isFinite(num) && floor(num) === num);
const isNaN$1 = Number.isNaN;
const parseInt$1 = Number.parseInt;
//#endregion
//#region node_modules/lib0/string.js
/**
* Utility module to work with strings.
*
* @module string
*/
const fromCharCode = String.fromCharCode;
const fromCodePoint = String.fromCodePoint;
/**
* The largest utf16 character.
* Corresponds to Uint8Array([255, 255]) or charcodeof(2x2^8)
*/
const MAX_UTF16_CHARACTER = fromCharCode(65535);
/**
* @param {string} s
* @return {string}
*/
const toLowerCase = (s) => s.toLowerCase();
const trimLeftRegex = /^\s*/g;
/**
* @param {string} s
* @return {string}
*/
const trimLeft = (s) => s.replace(trimLeftRegex, "");
const fromCamelCaseRegex = /([A-Z])/g;
/**
* @param {string} s
* @param {string} separator
* @return {string}
*/
const fromCamelCase = (s, separator) => trimLeft(s.replace(fromCamelCaseRegex, (match) => `${separator}${toLowerCase(match)}`));
/**
* @param {string} str
* @return {Uint8Array<ArrayBuffer>}
*/
const _encodeUtf8Polyfill = (str) => {
	const encodedString = unescape(encodeURIComponent(str));
	const len = encodedString.length;
	const buf = new Uint8Array(len);
	for (let i = 0; i < len; i++) buf[i] = encodedString.codePointAt(i);
	return buf;
};
/* c8 ignore next */
const utf8TextEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
/**
* @param {string} str
* @return {Uint8Array<ArrayBuffer>}
*/
const _encodeUtf8Native = (str) => utf8TextEncoder.encode(str);
/**
* @param {string} str
* @return {Uint8Array}
*/
/* c8 ignore next */
const encodeUtf8 = utf8TextEncoder ? _encodeUtf8Native : _encodeUtf8Polyfill;
/* c8 ignore next */
let utf8TextDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder("utf-8", {
	fatal: true,
	ignoreBOM: true
});
/* c8 ignore start */
if (utf8TextDecoder && utf8TextDecoder.decode(/* @__PURE__ */ new Uint8Array()).length === 1)
 /* c8 ignore next */
utf8TextDecoder = null;
/**
* @param {string} source
* @param {number} n
*/
const repeat = (source, n) => unfold(n, () => source).join("");
//#endregion
//#region node_modules/lib0/encoding.js
/**
* Efficient schema-less binary encoding with support for variable length encoding.
*
* Use [lib0/encoding] with [lib0/decoding]. Every encoding function has a corresponding decoding function.
*
* Encodes numbers in little-endian order (least to most significant byte order)
* and is compatible with Golang's binary encoding (https://golang.org/pkg/encoding/binary/)
* which is also used in Protocol Buffers.
*
* ```js
* // encoding step
* const encoder = encoding.createEncoder()
* encoding.writeVarUint(encoder, 256)
* encoding.writeVarString(encoder, 'Hello world!')
* const buf = encoding.toUint8Array(encoder)
* ```
*
* ```js
* // decoding step
* const decoder = decoding.createDecoder(buf)
* decoding.readVarUint(decoder) // => 256
* decoding.readVarString(decoder) // => 'Hello world!'
* decoding.hasContent(decoder) // => false - all data is read
* ```
*
* @module encoding
*/
/**
* A BinaryEncoder handles the encoding to an Uint8Array.
*/
var Encoder = class {
	constructor() {
		this.cpos = 0;
		this.cbuf = /* @__PURE__ */ new Uint8Array(100);
		/**
		* @type {Array<Uint8Array>}
		*/
		this.bufs = [];
	}
};
/**
* @function
* @return {Encoder}
*/
const createEncoder = () => new Encoder();
/**
* The current length of the encoded data.
*
* @function
* @param {Encoder} encoder
* @return {number}
*/
const length = (encoder) => {
	let len = encoder.cpos;
	for (let i = 0; i < encoder.bufs.length; i++) len += encoder.bufs[i].length;
	return len;
};
/**
* Transform to Uint8Array.
*
* @function
* @param {Encoder} encoder
* @return {Uint8Array<ArrayBuffer>} The created ArrayBuffer.
*/
const toUint8Array = (encoder) => {
	const uint8arr = new Uint8Array(length(encoder));
	let curPos = 0;
	for (let i = 0; i < encoder.bufs.length; i++) {
		const d = encoder.bufs[i];
		uint8arr.set(d, curPos);
		curPos += d.length;
	}
	uint8arr.set(new Uint8Array(encoder.cbuf.buffer, 0, encoder.cpos), curPos);
	return uint8arr;
};
/**
* Verify that it is possible to write `len` bytes wtihout checking. If
* necessary, a new Buffer with the required length is attached.
*
* @param {Encoder} encoder
* @param {number} len
*/
const verifyLen = (encoder, len) => {
	const bufferLen = encoder.cbuf.length;
	if (bufferLen - encoder.cpos < len) {
		encoder.bufs.push(new Uint8Array(encoder.cbuf.buffer, 0, encoder.cpos));
		encoder.cbuf = new Uint8Array(max(bufferLen, len) * 2);
		encoder.cpos = 0;
	}
};
/**
* Write one byte to the encoder.
*
* @function
* @param {Encoder} encoder
* @param {number} num The byte that is to be encoded.
*/
const write = (encoder, num) => {
	const bufferLen = encoder.cbuf.length;
	if (encoder.cpos === bufferLen) {
		encoder.bufs.push(encoder.cbuf);
		encoder.cbuf = new Uint8Array(bufferLen * 2);
		encoder.cpos = 0;
	}
	encoder.cbuf[encoder.cpos++] = num;
};
/**
* Write one byte as an unsigned integer.
*
* @function
* @param {Encoder} encoder
* @param {number} num The number that is to be encoded.
*/
const writeUint8 = write;
/**
* Write a variable length unsigned integer. Max encodable integer is 2^53.
*
* @function
* @param {Encoder} encoder
* @param {number} num The number that is to be encoded.
*/
const writeVarUint = (encoder, num) => {
	while (num > 127) {
		write(encoder, 128 | 127 & num);
		num = floor(num / 128);
	}
	write(encoder, 127 & num);
};
/**
* Write a variable length integer.
*
* We use the 7th bit instead for signaling that this is a negative number.
*
* @function
* @param {Encoder} encoder
* @param {number} num The number that is to be encoded.
*/
const writeVarInt = (encoder, num) => {
	const isNegative = isNegativeZero(num);
	if (isNegative) num = -num;
	write(encoder, (num > 63 ? 128 : 0) | (isNegative ? 64 : 0) | 63 & num);
	num = floor(num / 64);
	while (num > 0) {
		write(encoder, (num > 127 ? 128 : 0) | 127 & num);
		num = floor(num / 128);
	}
};
/**
* A cache to store strings temporarily
*/
const _strBuffer = /* @__PURE__ */ new Uint8Array(3e4);
const _maxStrBSize = _strBuffer.length / 3;
/**
* Write a variable length string.
*
* @function
* @param {Encoder} encoder
* @param {String} str The string that is to be encoded.
*/
const _writeVarStringNative = (encoder, str) => {
	if (str.length < _maxStrBSize) {
		/* c8 ignore next */
		const written = utf8TextEncoder.encodeInto(str, _strBuffer).written || 0;
		writeVarUint(encoder, written);
		for (let i = 0; i < written; i++) write(encoder, _strBuffer[i]);
	} else writeVarUint8Array(encoder, encodeUtf8(str));
};
/**
* Write a variable length string.
*
* @function
* @param {Encoder} encoder
* @param {String} str The string that is to be encoded.
*/
const _writeVarStringPolyfill = (encoder, str) => {
	const encodedString = unescape(encodeURIComponent(str));
	const len = encodedString.length;
	writeVarUint(encoder, len);
	for (let i = 0; i < len; i++) write(encoder, encodedString.codePointAt(i));
};
/**
* Write a variable length string.
*
* @function
* @param {Encoder} encoder
* @param {String} str The string that is to be encoded.
*/
/* c8 ignore next */
const writeVarString = utf8TextEncoder && utf8TextEncoder.encodeInto ? _writeVarStringNative : _writeVarStringPolyfill;
/**
* Append fixed-length Uint8Array to the encoder.
*
* @function
* @param {Encoder} encoder
* @param {Uint8Array} uint8Array
*/
const writeUint8Array = (encoder, uint8Array) => {
	const bufferLen = encoder.cbuf.length;
	const cpos = encoder.cpos;
	const leftCopyLen = min(bufferLen - cpos, uint8Array.length);
	const rightCopyLen = uint8Array.length - leftCopyLen;
	encoder.cbuf.set(uint8Array.subarray(0, leftCopyLen), cpos);
	encoder.cpos += leftCopyLen;
	if (rightCopyLen > 0) {
		encoder.bufs.push(encoder.cbuf);
		encoder.cbuf = new Uint8Array(max(bufferLen * 2, rightCopyLen));
		encoder.cbuf.set(uint8Array.subarray(leftCopyLen));
		encoder.cpos = rightCopyLen;
	}
};
/**
* Append an Uint8Array to Encoder.
*
* @function
* @param {Encoder} encoder
* @param {Uint8Array} uint8Array
*/
const writeVarUint8Array = (encoder, uint8Array) => {
	writeVarUint(encoder, uint8Array.byteLength);
	writeUint8Array(encoder, uint8Array);
};
/**
* Create an DataView of the next `len` bytes. Use it to write data after
* calling this function.
*
* ```js
* // write float32 using DataView
* const dv = writeOnDataView(encoder, 4)
* dv.setFloat32(0, 1.1)
* // read float32 using DataView
* const dv = readFromDataView(encoder, 4)
* dv.getFloat32(0) // => 1.100000023841858 (leaving it to the reader to find out why this is the correct result)
* ```
*
* @param {Encoder} encoder
* @param {number} len
* @return {DataView}
*/
const writeOnDataView = (encoder, len) => {
	verifyLen(encoder, len);
	const dview = new DataView(encoder.cbuf.buffer, encoder.cpos, len);
	encoder.cpos += len;
	return dview;
};
/**
* @param {Encoder} encoder
* @param {number} num
*/
const writeFloat32 = (encoder, num) => writeOnDataView(encoder, 4).setFloat32(0, num, false);
/**
* @param {Encoder} encoder
* @param {number} num
*/
const writeFloat64 = (encoder, num) => writeOnDataView(encoder, 8).setFloat64(0, num, false);
/**
* @param {Encoder} encoder
* @param {bigint} num
*/
const writeBigInt64 = (encoder, num) => writeOnDataView(encoder, 8).setBigInt64(0, num, false);
const floatTestBed = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(4));
/**
* Check if a number can be encoded as a 32 bit float.
*
* @param {number} num
* @return {boolean}
*/
const isFloat32 = (num) => {
	floatTestBed.setFloat32(0, num);
	return floatTestBed.getFloat32(0) === num;
};
/**
* @typedef {Array<AnyEncodable>} AnyEncodableArray
*/
/**
* @typedef {undefined|null|number|bigint|boolean|string|{[k:string]:AnyEncodable}|AnyEncodableArray|Uint8Array} AnyEncodable
*/
/**
* Encode data with efficient binary format.
*
* Differences to JSON:
* • Transforms data to a binary format (not to a string)
* • Encodes undefined, NaN, and ArrayBuffer (these can't be represented in JSON)
* • Numbers are efficiently encoded either as a variable length integer, as a
*   32 bit float, as a 64 bit float, or as a 64 bit bigint.
*
* Encoding table:
*
* | Data Type           | Prefix   | Encoding Method    | Comment |
* | ------------------- | -------- | ------------------ | ------- |
* | undefined           | 127      |                    | Functions, symbol, and everything that cannot be identified is encoded as undefined |
* | null                | 126      |                    | |
* | integer             | 125      | writeVarInt        | Only encodes 32 bit signed integers |
* | float32             | 124      | writeFloat32       | |
* | float64             | 123      | writeFloat64       | |
* | bigint              | 122      | writeBigInt64      | |
* | boolean (false)     | 121      |                    | True and false are different data types so we save the following byte |
* | boolean (true)      | 120      |                    | - 0b01111000 so the last bit determines whether true or false |
* | string              | 119      | writeVarString     | |
* | object<string,any>  | 118      | custom             | Writes {length} then {length} key-value pairs |
* | array<any>          | 117      | custom             | Writes {length} then {length} json values |
* | Uint8Array          | 116      | writeVarUint8Array | We use Uint8Array for any kind of binary data |
*
* Reasons for the decreasing prefix:
* We need the first bit for extendability (later we may want to encode the
* prefix with writeVarUint). The remaining 7 bits are divided as follows:
* [0-30]   the beginning of the data range is used for custom purposes
*          (defined by the function that uses this library)
* [31-127] the end of the data range is used for data encoding by
*          lib0/encoding.js
*
* @param {Encoder} encoder
* @param {AnyEncodable} data
*/
const writeAny = (encoder, data) => {
	switch (typeof data) {
		case "string":
			write(encoder, 119);
			writeVarString(encoder, data);
			break;
		case "number":
			if (isInteger(data) && abs(data) <= 2147483647) {
				write(encoder, 125);
				writeVarInt(encoder, data);
			} else if (isFloat32(data)) {
				write(encoder, 124);
				writeFloat32(encoder, data);
			} else {
				write(encoder, 123);
				writeFloat64(encoder, data);
			}
			break;
		case "bigint":
			write(encoder, 122);
			writeBigInt64(encoder, data);
			break;
		case "object":
			if (data === null) write(encoder, 126);
			else if (isArray(data)) {
				write(encoder, 117);
				writeVarUint(encoder, data.length);
				for (let i = 0; i < data.length; i++) writeAny(encoder, data[i]);
			} else if (data instanceof Uint8Array) {
				write(encoder, 116);
				writeVarUint8Array(encoder, data);
			} else {
				write(encoder, 118);
				const keys = Object.keys(data);
				writeVarUint(encoder, keys.length);
				for (let i = 0; i < keys.length; i++) {
					const key = keys[i];
					writeVarString(encoder, key);
					writeAny(encoder, data[key]);
				}
			}
			break;
		case "boolean":
			write(encoder, data ? 120 : 121);
			break;
		default: write(encoder, 127);
	}
};
/**
* Now come a few stateful encoder that have their own classes.
*/
/**
* Basic Run Length Encoder - a basic compression implementation.
*
* Encodes [1,1,1,7] to [1,3,7,1] (3 times 1, 1 time 7). This encoder might do more harm than good if there are a lot of values that are not repeated.
*
* It was originally used for image compression. Cool .. article http://csbruce.com/cbm/transactor/pdfs/trans_v7_i06.pdf
*
* @note T must not be null!
*
* @template T
*/
var RleEncoder = class extends Encoder {
	/**
	* @param {function(Encoder, T):void} writer
	*/
	constructor(writer) {
		super();
		/**
		* The writer
		*/
		this.w = writer;
		/**
		* Current state
		* @type {T|null}
		*/
		this.s = null;
		this.count = 0;
	}
	/**
	* @param {T} v
	*/
	write(v) {
		if (this.s === v) this.count++;
		else {
			if (this.count > 0) writeVarUint(this, this.count - 1);
			this.count = 1;
			this.w(this, v);
			this.s = v;
		}
	}
};
/**
* @param {UintOptRleEncoder} encoder
*/
const flushUintOptRleEncoder = (encoder) => {
	if (encoder.count > 0) {
		writeVarInt(encoder.encoder, encoder.count === 1 ? encoder.s : -encoder.s);
		if (encoder.count > 1) writeVarUint(encoder.encoder, encoder.count - 2);
	}
};
/**
* Optimized Rle encoder that does not suffer from the mentioned problem of the basic Rle encoder.
*
* Internally uses VarInt encoder to write unsigned integers. If the input occurs multiple times, we write
* write it as a negative number. The UintOptRleDecoder then understands that it needs to read a count.
*
* Encodes [1,2,3,3,3] as [1,2,-3,3] (once 1, once 2, three times 3)
*/
var UintOptRleEncoder = class {
	constructor() {
		this.encoder = new Encoder();
		/**
		* @type {number}
		*/
		this.s = 0;
		this.count = 0;
	}
	/**
	* @param {number} v
	*/
	write(v) {
		if (this.s === v) this.count++;
		else {
			flushUintOptRleEncoder(this);
			this.count = 1;
			this.s = v;
		}
	}
	/**
	* Flush the encoded state and transform this to a Uint8Array.
	*
	* Note that this should only be called once.
	*/
	toUint8Array() {
		flushUintOptRleEncoder(this);
		return toUint8Array(this.encoder);
	}
};
/**
* @param {IntDiffOptRleEncoder} encoder
*/
const flushIntDiffOptRleEncoder = (encoder) => {
	if (encoder.count > 0) {
		const encodedDiff = encoder.diff * 2 + (encoder.count === 1 ? 0 : 1);
		writeVarInt(encoder.encoder, encodedDiff);
		if (encoder.count > 1) writeVarUint(encoder.encoder, encoder.count - 2);
	}
};
/**
* A combination of the IntDiffEncoder and the UintOptRleEncoder.
*
* The count approach is similar to the UintDiffOptRleEncoder, but instead of using the negative bitflag, it encodes
* in the LSB whether a count is to be read. Therefore this Encoder only supports 31 bit integers!
*
* Encodes [1, 2, 3, 2] as [3, 1, 6, -1] (more specifically [(1 << 1) | 1, (3 << 0) | 0, -1])
*
* Internally uses variable length encoding. Contrary to normal UintVar encoding, the first byte contains:
* * 1 bit that denotes whether the next value is a count (LSB)
* * 1 bit that denotes whether this value is negative (MSB - 1)
* * 1 bit that denotes whether to continue reading the variable length integer (MSB)
*
* Therefore, only five bits remain to encode diff ranges.
*
* Use this Encoder only when appropriate. In most cases, this is probably a bad idea.
*/
var IntDiffOptRleEncoder = class {
	constructor() {
		this.encoder = new Encoder();
		/**
		* @type {number}
		*/
		this.s = 0;
		this.count = 0;
		this.diff = 0;
	}
	/**
	* @param {number} v
	*/
	write(v) {
		if (this.diff === v - this.s) {
			this.s = v;
			this.count++;
		} else {
			flushIntDiffOptRleEncoder(this);
			this.count = 1;
			this.diff = v - this.s;
			this.s = v;
		}
	}
	/**
	* Flush the encoded state and transform this to a Uint8Array.
	*
	* Note that this should only be called once.
	*/
	toUint8Array() {
		flushIntDiffOptRleEncoder(this);
		return toUint8Array(this.encoder);
	}
};
/**
* Optimized String Encoder.
*
* Encoding many small strings in a simple Encoder is not very efficient. The function call to decode a string takes some time and creates references that must be eventually deleted.
* In practice, when decoding several million small strings, the GC will kick in more and more often to collect orphaned string objects (or maybe there is another reason?).
*
* This string encoder solves the above problem. All strings are concatenated and written as a single string using a single encoding call.
*
* The lengths are encoded using a UintOptRleEncoder.
*/
var StringEncoder = class {
	constructor() {
		/**
		* @type {Array<string>}
		*/
		this.sarr = [];
		this.s = "";
		this.lensE = new UintOptRleEncoder();
	}
	/**
	* @param {string} string
	*/
	write(string) {
		this.s += string;
		if (this.s.length > 19) {
			this.sarr.push(this.s);
			this.s = "";
		}
		this.lensE.write(string.length);
	}
	toUint8Array() {
		const encoder = new Encoder();
		this.sarr.push(this.s);
		this.s = "";
		writeVarString(encoder, this.sarr.join(""));
		writeUint8Array(encoder, this.lensE.toUint8Array());
		return toUint8Array(encoder);
	}
};
//#endregion
//#region node_modules/lib0/error.js
/**
* Error helpers.
*
* @module error
*/
/**
* @param {string} s
* @return {Error}
*/
/* c8 ignore next */
const create$3 = (s) => new Error(s);
/**
* @throws {Error}
* @return {never}
*/
/* c8 ignore next 3 */
const methodUnimplemented = () => {
	throw create$3("Method unimplemented");
};
/**
* @throws {Error}
* @return {never}
*/
/* c8 ignore next 3 */
const unexpectedCase = () => {
	throw create$3("Unexpected case");
};
//#endregion
//#region node_modules/lib0/decoding.js
/**
* Efficient schema-less binary decoding with support for variable length encoding.
*
* Use [lib0/decoding] with [lib0/encoding]. Every encoding function has a corresponding decoding function.
*
* Encodes numbers in little-endian order (least to most significant byte order)
* and is compatible with Golang's binary encoding (https://golang.org/pkg/encoding/binary/)
* which is also used in Protocol Buffers.
*
* ```js
* // encoding step
* const encoder = encoding.createEncoder()
* encoding.writeVarUint(encoder, 256)
* encoding.writeVarString(encoder, 'Hello world!')
* const buf = encoding.toUint8Array(encoder)
* ```
*
* ```js
* // decoding step
* const decoder = decoding.createDecoder(buf)
* decoding.readVarUint(decoder) // => 256
* decoding.readVarString(decoder) // => 'Hello world!'
* decoding.hasContent(decoder) // => false - all data is read
* ```
*
* @module decoding
*/
const errorUnexpectedEndOfArray = create$3("Unexpected end of array");
const errorIntegerOutOfRange = create$3("Integer out of Range");
/**
* A Decoder handles the decoding of an Uint8Array.
* @template {ArrayBufferLike} [Buf=ArrayBufferLike]
*/
var Decoder = class {
	/**
	* @param {Uint8Array<Buf>} uint8Array Binary data to decode
	*/
	constructor(uint8Array) {
		/**
		* Decoding target.
		*
		* @type {Uint8Array<Buf>}
		*/
		this.arr = uint8Array;
		/**
		* Current decoding position.
		*
		* @type {number}
		*/
		this.pos = 0;
	}
};
/**
* @function
* @template {ArrayBufferLike} Buf
* @param {Uint8Array<Buf>} uint8Array
* @return {Decoder<Buf>}
*/
const createDecoder = (uint8Array) => new Decoder(uint8Array);
/**
* @function
* @param {Decoder} decoder
* @return {boolean}
*/
const hasContent = (decoder) => decoder.pos !== decoder.arr.length;
/**
* Create an Uint8Array view of the next `len` bytes and advance the position by `len`.
*
* Important: The Uint8Array still points to the underlying ArrayBuffer. Make sure to discard the result as soon as possible to prevent any memory leaks.
*            Use `buffer.copyUint8Array` to copy the result into a new Uint8Array.
*
* @function
* @template {ArrayBufferLike} Buf
* @param {Decoder<Buf>} decoder The decoder instance
* @param {number} len The length of bytes to read
* @return {Uint8Array<Buf>}
*/
const readUint8Array = (decoder, len) => {
	const view = new Uint8Array(decoder.arr.buffer, decoder.pos + decoder.arr.byteOffset, len);
	decoder.pos += len;
	return view;
};
/**
* Read variable length Uint8Array.
*
* Important: The Uint8Array still points to the underlying ArrayBuffer. Make sure to discard the result as soon as possible to prevent any memory leaks.
*            Use `buffer.copyUint8Array` to copy the result into a new Uint8Array.
*
* @function
* @template {ArrayBufferLike} Buf
* @param {Decoder<Buf>} decoder
* @return {Uint8Array<Buf>}
*/
const readVarUint8Array = (decoder) => readUint8Array(decoder, readVarUint(decoder));
/**
* Read one byte as unsigned integer.
* @function
* @param {Decoder} decoder The decoder instance
* @return {number} Unsigned 8-bit integer
*/
const readUint8 = (decoder) => decoder.arr[decoder.pos++];
/**
* Read unsigned integer (32bit) with variable length.
* 1/8th of the storage is used as encoding overhead.
*  * numbers < 2^7 is stored in one bytlength
*  * numbers < 2^14 is stored in two bylength
*
* @function
* @param {Decoder} decoder
* @return {number} An unsigned integer.length
*/
const readVarUint = (decoder) => {
	let num = 0;
	let mult = 1;
	const len = decoder.arr.length;
	while (decoder.pos < len) {
		const r = decoder.arr[decoder.pos++];
		num = num + (r & 127) * mult;
		mult *= 128;
		if (r < 128) return num;
		/* c8 ignore start */
		if (num > MAX_SAFE_INTEGER) throw errorIntegerOutOfRange;
	}
	throw errorUnexpectedEndOfArray;
};
/**
* Read signed integer (32bit) with variable length.
* 1/8th of the storage is used as encoding overhead.
*  * numbers < 2^7 is stored in one bytlength
*  * numbers < 2^14 is stored in two bylength
* @todo This should probably create the inverse ~num if number is negative - but this would be a breaking change.
*
* @function
* @param {Decoder} decoder
* @return {number} An unsigned integer.length
*/
const readVarInt = (decoder) => {
	let r = decoder.arr[decoder.pos++];
	let num = r & 63;
	let mult = 64;
	const sign = (r & 64) > 0 ? -1 : 1;
	if ((r & 128) === 0) return sign * num;
	const len = decoder.arr.length;
	while (decoder.pos < len) {
		r = decoder.arr[decoder.pos++];
		num = num + (r & 127) * mult;
		mult *= 128;
		if (r < 128) return sign * num;
		/* c8 ignore start */
		if (num > MAX_SAFE_INTEGER) throw errorIntegerOutOfRange;
	}
	throw errorUnexpectedEndOfArray;
};
/**
* We don't test this function anymore as we use native decoding/encoding by default now.
* Better not modify this anymore..
*
* Transforming utf8 to a string is pretty expensive. The code performs 10x better
* when String.fromCodePoint is fed with all characters as arguments.
* But most environments have a maximum number of arguments per functions.
* For effiency reasons we apply a maximum of 10000 characters at once.
*
* @function
* @param {Decoder} decoder
* @return {String} The read String.
*/
/* c8 ignore start */
const _readVarStringPolyfill = (decoder) => {
	let remainingLen = readVarUint(decoder);
	if (remainingLen === 0) return "";
	else {
		let encodedString = String.fromCodePoint(readUint8(decoder));
		if (--remainingLen < 100) while (remainingLen--) encodedString += String.fromCodePoint(readUint8(decoder));
		else while (remainingLen > 0) {
			const nextLen = remainingLen < 1e4 ? remainingLen : 1e4;
			const bytes = decoder.arr.subarray(decoder.pos, decoder.pos + nextLen);
			decoder.pos += nextLen;
			encodedString += String.fromCodePoint.apply(null, bytes);
			remainingLen -= nextLen;
		}
		return decodeURIComponent(escape(encodedString));
	}
};
/* c8 ignore stop */
/**
* @function
* @param {Decoder} decoder
* @return {String} The read String
*/
const _readVarStringNative = (decoder) => utf8TextDecoder.decode(readVarUint8Array(decoder));
/**
* Read string of variable length
* * varUint is used to store the length of the string
*
* @function
* @param {Decoder} decoder
* @return {String} The read String
*
*/
/* c8 ignore next */
const readVarString = utf8TextDecoder ? _readVarStringNative : _readVarStringPolyfill;
/**
* @param {Decoder} decoder
* @param {number} len
* @return {DataView}
*/
const readFromDataView = (decoder, len) => {
	const dv = new DataView(decoder.arr.buffer, decoder.arr.byteOffset + decoder.pos, len);
	decoder.pos += len;
	return dv;
};
/**
* @param {Decoder} decoder
*/
const readFloat32 = (decoder) => readFromDataView(decoder, 4).getFloat32(0, false);
/**
* @param {Decoder} decoder
*/
const readFloat64 = (decoder) => readFromDataView(decoder, 8).getFloat64(0, false);
/**
* @param {Decoder} decoder
*/
const readBigInt64 = (decoder) => readFromDataView(decoder, 8).getBigInt64(0, false);
/**
* @type {Array<function(Decoder):any>}
*/
const readAnyLookupTable = [
	(decoder) => void 0,
	(decoder) => null,
	readVarInt,
	readFloat32,
	readFloat64,
	readBigInt64,
	(decoder) => false,
	(decoder) => true,
	readVarString,
	(decoder) => {
		const len = readVarUint(decoder);
		/**
		* @type {Object<string,any>}
		*/
		const obj = {};
		for (let i = 0; i < len; i++) {
			const key = readVarString(decoder);
			obj[key] = readAny(decoder);
		}
		return obj;
	},
	(decoder) => {
		const len = readVarUint(decoder);
		const arr = [];
		for (let i = 0; i < len; i++) arr.push(readAny(decoder));
		return arr;
	},
	readVarUint8Array
];
/**
* @param {Decoder} decoder
*/
const readAny = (decoder) => readAnyLookupTable[127 - readUint8(decoder)](decoder);
/**
* T must not be null.
*
* @template T
*/
var RleDecoder = class extends Decoder {
	/**
	* @param {Uint8Array} uint8Array
	* @param {function(Decoder):T} reader
	*/
	constructor(uint8Array, reader) {
		super(uint8Array);
		/**
		* The reader
		*/
		this.reader = reader;
		/**
		* Current state
		* @type {T|null}
		*/
		this.s = null;
		this.count = 0;
	}
	read() {
		if (this.count === 0) {
			this.s = this.reader(this);
			if (hasContent(this)) this.count = readVarUint(this) + 1;
			else this.count = -1;
		}
		this.count--;
		return this.s;
	}
};
var UintOptRleDecoder = class extends Decoder {
	/**
	* @param {Uint8Array} uint8Array
	*/
	constructor(uint8Array) {
		super(uint8Array);
		/**
		* @type {number}
		*/
		this.s = 0;
		this.count = 0;
	}
	read() {
		if (this.count === 0) {
			this.s = readVarInt(this);
			const isNegative = isNegativeZero(this.s);
			this.count = 1;
			if (isNegative) {
				this.s = -this.s;
				this.count = readVarUint(this) + 2;
			}
		}
		this.count--;
		return this.s;
	}
};
var IntDiffOptRleDecoder = class extends Decoder {
	/**
	* @param {Uint8Array} uint8Array
	*/
	constructor(uint8Array) {
		super(uint8Array);
		/**
		* @type {number}
		*/
		this.s = 0;
		this.count = 0;
		this.diff = 0;
	}
	/**
	* @return {number}
	*/
	read() {
		if (this.count === 0) {
			const diff = readVarInt(this);
			const hasCount = diff & 1;
			this.diff = floor(diff / 2);
			this.count = 1;
			if (hasCount) this.count = readVarUint(this) + 2;
		}
		this.s += this.diff;
		this.count--;
		return this.s;
	}
};
var StringDecoder = class {
	/**
	* @param {Uint8Array} uint8Array
	*/
	constructor(uint8Array) {
		this.decoder = new UintOptRleDecoder(uint8Array);
		this.str = readVarString(this.decoder);
		/**
		* @type {number}
		*/
		this.spos = 0;
	}
	/**
	* @return {string}
	*/
	read() {
		const end = this.spos + this.decoder.read();
		const res = this.str.slice(this.spos, end);
		this.spos = end;
		return res;
	}
};
//#endregion
//#region node_modules/lib0/webcrypto.js
const subtle = crypto.subtle;
const getRandomValues = crypto.getRandomValues.bind(crypto);
//#endregion
//#region node_modules/lib0/random.js
const uint32 = () => getRandomValues(/* @__PURE__ */ new Uint32Array(1))[0];
const uuidv4Template = "10000000-1000-4000-8000-100000000000";
/**
* @return {string}
*/
const uuidv4 = () => uuidv4Template.replace(
	/[018]/g,
	/** @param {number} c */
	(c) => (c ^ uint32() & 15 >> c / 4).toString(16)
);
//#endregion
//#region node_modules/lib0/time.js
/**
* Return current unix time.
*
* @return {number}
*/
const getUnixTime = Date.now;
//#endregion
//#region node_modules/lib0/promise.js
/**
* @template T
* @callback PromiseResolve
* @param {T|PromiseLike<T>} [result]
*/
/**
* @template T
* @param {function(PromiseResolve<T>,function(Error):void):any} f
* @return {Promise<T>}
*/
const create$2 = (f) => new Promise(f);
/**
* `Promise.all` wait for all promises in the array to resolve and return the result
* @template {unknown[] | []} PS
*
* @param {PS} ps
* @return {Promise<{ -readonly [P in keyof PS]: Awaited<PS[P]> }>}
*/
const all = Promise.all.bind(Promise);
//#endregion
//#region node_modules/lib0/conditions.js
/**
* Often used conditions.
*
* @module conditions
*/
/**
* @template T
* @param {T|null|undefined} v
* @return {T|null}
*/
/* c8 ignore next */
const undefinedToNull = (v) => v === void 0 ? null : v;
//#endregion
//#region node_modules/lib0/storage.js
/**
* Isomorphic variable storage.
*
* Uses LocalStorage in the browser and falls back to in-memory storage.
*
* @module storage
*/
/* c8 ignore start */
var VarStoragePolyfill = class {
	constructor() {
		this.map = /* @__PURE__ */ new Map();
	}
	/**
	* @param {string} key
	* @param {any} newValue
	*/
	setItem(key, newValue) {
		this.map.set(key, newValue);
	}
	/**
	* @param {string} key
	*/
	getItem(key) {
		return this.map.get(key);
	}
};
/* c8 ignore stop */
/**
* @type {any}
*/
let _localStorage = new VarStoragePolyfill();
let usePolyfill = true;
/* c8 ignore start */
try {
	if (typeof localStorage !== "undefined" && localStorage) _localStorage = localStorage;
} catch (e) {}
/* c8 ignore stop */
/**
* This is basically localStorage in browser, or a polyfill in nodejs
*/
/* c8 ignore next */
const varStorage = _localStorage;
//#endregion
//#region node_modules/lib0/trait/equality.js
const EqualityTraitSymbol = Symbol("Equality");
/**
* @typedef {{ [EqualityTraitSymbol]:(other:EqualityTrait)=>boolean }} EqualityTrait
*/
/**
*
* Utility function to compare any two objects.
*
* Note that it is expected that the first parameter is more specific than the latter one.
*
* @example js
*     class X { [traits.EqualityTraitSymbol] (other) { return other === this }  }
*     class X2 { [traits.EqualityTraitSymbol] (other) { return other === this }, x2 () { return 2 }  }
*     // this is fine
*     traits.equals(new X2(), new X())
*     // this is not, because the left type is less specific than the right one
*     traits.equals(new X(), new X2())
*
* @template {EqualityTrait} T
* @param {NoInfer<T>} a
* @param {T} b
* @return {boolean}
*/
const equals = (a, b) => a === b || !!a?.[EqualityTraitSymbol]?.(b) || false;
//#endregion
//#region node_modules/lib0/object.js
/**
* @param {any} o
* @return {o is { [k:string]:any }}
*/
const isObject = (o) => typeof o === "object";
/**
* Object.assign
*/
const assign = Object.assign;
/**
* @param {Object<string,any>} obj
*/
const keys = Object.keys;
/**
* @template V
* @param {{[k:string]:V}} obj
* @param {function(V,string):any} f
*/
const forEach = (obj, f) => {
	for (const key in obj) f(obj[key], key);
};
/**
* @param {Object<string,any>} obj
* @return {number}
*/
const size = (obj) => keys(obj).length;
/**
* @param {Object|null|undefined} obj
*/
const isEmpty = (obj) => {
	for (const _k in obj) return false;
	return true;
};
/**
* @template {{ [key:string|number|symbol]: any }} T
* @param {T} obj
* @param {(v:T[keyof T],k:keyof T)=>boolean} f
* @return {boolean}
*/
const every = (obj, f) => {
	for (const key in obj) if (!f(obj[key], key)) return false;
	return true;
};
/**
* Calls `Object.prototype.hasOwnProperty`.
*
* @param {any} obj
* @param {string|number|symbol} key
* @return {boolean}
*/
const hasProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
/**
* @param {Object<string,any>} a
* @param {Object<string,any>} b
* @return {boolean}
*/
const equalFlat = (a, b) => a === b || size(a) === size(b) && every(a, (val, key) => (val !== void 0 || hasProperty(b, key)) && equals(b[key], val));
/**
* Make an object immutable. This hurts performance and is usually not needed if you perform good
* coding practices.
*/
const freeze = Object.freeze;
/**
* Make an object and all its children immutable.
* This *really* hurts performance and is usually not needed if you perform good coding practices.
*
* @template {any} T
* @param {T} o
* @return {Readonly<T>}
*/
const deepFreeze = (o) => {
	for (const key in o) {
		const c = o[key];
		if (typeof c === "object" || typeof c === "function") deepFreeze(o[key]);
	}
	return freeze(o);
};
//#endregion
//#region node_modules/lib0/function.js
/**
* Calls all functions in `fs` with args. Only throws after all functions were called.
*
* @param {Array<function>} fs
* @param {Array<any>} args
*/
const callAll = (fs, args, i = 0) => {
	try {
		for (; i < fs.length; i++) fs[i](...args);
	} finally {
		if (i < fs.length) callAll(fs, args, i + 1);
	}
};
/**
* @template A
*
* @param {A} a
* @return {A}
*/
const id = (a) => a;
/* c8 ignore start */
/**
* @param {any} a
* @param {any} b
* @return {boolean}
*/
const equalityDeep = (a, b) => {
	if (a === b) return true;
	if (a == null || b == null || a.constructor !== b.constructor && (a.constructor || Object) !== (b.constructor || Object)) return false;
	if (a[EqualityTraitSymbol] != null) return a[EqualityTraitSymbol](b);
	switch (a.constructor) {
		case ArrayBuffer:
			a = new Uint8Array(a);
			b = new Uint8Array(b);
		case Uint8Array:
			if (a.byteLength !== b.byteLength) return false;
			for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
			break;
		case Set:
			if (a.size !== b.size) return false;
			for (const value of a) if (!b.has(value)) return false;
			break;
		case Map:
			if (a.size !== b.size) return false;
			for (const key of a.keys()) if (!b.has(key) || !equalityDeep(a.get(key), b.get(key))) return false;
			break;
		case void 0:
		case Object:
			if (size(a) !== size(b)) return false;
			for (const key in a) if (!hasProperty(a, key) || !equalityDeep(a[key], b[key])) return false;
			break;
		case Array:
			if (a.length !== b.length) return false;
			for (let i = 0; i < a.length; i++) if (!equalityDeep(a[i], b[i])) return false;
			break;
		default: return false;
	}
	return true;
};
/**
* @template V
* @template {V} OPTS
*
* @param {V} value
* @param {Array<OPTS>} options
*/
const isOneOf = (value, options) => options.includes(value);
//#endregion
//#region node_modules/lib0/environment.js
/**
* Isomorphic module to work access the environment (query params, env variables).
*
* @module environment
*/
/* c8 ignore next 2 */
const isNode = typeof process !== "undefined" && process.release && /node|io\.js/.test(process.release.name) && Object.prototype.toString.call(typeof process !== "undefined" ? process : 0) === "[object process]";
/* c8 ignore next */
const isBrowser = typeof window !== "undefined" && typeof document !== "undefined" && !isNode;
/* c8 ignore next 3 */
const isMac = typeof navigator !== "undefined" ? /Mac/.test(navigator.platform) : false;
/**
* @type {Map<string,string>}
*/
let params;
const args = [];
/* c8 ignore start */
const computeParams = () => {
	if (params === void 0) if (isNode) {
		params = create$5();
		const pargs = process.argv;
		let currParamName = null;
		for (let i = 0; i < pargs.length; i++) {
			const parg = pargs[i];
			if (parg[0] === "-") {
				if (currParamName !== null) params.set(currParamName, "");
				currParamName = parg;
			} else if (currParamName !== null) {
				params.set(currParamName, parg);
				currParamName = null;
			} else args.push(parg);
		}
		if (currParamName !== null) params.set(currParamName, "");
	} else if (typeof location === "object") {
		params = create$5();
		(location.search || "?").slice(1).split("&").forEach((kv) => {
			if (kv.length !== 0) {
				const [key, value] = kv.split("=");
				params.set(`--${fromCamelCase(key, "-")}`, value);
				params.set(`-${fromCamelCase(key, "-")}`, value);
			}
		});
	} else params = create$5();
	return params;
};
/* c8 ignore stop */
/**
* @param {string} name
* @return {boolean}
*/
/* c8 ignore next */
const hasParam = (name) => computeParams().has(name);
/**
* @param {string} name
* @return {string|null}
*/
/* c8 ignore next 4 */
const getVariable = (name) => isNode ? undefinedToNull(process.env[name.toUpperCase().replaceAll("-", "_")]) : undefinedToNull(varStorage.getItem(name));
/**
* @param {string} name
* @return {boolean}
*/
/* c8 ignore next 2 */
const hasConf = (name) => hasParam("--" + name) || getVariable(name) !== null;
/* c8 ignore next */
const production = hasConf("production");
/* c8 ignore next 2 */
const forceColor = isNode && isOneOf(process.env.FORCE_COLOR, [
	"true",
	"1",
	"2"
]);
/* c8 ignore start */
/**
* Color is enabled by default if the terminal supports it.
*
* Explicitly enable color using `--color` parameter
* Disable color using `--no-color` parameter or using `NO_COLOR=1` environment variable.
* `FORCE_COLOR=1` enables color and takes precedence over all.
*/
const supportsColor = forceColor || !hasParam("--no-colors") && !hasConf("no-color") && (!isNode || process.stdout.isTTY) && (!isNode || hasParam("--color") || getVariable("COLORTERM") !== null || (getVariable("TERM") || "").includes("color"));
/* c8 ignore stop */
//#endregion
//#region node_modules/lib0/buffer.js
/**
* Utility functions to work with buffers (Uint8Array).
*
* @module buffer
*/
/**
* @param {number} len
*/
const createUint8ArrayFromLen = (len) => new Uint8Array(len);
/**
* Create Uint8Array with initial content from buffer
*
* @param {ArrayBuffer} buffer
* @param {number} byteOffset
* @param {number} length
*/
const createUint8ArrayViewFromArrayBuffer = (buffer, byteOffset, length) => new Uint8Array(buffer, byteOffset, length);
/* c8 ignore start */
/**
* @param {Uint8Array} bytes
* @return {string}
*/
const toBase64Browser = (bytes) => {
	let s = "";
	for (let i = 0; i < bytes.byteLength; i++) s += fromCharCode(bytes[i]);
	return btoa(s);
};
/* c8 ignore stop */
/**
* @param {Uint8Array} bytes
* @return {string}
*/
const toBase64Node = (bytes) => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("base64");
/* c8 ignore start */
/**
* @param {string} s
* @return {Uint8Array<ArrayBuffer>}
*/
const fromBase64Browser = (s) => {
	const a = atob(s);
	const bytes = createUint8ArrayFromLen(a.length);
	for (let i = 0; i < a.length; i++) bytes[i] = a.charCodeAt(i);
	return bytes;
};
/* c8 ignore stop */
/**
* @param {string} s
*/
const fromBase64Node = (s) => {
	const buf = Buffer.from(s, "base64");
	return createUint8ArrayViewFromArrayBuffer(buf.buffer, buf.byteOffset, buf.byteLength);
};
/* c8 ignore next */
const toBase64 = isBrowser ? toBase64Browser : toBase64Node;
/* c8 ignore next */
const fromBase64 = isBrowser ? fromBase64Browser : fromBase64Node;
/**
* Copy the content of an Uint8Array view to a new ArrayBuffer.
*
* @param {Uint8Array} uint8Array
* @return {Uint8Array}
*/
const copyUint8Array = (uint8Array) => {
	const newBuf = createUint8ArrayFromLen(uint8Array.byteLength);
	newBuf.set(uint8Array);
	return newBuf;
};
//#endregion
//#region node_modules/lib0/pair.js
/**
* Working with value pairs.
*
* @module pair
*/
/**
* @template L,R
*/
var Pair = class {
	/**
	* @param {L} left
	* @param {R} right
	*/
	constructor(left, right) {
		this.left = left;
		this.right = right;
	}
};
/**
* @template L,R
* @param {L} left
* @param {R} right
* @return {Pair<L,R>}
*/
const create$1 = (left, right) => new Pair(left, right);
//#endregion
//#region node_modules/lib0/prng.js
/**
* Generates a single random bool.
*
* @param {PRNG} gen A random number generator.
* @return {Boolean} A random boolean
*/
const bool = (gen) => gen.next() >= .5;
/**
* Generates a random integer with 53 bit resolution.
*
* @param {PRNG} gen A random number generator.
* @param {Number} min The lower bound of the allowed return values (inclusive).
* @param {Number} max The upper bound of the allowed return values (inclusive).
* @return {Number} A random integer on [min, max]
*/
const int53 = (gen, min, max) => floor(gen.next() * (max + 1 - min) + min);
/**
* Generates a random integer with 32 bit resolution.
*
* @param {PRNG} gen A random number generator.
* @param {Number} min The lower bound of the allowed return values (inclusive).
* @param {Number} max The upper bound of the allowed return values (inclusive).
* @return {Number} A random integer on [min, max]
*/
const int32 = (gen, min, max) => floor(gen.next() * (max + 1 - min) + min);
/**
* @deprecated
* Optimized version of prng.int32. It has the same precision as prng.int32, but should be preferred when
* openaring on smaller ranges.
*
* @param {PRNG} gen A random number generator.
* @param {Number} min The lower bound of the allowed return values (inclusive).
* @param {Number} max The upper bound of the allowed return values (inclusive). The max inclusive number is `binary.BITS31-1`
* @return {Number} A random integer on [min, max]
*/
const int31 = (gen, min, max) => int32(gen, min, max);
/**
* @param {PRNG} gen
* @return {string} A single letter (a-z)
*/
const letter = (gen) => fromCharCode(int31(gen, 97, 122));
/**
* @param {PRNG} gen
* @param {number} [minLen=0]
* @param {number} [maxLen=20]
* @return {string} A random word (0-20 characters) without spaces consisting of letters (a-z)
*/
const word = (gen, minLen = 0, maxLen = 20) => {
	const len = int31(gen, minLen, maxLen);
	let str = "";
	for (let i = 0; i < len; i++) str += letter(gen);
	return str;
};
/**
* Returns one element of a given array.
*
* @param {PRNG} gen A random number generator.
* @param {Array<T>} array Non empty Array of possible values.
* @return {T} One of the values of the supplied Array.
* @template T
*/
const oneOf = (gen, array) => array[int31(gen, 0, array.length - 1)];
/* c8 ignore stop */
//#endregion
//#region node_modules/lib0/schema.js
/**
* @experimental WIP
*
* Simple & efficient schemas for your data.
*/
/**
* @typedef {string|number|bigint|boolean|null|undefined|symbol} Primitive
*/
/**
* @typedef {{ [k:string|number|symbol]: any }} AnyObject
*/
/**
* @template T
* @typedef {T extends Schema<infer X> ? X : T} Unwrap
*/
/**
* @template T
* @typedef {T extends Schema<infer X> ? X : T} TypeOf
*/
/**
* @template {readonly unknown[]} T
* @typedef {T extends readonly [Schema<infer First>, ...infer Rest] ? [First, ...UnwrapArray<Rest>] : [] } UnwrapArray
*/
/**
* @template T
* @typedef {T extends Schema<infer S> ? Schema<S> : never} CastToSchema
*/
/**
* @template {unknown[]} Arr
* @typedef {Arr extends [...unknown[], infer L] ? L : never} TupleLast
*/
/**
* @template {unknown[]} Arr
* @typedef {Arr extends [...infer Fs, unknown] ? Fs : never} TuplePop
*/
/**
* @template {readonly unknown[]} T
* @typedef {T extends []
*   ? {}
*   : T extends [infer First]
*   ? First
*   : T extends [infer First, ...infer Rest]
*   ? First & Intersect<Rest>
*   : never
* } Intersect
*/
const schemaSymbol = Symbol("0schema");
var ValidationError = class {
	constructor() {
		/**
		* Reverse errors
		* @type {Array<{ path: string?, expected: string, has: string, message: string? }>}
		*/
		this._rerrs = [];
	}
	/**
	* @param {string?} path
	* @param {string} expected
	* @param {string} has
	* @param {string?} message
	*/
	extend(path, expected, has, message = null) {
		this._rerrs.push({
			path,
			expected,
			has,
			message
		});
	}
	toString() {
		const s = [];
		for (let i = this._rerrs.length - 1; i > 0; i--) {
			const r = this._rerrs[i];
			/* c8 ignore next */
			s.push(repeat(" ", (this._rerrs.length - i) * 2) + `${r.path != null ? `[${r.path}] ` : ""}${r.has} doesn't match ${r.expected}. ${r.message}`);
		}
		return s.join("\n");
	}
};
/**
* @param {any} a
* @param {any} b
* @return {boolean}
*/
const shapeExtends = (a, b) => {
	if (a === b) return true;
	if (a == null || b == null || a.constructor !== b.constructor) return false;
	if (a[EqualityTraitSymbol]) return equals(a, b);
	if (isArray(a)) return every$1(a, (aitem) => some(b, (bitem) => shapeExtends(aitem, bitem)));
	else if (isObject(a)) return every(a, (aitem, akey) => shapeExtends(aitem, b[akey]));
	/* c8 ignore next */
	return false;
};
/**
* @template T
* @implements {equalityTraits.EqualityTrait}
*/
var Schema = class {
	/**
	* If true, the more things are added to the shape the more objects this schema will accept (e.g.
	* union). By default, the more objects are added, the the fewer objects this schema will accept.
	* @protected
	*/
	static _dilutes = false;
	/**
	* @param {Schema<any>} other
	*/
	extends(other) {
		let [a, b] = [this.shape, other.shape];
		if (this.constructor._dilutes) [b, a] = [a, b];
		return shapeExtends(a, b);
	}
	/**
	* Overwrite this when necessary. By default, we only check the `shape` property which every shape
	* should have.
	* @param {Schema<any>} other
	*/
	equals(other) {
		return this.constructor === other.constructor && equalityDeep(this.shape, other.shape);
	}
	[schemaSymbol]() {
		return true;
	}
	/**
	* @param {object} other
	*/
	[EqualityTraitSymbol](other) {
		return this.equals(other);
	}
	/**
	* Use `schema.validate(obj)` with a typed parameter that is already of typed to be an instance of
	* Schema. Validate will check the structure of the parameter and return true iff the instance
	* really is an instance of Schema.
	*
	* @param {T} o
	* @return {boolean}
	*/
	validate(o) {
		return this.check(o);
	}
	/* c8 ignore start */
	/**
	* Similar to validate, but this method accepts untyped parameters.
	*
	* @param {any} _o
	* @param {ValidationError} [_err]
	* @return {_o is T}
	*/
	check(_o, _err) {
		methodUnimplemented();
	}
	/* c8 ignore stop */
	/**
	* @type {Schema<T?>}
	*/
	get nullable() {
		return $union(this, $null);
	}
	/**
	* @type {$Optional<Schema<T>>}
	*/
	get optional() {
		return new $Optional(this);
	}
	/**
	* Cast a variable to a specific type. Returns the casted value, or throws an exception otherwise.
	* Use this if you know that the type is of a specific type and you just want to convince the type
	* system.
	*
	* **Do not rely on these error messages!**
	* Performs an assertion check only if not in a production environment.
	*
	* @template OO
	* @param {OO} o
	* @return {Extract<OO, T> extends never ? T : (OO extends Array<never> ? T : Extract<OO,T>)}
	*/
	cast(o) {
		assert(o, this);
		return o;
	}
	/**
	* EXPECTO PATRONUM!! 🪄
	* This function protects against type errors. Though it may not work in the real world.
	*
	* "After all this time?"
	* "Always." - Snape, talking about type safety
	*
	* Ensures that a variable is a a specific type. Returns the value, or throws an exception if the assertion check failed.
	* Use this if you know that the type is of a specific type and you just want to convince the type
	* system.
	*
	* Can be useful when defining lambdas: `s.lambda(s.$number, s.$void).expect((n) => n + 1)`
	*
	* **Do not rely on these error messages!**
	* Performs an assertion check if not in a production environment.
	*
	* @param {T} o
	* @return {o extends T ? T : never}
	*/
	expect(o) {
		assert(o, this);
		return o;
	}
};
/**
* @template {(new (...args:any[]) => any) | ((...args:any[]) => any)} Constr
* @typedef {Constr extends ((...args:any[]) => infer T) ? T : (Constr extends (new (...args:any[]) => any) ? InstanceType<Constr> : never)} Instance
*/
/**
* @template {(new (...args:any[]) => any) | ((...args:any[]) => any)} C
* @extends {Schema<Instance<C>>}
*/
var $ConstructedBy = class extends Schema {
	/**
	* @param {C} c
	* @param {((o:Instance<C>)=>boolean)|null} check
	*/
	constructor(c, check) {
		super();
		this.shape = c;
		this._c = check;
	}
	/**
	* @param {any} o
	* @param {ValidationError} [err]
	* @return {o is C extends ((...args:any[]) => infer T) ? T : (C extends (new (...args:any[]) => any) ? InstanceType<C> : never)} o
	*/
	check(o, err = void 0) {
		const c = o?.constructor === this.shape && (this._c == null || this._c(o));
		/* c8 ignore next */
		!c && err?.extend(null, this.shape.name, o?.constructor.name, o?.constructor !== this.shape ? "Constructor match failed" : "Check failed");
		return c;
	}
};
/**
* @template {(new (...args:any[]) => any) | ((...args:any[]) => any)} C
* @param {C} c
* @param {((o:Instance<C>) => boolean)|null} check
* @return {CastToSchema<$ConstructedBy<C>>}
*/
const $constructedBy = (c, check = null) => new $ConstructedBy(c, check);
const $$constructedBy = $constructedBy($ConstructedBy);
/**
* Check custom properties on any object. You may want to overwrite the generated Schema<any>.
*
* @extends {Schema<any>}
*/
var $Custom = class extends Schema {
	/**
	* @param {(o:any) => boolean} check
	*/
	constructor(check) {
		super();
		/**
		* @type {(o:any) => boolean}
		*/
		this.shape = check;
	}
	/**
	* @param {any} o
	* @param {ValidationError} err
	* @return {o is any}
	*/
	check(o, err) {
		const c = this.shape(o);
		/* c8 ignore next */
		!c && err?.extend(null, "custom prop", o?.constructor.name, "failed to check custom prop");
		return c;
	}
};
/**
* @param {(o:any) => boolean} check
* @return {Schema<any>}
*/
const $custom = (check) => new $Custom(check);
const $$custom = $constructedBy($Custom);
/**
* @template {Primitive} T
* @extends {Schema<T>}
*/
var $Literal = class extends Schema {
	/**
	* @param {Array<T>} literals
	*/
	constructor(literals) {
		super();
		this.shape = literals;
	}
	/**
	*
	* @param {any} o
	* @param {ValidationError} [err]
	* @return {o is T}
	*/
	check(o, err) {
		const c = this.shape.some((a) => a === o);
		/* c8 ignore next */
		!c && err?.extend(null, this.shape.join(" | "), o.toString());
		return c;
	}
};
/**
* @template {Primitive[]} T
* @param {T} literals
* @return {CastToSchema<$Literal<T[number]>>}
*/
const $literal = (...literals) => new $Literal(literals);
const $$literal = $constructedBy($Literal);
/**
* @template {Array<string|Schema<string|number>>} Ts
* @typedef {Ts extends [] ? `` : (Ts extends [infer T] ? (Unwrap<T> extends (string|number) ? Unwrap<T> : never) : (Ts extends [infer T1, ...infer Rest] ? `${Unwrap<T1> extends (string|number) ? Unwrap<T1> : never}${Rest extends Array<string|Schema<string|number>> ? CastStringTemplateArgsToTemplate<Rest> : never}` : never))} CastStringTemplateArgsToTemplate
*/
/**
* @param {string} str
* @return {string}
*/
const _regexEscape = RegExp.escape || ((str) => str.replace(/[().|&,$^[\]]/g, (s) => "\\" + s));
/**
* @param {string|Schema<any>} s
* @return {string[]}
*/
const _schemaStringTemplateToRegex = (s) => {
	if ($string.check(s)) return [_regexEscape(s)];
	if ($$literal.check(s)) return s.shape.map((v) => v + "");
	if ($$number.check(s)) return ["[+-]?\\d+.?\\d*"];
	if ($$string.check(s)) return [".*"];
	if ($$union.check(s)) return s.shape.map(_schemaStringTemplateToRegex).flat(1);
	/* c8 ignore next 2 */
	unexpectedCase();
};
/**
* @template {Array<string|Schema<string|number>>} T
* @extends {Schema<CastStringTemplateArgsToTemplate<T>>}
*/
var $StringTemplate = class extends Schema {
	/**
	* @param {T} shape
	*/
	constructor(shape) {
		super();
		this.shape = shape;
		this._r = new RegExp("^" + shape.map(_schemaStringTemplateToRegex).map((opts) => `(${opts.join("|")})`).join("") + "$");
	}
	/**
	* @param {any} o
	* @param {ValidationError} [err]
	* @return {o is CastStringTemplateArgsToTemplate<T>}
	*/
	check(o, err) {
		const c = this._r.exec(o) != null;
		/* c8 ignore next */
		!c && err?.extend(null, this._r.toString(), o.toString(), "String doesn't match string template.");
		return c;
	}
};
const $$stringTemplate = $constructedBy($StringTemplate);
const isOptionalSymbol = Symbol("optional");
/**
* @template {Schema<any>} S
* @extends Schema<Unwrap<S>|undefined>
*/
var $Optional = class extends Schema {
	/**
	* @param {S} shape
	*/
	constructor(shape) {
		super();
		this.shape = shape;
	}
	/**
	* @param {any} o
	* @param {ValidationError} [err]
	* @return {o is (Unwrap<S>|undefined)}
	*/
	check(o, err) {
		const c = o === void 0 || this.shape.check(o);
		/* c8 ignore next */
		!c && err?.extend(null, "undefined (optional)", "()");
		return c;
	}
	get [isOptionalSymbol]() {
		return true;
	}
};
const $$optional = $constructedBy($Optional);
/**
* @extends Schema<never>
*/
var $Never = class extends Schema {
	/**
	* @param {any} _o
	* @param {ValidationError} [err]
	* @return {_o is never}
	*/
	check(_o, err) {
		/* c8 ignore next */
		err?.extend(null, "never", typeof _o);
		return false;
	}
};
/**
* @type {Schema<never>}
*/
const $never = new $Never();
const $$never = $constructedBy($Never);
/**
* @template {{ [key: string|symbol|number]: Schema<any> }} S
* @typedef {{ [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? Key : never]?: S[Key] extends $Optional<Schema<infer Type>> ? Type : never } & { [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? never : Key]: S[Key] extends Schema<infer Type> ? Type : never }} $ObjectToType
*/
/**
* @template {{[key:string|symbol|number]: Schema<any>}} S
* @extends {Schema<$ObjectToType<S>>}
*/
var $Object = class $Object extends Schema {
	/**
	* @param {S} shape
	* @param {boolean} partial
	*/
	constructor(shape, partial = false) {
		super();
		/**
		* @type {S}
		*/
		this.shape = shape;
		this._isPartial = partial;
	}
	static _dilutes = true;
	/**
	* @type {Schema<Partial<$ObjectToType<S>>>}
	*/
	get partial() {
		return new $Object(this.shape, true);
	}
	/**
	* @param {any} o
	* @param {ValidationError} err
	* @return {o is $ObjectToType<S>}
	*/
	check(o, err) {
		if (o == null) {
			/* c8 ignore next */
			err?.extend(null, "object", "null");
			return false;
		}
		return every(this.shape, (vv, vk) => {
			const c = this._isPartial && !hasProperty(o, vk) || vv.check(o[vk], err);
			!c && err?.extend(vk.toString(), vv.toString(), typeof o[vk], "Object property does not match");
			return c;
		});
	}
};
/**
* @template S
* @typedef {Schema<{ [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? Key : never]?: S[Key] extends $Optional<Schema<infer Type>> ? Type : never } & { [Key in keyof S as S[Key] extends $Optional<Schema<any>> ? never : Key]: S[Key] extends Schema<infer Type> ? Type : never }>} _ObjectDefToSchema
*/
/**
* @template {{ [key:string|symbol|number]: Schema<any> }} S
* @param {S} def
* @return {_ObjectDefToSchema<S> extends Schema<infer S> ? Schema<{ [K in keyof S]: S[K] }> : never}
*/
const $object = (def) => new $Object(def);
const $$object = $constructedBy($Object);
/**
* @type {Schema<{[key:string]: any}>}
*/
const $objectAny = $custom((o) => o != null && (o.constructor === Object || o.constructor == null));
/**
* @template {Schema<string|number|symbol>} Keys
* @template {Schema<any>} Values
* @extends {Schema<{ [key in Unwrap<Keys>]: Unwrap<Values> }>}
*/
var $Record = class extends Schema {
	/**
	* @param {Keys} keys
	* @param {Values} values
	*/
	constructor(keys, values) {
		super();
		this.shape = {
			keys,
			values
		};
	}
	/**
	* @param {any} o
	* @param {ValidationError} err
	* @return {o is { [key in Unwrap<Keys>]: Unwrap<Values> }}
	*/
	check(o, err) {
		return o != null && every(o, (vv, vk) => {
			const ck = this.shape.keys.check(vk, err);
			/* c8 ignore next */
			!ck && err?.extend(vk + "", "Record", typeof o, ck ? "Key doesn't match schema" : "Value doesn't match value");
			return ck && this.shape.values.check(vv, err);
		});
	}
};
/**
* @template {Schema<string|number|symbol>} Keys
* @template {Schema<any>} Values
* @param {Keys} keys
* @param {Values} values
* @return {CastToSchema<$Record<Keys,Values>>}
*/
const $record = (keys, values) => new $Record(keys, values);
const $$record = $constructedBy($Record);
/**
* @template {Schema<any>[]} S
* @extends {Schema<{ [Key in keyof S]: S[Key] extends Schema<infer Type> ? Type : never }>}
*/
var $Tuple = class extends Schema {
	/**
	* @param {S} shape
	*/
	constructor(shape) {
		super();
		this.shape = shape;
	}
	/**
	* @param {any} o
	* @param {ValidationError} err
	* @return {o is { [K in keyof S]: S[K] extends Schema<infer Type> ? Type : never }}
	*/
	check(o, err) {
		return o != null && every(this.shape, (vv, vk) => {
			const c = vv.check(o[vk], err);
			/* c8 ignore next */
			!c && err?.extend(vk.toString(), "Tuple", typeof vv);
			return c;
		});
	}
};
/**
* @template {Array<Schema<any>>} T
* @param {T} def
* @return {CastToSchema<$Tuple<T>>}
*/
const $tuple = (...def) => new $Tuple(def);
const $$tuple = $constructedBy($Tuple);
/**
* @template {Schema<any>} S
* @extends {Schema<Array<S extends Schema<infer T> ? T : never>>}
*/
var $Array = class extends Schema {
	/**
	* @param {Array<S>} v
	*/
	constructor(v) {
		super();
		/**
		* @type {Schema<S extends Schema<infer T> ? T : never>}
		*/
		this.shape = v.length === 1 ? v[0] : new $Union(v);
	}
	/**
	* @param {any} o
	* @param {ValidationError} [err]
	* @return {o is Array<S extends Schema<infer T> ? T : never>} o
	*/
	check(o, err) {
		const c = isArray(o) && every$1(o, (oi) => this.shape.check(oi));
		/* c8 ignore next */
		!c && err?.extend(null, "Array", "");
		return c;
	}
};
/**
* @template {Array<Schema<any>>} T
* @param {T} def
* @return {Schema<Array<T extends Array<Schema<infer S>> ? S : never>>}
*/
const $array = (...def) => new $Array(def);
const $$array = $constructedBy($Array);
/**
* @type {Schema<Array<any>>}
*/
const $arrayAny = $custom((o) => isArray(o));
/**
* @template T
* @extends {Schema<T>}
*/
var $InstanceOf = class extends Schema {
	/**
	* @param {new (...args:any) => T} constructor
	* @param {((o:T) => boolean)|null} check
	*/
	constructor(constructor, check) {
		super();
		this.shape = constructor;
		this._c = check;
	}
	/**
	* @param {any} o
	* @param {ValidationError} err
	* @return {o is T}
	*/
	check(o, err) {
		const c = o instanceof this.shape && (this._c == null || this._c(o));
		/* c8 ignore next */
		!c && err?.extend(null, this.shape.name, o?.constructor.name);
		return c;
	}
};
/**
* @template T
* @param {new (...args:any) => T} c
* @param {((o:T) => boolean)|null} check
* @return {Schema<T>}
*/
const $instanceOf = (c, check = null) => new $InstanceOf(c, check);
const $$instanceOf = $constructedBy($InstanceOf);
const $$schema = $instanceOf(Schema);
/**
* @template {Schema<any>[]} Args
* @typedef {(...args:UnwrapArray<TuplePop<Args>>)=>Unwrap<TupleLast<Args>>} _LArgsToLambdaDef
*/
/**
* @template {Array<Schema<any>>} Args
* @extends {Schema<_LArgsToLambdaDef<Args>>}
*/
var $Lambda = class extends Schema {
	/**
	* @param {Args} args
	*/
	constructor(args) {
		super();
		this.len = args.length - 1;
		this.args = $tuple(...args.slice(-1));
		this.res = args[this.len];
	}
	/**
	* @param {any} f
	* @param {ValidationError} err
	* @return {f is _LArgsToLambdaDef<Args>}
	*/
	check(f, err) {
		const c = f.constructor === Function && f.length <= this.len;
		/* c8 ignore next */
		!c && err?.extend(null, "function", typeof f);
		return c;
	}
};
const $$lambda = $constructedBy($Lambda);
/**
* @type {Schema<Function>}
*/
const $function = $custom((o) => typeof o === "function");
/**
* @template {Array<Schema<any>>} T
* @extends {Schema<Intersect<UnwrapArray<T>>>}
*/
var $Intersection = class extends Schema {
	/**
	* @param {T} v
	*/
	constructor(v) {
		super();
		/**
		* @type {T}
		*/
		this.shape = v;
	}
	/**
	* @param {any} o
	* @param {ValidationError} [err]
	* @return {o is Intersect<UnwrapArray<T>>}
	*/
	check(o, err) {
		const c = every$1(this.shape, (check) => check.check(o, err));
		/* c8 ignore next */
		!c && err?.extend(null, "Intersectinon", typeof o);
		return c;
	}
};
const $$intersect = $constructedBy($Intersection, (o) => o.shape.length > 0);
/**
* @template S
* @extends {Schema<S>}
*/
var $Union = class extends Schema {
	static _dilutes = true;
	/**
	* @param {Array<Schema<S>>} v
	*/
	constructor(v) {
		super();
		this.shape = v;
	}
	/**
	* @param {any} o
	* @param {ValidationError} [err]
	* @return {o is S}
	*/
	check(o, err) {
		const c = some(this.shape, (vv) => vv.check(o, err));
		err?.extend(null, "Union", typeof o);
		return c;
	}
};
/**
* @template {Array<any>} T
* @param {T} schemas
* @return {CastToSchema<$Union<Unwrap<ReadSchema<T>>>>}
*/
const $union = (...schemas) => schemas.findIndex(($s) => $$union.check($s)) >= 0 ? $union(...schemas.map(($s) => $($s)).map(($s) => $$union.check($s) ? $s.shape : [$s]).flat(1)) : schemas.length === 1 ? schemas[0] : new $Union(schemas);
const $$union = $constructedBy($Union);
const _t = () => true;
/**
* @type {Schema<any>}
*/
const $any = $custom(_t);
const $$any = $constructedBy($Custom, (o) => o.shape === _t);
/**
* @type {Schema<bigint>}
*/
const $bigint = $custom((o) => typeof o === "bigint");
const $$bigint = $custom((o) => o === $bigint);
/**
* @type {Schema<symbol>}
*/
const $symbol = $custom((o) => typeof o === "symbol");
const $$symbol = $custom((o) => o === $symbol);
/**
* @type {Schema<number>}
*/
const $number = $custom((o) => typeof o === "number");
const $$number = $custom((o) => o === $number);
/**
* @type {Schema<string>}
*/
const $string = $custom((o) => typeof o === "string");
const $$string = $custom((o) => o === $string);
/**
* @type {Schema<boolean>}
*/
const $boolean = $custom((o) => typeof o === "boolean");
const $$boolean = $custom((o) => o === $boolean);
/**
* @type {Schema<undefined>}
*/
const $undefined = $literal(void 0);
const $$undefined = $constructedBy($Literal, (o) => o.shape.length === 1 && o.shape[0] === void 0);
/**
* @type {Schema<void>}
*/
const $void = $literal(void 0);
const $null = $literal(null);
const $$null = $constructedBy($Literal, (o) => o.shape.length === 1 && o.shape[0] === null);
const $uint8Array = $constructedBy(Uint8Array);
const $$uint8Array = $constructedBy($ConstructedBy, (o) => o.shape === Uint8Array);
/**
* @type {Schema<Primitive>}
*/
const $primitive = $union($number, $string, $null, $undefined, $bigint, $boolean, $symbol);
/**
* @typedef {JSON[]} JSONArray
*/
/**
* @typedef {Primitive|JSONArray|{ [key:string]:JSON }} JSON
*/
/**
* @type {Schema<null|number|string|boolean|JSON[]|{[key:string]:JSON}>}
*/
const $json = (() => {
	const $jsonArr = $array($any);
	const $jsonRecord = $record($string, $any);
	const $json = $union($number, $string, $null, $boolean, $jsonArr, $jsonRecord);
	$jsonArr.shape = $json;
	$jsonRecord.shape.values = $json;
	return $json;
})();
/**
* @template {any} IN
* @typedef {IN extends Schema<any> ? IN
*   : (IN extends string|number|boolean|null ? Schema<IN>
*     : (IN extends new (...args:any[])=>any ? Schema<InstanceType<IN>>
*       : (IN extends any[] ? Schema<{ [K in keyof IN]: Unwrap<ReadSchema<IN[K]>> }[number]>
*       : (IN extends object ? (_ObjectDefToSchema<{[K in keyof IN]:ReadSchema<IN[K]>}> extends Schema<infer S> ? Schema<{ [K in keyof S]: S[K] }> : never)
*         : never)
*         )
*       )
*     )
* } ReadSchemaOld
*/
/**
* @template {any} IN
* @typedef {[Extract<IN,Schema<any>>,Extract<IN,string|number|boolean|null>,Extract<IN,new (...args:any[])=>any>,Extract<IN,any[]>,Extract<Exclude<IN,Schema<any>|string|number|boolean|null|(new (...args:any[])=>any)|any[]>,object>] extends [infer Schemas, infer Primitives, infer Constructors, infer Arrs, infer Obj]
*   ? Schema<
*       (Schemas extends Schema<infer S> ? S : never)
*     | Primitives
*     | (Constructors extends new (...args:any[])=>any ? InstanceType<Constructors> : never)
*     | (Arrs extends any[] ? { [K in keyof Arrs]: Unwrap<ReadSchema<Arrs[K]>> }[number] : never)
*     | (Obj extends object ? Unwrap<(_ObjectDefToSchema<{[K in keyof Obj]:ReadSchema<Obj[K]>}> extends Schema<infer S> ? Schema<{ [K in keyof S]: S[K] }> : never)> : never)>
*   : never
* } ReadSchema
*/
/**
* @typedef {ReadSchema<{x:42}|{y:99}|Schema<string>|[1,2,{}]>} Q
*/
/**
* @template IN
* @param {IN} o
* @return {ReadSchema<IN>}
*/
const $ = (o) => {
	if ($$schema.check(o)) return o;
	else if ($objectAny.check(o)) {
		/**
		* @type {any}
		*/
		const o2 = {};
		for (const k in o) o2[k] = $(o[k]);
		return $object(o2);
	} else if ($arrayAny.check(o)) return $union(...o.map($));
	else if ($primitive.check(o)) return $literal(o);
	else if ($function.check(o)) return $constructedBy(o);
	/* c8 ignore next */
	unexpectedCase();
};
/* c8 ignore start */
/**
* Assert that a variable is of this specific type.
* The assertion check is only performed in non-production environments.
*
* @type {<T>(o:any,schema:Schema<T>) => asserts o is T}
*/
const assert = production ? () => {} : (o, schema) => {
	const err = new ValidationError();
	if (!schema.check(o, err)) throw create$3(`Expected value to be of type ${schema.constructor.name}.\n${err.toString()}`);
};
/* c8 ignore end */
/**
* @template In
* @template Out
* @typedef {{ if: Schema<In>, h: (o:In,state?:any)=>Out }} Pattern
*/
/**
* @template {Pattern<any,any>} P
* @template In
* @typedef {ReturnType<Extract<P,Pattern<In extends number ? number : (In extends string ? string : In),any>>['h']>} PatternMatchResult
*/
/**
* @todo move this to separate library
* @template {any} [State=undefined]
* @template {Pattern<any,any>} [Patterns=never]
*/
var PatternMatcher = class {
	/**
	* @param {Schema<State>} [$state]
	*/
	constructor($state) {
		/**
		* @type {Array<Patterns>}
		*/
		this.patterns = [];
		this.$state = $state;
	}
	/**
	* @template P
	* @template R
	* @param {P} pattern
	* @param {(o:NoInfer<Unwrap<ReadSchema<P>>>,s:State)=>R} handler
	* @return {PatternMatcher<State,Patterns|Pattern<Unwrap<ReadSchema<P>>,R>>}
	*/
	if(pattern, handler) {
		this.patterns.push({
			if: $(pattern),
			h: handler
		});
		return this;
	}
	/**
	* @template R
	* @param {(o:any,s:State)=>R} h
	*/
	else(h) {
		return this.if($any, h);
	}
	/**
	* @return {State extends undefined
	*   ? <In extends Unwrap<Patterns['if']>>(o:In,state?:undefined)=>PatternMatchResult<Patterns,In>
	*   : <In extends Unwrap<Patterns['if']>>(o:In,state:State)=>PatternMatchResult<Patterns,In>}
	*/
	done() {
		return (o, s) => {
			for (let i = 0; i < this.patterns.length; i++) {
				const p = this.patterns[i];
				if (p.if.check(o)) return p.h(o, s);
			}
			throw create$3("Unhandled pattern");
		};
	}
};
/**
* @template [State=undefined]
* @param {State} [state]
* @return {PatternMatcher<State extends undefined ? undefined : Unwrap<ReadSchema<State>>>}
*/
const match = (state) => new PatternMatcher(state);
/**
* Helper function to generate a (non-exhaustive) sample set from a gives schema.
*
* @type {<T>(o:T,gen:prng.PRNG)=>T}
*/
const _random = match($any).if($$number, (_o, gen) => int53(gen, MIN_SAFE_INTEGER, MAX_SAFE_INTEGER)).if($$string, (_o, gen) => word(gen)).if($$boolean, (_o, gen) => bool(gen)).if($$bigint, (_o, gen) => BigInt(int53(gen, MIN_SAFE_INTEGER, MAX_SAFE_INTEGER))).if($$union, (o, gen) => random(gen, oneOf(gen, o.shape))).if($$object, (o, gen) => {
	/**
	* @type {any}
	*/
	const res = {};
	for (const k in o.shape) {
		let prop = o.shape[k];
		if ($$optional.check(prop)) {
			if (bool(gen)) continue;
			prop = prop.shape;
		}
		res[k] = _random(prop, gen);
	}
	return res;
}).if($$array, (o, gen) => {
	const arr = [];
	const n = int32(gen, 0, 42);
	for (let i = 0; i < n; i++) arr.push(random(gen, o.shape));
	return arr;
}).if($$literal, (o, gen) => {
	return oneOf(gen, o.shape);
}).if($$null, (o, gen) => {
	return null;
}).if($$lambda, (o, gen) => {
	const res = random(gen, o.res);
	return () => res;
}).if($$any, (o, gen) => random(gen, oneOf(gen, [
	$number,
	$string,
	$null,
	$undefined,
	$bigint,
	$boolean,
	$array($number),
	$record($union("a", "b", "c"), $number)
]))).if($$record, (o, gen) => {
	/**
	* @type {any}
	*/
	const res = {};
	const keysN = int53(gen, 0, 3);
	for (let i = 0; i < keysN; i++) {
		const key = random(gen, o.shape.keys);
		res[key] = random(gen, o.shape.values);
	}
	return res;
}).done();
/**
* @template S
* @param {prng.PRNG} gen
* @param {S} schema
* @return {Unwrap<ReadSchema<S>>}
*/
const random = (gen, schema) => _random($(schema), gen);
//#endregion
//#region node_modules/lib0/dom.js
/* c8 ignore start */
/**
* @type {Document}
*/
const doc = typeof document !== "undefined" ? document : {};
/**
* @type {$.Schema<DocumentFragment>}
*/
const $fragment = $custom((el) => el.nodeType === DOCUMENT_FRAGMENT_NODE);
const domParser = typeof DOMParser !== "undefined" ? new DOMParser() : null;
/**
* @type {$.Schema<Element>}
*/
const $element = $custom((el) => el.nodeType === ELEMENT_NODE);
/**
* @type {$.Schema<Text>}
*/
const $text = $custom((el) => el.nodeType === TEXT_NODE);
/**
* @param {Map<string,string>} m
* @return {string}
*/
const mapToStyleString = (m) => map(m, (value, key) => `${key}:${value};`).join("");
const ELEMENT_NODE = doc.ELEMENT_NODE;
const TEXT_NODE = doc.TEXT_NODE;
const CDATA_SECTION_NODE = doc.CDATA_SECTION_NODE;
const COMMENT_NODE = doc.COMMENT_NODE;
const DOCUMENT_NODE = doc.DOCUMENT_NODE;
const DOCUMENT_TYPE_NODE = doc.DOCUMENT_TYPE_NODE;
const DOCUMENT_FRAGMENT_NODE = doc.DOCUMENT_FRAGMENT_NODE;
/**
* @type {$.Schema<Node>}
*/
const $node = $custom((el) => el.nodeType === DOCUMENT_NODE);
/* c8 ignore stop */
//#endregion
//#region node_modules/lib0/symbol.js
/**
* Utility module to work with EcmaScript Symbols.
*
* @module symbol
*/
/**
* Return fresh symbol.
*/
const create = Symbol;
//#endregion
//#region node_modules/lib0/logging.common.js
const BOLD = create();
const UNBOLD = create();
const BLUE = create();
const GREY = create();
const GREEN = create();
const RED = create();
const PURPLE = create();
const ORANGE = create();
const UNCOLOR = create();
/* c8 ignore start */
/**
* @param {Array<undefined|string|Symbol|Object|number|function():any>} args
* @return {Array<string|object|number|undefined>}
*/
const computeNoColorLoggingArgs = (args) => {
	if (args.length === 1 && args[0]?.constructor === Function) args = args[0]();
	const strBuilder = [];
	const logArgs = [];
	let i = 0;
	for (; i < args.length; i++) {
		const arg = args[i];
		if (arg === void 0) break;
		else if (arg.constructor === String || arg.constructor === Number) strBuilder.push(arg);
		else if (arg.constructor === Object) break;
	}
	if (i > 0) logArgs.push(strBuilder.join(""));
	for (; i < args.length; i++) {
		const arg = args[i];
		if (!(arg instanceof Symbol)) logArgs.push(arg);
	}
	return logArgs;
};
let lastLoggingTime = getUnixTime();
/* c8 ignore stop */
//#endregion
//#region node_modules/lib0/logging.js
/**
* Isomorphic logging module with support for colors!
*
* @module logging
*/
/**
* @type {Object<Symbol,pair.Pair<string,string>>}
*/
const _browserStyleMap = {
	[BOLD]: create$1("font-weight", "bold"),
	[UNBOLD]: create$1("font-weight", "normal"),
	[BLUE]: create$1("color", "blue"),
	[GREEN]: create$1("color", "green"),
	[GREY]: create$1("color", "grey"),
	[RED]: create$1("color", "red"),
	[PURPLE]: create$1("color", "purple"),
	[ORANGE]: create$1("color", "orange"),
	[UNCOLOR]: create$1("color", "black")
};
/**
* @param {Array<string|Symbol|Object|number|function():any>} args
* @return {Array<string|object|number>}
*/
/* c8 ignore start */
const computeBrowserLoggingArgs = (args) => {
	if (args.length === 1 && args[0]?.constructor === Function) args = args[0]();
	const strBuilder = [];
	const styles = [];
	const currentStyle = create$5();
	/**
	* @type {Array<string|Object|number>}
	*/
	let logArgs = [];
	let i = 0;
	for (; i < args.length; i++) {
		const arg = args[i];
		const style = _browserStyleMap[arg];
		if (style !== void 0) currentStyle.set(style.left, style.right);
		else {
			if (arg === void 0) break;
			if (arg.constructor === String || arg.constructor === Number) {
				const style = mapToStyleString(currentStyle);
				if (i > 0 || style.length > 0) {
					strBuilder.push("%c" + arg);
					styles.push(style);
				} else strBuilder.push(arg);
			} else break;
		}
	}
	if (i > 0) {
		logArgs = styles;
		logArgs.unshift(strBuilder.join(""));
	}
	for (; i < args.length; i++) {
		const arg = args[i];
		if (!(arg instanceof Symbol)) logArgs.push(arg);
	}
	return logArgs;
};
/* c8 ignore stop */
/* c8 ignore start */
const computeLoggingArgs = supportsColor ? computeBrowserLoggingArgs : computeNoColorLoggingArgs;
/* c8 ignore stop */
/**
* @param {Array<string|Symbol|Object|number>} args
*/
const print = (...args) => {
	console.log(...computeLoggingArgs(args));
	/* c8 ignore next */
	vconsoles.forEach((vc) => vc.print(args));
};
/* c8 ignore start */
/**
* @param {Array<string|Symbol|Object|number>} args
*/
const warn = (...args) => {
	console.warn(...computeLoggingArgs(args));
	args.unshift(ORANGE);
	vconsoles.forEach((vc) => vc.print(args));
};
const vconsoles = create$4();
//#endregion
//#region node_modules/lib0/iterator.js
/**
* @template T
* @param {function():IteratorResult<T>} next
* @return {IterableIterator<T>}
*/
const createIterator = (next) => ({
	/**
	* @return {IterableIterator<T>}
	*/
	[Symbol.iterator]() {
		return this;
	},
	next
});
/**
* @template T
* @param {Iterator<T>} iterator
* @param {function(T):boolean} filter
*/
const iteratorFilter = (iterator, filter) => createIterator(() => {
	let res;
	do
		res = iterator.next();
	while (!res.done && !filter(res.value));
	return res;
});
/**
* @template T,M
* @param {Iterator<T>} iterator
* @param {function(T):M} fmap
*/
const iteratorMap = (iterator, fmap) => createIterator(() => {
	const { done, value } = iterator.next();
	return {
		done,
		value: done ? void 0 : fmap(value)
	};
});
//#endregion
//#region node_modules/yjs/dist/yjs.mjs
var DeleteItem = class {
	/**
	* @param {number} clock
	* @param {number} len
	*/
	constructor(clock, len) {
		/**
		* @type {number}
		*/
		this.clock = clock;
		/**
		* @type {number}
		*/
		this.len = len;
	}
};
/**
* We no longer maintain a DeleteStore. DeleteSet is a temporary object that is created when needed.
* - When created in a transaction, it must only be accessed after sorting, and merging
*   - This DeleteSet is send to other clients
* - We do not create a DeleteSet when we send a sync message. The DeleteSet message is created directly from StructStore
* - We read a DeleteSet as part of a sync/update message. In this case the DeleteSet is already sorted and merged.
*/
var DeleteSet = class {
	constructor() {
		/**
		* @type {Map<number,Array<DeleteItem>>}
		*/
		this.clients = /* @__PURE__ */ new Map();
	}
};
/**
* Iterate over all structs that the DeleteSet gc's.
*
* @param {Transaction} transaction
* @param {DeleteSet} ds
* @param {function(GC|Item):void} f
*
* @function
*/
const iterateDeletedStructs = (transaction, ds, f) => ds.clients.forEach((deletes, clientid) => {
	const structs = transaction.doc.store.clients.get(clientid);
	if (structs != null) {
		const lastStruct = structs[structs.length - 1];
		const clockState = lastStruct.id.clock + lastStruct.length;
		for (let i = 0, del = deletes[i]; i < deletes.length && del.clock < clockState; del = deletes[++i]) iterateStructs(transaction, structs, del.clock, del.len, f);
	}
});
/**
* @param {Array<DeleteItem>} dis
* @param {number} clock
* @return {number|null}
*
* @private
* @function
*/
const findIndexDS = (dis, clock) => {
	let left = 0;
	let right = dis.length - 1;
	while (left <= right) {
		const midindex = floor((left + right) / 2);
		const mid = dis[midindex];
		const midclock = mid.clock;
		if (midclock <= clock) {
			if (clock < midclock + mid.len) return midindex;
			left = midindex + 1;
		} else right = midindex - 1;
	}
	return null;
};
/**
* @param {DeleteSet} ds
* @param {ID} id
* @return {boolean}
*
* @private
* @function
*/
const isDeleted = (ds, id) => {
	const dis = ds.clients.get(id.client);
	return dis !== void 0 && findIndexDS(dis, id.clock) !== null;
};
/**
* @param {DeleteSet} ds
*
* @private
* @function
*/
const sortAndMergeDeleteSet = (ds) => {
	ds.clients.forEach((dels) => {
		dels.sort((a, b) => a.clock - b.clock);
		let i, j;
		for (i = 1, j = 1; i < dels.length; i++) {
			const left = dels[j - 1];
			const right = dels[i];
			if (left.clock + left.len >= right.clock) dels[j - 1] = new DeleteItem(left.clock, max(left.len, right.clock + right.len - left.clock));
			else {
				if (j < i) dels[j] = right;
				j++;
			}
		}
		dels.length = j;
	});
};
/**
* @param {Array<DeleteSet>} dss
* @return {DeleteSet} A fresh DeleteSet
*/
const mergeDeleteSets = (dss) => {
	const merged = new DeleteSet();
	for (let dssI = 0; dssI < dss.length; dssI++) dss[dssI].clients.forEach((delsLeft, client) => {
		if (!merged.clients.has(client)) {
			/**
			* @type {Array<DeleteItem>}
			*/
			const dels = delsLeft.slice();
			for (let i = dssI + 1; i < dss.length; i++) appendTo(dels, dss[i].clients.get(client) || []);
			merged.clients.set(client, dels);
		}
	});
	sortAndMergeDeleteSet(merged);
	return merged;
};
/**
* @param {DeleteSet} ds
* @param {number} client
* @param {number} clock
* @param {number} length
*
* @private
* @function
*/
const addToDeleteSet = (ds, client, clock, length) => {
	setIfUndefined(ds.clients, client, () => []).push(new DeleteItem(clock, length));
};
const createDeleteSet = () => new DeleteSet();
/**
* @param {StructStore} ss
* @return {DeleteSet} Merged and sorted DeleteSet
*
* @private
* @function
*/
const createDeleteSetFromStructStore = (ss) => {
	const ds = createDeleteSet();
	ss.clients.forEach((structs, client) => {
		/**
		* @type {Array<DeleteItem>}
		*/
		const dsitems = [];
		for (let i = 0; i < structs.length; i++) {
			const struct = structs[i];
			if (struct.deleted) {
				const clock = struct.id.clock;
				let len = struct.length;
				if (i + 1 < structs.length) for (let next = structs[i + 1]; i + 1 < structs.length && next.deleted; next = structs[++i + 1]) len += next.length;
				dsitems.push(new DeleteItem(clock, len));
			}
		}
		if (dsitems.length > 0) ds.clients.set(client, dsitems);
	});
	return ds;
};
/**
* @param {DSEncoderV1 | DSEncoderV2} encoder
* @param {DeleteSet} ds
*
* @private
* @function
*/
const writeDeleteSet = (encoder, ds) => {
	writeVarUint(encoder.restEncoder, ds.clients.size);
	from(ds.clients.entries()).sort((a, b) => b[0] - a[0]).forEach(([client, dsitems]) => {
		encoder.resetDsCurVal();
		writeVarUint(encoder.restEncoder, client);
		const len = dsitems.length;
		writeVarUint(encoder.restEncoder, len);
		for (let i = 0; i < len; i++) {
			const item = dsitems[i];
			encoder.writeDsClock(item.clock);
			encoder.writeDsLen(item.len);
		}
	});
};
/**
* @param {DSDecoderV1 | DSDecoderV2} decoder
* @return {DeleteSet}
*
* @private
* @function
*/
const readDeleteSet = (decoder) => {
	const ds = new DeleteSet();
	const numClients = readVarUint(decoder.restDecoder);
	for (let i = 0; i < numClients; i++) {
		decoder.resetDsCurVal();
		const client = readVarUint(decoder.restDecoder);
		const numberOfDeletes = readVarUint(decoder.restDecoder);
		if (numberOfDeletes > 0) {
			const dsField = setIfUndefined(ds.clients, client, () => []);
			for (let i = 0; i < numberOfDeletes; i++) dsField.push(new DeleteItem(decoder.readDsClock(), decoder.readDsLen()));
		}
	}
	return ds;
};
/**
* @todo YDecoder also contains references to String and other Decoders. Would make sense to exchange YDecoder.toUint8Array for YDecoder.DsToUint8Array()..
*/
/**
* @param {DSDecoderV1 | DSDecoderV2} decoder
* @param {Transaction} transaction
* @param {StructStore} store
* @return {Uint8Array|null} Returns a v2 update containing all deletes that couldn't be applied yet; or null if all deletes were applied successfully.
*
* @private
* @function
*/
const readAndApplyDeleteSet = (decoder, transaction, store) => {
	const unappliedDS = new DeleteSet();
	const numClients = readVarUint(decoder.restDecoder);
	for (let i = 0; i < numClients; i++) {
		decoder.resetDsCurVal();
		const client = readVarUint(decoder.restDecoder);
		const numberOfDeletes = readVarUint(decoder.restDecoder);
		const structs = store.clients.get(client) || [];
		const state = getState(store, client);
		for (let i = 0; i < numberOfDeletes; i++) {
			const clock = decoder.readDsClock();
			const clockEnd = clock + decoder.readDsLen();
			if (clock < state) {
				if (state < clockEnd) addToDeleteSet(unappliedDS, client, state, clockEnd - state);
				let index = findIndexSS(structs, clock);
				/**
				* We can ignore the case of GC and Delete structs, because we are going to skip them
				* @type {Item}
				*/
				let struct = structs[index];
				if (!struct.deleted && struct.id.clock < clock) {
					structs.splice(index + 1, 0, splitItem(transaction, struct, clock - struct.id.clock));
					index++;
				}
				while (index < structs.length) {
					struct = structs[index++];
					if (struct.id.clock < clockEnd) {
						if (!struct.deleted) {
							if (clockEnd < struct.id.clock + struct.length) structs.splice(index, 0, splitItem(transaction, struct, clockEnd - struct.id.clock));
							struct.delete(transaction);
						}
					} else break;
				}
			} else addToDeleteSet(unappliedDS, client, clock, clockEnd - clock);
		}
	}
	if (unappliedDS.clients.size > 0) {
		const ds = new UpdateEncoderV2();
		writeVarUint(ds.restEncoder, 0);
		writeDeleteSet(ds, unappliedDS);
		return ds.toUint8Array();
	}
	return null;
};
/**
* @module Y
*/
const generateNewClientId = uint32;
/**
* @typedef {Object} DocOpts
* @property {boolean} [DocOpts.gc=true] Disable garbage collection (default: gc=true)
* @property {function(Item):boolean} [DocOpts.gcFilter] Will be called before an Item is garbage collected. Return false to keep the Item.
* @property {string} [DocOpts.guid] Define a globally unique identifier for this document
* @property {string | null} [DocOpts.collectionid] Associate this document with a collection. This only plays a role if your provider has a concept of collection.
* @property {any} [DocOpts.meta] Any kind of meta information you want to associate with this document. If this is a subdocument, remote peers will store the meta information as well.
* @property {boolean} [DocOpts.autoLoad] If a subdocument, automatically load document. If this is a subdocument, remote peers will load the document as well automatically.
* @property {boolean} [DocOpts.shouldLoad] Whether the document should be synced by the provider now. This is toggled to true when you call ydoc.load()
*/
/**
* @typedef {Object} DocEvents
* @property {function(Doc):void} DocEvents.destroy
* @property {function(Doc):void} DocEvents.load
* @property {function(boolean, Doc):void} DocEvents.sync
* @property {function(Uint8Array, any, Doc, Transaction):void} DocEvents.update
* @property {function(Uint8Array, any, Doc, Transaction):void} DocEvents.updateV2
* @property {function(Doc):void} DocEvents.beforeAllTransactions
* @property {function(Transaction, Doc):void} DocEvents.beforeTransaction
* @property {function(Transaction, Doc):void} DocEvents.beforeObserverCalls
* @property {function(Transaction, Doc):void} DocEvents.afterTransaction
* @property {function(Transaction, Doc):void} DocEvents.afterTransactionCleanup
* @property {function(Doc, Array<Transaction>):void} DocEvents.afterAllTransactions
* @property {function({ loaded: Set<Doc>, added: Set<Doc>, removed: Set<Doc> }, Doc, Transaction):void} DocEvents.subdocs
*/
/**
* A Yjs instance handles the state of shared data.
* @extends ObservableV2<DocEvents>
*/
var Doc = class Doc extends ObservableV2 {
	/**
	* @param {DocOpts} opts configuration
	*/
	constructor({ guid = uuidv4(), collectionid = null, gc = true, gcFilter = () => true, meta = null, autoLoad = false, shouldLoad = true } = {}) {
		super();
		this.gc = gc;
		this.gcFilter = gcFilter;
		this.clientID = generateNewClientId();
		this.guid = guid;
		this.collectionid = collectionid;
		/**
		* @type {Map<string, AbstractType<YEvent<any>>>}
		*/
		this.share = /* @__PURE__ */ new Map();
		this.store = new StructStore();
		/**
		* @type {Transaction | null}
		*/
		this._transaction = null;
		/**
		* @type {Array<Transaction>}
		*/
		this._transactionCleanups = [];
		/**
		* @type {Set<Doc>}
		*/
		this.subdocs = /* @__PURE__ */ new Set();
		/**
		* If this document is a subdocument - a document integrated into another document - then _item is defined.
		* @type {Item?}
		*/
		this._item = null;
		this.shouldLoad = shouldLoad;
		this.autoLoad = autoLoad;
		this.meta = meta;
		/**
		* This is set to true when the persistence provider loaded the document from the database or when the `sync` event fires.
		* Note that not all providers implement this feature. Provider authors are encouraged to fire the `load` event when the doc content is loaded from the database.
		*
		* @type {boolean}
		*/
		this.isLoaded = false;
		/**
		* This is set to true when the connection provider has successfully synced with a backend.
		* Note that when using peer-to-peer providers this event may not provide very useful.
		* Also note that not all providers implement this feature. Provider authors are encouraged to fire
		* the `sync` event when the doc has been synced (with `true` as a parameter) or if connection is
		* lost (with false as a parameter).
		*/
		this.isSynced = false;
		this.isDestroyed = false;
		/**
		* Promise that resolves once the document has been loaded from a persistence provider.
		*/
		this.whenLoaded = create$2((resolve) => {
			this.on("load", () => {
				this.isLoaded = true;
				resolve(this);
			});
		});
		const provideSyncedPromise = () => create$2((resolve) => {
			/**
			* @param {boolean} isSynced
			*/
			const eventHandler = (isSynced) => {
				if (isSynced === void 0 || isSynced === true) {
					this.off("sync", eventHandler);
					resolve();
				}
			};
			this.on("sync", eventHandler);
		});
		this.on("sync", (isSynced) => {
			if (isSynced === false && this.isSynced) this.whenSynced = provideSyncedPromise();
			this.isSynced = isSynced === void 0 || isSynced === true;
			if (this.isSynced && !this.isLoaded) this.emit("load", [this]);
		});
		/**
		* Promise that resolves once the document has been synced with a backend.
		* This promise is recreated when the connection is lost.
		* Note the documentation about the `isSynced` property.
		*/
		this.whenSynced = provideSyncedPromise();
	}
	/**
	* Notify the parent document that you request to load data into this subdocument (if it is a subdocument).
	*
	* `load()` might be used in the future to request any provider to load the most current data.
	*
	* It is safe to call `load()` multiple times.
	*/
	load() {
		const item = this._item;
		if (item !== null && !this.shouldLoad) transact$2(
			/** @type {any} */
			item.parent.doc,
			(transaction) => {
				transaction.subdocsLoaded.add(this);
			},
			null,
			true
		);
		this.shouldLoad = true;
	}
	getSubdocs() {
		return this.subdocs;
	}
	getSubdocGuids() {
		return new Set(from(this.subdocs).map((doc) => doc.guid));
	}
	/**
	* Changes that happen inside of a transaction are bundled. This means that
	* the observer fires _after_ the transaction is finished and that all changes
	* that happened inside of the transaction are sent as one message to the
	* other peers.
	*
	* @template T
	* @param {function(Transaction):T} f The function that should be executed as a transaction
	* @param {any} [origin] Origin of who started the transaction. Will be stored on transaction.origin
	* @return T
	*
	* @public
	*/
	transact(f, origin = null) {
		return transact$2(this, f, origin);
	}
	/**
	* Define a shared data type.
	*
	* Multiple calls of `ydoc.get(name, TypeConstructor)` yield the same result
	* and do not overwrite each other. I.e.
	* `ydoc.get(name, Y.Array) === ydoc.get(name, Y.Array)`
	*
	* After this method is called, the type is also available on `ydoc.share.get(name)`.
	*
	* *Best Practices:*
	* Define all types right after the Y.Doc instance is created and store them in a separate object.
	* Also use the typed methods `getText(name)`, `getArray(name)`, ..
	*
	* @template {typeof AbstractType<any>} Type
	* @example
	*   const ydoc = new Y.Doc(..)
	*   const appState = {
	*     document: ydoc.getText('document')
	*     comments: ydoc.getArray('comments')
	*   }
	*
	* @param {string} name
	* @param {Type} TypeConstructor The constructor of the type definition. E.g. Y.Text, Y.Array, Y.Map, ...
	* @return {InstanceType<Type>} The created type. Constructed with TypeConstructor
	*
	* @public
	*/
	get(name, TypeConstructor = AbstractType) {
		const type = setIfUndefined(this.share, name, () => {
			const t = new TypeConstructor();
			t._integrate(this, null);
			return t;
		});
		const Constr = type.constructor;
		if (TypeConstructor !== AbstractType && Constr !== TypeConstructor) if (Constr === AbstractType) {
			const t = new TypeConstructor();
			t._map = type._map;
			type._map.forEach(
				/** @param {Item?} n */
				(n) => {
					for (; n !== null; n = n.left) n.parent = t;
				}
			);
			t._start = type._start;
			for (let n = t._start; n !== null; n = n.right) n.parent = t;
			t._length = type._length;
			this.share.set(name, t);
			t._integrate(this, null);
			return t;
		} else throw new Error(`Type with the name ${name} has already been defined with a different constructor`);
		return type;
	}
	/**
	* @template T
	* @param {string} [name]
	* @return {YArray<T>}
	*
	* @public
	*/
	getArray(name = "") {
		return this.get(name, YArray);
	}
	/**
	* @param {string} [name]
	* @return {YText}
	*
	* @public
	*/
	getText(name = "") {
		return this.get(name, YText);
	}
	/**
	* @template T
	* @param {string} [name]
	* @return {YMap<T>}
	*
	* @public
	*/
	getMap(name = "") {
		return this.get(name, YMap);
	}
	/**
	* @param {string} [name]
	* @return {YXmlElement}
	*
	* @public
	*/
	getXmlElement(name = "") {
		return this.get(name, YXmlElement);
	}
	/**
	* @param {string} [name]
	* @return {YXmlFragment}
	*
	* @public
	*/
	getXmlFragment(name = "") {
		return this.get(name, YXmlFragment);
	}
	/**
	* Converts the entire document into a js object, recursively traversing each yjs type
	* Doesn't log types that have not been defined (using ydoc.getType(..)).
	*
	* @deprecated Do not use this method and rather call toJSON directly on the shared types.
	*
	* @return {Object<string, any>}
	*/
	toJSON() {
		/**
		* @type {Object<string, any>}
		*/
		const doc = {};
		this.share.forEach((value, key) => {
			doc[key] = value.toJSON();
		});
		return doc;
	}
	/**
	* Emit `destroy` event and unregister all event handlers.
	*/
	destroy() {
		this.isDestroyed = true;
		from(this.subdocs).forEach((subdoc) => subdoc.destroy());
		const item = this._item;
		if (item !== null) {
			this._item = null;
			const content = item.content;
			content.doc = new Doc({
				guid: this.guid,
				...content.opts,
				shouldLoad: false
			});
			content.doc._item = item;
			transact$2(
				/** @type {any} */
				item.parent.doc,
				(transaction) => {
					const doc = content.doc;
					if (!item.deleted) transaction.subdocsAdded.add(doc);
					transaction.subdocsRemoved.add(this);
				},
				null,
				true
			);
		}
		this.emit("destroyed", [true]);
		this.emit("destroy", [this]);
		super.destroy();
	}
};
var DSDecoderV1 = class {
	/**
	* @param {decoding.Decoder} decoder
	*/
	constructor(decoder) {
		this.restDecoder = decoder;
	}
	resetDsCurVal() {}
	/**
	* @return {number}
	*/
	readDsClock() {
		return readVarUint(this.restDecoder);
	}
	/**
	* @return {number}
	*/
	readDsLen() {
		return readVarUint(this.restDecoder);
	}
};
var UpdateDecoderV1 = class extends DSDecoderV1 {
	/**
	* @return {ID}
	*/
	readLeftID() {
		return createID(readVarUint(this.restDecoder), readVarUint(this.restDecoder));
	}
	/**
	* @return {ID}
	*/
	readRightID() {
		return createID(readVarUint(this.restDecoder), readVarUint(this.restDecoder));
	}
	/**
	* Read the next client id.
	* Use this in favor of readID whenever possible to reduce the number of objects created.
	*/
	readClient() {
		return readVarUint(this.restDecoder);
	}
	/**
	* @return {number} info An unsigned 8-bit integer
	*/
	readInfo() {
		return readUint8(this.restDecoder);
	}
	/**
	* @return {string}
	*/
	readString() {
		return readVarString(this.restDecoder);
	}
	/**
	* @return {boolean} isKey
	*/
	readParentInfo() {
		return readVarUint(this.restDecoder) === 1;
	}
	/**
	* @return {number} info An unsigned 8-bit integer
	*/
	readTypeRef() {
		return readVarUint(this.restDecoder);
	}
	/**
	* Write len of a struct - well suited for Opt RLE encoder.
	*
	* @return {number} len
	*/
	readLen() {
		return readVarUint(this.restDecoder);
	}
	/**
	* @return {any}
	*/
	readAny() {
		return readAny(this.restDecoder);
	}
	/**
	* @return {Uint8Array}
	*/
	readBuf() {
		return copyUint8Array(readVarUint8Array(this.restDecoder));
	}
	/**
	* Legacy implementation uses JSON parse. We use any-decoding in v2.
	*
	* @return {any}
	*/
	readJSON() {
		return JSON.parse(readVarString(this.restDecoder));
	}
	/**
	* @return {string}
	*/
	readKey() {
		return readVarString(this.restDecoder);
	}
};
var DSDecoderV2 = class {
	/**
	* @param {decoding.Decoder} decoder
	*/
	constructor(decoder) {
		/**
		* @private
		*/
		this.dsCurrVal = 0;
		this.restDecoder = decoder;
	}
	resetDsCurVal() {
		this.dsCurrVal = 0;
	}
	/**
	* @return {number}
	*/
	readDsClock() {
		this.dsCurrVal += readVarUint(this.restDecoder);
		return this.dsCurrVal;
	}
	/**
	* @return {number}
	*/
	readDsLen() {
		const diff = readVarUint(this.restDecoder) + 1;
		this.dsCurrVal += diff;
		return diff;
	}
};
var UpdateDecoderV2 = class extends DSDecoderV2 {
	/**
	* @param {decoding.Decoder} decoder
	*/
	constructor(decoder) {
		super(decoder);
		/**
		* List of cached keys. If the keys[id] does not exist, we read a new key
		* from stringEncoder and push it to keys.
		*
		* @type {Array<string>}
		*/
		this.keys = [];
		readVarUint(decoder);
		this.keyClockDecoder = new IntDiffOptRleDecoder(readVarUint8Array(decoder));
		this.clientDecoder = new UintOptRleDecoder(readVarUint8Array(decoder));
		this.leftClockDecoder = new IntDiffOptRleDecoder(readVarUint8Array(decoder));
		this.rightClockDecoder = new IntDiffOptRleDecoder(readVarUint8Array(decoder));
		this.infoDecoder = new RleDecoder(readVarUint8Array(decoder), readUint8);
		this.stringDecoder = new StringDecoder(readVarUint8Array(decoder));
		this.parentInfoDecoder = new RleDecoder(readVarUint8Array(decoder), readUint8);
		this.typeRefDecoder = new UintOptRleDecoder(readVarUint8Array(decoder));
		this.lenDecoder = new UintOptRleDecoder(readVarUint8Array(decoder));
	}
	/**
	* @return {ID}
	*/
	readLeftID() {
		return new ID(this.clientDecoder.read(), this.leftClockDecoder.read());
	}
	/**
	* @return {ID}
	*/
	readRightID() {
		return new ID(this.clientDecoder.read(), this.rightClockDecoder.read());
	}
	/**
	* Read the next client id.
	* Use this in favor of readID whenever possible to reduce the number of objects created.
	*/
	readClient() {
		return this.clientDecoder.read();
	}
	/**
	* @return {number} info An unsigned 8-bit integer
	*/
	readInfo() {
		return this.infoDecoder.read();
	}
	/**
	* @return {string}
	*/
	readString() {
		return this.stringDecoder.read();
	}
	/**
	* @return {boolean}
	*/
	readParentInfo() {
		return this.parentInfoDecoder.read() === 1;
	}
	/**
	* @return {number} An unsigned 8-bit integer
	*/
	readTypeRef() {
		return this.typeRefDecoder.read();
	}
	/**
	* Write len of a struct - well suited for Opt RLE encoder.
	*
	* @return {number}
	*/
	readLen() {
		return this.lenDecoder.read();
	}
	/**
	* @return {any}
	*/
	readAny() {
		return readAny(this.restDecoder);
	}
	/**
	* @return {Uint8Array}
	*/
	readBuf() {
		return readVarUint8Array(this.restDecoder);
	}
	/**
	* This is mainly here for legacy purposes.
	*
	* Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
	*
	* @return {any}
	*/
	readJSON() {
		return readAny(this.restDecoder);
	}
	/**
	* @return {string}
	*/
	readKey() {
		const keyClock = this.keyClockDecoder.read();
		if (keyClock < this.keys.length) return this.keys[keyClock];
		else {
			const key = this.stringDecoder.read();
			this.keys.push(key);
			return key;
		}
	}
};
var DSEncoderV1 = class {
	constructor() {
		this.restEncoder = createEncoder();
	}
	toUint8Array() {
		return toUint8Array(this.restEncoder);
	}
	resetDsCurVal() {}
	/**
	* @param {number} clock
	*/
	writeDsClock(clock) {
		writeVarUint(this.restEncoder, clock);
	}
	/**
	* @param {number} len
	*/
	writeDsLen(len) {
		writeVarUint(this.restEncoder, len);
	}
};
var UpdateEncoderV1 = class extends DSEncoderV1 {
	/**
	* @param {ID} id
	*/
	writeLeftID(id) {
		writeVarUint(this.restEncoder, id.client);
		writeVarUint(this.restEncoder, id.clock);
	}
	/**
	* @param {ID} id
	*/
	writeRightID(id) {
		writeVarUint(this.restEncoder, id.client);
		writeVarUint(this.restEncoder, id.clock);
	}
	/**
	* Use writeClient and writeClock instead of writeID if possible.
	* @param {number} client
	*/
	writeClient(client) {
		writeVarUint(this.restEncoder, client);
	}
	/**
	* @param {number} info An unsigned 8-bit integer
	*/
	writeInfo(info) {
		writeUint8(this.restEncoder, info);
	}
	/**
	* @param {string} s
	*/
	writeString(s) {
		writeVarString(this.restEncoder, s);
	}
	/**
	* @param {boolean} isYKey
	*/
	writeParentInfo(isYKey) {
		writeVarUint(this.restEncoder, isYKey ? 1 : 0);
	}
	/**
	* @param {number} info An unsigned 8-bit integer
	*/
	writeTypeRef(info) {
		writeVarUint(this.restEncoder, info);
	}
	/**
	* Write len of a struct - well suited for Opt RLE encoder.
	*
	* @param {number} len
	*/
	writeLen(len) {
		writeVarUint(this.restEncoder, len);
	}
	/**
	* @param {any} any
	*/
	writeAny(any) {
		writeAny(this.restEncoder, any);
	}
	/**
	* @param {Uint8Array} buf
	*/
	writeBuf(buf) {
		writeVarUint8Array(this.restEncoder, buf);
	}
	/**
	* @param {any} embed
	*/
	writeJSON(embed) {
		writeVarString(this.restEncoder, JSON.stringify(embed));
	}
	/**
	* @param {string} key
	*/
	writeKey(key) {
		writeVarString(this.restEncoder, key);
	}
};
var DSEncoderV2 = class {
	constructor() {
		this.restEncoder = createEncoder();
		this.dsCurrVal = 0;
	}
	toUint8Array() {
		return toUint8Array(this.restEncoder);
	}
	resetDsCurVal() {
		this.dsCurrVal = 0;
	}
	/**
	* @param {number} clock
	*/
	writeDsClock(clock) {
		const diff = clock - this.dsCurrVal;
		this.dsCurrVal = clock;
		writeVarUint(this.restEncoder, diff);
	}
	/**
	* @param {number} len
	*/
	writeDsLen(len) {
		if (len === 0) unexpectedCase();
		writeVarUint(this.restEncoder, len - 1);
		this.dsCurrVal += len;
	}
};
var UpdateEncoderV2 = class extends DSEncoderV2 {
	constructor() {
		super();
		/**
		* @type {Map<string,number>}
		*/
		this.keyMap = /* @__PURE__ */ new Map();
		/**
		* Refers to the next unique key-identifier to me used.
		* See writeKey method for more information.
		*
		* @type {number}
		*/
		this.keyClock = 0;
		this.keyClockEncoder = new IntDiffOptRleEncoder();
		this.clientEncoder = new UintOptRleEncoder();
		this.leftClockEncoder = new IntDiffOptRleEncoder();
		this.rightClockEncoder = new IntDiffOptRleEncoder();
		this.infoEncoder = new RleEncoder(writeUint8);
		this.stringEncoder = new StringEncoder();
		this.parentInfoEncoder = new RleEncoder(writeUint8);
		this.typeRefEncoder = new UintOptRleEncoder();
		this.lenEncoder = new UintOptRleEncoder();
	}
	toUint8Array() {
		const encoder = createEncoder();
		writeVarUint(encoder, 0);
		writeVarUint8Array(encoder, this.keyClockEncoder.toUint8Array());
		writeVarUint8Array(encoder, this.clientEncoder.toUint8Array());
		writeVarUint8Array(encoder, this.leftClockEncoder.toUint8Array());
		writeVarUint8Array(encoder, this.rightClockEncoder.toUint8Array());
		writeVarUint8Array(encoder, toUint8Array(this.infoEncoder));
		writeVarUint8Array(encoder, this.stringEncoder.toUint8Array());
		writeVarUint8Array(encoder, toUint8Array(this.parentInfoEncoder));
		writeVarUint8Array(encoder, this.typeRefEncoder.toUint8Array());
		writeVarUint8Array(encoder, this.lenEncoder.toUint8Array());
		writeUint8Array(encoder, toUint8Array(this.restEncoder));
		return toUint8Array(encoder);
	}
	/**
	* @param {ID} id
	*/
	writeLeftID(id) {
		this.clientEncoder.write(id.client);
		this.leftClockEncoder.write(id.clock);
	}
	/**
	* @param {ID} id
	*/
	writeRightID(id) {
		this.clientEncoder.write(id.client);
		this.rightClockEncoder.write(id.clock);
	}
	/**
	* @param {number} client
	*/
	writeClient(client) {
		this.clientEncoder.write(client);
	}
	/**
	* @param {number} info An unsigned 8-bit integer
	*/
	writeInfo(info) {
		this.infoEncoder.write(info);
	}
	/**
	* @param {string} s
	*/
	writeString(s) {
		this.stringEncoder.write(s);
	}
	/**
	* @param {boolean} isYKey
	*/
	writeParentInfo(isYKey) {
		this.parentInfoEncoder.write(isYKey ? 1 : 0);
	}
	/**
	* @param {number} info An unsigned 8-bit integer
	*/
	writeTypeRef(info) {
		this.typeRefEncoder.write(info);
	}
	/**
	* Write len of a struct - well suited for Opt RLE encoder.
	*
	* @param {number} len
	*/
	writeLen(len) {
		this.lenEncoder.write(len);
	}
	/**
	* @param {any} any
	*/
	writeAny(any) {
		writeAny(this.restEncoder, any);
	}
	/**
	* @param {Uint8Array} buf
	*/
	writeBuf(buf) {
		writeVarUint8Array(this.restEncoder, buf);
	}
	/**
	* This is mainly here for legacy purposes.
	*
	* Initial we incoded objects using JSON. Now we use the much faster lib0/any-encoder. This method mainly exists for legacy purposes for the v1 encoder.
	*
	* @param {any} embed
	*/
	writeJSON(embed) {
		writeAny(this.restEncoder, embed);
	}
	/**
	* Property keys are often reused. For example, in y-prosemirror the key `bold` might
	* occur very often. For a 3d application, the key `position` might occur very often.
	*
	* We cache these keys in a Map and refer to them via a unique number.
	*
	* @param {string} key
	*/
	writeKey(key) {
		const clock = this.keyMap.get(key);
		if (clock === void 0) {
			/**
			* @todo uncomment to introduce this feature finally
			*
			* Background. The ContentFormat object was always encoded using writeKey, but the decoder used to use readString.
			* Furthermore, I forgot to set the keyclock. So everything was working fine.
			*
			* However, this feature here is basically useless as it is not being used (it actually only consumes extra memory).
			*
			* I don't know yet how to reintroduce this feature..
			*
			* Older clients won't be able to read updates when we reintroduce this feature. So this should probably be done using a flag.
			*
			*/
			this.keyClockEncoder.write(this.keyClock++);
			this.stringEncoder.write(key);
		} else this.keyClockEncoder.write(clock);
	}
};
/**
* @module encoding
*/
/**
* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
* @param {Array<GC|Item>} structs All structs by `client`
* @param {number} client
* @param {number} clock write structs starting with `ID(client,clock)`
*
* @function
*/
const writeStructs = (encoder, structs, client, clock) => {
	clock = max(clock, structs[0].id.clock);
	const startNewStructs = findIndexSS(structs, clock);
	writeVarUint(encoder.restEncoder, structs.length - startNewStructs);
	encoder.writeClient(client);
	writeVarUint(encoder.restEncoder, clock);
	const firstStruct = structs[startNewStructs];
	firstStruct.write(encoder, clock - firstStruct.id.clock);
	for (let i = startNewStructs + 1; i < structs.length; i++) structs[i].write(encoder, 0);
};
/**
* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
* @param {StructStore} store
* @param {Map<number,number>} _sm
*
* @private
* @function
*/
const writeClientsStructs = (encoder, store, _sm) => {
	const sm = /* @__PURE__ */ new Map();
	_sm.forEach((clock, client) => {
		if (getState(store, client) > clock) sm.set(client, clock);
	});
	getStateVector(store).forEach((_clock, client) => {
		if (!_sm.has(client)) sm.set(client, 0);
	});
	writeVarUint(encoder.restEncoder, sm.size);
	from(sm.entries()).sort((a, b) => b[0] - a[0]).forEach(([client, clock]) => {
		writeStructs(encoder, store.clients.get(client), client, clock);
	});
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder The decoder object to read data from.
* @param {Doc} doc
* @return {Map<number, { i: number, refs: Array<Item | GC> }>}
*
* @private
* @function
*/
const readClientsStructRefs = (decoder, doc) => {
	/**
	* @type {Map<number, { i: number, refs: Array<Item | GC> }>}
	*/
	const clientRefs = create$5();
	const numOfStateUpdates = readVarUint(decoder.restDecoder);
	for (let i = 0; i < numOfStateUpdates; i++) {
		const numberOfStructs = readVarUint(decoder.restDecoder);
		/**
		* @type {Array<GC|Item>}
		*/
		const refs = new Array(numberOfStructs);
		const client = decoder.readClient();
		let clock = readVarUint(decoder.restDecoder);
		clientRefs.set(client, {
			i: 0,
			refs
		});
		for (let i = 0; i < numberOfStructs; i++) {
			const info = decoder.readInfo();
			switch (31 & info) {
				case 0: {
					const len = decoder.readLen();
					refs[i] = new GC(createID(client, clock), len);
					clock += len;
					break;
				}
				case 10: {
					const len = readVarUint(decoder.restDecoder);
					refs[i] = new Skip(createID(client, clock), len);
					clock += len;
					break;
				}
				default: {
					/**
					* The optimized implementation doesn't use any variables because inlining variables is faster.
					* Below a non-optimized version is shown that implements the basic algorithm with
					* a few comments
					*/
					const cantCopyParentInfo = (info & 192) === 0;
					const struct = new Item(createID(client, clock), null, (info & 128) === 128 ? decoder.readLeftID() : null, null, (info & 64) === 64 ? decoder.readRightID() : null, cantCopyParentInfo ? decoder.readParentInfo() ? doc.get(decoder.readString()) : decoder.readLeftID() : null, cantCopyParentInfo && (info & 32) === 32 ? decoder.readString() : null, readItemContent(decoder, info));
					refs[i] = struct;
					clock += struct.length;
				}
			}
		}
	}
	return clientRefs;
};
/**
* Resume computing structs generated by struct readers.
*
* While there is something to do, we integrate structs in this order
* 1. top element on stack, if stack is not empty
* 2. next element from current struct reader (if empty, use next struct reader)
*
* If struct causally depends on another struct (ref.missing), we put next reader of
* `ref.id.client` on top of stack.
*
* At some point we find a struct that has no causal dependencies,
* then we start emptying the stack.
*
* It is not possible to have circles: i.e. struct1 (from client1) depends on struct2 (from client2)
* depends on struct3 (from client1). Therefore the max stack size is equal to `structReaders.length`.
*
* This method is implemented in a way so that we can resume computation if this update
* causally depends on another update.
*
* @param {Transaction} transaction
* @param {StructStore} store
* @param {Map<number, { i: number, refs: (GC | Item)[] }>} clientsStructRefs
* @return { null | { update: Uint8Array, missing: Map<number,number> } }
*
* @private
* @function
*/
const integrateStructs = (transaction, store, clientsStructRefs) => {
	/**
	* @type {Array<Item | GC>}
	*/
	const stack = [];
	let clientsStructRefsIds = from(clientsStructRefs.keys()).sort((a, b) => a - b);
	if (clientsStructRefsIds.length === 0) return null;
	const getNextStructTarget = () => {
		if (clientsStructRefsIds.length === 0) return null;
		let nextStructsTarget = clientsStructRefs.get(clientsStructRefsIds[clientsStructRefsIds.length - 1]);
		while (nextStructsTarget.refs.length === nextStructsTarget.i) {
			clientsStructRefsIds.pop();
			if (clientsStructRefsIds.length > 0) nextStructsTarget = clientsStructRefs.get(clientsStructRefsIds[clientsStructRefsIds.length - 1]);
			else return null;
		}
		return nextStructsTarget;
	};
	let curStructsTarget = getNextStructTarget();
	if (curStructsTarget === null) return null;
	/**
	* @type {StructStore}
	*/
	const restStructs = new StructStore();
	const missingSV = /* @__PURE__ */ new Map();
	/**
	* @param {number} client
	* @param {number} clock
	*/
	const updateMissingSv = (client, clock) => {
		const mclock = missingSV.get(client);
		if (mclock == null || mclock > clock) missingSV.set(client, clock);
	};
	/**
	* @type {GC|Item}
	*/
	let stackHead = curStructsTarget.refs[curStructsTarget.i++];
	const state = /* @__PURE__ */ new Map();
	const addStackToRestSS = () => {
		for (const item of stack) {
			const client = item.id.client;
			const inapplicableItems = clientsStructRefs.get(client);
			if (inapplicableItems) {
				inapplicableItems.i--;
				restStructs.clients.set(client, inapplicableItems.refs.slice(inapplicableItems.i));
				clientsStructRefs.delete(client);
				inapplicableItems.i = 0;
				inapplicableItems.refs = [];
			} else restStructs.clients.set(client, [item]);
			clientsStructRefsIds = clientsStructRefsIds.filter((c) => c !== client);
		}
		stack.length = 0;
	};
	while (true) {
		if (stackHead.constructor !== Skip) {
			const offset = setIfUndefined(state, stackHead.id.client, () => getState(store, stackHead.id.client)) - stackHead.id.clock;
			if (offset < 0) {
				stack.push(stackHead);
				updateMissingSv(stackHead.id.client, stackHead.id.clock - 1);
				addStackToRestSS();
			} else {
				const missing = stackHead.getMissing(transaction, store);
				if (missing !== null) {
					stack.push(stackHead);
					/**
					* @type {{ refs: Array<GC|Item>, i: number }}
					*/
					const structRefs = clientsStructRefs.get(missing) || {
						refs: [],
						i: 0
					};
					if (structRefs.refs.length === structRefs.i) {
						updateMissingSv(missing, getState(store, missing));
						addStackToRestSS();
					} else {
						stackHead = structRefs.refs[structRefs.i++];
						continue;
					}
				} else if (offset === 0 || offset < stackHead.length) {
					stackHead.integrate(transaction, offset);
					state.set(stackHead.id.client, stackHead.id.clock + stackHead.length);
				}
			}
		}
		if (stack.length > 0) stackHead = stack.pop();
		else if (curStructsTarget !== null && curStructsTarget.i < curStructsTarget.refs.length) stackHead = curStructsTarget.refs[curStructsTarget.i++];
		else {
			curStructsTarget = getNextStructTarget();
			if (curStructsTarget === null) break;
			else stackHead = curStructsTarget.refs[curStructsTarget.i++];
		}
	}
	if (restStructs.clients.size > 0) {
		const encoder = new UpdateEncoderV2();
		writeClientsStructs(encoder, restStructs, /* @__PURE__ */ new Map());
		writeVarUint(encoder.restEncoder, 0);
		return {
			missing: missingSV,
			update: encoder.toUint8Array()
		};
	}
	return null;
};
/**
* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
* @param {Transaction} transaction
*
* @private
* @function
*/
const writeStructsFromTransaction = (encoder, transaction) => writeClientsStructs(encoder, transaction.doc.store, transaction.beforeState);
/**
* Read and apply a document update.
*
* This function has the same effect as `applyUpdate` but accepts a decoder.
*
* @param {decoding.Decoder} decoder
* @param {Doc} ydoc
* @param {any} [transactionOrigin] This will be stored on `transaction.origin` and `.on('update', (update, origin))`
* @param {UpdateDecoderV1 | UpdateDecoderV2} [structDecoder]
*
* @function
*/
const readUpdateV2 = (decoder, ydoc, transactionOrigin, structDecoder = new UpdateDecoderV2(decoder)) => transact$2(ydoc, (transaction) => {
	transaction.local = false;
	let retry = false;
	const doc = transaction.doc;
	const store = doc.store;
	const restStructs = integrateStructs(transaction, store, readClientsStructRefs(structDecoder, doc));
	const pending = store.pendingStructs;
	if (pending) {
		for (const [client, clock] of pending.missing) if (clock < getState(store, client)) {
			retry = true;
			break;
		}
		if (restStructs) {
			for (const [client, clock] of restStructs.missing) {
				const mclock = pending.missing.get(client);
				if (mclock == null || mclock > clock) pending.missing.set(client, clock);
			}
			pending.update = mergeUpdatesV2([pending.update, restStructs.update]);
		}
	} else store.pendingStructs = restStructs;
	const dsRest = readAndApplyDeleteSet(structDecoder, transaction, store);
	if (store.pendingDs) {
		const pendingDSUpdate = new UpdateDecoderV2(createDecoder(store.pendingDs));
		readVarUint(pendingDSUpdate.restDecoder);
		const dsRest2 = readAndApplyDeleteSet(pendingDSUpdate, transaction, store);
		if (dsRest && dsRest2) store.pendingDs = mergeUpdatesV2([dsRest, dsRest2]);
		else store.pendingDs = dsRest || dsRest2;
	} else store.pendingDs = dsRest;
	if (retry) {
		const update = store.pendingStructs.update;
		store.pendingStructs = null;
		applyUpdateV2(transaction.doc, update);
	}
}, transactionOrigin, false);
/**
* Apply a document update created by, for example, `y.on('update', update => ..)` or `update = encodeStateAsUpdate()`.
*
* This function has the same effect as `readUpdate` but accepts an Uint8Array instead of a Decoder.
*
* @param {Doc} ydoc
* @param {Uint8Array} update
* @param {any} [transactionOrigin] This will be stored on `transaction.origin` and `.on('update', (update, origin))`
* @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} [YDecoder]
*
* @function
*/
const applyUpdateV2 = (ydoc, update, transactionOrigin, YDecoder = UpdateDecoderV2) => {
	const decoder = createDecoder(update);
	readUpdateV2(decoder, ydoc, transactionOrigin, new YDecoder(decoder));
};
/**
* Apply a document update created by, for example, `y.on('update', update => ..)` or `update = encodeStateAsUpdate()`.
*
* This function has the same effect as `readUpdate` but accepts an Uint8Array instead of a Decoder.
*
* @param {Doc} ydoc
* @param {Uint8Array} update
* @param {any} [transactionOrigin] This will be stored on `transaction.origin` and `.on('update', (update, origin))`
*
* @function
*/
const applyUpdate = (ydoc, update, transactionOrigin) => applyUpdateV2(ydoc, update, transactionOrigin, UpdateDecoderV1);
/**
* Write all the document as a single update message. If you specify the state of the remote client (`targetStateVector`) it will
* only write the operations that are missing.
*
* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
* @param {Doc} doc
* @param {Map<number,number>} [targetStateVector] The state of the target that receives the update. Leave empty to write all known structs
*
* @function
*/
const writeStateAsUpdate = (encoder, doc, targetStateVector = /* @__PURE__ */ new Map()) => {
	writeClientsStructs(encoder, doc.store, targetStateVector);
	writeDeleteSet(encoder, createDeleteSetFromStructStore(doc.store));
};
/**
* Write all the document as a single update message that can be applied on the remote document. If you specify the state of the remote client (`targetState`) it will
* only write the operations that are missing.
*
* Use `writeStateAsUpdate` instead if you are working with lib0/encoding.js#Encoder
*
* @param {Doc} doc
* @param {Uint8Array} [encodedTargetStateVector] The state of the target that receives the update. Leave empty to write all known structs
* @param {UpdateEncoderV1 | UpdateEncoderV2} [encoder]
* @return {Uint8Array}
*
* @function
*/
const encodeStateAsUpdateV2 = (doc, encodedTargetStateVector = new Uint8Array([0]), encoder = new UpdateEncoderV2()) => {
	writeStateAsUpdate(encoder, doc, decodeStateVector(encodedTargetStateVector));
	const updates = [encoder.toUint8Array()];
	if (doc.store.pendingDs) updates.push(doc.store.pendingDs);
	if (doc.store.pendingStructs) updates.push(diffUpdateV2(doc.store.pendingStructs.update, encodedTargetStateVector));
	if (updates.length > 1) {
		if (encoder.constructor === UpdateEncoderV1) return mergeUpdates(updates.map((update, i) => i === 0 ? update : convertUpdateFormatV2ToV1(update)));
		else if (encoder.constructor === UpdateEncoderV2) return mergeUpdatesV2(updates);
	}
	return updates[0];
};
/**
* Write all the document as a single update message that can be applied on the remote document. If you specify the state of the remote client (`targetState`) it will
* only write the operations that are missing.
*
* Use `writeStateAsUpdate` instead if you are working with lib0/encoding.js#Encoder
*
* @param {Doc} doc
* @param {Uint8Array} [encodedTargetStateVector] The state of the target that receives the update. Leave empty to write all known structs
* @return {Uint8Array}
*
* @function
*/
const encodeStateAsUpdate = (doc, encodedTargetStateVector) => encodeStateAsUpdateV2(doc, encodedTargetStateVector, new UpdateEncoderV1());
/**
* Read state vector from Decoder and return as Map
*
* @param {DSDecoderV1 | DSDecoderV2} decoder
* @return {Map<number,number>} Maps `client` to the number next expected `clock` from that client.
*
* @function
*/
const readStateVector = (decoder) => {
	const ss = /* @__PURE__ */ new Map();
	const ssLength = readVarUint(decoder.restDecoder);
	for (let i = 0; i < ssLength; i++) {
		const client = readVarUint(decoder.restDecoder);
		const clock = readVarUint(decoder.restDecoder);
		ss.set(client, clock);
	}
	return ss;
};
/**
* Read decodedState and return State as Map.
*
* @param {Uint8Array} decodedState
* @return {Map<number,number>} Maps `client` to the number next expected `clock` from that client.
*
* @function
*/
/**
* Read decodedState and return State as Map.
*
* @param {Uint8Array} decodedState
* @return {Map<number,number>} Maps `client` to the number next expected `clock` from that client.
*
* @function
*/
const decodeStateVector = (decodedState) => readStateVector(new DSDecoderV1(createDecoder(decodedState)));
/**
* General event handler implementation.
*
* @template ARG0, ARG1
*
* @private
*/
var EventHandler = class {
	constructor() {
		/**
		* @type {Array<function(ARG0, ARG1):void>}
		*/
		this.l = [];
	}
};
/**
* @template ARG0,ARG1
* @returns {EventHandler<ARG0,ARG1>}
*
* @private
* @function
*/
const createEventHandler = () => new EventHandler();
/**
* Adds an event listener that is called when
* {@link EventHandler#callEventListeners} is called.
*
* @template ARG0,ARG1
* @param {EventHandler<ARG0,ARG1>} eventHandler
* @param {function(ARG0,ARG1):void} f The event handler.
*
* @private
* @function
*/
const addEventHandlerListener = (eventHandler, f) => eventHandler.l.push(f);
/**
* Removes an event listener.
*
* @template ARG0,ARG1
* @param {EventHandler<ARG0,ARG1>} eventHandler
* @param {function(ARG0,ARG1):void} f The event handler that was added with
*                     {@link EventHandler#addEventListener}
*
* @private
* @function
*/
const removeEventHandlerListener = (eventHandler, f) => {
	const l = eventHandler.l;
	const len = l.length;
	eventHandler.l = l.filter((g) => f !== g);
	if (len === eventHandler.l.length) console.error("[yjs] Tried to remove event handler that doesn't exist.");
};
/**
* Call all event listeners that were added via
* {@link EventHandler#addEventListener}.
*
* @template ARG0,ARG1
* @param {EventHandler<ARG0,ARG1>} eventHandler
* @param {ARG0} arg0
* @param {ARG1} arg1
*
* @private
* @function
*/
const callEventHandlerListeners = (eventHandler, arg0, arg1) => callAll(eventHandler.l, [arg0, arg1]);
var ID = class {
	/**
	* @param {number} client client id
	* @param {number} clock unique per client id, continuous number
	*/
	constructor(client, clock) {
		/**
		* Client id
		* @type {number}
		*/
		this.client = client;
		/**
		* unique per client id, continuous number
		* @type {number}
		*/
		this.clock = clock;
	}
};
/**
* @param {ID | null} a
* @param {ID | null} b
* @return {boolean}
*
* @function
*/
const compareIDs = (a, b) => a === b || a !== null && b !== null && a.client === b.client && a.clock === b.clock;
/**
* @param {number} client
* @param {number} clock
*
* @private
* @function
*/
const createID = (client, clock) => new ID(client, clock);
/**
* The top types are mapped from y.share.get(keyname) => type.
* `type` does not store any information about the `keyname`.
* This function finds the correct `keyname` for `type` and throws otherwise.
*
* @param {AbstractType<any>} type
* @return {string}
*
* @private
* @function
*/
const findRootTypeKey = (type) => {
	for (const [key, value] of type.doc.share.entries()) if (value === type) return key;
	throw unexpectedCase();
};
var Snapshot = class {
	/**
	* @param {DeleteSet} ds
	* @param {Map<number,number>} sv state map
	*/
	constructor(ds, sv) {
		/**
		* @type {DeleteSet}
		*/
		this.ds = ds;
		/**
		* State Map
		* @type {Map<number,number>}
		*/
		this.sv = sv;
	}
};
/**
* @param {DeleteSet} ds
* @param {Map<number,number>} sm
* @return {Snapshot}
*/
const createSnapshot = (ds, sm) => new Snapshot(ds, sm);
const emptySnapshot = createSnapshot(createDeleteSet(), /* @__PURE__ */ new Map());
/**
* @param {Item} item
* @param {Snapshot|undefined} snapshot
*
* @protected
* @function
*/
const isVisible = (item, snapshot) => snapshot === void 0 ? !item.deleted : snapshot.sv.has(item.id.client) && (snapshot.sv.get(item.id.client) || 0) > item.id.clock && !isDeleted(snapshot.ds, item.id);
/**
* @param {Transaction} transaction
* @param {Snapshot} snapshot
*/
const splitSnapshotAffectedStructs = (transaction, snapshot) => {
	const meta = setIfUndefined(transaction.meta, splitSnapshotAffectedStructs, create$4);
	const store = transaction.doc.store;
	if (!meta.has(snapshot)) {
		snapshot.sv.forEach((clock, client) => {
			if (clock < getState(store, client)) getItemCleanStart(transaction, createID(client, clock));
		});
		iterateDeletedStructs(transaction, snapshot.ds, (_item) => {});
		meta.add(snapshot);
	}
};
var StructStore = class {
	constructor() {
		/**
		* @type {Map<number,Array<GC|Item>>}
		*/
		this.clients = /* @__PURE__ */ new Map();
		/**
		* @type {null | { missing: Map<number, number>, update: Uint8Array }}
		*/
		this.pendingStructs = null;
		/**
		* @type {null | Uint8Array}
		*/
		this.pendingDs = null;
	}
};
/**
* Return the states as a Map<client,clock>.
* Note that clock refers to the next expected clock id.
*
* @param {StructStore} store
* @return {Map<number,number>}
*
* @public
* @function
*/
const getStateVector = (store) => {
	const sm = /* @__PURE__ */ new Map();
	store.clients.forEach((structs, client) => {
		const struct = structs[structs.length - 1];
		sm.set(client, struct.id.clock + struct.length);
	});
	return sm;
};
/**
* @param {StructStore} store
* @param {number} client
* @return {number}
*
* @public
* @function
*/
const getState = (store, client) => {
	const structs = store.clients.get(client);
	if (structs === void 0) return 0;
	const lastStruct = structs[structs.length - 1];
	return lastStruct.id.clock + lastStruct.length;
};
/**
* @param {StructStore} store
* @param {GC|Item} struct
*
* @private
* @function
*/
const addStruct = (store, struct) => {
	let structs = store.clients.get(struct.id.client);
	if (structs === void 0) {
		structs = [];
		store.clients.set(struct.id.client, structs);
	} else {
		const lastStruct = structs[structs.length - 1];
		if (lastStruct.id.clock + lastStruct.length !== struct.id.clock) throw unexpectedCase();
	}
	structs.push(struct);
};
/**
* Perform a binary search on a sorted array
* @param {Array<Item|GC>} structs
* @param {number} clock
* @return {number}
*
* @private
* @function
*/
const findIndexSS = (structs, clock) => {
	let left = 0;
	let right = structs.length - 1;
	let mid = structs[right];
	let midclock = mid.id.clock;
	if (midclock === clock) return right;
	let midindex = floor(clock / (midclock + mid.length - 1) * right);
	while (left <= right) {
		mid = structs[midindex];
		midclock = mid.id.clock;
		if (midclock <= clock) {
			if (clock < midclock + mid.length) return midindex;
			left = midindex + 1;
		} else right = midindex - 1;
		midindex = floor((left + right) / 2);
	}
	throw unexpectedCase();
};
/**
* Expects that id is actually in store. This function throws or is an infinite loop otherwise.
*
* @param {StructStore} store
* @param {ID} id
* @return {GC|Item}
*
* @private
* @function
*/
const find = (store, id) => {
	/**
	* @type {Array<GC|Item>}
	*/
	const structs = store.clients.get(id.client);
	return structs[findIndexSS(structs, id.clock)];
};
/**
* Expects that id is actually in store. This function throws or is an infinite loop otherwise.
* @private
* @function
*/
const getItem = find;
/**
* @param {Transaction} transaction
* @param {Array<Item|GC>} structs
* @param {number} clock
*/
const findIndexCleanStart = (transaction, structs, clock) => {
	const index = findIndexSS(structs, clock);
	const struct = structs[index];
	if (struct.id.clock < clock && struct instanceof Item) {
		structs.splice(index + 1, 0, splitItem(transaction, struct, clock - struct.id.clock));
		return index + 1;
	}
	return index;
};
/**
* Expects that id is actually in store. This function throws or is an infinite loop otherwise.
*
* @param {Transaction} transaction
* @param {ID} id
* @return {Item}
*
* @private
* @function
*/
const getItemCleanStart = (transaction, id) => {
	const structs = transaction.doc.store.clients.get(id.client);
	return structs[findIndexCleanStart(transaction, structs, id.clock)];
};
/**
* Expects that id is actually in store. This function throws or is an infinite loop otherwise.
*
* @param {Transaction} transaction
* @param {StructStore} store
* @param {ID} id
* @return {Item}
*
* @private
* @function
*/
const getItemCleanEnd = (transaction, store, id) => {
	/**
	* @type {Array<Item>}
	*/
	const structs = store.clients.get(id.client);
	const index = findIndexSS(structs, id.clock);
	const struct = structs[index];
	if (id.clock !== struct.id.clock + struct.length - 1 && struct.constructor !== GC) structs.splice(index + 1, 0, splitItem(transaction, struct, id.clock - struct.id.clock + 1));
	return struct;
};
/**
* Replace `item` with `newitem` in store
* @param {StructStore} store
* @param {GC|Item} struct
* @param {GC|Item} newStruct
*
* @private
* @function
*/
const replaceStruct = (store, struct, newStruct) => {
	const structs = store.clients.get(struct.id.client);
	structs[findIndexSS(structs, struct.id.clock)] = newStruct;
};
/**
* Iterate over a range of structs
*
* @param {Transaction} transaction
* @param {Array<Item|GC>} structs
* @param {number} clockStart Inclusive start
* @param {number} len
* @param {function(GC|Item):void} f
*
* @function
*/
const iterateStructs = (transaction, structs, clockStart, len, f) => {
	if (len === 0) return;
	const clockEnd = clockStart + len;
	let index = findIndexCleanStart(transaction, structs, clockStart);
	let struct;
	do {
		struct = structs[index++];
		if (clockEnd < struct.id.clock + struct.length) findIndexCleanStart(transaction, structs, clockEnd);
		f(struct);
	} while (index < structs.length && structs[index].id.clock < clockEnd);
};
/**
* A transaction is created for every change on the Yjs model. It is possible
* to bundle changes on the Yjs model in a single transaction to
* minimize the number on messages sent and the number of observer calls.
* If possible the user of this library should bundle as many changes as
* possible. Here is an example to illustrate the advantages of bundling:
*
* @example
* const ydoc = new Y.Doc()
* const map = ydoc.getMap('map')
* // Log content when change is triggered
* map.observe(() => {
*   console.log('change triggered')
* })
* // Each change on the map type triggers a log message:
* map.set('a', 0) // => "change triggered"
* map.set('b', 0) // => "change triggered"
* // When put in a transaction, it will trigger the log after the transaction:
* ydoc.transact(() => {
*   map.set('a', 1)
*   map.set('b', 1)
* }) // => "change triggered"
*
* @public
*/
var Transaction = class {
	/**
	* @param {Doc} doc
	* @param {any} origin
	* @param {boolean} local
	*/
	constructor(doc, origin, local) {
		/**
		* The Yjs instance.
		* @type {Doc}
		*/
		this.doc = doc;
		/**
		* Describes the set of deleted items by ids
		* @type {DeleteSet}
		*/
		this.deleteSet = new DeleteSet();
		/**
		* Holds the state before the transaction started.
		* @type {Map<Number,Number>}
		*/
		this.beforeState = getStateVector(doc.store);
		/**
		* Holds the state after the transaction.
		* @type {Map<Number,Number>}
		*/
		this.afterState = /* @__PURE__ */ new Map();
		/**
		* All types that were directly modified (property added or child
		* inserted/deleted). New types are not included in this Set.
		* Maps from type to parentSubs (`item.parentSub = null` for YArray)
		* @type {Map<AbstractType<YEvent<any>>,Set<String|null>>}
		*/
		this.changed = /* @__PURE__ */ new Map();
		/**
		* Stores the events for the types that observe also child elements.
		* It is mainly used by `observeDeep`.
		* @type {Map<AbstractType<YEvent<any>>,Array<YEvent<any>>>}
		*/
		this.changedParentTypes = /* @__PURE__ */ new Map();
		/**
		* @type {Array<AbstractStruct>}
		*/
		this._mergeStructs = [];
		/**
		* @type {any}
		*/
		this.origin = origin;
		/**
		* Stores meta information on the transaction
		* @type {Map<any,any>}
		*/
		this.meta = /* @__PURE__ */ new Map();
		/**
		* Whether this change originates from this doc.
		* @type {boolean}
		*/
		this.local = local;
		/**
		* @type {Set<Doc>}
		*/
		this.subdocsAdded = /* @__PURE__ */ new Set();
		/**
		* @type {Set<Doc>}
		*/
		this.subdocsRemoved = /* @__PURE__ */ new Set();
		/**
		* @type {Set<Doc>}
		*/
		this.subdocsLoaded = /* @__PURE__ */ new Set();
		/**
		* @type {boolean}
		*/
		this._needFormattingCleanup = false;
	}
};
/**
* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
* @param {Transaction} transaction
* @return {boolean} Whether data was written.
*/
const writeUpdateMessageFromTransaction = (encoder, transaction) => {
	if (transaction.deleteSet.clients.size === 0 && !any(transaction.afterState, (clock, client) => transaction.beforeState.get(client) !== clock)) return false;
	sortAndMergeDeleteSet(transaction.deleteSet);
	writeStructsFromTransaction(encoder, transaction);
	writeDeleteSet(encoder, transaction.deleteSet);
	return true;
};
/**
* If `type.parent` was added in current transaction, `type` technically
* did not change, it was just added and we should not fire events for `type`.
*
* @param {Transaction} transaction
* @param {AbstractType<YEvent<any>>} type
* @param {string|null} parentSub
*/
const addChangedTypeToTransaction = (transaction, type, parentSub) => {
	const item = type._item;
	if (item === null || item.id.clock < (transaction.beforeState.get(item.id.client) || 0) && !item.deleted) setIfUndefined(transaction.changed, type, create$4).add(parentSub);
};
/**
* @param {Array<AbstractStruct>} structs
* @param {number} pos
* @return {number} # of merged structs
*/
const tryToMergeWithLefts = (structs, pos) => {
	let right = structs[pos];
	let left = structs[pos - 1];
	let i = pos;
	for (; i > 0; right = left, left = structs[--i - 1]) {
		if (left.deleted === right.deleted && left.constructor === right.constructor) {
			if (left.mergeWith(right)) {
				if (right instanceof Item && right.parentSub !== null && right.parent._map.get(right.parentSub) === right)
 /** @type {AbstractType<any>} */ right.parent._map.set(right.parentSub, left);
				continue;
			}
		}
		break;
	}
	const merged = pos - i;
	if (merged) structs.splice(pos + 1 - merged, merged);
	return merged;
};
/**
* @param {DeleteSet} ds
* @param {StructStore} store
* @param {function(Item):boolean} gcFilter
*/
const tryGcDeleteSet = (ds, store, gcFilter) => {
	for (const [client, deleteItems] of ds.clients.entries()) {
		const structs = store.clients.get(client);
		for (let di = deleteItems.length - 1; di >= 0; di--) {
			const deleteItem = deleteItems[di];
			const endDeleteItemClock = deleteItem.clock + deleteItem.len;
			for (let si = findIndexSS(structs, deleteItem.clock), struct = structs[si]; si < structs.length && struct.id.clock < endDeleteItemClock; struct = structs[++si]) {
				const struct = structs[si];
				if (deleteItem.clock + deleteItem.len <= struct.id.clock) break;
				if (struct instanceof Item && struct.deleted && !struct.keep && gcFilter(struct)) struct.gc(store, false);
			}
		}
	}
};
/**
* @param {DeleteSet} ds
* @param {StructStore} store
*/
const tryMergeDeleteSet = (ds, store) => {
	ds.clients.forEach((deleteItems, client) => {
		const structs = store.clients.get(client);
		for (let di = deleteItems.length - 1; di >= 0; di--) {
			const deleteItem = deleteItems[di];
			const mostRightIndexToCheck = min(structs.length - 1, 1 + findIndexSS(structs, deleteItem.clock + deleteItem.len - 1));
			for (let si = mostRightIndexToCheck, struct = structs[si]; si > 0 && struct.id.clock >= deleteItem.clock; struct = structs[si]) si -= 1 + tryToMergeWithLefts(structs, si);
		}
	});
};
/**
* @param {Array<Transaction>} transactionCleanups
* @param {number} i
*/
const cleanupTransactions = (transactionCleanups, i) => {
	if (i < transactionCleanups.length) {
		const transaction = transactionCleanups[i];
		const doc = transaction.doc;
		const store = doc.store;
		const ds = transaction.deleteSet;
		const mergeStructs = transaction._mergeStructs;
		try {
			sortAndMergeDeleteSet(ds);
			transaction.afterState = getStateVector(transaction.doc.store);
			doc.emit("beforeObserverCalls", [transaction, doc]);
			/**
			* An array of event callbacks.
			*
			* Each callback is called even if the other ones throw errors.
			*
			* @type {Array<function():void>}
			*/
			const fs = [];
			transaction.changed.forEach((subs, itemtype) => fs.push(() => {
				if (itemtype._item === null || !itemtype._item.deleted) itemtype._callObserver(transaction, subs);
			}));
			fs.push(() => {
				transaction.changedParentTypes.forEach((events, type) => {
					if (type._dEH.l.length > 0 && (type._item === null || !type._item.deleted)) {
						events = events.filter((event) => event.target._item === null || !event.target._item.deleted);
						events.forEach((event) => {
							event.currentTarget = type;
							event._path = null;
						});
						events.sort((event1, event2) => event1.path.length - event2.path.length);
						fs.push(() => {
							callEventHandlerListeners(type._dEH, events, transaction);
						});
					}
				});
				fs.push(() => doc.emit("afterTransaction", [transaction, doc]));
				fs.push(() => {
					if (transaction._needFormattingCleanup) cleanupYTextAfterTransaction(transaction);
				});
			});
			callAll(fs, []);
		} finally {
			if (doc.gc) tryGcDeleteSet(ds, store, doc.gcFilter);
			tryMergeDeleteSet(ds, store);
			transaction.afterState.forEach((clock, client) => {
				const beforeClock = transaction.beforeState.get(client) || 0;
				if (beforeClock !== clock) {
					const structs = store.clients.get(client);
					const firstChangePos = max(findIndexSS(structs, beforeClock), 1);
					for (let i = structs.length - 1; i >= firstChangePos;) i -= 1 + tryToMergeWithLefts(structs, i);
				}
			});
			for (let i = mergeStructs.length - 1; i >= 0; i--) {
				const { client, clock } = mergeStructs[i].id;
				const structs = store.clients.get(client);
				const replacedStructPos = findIndexSS(structs, clock);
				if (replacedStructPos + 1 < structs.length) {
					if (tryToMergeWithLefts(structs, replacedStructPos + 1) > 1) continue;
				}
				if (replacedStructPos > 0) tryToMergeWithLefts(structs, replacedStructPos);
			}
			if (!transaction.local && transaction.afterState.get(doc.clientID) !== transaction.beforeState.get(doc.clientID)) {
				print(ORANGE, BOLD, "[yjs] ", UNBOLD, RED, "Changed the client-id because another client seems to be using it.");
				doc.clientID = generateNewClientId();
			}
			doc.emit("afterTransactionCleanup", [transaction, doc]);
			if (doc._observers.has("update")) {
				const encoder = new UpdateEncoderV1();
				if (writeUpdateMessageFromTransaction(encoder, transaction)) doc.emit("update", [
					encoder.toUint8Array(),
					transaction.origin,
					doc,
					transaction
				]);
			}
			if (doc._observers.has("updateV2")) {
				const encoder = new UpdateEncoderV2();
				if (writeUpdateMessageFromTransaction(encoder, transaction)) doc.emit("updateV2", [
					encoder.toUint8Array(),
					transaction.origin,
					doc,
					transaction
				]);
			}
			const { subdocsAdded, subdocsLoaded, subdocsRemoved } = transaction;
			if (subdocsAdded.size > 0 || subdocsRemoved.size > 0 || subdocsLoaded.size > 0) {
				subdocsAdded.forEach((subdoc) => {
					subdoc.clientID = doc.clientID;
					if (subdoc.collectionid == null) subdoc.collectionid = doc.collectionid;
					doc.subdocs.add(subdoc);
				});
				subdocsRemoved.forEach((subdoc) => doc.subdocs.delete(subdoc));
				doc.emit("subdocs", [
					{
						loaded: subdocsLoaded,
						added: subdocsAdded,
						removed: subdocsRemoved
					},
					doc,
					transaction
				]);
				subdocsRemoved.forEach((subdoc) => subdoc.destroy());
			}
			if (transactionCleanups.length <= i + 1) {
				doc._transactionCleanups = [];
				doc.emit("afterAllTransactions", [doc, transactionCleanups]);
			} else cleanupTransactions(transactionCleanups, i + 1);
		}
	}
};
/**
* Implements the functionality of `y.transact(()=>{..})`
*
* @template T
* @param {Doc} doc
* @param {function(Transaction):T} f
* @param {any} [origin=true]
* @return {T}
*
* @function
*/
const transact$2 = (doc, f, origin = null, local = true) => {
	const transactionCleanups = doc._transactionCleanups;
	let initialCall = false;
	/**
	* @type {any}
	*/
	let result = null;
	if (doc._transaction === null) {
		initialCall = true;
		doc._transaction = new Transaction(doc, origin, local);
		transactionCleanups.push(doc._transaction);
		if (transactionCleanups.length === 1) doc.emit("beforeAllTransactions", [doc]);
		doc.emit("beforeTransaction", [doc._transaction, doc]);
	}
	try {
		result = f(doc._transaction);
	} finally {
		if (initialCall) {
			const finishCleanup = doc._transaction === transactionCleanups[0];
			doc._transaction = null;
			if (finishCleanup) cleanupTransactions(transactionCleanups, 0);
		}
	}
	return result;
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
*/
function* lazyStructReaderGenerator(decoder) {
	const numOfStateUpdates = readVarUint(decoder.restDecoder);
	for (let i = 0; i < numOfStateUpdates; i++) {
		const numberOfStructs = readVarUint(decoder.restDecoder);
		const client = decoder.readClient();
		let clock = readVarUint(decoder.restDecoder);
		for (let i = 0; i < numberOfStructs; i++) {
			const info = decoder.readInfo();
			if (info === 10) {
				const len = readVarUint(decoder.restDecoder);
				yield new Skip(createID(client, clock), len);
				clock += len;
			} else if ((31 & info) !== 0) {
				const cantCopyParentInfo = (info & 192) === 0;
				const struct = new Item(createID(client, clock), null, (info & 128) === 128 ? decoder.readLeftID() : null, null, (info & 64) === 64 ? decoder.readRightID() : null, cantCopyParentInfo ? decoder.readParentInfo() ? decoder.readString() : decoder.readLeftID() : null, cantCopyParentInfo && (info & 32) === 32 ? decoder.readString() : null, readItemContent(decoder, info));
				yield struct;
				clock += struct.length;
			} else {
				const len = decoder.readLen();
				yield new GC(createID(client, clock), len);
				clock += len;
			}
		}
	}
}
var LazyStructReader = class {
	/**
	* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
	* @param {boolean} filterSkips
	*/
	constructor(decoder, filterSkips) {
		this.gen = lazyStructReaderGenerator(decoder);
		/**
		* @type {null | Item | Skip | GC}
		*/
		this.curr = null;
		this.done = false;
		this.filterSkips = filterSkips;
		this.next();
	}
	/**
	* @return {Item | GC | Skip |null}
	*/
	next() {
		do
			this.curr = this.gen.next().value || null;
		while (this.filterSkips && this.curr !== null && this.curr.constructor === Skip);
		return this.curr;
	}
};
var LazyStructWriter = class {
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	*/
	constructor(encoder) {
		this.currClient = 0;
		this.startClock = 0;
		this.written = 0;
		this.encoder = encoder;
		/**
		* We want to write operations lazily, but also we need to know beforehand how many operations we want to write for each client.
		*
		* This kind of meta-information (#clients, #structs-per-client-written) is written to the restEncoder.
		*
		* We fragment the restEncoder and store a slice of it per-client until we know how many clients there are.
		* When we flush (toUint8Array) we write the restEncoder using the fragments and the meta-information.
		*
		* @type {Array<{ written: number, restEncoder: Uint8Array }>}
		*/
		this.clientStructs = [];
	}
};
/**
* @param {Array<Uint8Array>} updates
* @return {Uint8Array}
*/
const mergeUpdates = (updates) => mergeUpdatesV2(updates, UpdateDecoderV1, UpdateEncoderV1);
/**
* This method is intended to slice any kind of struct and retrieve the right part.
* It does not handle side-effects, so it should only be used by the lazy-encoder.
*
* @param {Item | GC | Skip} left
* @param {number} diff
* @return {Item | GC}
*/
const sliceStruct = (left, diff) => {
	if (left.constructor === GC) {
		const { client, clock } = left.id;
		return new GC(createID(client, clock + diff), left.length - diff);
	} else if (left.constructor === Skip) {
		const { client, clock } = left.id;
		return new Skip(createID(client, clock + diff), left.length - diff);
	} else {
		const leftItem = left;
		const { client, clock } = leftItem.id;
		return new Item(createID(client, clock + diff), null, createID(client, clock + diff - 1), null, leftItem.rightOrigin, leftItem.parent, leftItem.parentSub, leftItem.content.splice(diff));
	}
};
/**
*
* This function works similarly to `readUpdateV2`.
*
* @param {Array<Uint8Array>} updates
* @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} [YDecoder]
* @param {typeof UpdateEncoderV1 | typeof UpdateEncoderV2} [YEncoder]
* @return {Uint8Array}
*/
const mergeUpdatesV2 = (updates, YDecoder = UpdateDecoderV2, YEncoder = UpdateEncoderV2) => {
	if (updates.length === 1) return updates[0];
	const updateDecoders = updates.map((update) => new YDecoder(createDecoder(update)));
	let lazyStructDecoders = updateDecoders.map((decoder) => new LazyStructReader(decoder, true));
	/**
	* @todo we don't need offset because we always slice before
	* @type {null | { struct: Item | GC | Skip, offset: number }}
	*/
	let currWrite = null;
	const updateEncoder = new YEncoder();
	const lazyStructEncoder = new LazyStructWriter(updateEncoder);
	while (true) {
		lazyStructDecoders = lazyStructDecoders.filter((dec) => dec.curr !== null);
		lazyStructDecoders.sort(
			/** @type {function(any,any):number} */
			(dec1, dec2) => {
				if (dec1.curr.id.client === dec2.curr.id.client) {
					const clockDiff = dec1.curr.id.clock - dec2.curr.id.clock;
					if (clockDiff === 0) return dec1.curr.constructor === dec2.curr.constructor ? 0 : dec1.curr.constructor === Skip ? 1 : -1;
					else return clockDiff;
				} else return dec2.curr.id.client - dec1.curr.id.client;
			}
		);
		if (lazyStructDecoders.length === 0) break;
		const currDecoder = lazyStructDecoders[0];
		const firstClient = currDecoder.curr.id.client;
		if (currWrite !== null) {
			let curr = currDecoder.curr;
			let iterated = false;
			while (curr !== null && curr.id.clock + curr.length <= currWrite.struct.id.clock + currWrite.struct.length && curr.id.client >= currWrite.struct.id.client) {
				curr = currDecoder.next();
				iterated = true;
			}
			if (curr === null || curr.id.client !== firstClient || iterated && curr.id.clock > currWrite.struct.id.clock + currWrite.struct.length) continue;
			if (firstClient !== currWrite.struct.id.client) {
				writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
				currWrite = {
					struct: curr,
					offset: 0
				};
				currDecoder.next();
			} else if (currWrite.struct.id.clock + currWrite.struct.length < curr.id.clock) if (currWrite.struct.constructor === Skip) currWrite.struct.length = curr.id.clock + curr.length - currWrite.struct.id.clock;
			else {
				writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
				const diff = curr.id.clock - currWrite.struct.id.clock - currWrite.struct.length;
				currWrite = {
					struct: new Skip(createID(firstClient, currWrite.struct.id.clock + currWrite.struct.length), diff),
					offset: 0
				};
			}
			else {
				const diff = currWrite.struct.id.clock + currWrite.struct.length - curr.id.clock;
				if (diff > 0) if (currWrite.struct.constructor === Skip) currWrite.struct.length -= diff;
				else curr = sliceStruct(curr, diff);
				if (!currWrite.struct.mergeWith(curr)) {
					writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
					currWrite = {
						struct: curr,
						offset: 0
					};
					currDecoder.next();
				}
			}
		} else {
			currWrite = {
				struct: currDecoder.curr,
				offset: 0
			};
			currDecoder.next();
		}
		for (let next = currDecoder.curr; next !== null && next.id.client === firstClient && next.id.clock === currWrite.struct.id.clock + currWrite.struct.length && next.constructor !== Skip; next = currDecoder.next()) {
			writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
			currWrite = {
				struct: next,
				offset: 0
			};
		}
	}
	if (currWrite !== null) {
		writeStructToLazyStructWriter(lazyStructEncoder, currWrite.struct, currWrite.offset);
		currWrite = null;
	}
	finishLazyStructWriting(lazyStructEncoder);
	writeDeleteSet(updateEncoder, mergeDeleteSets(updateDecoders.map((decoder) => readDeleteSet(decoder))));
	return updateEncoder.toUint8Array();
};
/**
* @param {Uint8Array} update
* @param {Uint8Array} sv
* @param {typeof UpdateDecoderV1 | typeof UpdateDecoderV2} [YDecoder]
* @param {typeof UpdateEncoderV1 | typeof UpdateEncoderV2} [YEncoder]
*/
const diffUpdateV2 = (update, sv, YDecoder = UpdateDecoderV2, YEncoder = UpdateEncoderV2) => {
	const state = decodeStateVector(sv);
	const encoder = new YEncoder();
	const lazyStructWriter = new LazyStructWriter(encoder);
	const decoder = new YDecoder(createDecoder(update));
	const reader = new LazyStructReader(decoder, false);
	while (reader.curr) {
		const curr = reader.curr;
		const currClient = curr.id.client;
		const svClock = state.get(currClient) || 0;
		if (reader.curr.constructor === Skip) {
			reader.next();
			continue;
		}
		if (curr.id.clock + curr.length > svClock) {
			writeStructToLazyStructWriter(lazyStructWriter, curr, max(svClock - curr.id.clock, 0));
			reader.next();
			while (reader.curr && reader.curr.id.client === currClient) {
				writeStructToLazyStructWriter(lazyStructWriter, reader.curr, 0);
				reader.next();
			}
		} else while (reader.curr && reader.curr.id.client === currClient && reader.curr.id.clock + reader.curr.length <= svClock) reader.next();
	}
	finishLazyStructWriting(lazyStructWriter);
	writeDeleteSet(encoder, readDeleteSet(decoder));
	return encoder.toUint8Array();
};
/**
* @param {LazyStructWriter} lazyWriter
*/
const flushLazyStructWriter = (lazyWriter) => {
	if (lazyWriter.written > 0) {
		lazyWriter.clientStructs.push({
			written: lazyWriter.written,
			restEncoder: toUint8Array(lazyWriter.encoder.restEncoder)
		});
		lazyWriter.encoder.restEncoder = createEncoder();
		lazyWriter.written = 0;
	}
};
/**
* @param {LazyStructWriter} lazyWriter
* @param {Item | GC} struct
* @param {number} offset
*/
const writeStructToLazyStructWriter = (lazyWriter, struct, offset) => {
	if (lazyWriter.written > 0 && lazyWriter.currClient !== struct.id.client) flushLazyStructWriter(lazyWriter);
	if (lazyWriter.written === 0) {
		lazyWriter.currClient = struct.id.client;
		lazyWriter.encoder.writeClient(struct.id.client);
		writeVarUint(lazyWriter.encoder.restEncoder, struct.id.clock + offset);
	}
	struct.write(lazyWriter.encoder, offset);
	lazyWriter.written++;
};
/**
* Call this function when we collected all parts and want to
* put all the parts together. After calling this method,
* you can continue using the UpdateEncoder.
*
* @param {LazyStructWriter} lazyWriter
*/
const finishLazyStructWriting = (lazyWriter) => {
	flushLazyStructWriter(lazyWriter);
	const restEncoder = lazyWriter.encoder.restEncoder;
	/**
	* Now we put all the fragments together.
	* This works similarly to `writeClientsStructs`
	*/
	writeVarUint(restEncoder, lazyWriter.clientStructs.length);
	for (let i = 0; i < lazyWriter.clientStructs.length; i++) {
		const partStructs = lazyWriter.clientStructs[i];
		/**
		* Works similarly to `writeStructs`
		*/
		writeVarUint(restEncoder, partStructs.written);
		writeUint8Array(restEncoder, partStructs.restEncoder);
	}
};
/**
* @param {Uint8Array} update
* @param {function(Item|GC|Skip):Item|GC|Skip} blockTransformer
* @param {typeof UpdateDecoderV2 | typeof UpdateDecoderV1} YDecoder
* @param {typeof UpdateEncoderV2 | typeof UpdateEncoderV1 } YEncoder
*/
const convertUpdateFormat = (update, blockTransformer, YDecoder, YEncoder) => {
	const updateDecoder = new YDecoder(createDecoder(update));
	const lazyDecoder = new LazyStructReader(updateDecoder, false);
	const updateEncoder = new YEncoder();
	const lazyWriter = new LazyStructWriter(updateEncoder);
	for (let curr = lazyDecoder.curr; curr !== null; curr = lazyDecoder.next()) writeStructToLazyStructWriter(lazyWriter, blockTransformer(curr), 0);
	finishLazyStructWriting(lazyWriter);
	writeDeleteSet(updateEncoder, readDeleteSet(updateDecoder));
	return updateEncoder.toUint8Array();
};
/**
* @param {Uint8Array} update
*/
const convertUpdateFormatV2ToV1 = (update) => convertUpdateFormat(update, id, UpdateDecoderV2, UpdateEncoderV1);
const errorComputeChanges = "You must not compute changes after the event-handler fired.";
/**
* @template {AbstractType<any>} T
* YEvent describes the changes on a YType.
*/
var YEvent = class {
	/**
	* @param {T} target The changed type.
	* @param {Transaction} transaction
	*/
	constructor(target, transaction) {
		/**
		* The type on which this event was created on.
		* @type {T}
		*/
		this.target = target;
		/**
		* The current target on which the observe callback is called.
		* @type {AbstractType<any>}
		*/
		this.currentTarget = target;
		/**
		* The transaction that triggered this event.
		* @type {Transaction}
		*/
		this.transaction = transaction;
		/**
		* @type {Object|null}
		*/
		this._changes = null;
		/**
		* @type {null | Map<string, { action: 'add' | 'update' | 'delete', oldValue: any }>}
		*/
		this._keys = null;
		/**
		* @type {null | Array<{ insert?: string | Array<any> | object | AbstractType<any>, retain?: number, delete?: number, attributes?: Object<string, any> }>}
		*/
		this._delta = null;
		/**
		* @type {Array<string|number>|null}
		*/
		this._path = null;
	}
	/**
	* Computes the path from `y` to the changed type.
	*
	* @todo v14 should standardize on path: Array<{parent, index}> because that is easier to work with.
	*
	* The following property holds:
	* @example
	*   let type = y
	*   event.path.forEach(dir => {
	*     type = type.get(dir)
	*   })
	*   type === event.target // => true
	*/
	get path() {
		return this._path || (this._path = getPathTo(this.currentTarget, this.target));
	}
	/**
	* Check if a struct is deleted by this event.
	*
	* In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
	*
	* @param {AbstractStruct} struct
	* @return {boolean}
	*/
	deletes(struct) {
		return isDeleted(this.transaction.deleteSet, struct.id);
	}
	/**
	* @type {Map<string, { action: 'add' | 'update' | 'delete', oldValue: any }>}
	*/
	get keys() {
		if (this._keys === null) {
			if (this.transaction.doc._transactionCleanups.length === 0) throw create$3(errorComputeChanges);
			const keys = /* @__PURE__ */ new Map();
			const target = this.target;
			this.transaction.changed.get(target).forEach((key) => {
				if (key !== null) {
					const item = target._map.get(key);
					/**
					* @type {'delete' | 'add' | 'update'}
					*/
					let action;
					let oldValue;
					if (this.adds(item)) {
						let prev = item.left;
						while (prev !== null && this.adds(prev)) prev = prev.left;
						if (this.deletes(item)) if (prev !== null && this.deletes(prev)) {
							action = "delete";
							oldValue = last(prev.content.getContent());
						} else return;
						else if (prev !== null && this.deletes(prev)) {
							action = "update";
							oldValue = last(prev.content.getContent());
						} else {
							action = "add";
							oldValue = void 0;
						}
					} else if (this.deletes(item)) {
						action = "delete";
						oldValue = last(
							/** @type {Item} */
							item.content.getContent()
						);
					} else return;
					keys.set(key, {
						action,
						oldValue
					});
				}
			});
			this._keys = keys;
		}
		return this._keys;
	}
	/**
	* This is a computed property. Note that this can only be safely computed during the
	* event call. Computing this property after other changes happened might result in
	* unexpected behavior (incorrect computation of deltas). A safe way to collect changes
	* is to store the `changes` or the `delta` object. Avoid storing the `transaction` object.
	*
	* @type {Array<{insert?: string | Array<any> | object | AbstractType<any>, retain?: number, delete?: number, attributes?: Object<string, any>}>}
	*/
	get delta() {
		return this.changes.delta;
	}
	/**
	* Check if a struct is added by this event.
	*
	* In contrast to change.deleted, this method also returns true if the struct was added and then deleted.
	*
	* @param {AbstractStruct} struct
	* @return {boolean}
	*/
	adds(struct) {
		return struct.id.clock >= (this.transaction.beforeState.get(struct.id.client) || 0);
	}
	/**
	* This is a computed property. Note that this can only be safely computed during the
	* event call. Computing this property after other changes happened might result in
	* unexpected behavior (incorrect computation of deltas). A safe way to collect changes
	* is to store the `changes` or the `delta` object. Avoid storing the `transaction` object.
	*
	* @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string, delete?:number, retain?:number}>}}
	*/
	get changes() {
		let changes = this._changes;
		if (changes === null) {
			if (this.transaction.doc._transactionCleanups.length === 0) throw create$3(errorComputeChanges);
			const target = this.target;
			const added = create$4();
			const deleted = create$4();
			/**
			* @type {Array<{insert:Array<any>}|{delete:number}|{retain:number}>}
			*/
			const delta = [];
			changes = {
				added,
				deleted,
				delta,
				keys: this.keys
			};
			if (this.transaction.changed.get(target).has(null)) {
				/**
				* @type {any}
				*/
				let lastOp = null;
				const packOp = () => {
					if (lastOp) delta.push(lastOp);
				};
				for (let item = target._start; item !== null; item = item.right) if (item.deleted) {
					if (this.deletes(item) && !this.adds(item)) {
						if (lastOp === null || lastOp.delete === void 0) {
							packOp();
							lastOp = { delete: 0 };
						}
						lastOp.delete += item.length;
						deleted.add(item);
					}
				} else if (this.adds(item)) {
					if (lastOp === null || lastOp.insert === void 0) {
						packOp();
						lastOp = { insert: [] };
					}
					lastOp.insert = lastOp.insert.concat(item.content.getContent());
					added.add(item);
				} else {
					if (lastOp === null || lastOp.retain === void 0) {
						packOp();
						lastOp = { retain: 0 };
					}
					lastOp.retain += item.length;
				}
				if (lastOp !== null && lastOp.retain === void 0) packOp();
			}
			this._changes = changes;
		}
		return changes;
	}
};
/**
* Compute the path from this type to the specified target.
*
* @example
*   // `child` should be accessible via `type.get(path[0]).get(path[1])..`
*   const path = type.getPathTo(child)
*   // assuming `type instanceof YArray`
*   console.log(path) // might look like => [2, 'key1']
*   child === type.get(path[0]).get(path[1])
*
* @param {AbstractType<any>} parent
* @param {AbstractType<any>} child target
* @return {Array<string|number>} Path to the target
*
* @private
* @function
*/
const getPathTo = (parent, child) => {
	const path = [];
	while (child._item !== null && child !== parent) {
		if (child._item.parentSub !== null) path.unshift(child._item.parentSub);
		else {
			let i = 0;
			let c = child._item.parent._start;
			while (c !== child._item && c !== null) {
				if (!c.deleted && c.countable) i += c.length;
				c = c.right;
			}
			path.unshift(i);
		}
		child = child._item.parent;
	}
	return path;
};
/**
* https://docs.yjs.dev/getting-started/working-with-shared-types#caveats
*/
const warnPrematureAccess = () => {
	warn("Invalid access: Add Yjs type to a document before reading data.");
};
const maxSearchMarker = 80;
/**
* A unique timestamp that identifies each marker.
*
* Time is relative,.. this is more like an ever-increasing clock.
*
* @type {number}
*/
let globalSearchMarkerTimestamp = 0;
var ArraySearchMarker = class {
	/**
	* @param {Item} p
	* @param {number} index
	*/
	constructor(p, index) {
		p.marker = true;
		this.p = p;
		this.index = index;
		this.timestamp = globalSearchMarkerTimestamp++;
	}
};
/**
* @param {ArraySearchMarker} marker
*/
const refreshMarkerTimestamp = (marker) => {
	marker.timestamp = globalSearchMarkerTimestamp++;
};
/**
* This is rather complex so this function is the only thing that should overwrite a marker
*
* @param {ArraySearchMarker} marker
* @param {Item} p
* @param {number} index
*/
const overwriteMarker = (marker, p, index) => {
	marker.p.marker = false;
	marker.p = p;
	p.marker = true;
	marker.index = index;
	marker.timestamp = globalSearchMarkerTimestamp++;
};
/**
* @param {Array<ArraySearchMarker>} searchMarker
* @param {Item} p
* @param {number} index
*/
const markPosition = (searchMarker, p, index) => {
	if (searchMarker.length >= maxSearchMarker) {
		const marker = searchMarker.reduce((a, b) => a.timestamp < b.timestamp ? a : b);
		overwriteMarker(marker, p, index);
		return marker;
	} else {
		const pm = new ArraySearchMarker(p, index);
		searchMarker.push(pm);
		return pm;
	}
};
/**
* Search marker help us to find positions in the associative array faster.
*
* They speed up the process of finding a position without much bookkeeping.
*
* A maximum of `maxSearchMarker` objects are created.
*
* This function always returns a refreshed marker (updated timestamp)
*
* @param {AbstractType<any>} yarray
* @param {number} index
*/
const findMarker = (yarray, index) => {
	if (yarray._start === null || index === 0 || yarray._searchMarker === null) return null;
	const marker = yarray._searchMarker.length === 0 ? null : yarray._searchMarker.reduce((a, b) => abs(index - a.index) < abs(index - b.index) ? a : b);
	let p = yarray._start;
	let pindex = 0;
	if (marker !== null) {
		p = marker.p;
		pindex = marker.index;
		refreshMarkerTimestamp(marker);
	}
	while (p.right !== null && pindex < index) {
		if (!p.deleted && p.countable) {
			if (index < pindex + p.length) break;
			pindex += p.length;
		}
		p = p.right;
	}
	while (p.left !== null && pindex > index) {
		p = p.left;
		if (!p.deleted && p.countable) pindex -= p.length;
	}
	while (p.left !== null && p.left.id.client === p.id.client && p.left.id.clock + p.left.length === p.id.clock) {
		p = p.left;
		if (!p.deleted && p.countable) pindex -= p.length;
	}
	if (marker !== null && abs(marker.index - pindex) < p.parent.length / maxSearchMarker) {
		overwriteMarker(marker, p, pindex);
		return marker;
	} else return markPosition(yarray._searchMarker, p, pindex);
};
/**
* Update markers when a change happened.
*
* This should be called before doing a deletion!
*
* @param {Array<ArraySearchMarker>} searchMarker
* @param {number} index
* @param {number} len If insertion, len is positive. If deletion, len is negative.
*/
const updateMarkerChanges = (searchMarker, index, len) => {
	for (let i = searchMarker.length - 1; i >= 0; i--) {
		const m = searchMarker[i];
		if (len > 0) {
			/**
			* @type {Item|null}
			*/
			let p = m.p;
			p.marker = false;
			while (p && (p.deleted || !p.countable)) {
				p = p.left;
				if (p && !p.deleted && p.countable) m.index -= p.length;
			}
			if (p === null || p.marker === true) {
				searchMarker.splice(i, 1);
				continue;
			}
			m.p = p;
			p.marker = true;
		}
		if (index < m.index || len > 0 && index === m.index) m.index = max(index, m.index + len);
	}
};
/**
* Call event listeners with an event. This will also add an event to all
* parents (for `.observeDeep` handlers).
*
* @template EventType
* @param {AbstractType<EventType>} type
* @param {Transaction} transaction
* @param {EventType} event
*/
const callTypeObservers = (type, transaction, event) => {
	const changedType = type;
	const changedParentTypes = transaction.changedParentTypes;
	while (true) {
		setIfUndefined(changedParentTypes, type, () => []).push(event);
		if (type._item === null) break;
		type = type._item.parent;
	}
	callEventHandlerListeners(changedType._eH, event, transaction);
};
/**
* @template EventType
* Abstract Yjs Type class
*/
var AbstractType = class {
	constructor() {
		/**
		* @type {Item|null}
		*/
		this._item = null;
		/**
		* @type {Map<string,Item>}
		*/
		this._map = /* @__PURE__ */ new Map();
		/**
		* @type {Item|null}
		*/
		this._start = null;
		/**
		* @type {Doc|null}
		*/
		this.doc = null;
		this._length = 0;
		/**
		* Event handlers
		* @type {EventHandler<EventType,Transaction>}
		*/
		this._eH = createEventHandler();
		/**
		* Deep event handlers
		* @type {EventHandler<Array<YEvent<any>>,Transaction>}
		*/
		this._dEH = createEventHandler();
		/**
		* @type {null | Array<ArraySearchMarker>}
		*/
		this._searchMarker = null;
	}
	/**
	* @return {AbstractType<any>|null}
	*/
	get parent() {
		return this._item ? this._item.parent : null;
	}
	/**
	* Integrate this type into the Yjs instance.
	*
	* * Save this struct in the os
	* * This type is sent to other client
	* * Observer functions are fired
	*
	* @param {Doc} y The Yjs instance
	* @param {Item|null} item
	*/
	_integrate(y, item) {
		this.doc = y;
		this._item = item;
	}
	/**
	* @return {AbstractType<EventType>}
	*/
	_copy() {
		throw methodUnimplemented();
	}
	/**
	* Makes a copy of this data type that can be included somewhere else.
	*
	* Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
	*
	* @return {AbstractType<EventType>}
	*/
	clone() {
		throw methodUnimplemented();
	}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} _encoder
	*/
	_write(_encoder) {}
	/**
	* The first non-deleted item
	*/
	get _first() {
		let n = this._start;
		while (n !== null && n.deleted) n = n.right;
		return n;
	}
	/**
	* Creates YEvent and calls all type observers.
	* Must be implemented by each type.
	*
	* @param {Transaction} transaction
	* @param {Set<null|string>} _parentSubs Keys changed on this type. `null` if list was modified.
	*/
	_callObserver(transaction, _parentSubs) {
		if (!transaction.local && this._searchMarker) this._searchMarker.length = 0;
	}
	/**
	* Observe all events that are created on this type.
	*
	* @param {function(EventType, Transaction):void} f Observer function
	*/
	observe(f) {
		addEventHandlerListener(this._eH, f);
	}
	/**
	* Observe all events that are created by this type and its children.
	*
	* @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
	*/
	observeDeep(f) {
		addEventHandlerListener(this._dEH, f);
	}
	/**
	* Unregister an observer function.
	*
	* @param {function(EventType,Transaction):void} f Observer function
	*/
	unobserve(f) {
		removeEventHandlerListener(this._eH, f);
	}
	/**
	* Unregister an observer function.
	*
	* @param {function(Array<YEvent<any>>,Transaction):void} f Observer function
	*/
	unobserveDeep(f) {
		removeEventHandlerListener(this._dEH, f);
	}
	/**
	* @abstract
	* @return {any}
	*/
	toJSON() {}
};
/**
* @param {AbstractType<any>} type
* @param {number} start
* @param {number} end
* @return {Array<any>}
*
* @private
* @function
*/
const typeListSlice = (type, start, end) => {
	type.doc ?? warnPrematureAccess();
	if (start < 0) start = type._length + start;
	if (end < 0) end = type._length + end;
	let len = end - start;
	const cs = [];
	let n = type._start;
	while (n !== null && len > 0) {
		if (n.countable && !n.deleted) {
			const c = n.content.getContent();
			if (c.length <= start) start -= c.length;
			else {
				for (let i = start; i < c.length && len > 0; i++) {
					cs.push(c[i]);
					len--;
				}
				start = 0;
			}
		}
		n = n.right;
	}
	return cs;
};
/**
* @param {AbstractType<any>} type
* @return {Array<any>}
*
* @private
* @function
*/
const typeListToArray = (type) => {
	type.doc ?? warnPrematureAccess();
	const cs = [];
	let n = type._start;
	while (n !== null) {
		if (n.countable && !n.deleted) {
			const c = n.content.getContent();
			for (let i = 0; i < c.length; i++) cs.push(c[i]);
		}
		n = n.right;
	}
	return cs;
};
/**
* Executes a provided function on once on every element of this YArray.
*
* @param {AbstractType<any>} type
* @param {function(any,number,any):void} f A function to execute on every element of this YArray.
*
* @private
* @function
*/
const typeListForEach = (type, f) => {
	let index = 0;
	let n = type._start;
	type.doc ?? warnPrematureAccess();
	while (n !== null) {
		if (n.countable && !n.deleted) {
			const c = n.content.getContent();
			for (let i = 0; i < c.length; i++) f(c[i], index++, type);
		}
		n = n.right;
	}
};
/**
* @template C,R
* @param {AbstractType<any>} type
* @param {function(C,number,AbstractType<any>):R} f
* @return {Array<R>}
*
* @private
* @function
*/
const typeListMap = (type, f) => {
	/**
	* @type {Array<any>}
	*/
	const result = [];
	typeListForEach(type, (c, i) => {
		result.push(f(c, i, type));
	});
	return result;
};
/**
* @param {AbstractType<any>} type
* @return {IterableIterator<any>}
*
* @private
* @function
*/
const typeListCreateIterator = (type) => {
	let n = type._start;
	/**
	* @type {Array<any>|null}
	*/
	let currentContent = null;
	let currentContentIndex = 0;
	return {
		[Symbol.iterator]() {
			return this;
		},
		next: () => {
			if (currentContent === null) {
				while (n !== null && n.deleted) n = n.right;
				if (n === null) return {
					done: true,
					value: void 0
				};
				currentContent = n.content.getContent();
				currentContentIndex = 0;
				n = n.right;
			}
			const value = currentContent[currentContentIndex++];
			if (currentContent.length <= currentContentIndex) currentContent = null;
			return {
				done: false,
				value
			};
		}
	};
};
/**
* @param {AbstractType<any>} type
* @param {number} index
* @return {any}
*
* @private
* @function
*/
const typeListGet = (type, index) => {
	type.doc ?? warnPrematureAccess();
	const marker = findMarker(type, index);
	let n = type._start;
	if (marker !== null) {
		n = marker.p;
		index -= marker.index;
	}
	for (; n !== null; n = n.right) if (!n.deleted && n.countable) {
		if (index < n.length) return n.content.getContent()[index];
		index -= n.length;
	}
};
/**
* @param {Transaction} transaction
* @param {AbstractType<any>} parent
* @param {Item?} referenceItem
* @param {Array<Object<string,any>|Array<any>|boolean|number|null|string|Uint8Array>} content
*
* @private
* @function
*/
const typeListInsertGenericsAfter = (transaction, parent, referenceItem, content) => {
	let left = referenceItem;
	const doc = transaction.doc;
	const ownClientId = doc.clientID;
	const store = doc.store;
	const right = referenceItem === null ? parent._start : referenceItem.right;
	/**
	* @type {Array<Object|Array<any>|number|null>}
	*/
	let jsonContent = [];
	const packJsonContent = () => {
		if (jsonContent.length > 0) {
			left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentAny(jsonContent));
			left.integrate(transaction, 0);
			jsonContent = [];
		}
	};
	content.forEach((c) => {
		if (c === null) jsonContent.push(c);
		else switch (c.constructor) {
			case Number:
			case Object:
			case Boolean:
			case Array:
			case String:
				jsonContent.push(c);
				break;
			default:
				packJsonContent();
				switch (c.constructor) {
					case Uint8Array:
					case ArrayBuffer:
						left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentBinary(new Uint8Array(c)));
						left.integrate(transaction, 0);
						break;
					case Doc:
						left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentDoc(c));
						left.integrate(transaction, 0);
						break;
					default: if (c instanceof AbstractType) {
						left = new Item(createID(ownClientId, getState(store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentType(c));
						left.integrate(transaction, 0);
					} else throw new Error("Unexpected content type in insert operation");
				}
		}
	});
	packJsonContent();
};
const lengthExceeded = () => create$3("Length exceeded!");
/**
* @param {Transaction} transaction
* @param {AbstractType<any>} parent
* @param {number} index
* @param {Array<Object<string,any>|Array<any>|number|null|string|Uint8Array>} content
*
* @private
* @function
*/
const typeListInsertGenerics = (transaction, parent, index, content) => {
	if (index > parent._length) throw lengthExceeded();
	if (index === 0) {
		if (parent._searchMarker) updateMarkerChanges(parent._searchMarker, index, content.length);
		return typeListInsertGenericsAfter(transaction, parent, null, content);
	}
	const startIndex = index;
	const marker = findMarker(parent, index);
	let n = parent._start;
	if (marker !== null) {
		n = marker.p;
		index -= marker.index;
		if (index === 0) {
			n = n.prev;
			index += n && n.countable && !n.deleted ? n.length : 0;
		}
	}
	for (; n !== null; n = n.right) if (!n.deleted && n.countable) {
		if (index <= n.length) {
			if (index < n.length) getItemCleanStart(transaction, createID(n.id.client, n.id.clock + index));
			break;
		}
		index -= n.length;
	}
	if (parent._searchMarker) updateMarkerChanges(parent._searchMarker, startIndex, content.length);
	return typeListInsertGenericsAfter(transaction, parent, n, content);
};
/**
* Pushing content is special as we generally want to push after the last item. So we don't have to update
* the search marker.
*
* @param {Transaction} transaction
* @param {AbstractType<any>} parent
* @param {Array<Object<string,any>|Array<any>|number|null|string|Uint8Array>} content
*
* @private
* @function
*/
const typeListPushGenerics = (transaction, parent, content) => {
	let n = (parent._searchMarker || []).reduce((maxMarker, currMarker) => currMarker.index > maxMarker.index ? currMarker : maxMarker, {
		index: 0,
		p: parent._start
	}).p;
	if (n) while (n.right) n = n.right;
	return typeListInsertGenericsAfter(transaction, parent, n, content);
};
/**
* @param {Transaction} transaction
* @param {AbstractType<any>} parent
* @param {number} index
* @param {number} length
*
* @private
* @function
*/
const typeListDelete = (transaction, parent, index, length) => {
	if (length === 0) return;
	const startIndex = index;
	const startLength = length;
	const marker = findMarker(parent, index);
	let n = parent._start;
	if (marker !== null) {
		n = marker.p;
		index -= marker.index;
	}
	for (; n !== null && index > 0; n = n.right) if (!n.deleted && n.countable) {
		if (index < n.length) getItemCleanStart(transaction, createID(n.id.client, n.id.clock + index));
		index -= n.length;
	}
	while (length > 0 && n !== null) {
		if (!n.deleted) {
			if (length < n.length) getItemCleanStart(transaction, createID(n.id.client, n.id.clock + length));
			n.delete(transaction);
			length -= n.length;
		}
		n = n.right;
	}
	if (length > 0) throw lengthExceeded();
	if (parent._searchMarker) updateMarkerChanges(parent._searchMarker, startIndex, -startLength + length);
};
/**
* @param {Transaction} transaction
* @param {AbstractType<any>} parent
* @param {string} key
*
* @private
* @function
*/
const typeMapDelete = (transaction, parent, key) => {
	const c = parent._map.get(key);
	if (c !== void 0) c.delete(transaction);
};
/**
* @param {Transaction} transaction
* @param {AbstractType<any>} parent
* @param {string} key
* @param {Object|number|null|Array<any>|string|Uint8Array|AbstractType<any>} value
*
* @private
* @function
*/
const typeMapSet = (transaction, parent, key, value) => {
	const left = parent._map.get(key) || null;
	const doc = transaction.doc;
	const ownClientId = doc.clientID;
	let content;
	if (value == null) content = new ContentAny([value]);
	else switch (value.constructor) {
		case Number:
		case Object:
		case Boolean:
		case Array:
		case String:
		case Date:
		case BigInt:
			content = new ContentAny([value]);
			break;
		case Uint8Array:
			content = new ContentBinary(value);
			break;
		case Doc:
			content = new ContentDoc(value);
			break;
		default: if (value instanceof AbstractType) content = new ContentType(value);
		else throw new Error("Unexpected content type");
	}
	new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, null, null, parent, key, content).integrate(transaction, 0);
};
/**
* @param {AbstractType<any>} parent
* @param {string} key
* @return {Object<string,any>|number|null|Array<any>|string|Uint8Array|AbstractType<any>|undefined}
*
* @private
* @function
*/
const typeMapGet = (parent, key) => {
	parent.doc ?? warnPrematureAccess();
	const val = parent._map.get(key);
	return val !== void 0 && !val.deleted ? val.content.getContent()[val.length - 1] : void 0;
};
/**
* @param {AbstractType<any>} parent
* @return {Object<string,Object<string,any>|number|null|Array<any>|string|Uint8Array|AbstractType<any>|undefined>}
*
* @private
* @function
*/
const typeMapGetAll = (parent) => {
	/**
	* @type {Object<string,any>}
	*/
	const res = {};
	parent.doc ?? warnPrematureAccess();
	parent._map.forEach((value, key) => {
		if (!value.deleted) res[key] = value.content.getContent()[value.length - 1];
	});
	return res;
};
/**
* @param {AbstractType<any>} parent
* @param {string} key
* @return {boolean}
*
* @private
* @function
*/
const typeMapHas = (parent, key) => {
	parent.doc ?? warnPrematureAccess();
	const val = parent._map.get(key);
	return val !== void 0 && !val.deleted;
};
/**
* @param {AbstractType<any>} parent
* @param {Snapshot} snapshot
* @return {Object<string,Object<string,any>|number|null|Array<any>|string|Uint8Array|AbstractType<any>|undefined>}
*
* @private
* @function
*/
const typeMapGetAllSnapshot = (parent, snapshot) => {
	/**
	* @type {Object<string,any>}
	*/
	const res = {};
	parent._map.forEach((value, key) => {
		/**
		* @type {Item|null}
		*/
		let v = value;
		while (v !== null && (!snapshot.sv.has(v.id.client) || v.id.clock >= (snapshot.sv.get(v.id.client) || 0))) v = v.left;
		if (v !== null && isVisible(v, snapshot)) res[key] = v.content.getContent()[v.length - 1];
	});
	return res;
};
/**
* @param {AbstractType<any> & { _map: Map<string, Item> }} type
* @return {IterableIterator<Array<any>>}
*
* @private
* @function
*/
const createMapIterator = (type) => {
	type.doc ?? warnPrematureAccess();
	return iteratorFilter(
		type._map.entries(),
		/** @param {any} entry */
		(entry) => !entry[1].deleted
	);
};
/**
* @module YArray
*/
/**
* Event that describes the changes on a YArray
* @template T
* @extends YEvent<YArray<T>>
*/
var YArrayEvent = class extends YEvent {};
/**
* A shared Array implementation.
* @template T
* @extends AbstractType<YArrayEvent<T>>
* @implements {Iterable<T>}
*/
var YArray = class YArray extends AbstractType {
	constructor() {
		super();
		/**
		* @type {Array<any>?}
		* @private
		*/
		this._prelimContent = [];
		/**
		* @type {Array<ArraySearchMarker>}
		*/
		this._searchMarker = [];
	}
	/**
	* Construct a new YArray containing the specified items.
	* @template {Object<string,any>|Array<any>|number|null|string|Uint8Array} T
	* @param {Array<T>} items
	* @return {YArray<T>}
	*/
	static from(items) {
		/**
		* @type {YArray<T>}
		*/
		const a = new YArray();
		a.push(items);
		return a;
	}
	/**
	* Integrate this type into the Yjs instance.
	*
	* * Save this struct in the os
	* * This type is sent to other client
	* * Observer functions are fired
	*
	* @param {Doc} y The Yjs instance
	* @param {Item} item
	*/
	_integrate(y, item) {
		super._integrate(y, item);
		this.insert(0, this._prelimContent);
		this._prelimContent = null;
	}
	/**
	* @return {YArray<T>}
	*/
	_copy() {
		return new YArray();
	}
	/**
	* Makes a copy of this data type that can be included somewhere else.
	*
	* Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
	*
	* @return {YArray<T>}
	*/
	clone() {
		/**
		* @type {YArray<T>}
		*/
		const arr = new YArray();
		arr.insert(0, this.toArray().map((el) => el instanceof AbstractType ? el.clone() : el));
		return arr;
	}
	get length() {
		this.doc ?? warnPrematureAccess();
		return this._length;
	}
	/**
	* Creates YArrayEvent and calls observers.
	*
	* @param {Transaction} transaction
	* @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
	*/
	_callObserver(transaction, parentSubs) {
		super._callObserver(transaction, parentSubs);
		callTypeObservers(this, transaction, new YArrayEvent(this, transaction));
	}
	/**
	* Inserts new content at an index.
	*
	* Important: This function expects an array of content. Not just a content
	* object. The reason for this "weirdness" is that inserting several elements
	* is very efficient when it is done as a single operation.
	*
	* @example
	*  // Insert character 'a' at position 0
	*  yarray.insert(0, ['a'])
	*  // Insert numbers 1, 2 at position 1
	*  yarray.insert(1, [1, 2])
	*
	* @param {number} index The index to insert content at.
	* @param {Array<T>} content The array of content
	*/
	insert(index, content) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			typeListInsertGenerics(transaction, this, index, content);
		});
		else
 /** @type {Array<any>} */ this._prelimContent.splice(index, 0, ...content);
	}
	/**
	* Appends content to this YArray.
	*
	* @param {Array<T>} content Array of content to append.
	*
	* @todo Use the following implementation in all types.
	*/
	push(content) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			typeListPushGenerics(transaction, this, content);
		});
		else
 /** @type {Array<any>} */ this._prelimContent.push(...content);
	}
	/**
	* Prepends content to this YArray.
	*
	* @param {Array<T>} content Array of content to prepend.
	*/
	unshift(content) {
		this.insert(0, content);
	}
	/**
	* Deletes elements starting from an index.
	*
	* @param {number} index Index at which to start deleting elements
	* @param {number} length The number of elements to remove. Defaults to 1.
	*/
	delete(index, length = 1) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			typeListDelete(transaction, this, index, length);
		});
		else
 /** @type {Array<any>} */ this._prelimContent.splice(index, length);
	}
	/**
	* Returns the i-th element from a YArray.
	*
	* @param {number} index The index of the element to return from the YArray
	* @return {T}
	*/
	get(index) {
		return typeListGet(this, index);
	}
	/**
	* Transforms this YArray to a JavaScript Array.
	*
	* @return {Array<T>}
	*/
	toArray() {
		return typeListToArray(this);
	}
	/**
	* Returns a portion of this YArray into a JavaScript Array selected
	* from start to end (end not included).
	*
	* @param {number} [start]
	* @param {number} [end]
	* @return {Array<T>}
	*/
	slice(start = 0, end = this.length) {
		return typeListSlice(this, start, end);
	}
	/**
	* Transforms this Shared Type to a JSON object.
	*
	* @return {Array<any>}
	*/
	toJSON() {
		return this.map((c) => c instanceof AbstractType ? c.toJSON() : c);
	}
	/**
	* Returns an Array with the result of calling a provided function on every
	* element of this YArray.
	*
	* @template M
	* @param {function(T,number,YArray<T>):M} f Function that produces an element of the new Array
	* @return {Array<M>} A new array with each element being the result of the
	*                 callback function
	*/
	map(f) {
		return typeListMap(this, f);
	}
	/**
	* Executes a provided function once on every element of this YArray.
	*
	* @param {function(T,number,YArray<T>):void} f A function to execute on every element of this YArray.
	*/
	forEach(f) {
		typeListForEach(this, f);
	}
	/**
	* @return {IterableIterator<T>}
	*/
	[Symbol.iterator]() {
		return typeListCreateIterator(this);
	}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	*/
	_write(encoder) {
		encoder.writeTypeRef(YArrayRefID);
	}
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
*
* @private
* @function
*/
const readYArray = (_decoder) => new YArray();
/**
* @module YMap
*/
/**
* @template T
* @extends YEvent<YMap<T>>
* Event that describes the changes on a YMap.
*/
var YMapEvent = class extends YEvent {
	/**
	* @param {YMap<T>} ymap The YArray that changed.
	* @param {Transaction} transaction
	* @param {Set<any>} subs The keys that changed.
	*/
	constructor(ymap, transaction, subs) {
		super(ymap, transaction);
		this.keysChanged = subs;
	}
};
/**
* @template MapType
* A shared Map implementation.
*
* @extends AbstractType<YMapEvent<MapType>>
* @implements {Iterable<[string, MapType]>}
*/
var YMap = class YMap extends AbstractType {
	/**
	*
	* @param {Iterable<readonly [string, any]>=} entries - an optional iterable to initialize the YMap
	*/
	constructor(entries) {
		super();
		/**
		* @type {Map<string,any>?}
		* @private
		*/
		this._prelimContent = null;
		if (entries === void 0) this._prelimContent = /* @__PURE__ */ new Map();
		else this._prelimContent = new Map(entries);
	}
	/**
	* Integrate this type into the Yjs instance.
	*
	* * Save this struct in the os
	* * This type is sent to other client
	* * Observer functions are fired
	*
	* @param {Doc} y The Yjs instance
	* @param {Item} item
	*/
	_integrate(y, item) {
		super._integrate(y, item);
		/** @type {Map<string, any>} */ this._prelimContent.forEach((value, key) => {
			this.set(key, value);
		});
		this._prelimContent = null;
	}
	/**
	* @return {YMap<MapType>}
	*/
	_copy() {
		return new YMap();
	}
	/**
	* Makes a copy of this data type that can be included somewhere else.
	*
	* Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
	*
	* @return {YMap<MapType>}
	*/
	clone() {
		/**
		* @type {YMap<MapType>}
		*/
		const map = new YMap();
		this.forEach((value, key) => {
			map.set(key, value instanceof AbstractType ? value.clone() : value);
		});
		return map;
	}
	/**
	* Creates YMapEvent and calls observers.
	*
	* @param {Transaction} transaction
	* @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
	*/
	_callObserver(transaction, parentSubs) {
		callTypeObservers(this, transaction, new YMapEvent(this, transaction, parentSubs));
	}
	/**
	* Transforms this Shared Type to a JSON object.
	*
	* @return {Object<string,any>}
	*/
	toJSON() {
		this.doc ?? warnPrematureAccess();
		/**
		* @type {Object<string,MapType>}
		*/
		const map = {};
		this._map.forEach((item, key) => {
			if (!item.deleted) {
				const v = item.content.getContent()[item.length - 1];
				map[key] = v instanceof AbstractType ? v.toJSON() : v;
			}
		});
		return map;
	}
	/**
	* Returns the size of the YMap (count of key/value pairs)
	*
	* @return {number}
	*/
	get size() {
		return [...createMapIterator(this)].length;
	}
	/**
	* Returns the keys for each element in the YMap Type.
	*
	* @return {IterableIterator<string>}
	*/
	keys() {
		return iteratorMap(
			createMapIterator(this),
			/** @param {any} v */
			(v) => v[0]
		);
	}
	/**
	* Returns the values for each element in the YMap Type.
	*
	* @return {IterableIterator<MapType>}
	*/
	values() {
		return iteratorMap(
			createMapIterator(this),
			/** @param {any} v */
			(v) => v[1].content.getContent()[v[1].length - 1]
		);
	}
	/**
	* Returns an Iterator of [key, value] pairs
	*
	* @return {IterableIterator<[string, MapType]>}
	*/
	entries() {
		return iteratorMap(
			createMapIterator(this),
			/** @param {any} v */
			(v) => [v[0], v[1].content.getContent()[v[1].length - 1]]
		);
	}
	/**
	* Executes a provided function on once on every key-value pair.
	*
	* @param {function(MapType,string,YMap<MapType>):void} f A function to execute on every element of this YArray.
	*/
	forEach(f) {
		this.doc ?? warnPrematureAccess();
		this._map.forEach((item, key) => {
			if (!item.deleted) f(item.content.getContent()[item.length - 1], key, this);
		});
	}
	/**
	* Returns an Iterator of [key, value] pairs
	*
	* @return {IterableIterator<[string, MapType]>}
	*/
	[Symbol.iterator]() {
		return this.entries();
	}
	/**
	* Remove a specified element from this YMap.
	*
	* @param {string} key The key of the element to remove.
	*/
	delete(key) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			typeMapDelete(transaction, this, key);
		});
		else
 /** @type {Map<string, any>} */ this._prelimContent.delete(key);
	}
	/**
	* Adds or updates an element with a specified key and value.
	* @template {MapType} VAL
	*
	* @param {string} key The key of the element to add to this YMap
	* @param {VAL} value The value of the element to add
	* @return {VAL}
	*/
	set(key, value) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			typeMapSet(transaction, this, key, value);
		});
		else
 /** @type {Map<string, any>} */ this._prelimContent.set(key, value);
		return value;
	}
	/**
	* Returns a specified element from this YMap.
	*
	* @param {string} key
	* @return {MapType|undefined}
	*/
	get(key) {
		return typeMapGet(this, key);
	}
	/**
	* Returns a boolean indicating whether the specified key exists or not.
	*
	* @param {string} key The key to test.
	* @return {boolean}
	*/
	has(key) {
		return typeMapHas(this, key);
	}
	/**
	* Removes all elements from this YMap.
	*/
	clear() {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			this.forEach(function(_value, key, map) {
				typeMapDelete(transaction, map, key);
			});
		});
		else
 /** @type {Map<string, any>} */ this._prelimContent.clear();
	}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	*/
	_write(encoder) {
		encoder.writeTypeRef(YMapRefID);
	}
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
*
* @private
* @function
*/
const readYMap = (_decoder) => new YMap();
/**
* @module YText
*/
/**
* @param {any} a
* @param {any} b
* @return {boolean}
*/
const equalAttrs = (a, b) => a === b || typeof a === "object" && typeof b === "object" && a && b && equalFlat(a, b);
var ItemTextListPosition = class {
	/**
	* @param {Item|null} left
	* @param {Item|null} right
	* @param {number} index
	* @param {Map<string,any>} currentAttributes
	*/
	constructor(left, right, index, currentAttributes) {
		this.left = left;
		this.right = right;
		this.index = index;
		this.currentAttributes = currentAttributes;
	}
	/**
	* Only call this if you know that this.right is defined
	*/
	forward() {
		if (this.right === null) unexpectedCase();
		switch (this.right.content.constructor) {
			case ContentFormat:
				if (!this.right.deleted) updateCurrentAttributes(this.currentAttributes, this.right.content);
				break;
			default:
				if (!this.right.deleted) this.index += this.right.length;
				break;
		}
		this.left = this.right;
		this.right = this.right.right;
	}
};
/**
* @param {Transaction} transaction
* @param {ItemTextListPosition} pos
* @param {number} count steps to move forward
* @return {ItemTextListPosition}
*
* @private
* @function
*/
const findNextPosition = (transaction, pos, count) => {
	while (pos.right !== null && count > 0) {
		switch (pos.right.content.constructor) {
			case ContentFormat:
				if (!pos.right.deleted) updateCurrentAttributes(pos.currentAttributes, pos.right.content);
				break;
			default:
				if (!pos.right.deleted) {
					if (count < pos.right.length) getItemCleanStart(transaction, createID(pos.right.id.client, pos.right.id.clock + count));
					pos.index += pos.right.length;
					count -= pos.right.length;
				}
				break;
		}
		pos.left = pos.right;
		pos.right = pos.right.right;
	}
	return pos;
};
/**
* @param {Transaction} transaction
* @param {AbstractType<any>} parent
* @param {number} index
* @param {boolean} useSearchMarker
* @return {ItemTextListPosition}
*
* @private
* @function
*/
const findPosition = (transaction, parent, index, useSearchMarker) => {
	const currentAttributes = /* @__PURE__ */ new Map();
	const marker = useSearchMarker ? findMarker(parent, index) : null;
	if (marker) return findNextPosition(transaction, new ItemTextListPosition(marker.p.left, marker.p, marker.index, currentAttributes), index - marker.index);
	else return findNextPosition(transaction, new ItemTextListPosition(null, parent._start, 0, currentAttributes), index);
};
/**
* Negate applied formats
*
* @param {Transaction} transaction
* @param {AbstractType<any>} parent
* @param {ItemTextListPosition} currPos
* @param {Map<string,any>} negatedAttributes
*
* @private
* @function
*/
const insertNegatedAttributes = (transaction, parent, currPos, negatedAttributes) => {
	while (currPos.right !== null && (currPos.right.deleted === true || currPos.right.content.constructor === ContentFormat && equalAttrs(
		negatedAttributes.get(
			/** @type {ContentFormat} */
			currPos.right.content.key
		),
		/** @type {ContentFormat} */
		currPos.right.content.value
	))) {
		if (!currPos.right.deleted) negatedAttributes.delete(
			/** @type {ContentFormat} */
			currPos.right.content.key
		);
		currPos.forward();
	}
	const doc = transaction.doc;
	const ownClientId = doc.clientID;
	negatedAttributes.forEach((val, key) => {
		const left = currPos.left;
		const right = currPos.right;
		const nextFormat = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentFormat(key, val));
		nextFormat.integrate(transaction, 0);
		currPos.right = nextFormat;
		currPos.forward();
	});
};
/**
* @param {Map<string,any>} currentAttributes
* @param {ContentFormat} format
*
* @private
* @function
*/
const updateCurrentAttributes = (currentAttributes, format) => {
	const { key, value } = format;
	if (value === null) currentAttributes.delete(key);
	else currentAttributes.set(key, value);
};
/**
* @param {ItemTextListPosition} currPos
* @param {Object<string,any>} attributes
*
* @private
* @function
*/
const minimizeAttributeChanges = (currPos, attributes) => {
	while (true) {
		if (currPos.right === null) break;
		else if (currPos.right.deleted || currPos.right.content.constructor === ContentFormat && equalAttrs(
			attributes[currPos.right.content.key] ?? null,
			/** @type {ContentFormat} */
			currPos.right.content.value
		));
		else break;
		currPos.forward();
	}
};
/**
* @param {Transaction} transaction
* @param {AbstractType<any>} parent
* @param {ItemTextListPosition} currPos
* @param {Object<string,any>} attributes
* @return {Map<string,any>}
*
* @private
* @function
**/
const insertAttributes = (transaction, parent, currPos, attributes) => {
	const doc = transaction.doc;
	const ownClientId = doc.clientID;
	const negatedAttributes = /* @__PURE__ */ new Map();
	for (const key in attributes) {
		const val = attributes[key];
		const currentVal = currPos.currentAttributes.get(key) ?? null;
		if (!equalAttrs(currentVal, val)) {
			negatedAttributes.set(key, currentVal);
			const { left, right } = currPos;
			currPos.right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, new ContentFormat(key, val));
			currPos.right.integrate(transaction, 0);
			currPos.forward();
		}
	}
	return negatedAttributes;
};
/**
* @param {Transaction} transaction
* @param {AbstractType<any>} parent
* @param {ItemTextListPosition} currPos
* @param {string|object|AbstractType<any>} text
* @param {Object<string,any>} attributes
*
* @private
* @function
**/
const insertText = (transaction, parent, currPos, text, attributes) => {
	currPos.currentAttributes.forEach((_val, key) => {
		if (attributes[key] === void 0) attributes[key] = null;
	});
	const doc = transaction.doc;
	const ownClientId = doc.clientID;
	minimizeAttributeChanges(currPos, attributes);
	const negatedAttributes = insertAttributes(transaction, parent, currPos, attributes);
	const content = text.constructor === String ? new ContentString(text) : text instanceof AbstractType ? new ContentType(text) : new ContentEmbed(text);
	let { left, right, index } = currPos;
	if (parent._searchMarker) updateMarkerChanges(parent._searchMarker, currPos.index, content.getLength());
	right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), left, left && left.lastId, right, right && right.id, parent, null, content);
	right.integrate(transaction, 0);
	currPos.right = right;
	currPos.index = index;
	currPos.forward();
	insertNegatedAttributes(transaction, parent, currPos, negatedAttributes);
};
/**
* @param {Transaction} transaction
* @param {AbstractType<any>} parent
* @param {ItemTextListPosition} currPos
* @param {number} length
* @param {Object<string,any>} attributes
*
* @private
* @function
*/
const formatText = (transaction, parent, currPos, length, attributes) => {
	const doc = transaction.doc;
	const ownClientId = doc.clientID;
	minimizeAttributeChanges(currPos, attributes);
	const negatedAttributes = insertAttributes(transaction, parent, currPos, attributes);
	iterationLoop: while (currPos.right !== null && (length > 0 || negatedAttributes.size > 0 && (currPos.right.deleted || currPos.right.content.constructor === ContentFormat))) {
		if (!currPos.right.deleted) switch (currPos.right.content.constructor) {
			case ContentFormat: {
				const { key, value } = currPos.right.content;
				const attr = attributes[key];
				if (attr !== void 0) {
					if (equalAttrs(attr, value)) negatedAttributes.delete(key);
					else {
						if (length === 0) break iterationLoop;
						negatedAttributes.set(key, value);
					}
					currPos.right.delete(transaction);
				} else currPos.currentAttributes.set(key, value);
				break;
			}
			default:
				if (length < currPos.right.length) getItemCleanStart(transaction, createID(currPos.right.id.client, currPos.right.id.clock + length));
				length -= currPos.right.length;
				break;
		}
		currPos.forward();
	}
	if (length > 0) {
		let newlines = "";
		for (; length > 0; length--) newlines += "\n";
		currPos.right = new Item(createID(ownClientId, getState(doc.store, ownClientId)), currPos.left, currPos.left && currPos.left.lastId, currPos.right, currPos.right && currPos.right.id, parent, null, new ContentString(newlines));
		currPos.right.integrate(transaction, 0);
		currPos.forward();
	}
	insertNegatedAttributes(transaction, parent, currPos, negatedAttributes);
};
/**
* Call this function after string content has been deleted in order to
* clean up formatting Items.
*
* @param {Transaction} transaction
* @param {Item} start
* @param {Item|null} curr exclusive end, automatically iterates to the next Content Item
* @param {Map<string,any>} startAttributes
* @param {Map<string,any>} currAttributes
* @return {number} The amount of formatting Items deleted.
*
* @function
*/
const cleanupFormattingGap = (transaction, start, curr, startAttributes, currAttributes) => {
	/**
	* @type {Item|null}
	*/
	let end = start;
	/**
	* @type {Map<string,ContentFormat>}
	*/
	const endFormats = create$5();
	while (end && (!end.countable || end.deleted)) {
		if (!end.deleted && end.content.constructor === ContentFormat) {
			const cf = end.content;
			endFormats.set(cf.key, cf);
		}
		end = end.right;
	}
	let cleanups = 0;
	let reachedCurr = false;
	while (start !== end) {
		if (curr === start) reachedCurr = true;
		if (!start.deleted) {
			const content = start.content;
			switch (content.constructor) {
				case ContentFormat: {
					const { key, value } = content;
					const startAttrValue = startAttributes.get(key) ?? null;
					if (endFormats.get(key) !== content || startAttrValue === value) {
						start.delete(transaction);
						cleanups++;
						if (!reachedCurr && (currAttributes.get(key) ?? null) === value && startAttrValue !== value) if (startAttrValue === null) currAttributes.delete(key);
						else currAttributes.set(key, startAttrValue);
					}
					if (!reachedCurr && !start.deleted) updateCurrentAttributes(currAttributes, content);
					break;
				}
			}
		}
		start = start.right;
	}
	return cleanups;
};
/**
* @param {Transaction} transaction
* @param {Item | null} item
*/
const cleanupContextlessFormattingGap = (transaction, item) => {
	while (item && item.right && (item.right.deleted || !item.right.countable)) item = item.right;
	const attrs = /* @__PURE__ */ new Set();
	while (item && (item.deleted || !item.countable)) {
		if (!item.deleted && item.content.constructor === ContentFormat) {
			const key = item.content.key;
			if (attrs.has(key)) item.delete(transaction);
			else attrs.add(key);
		}
		item = item.left;
	}
};
/**
* This function is experimental and subject to change / be removed.
*
* Ideally, we don't need this function at all. Formatting attributes should be cleaned up
* automatically after each change. This function iterates twice over the complete YText type
* and removes unnecessary formatting attributes. This is also helpful for testing.
*
* This function won't be exported anymore as soon as there is confidence that the YText type works as intended.
*
* @param {YText} type
* @return {number} How many formatting attributes have been cleaned up.
*/
const cleanupYTextFormatting = (type) => {
	let res = 0;
	transact$2(type.doc, (transaction) => {
		let start = type._start;
		let end = type._start;
		let startAttributes = create$5();
		const currentAttributes = copy(startAttributes);
		while (end) {
			if (end.deleted === false) switch (end.content.constructor) {
				case ContentFormat:
					updateCurrentAttributes(currentAttributes, end.content);
					break;
				default:
					res += cleanupFormattingGap(transaction, start, end, startAttributes, currentAttributes);
					startAttributes = copy(currentAttributes);
					start = end;
					break;
			}
			end = end.right;
		}
	});
	return res;
};
/**
* This will be called by the transaction once the event handlers are called to potentially cleanup
* formatting attributes.
*
* @param {Transaction} transaction
*/
const cleanupYTextAfterTransaction = (transaction) => {
	/**
	* @type {Set<YText>}
	*/
	const needFullCleanup = /* @__PURE__ */ new Set();
	const doc = transaction.doc;
	for (const [client, afterClock] of transaction.afterState.entries()) {
		const clock = transaction.beforeState.get(client) || 0;
		if (afterClock === clock) continue;
		iterateStructs(transaction, doc.store.clients.get(client), clock, afterClock, (item) => {
			if (!item.deleted && item.content.constructor === ContentFormat && item.constructor !== GC) needFullCleanup.add(
				/** @type {any} */
				item.parent
			);
		});
	}
	transact$2(doc, (t) => {
		iterateDeletedStructs(transaction, transaction.deleteSet, (item) => {
			if (item instanceof GC || !item.parent._hasFormatting || needFullCleanup.has(item.parent)) return;
			const parent = item.parent;
			if (item.content.constructor === ContentFormat) needFullCleanup.add(parent);
			else cleanupContextlessFormattingGap(t, item);
		});
		for (const yText of needFullCleanup) cleanupYTextFormatting(yText);
	});
};
/**
* @param {Transaction} transaction
* @param {ItemTextListPosition} currPos
* @param {number} length
* @return {ItemTextListPosition}
*
* @private
* @function
*/
const deleteText = (transaction, currPos, length) => {
	const startLength = length;
	const startAttrs = copy(currPos.currentAttributes);
	const start = currPos.right;
	while (length > 0 && currPos.right !== null) {
		if (currPos.right.deleted === false) switch (currPos.right.content.constructor) {
			case ContentType:
			case ContentEmbed:
			case ContentString:
				if (length < currPos.right.length) getItemCleanStart(transaction, createID(currPos.right.id.client, currPos.right.id.clock + length));
				length -= currPos.right.length;
				currPos.right.delete(transaction);
				break;
		}
		currPos.forward();
	}
	if (start) cleanupFormattingGap(transaction, start, currPos.right, startAttrs, currPos.currentAttributes);
	const parent = (currPos.left || currPos.right).parent;
	if (parent._searchMarker) updateMarkerChanges(parent._searchMarker, currPos.index, -startLength + length);
	return currPos;
};
/**
* The Quill Delta format represents changes on a text document with
* formatting information. For more information visit {@link https://quilljs.com/docs/delta/|Quill Delta}
*
* @example
*   {
*     ops: [
*       { insert: 'Gandalf', attributes: { bold: true } },
*       { insert: ' the ' },
*       { insert: 'Grey', attributes: { color: '#cccccc' } }
*     ]
*   }
*
*/
/**
* Attributes that can be assigned to a selection of text.
*
* @example
*   {
*     bold: true,
*     font-size: '40px'
*   }
*
* @typedef {Object} TextAttributes
*/
/**
* @extends YEvent<YText>
* Event that describes the changes on a YText type.
*/
var YTextEvent = class extends YEvent {
	/**
	* @param {YText} ytext
	* @param {Transaction} transaction
	* @param {Set<any>} subs The keys that changed
	*/
	constructor(ytext, transaction, subs) {
		super(ytext, transaction);
		/**
		* Whether the children changed.
		* @type {Boolean}
		* @private
		*/
		this.childListChanged = false;
		/**
		* Set of all changed attributes.
		* @type {Set<string>}
		*/
		this.keysChanged = /* @__PURE__ */ new Set();
		subs.forEach((sub) => {
			if (sub === null) this.childListChanged = true;
			else this.keysChanged.add(sub);
		});
	}
	/**
	* @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string, delete?:number, retain?:number}>}}
	*/
	get changes() {
		if (this._changes === null) {
			/**
			* @type {{added:Set<Item>,deleted:Set<Item>,keys:Map<string,{action:'add'|'update'|'delete',oldValue:any}>,delta:Array<{insert?:Array<any>|string|AbstractType<any>|object, delete?:number, retain?:number}>}}
			*/
			const changes = {
				keys: this.keys,
				delta: this.delta,
				added: /* @__PURE__ */ new Set(),
				deleted: /* @__PURE__ */ new Set()
			};
			this._changes = changes;
		}
		return this._changes;
	}
	/**
	* Compute the changes in the delta format.
	* A {@link https://quilljs.com/docs/delta/|Quill Delta}) that represents the changes on the document.
	*
	* @type {Array<{insert?:string|object|AbstractType<any>, delete?:number, retain?:number, attributes?: Object<string,any>}>}
	*
	* @public
	*/
	get delta() {
		if (this._delta === null) {
			const y = this.target.doc;
			/**
			* @type {Array<{insert?:string|object|AbstractType<any>, delete?:number, retain?:number, attributes?: Object<string,any>}>}
			*/
			const delta = [];
			transact$2(y, (transaction) => {
				const currentAttributes = /* @__PURE__ */ new Map();
				const oldAttributes = /* @__PURE__ */ new Map();
				let item = this.target._start;
				/**
				* @type {string?}
				*/
				let action = null;
				/**
				* @type {Object<string,any>}
				*/
				const attributes = {};
				/**
				* @type {string|object}
				*/
				let insert = "";
				let retain = 0;
				let deleteLen = 0;
				const addOp = () => {
					if (action !== null) {
						/**
						* @type {any}
						*/
						let op = null;
						switch (action) {
							case "delete":
								if (deleteLen > 0) op = { delete: deleteLen };
								deleteLen = 0;
								break;
							case "insert":
								if (typeof insert === "object" || insert.length > 0) {
									op = { insert };
									if (currentAttributes.size > 0) {
										op.attributes = {};
										currentAttributes.forEach((value, key) => {
											if (value !== null) op.attributes[key] = value;
										});
									}
								}
								insert = "";
								break;
							case "retain":
								if (retain > 0) {
									op = { retain };
									if (!isEmpty(attributes)) op.attributes = assign({}, attributes);
								}
								retain = 0;
								break;
						}
						if (op) delta.push(op);
						action = null;
					}
				};
				while (item !== null) {
					switch (item.content.constructor) {
						case ContentType:
						case ContentEmbed:
							if (this.adds(item)) {
								if (!this.deletes(item)) {
									addOp();
									action = "insert";
									insert = item.content.getContent()[0];
									addOp();
								}
							} else if (this.deletes(item)) {
								if (action !== "delete") {
									addOp();
									action = "delete";
								}
								deleteLen += 1;
							} else if (!item.deleted) {
								if (action !== "retain") {
									addOp();
									action = "retain";
								}
								retain += 1;
							}
							break;
						case ContentString:
							if (this.adds(item)) {
								if (!this.deletes(item)) {
									if (action !== "insert") {
										addOp();
										action = "insert";
									}
									insert += item.content.str;
								}
							} else if (this.deletes(item)) {
								if (action !== "delete") {
									addOp();
									action = "delete";
								}
								deleteLen += item.length;
							} else if (!item.deleted) {
								if (action !== "retain") {
									addOp();
									action = "retain";
								}
								retain += item.length;
							}
							break;
						case ContentFormat: {
							const { key, value } = item.content;
							if (this.adds(item)) {
								if (!this.deletes(item)) {
									if (!equalAttrs(currentAttributes.get(key) ?? null, value)) {
										if (action === "retain") addOp();
										if (equalAttrs(value, oldAttributes.get(key) ?? null)) delete attributes[key];
										else attributes[key] = value;
									} else if (value !== null) item.delete(transaction);
								}
							} else if (this.deletes(item)) {
								oldAttributes.set(key, value);
								const curVal = currentAttributes.get(key) ?? null;
								if (!equalAttrs(curVal, value)) {
									if (action === "retain") addOp();
									attributes[key] = curVal;
								}
							} else if (!item.deleted) {
								oldAttributes.set(key, value);
								const attr = attributes[key];
								if (attr !== void 0) {
									if (!equalAttrs(attr, value)) {
										if (action === "retain") addOp();
										if (value === null) delete attributes[key];
										else attributes[key] = value;
									} else if (attr !== null) item.delete(transaction);
								}
							}
							if (!item.deleted) {
								if (action === "insert") addOp();
								updateCurrentAttributes(currentAttributes, item.content);
							}
							break;
						}
					}
					item = item.right;
				}
				addOp();
				while (delta.length > 0) {
					const lastOp = delta[delta.length - 1];
					if (lastOp.retain !== void 0 && lastOp.attributes === void 0) delta.pop();
					else break;
				}
			});
			this._delta = delta;
		}
		return this._delta;
	}
};
/**
* Type that represents text with formatting information.
*
* This type replaces y-richtext as this implementation is able to handle
* block formats (format information on a paragraph), embeds (complex elements
* like pictures and videos), and text formats (**bold**, *italic*).
*
* @extends AbstractType<YTextEvent>
*/
var YText = class YText extends AbstractType {
	/**
	* @param {String} [string] The initial value of the YText.
	*/
	constructor(string) {
		super();
		/**
		* Array of pending operations on this type
		* @type {Array<function():void>?}
		*/
		this._pending = string !== void 0 ? [() => this.insert(0, string)] : [];
		/**
		* @type {Array<ArraySearchMarker>|null}
		*/
		this._searchMarker = [];
		/**
		* Whether this YText contains formatting attributes.
		* This flag is updated when a formatting item is integrated (see ContentFormat.integrate)
		*/
		this._hasFormatting = false;
	}
	/**
	* Number of characters of this text type.
	*
	* @type {number}
	*/
	get length() {
		this.doc ?? warnPrematureAccess();
		return this._length;
	}
	/**
	* @param {Doc} y
	* @param {Item} item
	*/
	_integrate(y, item) {
		super._integrate(y, item);
		try {
			/** @type {Array<function>} */ this._pending.forEach((f) => f());
		} catch (e) {
			console.error(e);
		}
		this._pending = null;
	}
	_copy() {
		return new YText();
	}
	/**
	* Makes a copy of this data type that can be included somewhere else.
	*
	* Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
	*
	* @return {YText}
	*/
	clone() {
		const text = new YText();
		text.applyDelta(this.toDelta());
		return text;
	}
	/**
	* Creates YTextEvent and calls observers.
	*
	* @param {Transaction} transaction
	* @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
	*/
	_callObserver(transaction, parentSubs) {
		super._callObserver(transaction, parentSubs);
		const event = new YTextEvent(this, transaction, parentSubs);
		callTypeObservers(this, transaction, event);
		if (!transaction.local && this._hasFormatting) transaction._needFormattingCleanup = true;
	}
	/**
	* Returns the unformatted string representation of this YText type.
	*
	* @public
	*/
	toString() {
		this.doc ?? warnPrematureAccess();
		let str = "";
		/**
		* @type {Item|null}
		*/
		let n = this._start;
		while (n !== null) {
			if (!n.deleted && n.countable && n.content.constructor === ContentString) str += n.content.str;
			n = n.right;
		}
		return str;
	}
	/**
	* Returns the unformatted string representation of this YText type.
	*
	* @return {string}
	* @public
	*/
	toJSON() {
		return this.toString();
	}
	/**
	* Apply a {@link Delta} on this shared YText type.
	*
	* @param {Array<any>} delta The changes to apply on this element.
	* @param {object}  opts
	* @param {boolean} [opts.sanitize] Sanitize input delta. Removes ending newlines if set to true.
	*
	*
	* @public
	*/
	applyDelta(delta, { sanitize = true } = {}) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			const currPos = new ItemTextListPosition(null, this._start, 0, /* @__PURE__ */ new Map());
			for (let i = 0; i < delta.length; i++) {
				const op = delta[i];
				if (op.insert !== void 0) {
					const ins = !sanitize && typeof op.insert === "string" && i === delta.length - 1 && currPos.right === null && op.insert.slice(-1) === "\n" ? op.insert.slice(0, -1) : op.insert;
					if (typeof ins !== "string" || ins.length > 0) insertText(transaction, this, currPos, ins, op.attributes || {});
				} else if (op.retain !== void 0) formatText(transaction, this, currPos, op.retain, op.attributes || {});
				else if (op.delete !== void 0) deleteText(transaction, currPos, op.delete);
			}
		});
		else
 /** @type {Array<function>} */ this._pending.push(() => this.applyDelta(delta));
	}
	/**
	* Returns the Delta representation of this YText type.
	*
	* @param {Snapshot} [snapshot]
	* @param {Snapshot} [prevSnapshot]
	* @param {function('removed' | 'added', ID):any} [computeYChange]
	* @return {any} The Delta representation of this type.
	*
	* @public
	*/
	toDelta(snapshot, prevSnapshot, computeYChange) {
		this.doc ?? warnPrematureAccess();
		/**
		* @type{Array<any>}
		*/
		const ops = [];
		const currentAttributes = /* @__PURE__ */ new Map();
		const doc = this.doc;
		let str = "";
		let n = this._start;
		function packStr() {
			if (str.length > 0) {
				/**
				* @type {Object<string,any>}
				*/
				const attributes = {};
				let addAttributes = false;
				currentAttributes.forEach((value, key) => {
					addAttributes = true;
					attributes[key] = value;
				});
				/**
				* @type {Object<string,any>}
				*/
				const op = { insert: str };
				if (addAttributes) op.attributes = attributes;
				ops.push(op);
				str = "";
			}
		}
		const computeDelta = () => {
			while (n !== null) {
				if (isVisible(n, snapshot) || prevSnapshot !== void 0 && isVisible(n, prevSnapshot)) switch (n.content.constructor) {
					case ContentString: {
						const cur = currentAttributes.get("ychange");
						if (snapshot !== void 0 && !isVisible(n, snapshot)) {
							if (cur === void 0 || cur.user !== n.id.client || cur.type !== "removed") {
								packStr();
								currentAttributes.set("ychange", computeYChange ? computeYChange("removed", n.id) : { type: "removed" });
							}
						} else if (prevSnapshot !== void 0 && !isVisible(n, prevSnapshot)) {
							if (cur === void 0 || cur.user !== n.id.client || cur.type !== "added") {
								packStr();
								currentAttributes.set("ychange", computeYChange ? computeYChange("added", n.id) : { type: "added" });
							}
						} else if (cur !== void 0) {
							packStr();
							currentAttributes.delete("ychange");
						}
						str += n.content.str;
						break;
					}
					case ContentType:
					case ContentEmbed: {
						packStr();
						/**
						* @type {Object<string,any>}
						*/
						const op = { insert: n.content.getContent()[0] };
						if (currentAttributes.size > 0) {
							const attrs = {};
							op.attributes = attrs;
							currentAttributes.forEach((value, key) => {
								attrs[key] = value;
							});
						}
						ops.push(op);
						break;
					}
					case ContentFormat:
						if (isVisible(n, snapshot)) {
							packStr();
							updateCurrentAttributes(currentAttributes, n.content);
						}
						break;
				}
				n = n.right;
			}
			packStr();
		};
		if (snapshot || prevSnapshot) transact$2(doc, (transaction) => {
			if (snapshot) splitSnapshotAffectedStructs(transaction, snapshot);
			if (prevSnapshot) splitSnapshotAffectedStructs(transaction, prevSnapshot);
			computeDelta();
		}, "cleanup");
		else computeDelta();
		return ops;
	}
	/**
	* Insert text at a given index.
	*
	* @param {number} index The index at which to start inserting.
	* @param {String} text The text to insert at the specified position.
	* @param {TextAttributes} [attributes] Optionally define some formatting
	*                                    information to apply on the inserted
	*                                    Text.
	* @public
	*/
	insert(index, text, attributes) {
		if (text.length <= 0) return;
		const y = this.doc;
		if (y !== null) transact$2(y, (transaction) => {
			const pos = findPosition(transaction, this, index, !attributes);
			if (!attributes) {
				attributes = {};
				pos.currentAttributes.forEach((v, k) => {
					attributes[k] = v;
				});
			}
			insertText(transaction, this, pos, text, attributes);
		});
		else
 /** @type {Array<function>} */ this._pending.push(() => this.insert(index, text, attributes));
	}
	/**
	* Inserts an embed at a index.
	*
	* @param {number} index The index to insert the embed at.
	* @param {Object | AbstractType<any>} embed The Object that represents the embed.
	* @param {TextAttributes} [attributes] Attribute information to apply on the
	*                                    embed
	*
	* @public
	*/
	insertEmbed(index, embed, attributes) {
		const y = this.doc;
		if (y !== null) transact$2(y, (transaction) => {
			const pos = findPosition(transaction, this, index, !attributes);
			insertText(transaction, this, pos, embed, attributes || {});
		});
		else
 /** @type {Array<function>} */ this._pending.push(() => this.insertEmbed(index, embed, attributes || {}));
	}
	/**
	* Deletes text starting from an index.
	*
	* @param {number} index Index at which to start deleting.
	* @param {number} length The number of characters to remove. Defaults to 1.
	*
	* @public
	*/
	delete(index, length) {
		if (length === 0) return;
		const y = this.doc;
		if (y !== null) transact$2(y, (transaction) => {
			deleteText(transaction, findPosition(transaction, this, index, true), length);
		});
		else
 /** @type {Array<function>} */ this._pending.push(() => this.delete(index, length));
	}
	/**
	* Assigns properties to a range of text.
	*
	* @param {number} index The position where to start formatting.
	* @param {number} length The amount of characters to assign properties to.
	* @param {TextAttributes} attributes Attribute information to apply on the
	*                                    text.
	*
	* @public
	*/
	format(index, length, attributes) {
		if (length === 0) return;
		const y = this.doc;
		if (y !== null) transact$2(y, (transaction) => {
			const pos = findPosition(transaction, this, index, false);
			if (pos.right === null) return;
			formatText(transaction, this, pos, length, attributes);
		});
		else
 /** @type {Array<function>} */ this._pending.push(() => this.format(index, length, attributes));
	}
	/**
	* Removes an attribute.
	*
	* @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
	*
	* @param {String} attributeName The attribute name that is to be removed.
	*
	* @public
	*/
	removeAttribute(attributeName) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			typeMapDelete(transaction, this, attributeName);
		});
		else
 /** @type {Array<function>} */ this._pending.push(() => this.removeAttribute(attributeName));
	}
	/**
	* Sets or updates an attribute.
	*
	* @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
	*
	* @param {String} attributeName The attribute name that is to be set.
	* @param {any} attributeValue The attribute value that is to be set.
	*
	* @public
	*/
	setAttribute(attributeName, attributeValue) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			typeMapSet(transaction, this, attributeName, attributeValue);
		});
		else
 /** @type {Array<function>} */ this._pending.push(() => this.setAttribute(attributeName, attributeValue));
	}
	/**
	* Returns an attribute value that belongs to the attribute name.
	*
	* @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
	*
	* @param {String} attributeName The attribute name that identifies the
	*                               queried value.
	* @return {any} The queried attribute value.
	*
	* @public
	*/
	getAttribute(attributeName) {
		return typeMapGet(this, attributeName);
	}
	/**
	* Returns all attribute name/value pairs in a JSON Object.
	*
	* @note Xml-Text nodes don't have attributes. You can use this feature to assign properties to complete text-blocks.
	*
	* @return {Object<string, any>} A JSON Object that describes the attributes.
	*
	* @public
	*/
	getAttributes() {
		return typeMapGetAll(this);
	}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	*/
	_write(encoder) {
		encoder.writeTypeRef(YTextRefID);
	}
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
* @return {YText}
*
* @private
* @function
*/
const readYText = (_decoder) => new YText();
/**
* @module YXml
*/
/**
* Define the elements to which a set of CSS queries apply.
* {@link https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors|CSS_Selectors}
*
* @example
*   query = '.classSelector'
*   query = 'nodeSelector'
*   query = '#idSelector'
*
* @typedef {string} CSS_Selector
*/
/**
* Dom filter function.
*
* @callback domFilter
* @param {string} nodeName The nodeName of the element
* @param {Map} attributes The map of attributes.
* @return {boolean} Whether to include the Dom node in the YXmlElement.
*/
/**
* Represents a subset of the nodes of a YXmlElement / YXmlFragment and a
* position within them.
*
* Can be created with {@link YXmlFragment#createTreeWalker}
*
* @public
* @implements {Iterable<YXmlElement|YXmlText|YXmlElement|YXmlHook>}
*/
var YXmlTreeWalker = class {
	/**
	* @param {YXmlFragment | YXmlElement} root
	* @param {function(AbstractType<any>):boolean} [f]
	*/
	constructor(root, f = () => true) {
		this._filter = f;
		this._root = root;
		/**
		* @type {Item}
		*/
		this._currentNode = root._start;
		this._firstCall = true;
		root.doc ?? warnPrematureAccess();
	}
	[Symbol.iterator]() {
		return this;
	}
	/**
	* Get the next node.
	*
	* @return {IteratorResult<YXmlElement|YXmlText|YXmlHook>} The next node.
	*
	* @public
	*/
	next() {
		/**
		* @type {Item|null}
		*/
		let n = this._currentNode;
		let type = n && n.content && n.content.type;
		if (n !== null && (!this._firstCall || n.deleted || !this._filter(type))) do {
			type = n.content.type;
			if (!n.deleted && (type.constructor === YXmlElement || type.constructor === YXmlFragment) && type._start !== null) n = type._start;
			else while (n !== null) {
				/**
				* @type {Item | null}
				*/
				const nxt = n.next;
				if (nxt !== null) {
					n = nxt;
					break;
				} else if (n.parent === this._root) n = null;
				else n = n.parent._item;
			}
		} while (n !== null && (n.deleted || !this._filter(
			/** @type {ContentType} */
			n.content.type
		)));
		this._firstCall = false;
		if (n === null) return {
			value: void 0,
			done: true
		};
		this._currentNode = n;
		return {
			value: n.content.type,
			done: false
		};
	}
};
/**
* Represents a list of {@link YXmlElement}.and {@link YXmlText} types.
* A YxmlFragment is similar to a {@link YXmlElement}, but it does not have a
* nodeName and it does not have attributes. Though it can be bound to a DOM
* element - in this case the attributes and the nodeName are not shared.
*
* @public
* @extends AbstractType<YXmlEvent>
*/
var YXmlFragment = class YXmlFragment extends AbstractType {
	constructor() {
		super();
		/**
		* @type {Array<any>|null}
		*/
		this._prelimContent = [];
	}
	/**
	* @type {YXmlElement|YXmlText|null}
	*/
	get firstChild() {
		const first = this._first;
		return first ? first.content.getContent()[0] : null;
	}
	/**
	* Integrate this type into the Yjs instance.
	*
	* * Save this struct in the os
	* * This type is sent to other client
	* * Observer functions are fired
	*
	* @param {Doc} y The Yjs instance
	* @param {Item} item
	*/
	_integrate(y, item) {
		super._integrate(y, item);
		this.insert(0, this._prelimContent);
		this._prelimContent = null;
	}
	_copy() {
		return new YXmlFragment();
	}
	/**
	* Makes a copy of this data type that can be included somewhere else.
	*
	* Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
	*
	* @return {YXmlFragment}
	*/
	clone() {
		const el = new YXmlFragment();
		el.insert(0, this.toArray().map((item) => item instanceof AbstractType ? item.clone() : item));
		return el;
	}
	get length() {
		this.doc ?? warnPrematureAccess();
		return this._prelimContent === null ? this._length : this._prelimContent.length;
	}
	/**
	* Create a subtree of childNodes.
	*
	* @example
	* const walker = elem.createTreeWalker(dom => dom.nodeName === 'div')
	* for (let node in walker) {
	*   // `node` is a div node
	*   nop(node)
	* }
	*
	* @param {function(AbstractType<any>):boolean} filter Function that is called on each child element and
	*                          returns a Boolean indicating whether the child
	*                          is to be included in the subtree.
	* @return {YXmlTreeWalker} A subtree and a position within it.
	*
	* @public
	*/
	createTreeWalker(filter) {
		return new YXmlTreeWalker(this, filter);
	}
	/**
	* Returns the first YXmlElement that matches the query.
	* Similar to DOM's {@link querySelector}.
	*
	* Query support:
	*   - tagname
	* TODO:
	*   - id
	*   - attribute
	*
	* @param {CSS_Selector} query The query on the children.
	* @return {YXmlElement|YXmlText|YXmlHook|null} The first element that matches the query or null.
	*
	* @public
	*/
	querySelector(query) {
		query = query.toUpperCase();
		const next = new YXmlTreeWalker(this, (element) => element.nodeName && element.nodeName.toUpperCase() === query).next();
		if (next.done) return null;
		else return next.value;
	}
	/**
	* Returns all YXmlElements that match the query.
	* Similar to Dom's {@link querySelectorAll}.
	*
	* @todo Does not yet support all queries. Currently only query by tagName.
	*
	* @param {CSS_Selector} query The query on the children
	* @return {Array<YXmlElement|YXmlText|YXmlHook|null>} The elements that match this query.
	*
	* @public
	*/
	querySelectorAll(query) {
		query = query.toUpperCase();
		return from(new YXmlTreeWalker(this, (element) => element.nodeName && element.nodeName.toUpperCase() === query));
	}
	/**
	* Creates YXmlEvent and calls observers.
	*
	* @param {Transaction} transaction
	* @param {Set<null|string>} parentSubs Keys changed on this type. `null` if list was modified.
	*/
	_callObserver(transaction, parentSubs) {
		callTypeObservers(this, transaction, new YXmlEvent(this, parentSubs, transaction));
	}
	/**
	* Get the string representation of all the children of this YXmlFragment.
	*
	* @return {string} The string representation of all children.
	*/
	toString() {
		return typeListMap(this, (xml) => xml.toString()).join("");
	}
	/**
	* @return {string}
	*/
	toJSON() {
		return this.toString();
	}
	/**
	* Creates a Dom Element that mirrors this YXmlElement.
	*
	* @param {Document} [_document=document] The document object (you must define
	*                                        this when calling this method in
	*                                        nodejs)
	* @param {Object<string, any>} [hooks={}] Optional property to customize how hooks
	*                                             are presented in the DOM
	* @param {any} [binding] You should not set this property. This is
	*                               used if DomBinding wants to create a
	*                               association to the created DOM type.
	* @return {Node} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
	*
	* @public
	*/
	toDOM(_document = document, hooks = {}, binding) {
		const fragment = _document.createDocumentFragment();
		if (binding !== void 0) binding._createAssociation(fragment, this);
		typeListForEach(this, (xmlType) => {
			fragment.insertBefore(xmlType.toDOM(_document, hooks, binding), null);
		});
		return fragment;
	}
	/**
	* Inserts new content at an index.
	*
	* @example
	*  // Insert character 'a' at position 0
	*  xml.insert(0, [new Y.XmlText('text')])
	*
	* @param {number} index The index to insert content at
	* @param {Array<YXmlElement|YXmlText>} content The array of content
	*/
	insert(index, content) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			typeListInsertGenerics(transaction, this, index, content);
		});
		else this._prelimContent.splice(index, 0, ...content);
	}
	/**
	* Inserts new content at an index.
	*
	* @example
	*  // Insert character 'a' at position 0
	*  xml.insert(0, [new Y.XmlText('text')])
	*
	* @param {null|Item|YXmlElement|YXmlText} ref The index to insert content at
	* @param {Array<YXmlElement|YXmlText>} content The array of content
	*/
	insertAfter(ref, content) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			const refItem = ref && ref instanceof AbstractType ? ref._item : ref;
			typeListInsertGenericsAfter(transaction, this, refItem, content);
		});
		else {
			const pc = this._prelimContent;
			const index = ref === null ? 0 : pc.findIndex((el) => el === ref) + 1;
			if (index === 0 && ref !== null) throw create$3("Reference item not found");
			pc.splice(index, 0, ...content);
		}
	}
	/**
	* Deletes elements starting from an index.
	*
	* @param {number} index Index at which to start deleting elements
	* @param {number} [length=1] The number of elements to remove. Defaults to 1.
	*/
	delete(index, length = 1) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			typeListDelete(transaction, this, index, length);
		});
		else this._prelimContent.splice(index, length);
	}
	/**
	* Transforms this YArray to a JavaScript Array.
	*
	* @return {Array<YXmlElement|YXmlText|YXmlHook>}
	*/
	toArray() {
		return typeListToArray(this);
	}
	/**
	* Appends content to this YArray.
	*
	* @param {Array<YXmlElement|YXmlText>} content Array of content to append.
	*/
	push(content) {
		this.insert(this.length, content);
	}
	/**
	* Prepends content to this YArray.
	*
	* @param {Array<YXmlElement|YXmlText>} content Array of content to prepend.
	*/
	unshift(content) {
		this.insert(0, content);
	}
	/**
	* Returns the i-th element from a YArray.
	*
	* @param {number} index The index of the element to return from the YArray
	* @return {YXmlElement|YXmlText}
	*/
	get(index) {
		return typeListGet(this, index);
	}
	/**
	* Returns a portion of this YXmlFragment into a JavaScript Array selected
	* from start to end (end not included).
	*
	* @param {number} [start]
	* @param {number} [end]
	* @return {Array<YXmlElement|YXmlText>}
	*/
	slice(start = 0, end = this.length) {
		return typeListSlice(this, start, end);
	}
	/**
	* Executes a provided function on once on every child element.
	*
	* @param {function(YXmlElement|YXmlText,number, typeof self):void} f A function to execute on every element of this YArray.
	*/
	forEach(f) {
		typeListForEach(this, f);
	}
	/**
	* Transform the properties of this type to binary and write it to an
	* BinaryEncoder.
	*
	* This is called when this Item is sent to a remote peer.
	*
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
	*/
	_write(encoder) {
		encoder.writeTypeRef(YXmlFragmentRefID);
	}
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} _decoder
* @return {YXmlFragment}
*
* @private
* @function
*/
const readYXmlFragment = (_decoder) => new YXmlFragment();
/**
* @typedef {Object|number|null|Array<any>|string|Uint8Array|AbstractType<any>} ValueTypes
*/
/**
* An YXmlElement imitates the behavior of a
* https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element
*
* * An YXmlElement has attributes (key value pairs)
* * An YXmlElement has childElements that must inherit from YXmlElement
*
* @template {{ [key: string]: ValueTypes }} [KV={ [key: string]: string }]
*/
var YXmlElement = class YXmlElement extends YXmlFragment {
	constructor(nodeName = "UNDEFINED") {
		super();
		this.nodeName = nodeName;
		/**
		* @type {Map<string, any>|null}
		*/
		this._prelimAttrs = /* @__PURE__ */ new Map();
	}
	/**
	* @type {YXmlElement|YXmlText|null}
	*/
	get nextSibling() {
		const n = this._item ? this._item.next : null;
		return n ? n.content.type : null;
	}
	/**
	* @type {YXmlElement|YXmlText|null}
	*/
	get prevSibling() {
		const n = this._item ? this._item.prev : null;
		return n ? n.content.type : null;
	}
	/**
	* Integrate this type into the Yjs instance.
	*
	* * Save this struct in the os
	* * This type is sent to other client
	* * Observer functions are fired
	*
	* @param {Doc} y The Yjs instance
	* @param {Item} item
	*/
	_integrate(y, item) {
		super._integrate(y, item);
		this._prelimAttrs.forEach((value, key) => {
			this.setAttribute(key, value);
		});
		this._prelimAttrs = null;
	}
	/**
	* Creates an Item with the same effect as this Item (without position effect)
	*
	* @return {YXmlElement}
	*/
	_copy() {
		return new YXmlElement(this.nodeName);
	}
	/**
	* Makes a copy of this data type that can be included somewhere else.
	*
	* Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
	*
	* @return {YXmlElement<KV>}
	*/
	clone() {
		/**
		* @type {YXmlElement<KV>}
		*/
		const el = new YXmlElement(this.nodeName);
		forEach(this.getAttributes(), (value, key) => {
			el.setAttribute(key, value);
		});
		el.insert(0, this.toArray().map((v) => v instanceof AbstractType ? v.clone() : v));
		return el;
	}
	/**
	* Returns the XML serialization of this YXmlElement.
	* The attributes are ordered by attribute-name, so you can easily use this
	* method to compare YXmlElements
	*
	* @return {string} The string representation of this type.
	*
	* @public
	*/
	toString() {
		const attrs = this.getAttributes();
		const stringBuilder = [];
		const keys = [];
		for (const key in attrs) keys.push(key);
		keys.sort();
		const keysLen = keys.length;
		for (let i = 0; i < keysLen; i++) {
			const key = keys[i];
			stringBuilder.push(key + "=\"" + attrs[key] + "\"");
		}
		const nodeName = this.nodeName.toLocaleLowerCase();
		return `<${nodeName}${stringBuilder.length > 0 ? " " + stringBuilder.join(" ") : ""}>${super.toString()}</${nodeName}>`;
	}
	/**
	* Removes an attribute from this YXmlElement.
	*
	* @param {string} attributeName The attribute name that is to be removed.
	*
	* @public
	*/
	removeAttribute(attributeName) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			typeMapDelete(transaction, this, attributeName);
		});
		else
 /** @type {Map<string,any>} */ this._prelimAttrs.delete(attributeName);
	}
	/**
	* Sets or updates an attribute.
	*
	* @template {keyof KV & string} KEY
	*
	* @param {KEY} attributeName The attribute name that is to be set.
	* @param {KV[KEY]} attributeValue The attribute value that is to be set.
	*
	* @public
	*/
	setAttribute(attributeName, attributeValue) {
		if (this.doc !== null) transact$2(this.doc, (transaction) => {
			typeMapSet(transaction, this, attributeName, attributeValue);
		});
		else
 /** @type {Map<string, any>} */ this._prelimAttrs.set(attributeName, attributeValue);
	}
	/**
	* Returns an attribute value that belongs to the attribute name.
	*
	* @template {keyof KV & string} KEY
	*
	* @param {KEY} attributeName The attribute name that identifies the
	*                               queried value.
	* @return {KV[KEY]|undefined} The queried attribute value.
	*
	* @public
	*/
	getAttribute(attributeName) {
		return typeMapGet(this, attributeName);
	}
	/**
	* Returns whether an attribute exists
	*
	* @param {string} attributeName The attribute name to check for existence.
	* @return {boolean} whether the attribute exists.
	*
	* @public
	*/
	hasAttribute(attributeName) {
		return typeMapHas(this, attributeName);
	}
	/**
	* Returns all attribute name/value pairs in a JSON Object.
	*
	* @param {Snapshot} [snapshot]
	* @return {{ [Key in Extract<keyof KV,string>]?: KV[Key]}} A JSON Object that describes the attributes.
	*
	* @public
	*/
	getAttributes(snapshot) {
		return snapshot ? typeMapGetAllSnapshot(this, snapshot) : typeMapGetAll(this);
	}
	/**
	* Creates a Dom Element that mirrors this YXmlElement.
	*
	* @param {Document} [_document=document] The document object (you must define
	*                                        this when calling this method in
	*                                        nodejs)
	* @param {Object<string, any>} [hooks={}] Optional property to customize how hooks
	*                                             are presented in the DOM
	* @param {any} [binding] You should not set this property. This is
	*                               used if DomBinding wants to create a
	*                               association to the created DOM type.
	* @return {Node} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
	*
	* @public
	*/
	toDOM(_document = document, hooks = {}, binding) {
		const dom = _document.createElement(this.nodeName);
		const attrs = this.getAttributes();
		for (const key in attrs) {
			const value = attrs[key];
			if (typeof value === "string") dom.setAttribute(key, value);
		}
		typeListForEach(this, (yxml) => {
			dom.appendChild(yxml.toDOM(_document, hooks, binding));
		});
		if (binding !== void 0) binding._createAssociation(dom, this);
		return dom;
	}
	/**
	* Transform the properties of this type to binary and write it to an
	* BinaryEncoder.
	*
	* This is called when this Item is sent to a remote peer.
	*
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
	*/
	_write(encoder) {
		encoder.writeTypeRef(YXmlElementRefID);
		encoder.writeKey(this.nodeName);
	}
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
* @return {YXmlElement}
*
* @function
*/
const readYXmlElement = (decoder) => new YXmlElement(decoder.readKey());
/**
* @extends YEvent<YXmlElement|YXmlText|YXmlFragment>
* An Event that describes changes on a YXml Element or Yxml Fragment
*/
var YXmlEvent = class extends YEvent {
	/**
	* @param {YXmlElement|YXmlText|YXmlFragment} target The target on which the event is created.
	* @param {Set<string|null>} subs The set of changed attributes. `null` is included if the
	*                   child list changed.
	* @param {Transaction} transaction The transaction instance with which the
	*                                  change was created.
	*/
	constructor(target, subs, transaction) {
		super(target, transaction);
		/**
		* Whether the children changed.
		* @type {Boolean}
		* @private
		*/
		this.childListChanged = false;
		/**
		* Set of all changed attributes.
		* @type {Set<string>}
		*/
		this.attributesChanged = /* @__PURE__ */ new Set();
		subs.forEach((sub) => {
			if (sub === null) this.childListChanged = true;
			else this.attributesChanged.add(sub);
		});
	}
};
/**
* You can manage binding to a custom type with YXmlHook.
*
* @extends {YMap<any>}
*/
var YXmlHook = class YXmlHook extends YMap {
	/**
	* @param {string} hookName nodeName of the Dom Node.
	*/
	constructor(hookName) {
		super();
		/**
		* @type {string}
		*/
		this.hookName = hookName;
	}
	/**
	* Creates an Item with the same effect as this Item (without position effect)
	*/
	_copy() {
		return new YXmlHook(this.hookName);
	}
	/**
	* Makes a copy of this data type that can be included somewhere else.
	*
	* Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
	*
	* @return {YXmlHook}
	*/
	clone() {
		const el = new YXmlHook(this.hookName);
		this.forEach((value, key) => {
			el.set(key, value);
		});
		return el;
	}
	/**
	* Creates a Dom Element that mirrors this YXmlElement.
	*
	* @param {Document} [_document=document] The document object (you must define
	*                                        this when calling this method in
	*                                        nodejs)
	* @param {Object.<string, any>} [hooks] Optional property to customize how hooks
	*                                             are presented in the DOM
	* @param {any} [binding] You should not set this property. This is
	*                               used if DomBinding wants to create a
	*                               association to the created DOM type
	* @return {Element} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
	*
	* @public
	*/
	toDOM(_document = document, hooks = {}, binding) {
		const hook = hooks[this.hookName];
		let dom;
		if (hook !== void 0) dom = hook.createDom(this);
		else dom = document.createElement(this.hookName);
		dom.setAttribute("data-yjs-hook", this.hookName);
		if (binding !== void 0) binding._createAssociation(dom, this);
		return dom;
	}
	/**
	* Transform the properties of this type to binary and write it to an
	* BinaryEncoder.
	*
	* This is called when this Item is sent to a remote peer.
	*
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
	*/
	_write(encoder) {
		encoder.writeTypeRef(YXmlHookRefID);
		encoder.writeKey(this.hookName);
	}
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
* @return {YXmlHook}
*
* @private
* @function
*/
const readYXmlHook = (decoder) => new YXmlHook(decoder.readKey());
/**
* Represents text in a Dom Element. In the future this type will also handle
* simple formatting information like bold and italic.
*/
var YXmlText = class YXmlText extends YText {
	/**
	* @type {YXmlElement|YXmlText|null}
	*/
	get nextSibling() {
		const n = this._item ? this._item.next : null;
		return n ? n.content.type : null;
	}
	/**
	* @type {YXmlElement|YXmlText|null}
	*/
	get prevSibling() {
		const n = this._item ? this._item.prev : null;
		return n ? n.content.type : null;
	}
	_copy() {
		return new YXmlText();
	}
	/**
	* Makes a copy of this data type that can be included somewhere else.
	*
	* Note that the content is only readable _after_ it has been included somewhere in the Ydoc.
	*
	* @return {YXmlText}
	*/
	clone() {
		const text = new YXmlText();
		text.applyDelta(this.toDelta());
		return text;
	}
	/**
	* Creates a Dom Element that mirrors this YXmlText.
	*
	* @param {Document} [_document=document] The document object (you must define
	*                                        this when calling this method in
	*                                        nodejs)
	* @param {Object<string, any>} [hooks] Optional property to customize how hooks
	*                                             are presented in the DOM
	* @param {any} [binding] You should not set this property. This is
	*                               used if DomBinding wants to create a
	*                               association to the created DOM type.
	* @return {Text} The {@link https://developer.mozilla.org/en-US/docs/Web/API/Element|Dom Element}
	*
	* @public
	*/
	toDOM(_document = document, hooks, binding) {
		const dom = _document.createTextNode(this.toString());
		if (binding !== void 0) binding._createAssociation(dom, this);
		return dom;
	}
	toString() {
		return this.toDelta().map((delta) => {
			const nestedNodes = [];
			for (const nodeName in delta.attributes) {
				const attrs = [];
				for (const key in delta.attributes[nodeName]) attrs.push({
					key,
					value: delta.attributes[nodeName][key]
				});
				attrs.sort((a, b) => a.key < b.key ? -1 : 1);
				nestedNodes.push({
					nodeName,
					attrs
				});
			}
			nestedNodes.sort((a, b) => a.nodeName < b.nodeName ? -1 : 1);
			let str = "";
			for (let i = 0; i < nestedNodes.length; i++) {
				const node = nestedNodes[i];
				str += `<${node.nodeName}`;
				for (let j = 0; j < node.attrs.length; j++) {
					const attr = node.attrs[j];
					str += ` ${attr.key}="${attr.value}"`;
				}
				str += ">";
			}
			str += delta.insert;
			for (let i = nestedNodes.length - 1; i >= 0; i--) str += `</${nestedNodes[i].nodeName}>`;
			return str;
		}).join("");
	}
	/**
	* @return {string}
	*/
	toJSON() {
		return this.toString();
	}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	*/
	_write(encoder) {
		encoder.writeTypeRef(YXmlTextRefID);
	}
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
* @return {YXmlText}
*
* @private
* @function
*/
const readYXmlText = (decoder) => new YXmlText();
var AbstractStruct = class {
	/**
	* @param {ID} id
	* @param {number} length
	*/
	constructor(id, length) {
		this.id = id;
		this.length = length;
	}
	/**
	* @type {boolean}
	*/
	get deleted() {
		throw methodUnimplemented();
	}
	/**
	* Merge this struct with the item to the right.
	* This method is already assuming that `this.id.clock + this.length === this.id.clock`.
	* Also this method does *not* remove right from StructStore!
	* @param {AbstractStruct} right
	* @return {boolean} whether this merged with right
	*/
	mergeWith(right) {
		return false;
	}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
	* @param {number} offset
	* @param {number} encodingRef
	*/
	write(encoder, offset, encodingRef) {
		throw methodUnimplemented();
	}
	/**
	* @param {Transaction} transaction
	* @param {number} offset
	*/
	integrate(transaction, offset) {
		throw methodUnimplemented();
	}
};
const structGCRefNumber = 0;
/**
* @private
*/
var GC = class extends AbstractStruct {
	get deleted() {
		return true;
	}
	delete() {}
	/**
	* @param {GC} right
	* @return {boolean}
	*/
	mergeWith(right) {
		if (this.constructor !== right.constructor) return false;
		this.length += right.length;
		return true;
	}
	/**
	* @param {Transaction} transaction
	* @param {number} offset
	*/
	integrate(transaction, offset) {
		if (offset > 0) {
			this.id.clock += offset;
			this.length -= offset;
		}
		addStruct(transaction.doc.store, this);
	}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	* @param {number} offset
	*/
	write(encoder, offset) {
		encoder.writeInfo(structGCRefNumber);
		encoder.writeLen(this.length - offset);
	}
	/**
	* @param {Transaction} transaction
	* @param {StructStore} store
	* @return {null | number}
	*/
	getMissing(transaction, store) {
		return null;
	}
};
var ContentBinary = class ContentBinary {
	/**
	* @param {Uint8Array} content
	*/
	constructor(content) {
		this.content = content;
	}
	/**
	* @return {number}
	*/
	getLength() {
		return 1;
	}
	/**
	* @return {Array<any>}
	*/
	getContent() {
		return [this.content];
	}
	/**
	* @return {boolean}
	*/
	isCountable() {
		return true;
	}
	/**
	* @return {ContentBinary}
	*/
	copy() {
		return new ContentBinary(this.content);
	}
	/**
	* @param {number} offset
	* @return {ContentBinary}
	*/
	splice(offset) {
		throw methodUnimplemented();
	}
	/**
	* @param {ContentBinary} right
	* @return {boolean}
	*/
	mergeWith(right) {
		return false;
	}
	/**
	* @param {Transaction} transaction
	* @param {Item} item
	*/
	integrate(transaction, item) {}
	/**
	* @param {Transaction} transaction
	*/
	delete(transaction) {}
	/**
	* @param {StructStore} store
	*/
	gc(store) {}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	* @param {number} offset
	*/
	write(encoder, offset) {
		encoder.writeBuf(this.content);
	}
	/**
	* @return {number}
	*/
	getRef() {
		return 3;
	}
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2 } decoder
* @return {ContentBinary}
*/
const readContentBinary = (decoder) => new ContentBinary(decoder.readBuf());
var ContentDeleted = class ContentDeleted {
	/**
	* @param {number} len
	*/
	constructor(len) {
		this.len = len;
	}
	/**
	* @return {number}
	*/
	getLength() {
		return this.len;
	}
	/**
	* @return {Array<any>}
	*/
	getContent() {
		return [];
	}
	/**
	* @return {boolean}
	*/
	isCountable() {
		return false;
	}
	/**
	* @return {ContentDeleted}
	*/
	copy() {
		return new ContentDeleted(this.len);
	}
	/**
	* @param {number} offset
	* @return {ContentDeleted}
	*/
	splice(offset) {
		const right = new ContentDeleted(this.len - offset);
		this.len = offset;
		return right;
	}
	/**
	* @param {ContentDeleted} right
	* @return {boolean}
	*/
	mergeWith(right) {
		this.len += right.len;
		return true;
	}
	/**
	* @param {Transaction} transaction
	* @param {Item} item
	*/
	integrate(transaction, item) {
		addToDeleteSet(transaction.deleteSet, item.id.client, item.id.clock, this.len);
		item.markDeleted();
	}
	/**
	* @param {Transaction} transaction
	*/
	delete(transaction) {}
	/**
	* @param {StructStore} store
	*/
	gc(store) {}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	* @param {number} offset
	*/
	write(encoder, offset) {
		encoder.writeLen(this.len - offset);
	}
	/**
	* @return {number}
	*/
	getRef() {
		return 1;
	}
};
/**
* @private
*
* @param {UpdateDecoderV1 | UpdateDecoderV2 } decoder
* @return {ContentDeleted}
*/
const readContentDeleted = (decoder) => new ContentDeleted(decoder.readLen());
/**
* @param {string} guid
* @param {Object<string, any>} opts
*/
const createDocFromOpts = (guid, opts) => new Doc({
	guid,
	...opts,
	shouldLoad: opts.shouldLoad || opts.autoLoad || false
});
/**
* @private
*/
var ContentDoc = class ContentDoc {
	/**
	* @param {Doc} doc
	*/
	constructor(doc) {
		if (doc._item) console.error("This document was already integrated as a sub-document. You should create a second instance instead with the same guid.");
		/**
		* @type {Doc}
		*/
		this.doc = doc;
		/**
		* @type {any}
		*/
		const opts = {};
		this.opts = opts;
		if (!doc.gc) opts.gc = false;
		if (doc.autoLoad) opts.autoLoad = true;
		if (doc.meta !== null) opts.meta = doc.meta;
	}
	/**
	* @return {number}
	*/
	getLength() {
		return 1;
	}
	/**
	* @return {Array<any>}
	*/
	getContent() {
		return [this.doc];
	}
	/**
	* @return {boolean}
	*/
	isCountable() {
		return true;
	}
	/**
	* @return {ContentDoc}
	*/
	copy() {
		return new ContentDoc(createDocFromOpts(this.doc.guid, this.opts));
	}
	/**
	* @param {number} offset
	* @return {ContentDoc}
	*/
	splice(offset) {
		throw methodUnimplemented();
	}
	/**
	* @param {ContentDoc} right
	* @return {boolean}
	*/
	mergeWith(right) {
		return false;
	}
	/**
	* @param {Transaction} transaction
	* @param {Item} item
	*/
	integrate(transaction, item) {
		this.doc._item = item;
		transaction.subdocsAdded.add(this.doc);
		if (this.doc.shouldLoad) transaction.subdocsLoaded.add(this.doc);
	}
	/**
	* @param {Transaction} transaction
	*/
	delete(transaction) {
		if (transaction.subdocsAdded.has(this.doc)) transaction.subdocsAdded.delete(this.doc);
		else transaction.subdocsRemoved.add(this.doc);
	}
	/**
	* @param {StructStore} store
	*/
	gc(store) {}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	* @param {number} offset
	*/
	write(encoder, offset) {
		encoder.writeString(this.doc.guid);
		encoder.writeAny(this.opts);
	}
	/**
	* @return {number}
	*/
	getRef() {
		return 9;
	}
};
/**
* @private
*
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
* @return {ContentDoc}
*/
const readContentDoc = (decoder) => new ContentDoc(createDocFromOpts(decoder.readString(), decoder.readAny()));
/**
* @private
*/
var ContentEmbed = class ContentEmbed {
	/**
	* @param {Object} embed
	*/
	constructor(embed) {
		this.embed = embed;
	}
	/**
	* @return {number}
	*/
	getLength() {
		return 1;
	}
	/**
	* @return {Array<any>}
	*/
	getContent() {
		return [this.embed];
	}
	/**
	* @return {boolean}
	*/
	isCountable() {
		return true;
	}
	/**
	* @return {ContentEmbed}
	*/
	copy() {
		return new ContentEmbed(this.embed);
	}
	/**
	* @param {number} offset
	* @return {ContentEmbed}
	*/
	splice(offset) {
		throw methodUnimplemented();
	}
	/**
	* @param {ContentEmbed} right
	* @return {boolean}
	*/
	mergeWith(right) {
		return false;
	}
	/**
	* @param {Transaction} transaction
	* @param {Item} item
	*/
	integrate(transaction, item) {}
	/**
	* @param {Transaction} transaction
	*/
	delete(transaction) {}
	/**
	* @param {StructStore} store
	*/
	gc(store) {}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	* @param {number} offset
	*/
	write(encoder, offset) {
		encoder.writeJSON(this.embed);
	}
	/**
	* @return {number}
	*/
	getRef() {
		return 5;
	}
};
/**
* @private
*
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
* @return {ContentEmbed}
*/
const readContentEmbed = (decoder) => new ContentEmbed(decoder.readJSON());
/**
* @private
*/
var ContentFormat = class ContentFormat {
	/**
	* @param {string} key
	* @param {Object} value
	*/
	constructor(key, value) {
		this.key = key;
		this.value = value;
	}
	/**
	* @return {number}
	*/
	getLength() {
		return 1;
	}
	/**
	* @return {Array<any>}
	*/
	getContent() {
		return [];
	}
	/**
	* @return {boolean}
	*/
	isCountable() {
		return false;
	}
	/**
	* @return {ContentFormat}
	*/
	copy() {
		return new ContentFormat(this.key, this.value);
	}
	/**
	* @param {number} _offset
	* @return {ContentFormat}
	*/
	splice(_offset) {
		throw methodUnimplemented();
	}
	/**
	* @param {ContentFormat} _right
	* @return {boolean}
	*/
	mergeWith(_right) {
		return false;
	}
	/**
	* @param {Transaction} _transaction
	* @param {Item} item
	*/
	integrate(_transaction, item) {
		const p = item.parent;
		p._searchMarker = null;
		p._hasFormatting = true;
	}
	/**
	* @param {Transaction} transaction
	*/
	delete(transaction) {}
	/**
	* @param {StructStore} store
	*/
	gc(store) {}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	* @param {number} offset
	*/
	write(encoder, offset) {
		encoder.writeKey(this.key);
		encoder.writeJSON(this.value);
	}
	/**
	* @return {number}
	*/
	getRef() {
		return 6;
	}
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
* @return {ContentFormat}
*/
const readContentFormat = (decoder) => new ContentFormat(decoder.readKey(), decoder.readJSON());
/**
* @private
*/
var ContentJSON = class ContentJSON {
	/**
	* @param {Array<any>} arr
	*/
	constructor(arr) {
		/**
		* @type {Array<any>}
		*/
		this.arr = arr;
	}
	/**
	* @return {number}
	*/
	getLength() {
		return this.arr.length;
	}
	/**
	* @return {Array<any>}
	*/
	getContent() {
		return this.arr;
	}
	/**
	* @return {boolean}
	*/
	isCountable() {
		return true;
	}
	/**
	* @return {ContentJSON}
	*/
	copy() {
		return new ContentJSON(this.arr);
	}
	/**
	* @param {number} offset
	* @return {ContentJSON}
	*/
	splice(offset) {
		const right = new ContentJSON(this.arr.slice(offset));
		this.arr = this.arr.slice(0, offset);
		return right;
	}
	/**
	* @param {ContentJSON} right
	* @return {boolean}
	*/
	mergeWith(right) {
		this.arr = this.arr.concat(right.arr);
		return true;
	}
	/**
	* @param {Transaction} transaction
	* @param {Item} item
	*/
	integrate(transaction, item) {}
	/**
	* @param {Transaction} transaction
	*/
	delete(transaction) {}
	/**
	* @param {StructStore} store
	*/
	gc(store) {}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	* @param {number} offset
	*/
	write(encoder, offset) {
		const len = this.arr.length;
		encoder.writeLen(len - offset);
		for (let i = offset; i < len; i++) {
			const c = this.arr[i];
			encoder.writeString(c === void 0 ? "undefined" : JSON.stringify(c));
		}
	}
	/**
	* @return {number}
	*/
	getRef() {
		return 2;
	}
};
/**
* @private
*
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
* @return {ContentJSON}
*/
const readContentJSON = (decoder) => {
	const len = decoder.readLen();
	const cs = [];
	for (let i = 0; i < len; i++) {
		const c = decoder.readString();
		if (c === "undefined") cs.push(void 0);
		else cs.push(JSON.parse(c));
	}
	return new ContentJSON(cs);
};
const isDevMode = getVariable("node_env") === "development";
var ContentAny = class ContentAny {
	/**
	* @param {Array<any>} arr
	*/
	constructor(arr) {
		/**
		* @type {Array<any>}
		*/
		this.arr = arr;
		isDevMode && deepFreeze(arr);
	}
	/**
	* @return {number}
	*/
	getLength() {
		return this.arr.length;
	}
	/**
	* @return {Array<any>}
	*/
	getContent() {
		return this.arr;
	}
	/**
	* @return {boolean}
	*/
	isCountable() {
		return true;
	}
	/**
	* @return {ContentAny}
	*/
	copy() {
		return new ContentAny(this.arr);
	}
	/**
	* @param {number} offset
	* @return {ContentAny}
	*/
	splice(offset) {
		const right = new ContentAny(this.arr.slice(offset));
		this.arr = this.arr.slice(0, offset);
		return right;
	}
	/**
	* @param {ContentAny} right
	* @return {boolean}
	*/
	mergeWith(right) {
		this.arr = this.arr.concat(right.arr);
		return true;
	}
	/**
	* @param {Transaction} transaction
	* @param {Item} item
	*/
	integrate(transaction, item) {}
	/**
	* @param {Transaction} transaction
	*/
	delete(transaction) {}
	/**
	* @param {StructStore} store
	*/
	gc(store) {}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	* @param {number} offset
	*/
	write(encoder, offset) {
		const len = this.arr.length;
		encoder.writeLen(len - offset);
		for (let i = offset; i < len; i++) {
			const c = this.arr[i];
			encoder.writeAny(c);
		}
	}
	/**
	* @return {number}
	*/
	getRef() {
		return 8;
	}
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
* @return {ContentAny}
*/
const readContentAny = (decoder) => {
	const len = decoder.readLen();
	const cs = [];
	for (let i = 0; i < len; i++) cs.push(decoder.readAny());
	return new ContentAny(cs);
};
/**
* @private
*/
var ContentString = class ContentString {
	/**
	* @param {string} str
	*/
	constructor(str) {
		/**
		* @type {string}
		*/
		this.str = str;
	}
	/**
	* @return {number}
	*/
	getLength() {
		return this.str.length;
	}
	/**
	* @return {Array<any>}
	*/
	getContent() {
		return this.str.split("");
	}
	/**
	* @return {boolean}
	*/
	isCountable() {
		return true;
	}
	/**
	* @return {ContentString}
	*/
	copy() {
		return new ContentString(this.str);
	}
	/**
	* @param {number} offset
	* @return {ContentString}
	*/
	splice(offset) {
		const right = new ContentString(this.str.slice(offset));
		this.str = this.str.slice(0, offset);
		const firstCharCode = this.str.charCodeAt(offset - 1);
		if (firstCharCode >= 55296 && firstCharCode <= 56319) {
			this.str = this.str.slice(0, offset - 1) + "�";
			right.str = "�" + right.str.slice(1);
		}
		return right;
	}
	/**
	* @param {ContentString} right
	* @return {boolean}
	*/
	mergeWith(right) {
		this.str += right.str;
		return true;
	}
	/**
	* @param {Transaction} transaction
	* @param {Item} item
	*/
	integrate(transaction, item) {}
	/**
	* @param {Transaction} transaction
	*/
	delete(transaction) {}
	/**
	* @param {StructStore} store
	*/
	gc(store) {}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	* @param {number} offset
	*/
	write(encoder, offset) {
		encoder.writeString(offset === 0 ? this.str : this.str.slice(offset));
	}
	/**
	* @return {number}
	*/
	getRef() {
		return 4;
	}
};
/**
* @private
*
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
* @return {ContentString}
*/
const readContentString = (decoder) => new ContentString(decoder.readString());
/**
* @type {Array<function(UpdateDecoderV1 | UpdateDecoderV2):AbstractType<any>>}
* @private
*/
const typeRefs = [
	readYArray,
	readYMap,
	readYText,
	readYXmlElement,
	readYXmlFragment,
	readYXmlHook,
	readYXmlText
];
const YArrayRefID = 0;
const YMapRefID = 1;
const YTextRefID = 2;
const YXmlElementRefID = 3;
const YXmlFragmentRefID = 4;
const YXmlHookRefID = 5;
const YXmlTextRefID = 6;
/**
* @private
*/
var ContentType = class ContentType {
	/**
	* @param {AbstractType<any>} type
	*/
	constructor(type) {
		/**
		* @type {AbstractType<any>}
		*/
		this.type = type;
	}
	/**
	* @return {number}
	*/
	getLength() {
		return 1;
	}
	/**
	* @return {Array<any>}
	*/
	getContent() {
		return [this.type];
	}
	/**
	* @return {boolean}
	*/
	isCountable() {
		return true;
	}
	/**
	* @return {ContentType}
	*/
	copy() {
		return new ContentType(this.type._copy());
	}
	/**
	* @param {number} offset
	* @return {ContentType}
	*/
	splice(offset) {
		throw methodUnimplemented();
	}
	/**
	* @param {ContentType} right
	* @return {boolean}
	*/
	mergeWith(right) {
		return false;
	}
	/**
	* @param {Transaction} transaction
	* @param {Item} item
	*/
	integrate(transaction, item) {
		this.type._integrate(transaction.doc, item);
	}
	/**
	* @param {Transaction} transaction
	*/
	delete(transaction) {
		let item = this.type._start;
		while (item !== null) {
			if (!item.deleted) item.delete(transaction);
			else if (item.id.clock < (transaction.beforeState.get(item.id.client) || 0)) transaction._mergeStructs.push(item);
			item = item.right;
		}
		this.type._map.forEach((item) => {
			if (!item.deleted) item.delete(transaction);
			else if (item.id.clock < (transaction.beforeState.get(item.id.client) || 0)) transaction._mergeStructs.push(item);
		});
		transaction.changed.delete(this.type);
	}
	/**
	* @param {StructStore} store
	*/
	gc(store) {
		let item = this.type._start;
		while (item !== null) {
			item.gc(store, true);
			item = item.right;
		}
		this.type._start = null;
		this.type._map.forEach(
			/** @param {Item | null} item */
			(item) => {
				while (item !== null) {
					item.gc(store, true);
					item = item.left;
				}
			}
		);
		this.type._map = /* @__PURE__ */ new Map();
	}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	* @param {number} offset
	*/
	write(encoder, offset) {
		this.type._write(encoder);
	}
	/**
	* @return {number}
	*/
	getRef() {
		return 7;
	}
};
/**
* @private
*
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
* @return {ContentType}
*/
const readContentType = (decoder) => new ContentType(typeRefs[decoder.readTypeRef()](decoder));
/**
* Split leftItem into two items
* @param {Transaction} transaction
* @param {Item} leftItem
* @param {number} diff
* @return {Item}
*
* @function
* @private
*/
const splitItem = (transaction, leftItem, diff) => {
	const { client, clock } = leftItem.id;
	const rightItem = new Item(createID(client, clock + diff), leftItem, createID(client, clock + diff - 1), leftItem.right, leftItem.rightOrigin, leftItem.parent, leftItem.parentSub, leftItem.content.splice(diff));
	if (leftItem.deleted) rightItem.markDeleted();
	if (leftItem.keep) rightItem.keep = true;
	if (leftItem.redone !== null) rightItem.redone = createID(leftItem.redone.client, leftItem.redone.clock + diff);
	leftItem.right = rightItem;
	if (rightItem.right !== null) rightItem.right.left = rightItem;
	transaction._mergeStructs.push(rightItem);
	if (rightItem.parentSub !== null && rightItem.right === null)
 /** @type {AbstractType<any>} */ rightItem.parent._map.set(rightItem.parentSub, rightItem);
	leftItem.length = diff;
	return rightItem;
};
/**
* Abstract class that represents any content.
*/
var Item = class Item extends AbstractStruct {
	/**
	* @param {ID} id
	* @param {Item | null} left
	* @param {ID | null} origin
	* @param {Item | null} right
	* @param {ID | null} rightOrigin
	* @param {AbstractType<any>|ID|null} parent Is a type if integrated, is null if it is possible to copy parent from left or right, is ID before integration to search for it.
	* @param {string | null} parentSub
	* @param {AbstractContent} content
	*/
	constructor(id, left, origin, right, rightOrigin, parent, parentSub, content) {
		super(id, content.getLength());
		/**
		* The item that was originally to the left of this item.
		* @type {ID | null}
		*/
		this.origin = origin;
		/**
		* The item that is currently to the left of this item.
		* @type {Item | null}
		*/
		this.left = left;
		/**
		* The item that is currently to the right of this item.
		* @type {Item | null}
		*/
		this.right = right;
		/**
		* The item that was originally to the right of this item.
		* @type {ID | null}
		*/
		this.rightOrigin = rightOrigin;
		/**
		* @type {AbstractType<any>|ID|null}
		*/
		this.parent = parent;
		/**
		* If the parent refers to this item with some kind of key (e.g. YMap, the
		* key is specified here. The key is then used to refer to the list in which
		* to insert this item. If `parentSub = null` type._start is the list in
		* which to insert to. Otherwise it is `parent._map`.
		* @type {String | null}
		*/
		this.parentSub = parentSub;
		/**
		* If this type's effect is redone this type refers to the type that undid
		* this operation.
		* @type {ID | null}
		*/
		this.redone = null;
		/**
		* @type {AbstractContent}
		*/
		this.content = content;
		/**
		* bit1: keep
		* bit2: countable
		* bit3: deleted
		* bit4: mark - mark node as fast-search-marker
		* @type {number} byte
		*/
		this.info = this.content.isCountable() ? 2 : 0;
	}
	/**
	* This is used to mark the item as an indexed fast-search marker
	*
	* @type {boolean}
	*/
	set marker(isMarked) {
		if ((this.info & 8) > 0 !== isMarked) this.info ^= 8;
	}
	get marker() {
		return (this.info & 8) > 0;
	}
	/**
	* If true, do not garbage collect this Item.
	*/
	get keep() {
		return (this.info & 1) > 0;
	}
	set keep(doKeep) {
		if (this.keep !== doKeep) this.info ^= 1;
	}
	get countable() {
		return (this.info & 2) > 0;
	}
	/**
	* Whether this item was deleted or not.
	* @type {Boolean}
	*/
	get deleted() {
		return (this.info & 4) > 0;
	}
	set deleted(doDelete) {
		if (this.deleted !== doDelete) this.info ^= 4;
	}
	markDeleted() {
		this.info |= 4;
	}
	/**
	* Return the creator clientID of the missing op or define missing items and return null.
	*
	* @param {Transaction} transaction
	* @param {StructStore} store
	* @return {null | number}
	*/
	getMissing(transaction, store) {
		if (this.origin && this.origin.client !== this.id.client && this.origin.clock >= getState(store, this.origin.client)) return this.origin.client;
		if (this.rightOrigin && this.rightOrigin.client !== this.id.client && this.rightOrigin.clock >= getState(store, this.rightOrigin.client)) return this.rightOrigin.client;
		if (this.parent && this.parent.constructor === ID && this.id.client !== this.parent.client && this.parent.clock >= getState(store, this.parent.client)) return this.parent.client;
		if (this.origin) {
			this.left = getItemCleanEnd(transaction, store, this.origin);
			this.origin = this.left.lastId;
		}
		if (this.rightOrigin) {
			this.right = getItemCleanStart(transaction, this.rightOrigin);
			this.rightOrigin = this.right.id;
		}
		if (this.left && this.left.constructor === GC || this.right && this.right.constructor === GC) this.parent = null;
		else if (!this.parent) {
			if (this.left && this.left.constructor === Item) {
				this.parent = this.left.parent;
				this.parentSub = this.left.parentSub;
			} else if (this.right && this.right.constructor === Item) {
				this.parent = this.right.parent;
				this.parentSub = this.right.parentSub;
			}
		} else if (this.parent.constructor === ID) {
			const parentItem = getItem(store, this.parent);
			if (parentItem.constructor === GC) this.parent = null;
			else this.parent = parentItem.content.type;
		}
		return null;
	}
	/**
	* @param {Transaction} transaction
	* @param {number} offset
	*/
	integrate(transaction, offset) {
		if (offset > 0) {
			this.id.clock += offset;
			this.left = getItemCleanEnd(transaction, transaction.doc.store, createID(this.id.client, this.id.clock - 1));
			this.origin = this.left.lastId;
			this.content = this.content.splice(offset);
			this.length -= offset;
		}
		if (this.parent) {
			if (!this.left && (!this.right || this.right.left !== null) || this.left && this.left.right !== this.right) {
				/**
				* @type {Item|null}
				*/
				let left = this.left;
				/**
				* @type {Item|null}
				*/
				let o;
				if (left !== null) o = left.right;
				else if (this.parentSub !== null) {
					o = this.parent._map.get(this.parentSub) || null;
					while (o !== null && o.left !== null) o = o.left;
				} else o = this.parent._start;
				/**
				* @type {Set<Item>}
				*/
				const conflictingItems = /* @__PURE__ */ new Set();
				/**
				* @type {Set<Item>}
				*/
				const itemsBeforeOrigin = /* @__PURE__ */ new Set();
				while (o !== null && o !== this.right) {
					itemsBeforeOrigin.add(o);
					conflictingItems.add(o);
					if (compareIDs(this.origin, o.origin)) {
						if (o.id.client < this.id.client) {
							left = o;
							conflictingItems.clear();
						} else if (compareIDs(this.rightOrigin, o.rightOrigin)) break;
					} else if (o.origin !== null && itemsBeforeOrigin.has(getItem(transaction.doc.store, o.origin))) {
						if (!conflictingItems.has(getItem(transaction.doc.store, o.origin))) {
							left = o;
							conflictingItems.clear();
						}
					} else break;
					o = o.right;
				}
				this.left = left;
			}
			if (this.left !== null) {
				const right = this.left.right;
				this.right = right;
				this.left.right = this;
			} else {
				let r;
				if (this.parentSub !== null) {
					r = this.parent._map.get(this.parentSub) || null;
					while (r !== null && r.left !== null) r = r.left;
				} else {
					r = this.parent._start;
					/** @type {AbstractType<any>} */ this.parent._start = this;
				}
				this.right = r;
			}
			if (this.right !== null) this.right.left = this;
			else if (this.parentSub !== null) {
				/** @type {AbstractType<any>} */ this.parent._map.set(this.parentSub, this);
				if (this.left !== null) this.left.delete(transaction);
			}
			if (this.parentSub === null && this.countable && !this.deleted)
 /** @type {AbstractType<any>} */ this.parent._length += this.length;
			addStruct(transaction.doc.store, this);
			this.content.integrate(transaction, this);
			addChangedTypeToTransaction(transaction, this.parent, this.parentSub);
			if (this.parent._item !== null && this.parent._item.deleted || this.parentSub !== null && this.right !== null) this.delete(transaction);
		} else new GC(this.id, this.length).integrate(transaction, 0);
	}
	/**
	* Returns the next non-deleted item
	*/
	get next() {
		let n = this.right;
		while (n !== null && n.deleted) n = n.right;
		return n;
	}
	/**
	* Returns the previous non-deleted item
	*/
	get prev() {
		let n = this.left;
		while (n !== null && n.deleted) n = n.left;
		return n;
	}
	/**
	* Computes the last content address of this Item.
	*/
	get lastId() {
		return this.length === 1 ? this.id : createID(this.id.client, this.id.clock + this.length - 1);
	}
	/**
	* Try to merge two items
	*
	* @param {Item} right
	* @return {boolean}
	*/
	mergeWith(right) {
		if (this.constructor === right.constructor && compareIDs(right.origin, this.lastId) && this.right === right && compareIDs(this.rightOrigin, right.rightOrigin) && this.id.client === right.id.client && this.id.clock + this.length === right.id.clock && this.deleted === right.deleted && this.redone === null && right.redone === null && this.content.constructor === right.content.constructor && this.content.mergeWith(right.content)) {
			const searchMarker = this.parent._searchMarker;
			if (searchMarker) searchMarker.forEach((marker) => {
				if (marker.p === right) {
					marker.p = this;
					if (!this.deleted && this.countable) marker.index -= this.length;
				}
			});
			if (right.keep) this.keep = true;
			this.right = right.right;
			if (this.right !== null) this.right.left = this;
			this.length += right.length;
			return true;
		}
		return false;
	}
	/**
	* Mark this Item as deleted.
	*
	* @param {Transaction} transaction
	*/
	delete(transaction) {
		if (!this.deleted) {
			const parent = this.parent;
			if (this.countable && this.parentSub === null) parent._length -= this.length;
			this.markDeleted();
			addToDeleteSet(transaction.deleteSet, this.id.client, this.id.clock, this.length);
			addChangedTypeToTransaction(transaction, parent, this.parentSub);
			this.content.delete(transaction);
		}
	}
	/**
	* @param {StructStore} store
	* @param {boolean} parentGCd
	*/
	gc(store, parentGCd) {
		if (!this.deleted) throw unexpectedCase();
		this.content.gc(store);
		if (parentGCd) replaceStruct(store, this, new GC(this.id, this.length));
		else this.content = new ContentDeleted(this.length);
	}
	/**
	* Transform the properties of this type to binary and write it to an
	* BinaryEncoder.
	*
	* This is called when this Item is sent to a remote peer.
	*
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder The encoder to write data to.
	* @param {number} offset
	*/
	write(encoder, offset) {
		const origin = offset > 0 ? createID(this.id.client, this.id.clock + offset - 1) : this.origin;
		const rightOrigin = this.rightOrigin;
		const parentSub = this.parentSub;
		const info = this.content.getRef() & 31 | (origin === null ? 0 : 128) | (rightOrigin === null ? 0 : 64) | (parentSub === null ? 0 : 32);
		encoder.writeInfo(info);
		if (origin !== null) encoder.writeLeftID(origin);
		if (rightOrigin !== null) encoder.writeRightID(rightOrigin);
		if (origin === null && rightOrigin === null) {
			const parent = this.parent;
			if (parent._item !== void 0) {
				const parentItem = parent._item;
				if (parentItem === null) {
					const ykey = findRootTypeKey(parent);
					encoder.writeParentInfo(true);
					encoder.writeString(ykey);
				} else {
					encoder.writeParentInfo(false);
					encoder.writeLeftID(parentItem.id);
				}
			} else if (parent.constructor === String) {
				encoder.writeParentInfo(true);
				encoder.writeString(parent);
			} else if (parent.constructor === ID) {
				encoder.writeParentInfo(false);
				encoder.writeLeftID(parent);
			} else unexpectedCase();
			if (parentSub !== null) encoder.writeString(parentSub);
		}
		this.content.write(encoder, offset);
	}
};
/**
* @param {UpdateDecoderV1 | UpdateDecoderV2} decoder
* @param {number} info
*/
const readItemContent = (decoder, info) => contentRefs[info & 31](decoder);
/**
* A lookup map for reading Item content.
*
* @type {Array<function(UpdateDecoderV1 | UpdateDecoderV2):AbstractContent>}
*/
const contentRefs = [
	() => {
		unexpectedCase();
	},
	readContentDeleted,
	readContentJSON,
	readContentBinary,
	readContentString,
	readContentEmbed,
	readContentFormat,
	readContentType,
	readContentAny,
	readContentDoc,
	() => {
		unexpectedCase();
	}
];
const structSkipRefNumber = 10;
/**
* @private
*/
var Skip = class extends AbstractStruct {
	get deleted() {
		return true;
	}
	delete() {}
	/**
	* @param {Skip} right
	* @return {boolean}
	*/
	mergeWith(right) {
		if (this.constructor !== right.constructor) return false;
		this.length += right.length;
		return true;
	}
	/**
	* @param {Transaction} transaction
	* @param {number} offset
	*/
	integrate(transaction, offset) {
		unexpectedCase();
	}
	/**
	* @param {UpdateEncoderV1 | UpdateEncoderV2} encoder
	* @param {number} offset
	*/
	write(encoder, offset) {
		encoder.writeInfo(structSkipRefNumber);
		writeVarUint(encoder.restEncoder, this.length - offset);
	}
	/**
	* @param {Transaction} transaction
	* @param {StructStore} store
	* @return {null | number}
	*/
	getMissing(transaction, store) {
		return null;
	}
};
/** eslint-env browser */
const glo = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {};
const importIdentifier = "__ $YJS$ __";
if (glo[importIdentifier] === true)
 /**
* Dear reader of this message. Please take this seriously.
*
* If you see this message, make sure that you only import one version of Yjs. In many cases,
* your package manager installs two versions of Yjs that are used by different packages within your project.
* Another reason for this message is that some parts of your project use the commonjs version of Yjs
* and others use the EcmaScript version of Yjs.
*
* This often leads to issues that are hard to debug. We often need to perform constructor checks,
* e.g. `struct instanceof GC`. If you imported different versions of Yjs, it is impossible for us to
* do the constructor checks anymore - which might break the CRDT algorithm.
*
* https://github.com/yjs/yjs/issues/438
*/
console.error("Yjs was already imported. This breaks constructor checks and will lead to issues! - https://github.com/yjs/yjs/issues/438");
glo[importIdentifier] = true;
//#endregion
//#region src/crdt/ProjectDoc.js
/**
* @file Project CRDT document model (work document #17).
*
* Implements the project `Y.Doc` structure specified in SPEC.md Appendix B as
* a pure, dependency-light module: the root map layout, graph entity
* operations, deterministic edge keys, and the schema version migration hook.
* No Worker, no UI — everything else (Engine, persistence, mesh) builds on
* these primitives.
*/
/** Current CRDT schema version of the project document. */
const PROJECT_SCHEMA_VERSION = 1;
/** Root map name for project metadata (name, id, schema version). */
const METADATA_MAP = "metadata";
/** Root map name for the graph collection. */
const GRAPHS_MAP = "graphs";
/** Root map name for component signatures. */
const REGISTRY_MAP = "registry";
/**
* One endpoint of an edge: the node id, the port name, and the ArrayPort
* index when the port is an arrayport instance.
*
* @typedef {Object} EdgeEndpoint
* @property {string} node
* @property {string} port
* @property {number} [index]
*/
/**
* Optional edge metadata (route color, custom route points).
*
* @typedef {Object} EdgeMetadata
* @property {number} [route]
*/
/**
* A schema migration step, applied when a loaded document's schema version is
* lower than the step's version.
*
* @typedef {(doc: Y.Doc) => void} Migration
*/
/**
* Registry of schema migrations keyed by the version they upgrade TO.
* Version 1 is the identity migration (the initial layout); later versions
* append here as the schema evolves.
*
* @type {Record<number, Migration>}
*/
const MIGRATIONS = { 1: () => {} };
/**
* The canonical edge key for a node-to-node edge, incorporating ArrayPort
* indexes so concurrent mutations can never collide (SPEC Appendix B).
*
* @param {EdgeEndpoint} src
* @param {EdgeEndpoint} tgt
* @returns {string}
*/
function edgeIdFor(src, tgt) {
	return `${src.node}:${src.port}[${src.index ?? 0}]->${tgt.node}:${tgt.port}[${tgt.index ?? 0}]`;
}
/**
* The canonical edge key for an Initial Information Packet.
*
* @param {EdgeEndpoint} tgt
* @returns {string}
*/
function iipEdgeIdFor(tgt) {
	return `DATA->${tgt.node}:${tgt.port}[${tgt.index ?? 0}]`;
}
/**
* Creates an empty project document with the root maps of SPEC Appendix B and
* the current schema version in metadata.
*
* @param {string} name Human-readable project name.
* @returns {Y.Doc}
*/
function createProjectDoc(name) {
	const doc = new Doc();
	doc.transact(() => {
		doc.getMap(METADATA_MAP).set("name", name);
		doc.getMap(METADATA_MAP).set("id", newProjectId());
		doc.getMap(METADATA_MAP).set("schemaVersion", 1);
	});
	return doc;
}
/**
* Generates a project id. Uses `crypto.randomUUID` when available with a
* deterministic-ish fallback for exotic runtimes.
*
* @returns {string}
*/
function newProjectId() {
	const cryptoObject = globalThis.crypto;
	if (cryptoObject && typeof cryptoObject.randomUUID === "function") return cryptoObject.randomUUID();
	return `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
/**
* Ensures the document conforms to the current schema version, applying any
* migrations needed. Safe to call on already-current documents (no-op) and on
* fresh documents created by {@link createProjectDoc}.
*
* @param {Y.Doc} doc
* @returns {{ from: number, to: number, migrated: boolean }}
*/
function ensureProjectSchema(doc) {
	const metadata = doc.getMap(METADATA_MAP);
	const startVersion = metadata.get("schemaVersion") ?? 0;
	if (startVersion === 1) return {
		from: startVersion,
		to: 1,
		migrated: false
	};
	doc.transact(() => {
		for (let version = startVersion + 1; version <= 1; version++) {
			const migration = MIGRATIONS[version];
			if (migration) migration(doc);
		}
		metadata.set("schemaVersion", 1);
	});
	return {
		from: startVersion,
		to: 1,
		migrated: true
	};
}
/**
* Creates a graph entry in the project, or returns the existing one.
*
* @param {Y.Doc} doc
* @param {string} graphId
* @param {string} [name] Human-readable name; defaults to the graph id.
* @returns {Y.Map<any>} The graph map.
*/
function createGraph(doc, graphId, name = graphId) {
	const graphs = doc.getMap(GRAPHS_MAP);
	const existing = graphs.get(graphId);
	if (existing) return existing;
	const graph = new YMap();
	doc.transact(() => {
		graphs.set(graphId, graph);
		const graphMetadata = new YMap();
		graphMetadata.set("name", name);
		graph.set("metadata", graphMetadata);
		graph.set("nodes", new YMap());
		graph.set("edges", new YMap());
		graph.set("inports", new YMap());
		graph.set("outports", new YMap());
	});
	return graph;
}
/**
* Returns a graph map by id, or undefined.
*
* @param {Y.Doc} doc
* @param {string} graphId
* @returns {Y.Map<any> | undefined}
*/
function getGraph(doc, graphId) {
	return doc.getMap(GRAPHS_MAP).get(graphId);
}
/**
* Runs a function inside a single document transaction, so multi-step graph
* operations apply atomically. Falls back to running directly when the type
* is not attached to a document (e.g. during tests on detached types).
*
* @param {Y.Map<any>} graph
* @param {() => void} fn
*/
function transact$1(graph, fn) {
	const doc = graph.doc;
	if (doc) doc.transact(fn);
	else fn();
}
/**
* Returns the graph's nodes map.
*
* @param {Y.Map<any>} graph
* @returns {Y.Map<any>}
*/
function nodesOf(graph) {
	return graph.get("nodes");
}
/**
* Returns the graph's edges map.
*
* @param {Y.Map<any>} graph
* @returns {Y.Map<any>}
*/
function edgesOf(graph) {
	return graph.get("edges");
}
/**
* Copies a plain metadata object into a fresh Y.Map.
*
* @param {Record<string, any>} source
* @returns {Y.Map<any>}
*/
function metadataMap(source) {
	const map = new YMap();
	for (const key of Object.keys(source)) map.set(key, source[key]);
	return map;
}
/**
* Adds a node to the graph.
*
* @param {Y.Map<any>} graph
* @param {string} nodeId
* @param {string} component
* @param {{ x?: number, y?: number, [key: string]: any }} [metadata]
* @returns {Y.Map<any> | null} The node map, or null when the id already exists.
*/
function addNode(graph, nodeId, component, metadata = {}) {
	const nodes = nodesOf(graph);
	if (nodes.has(nodeId)) return null;
	const node = new YMap();
	node.set("id", nodeId);
	node.set("component", component);
	node.set("metadata", metadataMap(metadata));
	nodes.set(nodeId, node);
	return node;
}
/**
* Removes a node and everything wired to it: edges (node-to-node and IIPs)
* touching it and exported ports referencing it.
*
* @param {Y.Map<any>} graph
* @param {string} nodeId
* @returns {boolean} Whether the node existed.
*/
function removeNode(graph, nodeId) {
	const nodes = nodesOf(graph);
	if (!nodes.has(nodeId)) return false;
	transact$1(graph, () => {
		const edges = edgesOf(graph);
		for (const edgeId of [...edges.keys()]) {
			const edge = edges.get(edgeId);
			const src = edge.get("src");
			const tgt = edge.get("tgt");
			if (src && src.get("node") === nodeId || tgt.get("node") === nodeId) edges.delete(edgeId);
		}
		for (const direction of ["inports", "outports"]) {
			const ports = graph.get(direction);
			for (const portName of [...ports.keys()]) if (ports.get(portName).get("process") === nodeId) ports.delete(portName);
		}
		nodes.delete(nodeId);
	});
	return true;
}
/**
* Moves a node to new coordinates.
*
* @param {Y.Map<any>} graph
* @param {string} nodeId
* @param {number} x
* @param {number} y
* @returns {boolean} Whether the node existed.
*/
function moveNode(graph, nodeId, x, y) {
	const node = nodesOf(graph).get(nodeId);
	if (!node) return false;
	const metadata = node.get("metadata");
	transact$1(graph, () => {
		metadata.set("x", x);
		metadata.set("y", y);
	});
	return true;
}
/**
* Returns a node map by id, or undefined.
*
* @param {Y.Map<any>} graph
* @param {string} nodeId
* @returns {Y.Map<any> | undefined}
*/
function getNode(graph, nodeId) {
	return nodesOf(graph).get(nodeId);
}
/**
* Adds a node-to-node edge under its deterministic key.
*
* @param {Y.Map<any>} graph
* @param {EdgeEndpoint} src
* @param {EdgeEndpoint} tgt
* @param {EdgeMetadata} [metadata]
* @returns {string | null} The edge id, or null on duplicate or unknown node.
*/
function addEdge(graph, src, tgt, metadata = {}) {
	if (!getNode(graph, src.node) || !getNode(graph, tgt.node)) return null;
	const edgeId = edgeIdFor(src, tgt);
	const edges = edgesOf(graph);
	if (edges.has(edgeId)) return null;
	const edge = new YMap();
	edge.set("id", edgeId);
	edge.set("src", endpointMap(src));
	edge.set("tgt", endpointMap(tgt));
	edge.set("metadata", metadataMap(metadata));
	edges.set(edgeId, edge);
	return edgeId;
}
/**
* Adds an Initial Information Packet under its deterministic `DATA->` key.
*
* @param {Y.Map<any>} graph
* @param {any} data
* @param {EdgeEndpoint} tgt
* @param {{ [key: string]: any }} [metadata]
* @returns {string | null} The edge id, or null on duplicate or unknown node.
*/
function addIIP(graph, data, tgt, metadata = {}) {
	if (!getNode(graph, tgt.node)) return null;
	const edgeId = iipEdgeIdFor(tgt);
	const edges = edgesOf(graph);
	if (edges.has(edgeId)) return null;
	const edge = new YMap();
	edge.set("id", edgeId);
	edge.set("data", data);
	edge.set("tgt", endpointMap(tgt));
	edge.set("metadata", metadataMap(metadata));
	edges.set(edgeId, edge);
	return edgeId;
}
/**
* Removes an edge (node-to-node or IIP) by its deterministic id.
*
* @param {Y.Map<any>} graph
* @param {string} edgeId
* @returns {boolean} Whether the edge existed.
*/
function removeEdge(graph, edgeId) {
	const edges = edgesOf(graph);
	if (!edges.has(edgeId)) return false;
	edges.delete(edgeId);
	return true;
}
/**
* Copies an edge endpoint into a fresh Y.Map.
*
* @param {EdgeEndpoint} endpoint
* @returns {Y.Map<any>}
*/
function endpointMap(endpoint) {
	const map = new YMap();
	map.set("node", endpoint.node);
	map.set("port", endpoint.port);
	if (endpoint.index !== void 0) map.set("index", endpoint.index);
	return map;
}
/**
* Exports a node port as a graph inport.
*
* @param {Y.Map<any>} graph
* @param {string} publicName
* @param {string} nodeId
* @param {string} port
* @param {{ [key: string]: any }} [metadata]
* @returns {boolean} False when the node is unknown or the name is taken.
*/
function addInport(graph, publicName, nodeId, port, metadata = {}) {
	return addExportedPort(graph, "inports", publicName, nodeId, port, metadata);
}
/**
* Exports a node port as a graph outport.
*
* @param {Y.Map<any>} graph
* @param {string} publicName
* @param {string} nodeId
* @param {string} port
* @param {{ [key: string]: any }} [metadata]
* @returns {boolean} False when the node is unknown or the name is taken.
*/
function addOutport(graph, publicName, nodeId, port, metadata = {}) {
	return addExportedPort(graph, "outports", publicName, nodeId, port, metadata);
}
/**
* @param {Y.Map<any>} graph
* @param {"inports" | "outports"} direction
* @param {string} publicName
* @param {string} nodeId
* @param {string} port
* @param {{ [key: string]: any }} metadata
* @returns {boolean}
*/
function addExportedPort(graph, direction, publicName, nodeId, port, metadata) {
	if (!getNode(graph, nodeId)) return false;
	const ports = graph.get(direction);
	if (ports.has(publicName)) return false;
	const info = new YMap();
	info.set("process", nodeId);
	info.set("port", port);
	info.set("metadata", metadataMap(metadata));
	ports.set(publicName, info);
	return true;
}
/**
* Returns a component signature entry, or undefined.
*
* @param {Y.Doc} doc
* @param {string} componentName
* @returns {Y.Map<any> | undefined}
*/
function getComponentSignature(doc, componentName) {
	return doc.getMap(REGISTRY_MAP).get(componentName);
}
/**
* Removes an exported port.
*
* @param {Y.Map<any>} graph
* @param {"inports" | "outports"} direction
* @param {string} publicName
* @returns {boolean} Whether the port existed.
*/
function removeExportedPort(graph, direction, publicName) {
	const ports = graph.get(direction);
	if (!ports.has(publicName)) return false;
	ports.delete(publicName);
	return true;
}
//#endregion
//#region src/crdt/Protocol.js
/**
* @file IPC contract between the Main Thread ("The Glass") and the Worker
* ("The Engine"), transcribed from SPEC.md Appendix A as JSDoc-typed
* discriminated unions.
*
* The UI never commands state directly: it requests subscriptions, emits
* intents, or broadcasts ephemeral awareness. The Engine echoes authoritative
* `graph`/`network` protocol messages back.
*/
/**
* @typedef {Object} LifecycleSubscribeMessage
* @property {'LIFECYCLE'} type
* @property {'subscribe'} command
* @property {{ graphId: string }} payload
*/
/**
* @typedef {Object} QueryGetSignatureMessage
* @property {'QUERY'} type
* @property {'getSignature'} command
* @property {{ componentName: string }} payload
*/
/**
* Ephemeral awareness telemetry; never mutates the CRDT.
*
* @typedef {Object} AwarenessDragging
* @property {string} peerId
* @property {string} graphId
* @property {string} nodeId
* @property {number} x
* @property {number} y
*/
/**
* @typedef {Object} AwarenessMessage
* @property {'AWARENESS'} type
* @property {'dragging'} command
* @property {AwarenessDragging} payload
*/
/**
* @typedef {Object} IntentAddNodePayload
* @property {string} graphId
* @property {string} nodeId
* @property {string} componentName
* @property {{ x: number, y: number }} metadata
*/
/**
* @typedef {Object} IntentAddNodeMessage
* @property {'INTENT'} type
* @property {'addNode'} command
* @property {IntentAddNodePayload} payload
*/
/**
* @typedef {Object} IntentRemoveNodeMessage
* @property {'INTENT'} type
* @property {'removeNode'} command
* @property {{ graphId: string, nodeId: string }} payload
*/
/**
* @typedef {Object} IntentMoveNodePayload
* @property {string} graphId
* @property {string} nodeId
* @property {{ x: number, y: number }} metadata
*/
/**
* @typedef {Object} IntentMoveNodeMessage
* @property {'INTENT'} type
* @property {'moveNode'} command
* @property {IntentMoveNodePayload} payload
*/
/**
* @typedef {Object} IntentAddEdgePayload
* @property {string} graphId
* @property {{ node: string, port: string, index?: number }} src
* @property {{ node: string, port: string, index?: number }} tgt
*/
/**
* @typedef {Object} IntentAddEdgeMessage
* @property {'INTENT'} type
* @property {'addEdge'} command
* @property {IntentAddEdgePayload} payload
*/
/**
* Edge removal only requires the deterministic id, not the full payload.
*
* @typedef {Object} IntentRemoveEdgeMessage
* @property {'INTENT'} type
* @property {'removeEdge'} command
* @property {{ graphId: string, id: string }} payload
*/
/**
* Appendix A extension (work documents #18/#20): IIP mutations. The IIP id
* follows the `DATA->` deterministic edge rule.
*
* @typedef {Object} IntentAddIIPMessage
* @property {'INTENT'} type
* @property {'addIIP'} command
* @property {{ graphId: string, data: any, tgt: { node: string, port: string, index?: number } }} payload
*/
/**
* @typedef {Object} IntentUpdateIIPMessage
* @property {'INTENT'} type
* @property {'updateIIP'} command
* @property {{ graphId: string, id: string, data: any }} payload
*/
/**
* @typedef {Object} IntentRemoveIIPMessage
* @property {'INTENT'} type
* @property {'removeIIP'} command
* @property {{ graphId: string, id: string }} payload
*/
/**
* Appendix A extension (work documents #18/#20): exported port mutations.
*
* @typedef {Object} IntentAddExportMessage
* @property {'INTENT'} type
* @property {'addInport' | 'addOutport'} command
* @property {{ graphId: string, name: string, nodeId: string, port: string }} payload
*/
/**
* @typedef {Object} IntentRemoveExportMessage
* @property {'INTENT'} type
* @property {'removeInport' | 'removeOutport'} command
* @property {{ graphId: string, name: string }} payload
*/
/**
* @typedef {Object} IntentRenameExportMessage
* @property {'INTENT'} type
* @property {'renameInport' | 'renameOutport'} command
* @property {{ graphId: string, from: string, to: string }} payload
*/
/**
* All messages the Glass may send to the Engine.
*
* @typedef {LifecycleSubscribeMessage
*   | QueryGetSignatureMessage
*   | AwarenessMessage
*   | IntentAddNodeMessage
*   | IntentRemoveNodeMessage
*   | IntentMoveNodeMessage
*   | IntentAddEdgeMessage
*   | IntentRemoveEdgeMessage
*   | IntentAddIIPMessage
*   | IntentUpdateIIPMessage
*   | IntentRemoveIIPMessage
*   | IntentAddExportMessage
*   | IntentRemoveExportMessage
*   | IntentRenameExportMessage} UIWorkerMessage
*/
/**
* @typedef {Object} HeartbeatMessage
* @property {'system'} protocol
* @property {'heartbeat'} command
* @property {{ status: 'ok' | 'syncing', uptime: number }} payload
*/
/**
* @typedef {Object} GraphAddNodeMessage
* @property {'graph'} protocol
* @property {'addnode'} command
* @property {{ id: string, component: string, metadata: { x: number, y: number, [key: string]: any } }} payload
*/
/**
* @typedef {Object} GraphRemoveNodeMessage
* @property {'graph'} protocol
* @property {'removenode'} command
* @property {{ id: string }} payload
*/
/** Closes the loop for an `INTENT: moveNode`. */
/**
* @typedef {Object} GraphMoveNodeMessage
* @property {'graph'} protocol
* @property {'movenode'} command
* @property {{ id: string, metadata: { x: number, y: number } }} payload
*/
/**
* @typedef {Object} GraphEdgePayload
* @property {string} id
* @property {{ node: string, port: string, index?: number }} src
* @property {{ node: string, port: string, index?: number }} tgt
* @property {{ route?: number, routePoints?: Array<{x: number, y: number}> }} [metadata]
*/
/**
* @typedef {Object} GraphAddEdgeMessage
* @property {'graph'} protocol
* @property {'addedge'} command
* @property {GraphEdgePayload} payload
*/
/**
* @typedef {Object} GraphRemoveEdgeMessage
* @property {'graph'} protocol
* @property {'removeedge'} command
* @property {{ id: string }} payload
*/
/**
* Batched telemetry chunk (bounded queue, drop-oldest).
*
* @typedef {Object} NetworkFlowtraceMessage
* @property {'network'} protocol
* @property {'flowtrace'} command
* @property {{ graphId: string, events: Array<{ protocol: 'network', command: 'data' | 'begingroup' | 'endgroup', payload: { id: string, src?: any, tgt?: any, data?: any, time: number } }> }} payload
*/
/**
* All messages the Engine may send to the Glass.
*
* @typedef {HeartbeatMessage
*   | GraphAddNodeMessage
*   | GraphRemoveNodeMessage
*   | GraphMoveNodeMessage
*   | GraphAddEdgeMessage
*   | GraphRemoveEdgeMessage
*   | GraphAddIIPMessage
*   | GraphUpdateIIPMessage
*   | GraphRemoveIIPMessage
*   | GraphAddExportMessage
*   | GraphRemoveExportMessage
*   | GraphRenameExportMessage
*   | NetworkFlowtraceMessage} EngineUIMessage
*/
/**
* Appendix A extension: authoritative IIP echo.
*
* @typedef {Object} GraphAddIIPMessage
* @property {'graph'} protocol
* @property {'addiip'} command
* @property {{ id: string, data: any, tgt: { node: string, port: string, index?: number } }} payload
*/
/**
* @typedef {Object} GraphUpdateIIPMessage
* @property {'graph'} protocol
* @property {'updateiip'} command
* @property {{ id: string, data: any }} payload
*/
/**
* @typedef {Object} GraphRemoveIIPMessage
* @property {'graph'} protocol
* @property {'removeiip'} command
* @property {{ id: string }} payload
*/
/**
* Appendix A extension: authoritative exported-port echoes.
*
* @typedef {Object} GraphAddExportMessage
* @property {'graph'} protocol
* @property {'addinport' | 'addoutport'} command
* @property {{ name: string, nodeId: string, port: string }} payload
*/
/**
* @typedef {Object} GraphRemoveExportMessage
* @property {'graph'} protocol
* @property {'removeinport' | 'removeoutport'} command
* @property {{ name: string }} payload
*/
/**
* @typedef {Object} GraphRenameExportMessage
* @property {'graph'} protocol
* @property {'renameinport' | 'renameoutport'} command
* @property {{ from: string, to: string }} payload
*/
/**
* Engine response to a `QUERY: getSignature` message. NOTE: Appendix A does
* not yet define a query-response channel; this `system: signature` shape is
* the proposed addition and should be reconciled back into the SPEC.
*
* @typedef {Object} SignatureMessage
* @property {'system'} protocol
* @property {'signature'} command
* @property {{ componentName: string, signature: any }} payload
*/
/**
* Structural check that a message conforms to the Appendix A envelope.
*
* @param {any} message
* @returns {boolean}
*/
function isUIWorkerMessage(message) {
	return !!message && typeof message === "object" && typeof message.type === "string" && typeof message.command === "string" && typeof message.payload === "object" && message.payload !== null;
}
//#endregion
//#region src/crdt/EngineCore.js
/**
* @file Engine core (work document #18): pure intent validation and
* application over the project Y.Doc, producing the Appendix A echo messages.
*
* This module contains no Worker or DOM code — the NoFlo dispatcher graph in
* the Worker is a thin wiring around these functions, and the tests run them
* directly.
*/
/**
* Mutable Engine session state that is not part of the CRDT.
*
* @typedef {Object} EngineState
* @property {Set<string>} subscriptions Graph ids the Glass has subscribed to.
*/
/**
* @returns {EngineState}
*/
function createEngineState() {
	return { subscriptions: /* @__PURE__ */ new Set() };
}
/**
* Result of handling one message.
*
* @typedef {Object} EngineResult
* @property {boolean} accepted Whether the message was valid and applied.
* @property {Array<import("./Protocol.js").EngineUIMessage | import("./Protocol.js").SignatureMessage>} echoes
*/
/**
* @param {EngineState} state
* @param {string} graphId
* @returns {EngineResult}
*/
function subscribe(state, graphId) {
	state.subscriptions.add(graphId);
	return {
		accepted: true,
		echoes: []
	};
}
/**
* Validates and applies one Glass message, returning the authoritative echo
* messages the Engine sends back. Invalid messages never mutate the document.
*
* Graphs are created lazily on first intent targeting them: Appendix A has no
* explicit graph-creation message (noted as a SPEC gap in the work document).
*
* @param {Y.Doc} doc
* @param {EngineState} state
* @param {import("./Protocol.js").UIWorkerMessage} message
* @returns {EngineResult}
*/
function handleMessage(doc, state, message) {
	if (!isUIWorkerMessage(message)) return {
		accepted: false,
		echoes: []
	};
	switch (message.type) {
		case "LIFECYCLE": return handleLifecycle(state, message);
		case "QUERY": return handleQuery(doc, message);
		case "AWARENESS": return {
			accepted: true,
			echoes: []
		};
		case "INTENT": return handleIntent(doc, message);
		default: return {
			accepted: false,
			echoes: []
		};
	}
}
/**
* @param {EngineState} state
* @param {import("./Protocol.js").LifecycleSubscribeMessage} message
* @returns {EngineResult}
*/
function handleLifecycle(state, message) {
	if (message.command !== "subscribe") return {
		accepted: false,
		echoes: []
	};
	const graphId = message.payload?.graphId;
	if (typeof graphId !== "string" || graphId.length === 0) return {
		accepted: false,
		echoes: []
	};
	return subscribe(state, graphId);
}
/**
* @param {Y.Doc} doc
* @param {import("./Protocol.js").QueryGetSignatureMessage} message
* @returns {EngineResult}
*/
function handleQuery(doc, message) {
	if (message.command !== "getSignature") return {
		accepted: false,
		echoes: []
	};
	const componentName = message.payload?.componentName;
	if (typeof componentName !== "string") return {
		accepted: false,
		echoes: []
	};
	return {
		accepted: true,
		echoes: [{
			protocol: "system",
			command: "signature",
			payload: {
				componentName,
				signature: getComponentSignature(doc, componentName) || null
			}
		}]
	};
}
/**
* @param {Y.Doc} doc
* @param {import("./Protocol.js").UIWorkerMessage} message
* @returns {EngineResult}
*/
function handleIntent(doc, message) {
	const payload = message.payload;
	switch (message.command) {
		case "addNode": return intentAddNode(doc, payload);
		case "removeNode": return intentRemoveNode(doc, payload);
		case "moveNode": return intentMoveNode(doc, payload);
		case "addEdge": return intentAddEdge(doc, payload);
		case "removeEdge": return intentRemoveEdge(doc, payload);
		case "addIIP": return intentAddIIP(doc, payload);
		case "updateIIP": return intentUpdateIIP(doc, payload);
		case "removeIIP": return intentRemoveIIP(doc, payload);
		case "addInport":
		case "addOutport": return intentAddExport(doc, message.command, payload);
		case "removeInport":
		case "removeOutport": return intentRemoveExport(doc, message.command, payload);
		case "renameInport":
		case "renameOutport": return intentRenameExport(doc, message.command, payload);
		default: return {
			accepted: false,
			echoes: []
		};
	}
}
/**
* @param {Y.Doc} doc
* @param {any} payload
* @returns {EngineResult}
*/
function intentAddNode(doc, payload) {
	const { graphId, nodeId, componentName, metadata } = payload ?? {};
	if (typeof graphId !== "string" || typeof nodeId !== "string" || typeof componentName !== "string" || typeof metadata?.x !== "number" || typeof metadata?.y !== "number") return {
		accepted: false,
		echoes: []
	};
	if (!addNode(createGraph(doc, graphId), nodeId, componentName, metadata)) return {
		accepted: false,
		echoes: []
	};
	return {
		accepted: true,
		echoes: [{
			protocol: "graph",
			command: "addnode",
			payload: {
				id: nodeId,
				component: componentName,
				metadata
			}
		}]
	};
}
/**
* @param {Y.Doc} doc
* @param {any} payload
* @returns {EngineResult}
*/
function intentRemoveNode(doc, payload) {
	const { graphId, nodeId } = payload ?? {};
	if (typeof graphId !== "string" || typeof nodeId !== "string") return {
		accepted: false,
		echoes: []
	};
	const graph = getGraph(doc, graphId);
	if (!graph) return {
		accepted: false,
		echoes: []
	};
	if (!removeNode(graph, nodeId)) return {
		accepted: false,
		echoes: []
	};
	return {
		accepted: true,
		echoes: [{
			protocol: "graph",
			command: "removenode",
			payload: { id: nodeId }
		}]
	};
}
/**
* @param {Y.Doc} doc
* @param {any} payload
* @returns {EngineResult}
*/
function intentMoveNode(doc, payload) {
	const { graphId, nodeId, metadata } = payload ?? {};
	if (typeof graphId !== "string" || typeof nodeId !== "string" || typeof metadata?.x !== "number" || typeof metadata?.y !== "number") return {
		accepted: false,
		echoes: []
	};
	const graph = getGraph(doc, graphId);
	if (!graph) return {
		accepted: false,
		echoes: []
	};
	if (!moveNode(graph, nodeId, metadata.x, metadata.y)) return {
		accepted: false,
		echoes: []
	};
	return {
		accepted: true,
		echoes: [{
			protocol: "graph",
			command: "movenode",
			payload: {
				id: nodeId,
				metadata: {
					x: metadata.x,
					y: metadata.y
				}
			}
		}]
	};
}
/**
* @param {Y.Doc} doc
* @param {any} payload
* @returns {EngineResult}
*/
function intentAddEdge(doc, payload) {
	const { graphId, src, tgt } = payload ?? {};
	if (typeof graphId !== "string" || !isValidEndpoint(src) || !isValidEndpoint(tgt)) return {
		accepted: false,
		echoes: []
	};
	const graph = getGraph(doc, graphId);
	if (!graph) return {
		accepted: false,
		echoes: []
	};
	const edgeId = addEdge(graph, src, tgt);
	if (!edgeId) return {
		accepted: false,
		echoes: []
	};
	return {
		accepted: true,
		echoes: [{
			protocol: "graph",
			command: "addedge",
			payload: {
				id: edgeId,
				src,
				tgt,
				metadata: {}
			}
		}]
	};
}
/**
* @param {Y.Doc} doc
* @param {any} payload
* @returns {EngineResult}
*/
function intentRemoveEdge(doc, payload) {
	const { graphId, id } = payload ?? {};
	if (typeof graphId !== "string" || typeof id !== "string") return {
		accepted: false,
		echoes: []
	};
	const graph = getGraph(doc, graphId);
	if (!graph) return {
		accepted: false,
		echoes: []
	};
	if (!removeEdge(graph, id)) return {
		accepted: false,
		echoes: []
	};
	return {
		accepted: true,
		echoes: [{
			protocol: "graph",
			command: "removeedge",
			payload: { id }
		}]
	};
}
/**
* @param {any} endpoint
* @returns {boolean}
*/
function isValidEndpoint(endpoint) {
	return !!endpoint && typeof endpoint.node === "string" && typeof endpoint.port === "string" && (endpoint.index === void 0 || typeof endpoint.index === "number");
}
/**
* @param {Y.Doc} doc
* @param {any} payload
* @returns {EngineResult}
*/
function intentAddIIP(doc, payload) {
	const { graphId, data, tgt } = payload ?? {};
	if (typeof graphId !== "string" || !isValidEndpoint(tgt)) return {
		accepted: false,
		echoes: []
	};
	const graph = getGraph(doc, graphId);
	if (!graph) return {
		accepted: false,
		echoes: []
	};
	const id = addIIP(graph, data, tgt);
	if (!id) return {
		accepted: false,
		echoes: []
	};
	return {
		accepted: true,
		echoes: [{
			protocol: "graph",
			command: "addiip",
			payload: {
				id,
				data,
				tgt
			}
		}]
	};
}
/**
* @param {Y.Doc} doc
* @param {any} payload
* @returns {EngineResult}
*/
function intentUpdateIIP(doc, payload) {
	const { graphId, id, data } = payload ?? {};
	if (typeof graphId !== "string" || typeof id !== "string") return {
		accepted: false,
		echoes: []
	};
	if (!id.startsWith("DATA->")) return {
		accepted: false,
		echoes: []
	};
	const graph = getGraph(doc, graphId);
	if (!graph) return {
		accepted: false,
		echoes: []
	};
	const edge = graph.get("edges").get(id);
	if (!edge) return {
		accepted: false,
		echoes: []
	};
	doc.transact(() => {
		edge.set("data", data);
	});
	return {
		accepted: true,
		echoes: [{
			protocol: "graph",
			command: "updateiip",
			payload: {
				id,
				data
			}
		}]
	};
}
/**
* @param {Y.Doc} doc
* @param {any} payload
* @returns {EngineResult}
*/
function intentRemoveIIP(doc, payload) {
	const { graphId, id } = payload ?? {};
	if (typeof graphId !== "string" || typeof id !== "string") return {
		accepted: false,
		echoes: []
	};
	if (!id.startsWith("DATA->")) return {
		accepted: false,
		echoes: []
	};
	const graph = getGraph(doc, graphId);
	if (!graph) return {
		accepted: false,
		echoes: []
	};
	if (!removeEdge(graph, id)) return {
		accepted: false,
		echoes: []
	};
	return {
		accepted: true,
		echoes: [{
			protocol: "graph",
			command: "removeiip",
			payload: { id }
		}]
	};
}
/**
* @param {'addInport' | 'addOutport' | 'removeInport' | 'removeOutport' | 'renameInport' | 'renameOutport'} command
* @returns {"inports" | "outports"}
*/
function directionForCommand(command) {
	return command.toLowerCase().endsWith("inport") ? "inports" : "outports";
}
/**
* @param {Y.Doc} doc
* @param {'addInport' | 'addOutport'} command
* @param {any} payload
* @returns {EngineResult}
*/
function intentAddExport(doc, command, payload) {
	const { graphId, name, nodeId, port } = payload ?? {};
	if (typeof graphId !== "string" || typeof name !== "string" || typeof nodeId !== "string" || typeof port !== "string") return {
		accepted: false,
		echoes: []
	};
	const graph = getGraph(doc, graphId);
	if (!graph) return {
		accepted: false,
		echoes: []
	};
	if (!(directionForCommand(command) === "inports" ? addInport(graph, name, nodeId, port) : addOutport(graph, name, nodeId, port))) return {
		accepted: false,
		echoes: []
	};
	return {
		accepted: true,
		echoes: [{
			protocol: "graph",
			command: command.toLowerCase(),
			payload: {
				name,
				nodeId,
				port
			}
		}]
	};
}
/**
* @param {Y.Doc} doc
* @param {'removeInport' | 'removeOutport'} command
* @param {any} payload
* @returns {EngineResult}
*/
function intentRemoveExport(doc, command, payload) {
	const { graphId, name } = payload ?? {};
	if (typeof graphId !== "string" || typeof name !== "string") return {
		accepted: false,
		echoes: []
	};
	const graph = getGraph(doc, graphId);
	if (!graph) return {
		accepted: false,
		echoes: []
	};
	if (!removeExportedPort(graph, directionForCommand(command), name)) return {
		accepted: false,
		echoes: []
	};
	return {
		accepted: true,
		echoes: [{
			protocol: "graph",
			command: command.toLowerCase(),
			payload: { name }
		}]
	};
}
/**
* @param {Y.Doc} doc
* @param {'renameInport' | 'renameOutport'} command
* @param {any} payload
* @returns {EngineResult}
*/
function intentRenameExport(doc, command, payload) {
	const { graphId, from, to } = payload ?? {};
	if (typeof graphId !== "string" || typeof from !== "string" || typeof to !== "string") return {
		accepted: false,
		echoes: []
	};
	const graph = getGraph(doc, graphId);
	if (!graph) return {
		accepted: false,
		echoes: []
	};
	const direction = directionForCommand(command);
	const ports = graph.get(direction);
	const info = ports.get(from);
	if (!info || ports.has(to)) return {
		accepted: false,
		echoes: []
	};
	const plain = info.toJSON();
	doc.transact(() => {
		ports.delete(from);
		const moved = new YMap();
		for (const key of Object.keys(plain)) moved.set(key, plain[key]);
		ports.set(to, moved);
	});
	return {
		accepted: true,
		echoes: [{
			protocol: "graph",
			command: command.toLowerCase(),
			payload: {
				from,
				to
			}
		}]
	};
}
//#endregion
//#region node_modules/lib0/indexeddb.js
/**
* Helpers to work with IndexedDB.
*
* @module indexeddb
*/
/* c8 ignore start */
/**
* IDB Request to Promise transformer
*
* @param {IDBRequest} request
* @return {Promise<any>}
*/
const rtop = (request) => create$2((resolve, reject) => {
	request.onerror = (event) => reject(new Error(event.target.error));
	request.onsuccess = (event) => resolve(event.target.result);
});
/**
* @param {string} name
* @param {function(IDBDatabase):any} initDB Called when the database is first created
* @return {Promise<IDBDatabase>}
*/
const openDB = (name, initDB) => create$2((resolve, reject) => {
	const request = indexedDB.open(name);
	/**
	* @param {any} event
	*/
	request.onupgradeneeded = (event) => initDB(event.target.result);
	/**
	* @param {any} event
	*/
	request.onerror = (event) => reject(create$3(event.target.error));
	/**
	* @param {any} event
	*/
	request.onsuccess = (event) => {
		/**
		* @type {IDBDatabase}
		*/
		const db = event.target.result;
		db.onversionchange = () => {
			db.close();
		};
		resolve(db);
	};
});
/**
* @param {string} name
*/
const deleteDB = (name) => rtop(indexedDB.deleteDatabase(name));
/**
* @param {IDBDatabase} db
* @param {Array<Array<string>|Array<string|IDBObjectStoreParameters|undefined>>} definitions
*/
const createStores = (db, definitions) => definitions.forEach((d) => db.createObjectStore.apply(db, d));
/**
* @param {IDBDatabase} db
* @param {Array<string>} stores
* @param {"readwrite"|"readonly"} [access]
* @return {Array<IDBObjectStore>}
*/
const transact = (db, stores, access = "readwrite") => {
	const transaction = db.transaction(stores, access);
	return stores.map((store) => getStore(transaction, store));
};
/**
* @param {IDBObjectStore} store
* @param {IDBKeyRange} [range]
* @return {Promise<number>}
*/
const count = (store, range) => rtop(store.count(range));
/**
* @param {IDBObjectStore} store
* @param {String | number | ArrayBuffer | Date | Array<any> } key
* @return {Promise<String | number | ArrayBuffer | Date | Array<any>>}
*/
const get = (store, key) => rtop(store.get(key));
/**
* @param {IDBObjectStore} store
* @param {String | number | ArrayBuffer | Date | IDBKeyRange | Array<any> } key
*/
const del = (store, key) => rtop(store.delete(key));
/**
* @param {IDBObjectStore} store
* @param {String | number | ArrayBuffer | Date | boolean} item
* @param {String | number | ArrayBuffer | Date | Array<any>} [key]
*/
const put = (store, item, key) => rtop(store.put(item, key));
/**
* @param {IDBObjectStore} store
* @param {String | number | ArrayBuffer | Date}  item
* @return {Promise<number>} Returns the generated key
*/
const addAutoKey = (store, item) => rtop(store.add(item));
/**
* @param {IDBObjectStore} store
* @param {IDBKeyRange} [range]
* @param {number} [limit]
* @return {Promise<Array<any>>}
*/
const getAll = (store, range, limit) => rtop(store.getAll(range, limit));
/**
* @param {IDBObjectStore} store
* @param {IDBKeyRange|null} query
* @param {'next'|'prev'|'nextunique'|'prevunique'} direction
* @return {Promise<any>}
*/
const queryFirst = (store, query, direction) => {
	/**
	* @type {any}
	*/
	let first = null;
	return iterateKeys(store, query, (key) => {
		first = key;
		return false;
	}, direction).then(() => first);
};
/**
* @param {IDBObjectStore} store
* @param {IDBKeyRange?} [range]
* @return {Promise<any>}
*/
const getLastKey = (store, range = null) => queryFirst(store, range, "prev");
/**
* @param {any} request
* @param {function(IDBCursorWithValue):void|boolean|Promise<void|boolean>} f
* @return {Promise<void>}
*/
const iterateOnRequest = (request, f) => create$2((resolve, reject) => {
	request.onerror = reject;
	/**
	* @param {any} event
	*/
	request.onsuccess = async (event) => {
		const cursor = event.target.result;
		if (cursor === null || await f(cursor) === false) return resolve();
		cursor.continue();
	};
});
/**
* Iterate on the keys (no values)
*
* @param {IDBObjectStore} store
* @param {IDBKeyRange|null} keyrange
* @param {function(any):void|boolean|Promise<void|boolean>} f callback that receives the key
* @param {'next'|'prev'|'nextunique'|'prevunique'} direction
*/
const iterateKeys = (store, keyrange, f, direction = "next") => iterateOnRequest(store.openKeyCursor(keyrange, direction), (cursor) => f(cursor.key));
/**
* Open store from transaction
* @param {IDBTransaction} t
* @param {String} store
* @returns {IDBObjectStore}
*/
const getStore = (t, store) => t.objectStore(store);
/**
* @param {any} upper
* @param {boolean} upperOpen
*/
const createIDBKeyRangeUpperBound = (upper, upperOpen) => IDBKeyRange.upperBound(upper, upperOpen);
/**
* @param {any} lower
* @param {boolean} lowerOpen
*/
const createIDBKeyRangeLowerBound = (lower, lowerOpen) => IDBKeyRange.lowerBound(lower, lowerOpen);
/* c8 ignore stop */
//#endregion
//#region node_modules/y-indexeddb/src/y-indexeddb.js
const customStoreName = "custom";
const updatesStoreName = "updates";
const PREFERRED_TRIM_SIZE = 500;
/**
* @param {IndexeddbPersistence} idbPersistence
* @param {function(IDBObjectStore):void} [beforeApplyUpdatesCallback]
* @param {function(IDBObjectStore):void} [afterApplyUpdatesCallback]
*/
const fetchUpdates = (idbPersistence, beforeApplyUpdatesCallback = () => {}, afterApplyUpdatesCallback = () => {}) => {
	const [updatesStore] = transact(idbPersistence.db, [updatesStoreName]);
	return getAll(updatesStore, createIDBKeyRangeLowerBound(idbPersistence._dbref, false)).then((updates) => {
		if (!idbPersistence._destroyed) {
			beforeApplyUpdatesCallback(updatesStore);
			transact$2(idbPersistence.doc, () => {
				updates.forEach((val) => applyUpdate(idbPersistence.doc, val));
			}, idbPersistence, false);
			afterApplyUpdatesCallback(updatesStore);
		}
	}).then(() => getLastKey(updatesStore).then((lastKey) => {
		idbPersistence._dbref = lastKey + 1;
	})).then(() => count(updatesStore).then((cnt) => {
		idbPersistence._dbsize = cnt;
	})).then(() => updatesStore);
};
/**
* @param {IndexeddbPersistence} idbPersistence
* @param {boolean} forceStore
*/
const storeState = (idbPersistence, forceStore = true) => fetchUpdates(idbPersistence).then((updatesStore) => {
	if (forceStore || idbPersistence._dbsize >= 500) addAutoKey(updatesStore, encodeStateAsUpdate(idbPersistence.doc)).then(() => del(updatesStore, createIDBKeyRangeUpperBound(idbPersistence._dbref, true))).then(() => count(updatesStore).then((cnt) => {
		idbPersistence._dbsize = cnt;
	}));
});
/**
* @extends Observable<string>
*/
var IndexeddbPersistence = class extends Observable {
	/**
	* @param {string} name
	* @param {Y.Doc} doc
	*/
	constructor(name, doc) {
		super();
		this.doc = doc;
		this.name = name;
		this._dbref = 0;
		this._dbsize = 0;
		this._destroyed = false;
		/**
		* @type {IDBDatabase|null}
		*/
		this.db = null;
		this.synced = false;
		this._db = openDB(name, (db) => createStores(db, [["updates", { autoIncrement: true }], ["custom"]]));
		/**
		* @type {Promise<IndexeddbPersistence>}
		*/
		this.whenSynced = create$2((resolve) => this.on("synced", () => resolve(this)));
		this._db.then((db) => {
			this.db = db;
			/**
			* @param {IDBObjectStore} updatesStore
			*/
			const beforeApplyUpdatesCallback = (updatesStore) => addAutoKey(updatesStore, encodeStateAsUpdate(doc));
			const afterApplyUpdatesCallback = () => {
				if (this._destroyed) return this;
				this.synced = true;
				this.emit("synced", [this]);
			};
			fetchUpdates(this, beforeApplyUpdatesCallback, afterApplyUpdatesCallback);
		});
		/**
		* Timeout in ms untill data is merged and persisted in idb.
		*/
		this._storeTimeout = 1e3;
		/**
		* @type {any}
		*/
		this._storeTimeoutId = null;
		/**
		* @param {Uint8Array} update
		* @param {any} origin
		*/
		this._storeUpdate = (update, origin) => {
			if (this.db && origin !== this) {
				const [updatesStore] = transact(this.db, [updatesStoreName]);
				addAutoKey(updatesStore, update);
				if (++this._dbsize >= 500) {
					if (this._storeTimeoutId !== null) clearTimeout(this._storeTimeoutId);
					this._storeTimeoutId = setTimeout(() => {
						storeState(this, false);
						this._storeTimeoutId = null;
					}, this._storeTimeout);
				}
			}
		};
		doc.on("update", this._storeUpdate);
		this.destroy = this.destroy.bind(this);
		doc.on("destroy", this.destroy);
	}
	destroy() {
		if (this._storeTimeoutId) clearTimeout(this._storeTimeoutId);
		this.doc.off("update", this._storeUpdate);
		this.doc.off("destroy", this.destroy);
		this._destroyed = true;
		return this._db.then((db) => {
			db.close();
		});
	}
	/**
	* Destroys this instance and removes all data from indexeddb.
	*
	* @return {Promise<void>}
	*/
	clearData() {
		return this.destroy().then(() => {
			deleteDB(this.name);
		});
	}
	/**
	* @param {String | number | ArrayBuffer | Date} key
	* @return {Promise<String | number | ArrayBuffer | Date | any>}
	*/
	get(key) {
		return this._db.then((db) => {
			const [custom] = transact(db, [customStoreName], "readonly");
			return get(custom, key);
		});
	}
	/**
	* @param {String | number | ArrayBuffer | Date} key
	* @param {String | number | ArrayBuffer | Date} value
	* @return {Promise<String | number | ArrayBuffer | Date>}
	*/
	set(key, value) {
		return this._db.then((db) => {
			const [custom] = transact(db, [customStoreName]);
			return put(custom, value, key);
		});
	}
	/**
	* @param {String | number | ArrayBuffer | Date} key
	* @return {Promise<undefined>}
	*/
	del(key) {
		return this._db.then((db) => {
			const [custom] = transact(db, [customStoreName]);
			return del(custom, key);
		});
	}
};
//#endregion
//#region src/crdt/ProjectPersistence.js
/**
* @file Persistence binding for the project Y.Doc (Engine side), per SPEC
* "IndexedDB Persistence & Multi-Tab Safety": y-indexeddb holds the
* authoritative CRDT state, and the schema version is checked after loading —
* the Engine drives the migrations.
*
* This module is Engine/Worker territory: it must never be imported by
* main-thread (Glass) code, so the y-indexeddb dependency stays out of the
* Glass module graph.
*/
/**
* Binds a project Y.Doc to its IndexedDB persistence. The provider keeps
* the document updated from disk and flushes changes continuously.
*
* @param {import("yjs").Doc} doc
* @param {string} databaseName
* @returns {IndexeddbPersistence}
*/
function bindDocumentPersistence(doc, databaseName) {
	return new IndexeddbPersistence(databaseName, doc);
}
/**
* Resolves once the persisted document has been fully loaded from storage.
*
* @param {IndexeddbPersistence} persistence
* @returns {Promise<IndexeddbPersistence>}
*/
function whenPersisted(persistence) {
	return persistence.whenSynced;
}
/**
* Drives the CRDT schema migration after a persisted document was loaded.
* Per SPEC, the Engine owns data migrations for older UI versions.
*
* @param {import("yjs").Doc} doc
* @returns {{ from: number, to: number, migrated: boolean }}
*/
function migrateLoadedProject(doc) {
	return ensureProjectSchema(doc);
}
//#endregion
//#region src/components/engine/ApplyMessage.js
/**
* @file Engine apply component: runs one Glass message through the engine
* core (validate + apply to the Y.Doc) and forwards the authoritative echo
* messages.
*/
var ApplyMessage_exports = /* @__PURE__ */ __exportAll({ getComponent: () => getComponent$2 });
/** NoFlo's shipped types omit the default export; the runtime API is stable. */
const NoFlo$3 = NoFlo_default;
/** * @returns {any} */
function getComponent$2() {
	const component = new NoFlo$3.Component();
	component.description = "Applies a Glass message to the project Y.Doc and emits echo messages";
	component.icon = "cogs";
	component.inPorts.add("message", { datatype: "object" });
	component.inPorts.add("doc", {
		datatype: "object",
		control: true
	});
	component.inPorts.add("state", {
		datatype: "object",
		control: true
	});
	component.outPorts.add("echo", { datatype: "object" });
	component.process((input, output) => {
		if (!input.hasData("doc", "state")) return;
		if (!input.has("message")) return;
		const result = handleMessage(input.getData("doc"), input.getData("state"), input.getData("message"));
		for (const echo of result.echoes) output.send({ echo });
		output.done();
	});
	return component;
}
//#endregion
//#region src/components/engine/Gateway.js
/**
* @file Engine gateway component: validates the Appendix A IPC envelope and
* routes valid messages onward for application against the CRDT.
*/
var Gateway_exports = /* @__PURE__ */ __exportAll({ getComponent: () => getComponent$1 });
/** NoFlo's shipped types omit the default export; the runtime API is stable. */
const NoFlo$2 = NoFlo_default;
/** * @returns {any} */
function getComponent$1() {
	const component = new NoFlo$2.Component();
	component.description = "Validates the Glass message envelope and routes it to the engine";
	component.icon = "filter";
	component.inPorts.add("in", { datatype: "object" });
	component.outPorts.add("engine", { datatype: "object" });
	component.outPorts.add("invalid", { datatype: "object" });
	component.process((input, output) => {
		if (!input.has("in")) return;
		const message = input.getData("in");
		if (!isUIWorkerMessage(message)) {
			console.warn("Engine gateway dropped a malformed message", message);
			output.send({ invalid: message });
			output.done();
			return;
		}
		output.send({ engine: message });
		output.done();
	});
	return component;
}
//#endregion
//#region src/components/engine/Send.js
/**
* @file Engine send component: delivers echo messages from the Engine back
* to the Glass via an injected postMessage-style callback.
*/
var Send_exports = /* @__PURE__ */ __exportAll({ getComponent: () => getComponent });
/** NoFlo's shipped types omit the default export; the runtime API is stable. */
const NoFlo$1 = NoFlo_default;
/** * @returns {any} */
function getComponent() {
	const component = new NoFlo$1.Component();
	component.description = "Sends echo messages to the Glass";
	component.icon = "paper-plane";
	component.inPorts.add("in", { datatype: "all" });
	component.inPorts.add("callback", {
		datatype: "all",
		control: true
	});
	component.process((input, output) => {
		if (!input.hasData("callback")) return;
		if (!input.has("in")) return;
		const callback = input.getData("callback");
		const echo = input.getData("in");
		if (typeof callback === "function") callback(echo);
		output.done();
	});
	return component;
}
//#endregion
//#region src/graphs/engine-dispatch.js
/**
* @file The Engine's message dispatcher as a NoFlo graph, per SPEC "Worker
* Internals & Resilience": an Intent arriving via postMessage enters this
* network, is validated and applied to the Y.Doc, and the resulting
* authoritative echoes are routed back to the Glass.
*
* The graph is intentionally thin wiring around the pure engine core; the
* business logic lives in testable ES modules.
*/
/**
* Builds the dispatcher graph:
*
*     Gateway in -> message ApplyMessage -> in Send
*
* The `invalid` outport of the gateway is left unconnected: malformed
* messages are logged and dropped.
*
* @returns {any}
*/
function createDispatcherGraph() {
	const graph = new NoFlo_default.Graph("engine-dispatch");
	graph.addNode("gateway", "engine/Gateway");
	graph.addNode("apply", "engine/ApplyMessage");
	graph.addNode("send", "engine/Send");
	graph.addEdge("gateway", "engine", "apply", "message");
	graph.addEdge("apply", "echo", "send", "in");
	return graph;
}
/**
* Registers the engine components with a NoFlo component loader. The loader's
* component registry is initialized eagerly, bypassing the default
* filesystem-based package scan: the engine's components are the only ones it
* needs.
*
* @param {any} loader
*/
function registerEngineComponents(loader) {
	if (!loader.components) {
		loader.components = {};
		loader.ready = true;
	}
	loader.registerComponent("engine", "Gateway", Gateway_exports);
	loader.registerComponent("engine", "ApplyMessage", ApplyMessage_exports);
	loader.registerComponent("engine", "Send", Send_exports);
}
//#endregion
//#region src/worker/engine.js
/**
* @file The Engine ("The Brain"): the Web Worker that owns the project CRDT
* and processes Glass messages through the NoFlo dispatcher graph.
*
* SPEC "Worker Internals & Resilience": the supervisor on the main thread
* monitors the heartbeat emitted here and respins the worker when it dies.
*/
/** NoFlo's shipped types omit the default export; the runtime API is stable. */
const NoFlo = NoFlo_default;
const HEARTBEAT_INTERVAL_MS = 1e4;
/**
* Starts the engine. Kept as a pure async function so integration tests can
* drive it without a real Worker global.
*
* @param {{
*   postMessage: (message: any) => void,
*   registerMessageHandler: (handler: (message: any) => void) => void,
* }} io Injection point for the Worker messaging surface.
* @param {{ name?: string }} [options]
* @returns {Promise<{ doc: import("yjs").Doc, stop: () => void }>}
*/
async function startEngine(io, options = {}) {
	const doc = createProjectDoc(options.name ?? "Untitled project");
	const state = createEngineState();
	const loader = new NoFlo.ComponentLoader(".");
	registerEngineComponents(loader);
	const graph = createDispatcherGraph();
	graph.addInitial(doc, "apply", "doc");
	graph.addInitial(state, "apply", "state");
	graph.addInitial(io.postMessage, "send", "callback");
	const network = await new NoFlo.createNetwork(graph, { componentLoader: loader });
	const gateway = network.getNode("gateway");
	const socket = NoFlo.internalSocket.createSocket();
	/** @type {any} */ gateway.component.inPorts.in.attach(socket);
	io.registerMessageHandler((message) => {
		socket.send(message);
	});
	const startedAt = Date.now();
	const heartbeat = setInterval(() => {
		io.postMessage({
			protocol: "system",
			command: "heartbeat",
			payload: {
				status: "ok",
				uptime: Date.now() - startedAt
			}
		});
	}, HEARTBEAT_INTERVAL_MS);
	doc.on("update", (update) => {
		io.postMessage({
			kind: "y-update",
			update
		});
	});
	if (typeof globalThis.indexedDB !== "undefined") try {
		whenPersisted(bindDocumentPersistence(doc, "noflo-project")).then(() => {
			migrateLoadedProject(doc);
			io.postMessage({ kind: "y-synced" });
		});
	} catch (err) {
		console.error("Document persistence failed:", err);
		io.postMessage({ kind: "y-synced" });
	}
	else io.postMessage({ kind: "y-synced" });
	return {
		doc,
		stop() {
			clearInterval(heartbeat);
			network.stop().catch(() => {});
		}
	};
}
const selfGlobal = globalThis.self;
if (selfGlobal && typeof selfGlobal.postMessage === "function" && typeof selfGlobal.addEventListener === "function" && typeof selfGlobal.document === "undefined") startEngine({
	postMessage: (message) => selfGlobal.postMessage(message),
	registerMessageHandler: (handler) => {
		selfGlobal.addEventListener("message", (event) => handler(event.data));
	}
}).catch((err) => {
	console.error("Engine failed to start:", err);
});
//#endregion
export { startEngine };
