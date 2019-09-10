interface IReporterInput {
  data: any;
}

const ReportGenerator = (config: any) => {
  console.log("Generating report!"); // tslint:disable-line:no-console
  return {
    asTestResultsProcessor(_: IReporterInput) {
      return undefined;
    },
    asTestReporter(_: IReporterInput) {
      return undefined;
    },
  };
};

export default ReportGenerator;
