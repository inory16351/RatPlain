using UnityEngine;
using UnityEngine.UI;

// 설정 창 언어 고르기: ◀ · ▶ (또는 가운데 버튼) 로 한국어 → English → … → العربية 차례로 바꿈
// 버튼 · 글자는 하이라키에 두고 여기에 연결만 함
public class LanguagePicker : MonoBehaviour
{
    [Tooltip("지금 언어 이름 (그 언어로 씀: 한국어, English …)")]
    public Text label;
    public Button prev, next;
    [Tooltip("누르면 다음 언어 (없으면 비움)")]
    public Button cycle;

    void Start()
    {
        if (prev) prev.onClick.AddListener(() => Step(-1));
        if (next) next.onClick.AddListener(() => Step(1));
        if (cycle) cycle.onClick.AddListener(() => Step(1));
        Loc.Changed += Show;
        Show();
    }

    void OnDestroy() { Loc.Changed -= Show; }

    void Step(int d)
    {
        Sfx.Play("ui_click");
        Loc.SetLang((Loc.Lang + d + Loc.Count) % Loc.Count);
    }

    void Show()
    {
        if (label) label.text = Loc.T("lang.self");
    }
}
