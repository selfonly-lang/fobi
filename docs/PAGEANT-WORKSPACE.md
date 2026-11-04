# SELF PAGEANT 專案後台

入口：`https://fobi.self.com.tw/backoffice`。Pageant DNS完成後，同一系統也可從 `https://pageant.self.com.tw/backoffice` 使用。

## 管理與角色

沿用 self-ai-core 的已授權 SHE 管理員會員。使用會員 Email／密碼登入；Email 驗證碼模式使用 Supabase Auth，驗證信須包含 `{{ .Token }}` 才可直接填碼。請勿建立共享密碼。

平台 owner 可以建立賽事及授權既有 core 會員 UUID。每個專案可分派 manager、editor、reviewer、viewer。一般會員或其他專案成員不會自動取得權限。帳號需先建立於既有 SHE 會員服務；這個後台不開放自行註冊為管理員。

登入憑證僅存 Secure HttpOnly SameSite=Lax cookie。所有變更要求相同 Origin，資料庫不授予 anon/authenticated 直接讀寫權。Edge Function以 Auth getUser 驗證，再查平台及專案角色。管理入口不被搜尋索引。

## 專案流程

建立新賽事會以同一交易建立專案與 27 項工作，分屬企劃、招募、培訓、曝光、票務、贊助、媒體、現場及結案九階段。可管理負責人、期限、狀態、檢查清單、相依任務及成果紀錄，支援搜尋、篩選、CSV匯出。招募、訓練、贊助、日程、媒體及結案各有專屬欄位。

FOBI 2026 是已封存的第一個專案。歷史任務未因活動已結束而自動標記完成，團隊應依紀錄回填。22篇新聞及21個合作品牌已匯入。舊訂單／票券唯讀，ECPay交易結果及付款回呼不變動。新賽事的票務工作流程可規劃票種、支付、核銷與退費，但本次沒有為新賽事另開金流商店或自動開賣。

## 新聞操作

1. 選擇賽事，新增新聞，填寫標題、固定英文slug、摘要、署名、分類、品牌及內文。
2. 加入圖片網址、圖說與來源；圖片庫上傳支援12MB內JPG／PNG／WebP。新素材在私人bucket，公開新聞實際引用且到期後才能取得公開圖片。
3. 儲存草稿，開啟私人預覽。修改已刊新聞時，讀者仍看到原公開快照。
4. 編輯送審；owner、manager或reviewer核准後立即發布或指定未來時間。
5. 排程透過公開讀取時選取已到期的核准快照生效，不依賴外部cron。原公開稿在指定時間前持續可見。排程後再儲存草稿會取消尚未生效的排程。
6. 下架清除公開快照及排程，原URL回404；版本還原只建立草稿。

版本、操作者及變更記錄保存在資料庫。樂觀鎖定避免覆蓋他人修改。公開內容由Vercel伺服器渲染，含Open Graph與NewsArticle JSON-LD，內容以純文字段落輸出並跳脫HTML。沒有建立AI虛構訪問或重加已移除的通用編輯說明。

此新聞發佈功能刊登網站；Facebook／LINE可複製新聞與連結，外部渠道的刊登連結可記在「媒體曝光」。本次未建立Facebook或LINE自動代發金鑰及排程。

## 來源與部署

- 工作區：`src/backoffice.jsx`、`src/backoffice.css`。
- 同源API／安全cookie：`api/workspace.js`。
- 公開新聞SSR：`api/news.js`、`lib/news-render.js`。
- 權限、資料存取與圖片簽章：`supabase/functions/pageant-workspace/`。
- `node scripts/prepare-workspace-import.mjs` 可產生既有新聞、任務與品牌的冪等匯入SQL（不會自動執行）。
- DDL位於 `supabase/migrations/20261104*.sql`；舊靜態新聞來源保留於 `content/news.json`，公開HTML改由CMS產生。
- 舊的Word／ZIP是結案文稿快照；後續CMS修改不會重新產生這些歷史下載檔。
- 請勿再次執行舊 `scripts/build-editorial.py` 並發布其輸出，避免重新產生會繞過下架控制的靜態新聞頁。
- GitHub `selfonly-lang/fobi` 的 main 由既有Vercel FOBI專案自動部署；兩個網域共用同一應用。

Pageant網域目前的權威DNS在Bluehost，需新增 `pageant CNAME e1c23e08ad28549c.vercel-dns-016.com`。Vercel已綁定網域，DNS生效前以FOBI入口使用。

## 驗證

`node --test tests/workspace.test.js`；`npm run build`。另已用臨時會員實測專案建立、角色隔離、草稿保密、版本衝突、審核、排程及還原。臨時帳號／專案測完刪除，未寄送驗證信或建立付款。
