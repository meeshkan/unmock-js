import * as React from "react";
import { ISnapshot, UnmockRequest, UnmockResponse } from "unmock";

const Request = ({ request }: { request: UnmockRequest}) => {
  const operation = `${request.method.toUpperCase()} ${request.protocol}://${request.host}${request.path}`;
  return (<div className={"call__request"}>
    <div className={"call__request-title"}>Request</div>
    <p>
        {`Operation: ${operation}`}
    </p>
    <p>
        {`Hostname: ${request.host}`}
    </p>
  </div>)
}

const Response = ({ response }: { response: UnmockResponse }) => {
  return (<div className={"call__response"}>
    <div className={"call__response-title"}>Response</div>
    <p>
        {`Status: ${response.statusCode}`}
    </p>
    <p>
      {`Body: ${JSON.stringify(response.body)}`}
    </p>
  </div>)
}

const Call = ({ snapshot }: { snapshot: ISnapshot }) => {
  return (<div className={"call"}>
    <Request request={snapshot.data.req} />
    { snapshot.data.res ? <Response response={snapshot.data.res} /> : <div>No response</div>}
    </div>);
};

export default Call;
