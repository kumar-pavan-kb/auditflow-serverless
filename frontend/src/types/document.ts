export interface DocumentRecord {
  documentId: string
  filename: string
  uploadDate: string
  status: 'Processing' | 'Validated' | 'Failed'
  extractedData?: {
    amount?: string
    entityName?: string
    confidenceScore?: number
  }
  errorMessage?: string
}

export interface UploadProgress {
  filename: string
  progress: number
}