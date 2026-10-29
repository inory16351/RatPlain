#!/usr/bin/env bash
# Codex 로 플랫 그림 생성: bash gen_flat.sh 이름...  (BATCH 개씩 동시에)
# Codex 는 그림을 ~/.codex/generated_images 에 만들고 복사는 샌드박스 때문에 실패할 때가 많음 → 로그에서 경로를 찾아 직접 복사
cd "$(dirname "$0")"
export PATH="/c/Users/user/.codex/.sandbox-bin:$PATH"
BATCH=${BATCH:-6}
i=0
for n in "$@"; do
  r=$(grep "^$n " refs.txt | cut -d' ' -f2-)
  ( codex exec --skip-git-repo-check --ephemeral -s workspace-write -C "$PWD" $r - < prompt_$n.txt > log_$n.txt 2>&1
    if [ ! -s "$n.png" ]; then
      src=$(grep -a -o "generated_images[^'\" ]*\.png" log_$n.txt | tail -1 | sed 's#\\\\#/#g; s#\\#/#g')
      [ -n "$src" ] && [ -f "/c/Users/user/.codex/$src" ] && cp "/c/Users/user/.codex/$src" "$n.png"
    fi
    if [ -s "$n.png" ]; then echo "ok $n"; else echo "FAIL $n: $(tail -1 log_$n.txt | cut -c1-120)"; fi ) &
  i=$((i+1)); if [ $((i % BATCH)) -eq 0 ]; then wait; fi
done
wait
