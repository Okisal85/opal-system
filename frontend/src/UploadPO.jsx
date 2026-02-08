import { useState } from 'react'
import './UploadPO.css'

function UploadPO({ projects }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [extractedData, setExtractedData] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const API_URL = 'https://opal-backend-om1h.onrender.com';

  const handleUpload = async () => {
    if (!selectedFile) { alert('Select PDF'); return; }
    setLoading(true)
    const formData = new FormData()
    formData.append('pdf', selectedFile)
    try {
      const response = await fetch(`${API_URL}/api/po/upload`, { method: 'POST', body: formData })
      const result = await response.json()
      if (result.success) { setExtractedData(result.data); setMessage('✅ Done') }
    } catch (e) { alert('Error') } finally { setLoading(false) }
  }

  const handleSave = async () => {
    if (!selectedProject) { alert('Select project'); return; }
    try {
      const response = await fetch(`${API_URL}/api/po/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poNumber: extractedData.poNumber,
          supplier: extractedData.supplier,
          projectId: selectedProject,
          lines: extractedData.lines
        })
      })
      if (response.ok) { setMessage('✅ Saved'); setExtractedData(null); }
    } catch (e) { alert('Error') }
  }

  return (
    <div className="upload-po-container">
      <h2>📄 Upload PO</h2>
      {message && <p>{message}</p>}
      <input type="file" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files[0])} />
      <button onClick={handleUpload}>{loading ? 'Wait...' : 'Extract'}</button>
      {extractedData && (
        <div>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="">-- Project --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_number}</option>)}
          </select>
          <button onClick={handleSave}>Save</button>
        </div>
      )}
    </div>
  )
}
export default UploadPO