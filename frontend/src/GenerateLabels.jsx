import { useState, useEffect } from 'react'
import './GenerateLabels.css'

function GenerateLabels({ projects }) {
  const [selectedProject, setSelectedProject] = useState('')
  const [pos, setPos] = useState([])
  const [selectedPO, setSelectedPO] = useState('')
  const [labels, setLabels] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedProject) {
      loadPOs()
    }
  }, [selectedProject])

  const loadPOs = async () => {
    try {
      const response = await fetch(`http://10.0.0.51:3001/api/projects/${selectedProject}/pos`)
      const data = await response.json()
      setPos(data)
    } catch (error) {
      console.error('Error loading POs:', error)
    }
  }

  const handleGenerateLabels = async () => {
    if (!selectedPO) {
      setMessage('❌ Please select a Purchase Order')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('http://10.0.0.51:3001/api/po/generate-labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ poId: selectedPO })
      })

      const result = await response.json()

      if (result.success) {
        setLabels(result.labels)
        setMessage(`✅ ${result.count} label(s) generated successfully`)
      } else {
        setMessage('❌ Error generating labels')
      }
    } catch (error) {
      setMessage('❌ Error generating labels')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadZPL = () => {
    const allZPL = labels.map(label => label.zpl).join('\n\n')
    
    const blob = new Blob([allZPL], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `labels-PO-${labels[0].data.poNumber}.zpl`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="generate-labels-container">
      <h2>🏷️ Generate Product Labels</h2>

      {message && <div className="message">{message}</div>}

      <div className="selection-section">
        <div className="form-group">
          <label>1. Select Project:</label>
          <select 
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value)
              setSelectedPO('')
              setLabels([])
            }}
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

        {selectedProject && pos.length > 0 && (
          <div className="form-group">
            <label>2. Select Purchase Order:</label>
            <select 
              value={selectedPO}
              onChange={(e) => {
                setSelectedPO(e.target.value)
                setLabels([])
              }}
              className="project-select"
            >
              <option value="">-- Select PO --</option>
              {pos.map((po) => (
                <option key={po.id} value={po.id}>
                  PO #{po.po_number} - {po.supplier} ({po.total_lines} products)
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedPO && (
          <button 
            onClick={handleGenerateLabels}
            className="btn-primary"
            disabled={loading}
          >
            {loading ? '⏳ Generating...' : '🏷️ Generate Labels'}
          </button>
        )}
      </div>

      {labels.length > 0 && (
        <div className="labels-section">
          <div className="labels-header">
            <h3>📋 Generated Labels ({labels.length})</h3>
            <div className="button-group">
              <button onClick={handleDownloadZPL} className="btn-success">
                💾 Download ZPL (Thermal Printer)
              </button>
              <button onClick={handlePrint} className="btn-secondary">
                🖨️ Print Preview
              </button>
            </div>
          </div>

          <div className="labels-preview">
            {labels.map((label, index) => (
              <div key={index} className="label-card">
                <div className="label-preview">
                  <div className="label-header-text">Opal Baths & Design</div>
                  
                  <div className="label-field-client">
                    {label.data.clientName}
                  </div>
                  
                  <div className="label-field-area">
                    {label.data.area}
                  </div>
                  
                  <div className="label-bottom-row">
                    <div className="label-column">
                      <div className="label-field">
                        <strong>Project:</strong>
                        <span>{label.data.projectNumber}</span>
                      </div>
                      <div className="label-field">
                        <strong>PO:</strong>
                        <span>{label.data.poNumber}</span>
                      </div>
                    </div>
                    
                    <div className="label-column">
                      <div className="label-field">
                        <strong>Code:</strong>
                        <span>{label.data.itemCode}</span>
                      </div>
                      <div className="label-field">
                        <strong>Qty:</strong>
                        <span>{label.data.quantity}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="info-box">
        <h4>ℹ️ How to Use Labels</h4>
        <ol>
          <li>Select the project and Purchase Order</li>
          <li>Generate labels (one for each product line)</li>
          <li><strong>For thermal printer:</strong> Download the ZPL file and send it to your Zebra/compatible printer</li>
          <li><strong>For regular printer:</strong> Use "Print Preview" and cut the labels</li>
          <li>Stick labels on products when they arrive at warehouse</li>
        </ol>
      </div>
    </div>
  )
}

export default GenerateLabels