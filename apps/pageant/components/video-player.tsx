"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { videoEmbed } from "@/lib/domain";
import type { Media } from "@/lib/types";
export function VideoPlayer({ media }: { media: Media }) {
  const [url, setUrl] = useState<string | null>(
      media.provider === "self"
        ? null
        : videoEmbed(media.provider, media.external_id),
    ),
    [error, setError] = useState("");
  useEffect(() => {
    if (media.provider === "cloudflare")
      api<{ ok: boolean; url: string }>("video-playback", undefined, {
        id: media.id,
      })
        .then((d) => setUrl(d.url))
        .catch((e) => setError(e.message));
  }, [media.id, media.provider]);
  if (media.provider === "self") {
    const allowed =
      media.external_id === "/media/fobi-trance-logo-90s-16x9.mp4";
    return allowed ? (
      <video
        className="player-frame"
        controls
        playsInline
        preload="metadata"
        poster={media.poster}
        src={media.external_id}
      >
        <track kind="captions" />
        <p>您的瀏覽器不支援影片播放。</p>
      </video>
    ) : (
      <div className="alert">此影片來源尚未確認。</div>
    );
  }
  if (error)
    return (
      <div className="alert" role="alert">
        {error}
      </div>
    );
  return url ? (
    <iframe
      className="player-frame"
      src={url}
      title={media.title}
      allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  ) : (
    <div
      className="player-frame"
      style={{ display: "grid", placeItems: "center", color: "#ddd" }}
    >
      正在準備影片…
    </div>
  );
}
