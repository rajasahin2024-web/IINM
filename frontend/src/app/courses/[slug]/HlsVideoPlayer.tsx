"use client";
import React, { useEffect, useRef, useState } from "react";

interface HlsVideoPlayerProps {
  src: string;          // raw mp4 URL (fallback)
  hlsUrl?: string;      // HLS master playlist URL (if available)
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;      // start muted (for browser-allowed muted autoplay)
  onEnded?: () => void; // fired when playback finishes (for playlist auto-advance)
  className?: string;
}

interface QualityLevel {
  index: number;
  label: string;        // e.g. "1080p"
}

const SPEED_OPTIONS = [0.5, 1, 1.25, 1.5, 2];

/**
 * Video player that uses HLS.js for adaptive bitrate streaming when an
 * hls_url is available. Falls back to native <video> with raw mp4 src.
 *
 * - Safari/iOS: plays HLS natively via <video src="...m3u8"> (no hls.js needed)
 * - Chrome/Firefox/Edge: uses hls.js to attach the m3u8 to the <video> element
 * - No hls_url: plain <video src="...mp4"> (progressive download)
 *
 * Extras:
 * - Muted start with a "Tap to unmute" overlay (browser-allowed autoplay)
 * - Quality selector (hls.js levels only; hidden on native HLS / raw fallback)
 * - Playback speed selector
 * - onEnded callback for playlist auto-advance
 *
 * The <video> element always fills its container (width/height 100%,
 * object-fit: contain) — wrap it in an aspect-ratio box for correct sizing.
 */
