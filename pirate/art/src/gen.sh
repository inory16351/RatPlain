#!/usr/bin/env bash
# Codex 로 그림 생성: bash gen.sh [이름...]  (없으면 refs.txt 전부, BATCH 개씩 동시에)
# 프롬프트는 make_prompts.py 가 만듦
cd "$(dirname "$0")"
BATCH=${BATCH:-8}
names=${*:-$(cut -d' ' -f1 refs.txt)}
i=0
for n in $names; do
  r=$(grep "^$n " refs.txt | cut -d' ' -f2-)
  codex exec --skip-git-repo-check --ephemeral -s workspace-write -C "$PWD" $r - < prompt_$n.txt > log_$n.txt 2>&1 &
  i=$((i+1)); if [ $((i % BATCH)) -eq 0 ]; then wait; fi
done
wait; ls -la *.png
