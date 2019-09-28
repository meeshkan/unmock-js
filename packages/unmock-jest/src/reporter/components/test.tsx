import * as React from "react";
import stripAnsi from "strip-ansi";
import { ISnapshot } from "unmock";
import { Redactor } from "../types";
import Calls from "./calls";

const buildTestTitle = (assertionResult: jest.AssertionResult) =>
  assertionResult.ancestorTitles
    .map(ancestorTitle => `${ancestorTitle} > `)
    .join(" ") + assertionResult.title;

const TestTitle = ({ assertionResult }: { assertionResult: jest.AssertionResult}) => {
    return (<div className="test__title">
            {buildTestTitle(assertionResult)}
    </div>);
}

const FailureMessage = ({ messages }: { messages: string[] }) => {
    return (<div className={`test__failure-messages`}>
                {`Failure message: ${messages.map((message) => stripAnsi(message)).join(", ")}`}
            </div>) 
}

/**
 * Build Test component
 * @param assertionResult Jest results for the test
 * @param snapshots All unmock snapshots for **this test**
 */
const Test = ({ assertionResult, snapshots, redactor }: { assertionResult: jest.AssertionResult, snapshots: ISnapshot[], redactor: Redactor}) => {

    const failureMessages = assertionResult.failureMessages;

    const statusClass =
        failureMessages.length > 0
        ? "test--failure"
        : "test--success";

    return (
        <div className={`test ${statusClass}`}>
            <TestTitle assertionResult={assertionResult} />
            { failureMessages.length > 0 ?
                <FailureMessage messages={failureMessages} />
                : null }
            <Calls assertionResult={assertionResult} redactor={redactor} snapshots={snapshots}/>
        </div>);
};

export default Test;
