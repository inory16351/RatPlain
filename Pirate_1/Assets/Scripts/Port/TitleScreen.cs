using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

// 타이틀 · 스토리 (웹 port.js openTitle · openStory)
// 처음 켜면 타이틀 → (처음 한 번만) 애꾸 선장 이야기가 한 줄씩 → 항구. 전투에서 돌아오면 바로 항구
// 스토리: 클릭 · Space = 다음 줄, Esc = 건너뛰기, "닻 올려라!" = 항구로
// 기록이 있으면 이어서 출항하기 (titleGo) · 새로 출항하기 = 새 게임 (확인 창 뒤 기록 지움), 없으면 새로 출항하기만
public class TitleScreen : MonoBehaviour
{
    [Header("이어하기 · 새 게임")]
    public Button newGame;
    public Text titleGoText, saveInfo;
    [Tooltip("새 게임 확인 창 (기록이 지워짐)")]
    public GameObject confirmPanel;
    public Button confirmYes, confirmNo;
    static bool storyFirst; // 새 게임으로 다시 연 항구: 바로 이야기부터

    public GameObject titlePanel, storyPanel;
    public Button titleGo, storyGo, storyNext;
    [Tooltip("이야기 줄 (차례로 나타남)")]
    public Text[] storyLines;
    public float lineEvery = 1.5f;

    static bool seenTitle; // 이번 실행에서 타이틀을 이미 지났으면 다시 안 띄움
    int shown;
    float t;

    bool cameBack; // 전투에서 돌아옴 (PortUI.Start 가 결과를 비우기 전에 Awake 에서 확인)
    void Awake() { cameBack = GameSession.last != null; }

    void Start()
    {
        bool has = Shipyard.HasSave;
        titleGo.onClick.AddListener(() => { Sfx.Play("ui_click"); seenTitle = true; if (!has) StartNew(); else if (Shipyard.Save.story < 1) OpenStory(); else Close(); });
        if (titleGoText) titleGoText.text = has ? "이어서 출항하기" : "새로 출항하기";
        if (saveInfo) saveInfo.text = has ? Shipyard.SaveSummary() : "";
        if (newGame)
        {
            newGame.gameObject.SetActive(has);
            newGame.onClick.AddListener(() => { Sfx.Play("ui_click"); if (confirmPanel) confirmPanel.SetActive(true); else StartNew(); });
        }
        if (confirmPanel) confirmPanel.SetActive(false);
        if (confirmYes) confirmYes.onClick.AddListener(StartNew);
        if (confirmNo) confirmNo.onClick.AddListener(() => { Sfx.Play("ui_click"); confirmPanel.SetActive(false); });
        storyGo.onClick.AddListener(EndStory);
        storyNext.onClick.AddListener(NextLine);
        storyPanel.SetActive(false);
        titlePanel.SetActive(!seenTitle && !cameBack);
        if (cameBack) seenTitle = true; // 전투에서 왔으면 이번 실행 내내 타이틀 안 띄움
        if (storyFirst) { storyFirst = false; OpenStory(); }
    }

    // 기록을 지우고 항구를 다시 열어 처음 상태로 보여 준 뒤 이야기부터
    void StartNew()
    {
        Shipyard.NewGame();
        seenTitle = true; storyFirst = true;
        GameSession.last = null; GameSession.sea = -1;
        Sfx.Play("ui_buy");
        UnityEngine.SceneManagement.SceneManager.LoadScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene().buildIndex);
    }

    void OpenStory()
    {
        titlePanel.SetActive(false);
        storyPanel.SetActive(true);
        shown = 0; t = 0;
        foreach (var l in storyLines) l.color = new Color(l.color.r, l.color.g, l.color.b, 0);
        NextLine();
    }

    void NextLine()
    {
        if (shown < storyLines.Length) { var l = storyLines[shown++]; l.color = new Color(l.color.r, l.color.g, l.color.b, 1); Sfx.Play("wood", 0.5f); }
        t = lineEvery;
    }

    void EndStory() { Shipyard.SeenStory(1); Sfx.Play("ui_buy"); Close(); }
    void Close() { titlePanel.SetActive(false); storyPanel.SetActive(false); }

    void Update()
    {
        var kb = Keyboard.current;
        if (titlePanel.activeSelf && (!confirmPanel || !confirmPanel.activeSelf) && kb != null && kb.enterKey.wasPressedThisFrame) titleGo.onClick.Invoke();
        if (confirmPanel && confirmPanel.activeSelf && kb != null && kb.escapeKey.wasPressedThisFrame) confirmPanel.SetActive(false);
        if (!storyPanel.activeSelf) return;
        if (kb != null && kb.escapeKey.wasPressedThisFrame) { EndStory(); return; }
        if (kb != null && (kb.spaceKey.wasPressedThisFrame || kb.enterKey.wasPressedThisFrame)) NextLine();
        if (shown < storyLines.Length && (t -= Time.unscaledDeltaTime) <= 0) NextLine();
    }
}
