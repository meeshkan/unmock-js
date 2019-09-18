import * as React from "react";
import { ISnapshot } from "unmock";
import Call from "./call";

const Calls = ({ className, snapshots }:
  { assertionResult: jest.AssertionResult,
  snapshots: ISnapshot[], className?: string },
) => {
  return (<div className={className}>
    <div className={"calls__title"}>{`${snapshots.length} HTTP request(s)`}</div>
    {snapshots.map((snapshot, i) => (<Call snapshot={snapshot} key={i}/>))}
  </div>);
};

export default Calls;
