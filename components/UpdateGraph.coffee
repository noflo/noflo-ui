noflo = require 'noflo'
_ = require 'underscore'

getInport = (graph, publicPort) ->
  graph.inports[publicPort]

getOutport = (graph, publicPort) ->
  graph.outports[publicPort]

getInitial = (graph, node, port) ->
  for initial in graph.initializers
    if initial.to.node is node and initial.to.port is port
      return initial

  return null

getGroup = (graph, name) ->
  for group in graph.groups
    if group.name is name
      return group

  return null

class UpdateGraph extends noflo.Component
  graph: null

  constructor: ->
    @inPorts = new noflo.InPorts

    @inPorts.add 'graph',
      datatype: 'object'
      process: (event, payload) =>
        if event is 'data'
          @graph = payload

    @inPorts.add 'event',
      datatype: 'object'
      process: (event, payload) =>
        graph = @graph

        if event is 'data' and payload.payload?.graph is graph.name
          command = payload.command

          switch command
            when 'addnode'
              id = payload.payload.id
              component = payload.payload.component
              metadata = payload.payload.metadata

              oldNode = graph.getNode id

              unless oldNode
                graph.addNode id, component, metadata

            when 'removenode'
              id = payload.payload.id

              oldNode = graph.getNode id

              if oldNode
                graph.removeNode id

            when 'changenode'
              id = payload.payload.id
              metadata = payload.payload.metadata

              oldNode = graph.getNode id

              if oldNode and not _.isEqual(oldNode.metadata, metadata)
                graph.setNodeMetadata id, metadata

            when 'addedge'
              srcNode = payload.payload.src.node
              srcPort = payload.payload.src.port
              srcIndex = payload.payload.src.index

              targetNode = payload.payload.tgt.node
              targetPort = payload.payload.tgt.port
              targetIndex = payload.payload.tgt.index

              oldEdge = graph.getEdge srcNode, srcPort, targetNode, targetPort

              unless oldEdge
                graph.addEdgeIndex srcNode, srcPort, srcIndex,
                  targetNode, targetPort, targetIndex

            when 'removeedge'
              srcNode = payload.payload.src.node
              srcPort = payload.payload.src.port

              targetNode = payload.payload.tgt.node
              targetPort = payload.payload.tgt.port

              oldEdge = graph.getEdge srcNode, srcPort, targetNode, targetPort

              if oldEdge
                graph.removeEdge srcNode, srcPort, targetNode, targetPort

            when 'changeedge'
              srcNode = payload.payload.src.node
              srcPort = payload.payload.src.port

              targetNode = payload.payload.tgt.node
              targetPort = payload.payload.tgt.port

              metadata = payload.payload.metadata

              oldEdge = graph.getEdge srcNode, srcPort, targetNode, targetPort

              if oldEdge and not _.isEqual(oldEdge.metadata, metadata)
                graph.setEdgeMetadata srcNode, srcPort, targetNode, targetPort, metadata

            when 'addinitial'
              data = payload.payload.src.data
              node = payload.payload.tgt.node
              port = payload.payload.tgt.port
              index = payload.payload.tgt.index
              metadata = payload.payload.metadata

              oldInitial = getInitial graph, node, port

              unless oldInitial
                graph.addInitialIndex data, node, port, index, metadata

            when 'removeinitial'
              node = payload.payload.tgt.node
              port = payload.payload.tgt.port

              oldInitial = getInitial graph, node, port

              if oldInitial
                graph.removeInitial node, port

            when 'addinport'
              publicPort = payload.payload.public
              node = payload.payload.node
              port = payload.payload.port
              metadata = payload.payload.metadata

              unless getInport graph, publicPort
                graph.addInport publicPort, node, port, metadata

            when 'removeinport'
              publicPort = payload.payload.public
              graph.removeInport publicPort

            when 'renameinport'
              from = payload.payload.from
              to = payload.payload.to

              renamed = getInport graph, to

              unless renamed
                graph.renameInport from, to

            when 'addoutport'
              publicPort = payload.payload.public
              node = payload.payload.node
              port = payload.payload.port
              metadata = payload.payload.metadata

              unless getOutport graph, publicPort
                graph.addOutport publicPort, node, port, metadata

            when 'removeoutport'
              publicPort = payload.payload.public
              graph.removeOutport publicPort

            when 'renameoutport'
              from = payload.payload.from
              to = payload.payload.to

              renamed = getInport graph, to

              unless renamed
                graph.renameInport from, to

              graph.renameOutport from, to

            when 'addgroup'
              name = payload.payload.name
              nodes = payload.payload.nodes
              metadata = payload.payload.metadata

              oldGroup = getGroup graph, name

              unless oldGroup
                graph.addGroup name, nodes, metadata

            when 'removegroup'
              name = payload.payload.name

              oldGroup = getGroup graph, name

              if oldGroup
                graph.removeGroup name

            when 'renamegroup'
              from = payload.payload.from
              to = payload.payload.to

              oldGroup = getGroup graph, from

              if oldGroup
                graph.renameGroup from, to

            when 'changegroup'
              name = payload.payload.name
              metadata = payload.payload.metadata

              oldGroup = getGroup graph, name

              if oldGroup and not _.isEqual(oldGroup.metadata, metadata)
                graph.setGroupMetadata name, metadata

    @outPorts = new noflo.OutPorts

exports.getComponent = -> new UpdateGraph
