# NoFlo Development Environment

The NoFlo Development Environment is an offline-capable, client-side web application
that helps users to build and run flow-based programs built with FBP compatible systems such as [NoFlo](http://noflojs.org/),
[MsgFlo](https://msgflo.org), [imgflo](https://imgflo.org) and [MicroFlo](https://microflo.org).
The NoFlo Development Environment is available under the [MIT license](https://github.com/noflo/noflo-ui/blob/master/LICENSE-MIT).

This project was made possible by [1205 Kickstarter backers](http://noflojs.org/kickstarter/).
Check the [project ChangeLog](https://github.com/noflo/noflo-ui/blob/master/CHANGES.md) for new features and other changes.

## Hosted version

[Flowhub](https://app.flowhub.io) is a hosted version of the NoFlo Development Environment.

If you just want to create applications, we recommend that you use this version instead of building your own from source.

<a href="https://app.flowhub.io"><img alt="Start Flowhub webapp" src="https://flowhub.io/assets/app-web.svg" width="400"></a>

## Usage with different FBP systems

Even though the UI itself is built with NoFlo, it isn't talking directly with NoFlo for running and building graphs.
Instead, it is utilizing the [FBP Network Protocol](https://flowbased.github.io/fbp-protocol/) which enables it to talk to *any* compatible FBP system.
Currently over 5 different runtimes are known to work.

By implementing the protocol in your runtime, you can program it with NoFlo UI.
If you use WebSockets or WebRTC as the transport, you do not need to change anything on NoFlo UI.
You can also [add support other transports](https://github.com/flowbased/fbp-protocol-client).

### Registering runtime for a user

The easiest way to pass user the connection information of your runtime is through the _live mode_. With this, the connection details are passed to the app via URL parameters, like this:

```
http://app.flowhub.io#runtime/endpoint?protocol%3Dwebsocket%26address%3Dws%3A%2F%2F127.0.0.1%3A3569
```

The supported parameters for the endpoint include:

* `protocol`: the FBP protocol transport to use for the connection. Possible values include `websocket`, `iframe`, and `webrtc`
* `address`: URL to use for the connection. Can be for instance `ws://` URL for WebSockets, or the signaller URL and connection identifier for WebRTC
* `secret`: secret to use for communicating with the runtime

These URLs can be shown on command line output, or provided to user via other mechanism. See a [video demonstration](https://youtu.be/EdgeSDFd9p0) of opening the app in live mode via a NFC tag.

### Adding new runtime information

One can *optionally* add component templates, syntax highlighting and a 'get started' link for new runtimes.

1. Add a new YAML file with runtime info as `./runtimeinfo/myruntime.yaml`. [Example](./runtimeinfo/msgflo.yaml)
2. Include it in [./runtimeinfo/index.js](./runtimeinfo/index.js)
3. Commit the changes
4. Send a [Pull Request](https://github.com/noflo/noflo-ui/pull/new/master), so everyone benefits!

## Development of NoFlo UI

Only necessary if you want to hack on NoFlo UI itself. Not neccesary for making apps with FBP.

### Via Docker
A Dockerfile has been provided that can be used to easily build/run the NoFlo UI. You can also get an automatically built image [from Docker Hub](https://hub.docker.com/r/flowhub/noflo-ui/).

#### Build
```bash
docker build -t noflo-ui .
```

#### Run
```bash
docker run -d -p 9999:80 noflo-ui
```

Once it is built and the server is running you can access the UI at http://localhost:9999/index.html

### Directly

To be able to work on the NoFlo UI you need:

* A checkout of this repository
* A working [Node.js](http://nodejs.org/) installation
* At least version 3 of the NPM package manager

Go to the checkout folder and run:

    $ npm install

This will provide you with all the needed development dependencies. Now you can build a new version by running:

    $ npm run build

You have to run this command as an administrator on Windows.

Serve the UI using a webserver, then open the URL it in a web browser. Example:

    $ npm start

If you prefer, you can instead start a webpack dev server process that will do a rebuild whenever one of the files changes:

    $ npm run dev

Once it is built and the server is running you can access the UI at `http://localhost:9999/index.html`

In addition to this project, the other repository of interest is the [the-graph](https://github.com/flowhub/the-graph) graph editor widget used for editing flows.


### Architecture

On high level, the noflo-ui architecture follows [Redux](http://redux.js.org/) conventions adapted to NoFlo. Here is how the main data flow looks like:

```fbp
Store OUT -> IN Middleware     # Store sends actions together with application state to middleware
Middleware NEW -> ACTION Store # Middleware can trigger new actions
Middleware PASS -> IN Reduce   # Actions go from middleware to reducers
Reduce OUT -> STATE Store      # Reducers produce a new state object that gets sent to store
Reduce OUT -> STATE View       # State also goes to the view
View ACTION -> ACTION Store    # View can trigger actions
```

The actual flow is more detailed. You can view and edit it in `graphs/main.fbp`.

**Note:** the priciples outlined below are the architecture we're aiming towards. We're refactoring parts of the system to fit this architecture as we modify them. All new functionality should be implemented following this architecture.

#### Store

The Store component keeps track of the latest application state. When it receives new actions, it sends the out to the middleware and reducer chain together with the latest application state.

#### Middleware

noflo-ui middleware are components or graphs that can interact with particular actions. Each action passes through the chain of middlewares, and each middleware has two options on dealing with an action:

1. Pass the action along without modifying it
2. Capture the action and trigger new action(s)

Middleware are where side effects related to the application state are handled. This can include talking to external web services, FBP runtime communications, and loading or saving data to the local IndexedDB. Middleware do receive the current application state and can read from it, but they only manipulate state by the way of creating new actions.

Some middleware can also act as [generators](http://bergie.iki.fi/blog/noflo-process-api/#generator-components), creating new actions based on external input.

The middleware approach is explained further in [this blog post](http://bergie.iki.fi/blog/redux-middleware-noflo/).

#### Reducers

The job of the reducers is to receive actions and make changes to application state. The reducers must in effect be pure functions, where the same input state and action combination always produces the same new state.

#### View

The application's view layer is implemented as [Polymer](https://www.polymer-project.org/) elements. The application view receives the state object produced by the reducers.

User interactions in the application view must not make direct state changes. Instead, the application view can trigger new actions by firing Polymer events. These then get processed by the middleware and reducers, causing the state to change.

## Authentication and custom URLs

NoFlo UI is using GitHub for authentication. We have a default application configured to work at `http://localhost:9999`. If you want to serve your NoFlo UI from a different URL, you need to register your own [OAuth application](https://github.com/settings/applications/new) with them. Make sure to match GitHub's [redirect URL policy](https://developer.github.com/v3/oauth/#redirect-urls).

To enable your own OAuth application, set the following environment variables and rebuild NoFlo UI:

* `$NOFLO_OAUTH_CLIENT_ID`: Client ID of your GitHub OAuth application
* `$NOFLO_OAUTH_CLIENT_REDIRECT`: Redirect URL of your GitHub OAuth application

### OAuth secrets

For handling the OAuth Client Secret part of the login process, there are two options:

#### Built-in OAuth secret

This is the easy option for local NoFlo UI development. Simply build the OAuth client secret into the NoFlo UI app by setting it via the `$NOFLO_OAUTH_CLIENT_SECRET` environment variable.

**Note:** this means anybody with access to this NoFlo UI build will be able to read your client secret. Never do this with a world-accessible URL. It is fine for local-only development builds, though.

#### Gatekeeper

You can deploy an instance of the [Gatekeeper Node.js app](https://github.com/prose/gatekeeper) to handle the OAuth token exchange for you. Configure the Gatekeeper location to your NoFlo UI build with `$NOFLO_OAUTH_GATE` environment variable.

This is the more secure mechanism, since only the Gatekeeper server needs to know the Client Secret.
