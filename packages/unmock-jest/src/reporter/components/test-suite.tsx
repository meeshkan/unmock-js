import * as React from "react";
import { ITestSuite } from "../types";

const TestSuite = ({ testSuite }: { testSuite: ITestSuite }) => {
    return (<div className="">
        <h1>
            {"Results for: " + testSuite.testFilePath}
        </h1>
    </div>)
}

export default TestSuite;
