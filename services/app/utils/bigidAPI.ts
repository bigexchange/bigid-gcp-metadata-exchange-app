import { executeHttpGet, ExecutionContext } from "@bigid/apps-infrastructure-node-js";
import {AxiosResponse} from 'axios';
import { URLSearchParams } from "url";
import { BigQueryConnection, SensitivityClassification } from "../dto/bigID";
import { executeHttpPost } from "@bigid/apps-infrastructure-node-js/lib/services";


/* currently returns only 1 group, but could return more with a different kind of filtering */
export async function getSentivityClassifications(ctx: ExecutionContext, sensitivityGroupName:string) : Promise<SensitivityClassification[]> {
    const results:SensitivityClassification[] = [];
    const endpointName = 'aci/sc/configs';
    const searchParams = new URLSearchParams();
    searchParams.append('skip', '0');
    searchParams.append('limit', '10');
    searchParams.append('requireTotalCount', 'true');
    const filter = [
            { 
                "field" : "name",
                "value" : sensitivityGroupName,
                "operator" : "contains"
            }
        ]
    searchParams.append('filter', JSON.stringify(filter));
    const endpoint = endpointName + '?' + searchParams.toString();
    const sensitivityList: AxiosResponse = await executeHttpGet(ctx, endpoint);
    if (sensitivityList.status === 200) {
        const data = sensitivityList.data.data;
        const dataKey = 'scConfigs';
        if(data.totalCount === 0) {
            throw new Error(`Did not find sensitivity classification "${sensitivityGroupName}"`);
        }
        if( !(dataKey in data)) {
            console.log(data);
            throw new Error(`API incomaptibility on endpoint response ${endpointName}`);
        }

        for (const entry of data[dataKey]) {
            if(entry.name === sensitivityGroupName){
                // this is the Sentivity classification we are looking for
                if(entry.columnTagging.isActive === false) {
                    throw new Error(`Collumn tagging on sensitivity classification group ${sensitivityGroupName} is not enabled`)
                }
                results.push(entry);
            }
        }
    }
    else {
        console.log(sensitivityList.data);
        throw new Error(`Failed to fetch list of classification groups with filter on name "${sensitivityGroupName}"`);
    }
    return results;
}


export async function getBigQueryDSListPaginated(ctx: ExecutionContext, projectNameList: string[]): Promise<BigQueryConnection[]> {
    const response:BigQueryConnection[] = []
    const limit = 100; //TODO get env
    let remaining = true;
    let offset = 0;
    while(remaining) {
        remaining = false;
        const page = await getBigQueryDSListPage(ctx, projectNameList, offset, limit);
        response.push(...page);
        if(page.length === limit) {
            remaining = true;
            offset += limit;
        }
    }
    return response;
}

async function getBigQueryDSListPage(ctx: ExecutionContext, projectNameList: string[], offset: number, limit:number): Promise<BigQueryConnection[]> {
    const response:BigQueryConnection[] = []
    const endpoint = 'ds-connections';
    const body = {
        'query': {
            "requireTotalCount": true,
            "skip": offset,
            "offset": offset,
            "limit": limit,
            "filter": [
                {
                    "field": "type",
                    "value": [
                        "gcp-big-query"
                    ],
                    "operator": "in"
                },
            ],
            "grouping": [],
            "fields": [
                "name",
                'project_id',
                'cloudIdentifier'
            ]
        }
    };
    console.log(projectNameList);
    if(projectNameList.length > 0) {
        body.query.filter.push(
                {
                    "field": "project_id",
                    "value": projectNameList,
                    "operator": "in"
                }
        )
    }
    const dsList = await executeHttpPost(ctx,endpoint,body);
    if(dsList.status === 200) {
        const data = dsList.data.data;
        response.push(...data.ds_connections);
    }
    return response;
}

export async function getCatalogFQNEntries(ctx: ExecutionContext, ds_connections: BigQueryConnection[]) {
    const results:string[] = [];
    const endpoint = 'data-catalog';
    const systemList =  ds_connections.map(obj => `"${obj.name}"`).join(',')
    const body = {
        offset : 0,
        skip: 0,
        limit : 200,
        requireTotalCount: false,
        filter: `system in (${systemList})`
    }
    const catalogResponse:AxiosResponse = await executeHttpPost(ctx, endpoint, body);
    if(catalogResponse.status === 200 ) {
        const data = catalogResponse.data;
        console.log(data);
        for (const entry of data.results){
            results.push(entry.fullyQualifiedName);
        }
    }
    else {
        throw new Error(`Failed to request the catalog with the following query parameters ${body}`);
    }
    return results;
}

export async function getColumnsFromFQN(ctx:ExecutionContext, fqn:string){
    const endpoint = 'data-catalog/object-details/columns';
    const params = new URLSearchParams();
    params.append('limit','100');
    params.append('object_name',fqn);
    params.append('grouping','');
    params.append('filter','');
    const url = endpoint + '?' + params.toString();
    const columnResponse:AxiosResponse = await executeHttpGet(ctx, url);
    if (columnResponse.status === 200) {
        console.log(columnResponse.data);
    }
    else {
        //let's skip it for now
    }

}