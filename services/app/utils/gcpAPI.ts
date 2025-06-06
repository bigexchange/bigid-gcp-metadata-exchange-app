import { PolicyTagManagerClient, protos } from '@google-cloud/datacatalog';

// Type definitions for clarity and structure

// Represents the structure for defining a policy tag, allowing for nesting.
export interface PolicyTagDefinition {
  displayName: string;
  description?: string;
  children?: PolicyTagDefinition[]; // For nested tags
}

// Represents the result of the combined operation.
interface TaxonomyWithTagsCreationResult {
  taxonomyName?: string;
  taxonomyDisplayName?: string;
  createdPolicyTags: {
    name: string;
    displayName: string;
    parentName: string; // Name of the parent (taxonomy or another policy tag)
  }[];
  errors: string[];
}

// Helper type for the internal policy tag object (from protos)
type IPolicyTag = protos.google.cloud.datacatalog.v1.IPolicyTag;
type ITaxonomy = protos.google.cloud.datacatalog.v1.ITaxonomy;


/**
 * Recursively creates policy tags and their children under a given parent.
 * @param policyTagManagerClient - The PolicyTagManagerClient instance.
 * @param parentResourceName - The resource name of the parent (taxonomy or parent policy tag).
 * @param tagDefinitions - An array of policy tag definitions to create.
 * @param resultAccumulator - The accumulator for results and errors.
 */
