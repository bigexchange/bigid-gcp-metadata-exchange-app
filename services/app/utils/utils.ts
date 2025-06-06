import { ExecutionContext } from "@bigid/apps-infrastructure-node-js";
import { BigIDParamValue } from '../dto/bigID';
import { ProcessingBuffer } from "../dto/processing";

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

export function findOrCreateInArray<T>(
    array: T[],
    predicate: (item: T) => boolean,
    factory: () => T
): T {
    let item = array.find(predicate);
    if (!item) {
        item = factory();
        array.push(item);
    }
    return item;
}
export function getOrCreateMapValue<K, V>(map: Map<K, V>, key: K, factory: () => V): V {
    if (!map.has(key)) {
        map.set(key, factory());
    }
    return map.get(key)!; // '!' asserts that the value is now present, as we've just set it if it was missing.
}

function jsonReplacer(key: string, value: any): any {
    if (value instanceof Map) {
        return Object.fromEntries(value.entries());
    }
    return value;
}

/**
 * Pretty prints the ProcessingBuffer using JSON.stringify with a custom replacer for Maps.
 * @param buffer The ProcessingBuffer to print.
 * @param title The title to print above the buffer contents.
 * @param indent The number of spaces to use for indentation (passed to JSON.stringify).
 */
export function prettyPrintProcessingBufferWithJSON(
    buffer: ProcessingBuffer,
    indent: number = 2 // Standard 2-space indent for JSON
): void {
    if (buffer.size === 0) {
        console.log("  (empty)");
        return;
    }
    // Using the replacer to handle Maps and the 'indent' argument for pretty printing.
    const jsonString = JSON.stringify(buffer, jsonReplacer, indent);
    console.log(jsonString);
}