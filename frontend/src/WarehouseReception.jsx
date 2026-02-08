import { useState, useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import './WarehouseReception.css'

function WarehouseReception({ projects }) {
  const [selectedProject, setSelectedProject] = useState('')
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [receivingItem, setReceivingItem] = useState(null)
  const [qty, setQty] = useState(1)
  const [lastLabels, setLastLabels] = useState(null)
  const [message, setMessage] = useState('')
  const [scannerActive, setScannerActive] = useState(false)

  const API_URL = 'https://opal-server-o35b.onrender.com';

  useEffect(() => { if (selectedProject) loadStatus() }, [selectedProject])

  useEffect(() => {
    let scanner = null
    if (scannerActive) {
      scanner = new Html5QrcodeScanner("reader", { 
        fps: 20, qrbox: { width: 280, height: 150 },
        aspectRatio: 1.777778, showTorchButtonIfSupported: true,
      })
      scanner.render((result) => {
        setSearchTerm(result); setScannerActive(false);
        scanner.clear().then(() => triggerSearch(result));
      }, () => {})
    }
    return () => { if(scanner) scanner.clear().catch(() => {}) }
  }, [scannerActive])

  const loadStatus = async () => {
    const res = await fetch(`${API_URL}/api/projects/${selectedProject}/reception-status`)
    const data = await res.json()
    setProducts(data)
  }

  const triggerSearch = async (code) => {
    const res = await fetch(`${API_URL}/api/reception/search?q=${code}&projectId=${selectedProject}`)
    const data = await res.json()
    if (data.length > 0) { setReceivingItem(data[0]); setQty(1); }
    else { alert('Product not found') }
  }

  const confirmReceive = async () => {
    const res = await fetch(`${API_URL}/api/reception/receive`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ poLineId: receivingItem.id, quantity: parseInt(qty), barcode: searchTerm })
    })
    const result = await res.json()
    if (result.success) {
      setLastLabels(result.labels); setReceivingItem(null); loadStatus();
      setMessage(`✅ Received! Download labels below.`);
    }
  }

  const downloadZPL = () => {
    const blob = new Blob([lastLabels.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `labels.zpl`; a.click();
  }

  return (
    <div className="warehouse-container">
      <h2>📦 Warehouse Reception</h2>
      <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="project-select">
        <option value="">-- Select Project --</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.project_number}</option>)}
      </select>

      {selectedProject && (
        <div className="action-bar">
          <button className="btn-scanner" onClick={() => setScannerActive(!scannerActive)}>
            {scannerActive ? '❌ Close Scanner' : '📷 Open Camera'}
          </button>
        </div>
      )}

      {scannerActive && <div id="reader"></div>}
      {message && <div className="label-download-zone"><button onClick={downloadZPL} className="btn-success">💾 Download Labels (ZPL)</button></div>}

      <div className="products-table">
        <table>
          <thead><tr><th>PO</th><th>Code</th><th>Area</th><th>Progress</th><th>Action</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className={p.quantity_received >= p.quantity ? 'complete' : ''}>
                <td>{p.po_number}</td><td>{p.item_code}</td><td>{p.area}</td>
                <td>{p.quantity_received}/{p.quantity}</td>
                <td><button onClick={() => setReceivingItem(p)}>Receive</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receivingItem && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Receive: {receivingItem.item_code}</h3>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            <div className="modal-buttons">
              <button onClick={confirmReceive} className="btn-confirm">Confirm</button>
              <button onClick={() => setReceivingItem(null)} className="btn-cancel">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default WarehouseReception