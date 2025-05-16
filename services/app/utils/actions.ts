import { ExecutionContext } from "@bigid/apps-infrastructure-node-js";
import { getBigQueryDSListPaginated, getCatalogFQNEntries, getSentivityClassifications } from "./bigidAPI";
import { getCommaSeparatedStringParameter, getTrimmedStringParameter } from "./utils";

export async function executeGCPPolicyTagsAction(ctx: ExecutionContext) {
    //Get taxonomy from sensitivity classification API
    const sensitivityClassifications = await getSentivityClassifications(ctx, getTrimmedStringParameter(ctx, 'Sensitivity group name'));
    for (const sensitivityClassification of sensitivityClassifications) {
        console.log(sensitivityClassification.name);
    }
    //Get all BigQuery data sources names with API
    //Only consider data sources under the project filter
    const dsList = await getBigQueryDSListPaginated(ctx, getCommaSeparatedStringParameter(ctx,'Project filter CSV list'));
    console.log(dsList.length);
    const FQNs = await getCatalogFQNEntries(ctx, dsList);
    console.log(FQNs);

    //For each data source
        //List all objects in the catalog with a DS list filter (max 20 data sources (configurable), otherwise do this in multiple chunks)
        // Process the chunk
            //For each object (table), get all columns with sensitivity tags
                //if any collumn matches
                // save data in a buffer (project => FQN => { columnName, Tag value} )
            //Write data into GCP, iterate over buffer
                // For each project
                    //Update or create BigID taxonomy in the current project
                    //For each FQN
                        //update_or_create policy tags
                        //tag table in BigID as GCPmasked


            




}