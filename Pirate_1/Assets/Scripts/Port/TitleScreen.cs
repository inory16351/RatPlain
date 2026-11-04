using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

// 메인 로비 (타이틀) · 스토리 (웹 port.js openTitle · openStory)
// 처음 켜면 로비 → (처음 한 번만) 애꾸 선장 이야기가 한 줄씩 → 항구. 전투에서 돌아오면 바로 항구
// 스토리: 클릭 · Space = 다음 줄, Esc = 건너뛰기, "닻 올려라!" = 항구로
// 로비 버튼: 이어서 출항하기 (titleGo, 기록 있을 때만) · 새로 출항하기 (기록 있으면 확인 창 뒤 지움) · 설정 · 게임 종료 (WebGL 빌드엔 없음)
// 항구 Esc: 열린 창(설정 · 확인 · 이야기 · popups) 먼저 닫고, 없으면 "메인메뉴로 나가시겠습니까?" 배너 → 예 = 로비
public class TitleScreen : MonoBehaviour
{
    [Header("이어하기 · 새 게임")]
    public Button newGame;
    public Text titleGoText, saveInfo;
    [Tooltip("새 게임 확인 창 (기록이 지워짐)")]
    public GameObject confirmPanel;
    public Button confirmYes, confirmNo;
    static bool storyFirst; // 새 게임으로 다시 연 항구: 바로 이야기부터
    public static bool lobbyNext; // 전투에서 Esc → 예: 항구를 열자마자 로비

    [Header("설정 · 게임 종료")]
    public Button settingsButton, quitButton;
    public GameObject settingsPanel;
    public Toggle soundToggle;
    public Slider volumeSlider;
    public Button settingsClose;

    [Header("Esc")]
    public ExitMenu exitMenu;
    [Tooltip("Esc 로 먼저 닫을 항구 창 (결과 창 등)")]
    public GameObject[] popups;

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
        titleGo.onClick.AddListener(() => { Sfx.Play("ui_click"); seenTitle = true; if (Shipyard.Save.story < 1) OpenStory(); else Close(); });
        if (newGame) newGame.onClick.AddListener(() => { Sfx.Play("ui_click"); if (Shipyard.HasSave && confirmPanel) confirmPanel.SetActive(true); else StartNew(); });
        if (settingsButton) settingsButton.onClick.AddListener(() => { Sfx.Play("ui_click"); OpenSettings(); });
        if (settingsClose) settingsClose.onClick.AddListener(() => { Sfx.Play("ui_click"); settingsPanel.SetActive(false); });
        if (soundToggle) soundToggle.onValueChanged.AddListener(on => { Sfx.Muted = !on; Sfx.Play("ui_click"); });
        if (volumeSlider) volumeSlider.onValueChanged.AddListener(v => Sfx.Volume = v);
        if (quitButton)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            quitButton.gameObject.SetActive(false); // 브라우저에선 종료가 안 됨
#endif
            quitButton.onClick.AddListener(Quit);
        }
        if (settingsPanel) settingsPanel.SetActive(false);
        if (exitMenu) exitMenu.onYes = OpenLobby;
        RefreshLobby();
        Loc.Changed += RefreshLobby;
        if (confirmPanel) confirmPanel.SetActive(false);
        if (confirmYes) confirmYes.onClick.AddListener(StartNew);
        if (confirmNo) confirmNo.onClick.AddListener(() => { Sfx.Play("ui_click"); confirmPanel.SetActive(false); });
        storyGo.onClick.AddListener(EndStory);
        storyNext.onClick.AddListener(NextLine);
        storyPanel.SetActive(false);
        titlePanel.SetActive(lobbyNext || (!seenTitle && !cameBack));
        if (cameBack) seenTitle = true; // 전투에서 왔으면 이번 실행 내내 타이틀 안 띄움
        lobbyNext = false;
        if (storyFirst) { storyFirst = false; OpenStory(); }
    }

    void OnDestroy() { Loc.Changed -= RefreshLobby; }

    // 기록 유무에 따라 이어하기 버튼 · 기록 요약
    void RefreshLobby()
    {
        bool has = Shipyard.HasSave;
        titleGo.gameObject.SetActive(has);
        if (titleGoText) titleGoText.text = Loc.T("lobby.continue");
        if (saveInfo) saveInfo.text = has ? Shipyard.SaveSummary() : "";
    }

    public void OpenLobby()
    {
        RefreshLobby();
        storyPanel.SetActive(false);
        titlePanel.SetActive(true);
    }

    void OpenSettings()
    {
        if (soundToggle) soundToggle.SetIsOnWithoutNotify(!Sfx.Muted);
        if (volumeSlider) volumeSlider.SetValueWithoutNotify(Sfx.Volume);
        settingsPanel.SetActive(true);
    }

    void Quit()
    {
        Sfx.Play("ui_click");
#if UNITY_EDITOR
        UnityEditor.EditorApplication.isPlaying = false;
#else
        Application.Quit();
#endif
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

    // 항구 Esc: 위에 열린 것부터 하나씩 닫고, 아무것도 없으면 메인메뉴 확인 배너
    void Escape()
    {
        if (exitMenu && exitMenu.IsOpen) { exitMenu.Close(); return; }
        if (settingsPanel && settingsPanel.activeSelf) { settingsPanel.SetActive(false); return; }
        if (confirmPanel && confirmPanel.activeSelf) { confirmPanel.SetActive(false); return; }
        if (storyPanel.activeSelf) { EndStory(); return; }
        if (titlePanel.activeSelf) return;
        foreach (var p in popups) if (p && p.activeSelf) { p.SetActive(false); return; }
        if (exitMenu) exitMenu.Open();
    }

    void EndStory() { Shipyard.SeenStory(1); Sfx.Play("ui_buy"); Close(); }
    void Close() { titlePanel.SetActive(false); storyPanel.SetActive(false); }

    void Update()
    {
        var kb = Keyboard.current;
        bool popupOpen = (confirmPanel && confirmPanel.activeSelf) || (settingsPanel && settingsPanel.activeSelf);
        if (titlePanel.activeSelf && !popupOpen && kb != null && kb.enterKey.wasPressedThisFrame) (titleGo.gameObject.activeSelf ? titleGo : newGame).onClick.Invoke();
        if (kb != null && kb.escapeKey.wasPressedThisFrame) Escape();
        if (!storyPanel.activeSelf) return;
        if (kb != null && (kb.spaceKey.wasPressedThisFrame || kb.enterKey.wasPressedThisFrame)) NextLine();
        if (shown < storyLines.Length && (t -= Time.unscaledDeltaTime) <= 0) NextLine();
    }
}
