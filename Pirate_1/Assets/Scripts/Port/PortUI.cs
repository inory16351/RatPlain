using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

// 항구 (웹 pirate/port.js): 출항(바다) · 조선소(배 진화 트리) · 장비 · 의뢰 · 합성 (사용 아이템은 전투에서만 — 상점 없음)
// 화면 틀 · 줄 원본은 하이라키에 있고, 여기서는 원본 줄을 복제해 내용만 채움
public class PortUI : MonoBehaviour
{
    [Header("위 · 아래")]
    public Text plankText, coinText, talkText;
    public Button[] tabButtons;
    public GameObject[] tabPanels;
    public Color tabOn = new Color(1f, 0.82f, 0.3f), tabOff = new Color(0.25f, 0.2f, 0.15f);

    [Header("출항 (바다 지도)")]
    [Tooltip("바다 카드가 놓이는 해도 (왼쪽 위 기준)")]
    public RectTransform seaList;
    public Text seaMapTitle;
    [Tooltip("바다 사이 점선 뱃길 원본")]
    public Image linkTemplate;
    public Vector2 cardTop = new Vector2(0, 150), cardStep = new Vector2(0, 190);
    public Text seaShipText;
    public Button seaShipButton;
    [Tooltip("배 · 조선공 미리보기 무대")]
    public PortPreview preview;
    public RowView seaRow;
    public Text seaTitle, seaInfo;
    public Button sailButton;
    public Text sailText;

    [Header("조선소")]
    public RectTransform shipGrid;
    public RowView shipNode;
    public Image shipPic;
    public Text shipTitle, shipInfo, shipStats;
    public Button shipButton;
    public Text shipButtonText;
    public Vector2 nodeStep = new Vector2(132, -150), nodeStart = new Vector2(10, -10);
    [Header("조선소 트리 (웹 #pt-tree): 열 = 단계(시대), 줄 = 갈래")]
    public Text treeTitle;
    [Tooltip("단계 0~5 시대 칩 (칩 배경 색 = 단계 색)")]
    public Image[] eraChips;
    [Tooltip("갈래 띠 위 · 가운데 · 아래 (왼쪽에 갈래 이름)")]
    public RectTransform[] laneBands;
    public float laneWidth = 64, nodeGap = 14;
    public Image treeLinkTemplate;
    [Header("조선소 왼쪽 (웹 #pt-prev)")]
    public Image shipTag;
    public Text shipTagText, shipKind, shipStatValues, shipStatDeltas;

    [Header("장비")]
    public RectTransform gearChips;
    public RowView chipRow;
    public RectTransform slotList;
    public RowView slotRow;
    public RectTransform invList;
    public RowView partRow;
    public Text gearStats;
    [Tooltip("장비 탭 수치 표: 왼쪽 4줄 · 오른쪽 4줄 (이름 | 값 | 차이)")]
    public Text[] gearStatNames, gearStatValues, gearStatDeltas;

    [Header("의뢰 · 합성")]
    public Slider coinSlider;
    public Text reqCost, reqOdds, reqResult;
    public Button reqButton;
    public RectTransform fuseList;
    public RowView fuseRow;
    public Text fuseInfo;
    public Button fuseButton;
    public Text fuseButtonText;

    [Header("저장 (바뀔 때마다 자동 저장도 됨)")]
    public Button saveButton;

    [Header("결과")]
    public GameObject resultPanel;
    public Text resultTitle, resultText;
    public Button resultOk;
    [Tooltip("결과 창: 같은 바다 다시 · 다음 바다로")]
    public Button resultAgain, resultNext;
    int lastSea = -1;

    public string battleScene = "Battle";
    [Tooltip("적 원본 (바다 설명에 한글 이름을 쓰려고)")]
    public EnemyShip[] enemyPrefabs;

    string FoeName(string kind)
    {
        var e = enemyPrefabs == null ? null : System.Array.Find(enemyPrefabs, p => p && p.kind == kind);
        return e ? e.Name : Loc.T("foe." + kind, kind);
    }

    int tab, seaSel, eqShip = -1;
    string shipSel, hoverPart;
    readonly List<int> picks = new List<int>();
    readonly List<GameObject> spawned = new List<GameObject>();
    ShipyardDB DB => Shipyard.DB;
    static readonly Color WHITE = Color.white, DIM = new Color(1, 1, 1, 0.45f), ROW = new Color(0.85f, 0.82f, 0.78f, 1f), ROW_ON = new Color(1f, 0.82f, 0.4f, 1f); // 나무 판넬 그림에 곱하는 색

