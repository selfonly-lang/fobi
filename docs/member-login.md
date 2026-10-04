# FOBI 己美會員快速填表

訂單表單內提供 Google、LINE、Facebook、Apple；四者經由己美既有 `/oauth/authorize` 與 `/auth?connection=…` 流程處理，不建立第二套會員資料庫。

## 開通必要設定

在己美原有專案 `llyjfsxpdylaejqlcyac` 註冊 client_id 為 `fobi_checkout` 的專屬 FOBI confidential OAuth client，精確 redirect URI 為：

`https://fobi.self.com.tw/api/member?action=callback`

設定 `auto_approve=false` 保留己美授權畫面。FOBI 只請求 `contact` scope：既有 userinfo 基本回應含姓名與 Email，contact 另提供手機；FOBI 服務端僅輸出 name、phone、email，丟棄其他欄位。SELF 端的配套分支 `codex/fobi-contact-oauth` 限制此 client 的 userinfo 回應僅傳三個欄位，授權回應與 callback 僅傳 code、state，不附姓名、Email、識別碼或 token。

將 `SELF_OAUTH_CLIENT_ID` 與 `SELF_OAUTH_CLIENT_SECRET` 加到 Vercel fobi 的 Production 環境。密鑰至少 32 字元，由管理員安全產生與儲存，不提交 Git、不回傳前端、不輸出日誌。先合併並部署 SELF 配套的前端與 oauth-authorize、oauth-token、oauth-userinfo functions，再將 `SELF_OAUTH_ENABLED=true`，重新部署 FOBI 已合併的 PR commit 後啟用。未設定時 `/api/member` 回傳 unavailable，四個按鍵停用，手動建立訂單仍可使用。

## 資料與流程

服務端交換 authorization code；PKCE S256、隨機 state、10 分鐘驗證期限。加密 HttpOnly Secure host-only cookie，不使用跨子網域 cookie。token 不送到瀏覽器、不保存；聯絡資料 cookie 5 分鐘後失效，帶入後清除。回傳僅三個欄位，姓名或手機缺少時須使用者補填。

登入前暫存本分頁表單，包含方案、國家、人數及聯絡欄位，10 分鐘到期；返回或建立訂單後清除。跨站 URL 不放聯絡資料。Callback 忽略 SELF 前端附帶的未驗證 self_name 等 query 值，僅使用正式 userinfo 回應。

未使用會員登入的填表者送出有效表單時會看到獨立詢問。選擇不註冊繼續建立訂單；選擇註冊則另開己美登入／註冊頁，由使用者自行選擇註冊及確認。FOBI 不自動新增、合併或修改會員，也不把訂單表單資料傳給註冊頁。無法僅凭姓名、手機、Email 判定是否已是會員，因此不做帳號存在查詢。

## 驗收

`node --test tests/member.test.js`、`npm run build`。需在 client 註冊與 Vercel 設定完成後，使用經同意的測試會員分別驗證四種 provider、授權取消、缺少手機、VIP 方案與國家保存、下單前註冊選擇及正式回站；未完成這些項目不得宣稱快速登入已開通。不要用正式購買或建立會員記錄作為未經同意的測試。

目前管理權限阻塞：連接的 Supabase MCP 無權讀取該專案；登入中的 Supabase Dashboard 亦顯示 “You do not have access to this project”。不得用其他 Supabase 專案替代。
