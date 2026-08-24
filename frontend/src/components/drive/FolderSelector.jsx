import { useState, useEffect } from 'react'
import api from '../../api/axios'

export default function FolderSelector({ 
  letterDate, 
  selectedFolder, 
  onFolderChange, 
  letterType = 'incoming',
  fileType = 'pdf',
  disabled = false 
}) {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [previousMonthYear, setPreviousMonthYear] = useState('')

  // Get MM-YY format from letter date
  const getMonthYearFromDate = (dateString) => {
    if (!dateString) return ''
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return ''
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(-2)
    return `${mm}-${yy}`
  }

  const currentMonthYear = getMonthYearFromDate(letterDate)

  // Fetch folders when monthYear changes
  useEffect(() => {
    const fetchFolders = async () => {
      if (!currentMonthYear) {
        setFolders([])
        return
      }

      setLoading(true)
      setError('')
      try {
        const response = await api.get('/api/folders', {
          params: { 
            monthYear: currentMonthYear,
            letter_type: letterType
          }
        })
        
        if (response.data.success) {
          setFolders(response.data.data || [])
        }
      } catch (err) {
        console.error('Failed to fetch folders:', err)
        setError('Gagal memuat folder')
        setFolders([])
      } finally {
        setLoading(false)
      }
    }

    fetchFolders()
  }, [currentMonthYear, letterType])

  // Auto-clear selectedFolder when monthYear changes
  useEffect(() => {
    if (previousMonthYear && currentMonthYear && previousMonthYear !== currentMonthYear) {
      // Month changed, reset selected folder
      onFolderChange(null)
    }
    setPreviousMonthYear(currentMonthYear)
  }, [currentMonthYear, previousMonthYear, onFolderChange])

  const handleFolderChange = (e) => {
    const folderId = e.target.value
    const selected = folders.find(f => String(f.id) === String(folderId))
    onFolderChange(selected || null)
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700">
        Folder (Opsional)
      </label>
      
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          <i className="bi bi-folder" />
        </span>
        
        <select
          value={selectedFolder?.id || ''}
          onChange={handleFolderChange}
          disabled={disabled || loading || !currentMonthYear}
          className={`w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 bg-white pl-9 pr-10 ${
            disabled || loading || !currentMonthYear
              ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
              : 'border-slate-200 hover:border-[#DD88CF]/60 focus:border-[#4B164C] focus:ring-[#4B164C]/10'
          }`}
        >
          <option value="">Tidak ada folder dipilih (Gunakan folder default)</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>

        {!disabled && currentMonthYear && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowCreateFolder(!showCreateFolder)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#4B164C] transition-colors"
            title="Buat folder baru"
          >
            <i className={`bi ${showCreateFolder ? 'bi-dash-circle' : 'bi-plus-circle'}`} />
          </button>
        )}
      </div>

      {loading && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <i className="bi bi-arrow-repeat animate-spin" /> Memuat folder...
        </p>
      )}

      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <i className="bi bi-exclamation-circle" /> {error}
        </p>
      )}

      {!currentMonthYear && !disabled && (
        <p className="text-xs text-slate-400">
          <i className="bi bi-info-circle mr-1" />
          Pilih tanggal surat untuk melihat folder yang tersedia
        </p>
      )}

      {showCreateFolder && (
        <CreateFolderPanel
          monthYear={currentMonthYear}
          letterType={letterType}
          fileType={fileType}
          onFolderCreated={(newFolder) => {
            setFolders(prev => [...prev, newFolder])
            onFolderChange(newFolder)
            setShowCreateFolder(false)
          }}
          onCancel={() => setShowCreateFolder(false)}
        />
      )}
    </div>
  )
}

function CreateFolderPanel({ monthYear, letterType, fileType, onFolderCreated, onCancel }) {
  const [folderName, setFolderName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setError('')

    if (!folderName.trim()) {
      setError('Nama folder wajib diisi')
      return
    }

    setCreating(true)
    try {
      const response = await api.post('/api/folders', {
        monthYear,
        name: folderName.trim(),
        letter_type: letterType,
        file_type: fileType
      })

      if (response.data.success) {
        const folderId = response.data.folder?.id || response.data.data?.folderId
        const googleDriveFolderId = response.data.folder?.googleDriveFolderId || response.data.data?.googleDriveFolderId

        const newFolder = {
          id: folderId,
          name: folderName.trim(),
          google_drive_folder_id: googleDriveFolderId
        };

        onFolderCreated(newFolder)
        setFolderName('')
      }
    } catch (err) {
      console.error('Failed to create folder:', err)
      if (err.response?.status === 409) {
        setError('Folder dengan nama yang sama sudah ada di bulan ini')
      } else {
        setError(err.response?.data?.error || 'Gagal membuat folder. Silakan coba lagi.')
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Buat Folder Baru</p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onCancel()
          }}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
          <i className="bi bi-exclamation-triangle-fill mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Non-form div container to prevent triggering outer form submission/reset */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Nama Folder
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                handleCreate(e)
              }
            }}
            placeholder="Contoh: Surat Penting"
            disabled={creating}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B164C]/20 focus:border-[#4B164C] disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !folderName.trim()}
            className="flex-1 py-2 px-4 rounded-lg bg-[#4B164C] hover:bg-[#3a123a] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin" /> Membuat...
              </>
            ) : (
              <>
                <i className="bi bi-folder-plus" /> Buat Folder
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-500">
          <i className="bi bi-info-circle mr-1" />
          Folder akan dibuat di: <span className="font-medium">{monthYear}</span>
        </p>
      </div>
    </div>
  )
}
