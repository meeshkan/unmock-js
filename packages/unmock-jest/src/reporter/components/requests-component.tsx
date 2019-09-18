import * as React from "react";
import { ISnapshot } from "unmock";
import Request from "./request-component";

const Requests = ({ snapshots }:
  { assertionResult: jest.AssertionResult,
  snapshots: ISnapshot[] },
) => {
  return (<div>
    {snapshots.map((snapshot, i) => (<Request snapshot={snapshot} key={i} />))}
  </div>);
};

export default Requests;
