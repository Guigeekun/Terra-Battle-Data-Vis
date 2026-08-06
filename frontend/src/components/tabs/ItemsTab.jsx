import { useState, useMemo } from 'react';
import { useGameData } from '../../contexts/GameDataContext';
import { loc } from '../../utils/localization';

export default function ItemsTab({ onSelectItem }) {
  const { data, lang } = useGameData();
  const [search, setSearch] = useState('');

  const items = data?.items || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(item => 
      loc(item.NameString, lang).toLowerCase().includes(q) ||
      loc(item.DescString, lang).toLowerCase().includes(q)
    );
  }, [items, search, lang]);

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <i className="fa-solid fa-search"></i>
          <input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="grid-layout">
        {filtered.length === 0 ? (
          <p className="stages-panel-placeholder" style={{ gridColumn: '1/-1' }}>No items found.</p>
        ) : filtered.map((item) => {
          const itemIndex = items.indexOf(item);
          return (
            <div key={itemIndex} className="card-item" style={{ padding: 16 }} onClick={() => onSelectItem(itemIndex + 1)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, minHeight: 64 }}>
                {item.icon_url ? (
                  <img src={item.icon_url} alt={loc(item.NameString, lang)} style={{ width: 64, height: 64, objectFit: 'contain', imageRendering: 'pixelated' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} />
                ) : null}
                <div className="card-image-placeholder" style={{ height: 64, display: item.icon_url ? 'none' : 'flex' }}>
                  <i className="fa-solid fa-gem" style={{ fontSize: 20 }}></i>
                </div>
              </div>
              <h5 className="card-name" style={{ fontSize: 14 }}>{loc(item.NameString, lang)}</h5>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 4, flexGrow: 1 }}>
                {loc(item.DescString, lang)}
              </p>
              <div className="card-details-row" style={{ marginTop: 8, paddingTop: 6 }}>
                <span>ID: {itemIndex}</span>
                <span>Sort: {item.sortOrder || 0}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
