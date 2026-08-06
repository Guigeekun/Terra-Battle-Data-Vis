import { createContext, useContext, useState, useEffect } from 'react';
import { fetchAllData } from '../api';

const GameDataContext = createContext(null);

export function GameDataProvider({ children }) {
  const [data, setData] = useState(null);
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { console.error('Error fetching game data:', e); setLoading(false); });
  }, []);

  return (
    <GameDataContext.Provider value={{ data, lang, setLang, loading }}>
      {children}
    </GameDataContext.Provider>
  );
}

export function useGameData() {
  const ctx = useContext(GameDataContext);
  if (!ctx) throw new Error('useGameData must be used within a GameDataProvider');
  return ctx;
}
