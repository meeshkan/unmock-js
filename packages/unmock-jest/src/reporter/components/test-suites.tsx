import * as React from "react";
import { ITestSuite } from "../types";

const TestResults = ({ testSuites }: { testSuites: ITestSuite[] }): [string, () => React.ReactElement] => {

  const css = `
  #box-1:checked~.test-suite-label-1 {
  background-color: #FF1493;
}

#box-2:checked~.test-suite-label-2 {
  background-color: #FF1493;
}


#box-1:checked~.test-suite-1 {
  display: block;
}

#box-2:checked~.test-suite-2 {
  display: block;
}
`;

  const renderResult = () => (<fieldset>
      <div className="container">
        <input type="radio" id="box-1" className="test-suite-input" name="content" defaultChecked={true} value="box-1" />
        <label htmlFor="box-1" className="test-suite-label test-suite-label-1" id="feature-label">Test suite 1</label>
        <input type="radio" id="box-2" className="test-suite-input" name="content" value="box-2" />
        <label htmlFor="box-2" className="test-suite-label test-suite-label-2" id="feature-label">Test suite 2</label>
        <div className="test-suite test-suite-1"><h1>Results for test suite 1</h1></div>
        <div className="test-suite test-suite-2"><h1>Results for test suite 2</h1></div>
    </div>
    </fieldset>);

  return [css, renderResult];
}

export default TestResults;
