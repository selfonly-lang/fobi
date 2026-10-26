# 2026-10-19 18:41 授權後執行結果（最新狀態）

- 已取得明確推送與正式 SQL 套用授權，PR #6：https://github.com/selfonly-lang/fobi/pull/6 。前端仍為隔離 preview，未合併 main。
- 正式資料庫已套用核銷／票權／RPC 權限／ticket_settings RLS 修正並讀回。正式回歸發現舊 fobi_checkins_ticket_once 唯一索引仍限制每票只能核銷一次，已在同一修正範圍改為每票、每權益唯一索引。
- 正式回滾測試：MEMBER 不得走 VIP；MAIN 與 AFTERPARTY 各成功一次，各自重複皆拒絕。VIP1/2/3 每桌均發 10 張；VIP1/2 可參加慶功宴，VIP3 拒絕；VIP 與 MAIN 互斥。全部交易回滾，不保留測試訂單。sequence 仍會遞增，不能將流水號當售票數。
- 2026-10-19 已透過 Gmail 實寄測試信至使用者明確確認的 selfonly@gmail.com。message id：1a153c4e21f64323；Gmail 回傳 SENT、INBOX、UNREAD。信件標示非有效票券，沒有寄給客戶。這證明單封寄送及收件匣到達，不代表付款自動通知已完成。
- Make Gmail 模組查無既有連線。已建立安全授權請求 157332f1-742b-4689-96ca-d87d8d121b60，等待使用者在 Make 完成 OAuth。未索取密碼，未啟用自動寄送，也未套用通知 outbox migration。
- LINE 尚無已確認測試者 verified userId，未寄送。
- 自動審核拒絕持久新增已付款 QA 訂單做跨連線競態測試，理由是會影響正式營收／票券狀態；該 insert 未執行。維持回滾驗證，跨裝置真實並發尚未驗收。
- 最新正式核銷修正已生效；QR／相機修正在 PR preview，須合併部署後才會出現在正式前端。綠界官方 UI 完整 callback E2E、手機相機／飛航模式、Make 自動寄送與 LINE 實寄仍未完成。

---

# FOBI 2026 活動驗證與操作手冊

驗證日期：2026-10-19，台灣時間。基準 main：5052757。活動：2026-10-30 14:00，臺北新板希爾頓酒店；晚上另有慶功宴，未推定慶功宴地點。保留 PR #5，不修改場地資料。

## 結論

**目前不能宣告正式活動驗收通過。** 已完成實際購票頁、Sandbox 入口、簽章回呼、發票與付款結果頁驗證；找到票權、QR 依賴與後端權限問題。修正保留在隔離分支，正式 SQL 套用被自動審核拒絕，未重試或繞過。拒絕理由：驗證授權未明確涵蓋正式資料庫核銷行為與權限修改。另外，隔離分支推送 GitHub 亦被自動審核拒絕，理由是遠端發布與 schema 測試檔未經明確授權；目前僅有本地 commit，未建立 PR。

## 已執行及證據

