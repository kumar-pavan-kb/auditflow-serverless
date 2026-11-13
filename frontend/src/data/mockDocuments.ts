import type { DocumentRecord } from '../types/document'

export const mockDocuments: DocumentRecord[] = [
  {
    documentId: 'doc_101',
    filename: 'Q3_Invoice_Acme.pdf',
    uploadDate: new Date().toISOString(),
    status: 'Validated',
    extractedData: {
      amount: '$4,500.00',
      entityName: 'Acme Corp',
      confidenceScore: 0.98,
    },
  },
  {
    documentId: 'doc_102',
    filename: 'Compliance_Form_B.pdf',
    uploadDate: new Date().toISOString(),
    status: 'Processing',
  },
  {
    documentId: 'doc_103',
    filename: 'tax_summary_missing_fields.png',
    uploadDate: new Date().toISOString(),
    status: 'Failed',
    errorMessage: 'Missing required field: amount',
  },
]