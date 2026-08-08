import { useState, useMemo } from 'react';
import { useGameData } from '../../contexts/GameDataContext';
import { loc } from '../../utils/localization';

export default function SkillsTab() {
  const { data, lang } = useGameData();
  const [search, setSearch] = useState('');

  const skills = data?.skills || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return skills.filter(skill => 
      (skill.nameString && loc(skill.nameString, lang).toLowerCase().includes(q)) ||
      (skill.descString && loc(skill.descString, lang).toLowerCase().includes(q)) ||
      (skill.iconNo && skill.iconNo.toString().includes(q))
    );
  }, [skills, search, lang]);

  return (
    <div className="tab-content">
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <i className="fa-solid fa-search"></i>
          <input placeholder="Search skills by name, ID, or description..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Rate</th>
              <th>Element</th>
              <th>Area</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody id="skills-table-body">
            {filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No skills matched the search.</td></tr>
            ) : filtered.slice(0, 150).map((skill, index) => (
              <tr key={index}>
                <td><code>{skill.iconNo || index}</code></td>
                <td><strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{loc(skill.nameString, lang)}</strong></td>
                <td>{skill.emitRatio === 0 ? <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)' }}>Equip</span> : `${skill.emitRatio || 0}%`}</td>
                <td><span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.08)', borderColor: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-indigo)' }}>{skill.attrib || 'None'}</span></td>
                <td><span className="badge" style={{ backgroundColor: 'rgba(236, 72, 153, 0.08)', borderColor: 'rgba(236, 72, 153, 0.2)', color: 'var(--accent-pink)' }}>{loc(skill.rangePrefixString, lang, 'Self')}</span></td>
                <td style={{ maxWidth: 320, lineHeight: 1.4 }}>{loc(skill.descString, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
