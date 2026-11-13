import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  Bell,
  ChevronDown,
  CircleCheck,
  CircleExclamationPoint,
  Clock3,
  FileCheck,
  Files,
  LayoutDashboard,
  Menu,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react'
import Dashboard from './components/Dashboard'
import UploadZone from './components/UploadZone'
import { mockDocuments } from './data/mockDocuments'
import {
  getDocumentStatus,
  isApiConfigured,
  listDocuments,
  requestPresignedUpload,
  uploadFileToS3,
} from './services/auditflowApi'
import type {
  DocumentRecord,
  UploadProgress,
} from './types/document'

type SectionId = 'overview' | 'documents' | 'validation'

const mockMode = !isApiConfigured

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

async function pollDocumentStatus(documentId: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await getDocumentStatus(documentId)
    if (result.status !== 'Processing') return result
    await wait(3000)
  }
  return null
}

function App() {
  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    mockMode ? mockDocuments : [],
  )
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgress | null>(null)
  const [apiMessage, setApiMessage] = useState('')
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (mockMode) return

    let active = true
    listDocuments()
      .then((records) => {
        if (active) setDocuments(records)
      })
      .catch((error: unknown) => {
        if (active) {
          setApiMessage('Could not load document history: ' + errorMessage(error))
        }
      })

    return () => {
      active = false
    }
  }, [])

  const navigateTo = useCallback((section: SectionId) => {
    setActiveSection(section)
    setMobileNavOpen(false)
    setNotificationsOpen(false)
    setAccountOpen(false)
    document.getElementById(section)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [])

  const handleFilesAccepted = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return

    setApiMessage('')
    const temporaryId = 'local_' + Date.now()
    const initialRecord: DocumentRecord = {
      documentId: temporaryId,
      filename: file.name,
      uploadDate: new Date().toISOString(),
      status: 'Processing',
    }

    setDocuments((current) => [initialRecord, ...current])
    setUploadProgress({ filename: file.name, progress: 0 })

    if (mockMode) {
      for (let percent = 10; percent <= 100; percent += 10) {
        await wait(120)
        setUploadProgress({ filename: file.name, progress: percent })
      }
      await wait(350)

      const entityName = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')

      setDocuments((current) =>
        current.map((doc) =>
          doc.documentId === temporaryId
            ? {
                ...doc,
                status: 'Validated',
                extractedData: {
                  amount: '$2,840.00',
                  entityName,
                  confidenceScore: 0.94,
                },
              }
            : doc,
        ),
      )
      setUploadProgress(null)
      return
    }

    let documentId = temporaryId
    try {
      const presigned = await requestPresignedUpload(file)
      documentId = presigned.documentId

      setDocuments((current) =>
        current.map((doc) =>
          doc.documentId === temporaryId ? { ...doc, documentId } : doc,
        ),
      )

      await uploadFileToS3(file, presigned.uploadUrl, (progress) => {
        setUploadProgress({ filename: file.name, progress })
      })
    } catch (error) {
      setUploadProgress(null)
      setDocuments((current) =>
        current.map((doc) =>
          doc.documentId === documentId
            ? {
                ...doc,
                status: 'Failed',
                errorMessage: errorMessage(error),
              }
            : doc,
        ),
      )
      return
    }

    setUploadProgress(null)
    try {
      const result = await pollDocumentStatus(documentId)
      if (!result) {
        setApiMessage(
          'The document is still processing. Its status remains Processing.',
        )
        return
      }

      setDocuments((current) =>
        current.map((doc) =>
          doc.documentId === documentId
            ? {
                ...doc,
                status: result.status,
                extractedData: result.extractedData,
                errorMessage: result.errorMessage,
              }
            : doc,
        ),
      )
    } catch (error) {
      setApiMessage(
        'The file uploaded, but checking its processing status failed: ' +
          errorMessage(error),
      )
    }
  }, [])

  const notificationCount = documents.filter(
    (doc) => doc.status === 'Processing' || doc.status === 'Failed',
  ).length

  const navItems = [
    { id: 'overview' as const, label: 'Overview', Icon: LayoutDashboard },
    { id: 'documents' as const, label: 'Documents', Icon: Files },
    { id: 'validation' as const, label: 'Validation', Icon: FileCheck },
  ]

  const renderNav = () => (
    <nav className="space-y-1 px-3" aria-label="Main navigation">
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Analyze
      </p>
      {navItems.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => navigateTo(id)}
          aria-current={activeSection === id ? 'page' : undefined}
          className={
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ' +
            (activeSection === id
              ? 'bg-blue-50 font-semibold text-blue-800'
              : 'text-slate-600 hover:bg-slate-50')
          }
        >
          <Icon size={17} />
          {label}
        </button>
      ))}
    </nav>
  )

  const activityDocuments = documents.slice(0, 5)

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <button
          type="button"
          onClick={() => navigateTo('overview')}
          className="flex h-16 items-center gap-3 border-b border-slate-100 px-6 text-left"
          aria-label="Go to AuditFlow overview"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
            <ShieldCheck size={19} />
          </span>
          <span className="text-sm font-bold tracking-tight text-slate-900">
            AuditFlow
          </span>
          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
            SF
          </span>
        </button>

        <div className="px-4 pt-6">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-800">Acme Finance</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Demo workspace</p>
          </div>
        </div>

        <div className="mt-7">{renderNav()}</div>

        <div className="mt-auto border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Settings2 size={17} />
            Settings
          </button>
          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            className="mt-3 flex w-full items-center gap-3 rounded-xl bg-slate-50 p-3 text-left hover:bg-slate-100"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
              AF
            </span>
            <span>
              <span className="block text-xs font-semibold text-slate-800">
                AuditFlow Demo
              </span>
              <span className="block text-[11px] text-slate-500">
                Frontend preview
              </span>
            </span>
            <ChevronDown size={15} className="ml-auto text-slate-400" />
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              {mobileNavOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-800">Acme Finance</span>
              <span>/</span>
              <span>{navItems.find((item) => item.id === activeSection)?.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:inline-flex">
              <span
                className={
                  'h-1.5 w-1.5 rounded-full ' +
                  (mockMode ? 'bg-violet-500' : 'bg-emerald-500')
                }
              />
              {mockMode ? 'Mock mode' : 'Live API mode'}
            </span>

            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((open) => !open)
                  setAccountOpen(false)
                }}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <Bell size={18} />
                {notificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                    {notificationCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-40 w-[min(340px,90vw)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Recent activity
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Updates from this workspace
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                    {activityDocuments.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                        No document activity yet.
                      </p>
                    ) : (
                      activityDocuments.map((doc) => (
                        <button
                          key={doc.documentId}
                          type="button"
                          onClick={() => navigateTo('documents')}
                          className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-slate-50"
                        >
                          <span className="mt-0.5 text-slate-500">
                            {doc.status === 'Validated' ? (
                              <CircleCheck size={17} className="text-emerald-600" />
                            ) : doc.status === 'Failed' ? (
                              <CircleExclamationPoint size={17} className="text-rose-600" />
                            ) : (
                              <Clock3 size={17} className="text-amber-600" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-slate-800">
                              {doc.filename}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {doc.status === 'Validated'
                                ? 'Validation complete'
                                : doc.status === 'Failed'
                                  ? doc.errorMessage || 'Needs review'
                                  : 'Processing in progress'}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateTo('documents')}
                    className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    View document history
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                aria-label="Open demo account menu"
                aria-expanded={accountOpen}
                onClick={() => {
                  setAccountOpen((open) => !open)
                  setNotificationsOpen(false)
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 hover:ring-4 hover:ring-blue-50"
              >
                A
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-12 z-40 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="flex items-center gap-3 border-b border-slate-100 p-2 pb-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                      A
                    </span>
                    <span>
                      <span className="block text-xs font-semibold text-slate-800">
                        AuditFlow Demo
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        Preview account
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false)
                      setSettingsOpen(true)
                    }}
                    className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Settings2 size={15} />
                    Workspace settings
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {mobileNavOpen && (
          <div className="fixed inset-x-0 top-16 z-20 border-b border-slate-200 bg-white p-3 shadow-lg lg:hidden">
            {renderNav()}
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false)
                setSettingsOpen(true)
              }}
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <Settings2 size={17} />
              Settings
            </button>
          </div>
        )}

        <main className="mx-auto max-w-7xl space-y-7 p-5 sm:p-8">
          <section id="overview" className="scroll-mt-24">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                  <Activity size={14} />
                  Serverless document intelligence
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Audit overview
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Extract key fields, validate business rules, and review every
                  document in one place.
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Frontend demo · AWS integration in progress
              </p>
            </div>
          </section>

          {apiMessage && (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              {apiMessage}
            </div>
          )}

          <UploadZone
            progress={uploadProgress}
            disabled={Boolean(uploadProgress)}
            mockMode={mockMode}
            onFilesAccepted={handleFilesAccepted}
          />

          <div id="documents" className="scroll-mt-24">
            <Dashboard documents={documents} />
          </div>

          <section
            id="validation"
            className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Validation overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review the current outcome for every document.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                  {documents.filter((doc) => doc.status === 'Validated').length} validated
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                  {documents.filter((doc) => doc.status === 'Processing').length} processing
                </span>
                <span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-700">
                  {documents.filter((doc) => doc.status === 'Failed').length} failed
                </span>
              </div>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {documents.length === 0 ? (
                <p className="py-5 text-sm text-slate-500">
                  Upload a document to see its validation result here.
                </p>
              ) : (
                documents.slice(0, 5).map((doc) => (
                  <div
                    key={doc.documentId}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="truncate text-sm font-medium text-slate-700">
                      {doc.filename}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {doc.status === 'Validated' ? (
                        <CircleCheck size={15} className="text-emerald-600" />
                      ) : doc.status === 'Failed' ? (
                        <CircleExclamationPoint size={15} className="text-rose-600" />
                      ) : (
                        <Clock3 size={15} className="text-amber-600" />
                      )}
                      {doc.errorMessage || doc.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <p className="pb-2 text-center text-xs text-slate-400">
            {mockMode
              ? 'Uploads and extraction results are simulated in this preview.'
              : 'Document status and extraction results are loaded from the AuditFlow API.'}
          </p>
        </main>
      </div>

      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="settings-title" className="text-lg font-semibold text-slate-900">
                  Workspace settings
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current frontend and upload configuration.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close settings"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <dl className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <dt className="text-sm text-slate-500">Workspace</dt>
                <dd className="text-sm font-semibold text-slate-800">Acme Finance</dd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <dt className="text-sm text-slate-500">Processing mode</dt>
                <dd className="text-sm font-semibold text-slate-800">
                  {mockMode ? 'Mock preview' : 'Live API'}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <dt className="text-sm text-slate-500">Accepted files</dt>
                <dd className="text-sm font-semibold text-slate-800">PDF, PNG, JPG</dd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <dt className="text-sm text-slate-500">Maximum file size</dt>
                <dd className="text-sm font-semibold text-slate-800">20 MB</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Done
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
