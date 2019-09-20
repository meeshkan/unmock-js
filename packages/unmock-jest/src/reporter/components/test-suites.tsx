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

    const elementsAndCss = testSuites.map((testSuite, index) => {
        const id = testFileToId(testSuite.testFilePath);
        const elementCss = `#box-${id}:checked~.test-suite-label-${id} {
    opacity: 1;
    }

    /* Display test suite when corresponding box is checked */
    #box-${id}:checked~.test-suite-${id} {
    display: block;
    }
`;

        const numPassingTests = testSuite.suiteResults.numPassingTests;
        const numFailingTests = testSuite.suiteResults.numFailingTests;
        const nSnapshots = testSuite.snapshots.length;

        const testSuiteLabelColor = testSuite.suiteResults.numFailingTests > 0 ? `test-suite-label--failure` : `test-suite-label--success`;
        return {
            input: <input type="radio" id={`box-${id}`} className="test-suite-input" name="content" defaultChecked={index === 0} value={`box-${id}`} key={`input-${id}`} />,
            label: <label htmlFor={`box-${id}`} className={`test-suite-label test-suite-label-${id} ${testSuiteLabelColor}`} id="feature-label" key={`label-${id}`}>
                <span className="test-suite-label__filename">{testSuite.testFilePath}</span>
                <span className="test-suite-label__summary">{`Passing: ${numPassingTests}, failing: ${numFailingTests}, HTTP calls: ${nSnapshots}`}</span>
            </label>,
            testSuite: <div className={`test-suite test-suite-${id}`} key={`div-${id}`}><TestSuite testSuite={testSuite} /></div>,
            css: elementCss
        };
    });

    const inputs = elementsAndCss.map(val => val.input);
    const labels = elementsAndCss.map(val => val.label);
    const testSuiteComponents = elementsAndCss.map(val => val.testSuite);
    const css = elementsAndCss.map(val => val.css);

  const renderResult = () => (<fieldset>
      <div className="test-results-container">
        {...inputs}
        {...labels}
        {...testSuiteComponents}
    </div>
    </fieldset>);

  return [css.join(os.EOL), renderResult];
}

export default TestResults;