    void Start()
    {
        foreach (var t in new[] { seaRow, shipNode, chipRow, slotRow, partRow, fuseRow }) t.gameObject.SetActive(false);
        if (linkTemplate) linkTemplate.gameObject.SetActive(false);
        if (treeLinkTemplate) treeLinkTemplate.gameObject.SetActive(false);
        if (seaShipButton) seaShipButton.onClick.AddListener(() => { tab = 1; shipSel = Shipyard.Save.ship; Sfx.Play("ui_click"); Render(); });
        for (int i = 0; i < tabButtons.Length; i++) { int k = i; tabButtons[i].onClick.AddListener(() => { tab = k; hoverPart = null; Sfx.Play("ui_click"); Render(); }); }
        sailButton.onClick.AddListener(Sail);
        if (saveButton) saveButton.onClick.AddListener(() => { Shipyard.Store(); Sfx.Play("ui_buy"); Talk(Loc.F("talk.saved", Shipyard.Save.savedAt)); });
        shipButton.onClick.AddListener(ShipAction);
        reqButton.onClick.AddListener(DoRequest);
        fuseButton.onClick.AddListener(DoFuse);
        coinSlider.minValue = Shipyard.REQ_MIN / Shipyard.REQ_STEP; coinSlider.maxValue = Shipyard.REQ_MAX / Shipyard.REQ_STEP; coinSlider.wholeNumbers = true; coinSlider.value = 10;
        coinSlider.onValueChanged.AddListener(_ => RenderLab());
        resultOk.onClick.AddListener(() => { resultPanel.SetActive(false); Sfx.Play("ui_click"); });
        if (resultAgain) resultAgain.onClick.AddListener(() => { seaSel = lastSea; Sail(); });
        if (resultNext) resultNext.onClick.AddListener(() => { seaSel = lastSea + 1; Sail(); });
        seaSel = Shipyard.Save.pick;
        ShowResult();
        Render();
        Loc.Changed += OnLang;
    }
    void OnDestroy() { Loc.Changed -= OnLang; }
    // 설정에서 언어를 바꾸면 코드가 채운 글자를 다시 채움
    void OnLang() { Render(); if (resultPanel && resultPanel.activeSelf && lastResult != null) FillResult(lastResult); }
    BattleResult lastResult;

// 결과 (웹 onEnd): 이기면 전리품 전부 + 다음 바다, 침몰하면 절반
    void ShowResult()
    {
        var r = GameSession.last;
        resultPanel.SetActive(r != null);
        if (r == null) return;
        GameSession.last = null;
        lastSea = r.sea;
        lastResult = r;
        int next = r.sea + 1;
        bool hasNext = FillResult(r);
        if (resultNext) resultNext.gameObject.SetActive(hasNext);
        // 다음 바다 버튼이 없으면 남은 두 버튼을 가운데로
        if (resultOk && resultAgain)
        {
            float x = hasNext ? 220 : 110;
            ((RectTransform)resultOk.transform).anchoredPosition = new Vector2(-x, 30);
            ((RectTransform)resultAgain.transform).anchoredPosition = new Vector2(hasNext ? 0 : x, 30);
        }
        if (hasNext) { seaSel = next; Shipyard.PickSea(next); }
    }

    bool FillResult(BattleResult r)
    {
        var sea = DB.seas[r.sea];
        int next = r.sea + 1;
        resultTitle.text = r.win ? Loc.F("result.win_title", Shipyard.SeaName(sea)) : Loc.T("result.lose_title");
        string head = r.win ? (next < DB.seas.Count ? Loc.F("result.next_open", Shipyard.SeaName(DB.seas[next])) : Loc.T("result.all_clear")) : Loc.T("result.lose_head");
        string half = r.win ? Loc.T("result.full") : Loc.F("result.half", r.plank, r.coin);
        resultText.text = Loc.F("result.body", head, r.gotPlank, r.gotCoin, r.kills, r.rescued, half);
        return r.win && next < DB.seas.Count && next <= Shipyard.Save.unlocked;
    }

    void Say(string s) { talkText.text = s; }
    // 조선공 말풍선 ("조선공: …")
    void Talk(string s) { Say(Loc.F("talk.line", s)); }

