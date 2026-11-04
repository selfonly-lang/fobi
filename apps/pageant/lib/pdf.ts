import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Publication } from "./types";
const W = 595.28,
  H = 841.89,
  LEFT = 48,
  RIGHT = W - 48;
const ink = rgb(0.22, 0.2, 0.16),
  gold = rgb(0.59, 0.47, 0.29),
  muted = rgb(0.54, 0.49, 0.41);
function localPhoto(url: string) {
  try {
    const u = new URL(url, "https://fobi.self.com.tw");
    if (
      ![
        "fobi.self.com.tw",
        "pageant.self.com.tw",
        "misstaiwan.self.com.tw",
      ].includes(u.hostname) ||
      !/^\/editorial\/event-records\/[a-zA-Z0-9_-]+\.(jpg|png)$/.test(
        u.pathname,
      )
    )
      return null;
    const p = path.join(process.cwd(), "public", u.pathname);
    if (!fs.existsSync(p) || fs.statSync(p).size > 1500000) return null;
    return { bytes: fs.readFileSync(p), png: u.pathname.endsWith(".png") };
  } catch {
    return null;
  }
}
async function renderBook(book: Publication, maxPhotos: number) {
  const doc = await PDFDocument.create(); // Plain Traditional Chinese and Latin text uses direct glyph metrics; WOFF decompression is avoided with a static TTF.
  doc.registerFontkit({
    create: (bytes: Uint8Array) => {
      const f = fontkit.create(bytes);
      f.layout = ((value: string) => ({
        glyphs: Array.from(value).map((char) =>
          f.glyphForCodePoint(char.codePointAt(0)!),
        ),
      })) as typeof f.layout;
      return f;
    },
  });
  const font = await doc.embedFont(
    fs.readFileSync(
      path.join(process.cwd(), "public/fonts/SELFPageantTC-Regular.ttf"),
    ),
    { subset: true },
  );
  doc.setTitle(book.publication.title);
  doc.setAuthor("SELF PAGEANT・醫見傳媒");
  doc.setSubject(book.publication.description || "");
  const widths = new Map<string, number>();
  let page: PDFPage = doc.addPage([W, H]),
    y = H - 60;
  const p = book.publication;
  const newPage = () => {
    page = doc.addPage([W, H]);
    y = H - 55;
    page.drawText("SELF PAGEANT · THE OFFICIAL PUBLICATION", {
      x: LEFT,
      y,
      font,
      size: 7,
      color: gold,
    });
    y -= 35;
  };
  const width = (char: string, size: number) => {
    const key = size + char;
    let w = widths.get(key);
    if (w === undefined) {
      w = font.widthOfTextAtSize(char, size);
      widths.set(key, w);
    }
    return w;
  };
  const text = (value: string, size = 10, leading = 18, color = ink) => {
    for (const paragraph of String(value || "")
      .replace(/[\x00-\x08\x0B-\x1F]/g, "")
      .split("\n")) {
      let line = "",
        lineWidth = 0;
      const flush = () => {
        if (y < 60) newPage();
        if (line) page.drawText(line, { x: LEFT, y, font, size, color });
        y -= leading;
        line = "";
        lineWidth = 0;
      };
      for (const char of paragraph) {
        const w = width(char, size);
        if (line && lineWidth + w > RIGHT - LEFT) flush();
        line += char;
        lineWidth += w;
      }
      flush();
    }
    y -= 6;
  };
  page.drawRectangle({
    x: 0,
    y: 0,
    width: W,
    height: H,
    color: rgb(0.95, 0.92, 0.86),
  });
  text("SELF PAGEANT · THE OFFICIAL PUBLICATION", 8, 16, gold);
  y -= 95;
  text(p.title, 25, 43, ink);
  y -= 20;
  text(p.description || "", 11, 22, muted);
  y = 95;
  text("發布版本 " + p.version + " ｜ 線上完整影像與原始來源", 9, 17, gold);
  text("https://pageant.self.com.tw/publications/" + book.slug, 7, 14, muted);
  for (let i = 0; i < p.chapters.length; i++) {
    const c = p.chapters[i];
    newPage();
    text("CHAPTER " + String(i + 1).padStart(2, "0"), 8, 17, gold);
    text(c.heading, 17, 29, ink);
    if (i < maxPhotos && c.photo) {
      const file = localPhoto(c.photo);
      if (file) {
        try {
          const image = file.png
              ? await doc.embedPng(file.bytes)
              : await doc.embedJpg(file.bytes),
            scale = Math.min((RIGHT - LEFT) / image.width, 200 / image.height),
            h = image.height * scale,
            w = image.width * scale;
          if (y - h < 65) newPage();
          page.drawImage(image, {
            x: LEFT + (RIGHT - LEFT - w) / 2,
            y: y - h,
            width: w,
            height: h,
          });
          y -= h + 12;
        } catch {
          /* Keep the original caption when an image cannot be embedded. */
        }
      }
    }
    if (c.caption) text(c.caption, 7, 13, muted);
    for (const para of c.paragraphs) if (para) text(para, 10, 18, ink);
  }
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    pages[i].drawText("SELF PAGEANT · " + (i + 1) + " / " + pages.length, {
      x: LEFT,
      y: 28,
      font,
      size: 7,
      color: gold,
    });
  }
  return Buffer.from(await doc.save({ useObjectStreams: true }));
}
export async function publicationPdf(book: Publication) {
  let data = await renderBook(book, 6);
  if (data.length > 4000000) data = await renderBook(book, 1);
  if (data.length > 4000000) data = await renderBook(book, 0);
  return data;
}
