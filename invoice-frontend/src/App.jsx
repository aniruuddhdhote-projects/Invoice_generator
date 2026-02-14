import { useState, useRef, useEffect } from "react";
import html2pdf from "html2pdf.js";
import "./App.css";

function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

function Collapsible({ title, open, onToggle, children }) {
  return (
    <div className="collapsible">
      <div className="collapsible-header" onClick={onToggle} role="button" tabIndex={0}>
        <div><strong>{title}</strong></div>
        <div className="collapse-icon">{open ? "▾" : "▸"}</div>
      </div>
      <div className="collapsible-body">{children}</div>
    </div>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const [invoice, setInvoice] = useState({
    fromName: "Your Company Name",
    fromAddress: "Address line 1\nCity, State",
    fromGstin: "",
    toName: "",
    toAddress: "",
    toGstin: "",
    invoiceNumber: "INV-001",
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    taxPercent: "18",
    discountPercent: "0",
    notes: "Thank you for your business!",
    items: [{ description: "Item 1", quantity: "1", price: "0" }],
    logoDataUrl: null,
  });

  const [savedInvoices, setSavedInvoices] = useState([]);
  const invoiceRef = useRef(null);
  const menuRef = useRef(null);

  const [openFrom, setOpenFrom] = useState(true);
  const [openTo, setOpenTo] = useState(true);
  const [openItems, setOpenItems] = useState(true);
  const [openTotals, setOpenTotals] = useState(true);

  const [toastMsg, setToastMsg] = useState("");
  const toastTimerRef = useRef(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef(null);
  const sheetRef = useRef(null);
  
  useEffect(() => {
  const closeMenu = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuOpen(false);
    }
  };
  document.addEventListener("click", closeMenu);
  return () => document.removeEventListener("click", closeMenu);
}, []);

  useEffect(() => {
    fetch("http://localhost:8080/api/invoices")
      .then((r) => r.json())
      .then((d) => setSavedInvoices(d))
      .catch(() => {});
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = (text) => {
    setToastMsg(text);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(""), 2400);
  };

  const updateField = (field, value) => setInvoice((p) => ({ ...p, [field]: value }));
  const updateItem = (i, field, value) => setInvoice((p) => {
    const items = [...p.items]; items[i] = { ...items[i], [field]: value }; return { ...p, items };
  });
  const addItem = () => setInvoice((p) => ({ ...p, items: [...p.items, { description: "", quantity: "1", price: "0" }] }));
  const removeItem = (i) => setInvoice((p) => {
    const items = p.items.filter((_, idx) => idx !== i);
    return { ...p, items: items.length ? items : [{ description: "", quantity: "1", price: "0" }] };
  });

  const subtotal = invoice.items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.price) || 0), 0);
  const discountAmount = (subtotal * (parseFloat(invoice.discountPercent) || 0)) / 100;
  const taxable = subtotal - discountAmount;
  const taxAmount = (taxable * (parseFloat(invoice.taxPercent) || 0)) / 100;
  const total = taxable + taxAmount;

  const validationErrors = {};
  if (!invoice.toName || invoice.toName.trim() === "") validationErrors.toName = "Client name required";
  invoice.items.forEach((it,i)=>{ if(!it.description || !it.description.trim()) validationErrors[`item-${i}`]="Desc required"; });

  const handleDownloadPDF = () => {
    const el = invoiceRef.current;
    if (!el) return;
    const options = {
      margin: [10, 10],
      filename: `${invoice.invoiceNumber || "invoice"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(options).from(el).save();
    showToast("PDF downloaded");
  };

  const handleSaveToDb = async () => {
    if (Object.keys(validationErrors).length > 0) { showToast("Fix errors first"); return; }
    const payload = {
  invoiceNumber: invoice.invoiceNumber,
  invoiceDate: invoice.invoiceDate,
  customerName: invoice.toName,
  totalAmount: total,
  contentJson: JSON.stringify(invoice)
};

    try {
      const res = await fetch("http://localhost:8080/api/invoices", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const text = await res.text();
      let body; try { body = JSON.parse(text); } catch { body = text; }
      if (!res.ok) {
        const msg = typeof body === "string" ? body : (body.message || JSON.stringify(body));
        showToast(`Save failed: ${res.status} ${msg}`);
        return;
      }
      const data = typeof body === "object" ? body : JSON.parse(text || "{}");
      setSavedInvoices((s) => [...s, data]);
      showToast("Saved");
    } catch (err) {
      console.error(err);
      showToast("Save failed: network error");
    }
  };

  const handleLoadInvoice = (id) => {
    
    fetch(`http://localhost:8080/api/invoices/${id}`)
      .then((r) => r.json())
      .then((data) => {
        console.log("RAW API DATA:", data);
        let full = {};
        if (data.contentJson) {
          try { full = JSON.parse(data.contentJson); } 
          catch {
           ;
          }
        }
         console.log("PARSED contentJson:", full)
    setInvoice((prev) => ({
  fromName: full.fromName || prev.fromName,
  fromAddress: full.fromAddress || prev.fromAddress,
  fromGstin: full.fromGstin || prev.fromGstin,
  toName: full.toName || data.customerName || prev.toName,
  toAddress: full.toAddress || prev.toAddress,
  toGstin: full.toGstin || prev.toGstin,
  invoiceNumber: full.invoiceNumber || data.invoiceNumber || prev.invoiceNumber,
  invoiceDate: full.invoiceDate || data.invoiceDate || prev.invoiceDate,
  dueDate: full.dueDate || prev.dueDate,
  taxPercent: full.taxPercent || prev.taxPercent,
  discountPercent: full.discountPercent || prev.discountPercent,
  notes: full.notes || prev.notes,
  items: full.items && full.items.length > 0 ? full.items : prev.items,
  logoDataUrl: full.logoDataUrl || prev.logoDataUrl,
}));
        showToast("Loaded");
      })
      .catch(() => showToast("Load failed"));
  };

  const handleLogoUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => updateField("logoDataUrl", ev.target.result);
    r.readAsDataURL(f);
  };

  const handleCopy = () => {
    const node = document.querySelector(".invoice.template-a4");
    if (!node) return;
    navigator.clipboard.writeText(node.innerText);
    showToast("Copied");
  };

  const handleReset = () => {
    setInvoice({
      fromName: "Your Company Name",
      fromAddress: "Address line 1\nCity, State",
      fromGstin: "",
      toName: "",
      toAddress: "",
      toGstin: "",
      invoiceNumber: "INV-001",
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      taxPercent: "18",
      discountPercent: "0",
      notes: "Thank you for your business!",
      items: [{ description: "Item 1", quantity: "1", price: "0" }],
      logoDataUrl: null,
    });
    showToast("Reset");
  };

  // sheet touch handlers
  const onTouchStart = (e) => {
    dragStartRef.current = e.touches[0].clientY;
    setDragY(0);
  };
  const onTouchMove = (e) => {
    if (dragStartRef.current == null) return;
    const diff = e.touches[0].clientY - dragStartRef.current;
    if (diff > 0) setDragY(diff);
  };
  const onTouchEnd = () => {
    if (dragY > 140) { setSheetOpen(false); setDragY(0); }
    else setDragY(0);
    dragStartRef.current = null;
  };

  const sheetStyle = sheetOpen ? { transform: `translateY(${dragY}px)` } : {};

  const renderInvoice = () => (
    <div ref={invoiceRef} className="invoice template-a4" aria-label="Invoice preview">
      <div className="inv-title-row">
        <span className="inv-title-text">Invoice</span>
        {invoice.logoDataUrl && <div className="inv-logo"><img src={invoice.logoDataUrl} alt="logo" /></div>}
      </div>

      <div className="inv-business-row">
        <div className="inv-business-name">{invoice.fromName || "Business Name"}</div>
        <div className="inv-business-lines">
          <div style={{ whiteSpace: "pre-line" }}>{invoice.fromAddress}</div>
          <div>Website, Email Address</div>
          <div>Contact Number</div>
          <div>GSTIN NO.: {invoice.fromGstin}</div>
        </div>
      </div>

      <div className="inv-strip-row">
        <div><b>INVOICE NO. :</b> {invoice.invoiceNumber}</div>
        <div>
          <div>Invoice Date : {invoice.invoiceDate}</div>
          <div>Due Date : {invoice.dueDate}</div>
        </div>
      </div>

      <div className="inv-party-row">
        <div className="inv-party-box">
          <div className="inv-party-header">BILL TO</div>
          <div className="inv-party-line">{invoice.toName}</div>
          <div className="inv-party-line">{invoice.toAddress}</div>
          <div className="inv-party-line">GSTIN: {invoice.toGstin}</div>
        </div>

        <div className="inv-party-box">
          <div className="inv-party-header">SHIP TO</div>
          <div className="inv-party-line">{invoice.toName}</div>
          <div className="inv-party-line">{invoice.toAddress}</div>
          <div className="inv-party-line">GSTIN: {invoice.toGstin}</div>
        </div>
      </div>

      <table className="inv-items-table">
        <thead>
          <tr>
            <th className="left">DESCRIPTION</th>
            <th>QTY</th>
            <th>UNIT PRICE</th>
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i}>
              <td className="left">{item.description}</td>
              <td>{item.quantity}</td>
              <td>₹ {item.price}</td>
              <td>₹ {(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="inv-bottom-row">
        <div className="inv-bottom-left">
          <div className="inv-terms-box">
            <div className="inv-terms-header">Terms & Instructions</div>
            <div className="inv-terms-body">{invoice.notes}</div>
          </div>
        </div>

        <div className="inv-bottom-right">
          <div>Subtotal : ₹ {subtotal.toFixed(2)}</div>
          <div>Discount : ₹ {discountAmount.toFixed(2)}</div>
          <div>Tax : ₹ {taxAmount.toFixed(2)}</div>
          <div className="inv-grand-row">GRAND TOTAL : ₹ {total.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app">
      <h1>Invoice Generator</h1>

      <div className="app-box">
        <div className="layout">
          <div className="form-panel">
            <Collapsible title="From (Your Details)" open={openFrom} onToggle={() => setOpenFrom(s => !s)}>
              <div className="field-group">
                <label className="label">Your Name / Company</label>
                <input placeholder="e.g. Acme Solutions Pvt Ltd" value={invoice.fromName} onChange={(e) => updateField("fromName", e.target.value)} />
              </div>
              <div className="field-group">
                <label className="label">Your Address</label>
                <textarea rows={3} placeholder="Street, City, State" value={invoice.fromAddress} onChange={(e) => updateField("fromAddress", e.target.value)} />
              </div>
              <div className="field-group">
                <label className="label">Your GSTIN (optional)</label>
                <input placeholder="22AAAAA0000A1Z5" value={invoice.fromGstin} onChange={(e) => updateField("fromGstin", e.target.value)} />
              </div>
              <div className="field-group">
                <label className="label">Upload Logo</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
              </div>
            </Collapsible>

            <Collapsible title="To (Client Details)" open={openTo} onToggle={() => setOpenTo(s => !s)}>
              <div className="field-group">
                <label className="label">Client Name</label>
                <input placeholder="Client name" value={invoice.toName} onChange={(e) => updateField("toName", e.target.value)} />
              </div>
              <div className="field-group">
                <label className="label">Client Address</label>
                <textarea rows={3} placeholder="Client address" value={invoice.toAddress} onChange={(e) => updateField("toAddress", e.target.value)} />
              </div>
            </Collapsible>

            <Collapsible title="Invoice Details" open={openTotals} onToggle={() => setOpenTotals(s => !s)}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div className="field-group" style={{ flex: 1 }}>
                  <label className="label">Invoice Number</label>
                  <input placeholder="INV-001" value={invoice.invoiceNumber} onChange={(e) => updateField("invoiceNumber", e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="label">Invoice Date</label>
                  <input type="date" value={invoice.invoiceDate} onChange={(e) => updateField("invoiceDate", e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="label">Due Date</label>
                  <input type="date" value={invoice.dueDate} onChange={(e) => updateField("dueDate", e.target.value)} />
                </div>
              </div>
              <div className="inline-fields">
                <div className="field-group">
                  <label className="label">Discount (%)</label>
                  <input type="number" min="0" value={invoice.discountPercent} onChange={(e) => updateField("discountPercent", e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="label">Tax / GST (%)</label>
                  <input type="number" min="0" value={invoice.taxPercent} onChange={(e) => updateField("taxPercent", e.target.value)} />
                </div>
              </div>
            </Collapsible>

            <Collapsible title="Items" open={openItems} onToggle={() => setOpenItems(s => !s)}>
              <div className="items-list">
                {invoice.items.map((it, idx) => (
                  <div className="item-row" key={idx}>
                    <input placeholder="Description" value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                    <input type="number" min="0" step="1" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                    <input type="number" min="0" step="0.01" placeholder="Price" value={it.price} onChange={(e) => updateItem(idx, "price", e.target.value)} />
                    <div className="item-total">₹ {((parseFloat(it.quantity)||0)*(parseFloat(it.price)||0)).toFixed(2)}</div>
                    <button className="btn small danger" onClick={() => removeItem(idx)}>X</button>
                  </div>
                ))}
                <div style={{ marginTop: 8 }}>
                  <button className="btn small" onClick={addItem}>+ Add Item</button>
                </div>
              </div>
            </Collapsible>

            <Collapsible title="Notes" open={true} onToggle={() => {}}>
              <div className="field-group">
                <label className="label">Notes / Terms</label>
                <textarea rows={3} value={invoice.notes} onChange={(e) => updateField("notes", e.target.value)} />
              </div>
            </Collapsible>
          </div>

          <div className="preview-panel">
            <div className="invoice-wrapper">{renderInvoice()}</div>

            <div style={{ marginTop: 16 }}>
              <div className="section-title">Saved Invoices</div>
              {savedInvoices.length === 0 && <div className="small-text">No invoices saved yet.</div>}
              {savedInvoices.map((inv) => (
                <div key={inv.id} className="saved-item" onClick={() => handleLoadInvoice(inv.id)}>
                  <span>#{inv.id} - {inv.invoiceNumber || "No Number"}</span>
                  <span>₹ {inv.totalAmount ? inv.totalAmount.toFixed(2) : "0.00"}{inv.invoiceDate ? ` | ${inv.invoiceDate}` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed-actions" role="toolbar" aria-label="Actions">
        <div className="fixed-left">
          <div className="small-text">Subtotal: ₹ {subtotal.toFixed(2)} • Total: ₹ {total.toFixed(2)}</div>
        </div>
        <div className="fixed-buttons desktop-actions">
  <button className="btn" onClick={handleReset}>Reset</button>
  <button className="btn primary" onClick={handleSaveToDb}>Save</button>
  <button className="btn primary" onClick={handleDownloadPDF}>Download PDF</button>
  <button className="btn" onClick={() => setSheetOpen(true)}>Preview</button>
  <button className="btn" onClick={handleCopy}>Copy</button>
</div>

<div className="mobile-actions" ref={menuRef}>
  <button
    className="more-btn"
    onClick={() => setMenuOpen(o => !o)}
  >
    ⋮
  </button>

  <div className={`more-menu ${menuOpen ? "open" : ""}`}>
    <button onClick={() => { handleReset(); setMenuOpen(false); }}>Reset</button>
    <button onClick={() => { handleSaveToDb(); setMenuOpen(false); }}>Save</button>
    <button onClick={() => { handleDownloadPDF(); setMenuOpen(false); }}>Download PDF</button>
    <button onClick={() => { setSheetOpen(true); setMenuOpen(false); }}>Preview</button>
    <button onClick={() => { handleCopy(); setMenuOpen(false); }}>Copy</button>
  </div>
</div>

      </div>

      <div
        className={`sheet ${sheetOpen ? "sheet-open" : ""}`}
        ref={sheetRef}
        style={sheetStyle}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="dialog"
        aria-modal="true"
      >
        <div className="sheet-handle" onClick={() => setSheetOpen(false)} />
        <div className="sheet-content">
          <div className="sheet-actions">
            <button className="btn" onClick={() => setSheetOpen(false)}>Close</button>
            <div style={{ flex: 1 }} />
            <button className="btn primary" onClick={handleDownloadPDF}>Download</button>
            <button className="btn" onClick={handleCopy}>Copy</button>
          </div>
          <div className="sheet-body">{renderInvoice()}</div>
        </div>
      </div>

      <Toast msg={toastMsg} />
    </div>
  );
}
