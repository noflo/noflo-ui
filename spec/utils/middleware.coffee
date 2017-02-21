window.middleware =
  send: (socket, action, payload, state) ->
    actionParts = action.split ':'
    socket.beginGroup part for part in actionParts
    socket.send
      payload: payload
      state: state
    socket.endGroup part for part in actionParts

  receive: (socket, expected, check, done) ->
    received = []
    onBeginGroup = (group) ->
      received.push "< #{group}"
    onData = (data) ->
      received.push 'DATA'
      check data.payload
    onEndGroup = (group) ->
      received.push "> #{group}"
      return unless received.length >= expected.length
      socket.removeListener 'begingroup', onBeginGroup
      socket.removeListener 'data', onData
      socket.removeListener 'endgroup', onEndGroup
      chai.expect(received).to.eql expected
      done()
    socket.on 'begingroup', onBeginGroup
    socket.on 'data', onData
    socket.on 'endgroup', onEndGroup

  receiveAction: (socket, action, check, done) ->
    expected = []
    actionParts = action.split ':'
    expected.push "< #{part}" for part in actionParts
    expected.push 'DATA'
    actionParts.reverse()
    expected.push "> #{part}" for part in actionParts
    @receive socket, expected, check, done

  receivePass: (socket, action, payload, done) ->
    check = (data) ->
      # Strict equality check for passed packets
      chai.expect(data).to.equal payload
    @receiveAction socket, action, check, done
