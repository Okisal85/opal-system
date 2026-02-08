import { useState, useEffect } from 'react'
import './App.css'
import UploadPO from './UploadPO'
import UploadExcel from './UploadExcel'
import WarehouseReception from './WarehouseReception'

function App() {
  const [projects, setProjects] = useState([])
  const [newProject, setNewProject] = useState({ project_number: '', client_name: '' })
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('projects')

  const API_URL = 'https://opal-backend-om1h.onrender.com';

  useEffect(() => { loadProjects() }, [])

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects`)
      const data = await res.json()
      setProjects(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      })
      if (res.ok) {
        setMessage('✅ Project created successfully!')
        setNewProject({ project_number: '', client_name: '' })
        loadProjects()
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (e) { setMessage('❌ Error creating project') }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🏠 Opal Baths & Design</h1>
        <p>Purchase Order Management System</p>
      </header>

      <div className="tabs">
        <button className={`tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>📋 Projects</button>
        <button className={`tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>📄 Upload PO</button>
        <button className={`tab ${activeTab === 'excel' ? 'active' : ''}`} onClick={() => setActiveTab('excel')}>📊 Import Excel</button>
        <button className={`tab ${activeTab === 'warehouse' ? 'active' : ''}`} onClick={() => setActiveTab('warehouse')}>📦 Warehouse</button>
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
                  <input type="text" placeholder="Ex: PRJ-2024-001" value={newProject.project_number} onChange={(e) => setNewProject({...newProject, project_number: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Client Name:</label>
                  <input type="text" placeholder="Ex: John Smith" value={newProject.client_name} onChange={(e) => setNewProject({...newProject, client_name: e.target.value})} required />
                </div>
                <button type="submit" className="btn-primary">Create Project</button>
              </form>
            </section>

            <section className="card">
              <h2>📊 Existing Projects</h2>
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