    // ── 공용
    RowView Add(RowView template, RectTransform parent)
    {
        var r = Instantiate(template, parent);
        r.gameObject.SetActive(true);
        spawned.Add(r.gameObject);
        return r;
    }
    void Clear() { foreach (var g in spawned) if (g) Destroy(g); spawned.Clear(); }
    string Cost(int plank, int coin) => Loc.F("cost", plank, coin);
    string Grade(PartDef p) => $"<color=#{ColorUtility.ToHtmlStringRGB(DB.gradeColors[p.grade])}>{Shipyard.GradeName(p.grade)}</color>";
    string StatsText(Stats cur, Stats next)
    {
        var a = Shipyard.Summary(cur); var b = next != null ? Shipyard.Summary(next) : null;
        var lines = new List<string>();
        for (int i = 0; i < a.Count; i++)
            lines.Add(b != null && b[i].value != a[i].value ? $"{a[i].label}  {a[i].value} → <color=#ffd84a>{b[i].value}</color>" : $"{a[i].label}  {a[i].value}");
        return string.Join("\n", lines);
    }
    void SetButton(Button b, Text t, string label, bool on) { t.text = label; b.interactable = on; }

    // 탭을 처음 열 때 조선공이 한 번만 알려 줌 (Tutorial · TutorialFlags)
    static readonly string[] TAB_TIPS = { "talk.tip_sea", "talk.tip_ship", "talk.tip_gear", "talk.tip_lab" };

    void Render()
    {
        Clear();
        if (tab < TAB_TIPS.Length && !TutorialFlags.Seen("port_tab" + tab)) { TutorialFlags.Mark("port_tab" + tab); Talk(Loc.T(TAB_TIPS[tab])); }
        var s = Shipyard.Save;
        plankText.text = s.plank.ToString(); coinText.text = s.coin.ToString();
        for (int i = 0; i < tabPanels.Length; i++)
        {
            tabPanels[i].SetActive(i == tab);
            tabButtons[i].GetComponent<Image>().color = i == tab ? tabOn : tabOff;
        }
        if (tab == 0) RenderSea();
        else if (tab == 1) RenderShips();
        else if (tab == 2) RenderGear();
        else if (tab == 3) { RenderLab(); if (preview) preview.ShowWright(Shipyard.Tech()); }
    }

    // ── 출항: 바다 목록 + 고른 바다 설명
// 출항: 해도 위 바다 카드 8장 (뱀 모양 뱃길: 둘째 줄은 오른쪽 → 왼쪽) + 고른 바다 설명 + 내 배 미리보기
    void RenderSea()
    {
        var s = Shipyard.Save;
        int tech = Shipyard.Tech(), n = DB.seas.Count;
        if (seaMapTitle) seaMapTitle.text = Loc.F("sea.map_title", s.cleared.Count, n, tech);
        float cw = seaList.rect.width / 4;
        var at = new Vector2[n];
        for (int i = 0; i < n; i++)
        {
            int row = i / 4, col = row % 2 == 1 ? 3 - i % 4 : i % 4;
            at[i] = new Vector2((col + 0.5f) * cw, -(cardTop.y + row * cardStep.y));
        }
        for (int i = 1; i < n; i++) Link(at[i - 1], at[i], i <= s.unlocked);
        for (int i = 0; i < n; i++)
        {
            var sea = DB.seas[i]; int k = i;
            bool open = i <= s.unlocked, clear = s.cleared.Contains(sea.id), built = sea.IsBuilt(DB);
            var r = Add(seaRow, seaList);
            ((RectTransform)r.transform).anchoredPosition = at[i];
            r.title.text = Loc.F("sea.nth", i + 1);
            string trait = TraitName(sea.trait);
            r.desc.text = open ? $"<size=19><b>{Shipyard.SeaName(sea)}</b></size>\n{Loc.F("sea.rec", sea.rec)}" + (trait != "" ? $" · {trait}" : "") + (sea.rec > tech ? $"  <color=#ff8a7a>{Loc.T("sea.danger")}</color>" : "") + (built ? "" : "\n" + Loc.T("sea.wip")) : $"<size=19><b>???</b></size>\n{Loc.T("sea.locked")}";
            r.right.text = clear ? Loc.T("sea.cleared") : "";
            ColorUtility.TryParseHtmlString(sea.col0, out var sc);
            r.bg.color = !open ? new Color(0.5f, 0.5f, 0.5f, 0.85f) : i == seaSel ? new Color(1f, 0.86f, 0.45f) : Color.Lerp(Color.white, sc, 0.45f);
            r.click.interactable = open;
            r.click.onClick.AddListener(() => { seaSel = k; Shipyard.PickSea(k); Sfx.Play("ui_click"); Render(); });
        }
        var S = DB.seas[seaSel];
        seaTitle.text = $"{seaSel + 1}. {Shipyard.SeaName(S)}" + (s.cleared.Contains(S.id) ? $"  <size=18>{Loc.T("sea.cleared_title")}</size>" : "");
        var foes = S.waves.SelectMany(w => w.Split(',')).Select(x => x.Trim()).Distinct();
        string tr = TraitName(S.trait), trDesc = tr == "" ? "" : Loc.T("trait." + S.trait + "_desc");
        string alert = S.rec > tech ? $"<color=#ff8a7a>{Loc.F("sea.alert_hard", S.rec, tech)}</color>" : $"<color=#9fe07a>{Loc.F("sea.alert_ok", S.rec, tech)}</color>";
        seaInfo.text = Loc.F("sea.info", Shipyard.SeaStory(S), FoeName(S.boss), string.Join(" · ", foes.Select(FoeName)), Shipyard.WavesOf(seaSel).Length, tr == "" ? Loc.T("trait.none") : tr + " — " + trDesc, S.mult, alert);
        var me = Shipyard.Ship(s.ship);
        if (seaShipText)
        {
            var sum = Shipyard.Summary(Shipyard.Compute()).Where(x => x.id == "hull" || x.id == "speed" || x.id == "power").Select(x => $"{x.label} {x.value}");
            seaShipText.text = Loc.F("sea.ship_line", Shipyard.ShipName(me), me.tier, Shipyard.ShipKind(me), string.Join(" · ", sum));
        }
        if (preview) preview.ShowShip(s.ship);
        bool ok = seaSel <= s.unlocked && S.IsBuilt(DB);
        SetButton(sailButton, sailText, ok ? Loc.F("sea.sail", Shipyard.ShipName(me)) : Loc.T("sea.wip"), ok);
    }

