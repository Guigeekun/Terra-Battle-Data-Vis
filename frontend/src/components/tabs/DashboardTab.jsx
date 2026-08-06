import { useGameData } from '../../contexts/GameDataContext';

export default function DashboardTab({ onTabChange }) {
  const { data } = useGameData();
  if (!data) return null;

  const bgmCount = data.audio?.BGM?.length || 0;
  const seCount = data.audio?.SE?.length || 0;

  const stats = [
    { key: 'characters', label: 'Characters', count: data.characters?.length || 0, icon: 'fa-users', bg: 'char-bg' },
    { key: 'buddies', label: 'Companions', count: data.buddies?.length || 0, icon: 'fa-paw', bg: 'buddy-bg' },
    { key: 'skills', label: 'Skills', count: data.skills?.length || 0, icon: 'fa-wand-magic-sparkles', bg: 'skill-bg' },
    { key: 'items', label: 'Items', count: data.items?.length || 0, icon: 'fa-gem', bg: 'item-bg' },
    { key: 'stages', label: 'Chapters', count: data.stages?.length || 0, icon: 'fa-map-location-dot', bg: 'stage-bg' },
    { key: 'audio', label: 'Audio Tracks', count: `${bgmCount} BGM / ${seCount} SE`, icon: 'fa-music', bg: 'audio-bg' },
  ];

  return (
    <div className="tab-content">
      <div className="stats-grid">
        {stats.map(s => (
          <div key={s.key} className="stat-card" onClick={() => onTabChange(s.key)}>
            <div className={`stat-icon ${s.bg}`}>
              <i className={`fa-solid ${s.icon}`}></i>
            </div>
            <div className="stat-info">
              <h3>{s.count}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="welcome-box">
        <div className="welcome-text">
          <h3>Welcome to Terra Battle Data Visualizer</h3>
          <p>Browse extracted game databases including characters, companions, skills, items, stage layouts, and audio assets. Use the sidebar to navigate between data categories.</p>
        </div>
        <i className="fa-solid fa-compass-drafting welcome-decoration"></i>
      </div>
    </div>
  );
}
