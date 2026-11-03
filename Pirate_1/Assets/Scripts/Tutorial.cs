using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

// 한 번 본 안내 기록 (PlayerPrefs, 저장 파일과 따로). 항구 · 전투 양쪽에서 씀
public static class TutorialFlags
{
    const string KEY = "ratpirate_tut_v1";
    static HashSet<string> seen;
    static HashSet<string> Set
    {
        get
        {
            if (seen == null) seen = new HashSet<string>(PlayerPrefs.GetString(KEY, "").Split(new[] { ',' }, System.StringSplitOptions.RemoveEmptyEntries));
            return seen;
        }
    }
    public static bool Seen(string k) => Set.Contains(k);
    public static void Mark(string k) { if (Set.Add(k)) { PlayerPrefs.SetString(KEY, string.Join(",", Set)); PlayerPrefs.Save(); } }
    public static void Reset() { Set.Clear(); PlayerPrefs.DeleteKey(KEY); PlayerPrefs.Save(); }
}

[System.Serializable]
public class TutorialTip
{
    [Tooltip("obj_Reef · foe_shark · boss · loot 처럼 (Tutorial.cs 주석 참고)")]
    public string key;
    public string title;
    [TextArea] public string text;
}

// 첫 전투 안내 (선장 말풍선, 하면 다음 단계) + 처음 보는 오브젝트 · 적 · 상황 한 줄 설명
// 키: obj_<SeaObjectKind> (화면에 처음 보일 때), foe_<적 kind>, boss (보스 등장), loot (보스전 뒤 전리품), item_drop (아이템 첫 드랍)
// 단계 안내 중엔 내 배가 피해를 안 받음 (GameManager.tutorialSafe)
public class Tutorial : MonoBehaviour
{
    [Header("선장 말풍선 (화면 아래, 아이템 칸 위)")]
    public GameObject box;
    public Text boxText;
    [Header("오브젝트 머리 위 설명표")]
    public RectTransform tip;
    public Text tipTitle, tipText;
    public float tipTime = 4.5f;

    [Header("첫 전투 단계 (순서대로)")]
    [TextArea] public string[] steps =
    {
        "<b>W</b> 로 돛을 올려라! 출항이다!",
        "<b>A · D</b> 로 키를 돌려 방향을 틀어라",
        "적 쪽을 <b>클릭</b>! 그쪽 뱃전이 일제 사격한다 (Q · E 도 됨)",
        "적을 가라앉히면 <b>금화 · 목재</b>가 떨어진다. 가까이 가서 주워라",
        "<b>보급 상자</b>(치즈 그림)를 쏴서 부수면 아이템이 나온다",
        "아이템을 얻었다! <b>F</b> 로 써라 (하나만 들 수 있고, 새로 주우면 바뀜)",
    };
    [TextArea] public string doneText = "좋아, 이제 바다는 네 것이다! 일곱 바다를 정복하라!";

    public List<TutorialTip> tips = new List<TutorialTip>
    {
        new TutorialTip { key = "obj_Treasure", title = "보물상자", text = "포탄으로 부숴야 열림. 금화가 잔뜩!" },
        new TutorialTip { key = "obj_Supply", title = "보급 상자", text = "부수면 아이템 · 금화 조금" },
        new TutorialTip { key = "obj_BombCrate", title = "폭탄 상자", text = "닿거나 맞으면 펑! 적 근처에서 터뜨려라" },
        new TutorialTip { key = "obj_Reef", title = "암초", text = "포탄을 막아 줌. 뒤에 숨어 장전하라" },
        new TutorialTip { key = "obj_Wreck", title = "난파선", text = "포탄을 막다가 많이 맞으면 부서짐" },
        new TutorialTip { key = "obj_Current", title = "해류", text = "화살표 쪽으로 밀림. 타면 빠르고 거스르면 느림" },
        new TutorialTip { key = "obj_Wind", title = "바람 구역", text = "배도 포탄도 바람에 밀림. 조준할 때 감안!" },
        new TutorialTip { key = "foe_shark", title = "상어", text = "지느러미만 보일 땐 잠수 중. 떠오를 때 쏴라" },
        new TutorialTip { key = "foe_mine", title = "떠다니는 폭탄통", text = "부딪히면 터짐. 멀리서 쏴서 치워라" },
        new TutorialTip { key = "foe_speeder", title = "쾌속정", text = "빠르게 들이받음. 다가오기 전에 쏴라" },
        new TutorialTip { key = "foe_mortar", title = "박격포선", text = "빨간 원이 떨어질 곳. 원 밖으로 피하라" },
        new TutorialTip { key = "boss", title = "보스 출현!", text = "체력이 많다. 아이템을 아껴 뒀다면 지금 써라" },
        new TutorialTip { key = "loot", title = "승리!", text = "떨어진 전리품을 줍고 Enter 로 항구로" },
        new TutorialTip { key = "item_drop", title = "아이템", text = "가까이 가면 주움. 12초 뒤 사라짐" },
    };

    int step = -1;
    float stepT, turnT, tipT, doneT;
    int gold0, plank0;
    Transform tipAt;
    readonly Queue<TutorialTip> queue = new Queue<TutorialTip>();
    readonly Queue<Transform> queueAt = new Queue<Transform>();

    void Start()
    {
        if (box) box.SetActive(false);
        if (tip) tip.gameObject.SetActive(false);
        // 처음 한 번만: 시작하자마자 본 것으로 기록 (중간에 나가거나 침몰해도 다시 안 나옴)
        if (!TutorialFlags.Seen("battle")) { TutorialFlags.Mark("battle"); Begin(0); }
    }

