// Dashboard: live camera capture + result card.
// The camera UI is implemented in Phase 4 — this is the Phase 3 placeholder.
export default function Dashboard() {
  return (
    <section className="card">
      <div className="card-head">
        <h2>Dashboard</h2>
        <p className="muted">
          Capture a candled egg and predict its incubation day with the trained
          YOLO classifier.
        </p>
      </div>

      <div className="state state-empty">
        <p>Camera capture and the AI result card arrive in Phase 4.</p>
      </div>
    </section>
  )
}