| 項目 | 結果與證據 | 限制 |
|---|---|---|
| 場地 | 購票及付款結果頁顯示臺北新板希爾頓酒店 | 未重做 PR #5 |
| 建立訂單 | API 建立虛構 2 人 NT$6,000 訂單；瀏覽器另外建立 1 人 NT$3,000 訂單成功 | 沒有使用真實客戶資料 |
| 綠界 Sandbox | start 回傳 mode=stage、payment-stage 網址；瀏覽器成功進入綠界「測試帳號三」結帳頁 | 不能當正式扣款驗證 |
| 綠界模擬付款 UI | 按測試付款及交易成功後，該 UI 訂單仍 pending；觀察時段未見該操作產生 callback 證據 | **完整金流 E2E 未通過**；須重做官方信用卡測試流程及追查回傳 |
| 回呼防偽 | 自行對虛構 API 訂單送出錯誤簽章，400 CheckMacValueError；簽章正確但金額錯誤，400 AmountMismatch | 屬受控回呼測試，非綠界銀行交易回傳 |
| 付款確認與發票 | 對同筆虛構訂單送出 Sandbox 公開測試金鑰簽署回呼：200 1\|OK；訂單 paid，2 張票 | 不能冒稱綠界完整 E2E |
| 重送回呼 | 再送同一簽章回呼，200 1\|OK，仍 2 張票 | 已實際讀回 |
| 付款結果 UI | 瀏覽器顯示付款完成、6,000 元、兩張票及電子票連結 | 測試資料 |
| QR CDN | 原 URL qrcode@1.5.4/build/qrcode.min.js 實際 HTTP 404 | 原碼退回顯示票號，並不是可掃 QR |
| 原核銷問題 | 回滾交易內測試，一般 MEMBER 票走 VIP 回傳成功；接續 AFTERPARTY 被拒 already_checked_in | 測試全部回滾；sequence 會留下號碼間隔 |
| 修正版 SQL | 以無客資的即時 schema/function 定義重建 PGlite，測試發票、VIP 1/2/3、各入口、重複、未付款、作廢、RPC 權限、通知佇列 | PGlite 同連線並行測試會序列化，不能替代正式雙裝置競態測試 |
| 新 QR | 本地打包產生 PNG，ZXing 解碼還原原始 Token | 尚須 iPhone/Android 實機相機及低光測試 |
| 斷網 | UI 測試確認離線不送請求、不顯示成功；回應遺失顯示結果未確認；快速雙擊只送一次 | 尚未以實機切換飛航模式完整演練；沒有離線核銷功能 |
| 通知 | FOBI 三個部署函式無 sender；目前資料庫無通知表；可存取 Make 團隊 7 個流程無 FOBI Email/LINE 流程；Gmail 已寄信搜尋 10/1 起 FOBI/世界美顏小姐無結果 | 不能排除其他帳號、其他系統或人工通知 |

測試訂單（僅 QA，勿計入營收）：FOBI-M-20261019-B4F0ACAD、FOBI-M-20261019-5E24DB09。前者以受控回呼發出的 FB26-01-000002/000003 已逐一作廢並讀回確認；後者維持 pending。未刪除任何客戶資料。測試號碼不可重用，作廢單仍會留在統計內，報表須排除測試標記／訂單。

## 修正版範圍（尚未正式套用）

- QR 與相機解碼隨站打包，移除外部 CDN 依賴，保留可人工輸入 Token。
- 報到訊息使用 textContent，避免持票人文字成為 HTML；擋重複點擊、格式錯誤、離線與不確定回應。
- MAIN 與 VIP 共用一次總決賽入場；AFTERPARTY 獨立核銷一次。VIP 入口限制 VIP1/2/3，慶功宴檢查 afterparty_entitlement。
- VIP 1/2/3 發票時移除空格，對應現有 VIP1/2/3 設定。每桌 10 張；VIP1/2 含慶功宴、VIP3 不含；MEMBER 含慶功宴。
- 限制 mark_order_paid、checkin_ticket 只有 service_role 可呼叫；ticket_settings 開啟 RLS 並移除公開寫入。
- 付款函式草稿新增 MerchantID、POST method 與 production SimulatePaid 檢查；**尚未部署或執行 Deno 整合測試**。
- 通知範本與寄送介面、付款後唯一 outbox 草稿；收件人未確認即拒絕，預設 dry-run。

## Email 與 LINE 尚缺

selfonly@gmail.com 是已知通知用信箱，**尚未確認它是否也是測試收件箱，也尚未證實自動寄送連線存在**。@673opbay 是官方帳號公開 ID，不能拿來當推播收件 userId。

通知目前只有已測的範本／可注入寄送介面與 outbox，**沒有部署的 sender worker、排程、重試／租約、供應商確認及退信監控，因此沒有可用的自動通知流程**。後續需：

1. 確認測試收件 Email；安全連接 selfonly@gmail.com 的授權寄送服務或現有正式寄信服務。不要在對話提供密碼或 Channel access token。
2. 在 FOBI OA 管理端核對 Messaging API channel、Webhook 與綁定關係；取得已確認測試者的 verified LINE userId。不能憑電話或 Email 盲合併。
3. 接上 worker 與持久化重試：先確認 paid 且票券已齊、原子領取 outbox、供應商 idempotency key、成功回執及失敗重試。
4. 確認收件人後實寄一封、一則，檢查手機收到內容、連結與每張票權；重送付款回呼不可重寄；模擬供應商失敗後可補寄。

