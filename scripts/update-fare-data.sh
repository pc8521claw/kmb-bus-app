#!/bin/bash
# 手動更新 KMB 車費及服務時間數據
# 數據源: https://github.com/hkbus/hk-bus-crawling (每日 GitHub Actions 自動更新)
#
# 用法:
#   bash scripts/update-fare-data.sh
#
# ⚠️ 此 script 只更新本地 file，唔會自動 commit。要 commit 入 git 先會 deploy。

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$APP_DIR/data"
TARGET_FILE="$DATA_DIR/routeFareList.min.json"
SOURCE_URL="https://hkbus.github.io/hk-bus-crawling/routeFareList.min.json"

echo "🚌 KMB 車費及服務時間數據更新"
echo "================================"
echo ""

# 1. 檢查 data dir
mkdir -p "$DATA_DIR"

# 2. Backup 舊 file
if [ -f "$TARGET_FILE" ]; then
  OLD_SIZE=$(du -h "$TARGET_FILE" | cut -f1)
  OLD_DATE=$(stat -f "%Sm" "$TARGET_FILE" 2>/dev/null || stat -c "%y" "$TARGET_FILE" 2>/dev/null)
  echo "📦 舊 file: $OLD_SIZE (更新於 $OLD_DATE)"
  mv "$TARGET_FILE" "$TARGET_FILE.bak"
  echo "   ✓ 已 backup 去 $TARGET_FILE.bak"
fi

# 3. Download
echo ""
echo "🌐 從 hk-bus-crawling 下載..."
if curl -sL -f -o "$TARGET_FILE" "$SOURCE_URL"; then
  NEW_SIZE=$(du -h "$TARGET_FILE" | cut -f1)
  echo "   ✓ 下載完成: $NEW_SIZE"
else
  echo "   ❌ 下載失敗"
  # Restore backup
  if [ -f "$TARGET_FILE.bak" ]; then
    mv "$TARGET_FILE.bak" "$TARGET_FILE"
    echo "   ✓ 已還原 backup"
  fi
  exit 1
fi

# 4. Validate JSON
echo ""
echo "🔍 驗證 JSON..."
if python3 -c "import json; json.load(open('$TARGET_FILE'))" 2>/dev/null; then
  echo "   ✓ JSON valid"
else
  echo "   ❌ JSON invalid"
  if [ -f "$TARGET_FILE.bak" ]; then
    mv "$TARGET_FILE.bak" "$TARGET_FILE"
    echo "   ✓ 已還原 backup"
  fi
  exit 1
fi

# 5. Stats
echo ""
echo "📊 數據統計:"
python3 <<EOF
import json
with open("$TARGET_FILE") as f:
    data = json.load(f)
print(f"   - 路線總數: {len(data['routeList'])}")
print(f"   - 站點總數: {len(data['stopList'])}")
print(f"   - 服務日模式: {len(data['serviceDayMap'])}")
print(f"   - 公眾假期: {len(data['holidays'])}")
EOF

# 6. Cleanup backup
if [ -f "$TARGET_FILE.bak" ]; then
  rm -f "$TARGET_FILE.bak"
fi

echo ""
echo "✅ 更新完成！"
echo ""
echo "下一步:"
echo "  1. git add apps/kmb-bus-app/data/routeFareList.min.json"
echo "  2. git commit -m \"chore: update KMB fare & schedule data\""
echo "  3. git push (Vercel 會自動 deploy)"