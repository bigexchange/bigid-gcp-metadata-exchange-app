// jest.mock("../utils/actions");

import { fakeExecutionContextTestAction } from "../static/example_responses";
import { executeTestAction } from "../utils/actions";

// let mockedExecuteTestAction = executeTestAction as jest.Mock;

describe("Testing actions...", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test("Testing \"Test Action\"", async () => {
        const executionContext = fakeExecutionContextTestAction;
        const logSpy = jest.spyOn(console, "log").mockImplementation();
        await executeTestAction(executionContext);
        expect(logSpy).toHaveBeenCalledWith("Test Action was called from a BigID server! Our ExecutionContext is {\"actionName\":\"Test Action\",\"executionId\":\"1111\",\"globalParams\":[{\"paramName\":\"EXAMPLE_PARAM\",\"paramValue\":\"woloz\"}],\"actionParams\":[{\"paramName\":\"Sample Selection Parameter\",\"paramValue\":\"True\"},{\"paramName\":\"Sample Input Parameter\",\"paramValue\":\"woloz\"}],\"bigidToken\":\"3333\",\"bigidBaseUrl\":\"https://bigidapi/api/v1/\",\"tpaId\":\"4444\"}");
    });
});