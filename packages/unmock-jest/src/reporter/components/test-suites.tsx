import { map } from "lodash";
import * as os from "os";
import * as path from "path";
import * as React from "react";
import { ITestSuite } from "../types";

const TestResults = ({ testSuites }: { testSuites: ITestSuite[] }): [string, () => React.ReactElement] => {

    const testFileToId = (file: string) => file.replace(/[\/|\.]/g, "-");  // TODO Use path.sep

    const elementsAndCss = map(testSuites, (testSuite) => {
        const id = testFileToId(testSuite.testFilePath);
        const elementCss = `#box-${id}:checked~.test-suite-label-${id} {
    background-color: #FF1493;
    }

    #box-${id}:checked~.test-suite-${id} {
    display: block;
    }
`;
        return [
            <input type="radio" id={`box-${id}`} className="test-suite-input" name="content" defaultChecked={true} value={`box-${id}`} key={`input-${id}`} />,
            <label htmlFor={`box-${id}`} className={`test-suite-label test-suite-label-${id}`} id="feature-label" key={`label-${id}`}>{testSuite.testFilePath}</label>,
            <div className={`test-suite test-suite-${id}`} key={`div-${id}`}><h1>{testSuite.testFilePath}</h1></div>,
            elementCss,
        ];
    });

    const inputs = map(elementsAndCss, (element) => element[0]);
    const labels = map(elementsAndCss, (element) => element[1]);
    const divs = map(elementsAndCss, (element) => element[2]);
    const css = map(elementsAndCss, (element) => element[3]);

  const renderResult = () => (<fieldset>
      <div className="container">
        {/*<input type="radio" id="box-1" className="test-suite-input" name="content" defaultChecked={true} value="box-1" />
        <input type="radio" id="box-2" className="test-suite-input" name="content" value="box-2" />
        <label htmlFor="box-1" className="test-suite-label test-suite-label-1" id="feature-label">Test suite 1</label>
        <label htmlFor="box-2" className="test-suite-label test-suite-label-2" id="feature-label">Test suite 2</label>
        <div className="test-suite test-suite-1"><h1>Results for test suite 1</h1></div>
  <div className="test-suite test-suite-2"><h1>Results for test suite 2</h1></div>*/}
        {...inputs}
        {...labels}
        {...divs}
    </div>
    </fieldset>);

  return [css.join(os.EOL), renderResult];
}

export default TestResults;
