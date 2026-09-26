#!/usr/bin/env bash
# 一键推送到 GitHub（在能访问 GitHub 的机器上执行，例如你本地）
#
# 用法:
#   GITHUB_TOKEN=ghp_xxx bash scripts/push-to-github.sh
#   可选环境变量: OWNER(默认 ant-cave) REPO(默认 clearscan-tauri) TAG(默认 v0.1.0)
#
# 流程: 创建仓库(如不存在) → push main → push tag → 触发 Actions 自动构建 aarch64 APK 并发 Release
#
# 安全说明: token 仅从环境变量读取，不会写入任何文件；推送完成后 remote 将被清理为不含 token 的 URL。
set -euo pipefail

OWNER="${OWNER:-ant-cave}"
REPO="${REPO:-clearscan-tauri}"
BRANCH="${BRANCH:-main}"
TAG="${TAG:-v0.1.0}"

: "${GITHUB_TOKEN:?请先执行 export GITHUB_TOKEN=<你的token>，例如: GITHUB_TOKEN=ghp_xxx bash $0}"

API="https://api.github.com"
AUTH="Authorization: Bearer ${GITHUB_TOKEN}"

echo "==> 1/4 检查/创建仓库 ${OWNER}/${REPO}"
CODE=$(curl -s -o /tmp/_repo.json -w '%{http_code}' -X POST "$API/user/repos" \
  -H "$AUTH" -H "Accept: application/vnd.github+json" \
  -d "{\"name\":\"${REPO}\",\"private\":false,\"has_wiki\":false,\"description\":\"Local-first document scanner - ClearScan Tauri port\"}")
if [ "$CODE" = "201" ]; then
  echo "    仓库已创建"
elif [ "$CODE" = "422" ]; then
  echo "    仓库已存在，跳过"
else
  echo "    创建仓库失败 HTTP $CODE"; cat /tmp/_repo.json; echo; exit 1
fi

echo "==> 2/4 配置 remote"
cd "$(dirname "$0")/.."
git remote remove origin 2>/dev/null || true
git remote add origin "https://oauth2:${GITHUB_TOKEN}@github.com/${OWNER}/${REPO}.git"

echo "==> 3/4 推送 ${BRANCH} 分支"
git push -u origin "$BRANCH"

echo "==> 4/4 推送标签 ${TAG}（触发 Release 构建）"
git tag -f "$TAG"
git push -f origin "$TAG"

# 清理 remote 中的 token
git remote set-url origin "https://github.com/${OWNER}/${REPO}.git"

echo ""
echo "✓ 全部完成！GitHub Actions 正在自动构建 aarch64 APK（约 20-40 分钟）:"
echo "  Actions: https://github.com/${OWNER}/${REPO}/actions"
echo "  Release: https://github.com/${OWNER}/${REPO}/releases"
