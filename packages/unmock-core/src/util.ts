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

export const getAtLevel = (
  nestedObj: any,
  level: number,
  filterCb?: (key: string, value: any) => boolean,
) => {
  /** Returns all nested objects at a certain level from nestedObj with additional
   * filtering based on key and value from callback. Filtering only applies at the requested level.
   * `level` is 0-based.
   */
  if (level < 0) {
    throw new Error(`Not sure what should I find at nested level ${level}...`);
  }
  if (nestedObj === undefined || Object.keys(nestedObj).length === 0) {
    throw new Error(
      `Empty 'nestedObj' received - ${JSON.stringify(nestedObj)}`,
    );
  }
  let i = 0;
  let subObjects: any[] = [];
  let prevObjects: any[] = [nestedObj];
  while (i < level) {
    prevObjects.forEach(o => {
      if (typeof o === "object") {
        Object.values(o).forEach(v => subObjects.push(v));
      }
    });
    prevObjects = subObjects;
    subObjects = [];
    i++;
  }
  prevObjects.forEach(o => {
    if (typeof o === "object") {
      Object.keys(o).forEach(k => {
        if (filterCb === undefined || filterCb(k, o[k])) {
          subObjects.push({ [k]: o[k] });
        }
      });
    }
  });
  return subObjects;
};
