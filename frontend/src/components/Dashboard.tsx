import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CircleExclamationPoint,
  Clock3,
  FileText,
  Search,
  X,
} from 'lucide-react'
import type { DocumentRecord } from '../types/document'

interface DashboardProps {
  documents: DocumentRecord[]
}

type StatusFilter = 'All' | DocumentRecord['status']

const filters: StatusFilter[] = ['All', 'Processing', 'Validated', 'Failed']

function StatusBadge({ status }: { status: DocumentRecord['status'] }) {
  const styles = {
    Processing: {
      className: 'bg-amber-50 text-amber-700 ring-amber-200',
      Icon: Clock3,
    },
    Validated: {
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      Icon: BadgeCheck,
    },
    Failed: {
      className: 'bg-rose-50 text-rose-700 ring-rose-200',
      Icon: CircleExclamationPoint,
    },
  }[status]

  const Icon = styles.Icon

  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ' +
        styles.className
      }
    >
      <Icon size={14} />
      {status}
    </span>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function Dashboard({ documents }: DashboardProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentRecord | null>(null)

  const counts = useMemo(
    () => ({
      total: documents.length,
      validated: documents.filter((doc) => doc.status === 'Validated').length,
      processing: documents.filter((doc) => doc.status === 'Processing').length,
      failed: documents.filter((doc) => doc.status === 'Failed').length,
    }),
    [documents],
  )

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return documents.filter((doc) => {
      const matchesFilename =
        doc.filename.toLowerCase().includes(normalizedQuery)
      const matchesEntity =
        doc.extractedData?.entityName?.toLowerCase().includes(normalizedQuery) ??
        false
      const matchesQuery =
        normalizedQuery.length === 0 || matchesFilename || matchesEntity
      const matchesStatus =
        statusFilter === 'All' || doc.status === statusFilter

      return matchesQuery && matchesStatus
    })
  }, [documents, query, statusFilter])

  const stats = [
    {
      label: 'Documents',
      value: counts.total,
      tone: 'bg-slate-100 text-slate-700',
      Icon: FileText,
    },
    {
      label: 'Validated',
      value: counts.validated,
      tone: 'bg-emerald-50 text-emerald-700',
      Icon: BadgeCheck,
    },
    {
      label: 'Processing',
      value: counts.processing,
      tone: 'bg-amber-50 text-amber-700',
      Icon: Clock3,
    },
    {
      label: 'Failed',
      value: counts.failed,
      tone: 'bg-rose-50 text-rose-700',
      Icon: CircleExclamationPoint,
    },
  ]

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, tone, Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <span
                className={
                  'flex h-9 w-9 items-center justify-center rounded-xl ' + tone
                }
              >
                <Icon size={17} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {value}
            </p>
          </article>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Document history
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review extraction and validation results.
            </p>
          </div>

          <label className="relative block w-full sm:max-w-xs">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </label>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 py-3">
          {filters.map((filter) => {
            const selected = statusFilter === filter

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={
                  'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ' +
                  (selected
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')
                }
              >
                {filter}
              </button>
            )
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Document</th>
                <th className="px-5 py-3">Uploaded</th>
                <th className="px-5 py-3">Entity</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Confidence</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredDocuments.map((doc) => (
                <tr key={doc.documentId} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setSelectedDocument(doc)}
                      className="flex max-w-[280px] items-center gap-3 text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                        <FileText size={17} />
                      </span>
                      <span className="truncate text-sm font-semibold text-slate-800 hover:text-blue-700">
                        {doc.filename}
                      </span>
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                    {formatDate(doc.uploadDate)}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {doc.extractedData?.entityName ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                    {doc.extractedData?.amount ?? '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {doc.extractedData?.confidenceScore !== undefined
                      ? Math.round(doc.extractedData.confidenceScore * 100) + '%'
                      : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={doc.status} />
                  </td>
                </tr>
              ))}

              {filteredDocuments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      No documents found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or status filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDocument && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedDocument(null)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-details-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FileText size={19} />
                </span>
                <div>
                  <h2
                    id="document-details-title"
                    className="break-all text-base font-semibold text-slate-900"
                  >
                    {selectedDocument.filename}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Uploaded {formatDate(selectedDocument.uploadDate)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close document details"
                onClick={() => setSelectedDocument(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5">
              <StatusBadge status={selectedDocument.status} />
            </div>

            {selectedDocument.extractedData && (
              <dl className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs font-medium text-slate-500">Entity</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {selectedDocument.extractedData.entityName ?? '—'}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs font-medium text-slate-500">Amount</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {selectedDocument.extractedData.amount ?? '—'}
                  </dd>
                </div>
                <div className="col-span-2 rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs font-medium text-slate-500">
                    Extraction confidence
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {selectedDocument.extractedData.confidenceScore !== undefined
                      ? Math.round(
                          selectedDocument.extractedData.confidenceScore * 100,
                        ) + '%'
                      : '—'}
                  </dd>
                </div>
              </dl>
            )}

            {selectedDocument.errorMessage && (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <p className="font-semibold">Validation issue</p>
                <p className="mt-1">{selectedDocument.errorMessage}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  )
}