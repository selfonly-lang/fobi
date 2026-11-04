"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client-api";
import { PrivateImage } from "@/components/private-image";
import { useMember, LoadingMember, PrivateHeader } from "@/components/session";
import type { Doc } from "@/components/editors";
function Preview() {
  const { member, loading, error: loadError } = useMember(),
    params = useSearchParams(),
    [a, setA] = useState<Doc | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (member && params.get("article"))
      api("article-get", undefined, { id: params.get("article")! })
        .then((d) => setA(d.article))
        .catch((e) => setError(e.message));
  }, [member, params]);
  if (loading || !member) return <LoadingMember error={loadError} />;
  const c = a?.content;
  return (
    <>
      <PrivateHeader />
      <div className="notice">私人草稿預覽，僅限已授權的專案成員。</div>
      {error && <div className="alert">{error}</div>}
      {c && (
        <article className="article-body">
          <h1>{c.title}</h1>
          <p>{c.subtitle}</p>
          <small>
            {c.byline} · v{a?.version}
          </small>
          {c.photos?.map((p: Doc, i: number) => (
            <figure key={i}>
              <PrivateImage url={p.url} alt={p.caption} />
              <figcaption>{p.caption}</figcaption>
            </figure>
          ))}
          {[...(c.facts || []), ...(c.perspective || [])].map(
            (s: string, i: number) => (
              <p key={i}>{s}</p>
            ),
          )}
          {c.sections.map((s: Doc, i: number) => (
            <section key={i}>
              <h2>{s.heading}</h2>
              {s.paragraphs.map((p: string, n: number) => (
                <p key={n}>{p}</p>
              ))}
            </section>
          ))}
          {c.closing?.map((p: string, i: number) => (
            <p key={i}>{p}</p>
          ))}
        </article>
      )}
    </>
  );
}
export default function Page() {
  return (
    <Suspense>
      <Preview />
    </Suspense>
  );
}
