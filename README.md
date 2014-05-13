# NoFlo Development Environment [![Build Status](https://secure.travis-ci.org/noflo/noflo-ui.png?branch=master)](http://travis-ci.org/noflo/noflo-ui)

The NoFlo Development Environment is a client-side web application that helps users to build and run flow-based programs built with [NoFlo](http://noflojs.org/) and other compatible FBP systems. The NoFlo Development Environment is available under the [MIT license](https://github.com/noflo/noflo-ui/blob/master/LICENSE-MIT).

This project was made possible by [1205 Kickstarter backers](http://noflojs.org/kickstarter/). Check the [project ChangeLog](https://github.com/noflo/noflo-ui/blob/master/CHANGES.md) for new features and other changes.

## Hosted version

There is a hosted version of the NoFlo Development Environment available. Please refer to <http://noflojs.org/noflo-ui/>.

## Usage

Please read more from <http://flowhub.io/documentation/>. See also the [available support channels](http://noflojs.org/support/).

### Projects

Projects are how the NoFlo UI manages its graphs and components. Your projects are stored in the browser's local IndexedDB database, and can be synchronized with GitHub repositories. Each project can support multiple components, a main graph, and as many subgraphs as needed.

### Examples

In addition to graphs developed by users, the NoFlo UI is able to load and run examples shared as [Gists](https://gist.github.com/). The Gists used should contain a `noflo.json` file providing a [JSON graph definition](http://noflojs.org/documentation/json/) used for the example.

The examples should also provide the necessary information for running the example inside the `environment` key of the graph propeties: 

* `type`: `noflo-browser` for client-side flows, `noflo-nodejs` for Node.js server-side flows
* `content`: optional HTML contents to insert into the UI's preview card
* `width`: optional width of the preview card in pixels
* `height`: optional height of the preview card in pixels

Please refer to an example Gist in <https://gist.github.com/bergie/6608098> (you can also [run it](http://app.flowhub.io/#example/6608098)).

### Managing server-side flows

In addition to being able to manage and run client-side NoFlo flows, the NoFlo UI is also able to run server-side NoFlo code (and indeed anything else [compatible with the API](#supporting-other-fbp-systems)). For NoFlo flows running on Node.js, you need to install and run [noflo-nodejs](https://github.com/noflo/noflo-nodejs).

## Development

To be able to work on the NoFlo UI you need a checkout of this repository and a working [Node.js](http://nodejs.org/) installation. Go to the checkout folder and run:

    $ npm install

You also need the [Grunt](http://gruntjs.com/) build tool:

    $ sudo npm install -g grunt-cli

This will provide you with all the needed development dependencies. Now you can build a new version by running:

    $ grunt build

If you prefer, you can also start a watcher process that will do a rebuild whenever one of the files changes:

    $ grunt watch

Serve the UI using a webserver, then open the URL it in a web browser. Example:

    $ npm install simple-server
    $ ./node_modules/.bin/simple-server . 3005

Where 3005 is the port you want the server to run. Once it is built and the server is running you can access the UI at `http://localhost:3005/index.html`

In addition to this project, the other repository of interest is the [the-graph](https://github.com/the-grid/the-graph) graph editor widget used for editing flows.

### Adding components to the bundled runtime

The HTML runtime of NoFlo utilizes a custom [Component.io](http://component.io/) build of NoFlo that includes most of the common NoFlo [component libraries](http://noflojs.org/library/) that work with the browser. If you need to add new libraries, edit the `preview/component.json` file and rebuild.

### Supporting other FBP systems

Even though the UI itself is built with NoFlo, it isn't talking directly with that for running and building graphs. Instead, it is utilizing the [FBP Network Protocol](http://noflojs.org/documentation/protocol/) which enables it to talk to any compatible FBP system.

If you want to integrate the UI with a new environment you need to provide some transport layer (for example, WebSockets) that can talk the protocol, and then implement [runtime access](https://github.com/noflo/noflo-runtime) for that.
