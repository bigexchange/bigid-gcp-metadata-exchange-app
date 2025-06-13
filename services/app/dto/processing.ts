export interface SensitivityClassificationKeyValuePair {
    key: string,
    value: string
}

export interface BQColumnData {
    name: string,
    sensitivity: SensitivityClassificationKeyValuePair[]
}
export interface BQTableData {
    tableName: string,
    columns: BQColumnData[]
}

export interface BQDatasetData {
    datasetName: string,
    tables: BQTableData[]
}

export type ProcessingBuffer = Map<string,BQDatasetData[]>;