import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from '../services/api'
import type { Role } from '../utils/role'

type HRDocument = {
  _id: string
  title: string
  fileName: string
  employeeEmail?: string
  uploadedByEmail: string
  createdAt: string
}

const maxFileSize = 512 * 1024

function toBase64(file: File) {
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
    }
    return btoa(binary)
  })
}

export default function DocumentManagement({
  token,
  role,
  onNotify,
  onUnauthorized,
}: {
  token: string
  role: Role
  onNotify: (message: string, tone?: 'success' | 'error') => void
  onUnauthorized: () => void
}) {
  const [documents, setDocuments] = useState<HRDocument[]>([])
  const [title, setTitle] = useState('')
  const [employeeEmail, setEmployeeEmail] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [workingId, setWorkingId] = useState('')
  const [error, setError] = useState('')
  const canManage = role === 'Admin' || role === 'HR'

  const loadDocuments = async () => {
    try {
      const response = await axios.get<HRDocument[]>(`${apiUrl}/api/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDocuments(response.data)
      setError('')
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load documents. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDocuments()
  }, [token])

  const uploadDocument = async (event: Event) => {
    event.preventDefault()
    if (!file || file.size > maxFileSize || file.type !== 'application/pdf') {
      setError('Choose a PDF document no larger than 512 KB.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const contentBase64 = await toBase64(file)
      const response = await axios.post<HRDocument>(`${apiUrl}/api/documents`, {
        title: title.trim(),
        fileName: file.name,
        employeeEmail: employeeEmail.trim() || undefined,
        contentBase64,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setDocuments((current) => [response.data, ...current])
      setTitle('')
      setEmployeeEmail('')
      setFile(null)
      const input = document.getElementById('hr-document-file')
      if (input instanceof HTMLInputElement) input.value = ''
      onNotify('Document uploaded securely.')
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not upload the document.')
      } else {
        setError('Could not upload the document. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const downloadDocument = async (item: HRDocument) => {
    setWorkingId(item._id)
    setError('')
    try {
      const response = await axios.get<Blob>(`${apiUrl}/api/documents/${item._id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = item.fileName
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not download this document. Please try again.')
    } finally {
      setWorkingId('')
    }
  }

  const deleteDocument = async (item: HRDocument) => {
    setWorkingId(item._id)
    setError('')
    try {
      await axios.delete(`${apiUrl}/api/documents/${item._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDocuments((current) => current.filter((documentItem) => documentItem._id !== item._id))
      onNotify('Document deleted.')
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not delete the document.')
      } else {
        setError('Could not delete the document. Please try again.')
      }
    } finally {
      setWorkingId('')
    }
  }

  return (
    <div className="document-management">
      {canManage && (
        <form className="document-upload-form" onSubmit={uploadDocument}>
          <label>Document title<input value={title} onInput={(event) => setTitle(event.currentTarget.value)} minLength={2} maxLength={120} required /></label>
          <label>Employee email (leave blank for company-wide)<input type="email" maxLength={254} value={employeeEmail} onInput={(event) => setEmployeeEmail(event.currentTarget.value)} /></label>
          <label>PDF file<input id="hr-document-file" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)} required /></label>
          <p className="muted-copy">PDF only; maximum file size 512 KB. Files are private and delivered as downloads.</p>
          <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Uploading…' : 'Upload document'}</button>
        </form>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading documents…</div>
        : documents.length ? (
          <div className="document-list">
            {documents.map((item) => (
              <article className="document-record" key={item._id}>
                <div><strong>{item.title}</strong><small>{item.fileName} · {item.employeeEmail || 'Company-wide'} · {new Date(item.createdAt).toLocaleDateString()}</small></div>
                <button className="table-action" type="button" disabled={workingId === item._id} onClick={() => void downloadDocument(item)}>{workingId === item._id ? 'Working…' : 'Download PDF'}</button>
                {canManage && <button className="table-action danger-action" type="button" disabled={workingId === item._id} onClick={() => void deleteDocument(item)}>Delete</button>}
              </article>
            ))}
          </div>
        ) : <p className="table-empty">No documents are available.</p>}
    </div>
  )
}