    void Begin(int s)
    {
        var gm = GameManager.I;
        step = s; stepT = 0; turnT = 0;
        gold0 = gm.gold; plank0 = gm.plank;
        // 처음 세 단계(조작 익히기) 동안은 피해 없음
        gm.tutorialSafe = s >= 0 && s < 3;
        if (s >= steps.Length)
        {
            step = -1; gm.tutorialSafe = false;
            boxText.text = doneText; doneT = 3.5f;
            Sfx.Play("clear", 0.6f);
            return;
        }
        box.SetActive(true);
        boxText.text = steps[s];
        if (s > 0) Sfx.Play("ui_click", 0.7f);
    }

    void Update()
    {
        var gm = GameManager.I;
        if (!gm) return;
        var me = gm.player;
        float dt = Time.unscaledDeltaTime;
        if (step >= 0 && !gm.Paused)
        {
            stepT += Time.deltaTime;
            var kb = Keyboard.current;
            bool next = false;
            switch (step)
            {
                case 0: next = me.sail >= 0.75f; break;
                case 1: if (Mathf.Abs(me.av) > 0.5f) turnT += Time.deltaTime; next = turnT > 0.6f; break;
                case 2: next = me.Cooldown(1) > 0 || me.Cooldown(-1) > 0; break;
                case 3: next = gm.gold > gold0 || gm.plank > plank0; break;
                case 4: if (me.items.Held >= 0) { Begin(5); return; } break;
                case 5: next = me.items.Held < 0 && me.items.Active >= 0; break;
            }
            // 오래 못 하면 (예: 보급 상자가 안 보임) 넘어가도 되게
            if (step == 4 && stepT > 40) next = true;
            if (next) Begin(step + 1);
            if (gm.Over) { step = -1; gm.tutorialSafe = false; box.SetActive(false); }
        }
        else if (doneT > 0 && (doneT -= dt) <= 0) box.SetActive(false);

        WatchFirsts(gm);
        ShowTip(dt);
    }

    // 화면 안에 처음 보이는 것 → 설명표 줄 세우기
    void WatchFirsts(GameManager gm)
    {
        var cam = Camera.main;
        if (!cam) return;
        foreach (var o in SeaObject.All) if (OnScreen(cam, o.transform.position)) Want("obj_" + o.kind, o.transform);
        foreach (var f in gm.foes)
        {
            if (f.boss != BossKind.None) { Want("boss", f.transform); continue; }
            if (f.Targetable || f.ai == FoeAI.Shark) if (OnScreen(cam, f.transform.position)) Want("foe_" + f.kind, f.transform);
        }
        if (gm.Looting) Want("loot", gm.player.transform);
        if (!TutorialFlags.Seen("item_drop"))
            foreach (var p in FindObjectsByType<Pickup>(FindObjectsSortMode.None))
                if (p.kind == PickupKind.Item && OnScreen(cam, p.transform.position)) { Want("item_drop", p.transform); break; }
    }

    static bool OnScreen(Camera cam, Vector3 p)
    {
        var v = cam.WorldToViewportPoint(p);
        return v.x > 0.08f && v.x < 0.92f && v.y > 0.15f && v.y < 0.85f;
    }

    void Want(string key, Transform at)
    {
        if (TutorialFlags.Seen(key)) return;
        var t = tips.Find(x => x.key == key);
        if (t == null) return;
        TutorialFlags.Mark(key);
        queue.Enqueue(t); queueAt.Enqueue(at);
    }

    void ShowTip(float dt)
    {
        if (!tip) return;
        if (tipT > 0)
        {
            tipT -= dt;
            if (tipT <= 0 || !tipAt) { tip.gameObject.SetActive(false); tipT = 0; }
        }
        if (tipT <= 0 && queue.Count > 0)
        {
            var t = queue.Dequeue(); tipAt = queueAt.Dequeue();
            if (!tipAt) return;
            tipTitle.text = t.title; tipText.text = t.text;
            tip.gameObject.SetActive(true);
            tipT = tipTime;
            Sfx.Play("ui_click", 0.5f, 1.3f);
        }
        if (tipT > 0 && tipAt)
        {
            // 대상 머리 위에 붙어 다님
            var cam = Camera.main;
            var canvas = tip.GetComponentInParent<Canvas>();
            Vector2 sp = cam.WorldToScreenPoint(tipAt.position + Vector3.up * 0.6f);
            RectTransformUtility.ScreenPointToLocalPointInRectangle((RectTransform)canvas.transform, sp, null, out var lp);
            var half = ((RectTransform)canvas.transform).rect.size * 0.5f - tip.rect.size * 0.5f - new Vector2(10, 10);
            float bottom = -half.y;
            // 선장 말풍선(화면 아래)이 떠 있으면 그 위로만 (겹치지 않게)
            if (box && box.activeSelf)
            {
                var br = (RectTransform)box.transform;
                float boxTop = -((RectTransform)canvas.transform).rect.height * 0.5f + br.anchoredPosition.y + br.rect.height;
                bottom = Mathf.Max(bottom, boxTop + tip.rect.height * 0.5f + 8);
            }
            tip.anchoredPosition = new Vector2(Mathf.Clamp(lp.x, -half.x, half.x), Mathf.Clamp(lp.y + 30, bottom, half.y));
        }
    }
}
