const { querySelectorDeep } = require('query-selector-shadow-dom');

exports.getDocument = () => document.getElementById('app').contentDocument;

exports.querySelectorDeep = querySelectorDeep;

exports.waitFor = seconds => new Promise((resolve) => {
  setTimeout(resolve, seconds);
});

exports.waitForElement = (selector, ensureNoError = true) => new Promise((resolve, reject) => {
  if (ensureNoError) {
    try {
      exports.assertNoError();
    } catch (e) {
      reject(e);
      return;
    }
  }
  const element = querySelectorDeep(selector, exports.getDocument());
  if (element) {
    resolve(element);
    return;
  }
  exports.waitFor(100)
    .then(() => exports.waitForElement(selector, ensureNoError))
    .then(resolve, reject);
});

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
