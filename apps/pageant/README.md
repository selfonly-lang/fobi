# SELF PAGEANT v3

Next.js／React 選美時尚媒體、中央會員及活動專案工作室。正式品牌依 Host 與審核過的品牌登記選擇，未知 Host 回傳 404。

## 本地執行

Node.js 24，於此資料夾執行 `npm ci`、`npm run dev`（4200）。`npm run build` 會從 repository 根目錄的 public 複製 FOBI 真實影像、舊新聞下載與影片，保留原路徑。不要重複提交這些建置輸出。`npm test`、`npm run typecheck` 驗證安全工具及型別。

Vercel 設定：rootDirectory `apps/pageant`、framework nextjs、install `npm ci`、build `npm run build`、Node24、允許讀取根目錄以外的原始檔，函式東京。`pageant.self.com.tw` 主平台；`fobi.self.com.tw` 保留原 Vercel project，避免搬移原有不可匯出的 OAuth secret。未驗證的新品牌先使用 `/preview/{brandSlug}`。

## 入口與內容

- 前台：`/news`、`/events`、`/tv`、`/publications`。新聞與會刊採公開快照，修改草稿不影響既有公開版本。
- 會員：`/login`、`/account`、`/create`、`/checkout?activity={id}`。僅 HttpOnly／Secure host-only Cookie，中央會員不使用跨子網域 Cookie。
- 後台：`/studio`，五組工作區、平台設定、團隊角色及一次性邀請。FOBI2026 為第一個結案專案；2027 台灣小姐為第二個籌備專案。
- FOBI 舊路徑：`/Fobi`、`/Fobi/records`、`/news/downloads`、原新聞 slug、原素材及影片保持可讀；舊售票與派對頁轉至結案官網。原 Supabase 金流 callback 不變。

## 服務與權限

服務 API 為 `pageant-core`。公開 catalog 只回傳已審核公開的專案及有效新聞／會刊／影片快照。所有私人寫入以核心 Auth 身分及專案角色檢查。資料表不向 anon/authenticated 直接開放，service_role 僅在 Edge Function。

- 角色：平台管理員、專案經理、編輯、審核員、唯讀、評審、財務、核銷。評審只看自己的個別評分；僅平台財務可實際退款及記錄撥款。
- 付款：金額、條款、費率及名額由資料庫鎖定產生；ECPay CheckMac／商店編號／金額驗證後才出票，重送冪等。禁止 stage 模式假冒正式付款。逾期付款且額滿／活動關閉時保留票券並送退款處理，不超賣可用票。
- 退款：指定未使用票券先保留，核准後再執行退款。回覆不明時保持 processing，必須核對商店後台，不盲目重送。部分退款及服務費沖銷可重入；人工退款／撥款／發票須實際號碼或參考編號及憑證。
- 發布：網站審核、排程與版本復原；社群先入 queue。專案端送平台審核，平台核准後五分鐘 cron 執行。LINE 使用重試鍵；Facebook 回覆不明標示 unknown，避免自動重發。已送出工作不再重複推播。公開快照變更時取消舊發布工作。
- 圖片上傳私人 bucket，授權預覽限時有效；僅有效公開內容引用的圖可公開讀取。照片與財務憑證不得混用推定。

## 安全設定與目前限制

既有部署查核（2026-11-04）：核心後台未發現 OpenAI、Cloudflare Stream、正式綠界、Facebook、LINE 推播的可用設定。功能不偽造成功；手動企劃、真實影片播放及網站新聞仍可操作。下列名稱只填安全後台，勿放前端或 Git：

- `OPENAI_API_KEY`（沿用 SELF 既有值若存在）、可選 `PAGEANT_OPENAI_MODEL`（預設 gpt-5-mini）。
- `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_STREAM_API_TOKEN`。
- `ECPAY_MERCHANT_ID`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV`、`ECPAY_MODE=production`。
- `PAGEANT_FACEBOOK_PAGE_ID`、`PAGEANT_FACEBOOK_PAGE_TOKEN`、`PAGEANT_LINE_CHANNEL_TOKEN`。
- 可選固定 `PAGEANT_TICKET_SECRET`；不得在已出票後任意輪替。

金流還須於平台設定確認商店允許代收與主辦結算，設定票券／課程／贊助費率及條款，再啟用收款；初始停用，沒有預設真實扣款比例。

SELF 主會員專案 `llyjfsxpdylaejqlcyac` 目前無管理權限。FOBI 既有 client 僅允許 contact scope，而且 userinfo 刻意不回傳穩定 sub，不可用 email 或姓名冒充會員統一。已備妥 PKCE／one-time grant 橋接，但須先由 SELF 後台開通明確 profile 身分授權（只需穩定 sub 與顯示名稱），保留 consent，再於兩個 Vercel project 設定 `SELF_PAGEANT_IDENTITY_ENABLED=true` 並重部署。此設定前，SELF／LINE 按鈕顯示準備中，既有 SHE 帳密／驗證碼可登入。不能擅自放寬原 contact 授權；原 OAuth secret 留在 FOBI project。

第三方金鑰、SSO 與 DNS 未就緒不影響官網公開閱讀。新品牌需先於 Vercel 綁定、設定 DNS 及有效 HTTPS，再於品牌設定點選「驗證並啟用」。

## 驗證與回復

已有私人 QA 帳號測試56項API、13項資料庫交易（rollback）及5項安全單元測試；QA資料需在部署驗收後移除。正式退款／真實扣款／外部推播沒有作為測試執行。用瀏覽器另外驗證桌機、390px手機、後台儲存、新聞圖片及41頁中文PDF下載。

切換前保留舊 Vercel project 設定與正式 deployment ID；新 app preview 確認後才變更 production domain/root。回復時將舊 deployment 重新指派原網域；新增資料表不影響舊系統，避免對歷史FOBI訂單作破壞性遷移。
