import * as React from "react";
import { ITestSuite } from "../types";

const Summary = ({ testSuite }: { testSuite: ITestSuite }) => {
    const numPassingTests = testSuite.suiteResults.numPassingTests;
    const numFailingTests = testSuite.suiteResults.numFailingTests;
    const nSnapshots = testSuite.snapshots.length;
    return (<div className="test-suite__title">
        <div className="test-suite__title-filename">
            {testSuite.testFilePath}
        </div>
        <div className="test-suite__title-summary">
            {`Passing: ${numPassingTests}, failing: ${numFailingTests}, HTTP calls: ${nSnapshots}`}
        </div>
    </div>)
};

const TestSuite = ({ testSuite }: { testSuite: ITestSuite }) => {
    return (<div className="">
            <Summary testSuite={testSuite}/>
    </div>)
}

export default TestSuite;
