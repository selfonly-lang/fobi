"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
export function PrivateImage({ url, alt }: { url: string; alt: string }) {
  const [src, setSrc] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    setSrc("");
    try {
      const u = new URL(url, location.origin);
      if (u.pathname === "/api/news") {
        api("asset-preview", { path: u.searchParams.get("path") })
          .then((d) => {
            if (active) setSrc(d.url);
          })
          .catch(() => {
            if (active) setError("私人圖片目前無法預覽");
          });
      } else setSrc(url);
    } catch {
      setError("圖片網址格式錯誤");
    }
    return () => {
      active = false;
    };
  }, [url]);
  return src ? (
    <img src={src} alt={alt} />
  ) : (
    <p className="muted">{error || "正在讀取私人圖片…"}</p>
  );
}
