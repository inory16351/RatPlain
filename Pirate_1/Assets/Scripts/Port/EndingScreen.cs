using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

// 엔딩: 마지막 바다를 처음 정복하고 항구로 돌아오면 한 번 (결과 창 위에 뜸)
// 그림 · 글 줄 · 버튼은 하이라키(Port 씬 EndingPanel)에 있음. 여기는 띄우고 줄을 차례로 보여 주는 동작만
// 클릭 · Space = 다음 줄, Esc (TitleScreen 이 넘겨 줌) · "항구로" = 닫기. 본 뒤엔 Save.story = 2
public class EndingScreen : MonoBehaviour
{
    public GameObject panel;
    [Tooltip("엔딩 줄 (차례로 나타남)")]
    public Text[] lines;
    public Button next, go;
    public float lineEvery = 1.8f;

    int shown;
    float t;
    bool pending; // 전투 결과 (PortUI.Start 가 비우기 전에 Awake 에서 확인)

    public bool IsOpen => panel && panel.activeSelf;

    void Awake()
    {
        var r = GameSession.last;
        pending = r != null && r.win && r.sea >= Shipyard.DB.seas.Count - 1 && Shipyard.Save.story < 2;
    }

    void Start()
    {
        next.onClick.AddListener(NextLine);
        go.onClick.AddListener(Close);
        panel.SetActive(false);
        if (pending) Open();
    }

    [ContextMenu("엔딩 보기 (테스트)")]
    public void Open()
    {
        panel.SetActive(true);
        panel.transform.SetAsLastSibling();
        shown = 0; t = 0;
        foreach (var l in lines) l.color = new Color(l.color.r, l.color.g, l.color.b, 0);
        Sfx.Play("ui_buy");
        NextLine();
    }

    void NextLine()
    {
        if (shown < lines.Length) { var l = lines[shown++]; l.color = new Color(l.color.r, l.color.g, l.color.b, 1); Sfx.Play("wood", 0.5f); }
        t = lineEvery;
    }

    public void Close()
    {
        if (!IsOpen) return;
        Shipyard.SeenStory(2);
        Sfx.Play("ui_click");
        panel.SetActive(false);
    }

    void Update()
    {
        if (!IsOpen) return;
        var kb = Keyboard.current;
        if (kb != null && (kb.spaceKey.wasPressedThisFrame || kb.enterKey.wasPressedThisFrame)) NextLine();
        if (shown < lines.Length && (t -= Time.unscaledDeltaTime) <= 0) NextLine();
    }
}
