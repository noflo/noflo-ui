import React from 'react';

function stateToClass(testCase, suite) {
  if (testCase.passed === true) {
    return 'pass';
  }
  if (testCase.passed === false) {
    return 'fail';
  }
  if (testCase.skip || suite.skip) {
    return 'skip';
  }
  return 'pending';
}

function TestStatusDetailed(props) {
  return (
    <ul>
      {
        props.suites.map((suite) => (
          <li className="testsuite">
            <div className="suite-header">
              <label className="name">{suite.name}</label>
              <label className="topic">{suite.topic}</label>
            </div>
            <ul>
              {
                suite.cases.map((testCase) => (
                  <li className={stateToClass(testCase, suite)}>
                    <div className="testcase">
                      <label className="name">{testCase.name}</label>
                      <label className="assertion">{testCase.assertion}</label>
                      <label className="error">{testCase.error || ''}</label>
                    </div>
                  </li>
                ))
              }
            </ul>
          </li>
        ))
      }
    </ul>
  );
}

export default TestStatusDetailed;
