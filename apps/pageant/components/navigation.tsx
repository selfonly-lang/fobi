"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowUpRight, UserRound, Plus, Globe2 } from "lucide-react";
import type { Site } from "@/lib/types";
import { PLATFORM } from "@/lib/domain";
export function Navigation({ site }: { site: Site }) {
  const [open, setOpen] = useState(false);
  const brand = site.kind === "brand";
  const links = brand
    ? [
        ["/#about", "賽事介紹"],
        ["/#stories", "新聞影音"],
        ["/#partners", "合作夥伴"],
        ["/#archive", "成果與會刊"],
      ]
    : [
        ["/news", "選美誌"],
        ["/events", "賽事與課程"],
        ["/tv", "BeautyTV"],
        ["/publications", "電子會刊"],
      ];
  return (
    <>
      <div className="topline">
        <span>
          {brand
            ? "AN INTERNATIONAL STAGE · TAIWAN"
            : "THE WORLD OF PAGEANTS, PEOPLE & POSSIBILITIES"}
        </span>
        <a href={brand ? PLATFORM : PLATFORM + "/events"}>
          {brand ? "SELF PAGEANT 平台" : "全球選美 · 台灣視角"}{" "}
          <Globe2 size={12} />
        </a>
      </div>
      <header className="masthead">
        <div className="nav-inner">
          <Link
            href="/"
            className={"wordmark " + (brand ? "brand-wordmark" : "")}
            aria-label={site.name + "首頁"}
          >
            {brand ? (
              <>
                <span>{site.wordmark}</span>
                <small>
                  {site.slug === "fobi"
                    ? "INTERNATIONAL · 世界美顏小姐"
                    : "台灣小姐 · TAIWAN"}
                </small>
              </>
            ) : (
              <>
                <span>
                  SELF <i>PAGEANT</i>
                  <b>®</b>
                </span>
                <small>THE BEAUTY OF EVERY STORY</small>
              </>
            )}
          </Link>
          <nav
            className={open ? "main-nav open" : "main-nav"}
            aria-label="主要導覽"
          >
            {links.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                {label}
              </Link>
            ))}
            {brand && (
              <a className="nav-platform" href={PLATFORM}>
                回到選美平台 <ArrowUpRight size={13} />
              </a>
            )}
          </nav>
          <div className="nav-actions">
            {!brand && (
              <Link href="/create" className="create-link">
                <Plus size={14} />
                建立活動
              </Link>
            )}
            <a
              href={brand ? PLATFORM + "/account" : "/account"}
              className="account-link"
              aria-label="會員中心"
            >
              <UserRound size={19} />
            </a>
            <button
              type="button"
              className="menu-toggle"
              aria-label={open ? "關閉選單" : "開啟選單"}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
