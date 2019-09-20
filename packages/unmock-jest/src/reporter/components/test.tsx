import { map } from "lodash";
import * as React from "react";
import stripAnsi from "strip-ansi";
import { ISnapshot } from "unmock";

const buildTestTitle = (assertionResult: jest.AssertionResult) =>
  assertionResult.ancestorTitles
    .map(ancestorTitle => `${ancestorTitle} > `)
    .join(" ") + assertionResult.title;

const FailureMessage = ({ messages }: { messages: string[] }) => {
    return (<div className={`test__failure-messages`}>
                {`Failure message: ${messages.map((message) => stripAnsi(message)).join(", ")}`}
            </div>) 
}

const Test = ({ assertionResult, snapshots }: { assertionResult: jest.AssertionResult, snapshots: ISnapshot[]}) => {

    const failureMessages = assertionResult.failureMessages;

    const statusClass =
        failureMessages.length > 0
        ? "test--failure"
        : "test--success";

    return (<div className={`test ${statusClass}`}>
        <div className="test__title">
            {buildTestTitle(assertionResult)}
        </div>
        { failureMessages.length > 0 ? 
            <FailureMessage messages={failureMessages} />
            : null }
    </div>);
};

export default Test;
