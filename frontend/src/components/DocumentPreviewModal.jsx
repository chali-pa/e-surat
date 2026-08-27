import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import api from '../api/axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export default function DocumentPreviewModal({ show, onClose, surat, apiEndpoint, autoPrint = false }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fileKind, setFileKind] = useState(null) // 'pdf' | 'excel' | 'word' | 'image' | 'unsupported'
  const [blobUrl, setBlobUrl] = useState(null)
  
  // Excel state
  const [excelSheets, setExcelSheets] = useState([])
  const [activeSheet, setActiveSheet] = useState('')
  const [sheetData, setSheetData] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  // Word state
  const [wordHtml, setWordHtml] = useState('')

  // Image state
  const [zoomLevel, setZoomLevel] = useState(1)
  const [rotation, setRotation] = useState(0)

  const printTableRef = useRef(null)
  const autoPrintedRef = useRef(false)
  const closeButtonRef = useRef(null)
  const previousActiveElementRef = useRef(null)

  useEffect(() => {
    if (!show || !surat) {
      cleanup()
      return
    }

    autoPrintedRef.current = false
    loadFile()

    return () => cleanup()
  }, [show, surat, apiEndpoint])

  useEffect(() => {
    if (show) {
      previousActiveElementRef.current = document.activeElement
      document.body.classList.add('overflow-hidden')
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 50)
    } else {
      document.body.classList.remove('overflow-hidden')
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus()
      }
    }
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [show])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (show && e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [show, onClose])

  useEffect(() => {
    if (!loading && !error && autoPrint && !autoPrintedRef.current) {
      autoPrintedRef.current = true
      setTimeout(() => {
        handlePrint()
      }, 400)
    }
  }, [loading, error, autoPrint])

  const cleanup = () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }
    const iframe = document.getElementById('print-iframe')
    if (iframe) {
      document.body.removeChild(iframe)
    }
    setLoading(true)
    setError(null)
    setFileKind(null)
    setExcelSheets([])
    setActiveSheet('')
    setSheetData({})
    setSearchQuery('')
    setWordHtml('')
    setZoomLevel(1)
    setRotation(0)
    autoPrintedRef.current = false
  }

  const loadFile = async () => {
    setLoading(true)
    setError(null)

    try {
      // Determine file extension hint
      const pathHint = (surat.file_path || '').toLowerCase()
      const nameHint = (surat.nama_surat || '').toLowerCase()
      const combinedHint = `${pathHint} ${nameHint}`

      // Fetch file binary arraybuffer with auth header
      const endpoint = apiEndpoint || `/api/surat/${surat.id}/file`
      const response = await api.get(endpoint, {
        responseType: 'arraybuffer',
      })

      const contentType = (response.headers['content-type'] || '').toLowerCase()

      // Detect type
      let detectedKind = 'pdf'

      if (
        contentType.includes('spreadsheet') ||
        contentType.includes('excel') ||
        contentType.includes('csv') ||
        combinedHint.includes('.xlsx') ||
        combinedHint.includes('.xls') ||
        combinedHint.includes('.csv') ||
        combinedHint.includes('/excel/')
      ) {
        detectedKind = 'excel'
      } else if (
        contentType.includes('wordprocessingml') ||
        contentType.includes('msword') ||
        combinedHint.includes('.docx') ||
        combinedHint.includes('.doc')
      ) {
        detectedKind = 'word'
      } else if (
        contentType.startsWith('image/') ||
        combinedHint.includes('.jpg') ||
        combinedHint.includes('.jpeg') ||
        combinedHint.includes('.png') ||
        combinedHint.includes('.webp') ||
        combinedHint.includes('/photos/')
      ) {
        detectedKind = 'image'
      } else if (
        contentType.includes('pdf') ||
        combinedHint.includes('.pdf') ||
        combinedHint.includes('/pdf/')
      ) {
        detectedKind = 'pdf'
      }

      setFileKind(detectedKind)

      if (detectedKind === 'pdf') {
        const pdfBlob = new Blob([response.data], { type: 'application/pdf' })
        const url = URL.createObjectURL(pdfBlob)
        setBlobUrl(url)
      } else if (detectedKind === 'image') {
        const imgMime = contentType.startsWith('image/') ? contentType : 'image/png'
        const imgBlob = new Blob([response.data], { type: imgMime })
        const url = URL.createObjectURL(imgBlob)
        setBlobUrl(url)
      } else if (detectedKind === 'excel') {
        try {
          const workbook = XLSX.read(response.data, { type: 'array' })
          const sheets = workbook.SheetNames || []
          setExcelSheets(sheets)
          
          const parsedData = {}
          sheets.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName]
            // Convert to 2D array matrix with empty cells preserved
            const jsonMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
            parsedData[sheetName] = jsonMatrix
          })
          
          setSheetData(parsedData)
          if (sheets.length > 0) {
            setActiveSheet(sheets[0])
          }
        } catch (excelErr) {
          console.error('Failed to parse Excel file:', excelErr)
          setError({ type: 'GENERAL', message: 'Gagal membaca isi berkas spreadsheet.' })
        }
      } else if (detectedKind === 'word') {
        try {
          const res = await mammoth.convertToHtml({ arrayBuffer: response.data })
          setWordHtml(res.value || '<p>Dokumen kosong.</p>')
        } catch (wordErr) {
          console.error('Failed to parse Word document:', wordErr)
          setError({ type: 'GENERAL', message: 'Gagal membaca isi berkas dokumen Word.' })
        }
      }
    } catch (err) {
      console.error('Document preview load error:', err)
      let errorMessage = 'Gagal mengambil file preview dari server.'
      let isGoogleReconnect = false
      let errorCode = null

      if (err.response?.data) {
        try {
          let text = ''
          if (err.response.data instanceof ArrayBuffer) {
            text = new TextDecoder().decode(err.response.data)
          } else if (typeof err.response.data === 'string') {
            text = err.response.data
          } else {
            text = JSON.stringify(err.response.data)
          }
          const parsed = JSON.parse(text)
          errorCode = parsed.error_code
          
          if (errorCode === 'GOOGLE_RECONNECT_REQUIRED' || err.response.status === 401) {
            isGoogleReconnect = true
            errorMessage = parsed.message || 'Koneksi Google perlu diperbarui.'
          } else if (errorCode === 'FILE_NOT_FOUND_IN_DRIVE') {
            errorMessage = 'File tidak ditemukan di Google Drive.'
          } else if (errorCode === 'PERMISSION_DENIED') {
            errorMessage = 'Akun Google yang terhubung tidak memiliki izin untuk mengakses file ini.'
          } else if (errorCode === 'NO_DRIVE_ID') {
            errorMessage = 'File tidak ditemukan di Google Drive atau penyimpanan server.'
          } else if (errorCode === 'LETTER_NOT_FOUND') {
            errorMessage = 'Data surat tidak ditemukan.'
          } else if (errorCode === 'DRIVE_API_ERROR' || errorCode === 'DRIVE_STREAM_ERROR') {
            errorMessage = 'Gagal mengambil file dari Google Drive. Silakan coba lagi.'
          } else if (parsed.error || parsed.message) {
            errorMessage = parsed.message || parsed.error
          }
        } catch (parseErr) {
          // ignore json parse error
        }
      }

      if (err.response?.status === 401 || isGoogleReconnect) {
        setError({
          type: 'GOOGLE_RECONNECT',
          message: 'Koneksi Google Anda perlu diperbarui. Silakan hubungkan ulang akun Google Anda.',
        })
      } else if (err.response?.status === 404 || errorCode === 'FILE_NOT_FOUND_IN_DRIVE' || errorCode === 'LETTER_NOT_FOUND' || errorCode === 'NO_DRIVE_ID') {
        setError({
          type: 'NOT_FOUND',
          message: errorMessage || 'File tidak ditemukan di Google Drive.',
        })
      } else if (err.response?.status === 403 || errorCode === 'PERMISSION_DENIED') {
        setError({
          type: 'PERMISSION_DENIED',
          message: errorMessage || 'Akun Google yang terhubung tidak memiliki izin untuk mengakses file ini.',
        })
      } else {
        setError({
          type: 'GENERAL',
          message: errorMessage,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReconnectGoogle = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    window.location.href = `${API_BASE_URL}/api/google/connect${user.id ? `?userId=${user.id}` : ''}`
  }

  const handleOpenGoogleDrive = () => {
    if (surat?.file_path && surat.file_path.startsWith('http')) {
      window.open(surat.file_path, '_blank', 'noopener,noreferrer')
    } else if (surat?.google_drive_id) {
      window.open(`https://drive.google.com/file/d/${surat.google_drive_id}/view`, '_blank', 'noopener,noreferrer')
    }
  }

  const handlePrint = () => {
    if (!surat) return

    const printTitle = surat.nama_surat || 'Dokumen'

    const printWithPopupWindow = (contentHtml, stylesHtml = '') => {
      const printWin = window.open('', '_blank', 'width=800,height=600,left=100,top=100')
      if (!printWin) {
        alert('Popup window blocked. Please allow popups for this site.')
        return
      }

      const doc = printWin.document
      doc.open()
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${printTitle}</title>
          ${stylesHtml}
        </head>
        <body>
          ${contentHtml}
          <script>
            window.onload = function() {
              setTimeout(function() {
                try {
                  window.focus();
                  window.print();
                  window.onafterprint = function() {
                    window.close();
                  };
                } catch (e) {
                  console.error(e);
                }
              }, 300);
            };
          </script>
        </body>
        </html>
      `)
      doc.close()
    }

    if (fileKind === 'pdf' && blobUrl) {
      // Create a hidden iframe for printing PDF cleanly without extra pages or app UI
      const existingIframe = document.getElementById('print-pdf-iframe')
      if (existingIframe) {
        document.body.removeChild(existingIframe)
      }

      const iframe = document.createElement('iframe')
      iframe.id = 'print-pdf-iframe'
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      iframe.src = blobUrl

      document.body.appendChild(iframe)

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow.focus()
            iframe.contentWindow.print()
          } catch (printErr) {
            console.error('Iframe print error:', printErr)
            window.open(blobUrl, '_blank')
          }
        }, 300)
      }
    } else if (fileKind === 'image' && blobUrl) {
      const content = `<img src="${blobUrl}" alt="${printTitle}" />`
      const styles = `
        <style>
          @page { size: auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #fff; margin: 0; padding: 0; }
          img { max-width: 100%; max-height: 100vh; object-fit: contain; }
          @media print {
            body { padding: 0; margin: 0; }
            img { max-width: 100%; max-height: 100%; page-break-inside: avoid; }
          }
        </style>
      `
      printWithPopupWindow(content, styles)
    } else if (fileKind === 'excel' && activeSheet && sheetData[activeSheet]) {
      const rows = sheetData[activeSheet] || []
      let tableRowsHtml = ''

      rows.forEach((row) => {
        if (!row || row.length === 0) return
        const cellsHtml = row
          .map((cell) => `<td>${cell !== undefined && cell !== null ? String(cell) : ''}</td>`)
          .join('')
        tableRowsHtml += `<tr>${cellsHtml}</tr>`
      })

      const content = `
        <table>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      `
      const styles = `
        <style>
          @page { size: auto; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; padding: 10px; background: #fff; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 0; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; word-break: break-word; }
          tr:nth-child(even) { background-color: #f8fafc; }
          @media print {
            body { padding: 0; margin: 0; }
            tr { page-break-inside: avoid; }
          }
        </style>
      `
      printWithPopupWindow(content, styles)
    } else if (fileKind === 'word' && wordHtml) {
      const styles = `
        <style>
          @page { size: auto; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Georgia, Cambria, "Times New Roman", Times, serif; line-height: 1.6; color: #1e293b; padding: 15px; background: #fff; }
          img { max-width: 100%; height: auto; }
          table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; }
          p { margin-bottom: 1em; }
          @media print {
            body { padding: 0; margin: 0; }
          }
        </style>
      `
      printWithPopupWindow(wordHtml, styles)
    } else {
      window.print()
    }
  }

  if (!show || !surat) return null

  // Excel column letters helper (A, B, C, ..., Z, AA, AB)
  const getColLetter = (colIdx) => {
    let letter = ''
    while (colIdx >= 0) {
      letter = String.fromCharCode((colIdx % 26) + 65) + letter
      colIdx = Math.floor(colIdx / 26) - 1
    }
    return letter
  }

  // Filter Excel cells based on search query
  const currentSheetRows = (activeSheet && sheetData[activeSheet]) || []
  const filteredRows = currentSheetRows.filter((row) => {
    if (!searchQuery.trim()) return true
    return row.some((cell) =>
      String(cell || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Calculate max columns for the table header
  const maxCols = currentSheetRows.reduce((max, row) => Math.max(max, row ? row.length : 0), 0)

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 md:p-6 lg:p-10"
      role="dialog"
      aria-modal="true"
      aria-label="Preview dokumen"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full h-full flex flex-col bg-white shadow-2xl overflow-hidden transition-all duration-300 sm:w-[92vw] sm:h-[88vh] sm:max-w-7xl sm:max-h-[950px] sm:rounded-2xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header Toolbar ── */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between shadow-xs flex-shrink-0">
          {/* Left: Indicator & File Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-4">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-100 flex items-center justify-center text-[#4B164C] flex-shrink-0">
              <i className={
                fileKind === 'excel' ? 'bi bi-file-earmark-excel text-base sm:text-lg' :
                fileKind === 'word' ? 'bi bi-file-earmark-word text-base sm:text-lg' :
                fileKind === 'image' ? 'bi bi-file-earmark-image text-base sm:text-lg' :
                'bi bi-file-earmark-text text-base sm:text-lg'
              } />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex-shrink-0">
                Preview
              </h3>
              <span className="text-gray-300 hidden sm:inline">•</span>
              <span className="text-xs text-gray-500 font-medium truncate max-w-[150px] sm:max-w-xs md:max-w-md hidden sm:inline">
                {surat.nama_surat || 'Dokumen'}
              </span>
            </div>
          </div>

          {/* Right: Quick Controls + Print & Close Buttons ONLY (NO DOWNLOAD) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {fileKind === 'excel' && (
              <input
                type="text"
                placeholder="Cari sel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-[#4B164C] hidden sm:block"
              />
            )}

            {fileKind === 'image' && (
              <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 px-2 text-xs font-semibold text-gray-700 hover:bg-white rounded"
                  title="Zoom Out"
                >
                  <i className="bi bi-zoom-out" />
                </button>
                <span className="text-xs px-1 text-gray-600 font-mono">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1 px-2 text-xs font-semibold text-gray-700 hover:bg-white rounded"
                  title="Zoom In"
                >
                  <i className="bi bi-zoom-in" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 px-2 text-xs font-semibold text-gray-700 hover:bg-white rounded ml-1"
                  title="Putar"
                >
                  <i className="bi bi-arrow-clockwise" />
                </button>
              </div>
            )}

            {/* PRINT BUTTON */}
            <button
              onClick={handlePrint}
              disabled={loading || !!error}
              aria-label="Print document"
              title="Print document"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
            >
              <i className="bi bi-printer text-sm" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* CLOSE BUTTON */}
            <button
              onClick={onClose}
              aria-label="Close preview"
              title="Close preview"
              ref={closeButtonRef}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition cursor-pointer"
            >
              <i className="bi bi-x-lg text-sm" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </header>

        {/* ── Main Preview Content Container ── */}
        <div className="flex-1 overflow-auto relative p-3 sm:p-6 flex flex-col justify-center items-center bg-slate-100">
          {/* 1. Loading State */}
          {loading && (
            <div className="flex flex-col items-center gap-3 text-slate-500 my-auto">
              <i className="bi bi-arrow-repeat text-5xl animate-spin text-[#4B164C]" />
              <span className="text-sm font-medium">Memuat dokumen preview...</span>
            </div>
          )}

          {/* 2. Error State */}
          {!loading && error && (
            <div className="max-w-md w-full bg-white p-7 rounded-2xl shadow-xl border border-red-100 text-center my-auto">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                <i className={`bi ${
                  error.type === 'GOOGLE_RECONNECT' ? 'bi-key-fill' : 
                  error.type === 'PERMISSION_DENIED' ? 'bi-shield-lock-fill' : 
                  'bi-exclamation-triangle-fill'
                } text-2xl`} />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">
                {error.type === 'GOOGLE_RECONNECT' ? 'Koneksi Google Perlu Diperbarui' : 
                 error.type === 'PERMISSION_DENIED' ? 'Izin Akses Ditolak' :
                 'Gagal Memuat Preview'}
              </h4>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                {error.message}
              </p>

              <div className="flex flex-col gap-2">
                {error.type === 'GOOGLE_RECONNECT' ? (
                  <button
                    onClick={handleReconnectGoogle}
                    className="w-full py-2.5 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
                  >
                    <i className="bi bi-google" />
                    Hubungkan Ulang Google
                  </button>
                ) : (
                  <button
                    onClick={loadFile}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-50 text-[#4B164C] font-semibold text-sm hover:bg-purple-100 transition"
                  >
                    <i className="bi bi-arrow-clockwise mr-2" />
                    Coba Lagi
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-full mt-2 py-2 px-4 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition"
                >
                  Tutup Preview
                </button>
              </div>
            </div>
          )}

          {/* 3. PDF Renderer */}
          {!loading && !error && fileKind === 'pdf' && blobUrl && (
            <div className="w-full h-full rounded-2xl overflow-hidden shadow-xl bg-white border border-gray-200">
              <iframe
                src={blobUrl}
                className="w-full h-full border-0"
                title={`PDF: ${surat.nama_surat}`}
              />
            </div>
          )}

          {/* 4. Excel Renderer */}
          {!loading && !error && fileKind === 'excel' && (
            <div className="w-full h-full flex flex-col bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Sheet tabs bar */}
              {excelSheets.length > 0 && (
                <div className="flex items-center gap-1 px-4 py-2.5 bg-slate-50 border-b border-gray-200 overflow-x-auto flex-shrink-0">
                  <span className="text-xs font-bold text-gray-400 mr-2 uppercase tracking-wider">Sheet:</span>
                  {excelSheets.map((name) => (
                    <button
                      key={name}
                      onClick={() => setActiveSheet(name)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                        activeSheet === name
                          ? 'bg-[#4B164C] text-white shadow-xs'
                          : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              {/* Excel Table */}
              <div className="flex-1 overflow-auto p-4" ref={printTableRef}>
                {filteredRows.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    Tidak ada data sel yang cocok.
                  </div>
                ) : (
                  <table className="w-full border-collapse border border-gray-300 text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600">
                        <th className="border border-gray-300 px-2 py-1.5 w-10 text-center bg-slate-200 font-bold">#</th>
                        {Array.from({ length: maxCols }).map((_, cIdx) => (
                          <th key={cIdx} className="border border-gray-300 px-3 py-1.5 font-bold text-center">
                            {getColLetter(cIdx)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-purple-50/50 transition">
                          <td className="border border-gray-300 px-2 py-1 text-center bg-slate-50 font-bold text-gray-500">
                            {rIdx + 1}
                          </td>
                          {Array.from({ length: maxCols }).map((_, cIdx) => (
                            <td key={cIdx} className="border border-gray-300 px-3 py-1.5 text-gray-800 whitespace-pre-wrap">
                              {row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* 5. Word Document Renderer */}
          {!loading && !error && fileKind === 'word' && (
            <div className="w-full h-full overflow-auto py-6 px-2 flex justify-center">
              <div
                className="bg-white shadow-2xl rounded-2xl p-8 sm:p-14 max-w-4xl w-full text-gray-800 leading-relaxed font-serif border border-gray-200"
                dangerouslySetInnerHTML={{ __html: wordHtml }}
              />
            </div>
          )}

          {/* 6. Image Renderer */}
          {!loading && !error && fileKind === 'image' && blobUrl && (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              <img
                src={blobUrl}
                alt={surat.nama_surat}
                className="max-w-full max-h-full object-contain shadow-xl rounded-xl transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                }}
              />
            </div>
          )}

          {/* 7. Unsupported File Type */}
          {!loading && !error && fileKind === 'unsupported' && (
            <div className="max-w-md w-full bg-white p-7 rounded-2xl shadow-xl border border-gray-200 text-center my-auto">
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
                <i className="bi bi-file-earmark-lock text-2xl" />
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">
                Preview Tidak Tersedia Langsung
              </h4>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Tipe berkas ini tidak dapat dipreview secara langsung di dalam aplikasi.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleOpenGoogleDrive}
                  className="w-full py-2.5 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #4B164C 0%, #DD88CF 100%)' }}
                >
                  <i className="bi bi-box-arrow-up-right" />
                  Buka di Google Drive
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 px-4 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition"
                >
                  Tutup Preview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
