function LoadingScreen({ message = 'Loading the duel board...' }) {
  return (
    <section className="state-panel state-panel--loading">
      <div className="spinner" aria-hidden="true"></div>
      <p>{message}</p>
    </section>
  )
}

export default LoadingScreen
