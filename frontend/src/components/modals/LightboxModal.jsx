export default function LightboxModal({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="modal-backdrop" style={{ zIndex: 2000, cursor: 'zoom-out' }} onClick={onClose}>
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} style={{ position: 'absolute', top: -16, right: -16, zIndex: 10 }}>
          <i className="fa-solid fa-xmark"></i>
        </button>
        <img src={src} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 16, boxShadow: '0 20px 80px rgba(0,0,0,0.8)' }} />
      </div>
    </div>
  );
}
