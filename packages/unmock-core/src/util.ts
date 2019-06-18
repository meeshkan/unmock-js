import { IMetaData, IRequestData, IResponseData } from "./interfaces";
import { UnmockOptions } from "./options";

export const doUsefulStuffWithRequestAndResponse = (
  opts: UnmockOptions,
  metaData: IMetaData,
  requestData: IRequestData,
  responseData: IResponseData,
) => {
  const { logger } = opts;
  logger.log(
    `We will do amazing things with ${metaData} ${requestData} and ${responseData}.`,
  );
};
