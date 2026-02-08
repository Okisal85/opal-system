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

  // Cargar lista de productos cuando cambia el proyecto
  useEffect(() => {
    if (selectedProject) {
      loadStatus()
    }
  }, [selectedProject])

    // Lógica del Scanner de Cámara MEJORADA
  useEffect(() => {
    let scanner = null;
    if (scannerActive) {
      // Configuramos el scanner para que sea más sensible
      scanner = new Html5QrcodeScanner("reader", { 
        fps: 20, // Más cuadros por segundo para mayor rapidez
        qrbox: { width: 280, height: 150 }, // Caja rectangular para códigos de barras
        aspectRatio: 1.777778, // Formato panorámico para mejor enfoque
        showTorchButtonIfSupported: true, // Botón para encender la linterna
      });

      scanner.render((result) => {
        console.log("Code scanned:", result);
        setSearchTerm(result);
        setScannerActive(false);
        
        // Detener el scanner antes de buscar para liberar la cámara
        scanner.clear().then(() => {
          triggerSearch(result);
        }).catch(e => console.log(e));
        
      }, (error) => { 
        // No mostramos error en consola para no saturar, 
        // solo sigue buscando hasta encontrar uno válido
      });
    }
    return () => { if(scanner) scanner.clear().catch(e => console.log(e)) }
  }, [scannerActive]);

  const loadStatus = async () => {
    try {
      const res = await fetch(`http://10.0.0.51:3001/api/projects/${selectedProject}/reception-status`)
      const data = await res.json()
      setProducts(data)
    } catch (e) { console.error("Error loading:", e) }
  }

  const triggerSearch = async (code) => {
    try {
      const res = await fetch(`http://10.0.0.51:3001/api/reception/search?q=${code}&projectId=${selectedProject}`)
      const data = await res.json()
      if (data && data.length > 0) {
        setReceivingItem(data[0])
        setQty(1)
      } else {
        alert('Product not found in this project')
      }
    } catch (e) { console.error("Error searching:", e) }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!selectedProject) return alert('Please select a project first')
    if (!searchTerm) return
    triggerSearch(searchTerm)
  }

  const confirmReceive = async () => {
    try {
      const res = await fetch('http://10.0.0.51:3001/api/reception/receive', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          poLineId: receivingItem.id,
          quantity: parseInt(qty),
          barcode: searchTerm 
        })
      })
      const result = await res.json()
      if (result.success) {
        setLastLabels(result.labels)
        setReceivingItem(null)
        loadStatus()
        setMessage(`✅ Received! Download ${result.labels.length} labels below.`)
        setSearchTerm('')
      }
    } catch (e) { alert("Error recording reception") }
  }

  const downloadZPL = () => {
    const blob = new Blob([lastLabels.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `labels_${receivingItem?.item_code || 'print'}.zpl`
    a.click()
  }

  return (
    <div className="warehouse-container">
      <h2>📦 Warehouse Management</h2>
      
      <div className="selection-section">
        <label>Select Project:</label>
        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="project-select">
          <option value="">-- Choose Project --</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_number} - {p.client_name}</option>)}
        </select>
      </div>

      {/* Esta sección debe aparecer si hay un proyecto seleccionado */}
      {selectedProject && (
        <div className="action-bar">
          <button className="btn-scanner" onClick={() => setScannerActive(!scannerActive)}>
            {scannerActive ? '❌ Close Scanner' : '📷 Open Camera Scanner'}
          </button>
          
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input 
              type="text" 
              placeholder="Type code or scan..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
        </div>
      )}

      {scannerActive && <div id="reader"></div>}

      {message && (
        <div className="label-download-zone">
          <p>{message}</p>
          <button onClick={downloadZPL} className="btn-success">💾 Download Labels (ZPL)</button>
        </div>
      )}

      <div className="products-table">
        <table>
          <thead>
            <tr><th>PO #</th><th>Code</th><th>Area</th><th>Received</th><th>Action</th></tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className={p.quantity_received >= p.quantity ? 'complete' : ''}>
                <td>{p.po_number}</td>
                <td>{p.item_code}</td>
                <td><span className="area-badge">{p.area}</span></td>
                <td>{p.quantity_received || 0} / {p.quantity}</td>
                <td>
                  <button onClick={() => {
                    setReceivingItem(p)
                    setQty(1)
                  }}>Manual Receive</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receivingItem && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Receive: {receivingItem.item_code}</h3>
            <div className="modal-info">
              <p><strong>PO:</strong> {receivingItem.po_number}</p>
              <p><strong>Area:</strong> {receivingItem.area}</p>
              <p><strong>Ordered:</strong> {receivingItem.quantity}</p>
            </div>
            <div className="form-group">
              <label>How many arrived now?</label>
              <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="1" />
            </div>
            <div className="modal-buttons">
              <button className="btn-cancel" onClick={() => setReceivingItem(null)}>Cancel</button>
              <button className="btn-confirm" onClick={confirmReceive}>Confirm & Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WarehouseReception