noflo = require 'noflo'
{Dataflow} = require '/meemoo-dataflow'
require 'noflo-ui/src/plugins/nofloGraph.js'
BaseRuntime = require 'noflo-ui/src/runtimes/base.js'

describe 'Dataflow graph to NoFlo graph', ->
  dataflow = null

  nofloGraph = null
  dataflowGraph = null

  nofloNode = null
  dataflowNode = null
  
  before ->
    # Prepare empty NoFlo graph
    nofloGraph = new noflo.Graph

    # Load Dataflow
    element = document.querySelector '.dataflow-graph-test'
    dataflow = new Dataflow
      appendTo: element

    # Load NoFlo graph plugin
    runtime = new BaseRuntime nofloGraph

    # Register the graph to the NoFlo graph plugin
    dataflow.plugins.nofloGraph.registerGraph nofloGraph, runtime

    # Expose the Dataflow graph instance
    dataflowGraph = dataflow.currentGraph

  describe 'initially', ->
    it 'NoFlo graph should be empty', ->
      chai.expect(nofloGraph.nodes).to.be.empty
      chai.expect(nofloGraph.edges).to.be.empty
      chai.expect(nofloGraph.initializers).to.be.empty
    it 'Dataflow graph should be empty', ->
      chai.expect(dataflowGraph.nodes.length).to.equal 0
      chai.expect(dataflowGraph.edges.length).to.equal 0
  describe 'adding a node to the Dataflow graph', ->
    it 'should be now in the Dataflow graph nodes list', ->
      dataflowNode = new dataflow.nodes.base.Model
        parentGraph: dataflowGraph
      dataflowGraph.nodes.add dataflowNode
      chai.expect(dataflowGraph.nodes.length).to.equal 1
      chai.expect(dataflowGraph.nodes.at(0)).to.equal dataflowNode
    it 'should also be in NoFlo graph nodes list', (done) ->
      setTimeout ->
        chai.expect(nofloGraph.nodes.length).to.equal 1
        nofloNode = nofloGraph.nodes[0]
        done()
      , 1
    it 'the Dataflow node should contain a reference to the NoFlo node', ->
      chai.expect(dataflowNode.nofloNode).to.equal nofloNode
    it 'the NoFlo node should contain a reference to the Dataflow node', ->
      chai.expect(nofloNode.dataflowNode).to.equal dataflowNode
    it 'both nodes should have the same component', ->
      chai.expect(nofloNode.component).to.equal dataflowNode.type
    describe 'the NoFlo node', ->
      it 'should have a generated ID', ->
        chai.expect(nofloNode.id).not.to.be.empty
      it 'the ID should be generated based on the type', ->
        chai.expect(nofloNode.id.substr(0, dataflowNode.type.length + 1)).to.equal "#{dataflowNode.type}_"
      it 'should have the ID stored to the Dataflow node', ->
        chai.expect(dataflowNode.get('nofloId')).to.equal nofloNode.id
      it 'should contain metadata', ->
        chai.expect(nofloNode.metadata).to.be.a 'object'
        chai.expect(nofloNode.metadata).not.to.be.empty
      it 'the label should be the same as the type', ->
        chai.expect(nofloNode.metadata.label).to.be.a 'string'
        chai.expect(nofloNode.metadata.label).to.equal dataflowNode.type
