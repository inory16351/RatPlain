using UnityEngine;
using UnityEngine.UI;

// 화면 글자 · 막대: 체력 · 금화 · 판자 · 웨이브 · 알림 · 보스 체력 · 아이템 사용 안내
// 막대는 피벗이 왼쪽인 이미지의 가로 크기로 줄임
public class HUD : MonoBehaviour
{
    public RectTransform hpFill;
    public Text hpText, goldText, plankText, waveText, msgText, subText, hintText;
    [Tooltip("선원 수 · 장전 단축")]
    public Text crewText;
    public Text killText;
    [Tooltip("웨이브 글자 옆 아이콘: 평소 깃발, 보스 때 고양이 제독")]
    public Image waveIcon;
    public Sprite waveSprite, bossSprite;

    [Header("웹 HUD 나머지")]
    [Tooltip("체력 막대 옆 선장 얼굴 (배 단계 0~5)")]
    public Image portrait;
    public Sprite[] captainPortraits;
    [Tooltip("Q 왼쪽 · E 오른쪽 뱃전 장전 막대 (피벗 왼쪽)")]
    public RectTransform reloadLeft, reloadRight;
    public Image reloadLeftImg, reloadRightImg;
    public Text reloadLeftText, reloadRightText, sailText, autosText;
    public GameObject comboRoot;
    public Text comboText, comboSub;
    [Tooltip("알림 글자 뒤 어두운 띠")]
    public GameObject msgBand;
    [Tooltip("맞으면 빨간 번짐 · 체력 30% 아래면 깜빡임")]
    public Image damageFlash;
    public GameObject pausePanel;
    public Color reloadReady = new Color(1f, 0.85f, 0.29f), reloadLoading = new Color(0.63f, 0.44f, 0.19f);
    string shipName = "";

    void Start()
    {
        var p = GameManager.I.player;
        if (Shipyard.DB)
        {
            var s = Shipyard.Compute().ship;
            shipName = s.name + "  ";
            if (portrait && captainPortraits != null && captainPortraits.Length > 0) portrait.sprite = captainPortraits[Mathf.Clamp(s.tier, 0, captainPortraits.Length - 1)];
        }
        // 자동 무기 목록 (가진 것만)
        var autos = new System.Collections.Generic.List<string>();
        if (p.bow > 0) autos.Add("선수포"); if (p.torpedo > 0) autos.Add("어뢰"); if (p.missile > 0) autos.Add("유도탄");
        if (p.autoMortar > 0) autos.Add("자동 폭격"); if (p.planes > 0) autos.Add($"함재기 ×{Mathf.RoundToInt(p.planes)}");
        if (autosText) autosText.text = autos.Count > 0 ? "자동: " + string.Join(" · ", autos) : "";
    }
    public GameObject bossBar;
    public RectTransform bossFill;
    public Text bossName;

    void Update()
    {
        var gm = GameManager.I;
        var p = gm.player;
        hpFill.localScale = new Vector3(Mathf.Clamp01(p.hp / p.maxHp), 1, 1);
        hpText.text = $"{shipName}{Mathf.CeilToInt(Mathf.Max(0, p.hp))} / {p.maxHp:0}";
        Reload(reloadLeft, reloadLeftImg, reloadLeftText, "Q 왼쪽", p.Cooldown(-1), p);
        Reload(reloadRight, reloadRightImg, reloadRightText, "E 오른쪽", p.Cooldown(1), p);
        if (sailText) sailText.text = $"돛 {Mathf.RoundToInt(p.sail * 100)}%";
        if (comboRoot)
        {
            bool on = gm.combo >= 3 && !gm.Over;
            if (comboRoot.activeSelf != on) comboRoot.SetActive(on);
            if (on)
            {
                comboText.text = $"{gm.combo} 콤보!"; comboText.color = gm.combo >= 10 ? new Color(1f, 0.54f, 0.16f) : new Color(1f, 0.85f, 0.29f);
                comboSub.text = $"금화 +{Mathf.FloorToInt(gm.combo / 5f) * 10}%";
                comboRoot.transform.localScale = Vector3.one * (1 + Mathf.Min(0.5f, gm.combo * 0.02f));
            }
        }
        if (damageFlash)
        {
            float a = p.HitT * 0.6f;
            if (p.hp / p.maxHp < 0.3f && !gm.Over) a = Mathf.Max(a, 0.1f + 0.07f * Mathf.Sin(Time.time * 6));
            damageFlash.color = new Color(0.78f, 0.1f, 0.08f, a);
        }
        bool pp = gm.Paused && !(gm.exitMenu && gm.exitMenu.IsOpen); // Esc 배너가 떠 있을 땐 일시정지 안내 숨김
        if (pausePanel && pausePanel.activeSelf != pp) pausePanel.SetActive(pp);
        goldText.text = gm.gold.ToString();
        plankText.text = gm.plank.ToString();
        if (crewText) crewText.text = $"선원 {p.crew}  <size=15>장전 −{Mathf.RoundToInt(Mathf.Min(p.crewMax, p.crew) * p.crewReload * 100)}%</size>";
        bool bossWave = gm.wave > gm.waves.Length;
        waveText.text = bossWave ? "보스" : $"웨이브 {gm.wave}/{gm.waves.Length}";
        if (waveIcon) waveIcon.sprite = bossWave ? bossSprite : waveSprite;
        if (killText) killText.text = gm.kills.ToString();

        bool show = gm.msgT > 0;
        msgText.enabled = subText.enabled = show;
        if (msgBand && msgBand.activeSelf != show) msgBand.SetActive(show);
        if (show) { msgText.text = gm.msg; subText.text = gm.sub; }

        var boss = gm.bossShip;
        bossBar.SetActive(boss);
        if (boss) { bossName.text = boss.displayName; bossFill.localScale = new Vector3(Mathf.Clamp01(boss.hp / boss.maxHp), 1, 1); }

        var held = p.items.HeldItem;
        hintText.text = gm.Looting ? $"전리품을 줍고  Enter = 항구로 · R = 다시 하기   ({Mathf.CeilToInt(gm.lootLeft)}초 뒤 자동으로 항구)" : held != null ? $"F = {held.name} 사용" : "적 · 보급 상자를 부숴 아이템 얻기";
    }


void Reload(RectTransform bar, Image img, Text label, string name, float cd, PlayerShip p)
    {
        if (!bar) return;
        float q = Mathf.Clamp01(1 - cd / p.ReloadNow);
        bar.localScale = new Vector3(q, 1, 1);
        img.color = q >= 1 ? reloadReady : reloadLoading;
        label.text = $"{name} ×{p.guns}";
    }
}
