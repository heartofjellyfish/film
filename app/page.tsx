/**
 * Entry point — placeholder until FilmRoot is implemented in module 01.
 * Renders a black screen with a loading indicator so `npm run dev` doesn't 404.
 */
export default function Page() {
  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'serif',
        letterSpacing: '0.1em',
        fontSize: '0.875rem',
      }}
    >
      <span>水母之心 · prototype bootstrapping…</span>
    </main>
  );
}