    static string TraitName(string t) => t == "fog" || t == "storm" || t == "whirl" ? Loc.T("trait." + t) : "";

    // 뱃길: 앞 바다 → 다음 바다 점선 (열린 길 = 금빛)
    void Link(Vector2 a, Vector2 b, bool on)
    {
        var im = Instantiate(linkTemplate, seaList);
        im.gameObject.SetActive(true);
        spawned.Add(im.gameObject);
        var rt = im.rectTransform;
        rt.anchoredPosition = (a + b) / 2;
        rt.sizeDelta = new Vector2(Vector2.Distance(a, b), 8);
        rt.localRotation = Quaternion.Euler(0, 0, Mathf.Atan2(b.y - a.y, b.x - a.x) * Mathf.Rad2Deg);
        im.color = on ? new Color(1f, 0.83f, 0.36f, 1f) : new Color(1, 1, 1, 0.3f);
    }

    void Sail()
    {
        GameSession.sea = seaSel;
        Sfx.Play("ui_click");
        Shipyard.PickSea(seaSel);
        SceneManager.LoadScene(battleScene);
    }

    // ── 조선소: 배 진화 트리 (가로 = 단계, 세로 = 갈래)
// 조선소: 배 진화 트리 (열 = 단계 · 시대, 줄 = 갈래) + 왼쪽 미리보기
    void RenderShips()
    {
        var s = Shipyard.Save;
        shipSel ??= s.ship;
        int tech = Shipyard.Tech();
        if (treeTitle) treeTitle.text = Loc.F("ship.tree_title", tech);
        var size = shipGrid.rect.size;
        float colW = (size.x - laneWidth) / 6, rowH = size.y / 3;
        Vector2 Center(ShipDef d) => new Vector2(laneWidth + (d.tier + 0.5f) * colW, -(d.row + 0.5f) * rowH);
        var nodeSize = new Vector2(colW - nodeGap, rowH - nodeGap);
        // 시대 칩 (열 위) · 갈래 띠 (줄 뒤)
        if (eraChips != null)
            for (int i = 0; i < eraChips.Length && i < 6; i++)
            {
                var rt = eraChips[i].rectTransform;
                rt.anchoredPosition = new Vector2(laneWidth + (i + 0.5f) * colW, 18);
                rt.sizeDelta = new Vector2(colW - 6, 26);
                eraChips[i].color = TierCol(i);
                eraChips[i].GetComponentInChildren<Text>().text = Loc.F("ship.era_chip", i, Shipyard.EraName(i));
            }
        if (laneBands != null)
            for (int r = 0; r < laneBands.Length; r++)
            {
                laneBands[r].anchoredPosition = new Vector2(size.x / 2, -(r + 0.5f) * rowH);
                laneBands[r].sizeDelta = new Vector2(size.x, rowH - 6);
            }
        // 부모 배 → 다음 배 선 (가진 배까지 = 초록)
        foreach (var sh in DB.ships)
            if (!string.IsNullOrEmpty(sh.req))
            {
                var par = Shipyard.Ship(sh.req);
                TreeLink(Center(par) + new Vector2(nodeSize.x / 2, 0), Center(sh) - new Vector2(nodeSize.x / 2, 0), Shipyard.Owns(sh.id));
            }
        foreach (var sh in DB.ships)
        {
            var r = Add(shipNode, shipGrid);
            var rt = (RectTransform)r.transform;
            rt.anchoredPosition = Center(sh);
            rt.sizeDelta = nodeSize;
            bool own = Shipyard.Owns(sh.id), buy = Shipyard.ShipBuyable(sh), use = s.ship == sh.id, sel = sh.id == shipSel;
            r.icon.sprite = sh.sprite; r.icon.color = own || buy ? WHITE : new Color(0.3f, 0.3f, 0.3f, 0.7f);
            r.title.text = Shipyard.ShipName(sh);
            string st = use ? $"<color=#ffd84a>{Loc.T("ship.using")}</color>" : own ? $"<color=#9fe07a>{Loc.T("ship.owned")}</color>" : buy ? $"<size=11>{Cost(sh.costPlank, sh.costCoin)}</size>" : Loc.T("ship.locked");
            r.desc.text = $"<size=12>{Shipyard.ShipKind(sh)}</size>\n{st}";
            // 고른 배 = 파랑, 타는 배 = 금빛, 가진 배 = 초록, 잠긴 배 = 어둡게
            r.bg.color = sel ? new Color(0.62f, 0.85f, 1f) : use ? ROW_ON : own ? new Color(0.72f, 0.95f, 0.78f) : buy ? ROW : new Color(0.55f, 0.52f, 0.5f, 0.55f);
            r.title.color = own || buy ? WHITE : DIM;
            string id = sh.id;
            r.click.onClick.AddListener(() => { shipSel = id; Sfx.Play("ui_click", 0.5f); Render(); });
        }
        var f = Shipyard.Ship(shipSel);
        shipPic.sprite = f.sprite;
        shipTitle.text = Shipyard.ShipName(f);
        if (shipTag) { shipTag.color = TierCol(f.tier); shipTagText.text = Loc.F("tier", f.tier); }
        if (shipKind) shipKind.text = $"{Shipyard.ShipKind(f)} · {(string.IsNullOrEmpty(f.line) ? Loc.T("ship.start") : Shipyard.LineName(f.line))} · {Shipyard.EraName(f.tier)}";
        shipInfo.text = $"{Shipyard.ShipDesc(f)}\n<color=#ffd84a>{Loc.F("ship.slots", f.slots.Length)}</color> · {string.Join(" · ", f.slots.Select(x => Shipyard.SlotName(x)))}";
        StatColumns(Shipyard.Compute(), f.id == s.ship ? null : Shipyard.Compute(f.id));
        if (preview) preview.ShowShip(f.id);
        if (s.ship == f.id) SetButton(shipButton, shipButtonText, Loc.T("ship.using"), false);
        else if (Shipyard.Owns(f.id)) SetButton(shipButton, shipButtonText, Loc.T("ship.switch"), true);
        else if (Shipyard.ShipBuyable(f)) SetButton(shipButton, shipButtonText, Loc.F("ship.build", Cost(f.costPlank, f.costCoin)), Shipyard.Can(f.costPlank, f.costCoin));
        else SetButton(shipButton, shipButtonText, Loc.F("ship.need", Shipyard.ShipKind(Shipyard.Ship(f.req))), false);
    }

