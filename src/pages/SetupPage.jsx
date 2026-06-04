function SetupPage() {
  return (
    <main className="marketing-shell">
      <section className="hero-card hero-card--setup">
        <p className="eyebrow">Setup required</p>
        <h1>Digit Duel is ready for code, but the Supabase keys are not loaded.</h1>
        <p className="hero-copy">
          Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to a local
          `.env.local` file, then restart the dev server. The project already
          includes an `.env.example` and the SQL migration for the database
          schema.
        </p>

        <div className="callout-grid">
          <article className="callout-card">
            <h2>1. Environment</h2>
            <p>
              Use the values from the project brief for the Vite environment
              variables.
            </p>
          </article>

          <article className="callout-card">
            <h2>2. Database</h2>
            <p>
              Run the SQL in `supabase/migrations/001_digit_duel_initial.sql`
              inside your Supabase project.
            </p>
          </article>

          <article className="callout-card">
            <h2>3. Auth</h2>
            <p>
              In Supabase Auth, keep the Email provider enabled and disable
              email confirmation if you want username-only sign-in with
              generated `@digitduel.local` emails.
            </p>
          </article>
        </div>
      </section>
    </main>
  )
}

export default SetupPage
