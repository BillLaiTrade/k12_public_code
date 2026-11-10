# 國中自然科學互動學習網站

本儲存庫 `BillLaiTrade/k12_public_code` 是正式公開網站的唯一程式碼來源。根目錄 `index.html` 與 `units/`、`parts/`、`shared-assets/` 等目錄包含網站頁面、互動程式與素材。

## 發布方式

GitHub Pages 從 `main` 分支根目錄發布。公開網址為 <https://billlaitrade.github.io/k12_public_code/>。推送 `main` 後，等待 Pages 的 `pages build and deployment` 成功，再以公開首頁及受影響頁面確認狀態碼和實際內容。

## 與其他儲存庫的分工

- `BillLaiTrade/k12` 保存課程規劃、製作規格、進度、決策和檢查紀錄。
- `BillLaiTrade/k12-learning-demos` 是 Private 內部紀錄庫；只在公開版檢查完成後同步相關修改，不從該庫發布網站。

修改本庫時，先閱讀根目錄 `AGENTS.md` 與相關課程規格、決策及測試說明。網站功能和內容的正式修改都先在本庫進行並驗證。
