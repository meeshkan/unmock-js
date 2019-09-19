import { map } from "lodash";
import * as os from "os";
import * as React from "react";
import { ITestSuite } from "../types";
import TestSuite from "./test-suite";

const testFileToId = (file: string) => file.replace(/[\/|\\|\.]/g, "-");  // TODO Use path.sep?

const TestResults = ({ testSuites }: { testSuites: ITestSuite[] }): [string, () => React.ReactElement] => {

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
            <div className={`test-suite test-suite-${id}`} key={`div-${id}`}><TestSuite testSuite={testSuite} /></div>,
            elementCss,
        ];
    });

    const inputs = map(elementsAndCss, (element) => element[0]);
    const labels = map(elementsAndCss, (element) => element[1]);
    const divs = map(elementsAndCss, (element) => element[2]);
    const css = map(elementsAndCss, (element) => element[3]);

  const renderResult = () => (<fieldset>
      <div className="test-results-container">
        {...inputs}
        {...labels}
        {...divs}
    </div>
    </fieldset>);

  return [css.join(os.EOL), renderResult];
}

export default TestResults;
