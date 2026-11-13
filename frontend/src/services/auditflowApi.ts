import type { DocumentRecord } from '../types/document'

const API_BASE_URL = (import.meta.env.VITE_AUDITFLOW_API_URL ?? '')
  .trim()
  .replace(/\/+$/, '')

export const isApiConfigured = API_BASE_URL.length > 0

export interface PresignedUploadResponse {
  documentId: string
  uploadUrl: string
}

export interface DocumentStatusResponse {
  status: DocumentRecord['status']
  extractedData?: DocumentRecord['extractedData']
  errorMessage?: string
}

function requireApiUrl() {
  if (!API_BASE_URL) {
    throw new Error('Add the API Gateway URL to frontend/.env.local first.')
  }

  return API_BASE_URL
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(requireApiUrl() + path, options)
  const responseText = await response.text()

  let responseBody: unknown = {}

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText)
    } catch {
      responseBody = { message: responseText }
    }
  }

  if (!response.ok) {
    let message = 'Request failed with status ' + response.status

    if (
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'message' in responseBody &&
      typeof responseBody.message === 'string'
    ) {
      message = responseBody.message
    }

    throw new Error(message)
  }

  return responseBody as T
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const result = await requestJson<{ documents: DocumentRecord[] }>(
    '/documents',
  )

  return result.documents
}

export async function requestPresignedUpload(
  file: File,
): Promise<PresignedUploadResponse> {
  const contentType = file.type || 'application/octet-stream'

  const result = await requestJson<PresignedUploadResponse>(
    '/documents/presign',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        contentType,
      }),
    },
  )

  if (!result.documentId || !result.uploadUrl) {
    throw new Error('The presign response needs documentId and uploadUrl.')
  }

  return result
}

export function uploadFileToS3(
  file: File,
  uploadUrl: string,
  onProgress: (progress: number) => void,
): Promise<void> {
  const contentType = file.type || 'application/octet-stream'

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.open('PUT', uploadUrl)
    request.setRequestHeader('Content-Type', contentType)

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100)
        resolve()
      } else {
        reject(
          new Error(
            'S3 upload failed with status ' +
              request.status +
              '. Check the presigned URL and S3 CORS settings.',
          ),
        )
      }
    }

    request.onerror = () => {
      reject(new Error('Could not reach S3. Check the bucket CORS settings.'))
    }

    request.send(file)
  })
}

export function getDocumentStatus(
  documentId: string,
): Promise<DocumentStatusResponse> {
  return requestJson<DocumentStatusResponse>(
    '/documents/' + encodeURIComponent(documentId),
  )
}