async function createPolicyTagsRecursive(
  policyTagManagerClient: PolicyTagManagerClient,
  parentResourceName: string,
  tagDefinitions: PolicyTagDefinition[],
  resultAccumulator: TaxonomyWithTagsCreationResult
): Promise<void> {
  for (const tagDef of tagDefinitions) {
    const policyTagToCreate: Omit<IPolicyTag, 'name' | 'childPolicyTags'> = {
      displayName: tagDef.displayName,
      description: tagDef.description || `Policy tag for ${tagDef.displayName}`,
    };

    try {
      console.log(`Attempting to create policy tag "${tagDef.displayName}" under "${parentResourceName}"...`);
      const [createdPolicyTag] = await policyTagManagerClient.createPolicyTag({
        parent: parentResourceName,
        policyTag: policyTagToCreate,
      });

      if (createdPolicyTag && createdPolicyTag.name && createdPolicyTag.displayName) {
        console.log(`Successfully created policy tag: ${createdPolicyTag.name}`);
        resultAccumulator.createdPolicyTags.push({
          name: createdPolicyTag.name,
          displayName: createdPolicyTag.displayName,
          parentName: parentResourceName,
        });

        // If there are children defined, recursively create them
        if (tagDef.children && tagDef.children.length > 0) {
          await createPolicyTagsRecursive(
            policyTagManagerClient,
            createdPolicyTag.name, // The new parent is the tag just created
            tagDef.children,
            resultAccumulator
          );
        }
      } else {
        const errorMsg = `Policy tag "${tagDef.displayName}" creation reported success under ${parentResourceName}, but critical information (name or displayName) was missing in the response.`;
        console.error(errorMsg);
        resultAccumulator.errors.push(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = `Failed to create policy tag "${tagDef.displayName}" under "${parentResourceName}": ${error.message || String(error)}`;
      console.error(errorMsg);
      resultAccumulator.errors.push(errorMsg);
      // Continue with other sibling tags even if one fails
    }
  }
}

/**
 * Creates a new taxonomy and then populates it with the specified policy tags.
 *
 * @param projectId The Google Cloud project ID.
 * @param location The Google Cloud location (e.g., 'us', 'europe-west1').
 * @param taxonomyDisplayName The display name for the new taxonomy.
 * @param policyTagDefinitions An array of policy tag definitions to create under the taxonomy.
 * @param taxonomyDescription A description for the taxonomy (optional).
 * @returns An object detailing the created resources and any errors.
 */
export async function createTaxonomyAndPopulateTags(
  projectId: string,
  location: string,
  policyTagDefinitions: PolicyTagDefinition[],
  taxonomyDisplayName: string,
  taxonomyDescription?: string
): Promise<TaxonomyWithTagsCreationResult> {
  const policyTagManagerClient = new PolicyTagManagerClient();

  const result: TaxonomyWithTagsCreationResult = {
    createdPolicyTags: [],
    errors: [],
  };
  console.log("in TAXONOMY CREATION");
  // 1. Create the Taxonomy
  console.log(projectId);
  console.log(location);
  const parentLocation = policyTagManagerClient.locationPath(projectId, location);
  console.log("after parnt location");
  console.log(parentLocation);
  const taxonomyToCreate: Omit<ITaxonomy, 'name' | 'policyTagCount' | 'taxonomyTimestamps'> = {
    displayName: taxonomyDisplayName,
    description: taxonomyDescription || `Taxonomy for ${taxonomyDisplayName}`,
    activatedPolicyTypes: [protos.google.cloud.datacatalog.v1.Taxonomy.PolicyType.FINE_GRAINED_ACCESS_CONTROL],
  };

  try {
  console.log("in TAXONOMY CREATION1");
    console.log(`Attempting to create taxonomy "${taxonomyDisplayName}" in project "${projectId}", location "${location}"...`);
    const [createdTaxonomy] = await policyTagManagerClient.createTaxonomy({
      parent: parentLocation,
      taxonomy: taxonomyToCreate,
    });

    if (createdTaxonomy && createdTaxonomy.name && createdTaxonomy.displayName) {
      console.log("in TAXONOMY CREATION2");
      console.log(`Successfully created taxonomy: ${createdTaxonomy.name}`);
      result.taxonomyName = createdTaxonomy.name;
      result.taxonomyDisplayName = createdTaxonomy.displayName;

      // 2. Create Policy Tags under the new taxonomy
      if (policyTagDefinitions && policyTagDefinitions.length > 0) {
        console.log("in TAXONOMY CREATION3");
        await createPolicyTagsRecursive(
          policyTagManagerClient,
          createdTaxonomy.name, // Parent for top-level tags is the taxonomy itself
          policyTagDefinitions,
          result
        );
      }
    } else {
      const errorMsg = `Taxonomy "${taxonomyDisplayName}" creation reported success, but critical information (name or displayName) was missing in the response.`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      // If taxonomy creation effectively failed, don't proceed to create tags
      return result;
    }
  } catch (error: any) {
    const errorMsg = `Failed to create taxonomy "${taxonomyDisplayName}": ${error.message || String(error)}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
    // If taxonomy creation fails, cannot create policy tags
    return result;
  }

  console.log("returning without errors");
  return result;
}

// --- Example Usage (uncomment and replace with your actual values to run) ---
/*
async function main() {
  const projectId = 'your-gcp-project-id'; // 🚨 Replace
  const location = 'us';                   // 🚨 Replace (e.g., 'us', 'europe-west2')
  const myTaxonomyName = 'Customer Data Classification';
  const myTaxonomyDescription = 'Taxonomy for classifying customer-related data assets.';

  const tagsToCreate: PolicyTagDefinition[] = [
    {
      displayName: 'PII',
      description: 'Personally Identifiable Information',
      children: [
        {
          displayName: 'Email Address',
          description: 'Customer and lead email addresses',
        },
        {
          displayName: 'Phone Number',
        },
        {
          displayName: 'Full Name',
          children: [ // Example of deeper nesting
            { displayName: 'First Name' },
            { displayName: 'Last Name' },
          ]
        }
      ],
    },
    {
      displayName: 'Financial Data',
      description: 'Sensitive financial information',
      children: [
        {
          displayName: 'Credit Card Number (Masked)',
          description: 'Masked primary account numbers',
        },
        {
          displayName: 'Bank Account Number (Hashed)',
        },
      ],
    },
    {
      displayName: 'Usage Data',
      description: 'User activity and service usage metrics',
    }
  ];

  if (projectId === 'your-gcp-project-id') {
    console.warn(
      'Please replace the placeholder projectId with your actual Google Cloud Project ID before running.'
    );
    return;
  }

  console.log(`Starting creation of taxonomy "${myTaxonomyName}" with its policy tags...`);
  const creationOutcome = await createTaxonomyAndPopulateTags(
    projectId,
    location,
    myTaxonomyName,
    tagsToCreate,
    myTaxonomyDescription
  );

  console.log('\n--- Creation Summary ---');
  if (creationOutcome.taxonomyName) {
    console.log(`Taxonomy Created: ${creationOutcome.taxonomyDisplayName} (${creationOutcome.taxonomyName})`);
  } else {
    console.log('Taxonomy creation failed or did not return a name.');
  }

  console.log('\nPolicy Tags Created:');
  if (creationOutcome.createdPolicyTags.length > 0) {
    creationOutcome.createdPolicyTags.forEach(tag => {
      console.log(`- ${tag.displayName} (Name: ${tag.name}, Parent: ${tag.parentName})`);
    });
  } else {
    console.log('No policy tags were successfully created (or none were defined).');
  }

  if (creationOutcome.errors.length > 0) {
    console.log('\nErrors Encountered:');
    creationOutcome.errors.forEach(err => console.error(`- ${err}`));
  } else {
    console.log('\nNo errors encountered during the process.');
  }
  console.log('------------------------');
}

main().catch(console.error);
*/
