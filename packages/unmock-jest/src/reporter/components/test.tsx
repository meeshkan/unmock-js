import { map } from "lodash";
import * as React from "react";
import { ISnapshot } from "unmock";

const buildTestTitle = (assertionResult: jest.AssertionResult) =>
  assertionResult.ancestorTitles
    .map(ancestorTitle => `${ancestorTitle} > `)
    .join(" ") + assertionResult.title;

const Test = ({ assertionResult, snapshots }: { assertionResult: jest.AssertionResult, snapshots: ISnapshot[]}) => {
    return (<div className="test">
        {buildTestTitle(assertionResult)}
    </div>);
};

export default Test;
