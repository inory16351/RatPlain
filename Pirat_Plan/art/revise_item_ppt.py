# 오브젝트 · 아이템 PPT: 사용자 수정본 위에 직접 고침 (다시 생성하지 않음)
# 사용: uv run --with python-pptx python Pirat_Plan/art/revise_item_ppt.py <pptx>
import sys
from pptx import Presentation

# 장 번호 → {바꿀 문단(줄): 새 문단}
FIX = {
    5: {
        '무한 맵의 구역 생성 시 섬과 함께 배치, 출발 지점 주변은 비움': '맵 구역 생성 시 섬과 함께 배치, 출발 지점 주변은 배치 제외',
        '웨이브마다 생성': '웨이브 단위 생성',
        '맵 구역에 고정 배치': '맵 구역 단위 고정 배치',
        '웨이브 시작 시 일정 수 생성': '웨이브 시작 시 일정 수량 생성',
        '파괴해야 재화 획득': '포탄으로 파괴 시 재화 획득',
        '구역이 생길 때 함께 배치': '맵 구역 생성 시 함께 배치',
        '멀어지면 삭제, 돌아오면 같은 배치': '구역 이탈 시 삭제, 재진입 시 동일 배치 복원',
        '스테이지마다 오브젝트 구성 비율 다름': '스테이지별 오브젝트 구성 비율 차등',
        '적에게도 똑같이 작용': '적 함선에도 동일하게 적용',
        '예: 폭풍 해협 = 바람 구역 많음, 해적 소굴 = 난파선 많음': '예: 폭풍 해협은 바람 구역 위주, 해적 소굴은 난파선 위주',
        '폭탄 상자 폭발 · 해류 · 바람이 적 함선에도 적용': '폭탄 상자 · 해류 · 바람 구역 효과 적용, 적 유인 후 역이용',
    },
}

prs = Presentation(sys.argv[1])
left = {k: set(v) for k, v in FIX.items()}
for i, slide in enumerate(prs.slides, 1):
    for sh in slide.shapes:
        if not sh.has_text_frame: continue
        for p in sh.text_frame.paragraphs:
            t = ''.join(r.text for r in p.runs)
            if t in FIX.get(i, {}).values(): left[i] -= {k for k, v in FIX[i].items() if v == t}
            if t in FIX.get(i, {}) and p.runs:
                p.runs[0].text = FIX[i][t]
                for r in p.runs[1:]: r._r.getparent().remove(r._r)
                left[i].discard(t)
prs.save(sys.argv[1])
for k, v in left.items():
    for t in v: print('못 찾음', k, t)
print('done')