## 可操作的驗收順序

1. 隔離 preview：npm ci；npm run build；node --test tests/*.test.js。先套用測試資料庫快照及兩個 migration，勿直接用 001 舊檔重建正式資料庫。
2. 付款：僅使用綠界官方 Sandbox 商店／測試卡及虛構資料。確認 payment_url 網域 payment-stage.ecpay.com.tw。走付款 UI，直到綠界回傳與 FOBI paid 均有證據；只回到結果頁或顯示綠界成功仍不算通過。
3. 驗證金額、訂單及票數：一般票 2 人=2 張；VIP1/2/3 每桌 10 張；票號及 Token 各自唯一。重送同一回呼仍同樣張數；失敗付款不發票。
4. iOS Safari / Android Chrome：開電子票，直接掃 QR、從截圖掃 QR、外接掃描器／手動 Token，讀取值須與原票一致；相機拒絕權限時仍能人工輸入。檢查部署後 QR 不再請求 jsDelivr。
5. 工作人員從既有 SELF 管理員流程登入；確認無管理員／過期憑證核銷被拒。不可建立假管理員 session 來替代真實登入驗收。
6. 票權矩陣：MEMBER→VIP 拒絕、MAIN 成功、MAIN 再掃拒絕、AFTERPARTY 成功且再掃拒絕；VIP1/2→VIP 成功後 MAIN 拒絕、AFTERPARTY 成功；VIP3→AFTERPARTY 拒絕。作廢及未付款票全入口拒絕。
7. 用兩支登入裝置同時核銷同票同入口，必須只有一支成功；另一支顯示已核銷。MAIN/VIP 同時亦只能成功一次。
8. 斷網：已存截圖可展示 QR；新開票券無網路要明示未確認；報到端不能顯示成功。於請求送出後斷網，結果未明時先查核再重掃，不人工逕自放行。
9. 確認收件人後跑通知實寄／失敗補寄／付款重放防重寄。確認包含日期、總決賽場地、每張票與慶功宴權益，不添加未確認慶功宴地點。
10. 正式開賣前：套用核准修正、部署對應 Edge Function、再跑驗收；切換正式綠界商店須另驗證，不以 Sandbox paid 當營收。

## 現場備援

事先要求賓客存 QR 截圖／列印。主報到台提供兩條獨立網路與行動電源；無網路時停止系統核銷，導向指定單一人工備援台。人工備援須有預先匯出且受保護的必要票號／權益名冊、紙本時間與工作人員記錄、活動後對帳；本次未匯出客戶資料，亦未建置多裝置離線同步。人工備援不能保證跨入口即時防重，須控制唯一名冊與入口。

## 正式活動阻塞

P0：付款／核銷 RPC 公開執行權限、票權檢查與分場核銷、QR 404、ticket_settings 公開存取；修正版待授權。

P0：Sandbox UI→綠界 callback→FOBI paid 全流程尚未通過、正式商店切換尚未驗證。

P0：Email/LINE sender、已確認測試收件人、LINE verified userId 綁定與實寄證據缺失。

P1：相機實機與雙裝置競態、飛航模式／逾時及人工備援演練；票號零補位不需回補。

額外需評估：公開訂單 API 只憑 order_no 可取得含 QR Token 的票券，須以更強的不可猜測訂單存取憑證／會員授權保護，並限制查詢速率；本分支未改此 API 相容性。

## 原始來源

- https://github.com/selfonly-lang/fobi/pull/5
- https://github.com/selfonly-lang/fobi/blob/main/ticket.html
- https://github.com/selfonly-lang/fobi/blob/main/checkin.html
- https://github.com/selfonly-lang/fobi/blob/main/docs/venue-sync-20261009.md
- Supabase 即時 fobi-public v11、fobi-payment v3、fobi-admin v5、SQL 函式定義及 security advisor；Make 團隊 2251509 唯讀清單。
- https://supabase.com/docs/guides/database/functions
- https://developers.ecpay.com.tw/2902/
