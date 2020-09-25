import React from 'react';

function TestStatus(props) {
  const state = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };
  props.suites.forEach((suite) => {
    suite.cases.forEach((testCase) => {
      state.total += 1;
      if (suite.skip || testCase.skip) {
        state.skipped += 1;
        return;
      }
      if (testCase.passed === true) {
        state.passed += 1;
      }
      if (testCase.passed === false) {
        state.failed += 1;
      }
    });
  });
  return (
    <ul className="test-status">
      <li className="pass">{state.passed}</li>
      <li className="fail">{state.failed}</li>
      <li className="skip">{state.skipped}</li>
      <li className="total">{state.total}</li>
    </ul>
  );
}

export default TestStatus;
