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

  // DIRECCION DE INTERNET CORRECTA
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
        setMessage('✅ Project created!')
        setNewProject({ project_number: '', client_name: '' })
        loadProjects()
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (e) { setMessage('❌ Error') }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🏠 Opal Baths & Design</h1>
        <p>Purchase Order System</p>
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
              <h2>📋 New Project</h2>
              {message && <div className="message">{message}</div>}
              <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Number" value={newProject.project_number} onChange={(e) => setNewProject({...newProject, project_number: e.target.value})} required />
                <input type="text" placeholder="Client" value={newProject.client_name} onChange={(e) => setNewProject({...newProject, client_name: e.target.value})} required />
                <button type="submit" className="btn-primary">Create</button>
              </form>
            </section>
            <section className="card">
              <h2>📊 Project List</h2>
              {projects.map(p => <div key={p.id} style={{padding:'10px', borderBottom:'1px solid #eee'}}>{p.project_number} - {p.client_name}</div>)}
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