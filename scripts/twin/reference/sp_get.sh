#!/bin/bash
# Usage: sp_get.sh <list.json> <outDir> <pattern>...   Downloads matching files with curl (resumable).
LIST="$1"; OUT="$2"; shift 2
mkdir -p "$OUT"
JAR="$OUT/.cookies.txt"
# The share link grants access to company files, so it is never committed: it lives in a git-ignored file.
SHARE="$(cat "${TWIN_SHARE_LINK_FILE:-assets-src/twin/reference/share-link.txt}")"
curl -sL -c "$JAR" -b "$JAR" -A "Mozilla/5.0" -o /dev/null "$SHARE"
node -e '
const fs=require("fs");const l=JSON.parse(fs.readFileSync(process.argv[1]));const pats=process.argv.slice(2);
for(const f of l){if(pats.some(p=>f.ServerRelativeUrl.includes(p)))console.log(f.UniqueId+"\t"+f.Length+"\t"+f.Name)}
' "$LIST" "$@" | while IFS=$'\t' read -r uid len name; do
  dest="$OUT/$name"
  have=$(stat -c %s "$dest" 2>/dev/null || echo 0)
  if [ "$have" = "$len" ]; then echo "have $name"; continue; fi
  curl -sL -C - -b "$JAR" -A "Mozilla/5.0" -o "$dest" "https://staclaracomph-my.sharepoint.com/personal/tumauini_project_staclara_com_ph/_layouts/15/download.aspx?UniqueId=$uid"
  got=$(stat -c %s "$dest" 2>/dev/null || echo 0)
  echo "$( [ "$got" = "$len" ] && echo ok || echo PARTIAL ) $got/$len $name"
done
rm -f "$JAR"