    // 단계 색 (웹 TIER_COL)
    static readonly string[] TIER_COL = { "#b9a58a", "#9fc37a", "#7fc7d8", "#8fa2ff", "#d68cff", "#ff8fa8" };
    static Color TierCol(int t) { ColorUtility.TryParseHtmlString(TIER_COL[Mathf.Clamp(t, 0, 5)], out var c); return c; }

    // 수치 표 3줄: 이름 | 값 | 바뀔 때 차이 (장전 · 받는 피해는 낮을수록 좋음 = 초록)
// 수치 표 3줄: 이름 | 값 | 바뀔 때 차이 (장전 · 받는 피해는 낮을수록 좋음 = 초록)
    void StatColumns(Stats cur, Stats next) => FillStats(shipStats, shipStatValues, shipStatDeltas, cur, next, 0, 99);

    void FillStats(Text nameCol, Text valCol, Text deltaCol, Stats cur, Stats next, int from, int to)
    {
        var a = Shipyard.Summary(cur); var b = next != null ? Shipyard.Summary(next) : a;
        var names = new List<string>(); var vals = new List<string>(); var ds = new List<string>();
        for (int i = from; i < a.Count && i < to; i++)
        {
            names.Add(a[i].label); vals.Add(b[i].value);
            float d = Num(b[i].value) - Num(a[i].value);
            bool lower = a[i].id == "reload" || a[i].id == "taken";
            bool good = lower ? d < 0 : d > 0;
            ds.Add(Mathf.Abs(d) < 0.005f ? "" : $"<color={(good ? "#9fe07a" : "#ff8a7a")}>{(d > 0 ? "+" : "")}{d:0.##}</color>");
        }
        nameCol.text = string.Join("\n", names);
        if (valCol) valCol.text = string.Join("\n", vals);
        if (deltaCol) deltaCol.text = string.Join("\n", ds);
    }
    static float Num(string v) { var m = System.Text.RegularExpressions.Regex.Match(v, @"-?[0-9.]+"); return m.Success ? float.Parse(m.Value, System.Globalization.CultureInfo.InvariantCulture) : 0; }

    void TreeLink(Vector2 a, Vector2 b, bool on)
    {
        var im = Instantiate(treeLinkTemplate, shipGrid);
        im.gameObject.SetActive(true);
        spawned.Add(im.gameObject);
        var rt = im.rectTransform;
        rt.anchoredPosition = (a + b) / 2;
        rt.sizeDelta = new Vector2(Vector2.Distance(a, b), on ? 5 : 3); // 줄선: 가진 배까지 굵은 초록, 나머지 가는 흰선
        rt.localRotation = Quaternion.Euler(0, 0, Mathf.Atan2(b.y - a.y, b.x - a.x) * Mathf.Rad2Deg);
        im.color = on ? new Color(0.56f, 0.94f, 0.54f, 1f) : new Color(1, 1, 1, 0.35f);
    }

    void ShipAction()
    {
        var f = Shipyard.Ship(shipSel);
        if (Shipyard.Owns(f.id)) { Shipyard.UseShip(f.id); Sfx.Play("ui_click"); Talk(Loc.F("talk.ready", Shipyard.ShipName(f))); }
        else if (Shipyard.BuyShip(f.id)) Talk(Loc.F("talk.launched", Shipyard.ShipName(f)));
        else { Talk(Loc.T("talk.no_money")); Sfx.Play("fail"); }
        if (Shipyard.Owns(f.id) && Shipyard.Save.ship == f.id) Sfx.Play("ui_buy");
        Render();
    }

    // ── 장비: 가진 배 고르기 → 슬롯마다 낀 장비 + 낄 수 있는 장비 목록
    void RenderGear()
    {
        var s = Shipyard.Save;
        if (eqShip < 0 || eqShip >= s.ships.Count) eqShip = Mathf.Max(0, s.ships.IndexOf(s.ship));
        string sid = s.ships[eqShip];
        var f = Shipyard.Ship(sid);
        for (int i = 0; i < s.ships.Count; i++)
        {
            var r = Add(chipRow, gearChips); int k = i;
            var sh = Shipyard.Ship(s.ships[i]);
            r.icon.sprite = sh.sprite; r.title.text = Shipyard.ShipName(sh);
            r.bg.color = i == eqShip ? ROW_ON : ROW;
            r.click.onClick.AddListener(() => { eqShip = k; hoverPart = null; Render(); });
        }
        foreach (var sl in f.slots)
        {
            var r = Add(slotRow, slotList);
            var st = Shipyard.SlotType(sl);
            var it = Shipyard.ItemOf(Shipyard.EquippedUid(sid, sl));
            var p = it != null ? Shipyard.Part(it.id) : null;
            r.icon.sprite = p != null ? p.icon : st.icon; r.icon.color = p != null ? WHITE : DIM;
            r.title.text = p != null ? $"{p.Name}  {Grade(p)} · T{p.tier}" : Loc.F("gear.empty", Shipyard.SlotName(sl));
            // 슬롯 이름은 설명 앞에 (오른쪽 위에 두면 빼기 단추와 겹침)
            r.desc.text = $"<color=#ffd84a>{Shipyard.SlotName(sl)}</color>" + (p != null ? $" · {p.Desc}" : "");
            r.right.text = "";
            string slot = sl;
            r.button.gameObject.SetActive(p != null);
            r.buttonText.text = Loc.T("gear.unequip");
            r.button.onClick.AddListener(() => { Shipyard.Unequip(sid, slot); Sfx.Play("ui_click"); Render(); });
        }
        // 이 배에 맞는 장비 (등급 · 티어 높은 순), 같은 장비는 하나로 묶음
        var groups = s.items.Where(it => Shipyard.Part(it.id).fits.Contains(sid)).GroupBy(it => it.id)
            .OrderByDescending(g => Shipyard.Part(g.Key).tier).ThenByDescending(g => Shipyard.Part(g.Key).grade).ThenBy(g => Shipyard.Part(g.Key).slot);
        foreach (var g in groups)
        {
            var p = Shipyard.Part(g.Key);
            var here = g.FirstOrDefault(it => Shipyard.EquippedUid(sid, p.slot) == it.uid);
            var free = g.FirstOrDefault(it => !Shipyard.IsEquipped(it.uid));
            var r = Add(partRow, invList);
            r.icon.sprite = p.icon;
            int n = g.Count();
            r.title.text = $"{p.Name}  {Grade(p)} · T{p.tier}" + (n > 1 ? $"  ×{n}" : "");
            string note = here != null ? "  " + Loc.T("gear.on_this") : free == null ? "  " + Loc.F("gear.on_other", Shipyard.ShipName(Shipyard.Ship(Shipyard.EquippedOn(g.First().uid)))) : "";
            r.desc.text = $"{Shipyard.SlotName(p.slot)} · {p.Desc}{note}";
            r.bg.color = hoverPart == p.id ? ROW_ON : ROW;
            var pick = here ?? free ?? g.First();
            r.buttonText.text = here != null ? Loc.T("gear.equipped") : Loc.T("gear.equip");
            r.button.interactable = here == null;
            int uid = pick.uid; string pid = p.id;
            r.button.onClick.AddListener(() => { if (Shipyard.Equip(uid, sid)) { Talk(Loc.F("talk.equipped", p.Name)); Sfx.Play("ui_buy", 0.6f, 1.3f); } hoverPart = null; Render(); });
            r.click.onClick.AddListener(() => { hoverPart = hoverPart == pid ? null : pid; Render(); });
        }
        if (!groups.Any()) Talk(Loc.T("talk.no_gear"));
        var cur = Shipyard.Compute(sid);
        Stats next = null;
        if (hoverPart != null) next = Shipyard.Compute(sid, new Dictionary<string, string> { { Shipyard.Part(hoverPart).slot, hoverPart } });
        if (gearStatNames != null && gearStatNames.Length == 2)
        {
            gearStats.text = Loc.F("gear.stats_title", Shipyard.ShipName(f)) + (hoverPart != null ? $"  <size=14><color=#ffd84a>{Loc.T("gear.preview")}</color></size>" : $"  <size=14>{Loc.T("gear.hint")}</size>");
            for (int g = 0; g < 2; g++) FillStats(gearStatNames[g], gearStatValues[g], gearStatDeltas[g], cur, next, g * 4, g * 4 + 4);
        }
        else gearStats.text = $"<b>{Shipyard.ShipName(f)}</b>" + (hoverPart != null ? $"  ({Loc.T("gear.preview")})" : "") + "\n" + StatsText(cur, next);
    }

    // ── 의뢰 · 합성
    int ReqCoin => Mathf.RoundToInt(coinSlider.value) * Shipyard.REQ_STEP;
    void RenderLab()
    {
        Clear();
        var s = Shipyard.Save;
        plankText.text = s.plank.ToString(); coinText.text = s.coin.ToString();
        var cost = Shipyard.RequestCost(ReqCoin);
        reqCost.text = Loc.F("lab.cost", Cost(cost.plank, cost.coin), Shipyard.ReqK.ToString("0.0"));
        var o = Shipyard.Odds(ReqCoin); var t = Shipyard.TierOdds();
        reqOdds.text = Loc.T("lab.grade_odds") + "  " + string.Join("  ", o.Select((v, g) => $"<color=#{ColorUtility.ToHtmlStringRGB(DB.gradeColors[g])}>{Shipyard.GradeName(g)} {v:0.#}%</color>"))
            + Loc.T("lab.tier_odds") + "  " + string.Join("  ", t.Select((v, k) => (v, k)).Where(x => x.v > 0).Reverse().Select(x => $"T{x.k} {x.v:0.#}%"));
        reqButton.interactable = Shipyard.Can(cost.plank, cost.coin);

        // 합성 재료: 끼지 않은 장비 전부
        picks.RemoveAll(u => Shipyard.ItemOf(u) == null || Shipyard.IsEquipped(u));
        var free = s.items.Where(it => !Shipyard.IsEquipped(it.uid)).OrderByDescending(it => Shipyard.Part(it.id).tier).ThenByDescending(it => Shipyard.Part(it.id).grade).ThenBy(it => it.id);
        foreach (var it in free)
        {
            var p = Shipyard.Part(it.id);
            var r = Add(fuseRow, fuseList);
            bool on = picks.Contains(it.uid);
            r.icon.sprite = p.icon;
            r.title.text = $"{p.Name}  {Grade(p)} · T{p.tier}";
            r.desc.text = $"{Shipyard.SlotName(p.slot)} · {p.Desc}";
            r.right.text = on ? "✔" : "";
            r.bg.color = on ? ROW_ON : ROW;
            int uid = it.uid;
            r.click.onClick.AddListener(() => { if (!picks.Remove(uid)) picks.Add(uid); RenderLab(); });
        }
        var f = Shipyard.GetFuseInfo(picks);
        if (f == null)
        {
            fuseInfo.text = picks.Count == 0 ? Loc.F("lab.fuse_help", Shipyard.FUSE_N, Shipyard.UP_MAX) : Loc.F("lab.fuse_bad", picks.Count, Shipyard.FUSE_N);
            SetButton(fuseButton, fuseButtonText, Loc.T("lab.fuse"), false);
        }
        else if (f.up)
        {
            fuseInfo.text = Loc.F("lab.tierup_info", picks.Count, f.tier + 1, f.chance) + (f.block != null ? $"\n<color=#ff8a7a>{f.block}</color>" : "");
            SetButton(fuseButton, fuseButtonText, Loc.T("lab.tierup"), f.block == null);
        }
        else
        {
            fuseInfo.text = Loc.F("lab.fuse_info", f.tier, Shipyard.GradeName(f.grade), Shipyard.FUSE_N, Shipyard.GradeName(f.grade + 1));
            SetButton(fuseButton, fuseButtonText, Loc.T("lab.fuse"), true);
        }
    }

    void DoRequest()
    {
        var it = Shipyard.Request(ReqCoin);
        if (it == null) { Talk(Loc.T("talk.no_money")); Sfx.Play("fail"); RenderLab(); return; }
        var p = Shipyard.Part(it.id);
        Sfx.Play(p.grade >= 2 ? "clear" : "ui_buy");
        if (preview) preview.Hammer(p.grade >= 2);
        reqResult.text = Loc.F("lab.done", p.Name, Grade(p), p.tier, Shipyard.SlotName(p.slot), p.Desc);
        Talk(Loc.T(Pick(TALK[p.grade])));
        RenderLab();
    }

    void DoFuse()
    {
        var info = Shipyard.GetFuseInfo(picks.ToList());
        bool wasUp = info != null && info.up;
        var (it, ok) = Shipyard.Fuse(picks.ToList());
        picks.Clear();
        if (it == null) { RenderLab(); return; }
        var p = Shipyard.Part(it.id);
        reqResult.text = Loc.Lead(ok ? "lab.success" : "lab.fail") + $"{p.Name}  {Grade(p)} · T{p.tier}\n{p.Desc}";
        Talk(Loc.T(Pick(p.grade >= 3 && wasUp ? UP_TALK[ok ? 0 : 1] : TALK[p.grade])));
        if (preview) preview.Hammer(ok && p.grade >= 2);
        Sfx.Play(ok ? (p.grade >= 2 ? "clear" : "ui_buy") : "fail");
        RenderLab();
    }

// 조선공 대사 (웹 TALK · UP_TALK): 나온 등급별
    // 값 = 스트링 테이블 키
    static readonly string[][] TALK = {
        new[] { "talk.g0a", "talk.g0b" }, new[] { "talk.g1a", "talk.g1b" }, new[] { "talk.g2a", "talk.g2b" }, new[] { "talk.g3a", "talk.g3b" } };
    static readonly string[][] UP_TALK = {
        new[] { "talk.up_ok_a", "talk.up_ok_b" }, new[] { "talk.up_fail_a", "talk.up_fail_b" } };
    static string Pick(string[] a) => a[Random.Range(0, a.Length)];
}
