import { useState, useMemo } from 'react';
import { useGameData } from '../../contexts/GameDataContext';
import { loc } from '../../utils/localization';
import { rarityLabels, speciesTranslations, weaponMeta, elementMeta } from '../../utils/constants';
import JobBadge from '../shared/JobBadge';

export default function CharactersTab({ onSelectCharacter }) {
  const { data, lang } = useGameData();
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState('');
  const [rarity, setRarity] = useState('');
  const [weapon, setWeapon] = useState('');
  const [element, setElement] = useState('');

  const characters = data?.characters || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return characters.filter(char => {
      const nameMatches = loc(char.NameString, lang).toLowerCase().includes(q) ||
        (char.ID && char.ID.toString().includes(q)) ||
        (char.JobsInfo && char.JobsInfo.some(job =>
          (job.name && job.name.toLowerCase().includes(q)) ||
          (job.ProfileString && loc(job.ProfileString, lang).toLowerCase().includes(q))
        ));
      const speciesMatches = species === '' || char.Species == species;
      const rarityMatches = rarity === '' || char.rarity == rarity;
      const weaponMatches = weapon === '' || (char.JobsInfo && char.JobsInfo.some(job => job.Attrib == weapon));
      const elementMatches = element === '' || (char.JobsInfo && char.JobsInfo.some(job => job.SkillAttrib == element));
      return nameMatches && speciesMatches && rarityMatches && weaponMatches && elementMatches;
    });
  }, [characters, search, species, rarity, weapon, element, lang]);

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <i className="fa-solid fa-search"></i>
          <input placeholder="Search characters by name, ID, or profile..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filters-group">
          <select value={species} onChange={e => setSpecies(e.target.value)}>
            <option value="">All Species</option>
            {Object.entries(speciesTranslations).map(([id, trans]) => (
              <option key={id} value={id}>{trans[lang] || trans.en}</option>
            ))}
          </select>
          <select value={rarity} onChange={e => setRarity(e.target.value)}>
            <option value="">All Rarities</option>
            {Object.entries(rarityLabels).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <select value={weapon} onChange={e => setWeapon(e.target.value)}>
            <option value="">All Weapons</option>
            {Object.entries(weaponMeta).map(([id, meta]) => (
              <option key={id} value={id}>{meta.name}</option>
            ))}
          </select>
          <select value={element} onChange={e => setElement(e.target.value)}>
            <option value="">All Elements</option>
            {Object.entries(elementMeta).map(([id, meta]) => (
              <option key={id} value={id}>{meta.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-layout">
        {filtered.length === 0 ? (
          <p className="stages-panel-placeholder" style={{ gridColumn: '1/-1' }}>No characters match the selected filters.</p>
        ) : filtered.map(char => {
          const firstJob = char.JobsInfo?.[0];
          const pieceUrl = firstJob?.piece_file ? `/api/assets/image?path=${encodeURIComponent(firstJob.piece_file)}` : null;
          return (
            <div key={char.ID} className="card-item" onClick={() => onSelectCharacter(char)}>
              <span className="card-badge badge-rarity">{rarityLabels[char.rarity] || 'Class ' + char.rarity}</span>
              {pieceUrl ? (
                <div className="card-image" style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <img src={pieceUrl} alt="Icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div className="card-image-placeholder"><i className="fa-solid fa-user-shield"></i></div>
              )}
              <h4 className="card-name">{loc(char.NameString, lang)}</h4>
              <div className="card-meta"><span><i className="fa-solid fa-circle-nodes"></i> ID: {char.ID}</span></div>
              {char.JobsInfo?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                  {char.JobsInfo.map((job, i) => <JobBadge key={i} job={job} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
