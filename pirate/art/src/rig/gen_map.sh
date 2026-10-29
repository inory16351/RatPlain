#!/usr/bin/env bash
# 선원 시트 → 파츠 색 맵 (Codex): bash gen_map.sh 시트이름...  → <이름>_map.png (rig_map.py 가 씀)
# 시트 원본 = <이름>_sheet.png (마젠타 배경 그대로)
cd "$(dirname "$0")"
command -v codex >/dev/null || export PATH="/c/Users/user/.codex/.sandbox-bin:$PATH"
for n in "$@"; do
  ( sed "s/OUTFILE/${n}_map.png/" map_prompt.txt | codex exec --skip-git-repo-check --ephemeral -s workspace-write -C "$PWD" -i "${n}_sheet.png" - > log_map_$n.txt 2>&1
    if [ ! -s "${n}_map.png" ]; then
      src=$(grep -a -o "generated_images[^'\" ]*\.png" log_map_$n.txt | tail -1 | sed 's#\\#/#g; s#\#/#g')
      [ -n "$src" ] && [ -f "/c/Users/user/.codex/$src" ] && cp "/c/Users/user/.codex/$src" "${n}_map.png"
    fi
    if [ -s "${n}_map.png" ]; then echo "ok $n"; else echo "FAIL $n: $(tail -1 log_map_$n.txt | cut -c1-120)"; fi ) &
done
wait
