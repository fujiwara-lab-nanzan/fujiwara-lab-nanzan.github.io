# 修正前にやること
# 1) 今いるブランチを確認（mainでOK）,
git branch

# 2) リモートの最新を取得（まだ取り込まない）,
git fetch origin

# 3) リモートの変更を取り込む（履歴をきれいに保つなら --rebase）,
git pull --rebase origin main


# 修正を反映させる
# 1)新しく作ったフォルダとファイルをステージング
git add .

# 2)変更内容をコミット（記録）
git commit -m "修正"

# 3)プッシュしてGitHubに反映
git push
