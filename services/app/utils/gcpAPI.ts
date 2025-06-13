import { BigQuery, TableField } from '@google-cloud/bigquery';
import { PolicyTagManagerClient, protos } from '@google-cloud/datacatalog';
import { BQColumnData, BQDatasetData } from '../dto/processing'; // Assuming DTO is in this path
import { SensitivityClassification, Classification, sensitivityTagPrefix } from '../dto/bigid'; // Assuming BigID DTOs are here

type ITaxonomy = protos.google.cloud.datacatalog.v1.ITaxonomy;

/**
 * Finds an existing taxonomy by display name or creates a new one in a specific location.
 */
async function findOrCreateTaxonomy(
  client: PolicyTagManagerClient,
  parentLocation: string,
  displayName: string,
  description?: string
): Promise<ITaxonomy | undefined> {
  for await (const tax of client.listTaxonomiesAsync({ parent: parentLocation })) {
    if (tax.displayName === displayName) {
      console.log(`Found existing taxonomy in ${parentLocation}: ${tax.name}`);
      return tax;
    }
  }
  console.log(`No existing taxonomy in ${parentLocation}. Creating a new one...`);
  const [createdTaxonomy] = await client.createTaxonomy({
    parent: parentLocation,
    taxonomy: {
      displayName,
      description,
      activatedPolicyTypes: [protos.google.cloud.datacatalog.v1.Taxonomy.PolicyType.FINE_GRAINED_ACCESS_CONTROL],
    },
  });
  return createdTaxonomy;
}

/**
 * Gets or creates policy tags based on a BigID classification array within a specific taxonomy.
 */
async function getOrCreatePolicyTagsFromBigID(
  client: PolicyTagManagerClient,
  parentName: string,
  classifications: Classification[],
  tagMap: Map<string, string>
): Promise<void> {
  const existingTags = new Map<string, string>();
  for await (const tag of client.listPolicyTagsAsync({ parent: parentName })) {
    if (tag.displayName && tag.name) existingTags.set(tag.displayName, tag.name);
  }

  for (const classification of classifications) {
    let tagResourceName = existingTags.get(classification.name);
    if (!tagResourceName) {
      console.log(`Creating new tag: "${classification.name}" under ${parentName}`);
      try {
        const [createdTag] = await client.createPolicyTag({
          parent: parentName,
          policyTag: { displayName: classification.name },
        });
        if(createdTag.name) {
          tagResourceName = createdTag.name;
        }
        else {
          console.error(`Failed to create tag "${classification.name}":  no name ppty in created tag`);
          continue;
        }

      } catch (error: any) {
        console.error(`Failed to create tag "${classification.name}": ${error.message}`);
        continue;
      }
    }
    if (tagResourceName) {
        tagMap.set(classification.name, tagResourceName);
    }
  }
}

/**
 * UPDATED: Sets up the required data governance structure across multiple regions.
 * @param projectId - The Google Cloud project ID.
 * @param regions - A list of locations where governance should be established.
 * @param bigIdDefinitions - A list of BigID SensitivityClassification objects.
 * @returns A nested Map from location to a map of taxonomy display names to a map of policy tag display names.
 */
async function getOrCreateGovernanceMap(
  projectId: string,
  regions: string[],
  bigIdDefinitions: SensitivityClassification[]
): Promise<Map<string, Map<string, Map<string, string>>>> {
  const client = new PolicyTagManagerClient();
  const governanceMap = new Map<string, Map<string, Map<string, string>>>();

  console.log(`--- Starting governance setup for ${regions.length} region(s) ---`);
  for (const location of regions) {
      console.log(`\nProcessing setup for location: ${location}`);
      const parentLocation = client.locationPath(projectId, location);
      const locationMap = new Map<string, Map<string, string>>();
      try {
        for (const definition of bigIdDefinitions) {
            const taxonomy = await findOrCreateTaxonomy(client, parentLocation, definition.name, definition.description);
            if (taxonomy?.name) {
                const innerTagMap = new Map<string, string>();
                if (definition.classifications?.length) {
                    await getOrCreatePolicyTagsFromBigID(client, taxonomy.name, definition.classifications, innerTagMap);
                }
                locationMap.set(definition.name, innerTagMap);
            }
        }
        governanceMap.set(location, locationMap);
      } catch (error: any) {
        console.error(`Failed during governance setup in ${location}: ${error.message}`);
        // Continue to next region even if one fails
      }
  }
  return governanceMap;
}

