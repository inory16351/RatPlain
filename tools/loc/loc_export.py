"""스트링 테이블 → Unity 런타임 TSV.

Pirat_Table/스트링 테이블.xlsx 의 '스트링' 시트를 읽어
Pirate_1/Assets/Resources/Localization/strings.txt 로 내보낸다.
번역을 고친 뒤 이 스크립트만 다시 돌리면 게임에 반영됨 (Unity 가 TSV 를 다시 임포트).

검사: 빈 칸 · 자리 표시({0}) 개수 · 리치 텍스트 태그(<b> <size> <color>) 짝이 한국어와 같은지.
사용: python tools/loc/loc_export.py
"""
import os
import re
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
XLSX = os.path.join(ROOT, 'Pirat_Table', '스트링 테이블.xlsx')
OUT = os.path.join(ROOT, 'Pirate_1', 'Assets', 'Resources', 'Localization', 'strings.txt')
LANGS = ['ko', 'en', 'ru', 'fr', 'de', 'zh', 'ja', 'ar']

PH = re.compile(r'\{\d+(?::[^}]*)?\}')
TAG = re.compile(r'</?(b|i|size|color)(=[^>]*)?>')


def check(key, ko, lang, text):
    errs = []
    if text is None or text == '':
        return [f'{key} [{lang}] 비어 있음']
    if sorted(PH.findall(ko)) != sorted(PH.findall(text)):
        errs.append(f'{key} [{lang}] 자리 표시 다름: {PH.findall(ko)} vs {PH.findall(text)}')
    tk = sorted(m.group(1) + ('/' if m.group(0).startswith('</') else '') for m in TAG.finditer(ko))
    tt = sorted(m.group(1) + ('/' if m.group(0).startswith('</') else '') for m in TAG.finditer(text))
    if tk != tt:
        errs.append(f'{key} [{lang}] 태그 다름: {tk} vs {tt}')
    if '\t' in text:
        errs.append(f'{key} [{lang}] 탭 문자 있음')
    return errs


def read_rows(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb['스트링']
    rows = list(ws.iter_rows(values_only=True))
    head = [str(h).strip() if h else '' for h in rows[0]]
    col = {h: i for i, h in enumerate(head)}
    out = []
    for r in rows[1:]:
        key = r[col['키']]
        if not key:
            continue
        def cell(name):
            v = r[col[name]]
            return '' if v is None else str(v)
        out.append({'key': str(key).strip(), 'src': cell('원문(검수 전)'), **{l: cell(l) for l in LANGS}})
    return out


def write_tsv(rows, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    def esc(s):
        return s.replace('\r', '').replace('\n', '\\n')
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\t'.join(['key', 'src'] + LANGS) + '\n')
        for r in rows:
            f.write('\t'.join(esc(r[c]) for c in ['key', 'src'] + LANGS) + '\n')


def validate(rows):
    errs, seen = [], set()
    for r in rows:
        if r['key'] in seen:
            errs.append(f"{r['key']} 키 중복")
        seen.add(r['key'])
        for l in LANGS[1:]:
            errs += check(r['key'], r['ko'], l, r[l])
        if not r['ko']:
            errs.append(f"{r['key']} [ko] 비어 있음")
    return errs


if __name__ == '__main__':
    rows = read_rows(XLSX)
    errs = validate(rows)
    for e in errs:
        print('!!', e)
    if errs:
        print(f'오류 {len(errs)}개 — TSV 를 쓰지 않음')
        sys.exit(1)
    write_tsv(rows, OUT)
    print(f'{len(rows)}개 키 → {os.path.relpath(OUT, ROOT)}')
