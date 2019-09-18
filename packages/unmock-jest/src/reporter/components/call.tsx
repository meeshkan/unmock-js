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
    <p>
        {`Path: ${request.path}`}
    </p>
    <p>
        {`Protocol: ${request.protocol}`}
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
      {`Body:`}
      <div className={"call__response-body"}>
        <textarea rows={5} className={"call__response-body-area"} readOnly value={response.body} />
      </div>
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
