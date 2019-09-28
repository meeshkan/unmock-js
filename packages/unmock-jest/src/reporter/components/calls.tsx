import * as React from "react";
import { ISnapshot } from "unmock";
import { Redactor } from "../types";
import Call from "./call";

const Calls = ({ snapshots, redactor }:
  { assertionResult: jest.AssertionResult,
    redactor: Redactor,
  snapshots: ISnapshot[] },
) => {
  return (<div className={"calls"}>
    <div className={"calls__title"}>{`${snapshots.length} HTTP request(s)`}</div>
    {snapshots.map((snapshot, i) => (<Call snapshot={snapshot} redactor={redactor} key={i}/>))}
  </div>);
};

export default Calls;