export default function HlsVideoPlayer({
  src,
  hlsUrl,
  poster,
  autoPlay,
  muted,
  onEnded,
  className,
}: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(!!muted);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = Auto
  const [speed, setSpeed] = useState(1);
  const [openMenu, setOpenMenu] = useState<"quality" | "speed" | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setError(null);
    setLevels([]);
    setCurrentLevel(-1);
    setOpenMenu(null);

    // Apply initial muted state
    video.muted = !!muted;
    setIsMuted(!!muted);

    // Sound-first autoplay: try playing WITH sound. Browsers block sound
    // autoplay until the user has interacted with the page, so on rejection
    // fall back to muted autoplay and show the "Tap to unmute" overlay.
    //
    // Additionally, once muted playback starts, listen for the user's FIRST
    // interaction anywhere on the page (click/tap/keypress) and unmute
    // automatically — unmuting an already-playing video is allowed by
    // browsers, so sound comes on as soon as the visitor does anything.
    let autoUnmute: (() => void) | null = null;
    const setupAutoUnmute = () => {
      if (autoUnmute) return;
      autoUnmute = () => {
        const v = videoRef.current;
        if (v && v.muted) {
          v.muted = false;
          setIsMuted(false);
        }
        const handler = autoUnmute;
        if (handler) {
          document.removeEventListener("pointerdown", handler);
          document.removeEventListener("touchstart", handler);
          document.removeEventListener("keydown", handler);
        }
        autoUnmute = null;
      };
      document.addEventListener("pointerdown", autoUnmute);
      document.addEventListener("touchstart", autoUnmute);
      document.addEventListener("keydown", autoUnmute);
    };

    const tryAutoplay = () => {
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        setupAutoUnmute();
        video.play().catch(() => { /* even muted autoplay blocked — user presses play */ });
      });
    };

    if (!hlsUrl) {
      // No HLS — use raw mp4 src (already set on <video> element)
      if (autoPlay) tryAutoplay();
      return;
    }

    // Check if browser supports native HLS (Safari, iOS)
    const canPlayNative = video.canPlayType("application/vnd.apple.mpegurl");
    if (canPlayNative) {
      // Native HLS support — set src directly (no level control API)
      video.src = hlsUrl;
      if (autoPlay) tryAutoplay();
      return;
    }

    // Use hls.js for browsers without native HLS support
    let cancelled = false;
    import("hls.js").then((HlsModule) => {
      if (cancelled || !video) return;
      const Hls = HlsModule.default;

      if (!Hls.isSupported()) {
        // Fallback to raw src
        setError("HLS not supported in this browser, using direct playback");
        return;
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        // Buffering tuning: keep a healthy forward buffer and start ABR with a
        // reasonable bandwidth estimate so playback begins at a watchable
        // quality instead of always ramping up from the lowest rendition.
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        capLevelToPlayerSize: true,
        abrEwmaDefaultEstimate: 1_000_000,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_e: any, data: any) => {
        // Build quality list from available levels (height-based labels)
        const parsed: QualityLevel[] = (data?.levels || [])
          .map((lvl: any, idx: number) => ({
            index: idx,
            label: lvl.height ? `${lvl.height}p` : `${Math.round((lvl.bitrate || 0) / 1000)}k`,
          }))
          // Reverse so highest quality appears first in the menu
          .reverse();
        setLevels(parsed);
        if (autoPlay) tryAutoplay();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e: any, data: any) => {
        setCurrentLevel(data?.level ?? -1);
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              hlsRef.current = null;
              setError("Video playback error. Please try again.");
              break;
          }
        }
      });
    }).catch(() => {
      setError("Failed to load video player");
    });

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // Remove pending auto-unmute listeners on unmount/re-run
      if (autoUnmute) {
        document.removeEventListener("pointerdown", autoUnmute);
        document.removeEventListener("touchstart", autoUnmute);
        document.removeEventListener("keydown", autoUnmute);
        autoUnmute = null;
      }
    };
  }, [hlsUrl, src, autoPlay, muted]);

  // Buffering spinner (native + hls.js paths)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);
    return () => {
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, []);

  // Close settings menus when clicking anywhere else
  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openMenu]);

  const unmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setIsMuted(false);
    // If autoplay was blocked entirely (some browsers), start playback now —
    // this click is a user gesture so sound is allowed.
    if (video.paused) video.play().catch(() => {});
  };

  const selectQuality = (idx: number) => {
    setCurrentLevel(idx);
    if (hlsRef.current) hlsRef.current.currentLevel = idx;
    setOpenMenu(null);
  };

  const selectSpeed = (rate: number) => {
    setSpeed(rate);
    const video = videoRef.current;
    if (video) video.playbackRate = rate;
    setOpenMenu(null);
  };

  const activeLevelLabel = currentLevel === -1
    ? "Auto"
    : (levels.find(l => l.index === currentLevel)?.label || "Auto");

  return (
    <>
      {error && (
        <div style={{
          position: "absolute", top: 8, left: 8, zIndex: 10,
          background: "rgba(230,57,70,0.95)", color: "#fff",
          padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
        }}>
          {error}
        </div>
      )}
      {buffering && !error && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            width: 44, height: 44, borderRadius: "50%",
            border: "4px solid rgba(255,255,255,0.25)", borderTopColor: "#fff",
            animation: "hls-spin 0.8s linear infinite", display: "inline-block",
          }} />
        </div>
      )}

      {/* ── Muted autoplay overlay: tap to unmute ── */}
      {isMuted && !error && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); unmute(); }}
          style={{
            position: "absolute", top: 10, left: 10, zIndex: 8,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0,0,0,0.65)", color: "#fff",
            border: "1px solid rgba(255,255,255,0.3)", borderRadius: 999,
            padding: "6px 14px", fontSize: 12.5, fontWeight: 600,
            cursor: "pointer", backdropFilter: "blur(4px)",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.85)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.65)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
            <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
          </svg>
          Tap to unmute
        </button>
      )}

      {/* ── Settings controls: quality + speed (top-right) ── */}
      {!error && (
        <div
          style={{ position: "absolute", top: 10, right: 10, zIndex: 8, display: "flex", gap: 6 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Quality selector — only when hls.js exposes levels */}
          {levels.length > 1 && (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === "quality" ? null : "quality"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(0,0,0,0.65)", color: "#fff",
                  border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8,
                  padding: "6px 10px", fontSize: 11.5, fontWeight: 600,
                  cursor: "pointer", backdropFilter: "blur(4px)",
                }}
                title="Video quality"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                {activeLevelLabel}
              </button>
              {openMenu === "quality" && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10,
                    minWidth: 110, overflow: "hidden", padding: 4,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => selectQuality(-1)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: currentLevel === -1 ? "rgba(255,255,255,0.15)" : "transparent",
                      color: "#fff", border: "none", borderRadius: 6,
                      padding: "7px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Auto
                  </button>
                  {levels.map(l => (
                    <button
                      key={l.index}
                      type="button"
                      onClick={() => selectQuality(l.index)}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        background: currentLevel === l.index ? "rgba(255,255,255,0.15)" : "transparent",
                        color: "#fff", border: "none", borderRadius: 6,
                        padding: "7px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Speed selector */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === "speed" ? null : "speed"); }}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                background: "rgba(0,0,0,0.65)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8,
                padding: "6px 10px", fontSize: 11.5, fontWeight: 600,
                cursor: "pointer", backdropFilter: "blur(4px)",
              }}
              title="Playback speed"
            >
              {speed}×
            </button>
            {openMenu === "speed" && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0,
                  background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10,
                  minWidth: 84, overflow: "hidden", padding: 4,
                }}
              >
                {SPEED_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => selectSpeed(s)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      background: speed === s ? "rgba(255,255,255,0.15)" : "transparent",
                      color: "#fff", border: "none", borderRadius: 6,
                      padding: "7px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {s}×{s === 1 ? " (normal)" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={hlsUrl ? undefined : src}
        controls
        preload="auto"
        playsInline
        autoPlay={autoPlay}
        muted={muted}
        poster={poster || undefined}
        onEnded={onEnded}
        className={className}
        style={{
          width: "100%", display: "block",
          objectFit: "contain", background: "#000",
        }}
      />
      <style>{`@keyframes hls-spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }`}</style>
    </>
  );
}
