chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('../index.html', {
    id: 'noflo-ui',
    bounds: {
      width: Math.round(window.screen.availWidth * 0.8),
      height: Math.round(window.screen.availHeight * 0.8)
    }
  });
});
