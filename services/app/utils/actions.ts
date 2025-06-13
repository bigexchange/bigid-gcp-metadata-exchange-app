import { ExecutionContext } from "@bigid/apps-infrastructure-node-js";
import { getBigQueryDSListPaginated, getCatalogFQNEntries, getColumnsFromFQN, getSentivityClassifications} from "./bigidAPI";
import { findOrCreateInArray, getCommaSeparatedStringParameter, getOrCreateMapValue, getTrimmedStringParameter, prettyPrintProcessingBufferWithJSON } from "./utils";
import { BigIDcolumnData, ColumnTag, SensitivityClassification, sensitivityTagPrefix } from "../dto/bigid";
import { ProcessingBuffer } from "../dto/processing";
import { applyGovernanceToProject} from "./gcpAPI";

function getOnlySensitivityTags(columnEntry:BigIDcolumnData, sensitivityClassifications: SensitivityClassification[]): ColumnTag[] {
    const results: ColumnTag[] = [];
    const SensClassSet = new Set(sensitivityClassifications.map( item => sensitivityTagPrefix + item.name));
    for (const tag of columnEntry.tags) {
        if(SensClassSet.has(tag.tagName)) {
            results.push(tag)
        }
    }
    return results;
}

function saveToProcessingBuffer(buffer:ProcessingBuffer, dataSourceName:string, datasetName:string, tableName:string, columnName:string, sensitivityKey:string, sensitivityValue: string) {

    // Step 1: Get or create BQDatasetData array for the dataSourceName
    const datasetsForSource = getOrCreateMapValue(buffer, dataSourceName, () => []);
    
    // Step 2: Find or create BQDatasetData for the datasetName
    const targetDataset = findOrCreateInArray(
        datasetsForSource,
        ds => ds.datasetName === datasetName,
        () => ({ datasetName: datasetName, tables: [] })
    );
    
    // Step 3: Find or create the specific BQTableData for the tableName (as object name)
    const targetTable = findOrCreateInArray(
        targetDataset.tables,
        t => t.tableName === tableName,
        () => ({ tableName: tableName, columns: [] })
    );
    
    // Step 4: Find or create BQColumnData for the columnName
    const targetColumn = findOrCreateInArray(
        targetTable.columns,
        col => col.name === columnName,
        () => ({ name: columnName, sensitivity: [] }) // Create with a temporary sensitivity
    );
    
    // Step 5: Update the sensitivity for the target column
    targetColumn.sensitivity.push({ 'key': sensitivityKey, 'value': sensitivityValue});
}

async function processBuffer(ctx:ExecutionContext, gcpProject:string, buffer:ProcessingBuffer, sensitivityClassifications:SensitivityClassification[]) {
    prettyPrintProcessingBufferWithJSON(buffer);
    for(const [dsname, data] of buffer.entries()){
        console.log(`tagging bigid datasource: ${dsname}`)
        applyGovernanceToProject(gcpProject, data, sensitivityClassifications);
    }
    //tag table in BigID as GCPmasked
}


export async function executeGCPPolicyTagsAction(ctx: ExecutionContext) {
    //Get taxonomy from sensitivity classification API
    const sensitivityClassifications = await getSentivityClassifications(ctx, getTrimmedStringParameter(ctx, 'Sensitivity group name'));
    for (const sensitivityClassification of sensitivityClassifications) {
        console.log(sensitivityClassification.name);
    }
    //Get all BigQuery data sources names with API
    //Only consider data sources under the project filter
    const dsList = await getBigQueryDSListPaginated(ctx, getCommaSeparatedStringParameter(ctx,'Project filter CSV list'));
    const dsListPerProject = Map.groupBy(dsList, ( (entry) => entry.project_id ))
    for (const [project, projectDsList] of dsListPerProject) {
        //for each project
        while (projectDsList.length > 0) {
            const buffer:ProcessingBuffer = new Map();
            const dsListPage = projectDsList.splice(0, 2);
            //List all objects in the catalog with a DS list filter (max 20 data sources (configurable), otherwise do this in multiple chunks)
            const FQNs = await getCatalogFQNEntries(ctx, dsListPage);
            for (const fqn of FQNs) {
                //For each entry in the catalog, get the columns details with tags
                const rawColumnData = await getColumnsFromFQN(ctx, fqn);
                for(const column of rawColumnData){
                    //get all tags related to sensitivity classification
                    const tags = getOnlySensitivityTags(column, sensitivityClassifications);
                    if(tags.length > 0) {
                        const [dataSourceName, bigQueryDataset, tableName] = fqn.split('.');
                        const ds = dsListPage.find(ds=> ds.name == dataSourceName);
                        if(ds !== undefined) {
                            saveToProcessingBuffer(buffer, ds.name, bigQueryDataset, tableName, column.column_name, tags[0].tagName, tags[0].tagValue);
                        }
                        else {
                            throw new Error('Inconsistency in the catalog query')
                        }
                    }
                }
            }
            if(buffer.size) {
              await processBuffer(ctx,project,buffer, sensitivityClassifications);
            }
        }

    }
}