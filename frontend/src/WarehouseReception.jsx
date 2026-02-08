import { useState, useEffect } from 'react'
import './WarehouseReception.css'

function WarehouseReception({ projects }) {
  const [selectedProject, setSelectedProject] = useState('')
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [receivingItem, setReceivingItem] = useState(null)
  const [qty, setQty] = useState(1)
  const [message, setMessage] = useState('')

  const API_URL = 'https://opal-backend-om1h.onrender.com';

  useEffect(() => { if (selectedProject) loadStatus() }, [selectedProject])

  const loadStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/${selectedProject}/reception-status`)
      const data = await res.json()
      setProducts(data)
    } catch (e) { console.error(e) }
  }

  const confirmReceive = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reception/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poLineId: receivingItem.id, quantity: parseInt(qty) })
      })
      if (res.ok) {
        setReceivingItem(null); loadStatus(); setMessage('✅ Received!');
      }
    } catch (e) { alert("Error") }
  }

  return (
    <div className="warehouse-container">
      <h2>📦 Warehouse</h2>
      <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
        <option value="">-- Select Project --</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.project_number}</option>)}
      </select>
      {message && <p>{message}</p>}
      <table>
        <thead><tr><th>PO</th><th>Code</th><th>Received</th><th>Action</th></tr></thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td>{p.po_number}</td><td>{p.item_code}</td><td>{p.quantity_received}/{p.quantity}</td>
              <td><button onClick={() => setReceivingItem(p)}>Receive</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {receivingItem && (
        <div className="modal-overlay" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div className="modal" style={{background:'white', padding:'20px', borderRadius:'10px'}}>
            <h3>Item: {receivingItem.item_code}</h3>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            <button onClick={confirmReceive}>Confirm</button>
            <button onClick={() => setReceivingItem(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
export default WarehouseReception