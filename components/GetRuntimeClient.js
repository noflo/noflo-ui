const noflo = require('noflo');
const fbpClient = require('fbp-client');

// @runtime noflo-browser

const ensureInstance = function(definition, clients, output) {
  if (definition.id && clients[definition.id]) {
    // Already have a client instance for this one
    return Promise.resolve(clients[definition.id]);
  }
  if (!definition.secret) { definition.secret = ''; }
  return fbpClient(definition, {
    // Note: we may want to re-enable validation later when most runtimes are compatible
    skipValidation: true,
    // Increased connection timeout due to browser runtimes occasionally taking longer to evaluate
    connectionTimeout: 3000
  }
  )
  .then(function(client) {
    output.send({
      instance: client});
    if (!client.definition.id) { return client; }

    const clientId = definition.id;
    clients[clientId] = client;

    if (!client.isConnected()) {
      // Since we're not connected, the ID may change once we do
      client.once('connected', function() {
        if (client.definition.id === clientId) { return; }
        delete clients[clientId];
        return clients[client.definition.id] = client;
      });
    }

    return client;
  });
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.description = 'Holder for runtime instances';
  c.inPorts.add('initial', {
    description: 'Initialize client for all stored runtime definitions',
    datatype: 'object'
  }
  );
  c.inPorts.add('updated', {
    description: 'Update client instance for a runtime definition',
    datatype: 'object'
  }
  );
  c.inPorts.add('in', {
    description: 'Get client instance for a route definition',
    datatype: 'object',
    addressable: true
  }
  );
  c.outPorts.add('instance', {
    description: 'Client instance when created',
    datatype: 'object'
  }
  );
  c.outPorts.add('out', {
    description: 'Route runtime client was matched for',
    datatype: 'object',
    addressable: true
  }
  );
  c.outPorts.add('client', {
    description: 'Runtime client instance',
    datatype: 'object',
    addressable: true
  }
  );
  c.outPorts.add('updated', {
    description: 'Updated runtime definition',
    datatype: 'object'
  }
  );
  c.outPorts.add('error',
    {datatype: 'object'});
  c.clients = {};
  c.tearDown = function(callback) {
    c.clients = {};
    return callback();
  };
  c.process(function(input, output) {
    let runtime;
    if (input.hasData('initial')) {
      let runtimes = input.getData('initial');
      if (!runtimes) { runtimes = []; }
      Promise.all(runtimes.map(def => ensureInstance(def, c.clients, output)))
      .then((() => output.done()), err => output.done(err));
      return;
    }
    if (input.hasData('updated')) {
      const data = input.getData('updated');
      runtime = data.payload || data;
      if (!runtime.secret) { runtime.secret = ''; }
      // TODO: Disconnect previous as needed
      return ensureInstance(runtime, c.clients, output)
      .then((function() {
        output.send({
          updated: data});
        return output.done();
      }), err => output.done(err));
      return;
    }
    const indexesWithData = input.attached('in').filter(idx => input.hasData(['in', idx]));
    if (!indexesWithData.length) { return; }
    return Promise.all(indexesWithData.map(function(idx) {
      const route = input.getData(['in', idx]);
      if (!route.runtime) {
        return Promise.reject(new Error("No runtime defined"));
      }
      ({ runtime } = route);
      if (typeof runtime === 'string') {
        runtime =
          {id: runtime};
        route.runtime = runtime;
      }
      return ensureInstance(runtime, c.clients, output)
      .then(function(instance) {
        const def = {
          client: instance,
          route,
          idx
        };
        return def;
      });
    }))
      .then(runtimes =>
        (() => {
          const result = [];
          for (runtime of Array.from(runtimes)) {
            result.push(output.send({
              client: new noflo.IP('data', runtime.client,
                {index: runtime.idx}),
              out: new noflo.IP('data', runtime.route,
                {index: runtime.idx})}));
          }
          return result;
        })()
      )
      .then((() => output.done()), err => output.done(err));
  });
  return c;
};
