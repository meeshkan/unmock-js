import { ISnapshot } from "unmock";

export interface IJestData {
  aggregatedResult: jest.AggregatedResult;
}

export interface IReportInput {
  jestData: IJestData;
  snapshots: ISnapshot[];
}
