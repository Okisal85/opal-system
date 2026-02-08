import { useState } from 'react'
import './UploadExcel.css'

function UploadExcel({ projects, onImportComplete }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedProject, setSelectedProject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0])
    setMessage('')
    setImportResult(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('❌ Please select an Excel file')
      return
    }

    if (!selectedProject) {
      setMessage('❌ Please select a project')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('excel', selectedFile)

    try {
      const response = await fetch(`http://10.0.0.51:3001/api/projects/${selectedProject}/upload-excel`, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setMessage(`✅ ${result.message}`)
        setImportResult(result)
        setSelectedFile(null)
        
        if (onImportComplete) {
          onImportComplete()
        }
        
        setTimeout(() => setMessage(''), 5000)
      } else {
        setMessage('❌ Error processing Excel: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      setMessage('❌ Error uploading file')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-excel-container">
      <h2>📊 Import Project Products (Excel)</h2>

      {message && <div className="message">{message}</div>}

      <div className="upload-section">
        <div className="form-group">
          <label>Select Project:</label>
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
        </div>

        <div className="file-input-wrapper">
          <label className="file-label">
            📎 Select Excel (.xlsx)
            <input
              type="file"
              accept=".xlsx,.xls"
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
          disabled={!selectedFile || !selectedProject || loading}
        >
          {loading ? '⏳ Importing...' : '📥 Import Products'}
        </button>
      </div>

      {importResult && (
        <div className="import-result">
          <h3>✅ Import Successful</h3>
          <p><strong>Products imported:</strong> {importResult.productsImported}</p>
          <p className="help-text">
            Products have been linked to the project. When you upload a Purchase Order,
            the system will automatically assign the corresponding <strong>Area</strong> to each product.
          </p>
        </div>
      )}

      <div className="info-box">
        <h4>ℹ️ Instructions</h4>
        <ol>
          <li>Select the project these products belong to</li>
          <li>Upload the Excel file with the complete project product list</li>
          <li>The system will extract: Product#, Area, Wholesaler, Quantity, etc.</li>
          <li>When you upload a PO, the system will <strong>automatically match</strong> by product code</li>
          <li>The <strong>Area</strong> will be automatically assigned to labels</li>
        </ol>
      </div>
    </div>
  )
}

export default UploadExcel