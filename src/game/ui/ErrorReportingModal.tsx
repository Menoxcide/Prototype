/**
 * Error Reporting Modal
 * User-facing error reporting UI
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import EnhancedModal from './components/EnhancedModal'
import { errorReporting } from '../utils/errorReporting'

interface ErrorReport {
  id: string
  message: string
  timestamp: number
  stack?: string
  context?: Record<string, any>
}

export default function ErrorReportingModal() {
  const { player } = useGameStore()
  const [isOpen, setIsOpen] = useState(false)
  const [reports, setReports] = useState<ErrorReport[]>([])
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null)

  // Load error reports
  useEffect(() => {
    const stored = localStorage.getItem('errorReports')
    if (stored) {
      try {
        setReports(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to load error reports:', e)
      }
    }
  }, [])

  const handleSendReport = (report: ErrorReport) => {
    errorReporting.reportError({
      message: report.message,
      stack: report.stack,
      context: {
        ...report.context,
        userId: player?.id,
        timestamp: report.timestamp
      }
    })
    
    // Remove from local storage
    const updated = reports.filter(r => r.id !== report.id)
    setReports(updated)
    localStorage.setItem('errorReports', JSON.stringify(updated))
    setSelectedReport(null)
  }

  const handleDeleteReport = (reportId: string) => {
    const updated = reports.filter(r => r.id !== reportId)
    setReports(updated)
    localStorage.setItem('errorReports', JSON.stringify(updated))
    if (selectedReport?.id === reportId) {
      setSelectedReport(null)
    }
  }

  if (!isOpen) return null

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Error Reports"
      size="lg"
    >
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-xl">No error reports</div>
            <div className="text-sm text-gray-500 mt-2">All errors have been reported</div>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reports.map(report => (
                <div
                  key={report.id}
                  className={`bg-gray-800 rounded-lg p-3 cursor-pointer border-2 ${
                    selectedReport?.id === report.id ? 'border-cyan-500' : 'border-transparent'
                  }`}
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-cyan-300 font-bold text-sm">{report.message}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(report.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSendReport(report)
                        }}
                        className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1 rounded"
                      >
                        Send
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteReport(report.id)
                        }}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedReport && (
              <div className="bg-gray-800 rounded-lg p-4 border-2 border-cyan-500">
                <h3 className="text-cyan-400 font-bold mb-2">Error Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="text-gray-400">Message:</div>
                    <div className="text-cyan-300">{selectedReport.message}</div>
                  </div>
                  {selectedReport.stack && (
                    <div>
                      <div className="text-gray-400">Stack Trace:</div>
                      <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto">
                        {selectedReport.stack}
                      </pre>
                    </div>
                  )}
                  {selectedReport.context && (
                    <div>
                      <div className="text-gray-400">Context:</div>
                      <pre className="text-xs text-gray-300 bg-gray-900 p-2 rounded overflow-x-auto">
                        {JSON.stringify(selectedReport.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </EnhancedModal>
  )
}

