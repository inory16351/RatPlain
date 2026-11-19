using System;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

[Serializable]
public class GuideLine
{
    [Tooltip("strings.txt 키")] public string key;
    [Tooltip("0 = 애꾸 선장, 1 = 조선공")] public int speaker;
    [Tooltip("가리킬 곳 (GuideTarget.id, 비우면 없음)")] public string target;
}

// 항구 단계 안내 (NKK 쥐 게임 TutorialBox 방식): 아래 대사 판 + 말하는 쥐 초상화 + 이름 + 한 글자씩 나오는 글,
// 가리킬 곳은 노란 테두리 + 화살표. 대사 중엔 화면 클릭을 막고, 클릭 · Space 로 다음 줄. Esc 는 TitleScreen 이 Skip 부름.
// first = 오프닝 뒤 처음 항구 (아직 정복한 바다 없음), back = 첫 전투에서 돌아왔을 때. 한 번 본 건 TutorialFlags 에 기록
public class PortGuide : MonoBehaviour
{
    [Header("씬 연결")]
    [Tooltip("대사창 전체 (꺼 둠)")] public CanvasGroup group;
    [Tooltip("대사 판 (가리킬 곳이 가리면 화면 위로 옮김)")] public RectTransform box;
    public Image portrait;
    public Text nameText, bodyText;
    public GameObject nextMark;
    [Tooltip("강조 테두리 (대사창 밖에 둬야 대사가 끝난 뒤에도 보임)")] public RectTransform highlight;
    [Tooltip("테두리 옆 화살표 (글자 ▼)")] public RectTransform arrow;

    [Header("말하는 쥐 (0 = 선장, 1 = 조선공)")]
    public Sprite[] portraits;
    public string[] nameKeys = { "guide.name.capt", "guide.name.wright" };

    [Header("안내가 뜨지 않을 때 (하나라도 켜져 있으면 기다림)")]
    public GameObject[] waitWhile;
    public StoryCutscene cutscene;
    public EndingScreen ending;

    [Header("안내 내용")]
    public GuideLine[] first =
    {
        new GuideLine { key = "guide.f0", speaker = 0 },
        new GuideLine { key = "guide.f1", speaker = 1, target = "money" },
        new GuideLine { key = "guide.f2", speaker = 1, target = "settings" },
        new GuideLine { key = "guide.f3", speaker = 1, target = "save" },
        new GuideLine { key = "guide.f4", speaker = 0, target = "tab_sea" },
        new GuideLine { key = "guide.f5", speaker = 0, target = "sea_list" },
        new GuideLine { key = "guide.f6", speaker = 0, target = "sail" },
    };
    [Tooltip("first 가 끝난 뒤 계속 가리킬 곳 (누를 때까지)")] public string firstLinger = "sail";
    public GuideLine[] back =
    {
        new GuideLine { key = "guide.b0", speaker = 1 },
        new GuideLine { key = "guide.b1", speaker = 1, target = "tab_ship" },
        new GuideLine { key = "guide.b2", speaker = 1, target = "tab_gear" },
        new GuideLine { key = "guide.b3", speaker = 1, target = "tab_lab" },
        new GuideLine { key = "guide.b4", speaker = 0, target = "tab_sea" },
    };

    [Header("연출")]
    public float charsPerSec = 40;
    public float inTime = 0.2f;
    [Tooltip("줄이 나오고 이 초 동안은 클릭 무시 (연타로 넘어가지 않게)")] public float clickGuard = 0.3f;
    public float highlightPulse = 6, arrowBob = 10;
    [Tooltip("계속 가리키기 최대 시간 (초)")] public float lingerTime = 20;
    [Tooltip("대사 판을 위로 옮길 때 화면 위와 띄울 거리 (대사 판 위로 튀어나온 초상화 몫)")] public float topGap = 60;

    GuideLine[] lines;
    int idx;
    float shown, lineT, inT, lingerT;
    string full = "", linger, nextLinger;
    bool cameBack;
    Vector2 boxPos;
    RectTransform canvas;

    public bool Showing => lines != null;

    void Awake()
    {
        cameBack = GameSession.last != null;
        canvas = (RectTransform)GetComponentInParent<Canvas>().rootCanvas.transform;
        boxPos = box.anchoredPosition;
        group.alpha = 0; group.blocksRaycasts = false; group.gameObject.SetActive(false);
        highlight.gameObject.SetActive(false); arrow.gameObject.SetActive(false);
    }

    bool Free()
    {
        if (cutscene && cutscene.Playing) return false;
        if (ending && ending.IsOpen) return false;
        foreach (var g in waitWhile) if (g && g.activeInHierarchy) return false;
        return true;
    }

    void Begin(GuideLine[] seq, string seen, string lingerAfter)
    {
        TutorialFlags.Mark(seen);
        lines = seq; idx = 0; inT = 0; nextLinger = lingerAfter; linger = null;
        group.gameObject.SetActive(true);
        group.transform.SetAsLastSibling();
        highlight.SetAsLastSibling(); arrow.SetAsLastSibling();
        group.alpha = 0; group.blocksRaycasts = true;
        Show();
    }

    // Esc: 안내 통째로 건너뜀
    public void Skip() { if (Showing) End(); }

