import * as React from "react";
import { ITestSuite } from "../types";
import Test from "./test";

const Summary = ({ testSuite }: { testSuite: ITestSuite }) => {
    const numPassingTests = testSuite.suiteResults.numPassingTests;
    const numFailingTests = testSuite.suiteResults.numFailingTests;
    const nSnapshots = testSuite.snapshots.length;
    return (<div className="test-suite__title">
        <div className="test-suite__title-filename">
            {testSuite.shortFilePath}
        </div>
        <div className="test-suite__title-summary">
            {`Passing: ${numPassingTests}, failing: ${numFailingTests}, HTTP calls: ${nSnapshots}`}
        </div>
    </div>)
};

const TestSuite = ({ testSuite }: { testSuite: ITestSuite }) => {

    const testElements = testSuite.suiteResults.testResults.map(
        (assertionResult: jest.AssertionResult) => {
            const snapshotsForTest = testSuite.snapshots.filter(
                snapshot => snapshot.currentTestName === assertionResult.fullName,
            );
            return <Test assertionResult={assertionResult} snapshots={snapshotsForTest} key={assertionResult.fullName}/>
        },
  );

    return (<div className="">
            <Summary testSuite={testSuite}/>
            {...testElements}
    </div>)
}

export default TestSuite;
