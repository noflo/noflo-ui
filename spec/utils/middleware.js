const debugOpenBracket = data => console.log(`< ${data.id} ${data.group}`);
const debugData = data => console.log(`DATA ${data.id}`);
const debugCloseBracket = data => console.log(`> ${data.id} ${data.group}`);
const noflo = require('noflo');

class Middleware {
  constructor(component, baseDir) {
    this.component = component;
    this.baseDir = baseDir;
    this.instance = null;
    this.actionIn = null;
    this.newAction = null;
    this.passAction = null;
    this.debug = false;
  }

  attachAndStart(instance, callback) {
    this.instance = instance;
    this.actionIn = noflo.internalSocket.createSocket();
    this.instance.inPorts.in.attach(this.actionIn);
    this.actionIn.port = 'in';
    return this.instance.start(callback);
  }

  before(callback) {
    const loader = new noflo.ComponentLoader(this.baseDir);
    return loader.load(this.component, (err, instance) => {
      if (err) { return callback(err); }
      if (instance.isReady()) {
        this.attachAndStart(instance, callback);
        return;
      }
      return instance.once('ready', () => {
        return this.attachAndStart(instance, callback);
      });
    });
  }

  beforeEach() {
    this.passAction = noflo.internalSocket.createSocket();
    this.instance.outPorts.pass.attach(this.passAction);
    this.passAction.port = 'pass';
    this.newAction = noflo.internalSocket.createSocket();
    this.instance.outPorts.new.attach(this.newAction);
    return this.newAction.port = 'new';
  }

  afterEach() {
    this.instance.outPorts.pass.detach(this.passAction);
    return this.instance.outPorts.new.detach(this.newAction);
  }

  enableDebug() {
    if (this.debug) { return; }
    this.instance.network.on('begingroup', debugOpenBracket);
    this.instance.network.on('data', debugData);
    this.instance.network.on('endgroup', debugCloseBracket);
    return this.debug = true;
  }
  disableDebug() {
    if (!this.debug) { return; }
    this.instance.network.removeListener('begingroup', debugOpenBracket);
    this.instance.network.removeListener('data', debugData);
    this.instance.network.removeListener('endgroup', debugCloseBracket);
    return this.debug = false;
  }

  send(action, payload, state) {
    return this.actionIn.send({
      action,
      payload,
      state
    });
  }

  receive(socket, expected, check, done) {
    const received = [];
    var onData = function(data) {
      received.push(`${data.action} DATA`);
      check(data.payload);
      if (!(received.length >= expected.length)) { return; }
      socket.removeListener('data', onData);
      chai.expect(received).to.eql(expected);
      return done();
    };
    return socket.on('data', onData);
  }

  receiveAction(action, check, done) {
    const expected = [];
    expected.push(`${action} DATA`);
    return this.receive(this.newAction, expected, check, done);
  }

  receivePass(action, payload, done) {
    const check = data =>
      // Strict equality check for passed packets
      chai.expect(data).to.equal(payload)
    ;
    const expected = [];
    expected.push(`${action} DATA`);
    return this.receive(this.passAction, expected, check, done);
  }

  receivePassCheck(action, check, done) {
    const expected = [];
    expected.push(`${action} DATA`);
    return this.receive(this.passAction, expected, check, done);
  }
}

window.nofloWaitFor = (condition, callback, maxTries = 100) => {
  let tries = 0;
  const checkCondition = () => {
    if (condition()) {
      callback();
      return;
    }
    if (tries > maxTries) {
      callback(new Error('Maximum tries exceeded'));
    }
    tries++;
    setTimeout(checkCondition, 100);
  };
  checkCondition();
};

window.middleware = (component, baseDir) => new Middleware(component, baseDir);
