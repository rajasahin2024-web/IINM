"use client";
import React, { useEffect, useRef, useState } from "react";

interface HlsVideoPlayerProps {
  src: string;          // raw mp4 URL (fallback)
  hlsUrl?: string;      // HLS master playlist URL (if available)
  poster?: string;
  autoPlay?: boolean;
  className?: string;
}

/**
 * Video player that uses HLS.js for adaptive bitrate streaming when an
 * hls_url is available. Falls back to native <video> with raw mp4 src.
 *
 * - Safari/iOS: plays HLS natively via <video src="...m3u8"> (no hls.js needed)
 * - Chrome/Firefox/Edge: uses hls.js to attach the m3u8 to the <video> element
 * - No hls_url: plain <video src="...mp4"> (progressive download)
 */
export default function HlsVideoPlayer({
  src,
  hlsUrl,
  poster,
  autoPlay,
  className,
}: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setError(null);

    if (!hlsUrl) {
      // No HLS — use raw mp4 src (already set on <video> element)
      return;
    }

    // Check if browser supports native HLS (Safari, iOS)
    const canPlayNative = video.canPlayType("application/vnd.apple.mpegurl");
    if (canPlayNative) {
      // Native HLS support — set src directly
      video.src = hlsUrl;
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
      });
      hlsRef.current = hls;

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
    };
  }, [hlsUrl, src]);

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
      <video
        ref={videoRef}
        src={hlsUrl ? undefined : src}
        controls
        preload="metadata"
        playsInline
        autoPlay={autoPlay}
        poster={poster || undefined}
        className={className}
      />
    </>
  );
}
