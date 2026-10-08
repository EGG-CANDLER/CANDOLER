export default function ImageModal({ item, onClose }) {
  if (!item) return null

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal-box">
        <button
          className="modal-close"
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <img src={item.image_url} alt={`Egg ${item.id}`} />
        <div className="modal-caption">
          ID {item.id} · {item.predicted_day || 'Uncertain'} · {item.date}{' '}
          {item.time}
        </div>
      </div>
    </div>
  )
}
