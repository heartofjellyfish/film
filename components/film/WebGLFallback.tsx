/**
 * WebGLFallback — shown when the browser does not support WebGL 2.
 *
 * Renders a bilingual message (中文 / English) and placeholder platform links.
 * No canvas, no R3F, no audio — pure DOM.
 *
 * Spec §3.8.2: "黑屏 + 文字 + 一个平台链接占位"
 */
'use client';

export function WebGLFallback() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'serif',
        padding: '2rem',
        textAlign: 'center',
        gap: '1.5rem',
      }}
    >
      <h1
        style={{
          fontSize: '1rem',
          fontWeight: 300,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          opacity: 0.9,
          marginBottom: '0.5rem',
        }}
      >
        THE HEART OF THE JELLYFISH
      </h1>

      <p
        style={{
          fontSize: '0.875rem',
          lineHeight: 2,
          opacity: 0.7,
          maxWidth: '28rem',
        }}
      >
        本站需要 WebGL 2，请用最新版 Chrome / Safari / Firefox
        <br />
        This site requires WebGL 2. Please use the latest Chrome, Safari, or Firefox.
      </p>

      <p
        style={{
          fontSize: '0.75rem',
          opacity: 0.45,
          marginTop: '0.5rem',
        }}
      >
        音乐即将上线 / Music coming soon
      </p>

      {/* Placeholder platform links — real URLs to be filled once album releases */}
      <a
        href="#"
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          textDecoration: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          paddingBottom: '1px',
        }}
      >
        Spotify · Apple Music · 网易云音乐 (coming soon)
      </a>
    </div>
  );
}
