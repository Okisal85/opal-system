import { useState, useEffect } from 'react'
import './App.css'
import UploadPO from './UploadPO'
import UploadExcel from './UploadExcel'
import WarehouseReception from './WarehouseReception'

function App() {
  const [projects, setProjects] = useState([])
  const [newProject, setNewProject] = useState({
    project_number: '',
    client_name: ''
  })
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('projects')

  // CAMBIA AQUÍ TU IP SI CAMBIA EN EL FUTURO
  const API_BASE_URL = 'https://opal-backend-om1h.onrender.com';

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`)
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject)
      })
      if (response.ok) {
        setMessage('✅ Project created successfully')
        setNewProject({ project_number: '', client_name: '' })
        loadProjects()
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      setMessage('❌ Error creating project')
      console.error('Error:', error)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🏠 Opal Baths & Design</h1>
        <p>Purchase Order Management System</p>
      </header>

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          📋 Projects
        </button>
        <button 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          📄 Upload PO
        </button>
        <button 
          className={`tab ${activeTab === 'excel' ? 'active' : ''}`}
          onClick={() => setActiveTab('excel')}
        >
          📊 Import Excel
        </button>
        <button 
          className={`tab ${activeTab === 'warehouse' ? 'active' : ''}`}
          onClick={() => setActiveTab('warehouse')}
        >
          📦 Warehouse
        </button>
      </div>

      <main className="main">
        {activeTab === 'projects' && (
          <>
            <section className="card">
              <h2>📋 Create New Project</h2>
              {message && <div className="message">{message}</div>}
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Project Number:</label>
                  <input
                    type="text"
                    value={newProject.project_number}
                    onChange={(e) => setNewProject({...newProject, project_number: e.target.value})}
                    placeholder="Ex: PRJ-2024-001"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Client Name:</label>
                  <input
                    type="text"
                    value={newProject.client_name}
                    onChange={(e) => setNewProject({...newProject, client_name: e.target.value})}
                    placeholder="Ex: John Smith"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary">Create Project</button>
              </form>
            </section>
            <section className="card">
              <h2>📊 Existing Projects</h2>
              {projects.length === 0 ? (
                <p className="empty-state">No projects yet.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Number</th><th>Client</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr key={project.id}>
                          <td><strong>{project.project_number}</strong></td>
                          <td>{project.client_name}</td>
                          <td>{new Date(project.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'upload' && <UploadPO projects={projects} />}
        {activeTab === 'excel' && <UploadExcel projects={projects} onImportComplete={loadProjects} />}
        {activeTab === 'warehouse' && <WarehouseReception projects={projects} />}
      </main>
    </div>
  )
}

export default App