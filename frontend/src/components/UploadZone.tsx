import { useCallback, useState } from 'react'
import {
  CircleCheck,
  CircleExclamationPoint,
  CloudUpload,
  FileText,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import type { UploadProgress } from '../types/document'

interface UploadZoneProps {
  progress: UploadProgress | null
  disabled?: boolean
  mockMode: boolean
  onFilesAccepted: (files: File[]) => void
}

export default function UploadZone({
  progress,
  disabled = false,
  mockMode,
  onFilesAccepted,
}: UploadZoneProps) {
  const [error, setError] = useState('')

  const handleDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError('')

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0]
        const isTooLarge = rejection.errors.some(
          (item) => item.code === 'file-too-large',
        )

        setError(
          isTooLarge
            ? 'That file is over the 20 MB limit. Try a smaller document.'
            : 'Choose a PDF, PNG, JPG, or JPEG file.',
        )
        return
      }

      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles)
      }
    },
    [onFilesAccepted],
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop: handleDrop,
      accept: {
        'application/pdf': ['.pdf'],
        'image/png': ['.png'],
        'image/jpeg': ['.jpg', '.jpeg'],
      },
      maxSize: 20 * 1024 * 1024,
      maxFiles: 1,
      multiple: false,
      disabled,
    })

  const dropzoneStyle = isDragReject
    ? 'border-rose-300 bg-rose-50'
    : isDragActive
      ? 'border-blue-400 bg-blue-50'
      : 'border-slate-300 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/50'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Upload a document
            </h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              {mockMode ? 'MOCK MODE' : 'LIVE API'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Drop an invoice or compliance document to begin processing.
          </p>
        </div>

        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 sm:flex">
          <CloudUpload size={19} />
        </div>
      </div>

      <div
        {...getRootProps({
          className:
            'group cursor-pointer rounded-xl border border-dashed p-7 text-center outline-none transition focus-visible:ring-4 focus-visible:ring-blue-100 sm:p-9 ' +
            dropzoneStyle +
            (disabled ? ' cursor-not-allowed opacity-60' : ''),
        })}
      >
        <input {...getInputProps()} />

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200 transition group-hover:-translate-y-0.5">
          {isDragActive ? <CloudUpload size={23} /> : <FileText size={22} />}
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-800">
          {isDragActive
            ? 'Release to add your document'
            : 'Drag and drop a document here'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          or <span className="font-semibold text-blue-700">browse files</span>
        </p>
        <p className="mt-3 text-xs text-slate-400">
          PDF, PNG, JPG, or JPEG · up to 20 MB
        </p>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-rose-700">
          <CircleExclamationPoint size={16} />
          {error}
        </p>
      )}

      {progress && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
              {progress.progress >= 100 ? (
                <CircleCheck size={19} />
              ) : (
                <LoaderCircle size={19} className="animate-spin" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-slate-800">
                  {progress.filename}
                </p>
                <span className="shrink-0 text-xs font-semibold text-blue-700">
                  {progress.progress}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-200"
                  style={{ width: progress.progress + '%' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck size={15} className="text-emerald-600" />
        {mockMode
          ? 'Demo only: files are not sent to AWS yet.'
          : 'Files upload directly to secure S3 storage.'}
      </div>
    </section>
  )
}