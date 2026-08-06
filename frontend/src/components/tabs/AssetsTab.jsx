import { useState, useMemo } from 'react';
import { useGameData } from '../../contexts/GameDataContext';

export default function AssetsTab() {
  const { data } = useGameData();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [signature, setSignature] = useState('');

  const assets = data?.assets || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assets.filter(asset => {
      const textMatches = asset.filename.toLowerCase().includes(q) || asset.path.toLowerCase().includes(q);
      const catMatches = category === '' || asset.category === category;
      const sigMatches = signature === '' || asset.signature.includes(signature);
      return textMatches && catMatches && sigMatches;
    });
  }, [assets, search, category, signature]);

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <i className="fa-solid fa-search"></i>
          <input placeholder="Search assets by filename or path..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters-group">
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            <option value="Audio">Audio</option>
            <option value="Image">Image</option>
            <option value="Database">Database</option>
            <option value="Other">Other</option>
          </select>
          <select value={signature} onChange={e => setSignature(e.target.value)}>
            <option value="">All Signatures</option>
            <option value="ENCA">ENCA (Encrypted)</option>
            <option value="PNG">PNG</option>
            <option value="UnityFS">UnityFS</option>
            <option value="JSON">JSON</option>
            <option value="OggS">OggS</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Filename</th>
              <th>Signature</th>
              <th>Size</th>
              <th>Local Path</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No assets in local-input match your search.</td></tr>
            ) : filtered.slice(0, 200).map((asset, i) => {
              const sizeMb = (asset.size_bytes / (1024 * 1024)).toFixed(2);
              const isEncrypted = asset.signature.includes("ENCA");
              return (
                <tr key={i}>
                  <td><strong style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>{asset.category}</strong></td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{asset.filename}</span></td>
                  <td>
                    <span className="badge" style={{ backgroundColor: isEncrypted ? 'rgba(236,72,153,0.08)' : 'rgba(56,189,248,0.08)', borderColor: isEncrypted ? 'rgba(236,72,153,0.2)' : 'rgba(56,189,248,0.2)', color: isEncrypted ? 'var(--accent-pink)' : 'var(--accent-blue)' }}>
                      {asset.signature}
                    </span>
                  </td>
                  <td>{sizeMb} MB</td>
                  <td><code>{asset.path}</code></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
