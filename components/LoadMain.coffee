noflo = require 'noflo'

class LoadMain extends noflo.Component
  constructor: ->
    @element = null
    @inPorts =
      container: new noflo.Port 'object'
      project: new noflo.Port 'object'
      sketch: new noflo.Port 'object'
      example: new noflo.Port 'object'
    @outPorts =
      element: new noflo.Port 'object'
      newsketch: new noflo.Port 'object'

    @inPorts.container.on 'data', (container) =>
      container.innerHTML = ''
      @element = document.createElement 'noflo-main'
      container.appendChild @element
      if @outPorts.element.isAttached()
        @outPorts.element.send @element
        @outPorts.element.disconnect()
      if @outPorts.newsketch.isAttached()
        @element.addEventListener 'newsketch', (sketch) =>
          @outPorts.newsketch.send sketch.detail
          @outPorts.newsketch.disconnect()

    @inPorts.project.on 'data', (data) =>
      @element.projects.push data
    @inPorts.sketch.on 'data', (data) =>
      @element.sketches.push data
    @inPorts.example.on 'data', (data) =>
      @element.examples.push data

exports.getComponent = -> new LoadMain
