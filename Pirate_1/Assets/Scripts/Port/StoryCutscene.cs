using System;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

// 오프닝 컷씬 (Port 씬 OpeningPanel). NKK 쥐 게임 StoryPlayer 방식:
// 컷 그림 두 장을 번갈아 겹쳐 바꾸고(천천히 확대), 아래 자막이 한 글자씩 나옴.
// 클릭 · Space = 글 다 보이기 → 다음 줄, Esc · 건너뛰기 = 바로 끝. 줄 글은 strings.txt (lineKeys), 그림은 cuts
public class StoryCutscene : MonoBehaviour
{
    [Tooltip("컷씬 전체 (꺼 둠)")] public CanvasGroup group;
    [Tooltip("컷 그림 두 장 (번갈아 쓰며 겹쳐 바꿈)")] public Image cutA, cutB;
    public Text captionText;
    [Tooltip("글이 다 나오면 깜빡이는 '계속' 표시")] public GameObject nextMark;
    public Button skipButton;

    [Header("내용")]
    [Tooltip("컷 그림")] public Sprite[] cuts;
    [Tooltip("자막 줄 (strings.txt 키)")] public string[] lineKeys;
    [Tooltip("줄마다 쓸 컷 번호 (lineKeys 와 같은 길이)")] public int[] lineCut;

    [Header("연출")]
    public float charsPerSec = 24;
    public float crossTime = 0.7f;
    [Tooltip("컷이 보이는 동안 천천히 확대 (배율/초)")] public float zoomPerSec = 0.012f;
    public float fadeTime = 0.6f;
    [Tooltip("가만히 있으면 한 줄이 다 나오고 이 초 뒤 다음 줄 (0 = 끔)")] public float autoNext = 7;

    public bool Playing { get; private set; }

    Action done;
    int idx = -1, curCut = -1;
    float shown, crossT, zoomT, fadeT, lineT;
    bool ending, aFront;
    string full = "";

    void Awake()
    {
        if (skipButton) skipButton.onClick.AddListener(Finish);
        if (!Playing && group) { group.alpha = 0; group.gameObject.SetActive(false); }
    }

    public void Play(Action onDone)
    {
        done = onDone;
        if (lineKeys == null || lineKeys.Length == 0) { onDone?.Invoke(); return; }
        Playing = true; ending = false; idx = -1; curCut = -1; fadeT = 0; aFront = false;
        group.gameObject.SetActive(true);
        group.transform.SetAsLastSibling();
        group.alpha = 0; group.blocksRaycasts = true;
        cutA.color = new Color(1, 1, 1, 0); cutB.color = new Color(1, 1, 1, 0);
        Next();
    }

    Image Front => aFront ? cutA : cutB;
    Image Back => aFront ? cutB : cutA;

    void Next()
    {
        idx++;
        if (idx >= lineKeys.Length) { Finish(); return; }
        int c = lineCut != null && idx < lineCut.Length ? lineCut[idx] : 0;
        if (c != curCut)
        {
            curCut = c;
            if (idx > 0) Sfx.Play("wood", 0.5f);
            aFront = !aFront;
            var f = Front;
            f.sprite = cuts != null && c < cuts.Length ? cuts[c] : null;
            // 새 컷을 지난 컷 바로 위로 (자막 판 · 버튼보다는 아래)
            int fi = f.transform.GetSiblingIndex(), bi = Back.transform.GetSiblingIndex();
            if (fi < bi) f.transform.SetSiblingIndex(bi);
            f.color = new Color(1, 1, 1, 0);
            f.rectTransform.localScale = Vector3.one;
            crossT = 0; zoomT = 0;
        }
        full = Loc.T(lineKeys[idx]);
        shown = Loc.RTL ? full.Length : 0; // 아랍어는 글자를 한 번에 (모양 잡기 때문에)
        lineT = 0;
        captionText.text = Loc.RTL ? full : "";
        if (nextMark) nextMark.SetActive(false);
    }

    public void Finish()
    {
        if (!Playing || ending) return;
        ending = true; fadeT = 0;
    }

    void Update()
    {
        if (!Playing) return;
        float dt = Time.unscaledDeltaTime;
        if (ending)
        {
            fadeT += dt;
            group.alpha = 1 - Mathf.Clamp01(fadeT / fadeTime);
            if (fadeT >= fadeTime)
            {
                Playing = false;
                group.blocksRaycasts = false; group.gameObject.SetActive(false);
                var d = done; done = null; d?.Invoke();
            }
            return;
        }
        fadeT += dt;
        group.alpha = Mathf.Clamp01(fadeT / fadeTime);
        crossT += dt; zoomT += dt;
        float k = crossTime > 0 ? Mathf.Clamp01(crossT / crossTime) : 1;
        Front.color = new Color(1, 1, 1, k);
        Front.rectTransform.localScale = Vector3.one * (1 + zoomPerSec * zoomT);
        if (k >= 1) Back.color = new Color(1, 1, 1, 0);

        bool done1 = shown >= full.Length;
        if (!done1)
        {
            shown += dt * charsPerSec;
            int n = Mathf.Min(full.Length, Mathf.FloorToInt(shown));
            captionText.text = full.Substring(0, n);
            done1 = n >= full.Length;
        }
        if (nextMark) { nextMark.SetActive(done1); if (done1) nextMark.transform.localScale = Vector3.one * (1 + 0.08f * Mathf.Sin(Time.unscaledTime * 6)); }
        lineT += dt;
        if (autoNext > 0 && done1 && lineT >= autoNext + full.Length / charsPerSec) { Next(); return; }
        if (fadeT > fadeTime * 0.5f && Pressed())
        {
            if (!done1) { shown = full.Length; captionText.text = full; }
            else Next();
        }
    }

    static bool Pressed()
    {
        var m = Mouse.current; var kb = Keyboard.current;
        if (m != null && m.leftButton.wasPressedThisFrame) return !OverButton();
        return kb != null && (kb.spaceKey.wasPressedThisFrame || kb.enterKey.wasPressedThisFrame || kb.numpadEnterKey.wasPressedThisFrame);
    }

    static bool OverButton()
    {
        var es = UnityEngine.EventSystems.EventSystem.current; var m = Mouse.current;
        if (!es || m == null) return false;
        var data = new UnityEngine.EventSystems.PointerEventData(es) { position = m.position.ReadValue() };
        var hits = new System.Collections.Generic.List<UnityEngine.EventSystems.RaycastResult>();
        es.RaycastAll(data, hits);
        foreach (var h in hits) if (h.gameObject.GetComponentInParent<Button>()) return true;
        return false;
    }
}
