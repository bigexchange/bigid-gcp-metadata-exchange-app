export interface BQColumnData {
    name: string,
    sensitivity: string
}
export interface BQTableData {
    name: string,
    columns: BQColumnData[]
}

export interface BQDatasetData {
    name: string,
    tables: Map<string, BQTableData[]>
}

export type ProcessingBuffer = Map<string,BQDatasetData[]>;