    void Show()
    {
        var l = lines[idx];
        int sp = Mathf.Clamp(l.speaker, 0, portraits.Length - 1);
        portrait.sprite = portraits.Length > 0 ? portraits[sp] : null;
        portrait.enabled = portrait.sprite;
        nameText.text = sp < nameKeys.Length ? Loc.T(nameKeys[sp]) : "";
        full = Loc.T(l.key);
        shown = Loc.RTL ? full.Length : 0;
        bodyText.text = Loc.RTL ? full : "";
        lineT = 0;
        nextMark.SetActive(false);
        if (idx > 0) Sfx.Play("ui_click", 0.6f);
    }

    void End()
    {
        lines = null;
        group.alpha = 0; group.blocksRaycasts = false; group.gameObject.SetActive(false);
        linger = nextLinger; lingerT = lingerTime; nextLinger = null;
        if (!GuideTarget.Find(linger)) linger = null;
    }

    void Update()
    {
        float dt = Time.unscaledDeltaTime;
        if (!Showing)
        {
            if (Free())
            {
                if (!TutorialFlags.Seen("guide_first") && Shipyard.Save.cleared.Count == 0) Begin(first, "guide_first", firstLinger);
                else if (cameBack && !TutorialFlags.Seen("guide_back") && Shipyard.Save.cleared.Count <= 1) Begin(back, "guide_back", null);
            }
            // 안내가 끝난 뒤 누를 곳을 계속 가리킴 (누르거나 시간이 지나면 끔)
            if (!Showing)
            {
                if (linger != null)
                {
                    lingerT -= dt;
                    var m = Mouse.current;
                    if (lingerT <= 0 || (m != null && m.leftButton.wasPressedThisFrame) || !Free()) linger = null;
                }
                Point(linger);
                return;
            }
        }

        inT = Mathf.Min(inTime, inT + dt);
        group.alpha = inTime > 0 ? inT / inTime : 1;
        var l = lines[idx];
        Point(l.target);

        bool done = shown >= full.Length;
        if (!done)
        {
            shown += dt * charsPerSec;
            int n = Mathf.Min(full.Length, Mathf.FloorToInt(shown));
            bodyText.text = full.Substring(0, n);
            done = n >= full.Length;
        }
        lineT += dt;
        nextMark.SetActive(done);
        if (done) nextMark.transform.localScale = Vector3.one * (1 + 0.08f * Mathf.Sin(Time.unscaledTime * 6));
        if (lineT >= clickGuard && Pressed())
        {
            if (!done) { shown = full.Length; bodyText.text = full; }
            else if (++idx < lines.Length) Show();
            else End();
        }
    }

    static bool Pressed()
    {
        var m = Mouse.current; var kb = Keyboard.current;
        return (m != null && m.leftButton.wasPressedThisFrame)
            || (kb != null && (kb.spaceKey.wasPressedThisFrame || kb.enterKey.wasPressedThisFrame || kb.numpadEnterKey.wasPressedThisFrame));
    }

    // 강조 테두리 · 화살표를 대상 위에, 대상이 대사 판에 가리면 대사 판을 위로
    void Point(string id)
    {
        var t = GuideTarget.Find(id);
        bool up = false;
        if (!t)
        {
            highlight.gameObject.SetActive(false); arrow.gameObject.SetActive(false);
        }
        else
        {
            var r = t.RectIn(canvas);
            float p = highlightPulse * (0.5f + 0.5f * Mathf.Sin(Time.unscaledTime * 5));
            highlight.gameObject.SetActive(true);
            highlight.anchorMin = highlight.anchorMax = highlight.pivot = new Vector2(0.5f, 0.5f);
            highlight.anchoredPosition = r.center - canvas.rect.center;
            highlight.sizeDelta = r.size + Vector2.one * p * 2;
            arrow.gameObject.SetActive(true);
            arrow.anchorMin = arrow.anchorMax = new Vector2(0.5f, 0.5f);
            bool top = r.center.y > canvas.rect.center.y;
            float h = r.height / 2 + p + arrow.rect.height * 0.6f + arrowBob * (0.5f + 0.5f * Mathf.Sin(Time.unscaledTime * 6));
            arrow.anchoredPosition = highlight.anchoredPosition + new Vector2(0, top ? -h : h);
            arrow.localRotation = Quaternion.Euler(0, 0, top ? 180 : 0); // 글자 ▼ = 아래를 가리킴 → 위쪽 대상이면 뒤집어 위로
            // 대사 판(아래)과 겹치면 위로
            var c = new Vector3[4]; box.GetWorldCorners(c);
            float boxTop = canvas.InverseTransformPoint(c[1]).y - (box.anchoredPosition.y - boxPos.y);
            up = r.yMin < boxTop;
        }
        if (Showing)
        {
            float goal = up ? canvas.rect.height - box.rect.height - 2 * boxPos.y - topGap : 0;
            var cur = box.anchoredPosition;
            box.anchoredPosition = new Vector2(boxPos.x, Mathf.Lerp(cur.y, boxPos.y + goal, Mathf.Min(1, Time.unscaledDeltaTime * 12)));
        }
    }
}
