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
    { request.body? (<p>
      {`Body:`}
      <div className={"call__request-body"}>
        <Body contents={typeof request.body === "object" ? JSON.stringify(request.body) : request.body || ""} />
      </div>
    </p>): undefined }
  </div>)
}

const Body = ({ contents }: { contents: string}) => {
  return <textarea rows={5} className={"call__body"} readOnly value={contents} />;
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
        <Body contents={response.body || ""} />
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
