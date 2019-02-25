const { querySelectorDeep } = require('query-selector-shadow-dom');

exports.getDocument = () => document.getElementById('app').contentDocument;

exports.waitFor = seconds => new Promise((resolve) => {
  setTimeout(resolve, seconds);
});

exports.waitForElement = (selector, ensureNoError = true, container = null) => new Promise(
  (resolve, reject) => {
    const parentElement = container || exports.getDocument();
    if (ensureNoError) {
      try {
        exports.assertNoError();
      } catch (e) {
        reject(e);
        return;
      }
    }
    const element = querySelectorDeep(selector, parentElement);
    if (element) {
      resolve(element);
      return;
    }
    exports.waitFor(100)
      .then(() => exports.waitForElement(selector, ensureNoError, parentElement))
      .then(resolve, reject);
  },
);

exports.assertNoError = () => {
  const alertDialog = querySelectorDeep('noflo-ui noflo-alert', exports.getDocument());
  if (!alertDialog.classList.contains('show')) {
    return;
  }
  if (!alertDialog.classList.contains('error')) {
    return;
  }
  const alertContents = querySelectorDeep('noflo-ui noflo-alert slot span', exports.getDocument());
  throw new Error(alertContents.innerHTML);
};
