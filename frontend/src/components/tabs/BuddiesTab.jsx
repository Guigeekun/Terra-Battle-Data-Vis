import { useState, useMemo } from 'react';
import { useGameData } from '../../contexts/GameDataContext';
import { loc } from '../../utils/localization';
import { rarityLabels } from '../../utils/constants';

export default function BuddiesTab() {
  const { data, lang } = useGameData();
  const [search, setSearch] = useState('');
  const [rarity, setRarity] = useState('');

  const buddies = data?.buddies || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return buddies.filter(b => {
      const nameMatches = loc(b.NameString, lang).toLowerCase().includes(q) || loc(b.DescString, lang).toLowerCase().includes(q);
      const rarityMatches = rarity === '' || b.rarity == rarity;
      return nameMatches && rarityMatches;
    });
  }, [buddies, search, rarity, lang]);

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <i className="fa-solid fa-search"></i>
          <input placeholder="Search companions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters-group">
          <select value={rarity} onChange={e => setRarity(e.target.value)}>
            <option value="">All Rarities</option>
            {Object.entries(rarityLabels).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid-layout">
        {filtered.length === 0 ? (
          <p className="stages-panel-placeholder" style={{ gridColumn: '1/-1' }}>No companions match the selected filters.</p>
        ) : filtered.map(buddy => {
          const thumbUrl = buddy.thumb_file ? `/api/assets/image?path=${encodeURIComponent(buddy.thumb_file)}` : null;
          return (
            <div key={buddy.ID} className="card-item">
              <span className="card-badge badge-rarity">{rarityLabels[buddy.rarity] || 'Class ' + buddy.rarity}</span>
              {thumbUrl ? (
                <div className="card-image" style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <img src={thumbUrl} alt="Companion" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div className="card-image-placeholder"><i className="fa-solid fa-paw"></i></div>
              )}
              <h4 className="card-name">{loc(buddy.NameString, lang)}</h4>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 12, height: '3.2em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {loc(buddy.DescString, lang)}
              </p>
              <div className="card-meta">
                <span><i className="fa-solid fa-heart"></i> HP +{buddy.HP || 0}</span>
                <span><i className="fa-solid fa-bolt"></i> ATK +{buddy.ATK || 0}</span>
              </div>
              <div className="card-details-row">
                <span style={{ fontSize: 10, wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--accent-blue)' }}>
                  Thumb: {buddy.thumb_file ? buddy.thumb_file.split('/').pop() : 'None'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
