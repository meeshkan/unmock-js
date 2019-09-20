import { map } from "lodash";
import * as os from "os";
import * as React from "react";
import { ITestSuite } from "../types";
import TestSuite from "./test-suite";

const testFileToId = (file: string) => file.replace(/[\/|\\|\.]/g, "-");  // TODO Use path.sep?

/**
 * Not actually a React component but something that returns dynamically generated CSS and a React component
 * @returns Tuple where the first element is CSS string, second is a React component for rendering the test results.
 */
const TestResults = ({ testSuites }: { testSuites: ITestSuite[] }): [string, () => React.ReactElement] => {

    const elementsAndCss = map(testSuites, (testSuite, index) => {
        const id = testFileToId(testSuite.testFilePath);
        const elementCss = `#box-${id}:checked~.test-suite-label-${id} {
    filter: brightness(85%);
    }

    /* Display test suite when corresponding box is checked */
    #box-${id}:checked~.test-suite-${id} {
    display: block;
    }
`;
        const testSuiteLabelColor = testSuite.suiteResults.numFailingTests > 0 ? `test-suite-label--failure` : `test-suite-label--success`;
        return [
            <input type="radio" id={`box-${id}`} className="test-suite-input" name="content" defaultChecked={index === 0} value={`box-${id}`} key={`input-${id}`} />,
            <label htmlFor={`box-${id}`} className={`test-suite-label test-suite-label-${id} ${testSuiteLabelColor}`} id="feature-label" key={`label-${id}`}>{testSuite.testFilePath}</label>,
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
