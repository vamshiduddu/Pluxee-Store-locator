import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Search, MapPin, Store, Download, X, SlidersHorizontal, ExternalLink, ChevronDown, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import './styles.css';

const HOME_PIN = '500068';
const PAGE_SIZE = 30;
const norm = (value) => String(value ?? '').toLowerCase().normalize('NFKD').trim();
const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

function App() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pin, setPin] = useState('');
  const [query, setQuery] = useState('');
  const [onlyValidPin, setOnlyValidPin] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    try {
      const saved = localStorage.getItem('merchant-atlas-data-v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          setMerchants(parsed);
          setImportMessage(`Loaded ${parsed.length.toLocaleString('en-IN')} records saved in this browser.`);
          setLoading(false);
          return () => { cancelled = true; };
        }
      }
    } catch { localStorage.removeItem('merchant-atlas-data-v1'); }
    fetch(`${import.meta.env.BASE_URL}data/merchants.json`)
      .then((r) => { if (!r.ok) throw new Error(`Data request failed (${r.status})`); return r.json(); })
      .then((rows) => {
        if (cancelled) return;
        const available = Array.isArray(rows) ? rows : [];
        setMerchants(available);
        if (available.length < 1000) setImportMessage('Import your master Excel workbook or merchant CSV files to load the complete directory. Your import will be saved in this browser.');
        setLoading(false);
      })
      .catch((e) => { if (cancelled) return; setError(`${e.message}. Import a merchant CSV or Excel file to continue.`); setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const pinOptions = useMemo(() => {
    const counts = new Map();
    merchants.forEach((m) => {
      const code = String(m.postalCode ?? '').trim();
      if (/^\d{6}$/.test(code)) counts.set(code, (counts.get(code) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [merchants]);

  const filtered = useMemo(() => {
    const terms = norm(query).split(/\s+/).filter(Boolean);
    return merchants.filter((m) => {
      const code = String(m.postalCode ?? '').trim();
      if (pin && code !== pin) return false;
      if (onlyValidPin && !/^\d{6}$/.test(code)) return false;
      if (terms.length) {
        const searchable = norm([m.name, m.address, m.displayedAddress, m.city, m.state, m.postalCode, m.businessID, m.storeID].join(' '));
        if (!terms.every((term) => searchable.includes(term))) return false;
      }
      return true;
    }).sort((a, b) => {
      if (!pin) {
        const ah = String(a.postalCode) === HOME_PIN ? 0 : 1;
        const bh = String(b.postalCode) === HOME_PIN ? 0 : 1;
        if (ah !== bh) return ah - bh;
      }
      return String(a.name).localeCompare(String(b.name));
    });
  }, [merchants, pin, query, onlyValidPin]);

  useEffect(() => setPage(1), [pin, query, onlyValidPin]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const validPinCount = merchants.filter((m) => /^\d{6}$/.test(String(m.postalCode ?? '').trim())).length;
  const homeCount = merchants.filter((m) => String(m.postalCode ?? '').trim() === HOME_PIN).length;

  function downloadRows(rows, filename) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.map(csvCell).join(','), ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  function exportFiltered() {
    downloadRows(filtered, `hyderabad-merchants${pin ? `-${pin}` : ''}.csv`);
  }
  function exportPinSummary() {
    const summary = pinOptions.map(([postalCode, merchantCount]) => ({ postalCode, merchantCount, homePin: postalCode === HOME_PIN ? 'Yes' : '' }));
    downloadRows(summary, 'hyderabad-pin-summary.csv');
  }

  function canonicalRow(row) {
    const key = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const indexed = new Map(Object.entries(row || {}).map(([k, v]) => [key(k), v]));
    const pick = (...keys) => {
      for (const k of keys) {
        const v = indexed.get(key(k));
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
      }
      return '';
    };
    return {
      name: pick('name', 'merchant name', 'merchant', 'business name', 'Name'),
      secondaryID: pick('secondaryID', 'secondary id', 'secondary_id'),
      address: pick('address', 'fullAddress', 'full address', 'business address', 'merchant address'),
      city: pick('city', 'town'),
      state: pick('state'),
      postalCode: pick('postalCode', 'pin code', 'pincode', 'postal code', 'pin', 'zip code'),
      latitude: pick('latitude', 'lat'),
      longitude: pick('longitude', 'long', 'lng'),
      businessID: pick('businessID', 'business id', 'business_id'),
      storeID: pick('storeID', 'store id', 'store_id'),
      terminalsCount: pick('terminalsCount', 'terminals count'),
      paymentModes: pick('paymentModes', 'payment modes', 'acceptancePaymentModes'),
      displayedAddress: pick('displayedAddress', 'displayed address', 'full displayed address')
    };
  }

  async function importMerchantFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setImporting(true);
    setImportMessage('');
    setError('');
    try {
      const allRows = [];
      for (const file of files) {
        const extension = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls', 'json'].includes(extension)) {
          throw new Error(`Unsupported file type: ${file.name}. Select CSV, XLSX, XLS or JSON.`);
        }
        if (extension === 'json') {
          const parsed = JSON.parse(await file.text());
          if (!Array.isArray(parsed)) throw new Error(`${file.name} must contain a JSON array.`);
          allRows.push(...parsed);
        } else {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          if (!sheet) continue;
          allRows.push(...XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }));
        }
      }
      const normalized = allRows.map(canonicalRow).filter(r => r.name || r.address || r.postalCode);
      if (!normalized.length) throw new Error('No merchant rows found. Make sure the first row contains column headers.');
      const unique = new Map();
      for (const row of normalized) {
        const id = row.secondaryID || [row.businessID, row.storeID, row.postalCode, row.address].join('|');
        unique.set(id.toLowerCase(), row);
      }
      const rows = [...unique.values()];
      try {
        localStorage.setItem('merchant-atlas-data-v1', JSON.stringify(rows));
      } catch {
        throw new Error('The dataset could not fit in this browser storage. Try importing the single combined master workbook instead of several exports.');
      }
      setMerchants(rows);
      setPin('');
      setQuery('');
      setOnlyValidPin(false);
      setPage(1);
      setSelected(null);
      setImportMessage(`Imported ${rows.length.toLocaleString('en-IN')} unique store records from ${files.length} file(s). Saved in this browser.`);
    } catch (e) {
      setImportMessage('');
      setError(e.message || 'Failed to import merchant data.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Merchant Atlas home"><span className="brand-mark"><Store size={22}/></span><span><strong>Merchant Atlas</strong><small>HYDERABAD STORE DIRECTORY</small></span></a>
      <div className="topbar-right"><label className="import-button"><Upload size={16}/><span>{importing ? 'Importing…' : 'Import data'}</span><input type="file" accept=".csv,.xlsx,.xls,.json" multiple onChange={importMerchantFiles} disabled={importing} /></label><span className="live-dot"/><span>Local merchant database</span></div>
    </header>

    <main className="main-content">
      <section className="hero">
        <div className="eyebrow"><MapPin size={15}/> YOUR LOCAL MERCHANT DIRECTORY</div>
        <h1>Find the right merchant.<br/><span>One PIN code at a time.</span></h1>
        <p>Explore Pluxee merchant locations across Hyderabad. Filter by postal code or search any business name, street, or address.</p>
        <div className="stats-row">
          <div className="stat"><strong>{merchants.length.toLocaleString('en-IN') || '—'}</strong><span>Store records</span></div>
          <div className="stat"><strong>{pinOptions.length || '—'}</strong><span>Valid PIN codes</span></div>
          <div className="stat home-stat"><strong>{homeCount || '—'}</strong><span>Records in your PIN <b>{HOME_PIN}</b></span></div>
        </div>
      </section>
      {importMessage && <div className="import-notice"><FileSpreadsheet size={16}/><span>{importMessage}</span><button onClick={() => setImportMessage('')} aria-label="Dismiss notice"><X size={14}/></button></div>}

      <section className="search-panel" aria-label="Merchant filters">
        <div className="panel-heading"><div><span className="section-kicker">DIRECTORY SEARCH</span><h2>What are you looking for?</h2></div><button className="text-button" onClick={() => {setPin('');setQuery('');setOnlyValidPin(false);}}><X size={15}/> Clear filters</button></div>
        <div className="filter-grid">
          <label className="field pin-field"><span>PIN code</span><span className="input-wrap"><MapPin size={17}/><select value={pin} onChange={(e) => setPin(e.target.value)}><option value="">All Hyderabad PIN codes</option>{pinOptions.map(([code,count]) => <option key={code} value={code}>{code} · {count} stores{code === HOME_PIN ? ' · Your area' : ''}</option>)}</select><ChevronDown size={16} className="select-chevron"/></span></label>
          <label className="field query-field"><span>Merchant or address</span><span className="input-wrap search-input"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try “Nagole”, “Gachibowli”, “road no 5”…"/>{query && <button className="input-clear" onClick={() => setQuery('')} aria-label="Clear search"><X size={16}/></button>}</span></label>
          <button className="export-button" onClick={exportFiltered} disabled={!filtered.length}><Download size={17}/> Export results</button>
        </div>
        <div className="filter-footer"><label className="checkbox-label"><input type="checkbox" checked={onlyValidPin} onChange={(e) => setOnlyValidPin(e.target.checked)}/><span>Only records with valid 6-digit PIN codes</span></label><button className="text-button" onClick={exportPinSummary}><Download size={14}/> Download PIN summary</button></div>
      </section>

      <section className="results-section">
        <div className="results-heading"><div><div className="section-kicker">MERCHANTS</div><h2>{loading ? 'Loading directory…' : 'Search results'} <span className="result-count">{filtered.length.toLocaleString('en-IN')}</span></h2><p>{pin ? `Showing records for PIN code ${pin}` : 'All imported Hyderabad merchant records'}{query ? ` matching “${query}”` : ''}</p></div><div className="sort-note"><SlidersHorizontal size={16}/> Name A–Z</div></div>

        {loading && <div className="state-card"><div className="spinner"/><p>Loading the merchant directory…</p></div>}
        {error && <div className="state-card error-state"><strong>Couldn't load merchant data</strong><p>{error}</p></div>}
        {!loading && !error && filtered.length === 0 && <div className="state-card"><Search size={26}/><strong>No merchants found</strong><p>Try another PIN code or simplify your search terms.</p><button className="secondary-button" onClick={() => {setPin('');setQuery('');setOnlyValidPin(false);}}>Reset search</button></div>}

        {!loading && !error && visible.length > 0 && <div className="merchant-grid">{visible.map((m, index) => <article className="merchant-card" key={m.secondaryID || `${m.businessID}-${m.storeID}-${m.postalCode}-${index}`}><div className="card-top"><span className="store-icon"><Store size={19}/></span><span className="pin-badge">{m.postalCode || 'PIN unavailable'}</span></div><h3>{m.name || 'Unnamed merchant'}</h3><p className="merchant-address"><MapPin size={15}/><span>{m.address || m.displayedAddress || 'Address unavailable'}{m.city ? `, ${m.city.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}` : ''}{m.postalCode ? ` · ${m.postalCode}` : ''}</span></p><div className="card-meta"><span>Business ID <b>{m.businessID || '—'}</b></span><span>Store ID <b>{m.storeID || '—'}</b></span></div><div className="card-actions"><button className="details-button" onClick={() => setSelected(m)}>View details <ExternalLink size={14}/></button>{m.latitude && m.longitude && <a className="map-link" href={`https://www.google.com/maps?q=${encodeURIComponent(m.latitude+','+m.longitude)}`} target="_blank" rel="noreferrer">Map <MapPin size={14}/></a>}</div></article>)}</div>}

        {!loading && !error && filtered.length > PAGE_SIZE && <div className="pagination"><span>Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length.toLocaleString('en-IN')}</span><div><button disabled={page===1} onClick={() => {setPage(p=>p-1);window.scrollTo({top:500,behavior:'smooth'});}}>Previous</button><span className="page-number">Page {page} of {pageCount}</span><button disabled={page===pageCount} onClick={() => {setPage(p=>p+1);window.scrollTo({top:500,behavior:'smooth'});}}>Next</button></div></div>}
      </section>
      <footer className="footer"><span>MERCHANT ATLAS <i>·</i> Built for easier local discovery</span><span>Data imported from provided directory exports</span></footer>
    </main>

    {selected && <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="detail-modal" role="dialog" aria-modal="true" aria-label="Merchant details" onClick={e => e.stopPropagation()}><div className="modal-header"><span className="store-icon"><Store size={20}/></span><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close"><X size={19}/></button></div><div className="modal-kicker">MERCHANT DETAILS</div><h2>{selected.name}</h2><p className="modal-address"><MapPin size={16}/>{selected.displayedAddress || selected.address || 'Address unavailable'}</p><dl className="detail-list">{[['PIN code',selected.postalCode],['Business ID',selected.businessID],['Store ID',selected.storeID],['Store reference',selected.secondaryID],['Terminals',selected.terminalsCount],['Payment modes',selected.paymentModes],['Latitude',selected.latitude],['Longitude',selected.longitude]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl><div className="modal-actions"><button className="secondary-button" onClick={() => downloadRows([selected], 'merchant-details.csv')}><Download size={16}/> Export merchant</button>{selected.latitude && selected.longitude && <a className="export-button map-button" href={`https://www.google.com/maps?q=${encodeURIComponent(selected.latitude+','+selected.longitude)}`} target="_blank" rel="noreferrer">Open in Maps <ExternalLink size={15}/></a>}</div></section></div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
