# NoFlo Development Environment [![Build Status](https://secure.travis-ci.org/noflo/noflo-ui.png?branch=master)](http://travis-ci.org/noflo/noflo-ui)

The NoFlo Development Environment is a client-side web application that helps users to build and run flow-based programs built with [NoFlo](http://noflojs.org/) and other compatible FBP systems.

## Features

The NoFlo UI is still under heavy development. See the [Kickstarter project](http://www.kickstarter.com/projects/noflo/noflo-development-environment) for the full explanation of what is to come.

### Projects

Full FBP projects stored on version control are not yet supported.

### Sketches

Sketches are flow-based programs that are only stored locally in your browser's LocalStorage. These are intended for lightweight experimentation before actually moving the flows to real projects.

The sketches follow the same format as the example Gists explained below.

### Examples

In addition to graphs developed by users, the NoFlo UI is able to load and run examples shared as [Gists](https://gist.github.com/). The Gists used should contain a `noflo.json` file providing a [JSON graph definition](http://noflojs.org/documentation/json/) used for the example.

The examples should also provide the necessary information for running the example inside the `environment` key of the graph propeties: 

* `runtime`: `html` for client-side flows, `websocket` for Node.js server-side flows
* `content`: optional HTML contents to insert into the UIs preview card
* `width`: optional width of the preview card in pixels
* `height`: optional height of the preview card in pixels

Please refer to an example Gist in <https://gist.github.com/bergie/6608098> (you can also [run it](http://noflo.github.io/noflo-ui/#example/6608098)).

### Managing server-side flows

In addition to being able to manage and run client-side NoFlo flows, the NoFlo UI is also able to run server-side NoFlo code (and indeed anything else [compatible with the API](#supporting-other-fbp-systems)). For NoFlo flows running on Node.js, you need to install and run [noflo-ui-server](https://github.com/noflo/noflo-ui-server).

### Mobile app

In addition to the web version, the NoFlo UI also also packaged as a [PhoneGap](http://phonegap.com/) mobile app. This will enable us to provide it in an easier way and without unnecessary browser chrome to popular platforms like iOS and Android.

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
    $ ./node_modules/.bin/simple-server .

In addition to this project, the other repository of interest is the [the-graph](https://github.com/the-grid/the-graph) graph editor widget used for editing flows.

### Adding components

The HTML runtime of NoFlo utilizes a custom [Component.io](http://component.io/) build of NoFlo that includes most of the common NoFlo [component libraries](http://noflojs.org/library/) that work with the browser. If you need to add new libraries, edit the `preview/component.json` file and rebuild.

### Supporting other FBP systems

Even though the UI itself is built with NoFlo, it isn't talking directly with that for running and building graphs. Instead, it is utilizing the [FBP Network Protocol](https://github.com/noflo/noflo/issues/107) which enables it to talk to any compatible FBP system.

If you want to integrate the UI with a new environment you need to provide some transport layer (for example, WebSockets) that can talk the protocol, and then implement [runtime access](https://github.com/noflo/noflo-ui/tree/master/src/runtimes) for that in the UI. For showing the state of the runtime you may also want to implement a [dataflow plugin](https://github.com/noflo/noflo-ui/blob/master/src/plugins/preview-iframe.coffee).


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/noflo/noflo-ui/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

