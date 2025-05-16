jest.mock("../utils/actions");
jest.mock("log4js");

import { fakeExecutionContextTestAction, fakeExecutionContextBadAction } from "../static/example_responses";
import { executionController } from "../controllers/executeController";
import { mockResponse } from "../static/example_responses";
import { executeTestAction } from "../utils/actions";
import { ActionResponseDetails, StatusEnum } from "@bigid/apps-infrastructure-node-js";
import { getLogger } from "log4js";

let mockedExecuteTestAction = executeTestAction as jest.Mock;
let mockedGetLogger = getLogger as jest.Mock;
let mockedLoggerError = jest.fn();

mockedGetLogger.mockReturnValue({error: mockedLoggerError});

describe("Testing Execute Controller...", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test("Testing \"Test Action\"", async () => {
        const executionContext = fakeExecutionContextTestAction;
        await executionController.executeAction(executionContext, mockResponse());
        expect(mockedExecuteTestAction).toHaveBeenCalledTimes(1);
    });
    test("Testing made up action", async () => {
        let res = mockResponse();
        const executionContext = fakeExecutionContextBadAction;
        await executionController.executeAction(executionContext, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(new ActionResponseDetails("1111", StatusEnum.ERROR, 0, "Got unresolved action = foo"));
    });
    test("Testing error", async () => {
        let res = mockResponse();
        let fakeError = new Error("erm what the Σ");
        let failSpy = jest.spyOn(executionController, "generateFailedResponse");
        mockedExecuteTestAction.mockImplementationOnce(executionContext => {throw fakeError});
        const executionContext = fakeExecutionContextTestAction;
        await executionController.executeAction(executionContext, res);
        expect(mockedGetLogger).toHaveBeenCalledTimes(1);
        expect(mockedLoggerError).toHaveBeenCalledWith(fakeError);
        expect(failSpy).toHaveBeenCalledWith(res, executionContext.executionId, fakeError.message);
    });
    test("Testing error with bad message", async () => {
        let res = mockResponse();
        let fakeError = "erm what the Σ";
        let failSpy = jest.spyOn(executionController, "generateFailedResponse");
        mockedExecuteTestAction.mockImplementationOnce(executionContext => {throw fakeError});
        const executionContext = fakeExecutionContextTestAction;
        await executionController.executeAction(executionContext, res);
        expect(mockedGetLogger).toHaveBeenCalledTimes(1);
        expect(mockedLoggerError).toHaveBeenCalledWith(fakeError);
        expect(failSpy).toHaveBeenCalledWith(res, executionContext.executionId, "unknown error");
    });
});