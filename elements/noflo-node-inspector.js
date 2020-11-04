import { Polymer, html } from '@polymer/polymer/polymer-legacy';
import { dom as PolymerDom } from '@polymer/polymer/lib/legacy/polymer.dom';
import './number-scrubber';
import './noflo-icon';
import './the-card-styles';

Polymer({
  _template: html`
    <style include="the-card-styles">
      .editable-title {
        line-height: 36px;
        margin: 0px;
        padding: 0px;
        background-color: var(--noflo-ui-background-shadow);
        color: var(--noflo-ui-text);
        border: 0px;
        display: block;
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        font-size: 12px;
        font-weight: 700;
      }
      .ports {
        margin-bottom: 8px;
      }
      ul.ports li {
        display: block;
        position: relative;
        clear: left;
      }
      ul.ports li label span {
        float: left;
        clear: left;
        font-size: 12px;
        padding-top: 0;
        width: 87px;
        line-height: 36px;
        overflow: hidden;
      }

      ul.ports li p {
        margin: 0px;
        padding: 0px;
        font-size: 10px;
        margin-left: 87px;
        margin-bottom: 3px;
        line-height: 13px;
        max-height: 26px;
        overflow: hidden;
        color: hsl(189, 50%, 80%);
      }

      /* Hide spinners */
      input[type=number]::-webkit-inner-spin-button, 
      input[type=number]::-webkit-outer-spin-button {
        -webkit-appearance: none; 
        margin: 0; 
      }
      input[type=number] {
        -moz-appearance:textfield;
      }

      ul.ports li button {
        padding: 8px;
        height: 19px;
        width: 19px;
      }
      ul.ports li label button {
        background-color: hsl(184, 50%, 11%);
        color: hsl(184, 40%, 89%);
        display: block;
        padding: 8px;
        height: 36px;
        width: 36px;
      }
      ul.ports li label button:active {
        color: white;
      }
      ul.ports li label i {
        margin:0;
      }
      ul.ports li span.route {
        /* TODO: route colors */
        background-color: white;
        float: none;
        display: inline-block;
        width: 125px;
        height: 1px;
        padding: 0;
      }
      ul.ports .remove-value {
        background-color: transparent !important;
        opacity: .3;
        border: none !important;
        position: absolute;
        top: 0px;
        right: 0px;
        line-height: 36px;
        height: 36px;
        width: 36px;
        text-align: center;
        padding: 0px;
        font-size: 12px;
      }
      ul.ports li span.route0  { background-color: hsl(  0,100%,100%); }
      ul.ports li span.route1  { background-color: hsl(  0, 98%, 46%); }
      ul.ports li span.route2  { background-color: hsl( 35, 98%, 46%); }
      ul.ports li span.route3  { background-color: hsl( 60, 98%, 46%); }
      ul.ports li span.route4  { background-color: hsl(135, 98%, 46%); }
      ul.ports li span.route5  { background-color: hsl(160, 98%, 46%); }
      ul.ports li span.route6  { background-color: hsl(185, 98%, 46%); }
      ul.ports li span.route7  { background-color: hsl(210, 98%, 46%); }
      ul.ports li span.route8  { background-color: hsl(285, 98%, 46%); }
      ul.ports li span.route9  { background-color: hsl(310, 98%, 46%); }
      ul.ports li span.route10 { background-color: hsl(335, 98%, 46%); }
      
      
      ul.ports li input {
        -webkit-box-sizing: border-box;
        -moz-box-sizing: border-box;
        box-sizing: border-box;
        width: 178px;
        height: 36px;
        border: none;
        font-family: "SourceCodePro",Helvetica,Arial,sans-serif;
        font-size: 10px;
        padding: 9px 26px 9px 36px;
        margin: 0px;
      }
      ul.ports li input[type="checkbox"] {
        height: 18px;
        margin-top: 9px;
        margin-left: 36px;
        width: 18px;
      }
      ul.ports li input[type="checkbox"]:before {
        display: block;
        content: '';
        width: 177px;
        height: 36px;
        margin-top: -9px;
        margin-left: -36px;
        background-color: hsla( 0, 0%, 20%, .2);
        color: hsl( 0, 0%, 75%);
        border-left: 1px solid hsla( 0, 0%, 75%, 0.1);
      }

      ul.ports li select {
        height: 18px;
        margin-top: 9px;
        margin-left: 36px;
        max-width: 110px;
      }

      ul.ports li  input, 
      ul.ports li  button  { 
        background-color: hsla(  0,  0%, 30%, 0.35); 
        color:             hsl(  0,  0%, 90%);
      }
      
      ul.ports li:nth-child(even) input, 
      ul.ports li:nth-child(even) button {
        background-color: hsla(210, 100%, 20%, .1);
      }
      ul.ports li:nth-child(odd) input, 
      ul.ports li:nth-child(odd) button {
        background-color: hsla(190, 100%, 20%, .1);
      }

      ul.ports li.route0  input, 
      ul.ports li.route0  button  { 
        background-color: hsla(  0,  0%, 30%, 0.35); 
      }
      ul.ports li.route1  input, 
      ul.ports li.route1  button  { 
        background-color: hsla(  0, 98%, 20%, 0.35); 
      }
      ul.ports li.route2  input, 
      ul.ports li.route2  button  { 
        background-color: hsla( 35, 98%, 20%, 0.35); 
      }
      ul.ports li.route3  input, 
      ul.ports li.route3  button  { 
        background-color: hsla( 60, 98%, 20%, 0.35); 
      }
      ul.ports li.route4  input, 
      ul.ports li.route4  button  { 
        background-color: hsla(135, 98%, 20%, 0.35); 
      }
      ul.ports li.route5  input, 
      ul.ports li.route5  button  { 
        background-color: hsla(160, 98%, 20%, 0.35); 
      }
      ul.ports li.route6  input, 
      ul.ports li.route6  button  { 
        background-color: hsla(185, 98%, 20%, 0.35); 
      }
      ul.ports li.route7  input, 
      ul.ports li.route7  button  { 
        background-color: hsla(210, 98%, 20%, 0.35); 
      }
      ul.ports li.route8  input, 
      ul.ports li.route8  button  { 
        background-color: hsla(285, 98%, 20%, 0.35); 
      }
      ul.ports li.route9  input, 
      ul.ports li.route9  button  { 
        background-color: hsla(310, 98%, 20%, 0.35); 
      }
      ul.ports li.route10 input, 
      ul.ports li.route10 button  { 
        background-color: hsla(335, 98%, 20%, 0.35); 
      }


      ul.ports li.error input {
        background-color: rgb(121, 18, 18);
        border: 1px solid red;
      }
      
      
      ul.ports li         label > span { color: hsl(  0,  0%, 75%);}  
      ul.ports li.route0  label > span { color: hsl(  0,  0%,100%);}  
      ul.ports li.route1  label > span { color: hsl(  0, 98%, 46%);}
      ul.ports li.route2  label > span { color: hsl( 35, 98%, 46%);}
      ul.ports li.route3  label > span { color: hsl( 60, 98%, 46%);}
      ul.ports li.route4  label > span { color: hsl(135, 98%, 46%);}
      ul.ports li.route5  label > span { color: hsl(160, 98%, 46%);}
      ul.ports li.route6  label > span { color: hsl(185, 98%, 46%);}
      ul.ports li.route7  label > span { color: hsl(210, 98%, 46%);}
      ul.ports li.route8  label > span { color: hsl(285, 98%, 46%);}
      ul.ports li.route9  label > span { color: hsl(310, 98%, 46%);}
      ul.ports li.route10 label > span { color: hsl(335, 98%, 46%);}
      
      

      ul.ports  li        input, 
      ul.ports  li        button {
        border-left: 1px solid hsla(  0,  0%, 75%, 0.5); 
      }
      ul.ports  li.route0 input, 
      ul.ports  li.route0 button {
        border-left: 1px solid hsla(  0,  0%,100%, 0.5); 
      }
      ul.ports  li.route1 input, 
      ul.ports  li.route1 button {
        border-left: 1px solid hsla(  0, 98%, 46%, 0.5);
      }
      ul.ports  li.route2 input, 
      ul.ports  li.route2 button {
        border-left: 1px solid hsla( 35, 98%, 46%, 0.5);
      }
      ul.ports  li.route3 input, 
      ul.ports  li.route3 button {
        border-left: 1px solid hsla( 60, 98%, 46%, 0.5);
      }
      ul.ports  li.route4 input, 
      ul.ports  li.route4 button {
        border-left: 1px solid hsla(135, 98%, 46%, 0.5);
      }
      ul.ports  li.route5 input, 
      ul.ports  li.route5 button {
        border-left: 1px solid hsla(160, 98%, 46%, 0.5);
      }
      ul.ports  li.route6 input, 
      ul.ports  li.route6 button {
        border-left: 1px solid hsla(185, 98%, 46%, 0.5);
      }
      ul.ports  li.route7 input, 
      ul.ports  li.route7 button {
        border-left: 1px solid hsla(210, 98%, 46%, 0.5);
      }
      ul.ports  li.route8 input, 
      ul.ports  li.route8 button {
        border-left: 1px solid hsla(285, 98%, 46%, 0.5);
      }
      ul.ports  li.route9 input, 
      ul.ports  li.route9 button {
        border-left: 1px solid hsla(310, 98%, 46%, 0.5);
      }
      ul.ports li.route10 input, 
      ul.ports li.route10 button {
        border-left: 1px solid hsla(335, 98%, 46%, 0.5);
      }
      
      number-scrubber,
      ul.ports li label span:before {
        display: inline;
        line-height: 36px;
        font-size: 10px;
        float: right;
        position: absolute;
        left: 86px;
        text-transform: uppercase;
        opacity: 0.5;
        width: 36px;
        text-align: center;      
      }

      number-scrubber {
        z-index: 5;
        height: 36px;
      }
      
      ul.ports li.port-type-color label span:before,
      ul.ports li.port-type-int label span:before,
      ul.ports li.port-type-number label span:before {
        content: '#';
      }
      ul.ports li.port-type-array label span:before {
        content: '[]';
      }
      ul.ports li.port-type-object label span:before {
        content: '{}';
      }
      ul.ports li.port-type-string label span:before {
        content: '"';
      }
      ul.ports li.port-type-all label span:before {
        content: '*';
      }

      section.errors header {
        display: flex;
        justify-content: space-between;
      }
      section.errors header h2 {
        font-size: 10px;
        font-weight: normal;
        line-height: 36px;
        margin-bottom: 0px;
        padding-bottom: 0px;
        position: static;
        text-align: left;
        color: var(--noflo-ui-text);
      }
      section.errors ul.toolbar {
        display: inline-block;
      }

      ul#errorEvents {
        max-height: 140px;
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        clear: left;
      }
      ul#errorEvents li {
        font-size: 10px;
        line-height: 14px;
        margin-bottom: 0px;
        color: hsl(185,100%,75%);
        max-height: 56px;
        overflow: hidden;
        margin-bottom: 2px;
        padding-bottom: 2px;
        border-bottom: 1px solid hsla(190, 30%, 2%, 0.4);
      }
    </style>
    <header>
      <input type="text" on-keydown="checkUpdateLabel" on-blur="updateLabel" class="editable-title" value="{{label}}">
      <template is="dom-if" if="{{_computeIf(node)}}">
        <h2>{{node.component}}</h2>
      </template>
    </header>
    <ul class="ports">
      <template is="dom-repeat" items="{{inports}}" as="port">
        <li class\$="{{_computeClass(port)}}">
          <label><span title="{{port.name}}">{{port.label}}</span>

            <template is="dom-if" if="{{_computeIf2(port)}}">
              <button data-name\$="{{port.name}}" on-click="sendBang">
                <noflo-icon icon="bolt"></noflo-icon>
              </button>
            </template>
            <template is="dom-if" if="{{_computeIf3(port)}}">
              <input type="checkbox" data-name\$="{{port.name}}" checked="{{port.value}}" on-change="updateValue" data-type\$="{{port.type}}">
            </template>
            <template is="dom-if" if="{{port.values}}">
              <select data-name\$="{{port.name}}" on-change="updateValue" value="{{port.value::input}}" data-type\$="{{port.type}}">
                <option></option>
                <template is="dom-repeat" items="{{port.values}}" as="value">
                  <option value="[[value]]" selected\$="{{_computeSelected(port, value)}}">{{value}}</option>
                </template>
              </select>
            </template>
            <template is="dom-if" if="{{_computeIf4(port)}}">
              <number-scrubber data-name\$="{{port.name}}" value="{{port.value}}" step="1" data-type="int" on-scrubstart="scrubStart" on-scrub="updateValue" on-scrubend="scrubEnd">#</number-scrubber>
              <input type="text" data-type="int" data-name\$="{{port.name}}" value="{{port.value::input}}" on-change="updateValue" on-keydown="checkEnter">
            </template>
            <template is="dom-if" if="{{_computeIf5(port)}}">
              <number-scrubber data-name\$="{{port.name}}" value="{{port.value}}" step="0.01" data-type="number" on-scrubstart="scrubStart" on-scrub="updateValue" on-scrubend="scrubEnd">#</number-scrubber>
              <input type="text" data-type="number" data-name\$="{{port.name}}" value="{{port.value::input}}" on-change="updateValue" on-keydown="checkEnter">
            </template>
            <template is="dom-if" if="{{_computeIf6(port)}}">
              <input type="{{port.inputType}}" data-name\$="{{port.name}}" value="{{port.value::input}}" autocapitalize="off" autocorrect="off" on-keydown="checkEnter" on-change="updateValue" data-type\$="{{port.type}}">
            </template>
            <template is="dom-if" if="{{_computeIf7(port)}}">
              <input type="text" data-name\$="{{port.name}}" data-type="string" on-change="updateValue">
              <input type="file" data-name\$="{{port.name}}" on-change="updateValue" data-type\$="{{port.type}}">
            </template>
            <template is="dom-if" if="{{_computeIf8(port)}}">
              <button class="remove-value" on-click="removeValue" data-port\$="{{port.name}}" title="Clear data">
                <noflo-icon icon="ban"></noflo-icon>
              </button>
            </template>

          </label>
          <template is="dom-if" if="{{port.description}}">
          <p>{{port.description}}</p>
          </template>
        </li>
      </template>
    </ul>
    <template is="dom-if" if="[[errorLog.length]]">
    <section class="errors">
      <header>
        <h2>Errors</h2>
        <ul class="toolbar">
          <li>
            <button id="clear" on-click="clearErrors" class="blue-button" title="Clear Error Log">
              <noflo-icon icon="ban"></noflo-icon>
            </button>
           </li>
        </ul>
      </header>
      <ul id="errorEvents">
        <template is="dom-repeat" items="[[errorLog]]" as="event">
          <li>{{ event.payload.error }}</li>
        </template>
      </ul>
    </section></template>
`,

  is: 'noflo-node-inspector',

  properties: {
    component: {
      value: null,
      notify: true,
      observer: 'componentChanged',
    },
    errorLog: {
      value() {
        return [];
      },
      notify: true,
    },
    graph: {
      value: null,
      notify: true,
      observer: 'graphChanged',
    },
    inports: {
      type: Array,
      value() {
        return [];
      },
    },
    label: {
      type: String,
      value: '',
    },
    lastErrorLog: {
      type: Number,
      value: 0,
    },
    node: {
      value: null,
      notify: true,
      observer: 'nodeChanged',
    },
    scrubbing: {
      type: Boolean,
      value: false,
    },
    showErrorLogs: {
      type: Number,
      value: 20,
    },
  },

  attached() {
    PolymerDom(this).classList.add('the-card-content');
  },

  nodeChanged() {
    if (!this.node) {
      return;
    }
    this.updatePorts();
    this.label = this.node.metadata.label;
  },

  componentChanged() {
    if (!this.component) {
      return;
    }
    this.updatePorts();
  },

  graphChanged() {
    if (!this.graph) {
      return;
    }
    this.updatePorts();
  },

  checkUpdateLabel(event) {
    if (event.keyCode === 13) {
      // Enter
      event.preventDefault();
      this.updateLabel(event);
    }
  },

  updateLabel(event) {
    // Check if we need to make change
    const label = event.currentTarget.value;
    if (label === this.node.metadata.label) {
      return;
    }
    this.graph.startTransaction('rename');
    // Change id
    let id = label;
    if (id !== this.node.id) {
      // Ensure unique
      while (this.graph.getNode(id)) {
        let num = 60466176;
        // 36^5
        num = Math.floor(Math.random() * num);
        id = `${label}_${num.toString(36)}`;
      }
      this.graph.renameNode(this.node.id, id);
    }
    // Change label
    this.graph.setNodeMetadata(id, { label });
    this.graph.endTransaction('rename');
  },

  getPortValue(port) {
    let value;
    this.graph.initializers.forEach((iip) => {
      if (iip.to.node === this.node.id && iip.to.port === port) {
        value = iip.from.data;
      }
    });
    return value;
  },

  getPortConnection(port) {
    let connected = false;
    let route = 'X';
    Object.keys(this.graph.inports).forEach((name) => {
      const inport = this.graph.inports[name];
      if (inport.process === this.node.id && inport.port === port) {
        connected = true;
        route = 2;
      }
    });
    this.graph.edges.forEach((edge) => {
      if (edge.to.node === this.node.id && edge.to.port === port) {
        connected = true;
        route = edge.metadata.route || 0;
      }
    });
    return {
      connected,
      route,
    };
  },

  portToInput(port) {
    const value = this.getPortValue(port.name);
    const connection = this.getPortConnection(port.name);
    const portDef = {
      name: port.name,
      label: port.name.replace(/(.*)\/(.*)(_.*)\.(.*)/, '$2.$4'),
      class: '',
      type: port.type,
      description: port.description,
      inputType: port.type,
      value,
      values: port.values,
      route: connection.route,
    };
    switch (port.type) {
      case 'object':
      case 'array':
        portDef.value = JSON.stringify(value);
        portDef.inputType = 'text';
        break;
      case 'int':
        portDef.inputType = 'number';
        break;
      case 'all':
      default:
        portDef.inputType = 'text';
        break;
    }
    return portDef;
  },

  inputToPort(input) {
    const dataType = input.getAttribute('data-type');
    switch (dataType) {
      case 'object':
      case 'array':
        try {
          return JSON.parse(input.value);
        } catch (e) {
          return input.value;
        }
      case 'boolean':
        return input.checked;
      case 'number':
        return parseFloat(input.value);
      case 'int':
        return parseInt(input.value, 10);
      case 'date':
        return new Date(input.value);
      case 'uri':
        return (callback) => {
          const reader = new FileReader();
          reader.onload = () => {
            callback(reader.result);
          };
          reader.readAsDataURL(input.files[0]);
        };
      default:
        return input.value;
    }
  },

  updatePorts() {
    this.set('inports', []);
    if (!this.component || !this.graph) {
      return;
    }
    this.component.inports.forEach((port) => {
      const portDef = this.portToInput(port);
      this.push('inports', portDef);
    });
  },

  checkEnter(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      this.updateValue(event);
    }
  },

  updateValue(event) {
    event.preventDefault();
    const value = this.inputToPort(event.currentTarget);
    const name = event.currentTarget.getAttribute('data-name');
    let port;
    this.inports.forEach((p) => {
      if (p.name === name) {
        port = p;
      }
    });
    if (port.type !== 'string' && event.currentTarget.value === '') {
      // Empty string should remove number, object, array IIPs
      this.removeValue(event);
      return;
    }
    const validatePortValue = (type, val) => {
      switch (type) {
        case 'number':
        case 'int':
          return val !== '' && !Number.isNaN(val);
        case 'object':
          return val instanceof Object;
        case 'array':
          return val instanceof Array;
        case 'date':
          return val instanceof Date;
        default:
          return true;
      }
    };
    const setPortValue = () => {
      if (!this.scrubbing) {
        this.graph.startTransaction('iipchange');
      }
      this.graph.removeInitial(this.node.id, name);
      this.graph.addInitial(value, this.node.id, name);
      if (!this.scrubbing) {
        this.graph.endTransaction('iipchange');
        // Force Polymer to update view
        this.updatePorts();
      }
    };
    if (validatePortValue(port.type, value)) {
      if (typeof value === 'function') {
        // async callback
        value(setPortValue);
      } else {
        setPortValue(value);
      }
      PolymerDom(PolymerDom(PolymerDom(event.currentTarget).parentNode).parentNode).classList.remove('error');
    } else {
      PolymerDom(PolymerDom(PolymerDom(event.currentTarget).parentNode).parentNode).classList.add('error');
    }
  },

  scrubStart(event) {
    if (event.currentTarget.value === null) {
      // eslint-disable-next-line no-param-reassign
      event.currentTarget.value = 0;
    }
  },

  // This need to work with the journal
  // this.scrubbing = true;
  // this.graph.startTransaction('iipscrub');
  scrubEnd() {
  },

  // this.graph.endTransaction('iipscrub');
  // this.scrubbing = false;
  removeValue(event) {
    event.preventDefault();
    let name = event.currentTarget.getAttribute('data-port');
    if (!name) {
      name = event.currentTarget.getAttribute('data-name');
    }
    this.graph.removeInitial(this.node.id, name);
    PolymerDom(PolymerDom(PolymerDom(event.currentTarget).parentNode).parentNode).classList.remove('error');
    this.updatePorts();
  },

  sendBang(event) {
    event.preventDefault();
    const name = event.currentTarget.getAttribute('data-name');
    this.graph.startTransaction('bang');
    this.graph.removeInitial(this.node.id, name);
    this.graph.addInitial(true, this.node.id, name);
    this.graph.removeInitial(this.node.id, name);
    this.graph.endTransaction('bang');
  },

  clearErrors() {
    this.fire('clear:runtimeevents', {
      id: this.node.id,
      type: 'processerror',
    });
  },

  _computeIf(node) {
    if (!node) {
      return true;
    }
    return node.label !== node.component;
  },

  _computeClass(port) {
    return `route route${port.route} ${port.class} port-type-${port.type}`;
  },

  _computeIf2(port) {
    return port.type === 'bang';
  },

  _computeIf3(port) {
    return port.type === 'boolean';
  },

  _computeIf4(port) {
    return port.type === 'int' && !port.values;
  },

  _computeIf5(port) {
    return port.type === 'number' && !port.values;
  },

  _computeIf6(port) {
    return port.type !== 'bang' && port.type !== 'boolean' && port.type !== 'int' && port.type !== 'number' && port.type !== 'uri' && !port.values;
  },

  _computeIf7(port) {
    return port.type === 'uri';
  },

  _computeIf8(port) {
    return port.type !== 'bang' && port.value !== undefined;
  },

  _computeSelected(port, value) {
    return port.value === value;
  },
});
