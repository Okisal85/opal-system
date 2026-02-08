import { useState } from 'react'
import './UploadPO.css'

function UploadPO({ projects }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [extractedData, setExtractedData] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
      const response = await fetch('http://10.0.0.51:3001/api/po/upload', {
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
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedProject) {
      setMessage('❌ Please select a project')
      return
    }

    if (!extractedData) {
      setMessage('❌ First you need to process a PDF')
      return
    }

    try {
      const response = await fetch('http://10.0.0.51:3001/api/po/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poNumber: extractedData.poNumber,
          supplier: extractedData.supplier,
          projectId: selectedProject,
          lines: extractedData.lines
        })
      })

      const result = await response.json()

      if (result.success) {
        setMessage('✅ Purchase Order saved successfully')
        setSelectedFile(null)
        setExtractedData(null)
        setSelectedProject('')
        
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      setMessage('❌ Error saving PO')
      console.error(error)
    }
  }

  return (
    <div className="upload-po-container">
      <h2>📄 Upload Purchase Order (PDF)</h2>

      {message && <div className="message">{message}</div>}

      <div className="upload-section">
        <div className="file-input-wrapper">
          <label className="file-label">
            📎 Select PDF
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="file-input"
            />
          </label>
          {selectedFile && (
            <span className="file-name">📄 {selectedFile.name}</span>
          )}
        </div>

        <button 
          onClick={handleUpload} 
          className="btn-primary"
          disabled={!selectedFile || loading}
        >
          {loading ? '⏳ Processing...' : '🔍 Extract Data'}
        </button>
      </div>

      {extractedData && (
        <div className="extracted-data">
          <h3>📊 Extracted Data from PDF:</h3>
          
          <div className="data-grid">
            <div className="data-item">
              <strong>PO Number:</strong> {extractedData.poNumber}
            </div>
            <div className="data-item">
              <strong>Supplier:</strong> {extractedData.supplier}
            </div>
            <div className="data-item">
              <strong>Client:</strong> {extractedData.client}
            </div>
          </div>

          <h4>📦 Products ({extractedData.lines.length}):</h4>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {extractedData.lines.map((line, index) => (
                  <tr key={index}>
                    <td><strong>{line.itemCode}</strong></td>
                    <td>{line.description}</td>
                    <td>{line.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="save-section">
            <label>Assign to Project:</label>
            <select 
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="project-select"
            >
              <option value="">-- Select Project --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.project_number} - {project.client_name}
                </option>
              ))}
            </select>

            <button 
              onClick={handleSave}
              className="btn-success"
              disabled={!selectedProject}
            >
              💾 Save PO to Database
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPO