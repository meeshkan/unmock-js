import * as React from "react";
import { ISnapshot } from "unmock";

const Request = ({ snapshot, key }: { snapshot: ISnapshot, key: number }) => {
  const request = snapshot.data.req;
  const url = `${request.method.toUpperCase()} ${request.protocol}://${request.host}${request.path}`;
  return (<div className={"call"} key={key}>
    <p>
        {`URL: ${url}`}
    </p>
    </div>);
};

export default Request;
