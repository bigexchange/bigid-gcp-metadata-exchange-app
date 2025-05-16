import { ExecutionContext } from "@bigid/apps-infrastructure-node-js";
import { BigIDParamValue } from '../dto/bigID';

export function getTrimmedStringParameter(executionContext: ExecutionContext, paramName: string): string {
    return getStringParameter(executionContext, paramName).trim();
}

export function getStringParameter(executionContext: ExecutionContext, paramName: string): string {
    const value = _getParamValue(executionContext, paramName);
    return value != undefined ? value : "";
}
export function getCommaSeparatedStringParameter(executionContext: ExecutionContext, paramName: string): string[] {
    const strValue = getStringParameter(executionContext, paramName);
    if( strValue.length === 0) return [];
    return strValue.split(',').map(item => item.trim());
}

function _getParamValue(executionContext: ExecutionContext, paramName: string): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parameter = (executionContext.actionParams as any as Array<BigIDParamValue>).find(p => p.paramName == paramName);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalParameter = (executionContext.globalParams as any as Array<BigIDParamValue>).find(p => p.paramName == paramName);
    if(parameter) return parameter.paramValue;
    if(globalParameter) return globalParameter.paramValue;
    return undefined;
}