import * as React from "react";
import { ISnapshot } from "unmock";
import Call from "./call";

const Calls = ({ snapshots }:
  { assertionResult: jest.AssertionResult,
  snapshots: ISnapshot[] },
) => {
  return (<div className={"calls"}>
    <div className={"calls__title"}>{`${snapshots.length} HTTP request(s)`}</div>
    {snapshots.map((snapshot, i) => (<Call snapshot={snapshot} key={i}/>))}
  </div>);
};

export default Calls;
