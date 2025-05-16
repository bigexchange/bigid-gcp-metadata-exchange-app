import { ExecutionContext } from "@bigid/apps-infrastructure-node-js";
import { Response } from "express";

/**
 * A mock executionContext for testing.
 */
export const fakeExecutionContextTestAction: ExecutionContext = {
    "actionName": "Test Action",
    "executionId": "1111",
    "globalParams": [{
        "paramName": "EXAMPLE_PARAM",
        "paramValue": "woloz"
    }],
    "actionParams": [{
        "paramName": "Sample Selection Parameter",
        "paramValue": "True"
    },
    {
        "paramName": "Sample Input Parameter",
        "paramValue": "woloz"
    }],
    "bigidToken": "3333",
    "bigidBaseUrl": "https://bigidapi/api/v1/",
    "tpaId": "4444"
} as any as ExecutionContext;

export const fakeExecutionContextBadAction: ExecutionContext = {
    "actionName": "foo",
    "executionId": "1111",
    "globalParams": [{
        "paramName": "EXAMPLE_PARAM",
        "paramValue": "woloz"
    }],
    "actionParams": [{
        "paramName": "Sample Selection Parameter",
        "paramValue": "True"
    },
    {
        "paramName": "Sample Input Parameter",
        "paramValue": "woloz"
    }],
    "bigidToken": "3333",
    "bigidBaseUrl": "https://bigidapi/api/v1/",
    "tpaId": "4444"
} as any as ExecutionContext;

export const mockResponse = () => {
    const res = {} as Response;
    // replace the following () => res
    // with your function stub/mock of choice
    // making sure they still return `res`
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn();
    return res;
};