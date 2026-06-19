# KMB 巴士路線查詢 (KMB Bus Route Query)

查詢九巴 (KMB) 巴士路線嘅站點、預計到站時間 (ETA)、車費及服務時間。

🌐 **Live Demo**: <https://kmb-bus-app.vercel.app/>

## ✨ 功能

- 🚌 路線搜尋（支援 KMB 全部路線）
- 📍 站點列表 + 即時 ETA
- ⏰ Auto-refresh ETA（每 30 秒）
- ⭐ 常用路線書籤 (Favorites)
- 💰 **全程車費**（由 hk-bus-crawling 提供）
- 📅 **服務時間表**（首尾班車 + 詳細班次）

## 🚀 Getting Started

```bash
npm install
npm run dev
```

打開 <http://localhost:3000>

## 🔄 更新車費及服務時間數據

⚠️ 數據**預設唔自動更新**。要更新請手動跑：

```bash
bash scripts/update-fare-data.sh
```

然後 commit 同 push：

```bash
git add apps/kmb-bus-app/data/routeFareList.min.json
git commit -m "chore: update KMB fare & schedule data"
git push
```

Vercel 會自動 deploy。

### 數據源

[hkbus/hk-bus-crawling](https://github.com/hkbus/hk-bus-crawling) - 每日 GitHub Actions 自動更新，涵蓋 KMB/CTB/NLB/MTR/小巴 嘅 route/fare/schedule/stop 數據。

## 📁 專案結構

```
apps/kmb-bus-app/
├── app/
│   ├── page.tsx                          ← 搜尋首頁
│   ├── route/[route]/[direction]/page.tsx ← 結果頁
│   ├── api/eta/route.ts                  ← ETA API endpoint
│   └── api/check-route/route.ts          ← 路線 validation
├── components/
│   ├── StopList.tsx                      ← 站點列表 + ETA 按鈕
│   └── FavoriteButton.tsx                ← 收藏按鈕
├── lib/
│   ├── kmb-api.ts                        ← KMB API client
│   ├── fare-data.ts                      ← 車費及服務時間 API
│   ├── favorites.ts                      ← localStorage 收藏管理
│   └── types.ts                          ← TypeScript types
├── data/
│   └── routeFareList.min.json            ← 車費及服務時間本地快照 (7.9MB)
└── scripts/
    └── update-fare-data.sh               ← 手動更新腳本
```

## 📊 數據源

| 功能 | 來源 |
|------|------|
| 路線資料 | [KMB Open Data API](https://data.etabus.gov.hk/v1/transport/kmb) |
| 即時 ETA | KMB Open Data API |
| 站點資料 | KMB Open Data API |
| 車費及服務時間 | [hk-bus-crawling](https://github.com/hkbus/hk-bus-crawling) |

## 🛠️ Deploy on Vercel

[Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)