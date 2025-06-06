import { ExecutionContext } from "@bigid/apps-infrastructure-node-js";
import { getBigQueryDSListPaginated, getCatalogFQNEntries, getColumnsFromFQN, getSentivityClassifications} from "./bigidAPI";
import { findOrCreateInArray, getCommaSeparatedStringParameter, getOrCreateMapValue, getTrimmedStringParameter, prettyPrintProcessingBufferWithJSON } from "./utils";
import { BigIDcolumnData, ColumnTag, SensitivityClassification, sensitivityTagPrefix } from "../dto/bigID";
import { BQTableData, ProcessingBuffer } from "../dto/processing";
import { createTaxonomyAndPopulateTags, PolicyTagDefinition } from "./gcpAPI";

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

function saveToProcessingBuffer(buffer:ProcessingBuffer, dataSourceName:string, datasetName:string, tableName:string, columnName:string, sensitivity:string) {

    // Step 1: Get or create BQDatasetData array for the dataSourceName
    const datasetsForSource = getOrCreateMapValue(buffer, dataSourceName, () => []);
    
    // Step 2: Find or create BQDatasetData for the datasetName
    const targetDataset = findOrCreateInArray(
        datasetsForSource,
        ds => ds.name === datasetName,
        () => ({ name: datasetName, tables: new Map<string, BQTableData[]>() })
    );
    
    // Step 3: Get or create BQTableData array for the tableName (as map key)
    const tablesArrayForKey = getOrCreateMapValue(targetDataset.tables, tableName, () => []);
    
    // Step 4: Find or create the specific BQTableData for the tableName (as object name)
    const targetTable = findOrCreateInArray(
        tablesArrayForKey,
        t => t.name === tableName,
        () => ({ name: tableName, columns: [] })
    );
    
    // Step 5: Find or create BQColumnData for the columnName
    const targetColumn = findOrCreateInArray(
        targetTable.columns,
        col => col.name === columnName,
        () => ({ name: columnName, sensitivity: "" }) // Create with a temporary sensitivity
    );
    
    // Step 6: Update the sensitivity for the target column
    targetColumn.sensitivity = sensitivity;
}

async function processBuffer(ctx:ExecutionContext, gcpProject:string, buffer:ProcessingBuffer, sensitivityClassifications:SensitivityClassification[]) {
    console.log(`processing ${gcpProject} hereee`);
    prettyPrintProcessingBufferWithJSON(buffer);

    const region = getTrimmedStringParameter(ctx, "GCP Region");
    for(const sensitivityClassification of sensitivityClassifications ){
        const convertedGCPTags:PolicyTagDefinition[] = [];
        for (const tag of sensitivityClassification.classifications) {
            const gcpTagDefinition:PolicyTagDefinition = { displayName: tag.name };
            convertedGCPTags.push(gcpTagDefinition);
        }
        console.log(`creating taxonomy ${sensitivityClassification.name} in ${gcpProject}`);
        const results = await createTaxonomyAndPopulateTags(gcpProject,region, convertedGCPTags ,sensitivityClassification.name, sensitivityClassification.description )
        console.log(results);
    }

    // For each project
    //Update or create BigID taxonomy in the current project
    //For each FQN
    //update_or_create policy tags
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
                            saveToProcessingBuffer(buffer, ds.name, bigQueryDataset, tableName, column.column_name, tags[0].tagValue);
                        }
                        else {
                            throw new Error('Inconsistency in the catalog query')
                        }
                    }
                }
            }
            await processBuffer(ctx,project,buffer, sensitivityClassifications);
        }

    }
}