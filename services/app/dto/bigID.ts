export interface BigIDActionRequest {

    /**
     * The name of the action that is being requested from your application.
     *
     * @type {string}
     * @memberof BigIDActionRequest
     */
    actionName: string;

    /**
     * The unique ID of this particular execution of the action.
     *
     * @type {string}
     * @memberof BigIDActionRequest
     */
    executionId: string;

    /**
     * Parameters that are sent to all actions from BigID.
     * The values for these parameters are configured in BigID.
     * @type {BigIDParamValue[]}
     * @memberof BigIDActionRequest
     */
    globalParams: BigIDParamValue[];

    /**
     * Parameters that are sent to this action. 
     * The values for these parameters are configured in BigID.
     * @type {BigIDParamValue[]}
     * @memberof BigIDActionRequest
     */
    actionParams: BigIDParamValue[];

    /**
     * The API token you send to BigID in the authorization header to authenticate yourself.
     *
     * @type {string}
     * @memberof BigIDActionRequest
     */
    bigidToken: string;

    /**
     * The URL to update BigID as to the progress of your application by sending a PUT
     * request with a {BigIDActionStatusMessage}
     *
     * @type {string}
     * @memberof BigIDActionRequest
     */
    updateResultCallback: string;


    /**
     * The base URL of the BigID API that called this action.
     *
     * @type {string}
     * @memberof BigIDActionRequest
     */
    bigidBaseUrl: string;

    /**
     * The unique id of this action on this particular installation of BigID.
     * This WILL reset if the app is removed.
     *
     * @type {string}
     * @memberof BigIDActionRequest
     */
    tpaId: string;
}

export interface BigIDParamValue {
    paramName: string;
    /**
     *
     *
     * @type {string}
     * @memberof BigIDParamValue
     */
    paramValue: string;
}
export const sensitivityTagPrefix = 'system.sensitivityClassification.'

interface Classification {
    name: string;
    priority: number;
    query: string;
    levelId: string;
    queryObj?: object; // This property is optional as it doesn't appear in all classification objects
}
  
interface ActionStatus {
    status: string;
}
  
interface ColumnTagging {
    isActive: boolean;
    shouldPropagateToObject: boolean;
}
  
export interface SensitivityClassification{
    classifications: Classification[];
    description: string;
    name: string;
    status: string;
    createdAt: string; // Consider using Date type if you parse the string
    modifiedAt: string; // Consider using Date type if you parse the string
    actionId: string;
    actionStatus: ActionStatus;
    lastSuccess: string; // Consider using Date type if you parse the string
    columnTagging: ColumnTagging;
    dsTagging: boolean;
    updated_at: string; // Consider using Date type if you parse the string
    defaultSc: boolean;
    id: string;
    progress: string;
}

export interface BigQueryConnection {
    name: string;
    project_id: string;
    cloudIdentifier?:string;
}

export interface ColumnTag {
    tagId: string,
    valueId: string,
    tagName: string,
    tagValue: string,
    properties?: {
        applicationType?: string,
        hidden?: boolean
    }
}

export interface BigIDcolumnData {
    column_name: string,
    fieldType: string,
    isPrimary: boolean,
    attribute_list: any[],
    tags: ColumnTag[],
}
