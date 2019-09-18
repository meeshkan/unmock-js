import * as React from "react";
import { ISnapshot, UnmockRequest, UnmockResponse } from "unmock";

const Request = ({ request }: { request: UnmockRequest}) => {
  const url = `${request.method.toUpperCase()} ${request.protocol}://${request.host}${request.path}`;
  return (<div className={"call__request"}>
    <p>
        {`URL: ${url}`}
    </p>
  </div>)
}

const Response = ({ response }: { response: UnmockResponse }) => {
  return (<div className={"call__response"}>
    <p>
        {`Status: ${response.statusCode}`}
    </p>
  </div>)
}

const Call = ({ snapshot, key }: { snapshot: ISnapshot, key: number }) => {
  return (<div className={"call"} key={key}>
    <Request request={snapshot.data.req} />
    { snapshot.data.res ? <Response response={snapshot.data.res} /> : <div>No response</div>}
    </div>);
};

export default Call;
