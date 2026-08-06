export default function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Populating game data...</div>
        <div className="loading-subtext">Extracting databases and resources from APK</div>
      </div>
    </div>
  );
}
