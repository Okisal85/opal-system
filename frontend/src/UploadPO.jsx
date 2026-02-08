import { useState } from 'react'
import './UploadPO.css'

function UploadPO({ projects }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [extractedData, setExtractedData] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const API_URL = 'https://opal-backend-om1h.onrender.com';

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0])
    setExtractedData(null)
    setMessage('')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('❌ Please select a PDF file')
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append('pdf', selectedFile)
    try {
      const response = await fetch(`${API_URL}/api/po/upload`, {
        method: 'POST',
        body: formData
      })
      const result = await response.json()
      if (result.success) {
        setExtractedData(result.data)
        setMessage('✅ PDF processed successfully')
      } else {
        setMessage('❌ Error processing PDF')
      }
    } catch (error) {
      setMessage('❌ Error uploading file')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedProject) return alert('Please select a project')
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
      const result = await response.json()
      if (result.success) {
        setMessage('✅ PO saved successfully')
        setExtractedData(null)
        setSelectedFile(null)
      }
    } catch (error) {
      setMessage('❌ Error saving PO')
    }
  }

  return (
    <div className="upload-po-container">
      <h2>📄 Upload Purchase Order</h2>
      {message && <div className="message">{message}</div>}
      <div className="upload-section">
        <label className="file-label">
          📎 Select PDF
          <input type="file" accept=".pdf" onChange={handleFileChange} style={{display:'none'}} />
        </label>
        {selectedFile && <span>{selectedFile.name}</span>}
        <button onClick={handleUpload} disabled={loading}>{loading ? 'Processing...' : 'Extract Data'}</button>
      </div>
      {extractedData && (
        <div className="extracted-data">
          <p><strong>PO:</strong> {extractedData.poNumber} | <strong>Supplier:</strong> {extractedData.supplier}</p>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="">-- Assign to Project --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_number}</option>)}
          </select>
          <button onClick={handleSave} className="btn-success">Save PO</button>
        </div>
      )}
    </div>
  )
}

export default UploadPO