const noflo = require('noflo');
const url = require('url');
const qs = require('querystring');

const isRedirectValid = (redirect) => {
  let parsedAppRedirect;
  const parsedRedirect = url.parse(redirect);
  if ((window.location.protocol === 'https:') && process.env.NOFLO_OAUTH_SSL_CLIENT_ID) {
    parsedAppRedirect = url.parse(process.env.NOFLO_OAUTH_SSL_CLIENT_REDIRECT);
  } else {
    parsedAppRedirect = url.parse(process.env.NOFLO_OAUTH_CLIENT_REDIRECT);
  }
  return parsedRedirect.host === parsedAppRedirect.host;
};

const getUrl = (params) => {
  const query = {
    client_id: params.client,
    response_type: 'code',
    redirect_uri: params.url,
  };
  if (params.scopes.length) { query.scope = params.scopes.join(' '); }
  return `${process.env.NOFLO_OAUTH_PROVIDER}${process.env.NOFLO_OAUTH_ENDPOINT_AUTHORIZE}?${qs.stringify(query)}`;
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'string' });
  c.outPorts.add('codeurl',
    { datatype: 'string' });
  c.outPorts.add('redirect',
    { datatype: 'string' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    const data = input.getData('in');
    if (!isRedirectValid(data.payload.url)) {
      output.done(new Error(`App URL must match GitHub app configuration ${process.env.NOFLO_OAUTH_CLIENT_REDIRECT}`));
      return;
    }

    const params = {
      client: process.env.NOFLO_OAUTH_CLIENT_ID,
      url: data.payload.url,
      scopes: data.payload.scopes,
    };
    if ((window.location.protocol === 'https:') && process.env.NOFLO_OAUTH_SSL_CLIENT_ID) {
      params.client = process.env.NOFLO_OAUTH_SSL_CLIENT_ID;
    }
    output.sendDone({
      redirect: getUrl(params),
    });
  });
};