/**
 * Assigns policy tags to a single BigQuery table's columns.
 */
async function assignPolicyTagsToTable(
  projectId: string,
  datasetId: string,
  tableId: string,
  columnsToTag: BQColumnData[],
  governanceMapForLocation: Map<string, Map<string, string>>
): Promise<{ success: boolean; errors: string[] }> {
  const bigquery = new BigQuery({ projectId });
  const table = bigquery.dataset(datasetId).table(tableId);
  const errors: string[] = [];
  let schemaChanged = false;

  try {
    console.log(`\nUpdating schema for table: ${projectId}.${datasetId}.${tableId}`);
    const [metadata] = await table.getMetadata();
    const newSchema: TableField[] = JSON.parse(JSON.stringify(metadata.schema.fields));

    newSchema.forEach(field => {
      const columnInfo = columnsToTag.find(c => c.name === field.name);
      if (!columnInfo?.sensitivity.length) return;

      const newPolicyTagNames = new Set<string>();
      for (const sensitivityPair of columnInfo.sensitivity) {
        let { key: taxonomyName, value: sensitivityName } = sensitivityPair;
        taxonomyName = taxonomyName.replace(sensitivityTagPrefix, '');
        const policyTagName = governanceMapForLocation.get(taxonomyName)?.get(sensitivityName);
        if (policyTagName) {
          newPolicyTagNames.add(policyTagName);
        } else {
          errors.push(`Column "${field.name}": Policy tag for "${sensitivityName}" in taxonomy "${taxonomyName}" not found in the governance map for this region.`);
        }
      }

      const existingTags = new Set(field.policyTags?.names ?? []);
      const tagsAreEqual = newPolicyTagNames.size === existingTags.size && 
                           [...newPolicyTagNames].every(tag => existingTags.has(tag));

      if (!tagsAreEqual) {
        field.policyTags = { names: Array.from(newPolicyTagNames) };
        schemaChanged = true;
        console.log(`Applying ${newPolicyTagNames.size} tags to column "${field.name}".`);
      }
    });

    if (errors.length > 0) {
      console.error('Errors encountered, aborting schema update for this table.');
      return { success: false, errors };
    }

    if (schemaChanged) {
      await table.setMetadata({ schema: { fields: newSchema } });
      console.log(`Successfully updated schema for table ${tableId}.`);
    } else {
      console.log(`No schema changes were necessary for table ${tableId}.`);
    }
    
    return { success: true, errors: [] };
  } catch (error: any) {
    console.error(`Failed to update table ${tableId}:`, error.message);
    return { success: false, errors: [`API Error on table ${tableId}: ${error.message}`] };
  }
}

/**
 * Main orchestrator to apply data governance policies.
 */
export async function applyGovernanceToProject(
  projectId: string,
  datasetsToProcess: BQDatasetData[],
  bigIdDefinitions: SensitivityClassification[]
): Promise<void> {
  // First, setup governance in all required regions
  const allRegions = new Set<string>();
  const bigquery = new BigQuery({ projectId });
  for (const datasetData of datasetsToProcess) {
      const [dataset] = await bigquery.dataset(datasetData.datasetName).get();
      if(dataset.metadata.location) allRegions.add(dataset.metadata.location.toLowerCase());
  }
  console.log(allRegions);
  const governanceMap = await getOrCreateGovernanceMap(projectId, Array.from(allRegions), bigIdDefinitions);

  console.log('\n--- Starting Governance Application Process ---');
  for (const datasetData of datasetsToProcess) {
    try {
      const { datasetName, tables } = datasetData;
      const [dataset] = await bigquery.dataset(datasetData.datasetName).get();
      const location = dataset.metadata.location.toLowerCase();

      if (!location) {
          console.error(`Could not determine location for dataset ${datasetName}. Skipping.`);
          continue;
      }
      
      console.log(`\nProcessing dataset: ${datasetName} in location: ${location}`);
      const governanceMapForLocation = governanceMap.get(location);

      if(!governanceMapForLocation) {
          console.error(`No governance map found for location ${location}. Skipping dataset.`);
          continue;
      }

      for (const tableData of tables) {
        const { success, errors} = await assignPolicyTagsToTable(
          projectId,
          datasetName,
          tableData.tableName,
          tableData.columns,
          governanceMapForLocation
        );
        if(!success) {
          console.log(errors);
        }
      }
    } catch (error: any) {
        console.error(`An error occurred while processing dataset ${datasetData.datasetName}: ${error.message}`);
    }
  }
}
