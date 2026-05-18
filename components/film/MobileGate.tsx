'use client';

/**
 * MobileGate — shown to mobile visitors after EntryCeremony.
 *
 * Self-contained DOM component (no R3F, no ModeMachine deps).
 * Two choices:
 *   1. "Copy desktop link" — writes current URL to clipboard (silent fail if unavailable)
 *   2. "Watch the 90-second cut" — dismisses gate, loads the auto-mode Canvas
 */
export function MobileGate({ onContinue90s }: { onContinue90s: () => void }) {
  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  };

  return (
    <div data-testid="mobile-gate" className="fixed inset-0 bg-black flex flex-col items-center justify-center px-8 text-white font-serif z-50">
      <h2 className="text-xl mb-4 tracking-widest text-center max-w-md leading-relaxed">
        For the full piece, please return on desktop.
      </h2>
      <p className="text-sm mb-12 text-white/60 text-center max-w-md leading-relaxed">
        This version is built for a wide screen, headphones, and slow scrolling.
      </p>
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={handleCopyLink}
          className="px-6 py-3 border border-white/30 hover:border-white/70 transition-colors"
        >
          Copy desktop link
        </button>
        <button
          type="button"
          onClick={onContinue90s}
          className="px-6 py-3 text-white/60 hover:text-white transition-colors text-sm"
        >
          Watch the 90-second cut
        </button>
      </div>
    </div>
  );
}
