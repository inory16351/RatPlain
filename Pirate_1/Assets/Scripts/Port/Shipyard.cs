using System.Collections.Generic;
using System.Linq;
using UnityEngine;

// 아웃게임 규칙 + 저장 (웹 pirate/ships.js 의 SHIPYARD 를 그대로 옮김)
// 배 진화 · 장비(티어 · 등급 · 갈래) · 조선소 제작 의뢰 · 합성 · 티어 업 도전 · 항해 결산
public class PartDef
{
    public string id, ship, slot, name, desc;
    public int grade, tier;
    public string[] lines;
    public List<StatMod> add = new List<StatMod>(), mul = new List<StatMod>();
    public List<string> fits = new List<string>();
    public Sprite icon;
}

[System.Serializable] public class OwnedItem { public int uid; public string id; }
[System.Serializable] public class EquipEntry { public string ship, slot; public int uid; }

[System.Serializable]
public class SaveData
{
    public int v = 1, plank, coin;
    public List<string> ships = new List<string>();
    public string ship = "galley";
    public List<OwnedItem> items = new List<OwnedItem>();
    public int uid = 1;
    public List<EquipEntry> equip = new List<EquipEntry>();
    public int sorties, clears, requests, tierUps, unlocked, pick, story;
    public List<string> cleared = new List<string>();
    [Tooltip("마지막으로 저장한 때 (이어하기 화면에 보임)")]
    public string savedAt;
}

public class Stats
{
    readonly Dictionary<string, float> d = new Dictionary<string, float>();
    public ShipDef ship;
    public Dictionary<string, string> equip = new Dictionary<string, string>();
    public float this[string k] { get => d.TryGetValue(k, out var v) ? v : 0; set => d[k] = value; }
}

public class FuseInfo { public bool up; public int tier, grade, chance; public string block; }

public static class Shipyard
{
    const string KEY = "ratpirate_save_v1";
    public const int FUSE_N = 3, UP_MAX = 6;
    public static readonly Dictionary<int, int> UP_CHANCE = new Dictionary<int, int> { { 3, 35 }, { 4, 50 }, { 5, 65 }, { 6, 80 } };
    public const int REQ_MIN = 30, REQ_MAX = 600, REQ_STEP = 10;
    static readonly (int coin, float[] p)[] ODDS = { (30, new[] { 70f, 25, 4.5f, 0.5f }), (100, new[] { 45f, 38, 14, 3 }), (250, new[] { 25f, 40, 27, 8 }), (600, new[] { 10f, 35, 38, 17 }) };
    static readonly int[] TIER_W = { 60, 25, 10 };
    public static readonly Dictionary<string, string> LINES = new Dictionary<string, string> { { "S", "쾌속선" }, { "M", "다목적함" }, { "H", "중포함" } };
    static readonly Dictionary<string, string> STAT_TXT = new Dictionary<string, string> {
        { "dmg", "포탄 위력" }, { "reload", "장전 시간" }, { "speed", "속도" }, { "turn", "회전" }, { "hp", "선체" }, { "repair", "웨이브 사이 수리" }, { "pickup", "줍기 거리" },
        { "crit", "치명타" }, { "range", "사거리" }, { "ram", "박치기" }, { "goldBonus", "금화" }, { "mortarDmg", "폭격 위력" }, { "mortarR", "폭격 범위" },
        { "chain", "체인샷 재사용" }, { "fire", "화염탄 재사용" }, { "chainAll", "체인샷 발동" }, { "burnAll", "화염탄 발동" }, { "crewMax", "선원 효과 최대" }, { "crewHeal", "선원 구조 시 수리" } };

    static ShipyardDB db;
    public static ShipyardDB DB => db ? db : (db = Resources.Load<ShipyardDB>("ShipyardDB"));
    static List<PartDef> parts;
    static Dictionary<string, PartDef> partById;
    static SaveData save;

    public static List<PartDef> Parts { get { Build(); return parts; } }
    public static PartDef Part(string id) { Build(); return id != null && partById.TryGetValue(id, out var p) ? p : null; }
    public static ShipDef Ship(string id) => DB.ships.Find(s => s.id == id);
    public static SlotTypeDef SlotType(string id) => DB.slotTypes.Find(s => s.id == id);
    public static SaveData Save { get { if (save == null) Load(); return save; } }
    public static int MaxTier => DB.ships.Max(s => s.tier);

    static float R2(float v) => Mathf.Round(v * 100) / 100f;
    static float Rnd(float v) => Mathf.Floor(v + 0.5f);

    // ── 장비 표 만들기
    static void Build()
    {
        if (parts != null) return;
        parts = new List<PartDef>();
        foreach (var s in DB.ships)
        {
            float k = 1 + 0.35f * s.tier;
            for (int i = 0; i < s.slots.Length; i++)
                for (int g = 0; g < 2; g++)
                {
                    var p = new PartDef { id = $"{s.id}_{s.slots[i]}_{g}", ship = s.id, slot = s.slots[i], grade = g, name = g == 0 ? s.gearNormal[i] : s.gearGood[i] };
                    Template(p.slot, g, k, p.add, p.mul);
                    // 특수탄: 배불뚝이 = 체인샷 상자 3% · 고리 체인샷 8% 체인샷 발동, 꼬리 사냥꾼 = 화염탄 상자 3% · 기름 화염탄 8% 화염탄 발동
                    if (p.slot == "shot" && s.id == "carrack") p.add.Add(new StatMod { stat = "chainAll", value = g == 0 ? 0.03f : 0.08f });
                    if (p.slot == "shot" && s.id == "frigate") p.add.Add(new StatMod { stat = "burnAll", value = g == 0 ? 0.03f : 0.08f });
                    p.desc = Describe(p.add, p.mul);
                    parts.Add(p);
                }
        }
        foreach (var u in DB.uniques)
            parts.Add(new PartDef { id = u.id, ship = u.ship, slot = u.slot, grade = u.grade, name = u.name, lines = u.lines != null && u.lines.Length > 0 ? u.lines : null, add = u.add, mul = u.mul, desc = u.desc });
        foreach (var p in parts)
        {
            var s = Ship(p.ship);
            p.tier = s.tier;
            if (p.lines == null && !string.IsNullOrEmpty(s.line)) p.lines = new[] { s.line };
            var st = SlotType(p.slot);
            p.icon = st != null ? (p.grade >= 2 ? st.uniqueIcon : st.icon) : null;
            p.fits = DB.ships.Where(sh => sh.tier >= p.tier && sh.slots.Contains(p.slot) && (p.lines == null || string.IsNullOrEmpty(sh.line) || p.lines.Contains(sh.line))).Select(sh => sh.id).ToList();
        }
        partById = parts.ToDictionary(p => p.id);
    }

    static void Template(string slot, int g, float k, List<StatMod> add, List<StatMod> mul)
    {
        void A(string s, float v) => add.Add(new StatMod { stat = s, value = v });
        void M(string s, float v) => mul.Add(new StatMod { stat = s, value = v });
        switch (slot)
        {
            case "cannon": if (g == 0) M("dmg", R2(1 + 0.1f * k)); else { M("dmg", R2(1 + 0.14f * k)); M("reload", R2(1 - 0.04f * k)); } break;
            case "sail": if (g == 0) M("speed", R2(1 + 0.05f * k)); else { M("speed", R2(1 + 0.07f * k)); M("turn", R2(1 + 0.05f * k)); } break;
            case "hull": if (g == 0) A("hp", Rnd(25 * k)); else { A("hp", Rnd(35 * k)); A("repair", Rnd(4 * k)); } break;
            case "rudder": if (g == 0) M("turn", R2(1 + 0.08f * k)); else { M("turn", R2(1 + 0.1f * k)); A("pickup", Rnd(30 * k)); } break;
            case "scope": if (g == 0) A("crit", R2(0.05f * k)); else { A("crit", R2(0.07f * k)); M("range", R2(1 + 0.06f * k)); } break;
            case "figure": if (g == 0) { A("ram", Rnd(12 * k)); A("goldBonus", R2(0.05f * k)); } else { A("ram", Rnd(18 * k)); A("goldBonus", R2(0.1f * k)); } break;
            case "mortar": if (g == 0) A("mortarDmg", Rnd(10 * k)); else { A("mortarDmg", Rnd(16 * k)); A("mortarR", Rnd(10 * k)); } break;
            // 특수탄 창고: 포탄 위력만 (옛 체인샷 · 화염탄 재사용은 스킬이 없어져 뺌. 체인샷 · 화염탄 계열은 Build 에서 확률 효과 추가)
            case "shot": A("dmg", Rnd((g == 0 ? 1 : 2) * k)); break;
            case "crew": if (g == 0) A("crewMax", Rnd(2 * k)); else { A("crewMax", Rnd(3 * k)); A("crewHeal", Rnd(2 * k)); } break;
        }
    }

    static string Describe(List<StatMod> add, List<StatMod> mul)
    {
        var o = new List<string>();
        foreach (var m in add) o.Add(m.stat == "crit" || m.stat == "goldBonus" || m.stat == "chainAll" || m.stat == "burnAll" ? $"{STAT_TXT[m.stat]} +{Mathf.RoundToInt(m.value * 100)}%" : $"{STAT_TXT[m.stat]} +{m.value}");
        foreach (var m in mul) o.Add($"{STAT_TXT[m.stat]} {(m.value >= 1 ? "+" : "−")}{Mathf.RoundToInt(Mathf.Abs(m.value - 1) * 100)}%");
        return string.Join(", ", o);
    }

    // ── 저장
    static SaveData Fresh()
    {
        var s = new SaveData();
        s.ships.Add("galley");
        foreach (var sl in Ship("galley").slots) { var it = Give(s, $"galley_{sl}_0"); s.equip.Add(new EquipEntry { ship = "galley", slot = sl, uid = it.uid }); }
        return s;
    }
    static OwnedItem Give(SaveData s, string id) { var it = new OwnedItem { uid = s.uid++, id = id }; s.items.Add(it); return it; }

    static void Load()
    {
        save = null;
        try { var j = PlayerPrefs.GetString(KEY, ""); if (j != "") save = JsonUtility.FromJson<SaveData>(j); } catch { save = null; }
        if (save == null || save.v != 1) save = Fresh();
        Tidy();
    }
    static void Tidy()
    {
        save.items.RemoveAll(it => Part(it.id) == null);
        save.ships.RemoveAll(id => Ship(id) == null);
        if (Ship(save.ship) == null) save.ship = "galley";
        var seen = new HashSet<int>();
        save.equip.RemoveAll(e => { var it = ItemOf(e.uid); var bad = it == null || Ship(e.ship) == null || !Part(it.id).fits.Contains(e.ship) || Part(it.id).slot != e.slot || seen.Contains(e.uid); if (!bad) seen.Add(e.uid); return bad; });
    }
    public static void Store() { Save.savedAt = System.DateTime.Now.ToString("yyyy-MM-dd HH:mm"); PlayerPrefs.SetString(KEY, JsonUtility.ToJson(Save)); PlayerPrefs.Save(); }
    // 이어할 기록이 있는지 (한 번이라도 저장됐으면)
    public static bool HasSave => PlayerPrefs.HasKey(KEY);
    // 새 게임: 저장 · 안내 기록을 지우고 처음 상태로 (첫 저장은 이야기를 보고 나서)
    public static void NewGame() { PlayerPrefs.DeleteKey(KEY); save = Fresh(); TutorialFlags.Reset(); }
    // 이어하기 화면 한 줄 요약
    public static string SaveSummary()
    {
        var s = Save;
        return $"{Ship(s.ship).name} · 정복 {s.cleared.Count}/{DB.seas.Count} · 목재 {s.plank} · 금화 {s.coin}" + (string.IsNullOrEmpty(s.savedAt) ? "" : $"   (저장 {s.savedAt})");
    }
    public static void ResetSave() { save = Fresh(); Store(); }

    // ── 조회
    public static OwnedItem ItemOf(int uid) => Save.items.Find(it => it.uid == uid);
    public static int EquippedUid(string ship, string slot) { var e = Save.equip.Find(x => x.ship == ship && x.slot == slot); return e != null ? e.uid : 0; }
    public static string EquippedOn(int uid) { var e = Save.equip.Find(x => x.uid == uid); return e?.ship; }
    public static bool IsEquipped(int uid) => EquippedOn(uid) != null;
    public static bool Owns(string ship) => Save.ships.Contains(ship);
    public static int Tech() => Save.ships.Max(id => Ship(id).tier);
    public static bool Usable(PartDef p) => p.fits.Any(Owns);

    // 수치 계산 (shipId · overEquip = 미리보기)
    public static Stats Compute(string shipId = null, Dictionary<string, string> overEquip = null)
    {
        var ship = Ship(shipId ?? Save.ship);
        var s = new Stats { ship = ship };
        foreach (var sl in ship.slots) { var it = ItemOf(EquippedUid(ship.id, sl)); if (it != null && Part(it.id).fits.Contains(ship.id)) s.equip[sl] = it.id; }
        if (overEquip != null) foreach (var kv in overEquip) s.equip[kv.Key] = kv.Value;
        foreach (var m in DB.baseStats) s[m.stat] = m.value;
        var adds = new List<List<StatMod>> { ship.add }; var muls = new List<List<StatMod>> { ship.mul };
        foreach (var id in s.equip.Values) { var p = Part(id); adds.Add(p.add); muls.Add(p.mul); }
        foreach (var l in adds) foreach (var m in l) s[m.stat] += m.value;
        foreach (var l in muls) foreach (var m in l) s[m.stat] *= m.value;
        s["hp"] = Mathf.Round(s["hp"] * DB.hpBuff); s["dmg"] *= DB.dmgBuff; s["dmgTaken"] *= (ship.tier == 0 ? 1 : DB.takenBuff) * (ship.line == "S" || ship.line == "M" ? DB.eraArmor[Mathf.Clamp(ship.tier, 0, DB.eraArmor.Length - 1)] : 1) * (ship.line == "S" ? DB.lightHull : 1); s["range"] *= DB.rangeBuff; // 전체 보정 (찍찍 1호는 받는 피해 100% 그대로)
        s["evade"] = Mathf.Min(0.5f, s["evade"]);
        s["stormGuard"] = Mathf.Min(0.9f, s["stormGuard"]);
        s["guns"] = Mathf.Round(s["guns"]);
        s["planes"] = Mathf.Min(8, Mathf.Round(s["planes"]));
        return s;
    }

    public static List<(string label, string value)> Summary(Stats s)
    {
        float dps = s["guns"] * s["dmg"] * (1 + s["crit"]) * (1 + s["double"]) / s["reload"];
        return new List<(string, string)> {
            ("선체", Mathf.RoundToInt(s["hp"]).ToString()), ("속도", Mathf.RoundToInt(s["speed"]).ToString()), ("회전", s["turn"].ToString("0.##")),
            ("뱃전 대포", s["guns"].ToString("0")), ("장전", s["reload"].ToString("0.##") + "초"), ("화력", Mathf.RoundToInt(dps).ToString()),
            ("받는 피해", Mathf.RoundToInt(s["dmgTaken"] * 100) + "%"), ("사거리", Mathf.RoundToInt(s["range"] * 100) + "%") };
    }

    // ── 배
    public static bool Can(int plank, int coin) => Save.plank >= plank && Save.coin >= coin;
    static void Pay(int plank, int coin) { Save.plank -= plank; Save.coin -= coin; }
    public static bool ShipBuyable(ShipDef s) => !Owns(s.id) && (string.IsNullOrEmpty(s.req) || Owns(s.req));
    public static bool BuyShip(string id)
    {
        var s = Ship(id);
        if (!ShipBuyable(s) || !Can(s.costPlank, s.costCoin)) return false;
        Pay(s.costPlank, s.costCoin); Save.ships.Add(id); Save.ship = id; Store(); return true;
    }
    public static bool UseShip(string id) { if (!Owns(id)) return false; Save.ship = id; Store(); return true; }

    // ── 장비
    public static string WhyNot(int uid, string sid)
    {
        var it = ItemOf(uid); var s = Ship(sid);
        if (it == null || s == null) return "없음";
        var p = Part(it.id);
        if (!Owns(sid)) return "아직 없는 배";
        if (!s.slots.Contains(p.slot)) return $"{SlotType(p.slot).name} 슬롯 없음";
        if (p.tier > s.tier) return $"티어 {p.tier} 장비 — {p.tier}단계 이상 배만";
        if (!p.fits.Contains(sid)) return string.Join(" · ", p.lines.Select(l => LINES[l])) + " 전용";
        return null;
    }
    public static bool Equip(int uid, string sid)
    {
        if (WhyNot(uid, sid) != null) return false;
        var p = Part(ItemOf(uid).id);
        Save.equip.RemoveAll(e => e.uid == uid || (e.ship == sid && e.slot == p.slot));
        Save.equip.Add(new EquipEntry { ship = sid, slot = p.slot, uid = uid });
        Store(); return true;
    }
    public static void Unequip(string sid, string slot) { Save.equip.RemoveAll(e => e.ship == sid && e.slot == slot); Store(); }

    // ── 조선소 제작 의뢰: 많이 낼수록 높은 등급 확률 ↑, 티어는 테크(가진 배 최고 단계) 근처
    public static float[] Odds(int coin)
    {
        coin = Mathf.Clamp(coin, REQ_MIN, REQ_MAX);
        int i = 0;
        while (i < ODDS.Length - 2 && coin > ODDS[i + 1].coin) i++;
        var (c0, p0) = ODDS[i]; var (c1, p1) = ODDS[i + 1];
        float t = Mathf.Log((float)coin / c0) / Mathf.Log((float)c1 / c0);
        return p0.Select((v, g) => v + (p1[g] - v) * t).ToArray();
    }
    public static float[] TierOdds()
    {
        int T = Tech();
        var o = new float[T + 1]; float rest = 0;
        for (int i = 0; i < TIER_W.Length; i++) { if (T - i >= 0) o[T - i] = TIER_W[i]; else rest += TIER_W[i]; }
        int low = T - TIER_W.Length + 1;
        rest += 100 - TIER_W.Sum();
        if (low > 0) for (int t = 0; t < low; t++) o[t] = rest / low; else o[T] += rest;
        return o;
    }
    public static float ReqK => 1 + 0.6f * Tech();
    // 의뢰 비용: 목재 = 금화 ÷ 5 (목재는 주로 배, 금화는 주로 장비에 쓰이게)
    public static (int plank, int coin) RequestCost(int coin) => (Mathf.RoundToInt(coin * ReqK / 5), Mathf.RoundToInt(coin * ReqK));
    static int Roll(float[] p) { float r = Random.value * p.Sum(); int i = 0; while (i < p.Length - 1 && r >= p[i]) { r -= p[i]; i++; } return i; }
    static T Pick<T>(List<T> a) => a[Random.Range(0, a.Count)];
    static List<PartDef> Candidates(int t, int g)
    {
        for (int k = t; k >= 0; k--) { var c = Parts.Where(p => p.grade == g && p.tier == k && Usable(p)).ToList(); if (c.Count > 0) return c; }
        return Parts.Where(p => p.grade == g && Usable(p)).ToList();
    }
    public static OwnedItem Request(int coin)
    {
        coin = Mathf.Clamp(coin, REQ_MIN, REQ_MAX);
        var cost = RequestCost(coin);
        if (!Can(cost.plank, cost.coin)) return null;
        Pay(cost.plank, cost.coin);
        int t = Roll(TierOdds()), g = Roll(Odds(coin));
        var it = Give(Save, Pick(Candidates(t, g)).id);
        Save.requests++; Store();
        return it;
    }

    // 합성: 같은 티어 · 등급 3개 → 한 등급 위. 티어 업 도전: 같은 티어 전설 3~6개 → 한 티어 위 전설 (실패하면 같은 티어 전설 하나)
    public static FuseInfo GetFuseInfo(List<int> uids)
    {
        if (uids.Distinct().Count() != uids.Count || uids.Count < FUSE_N) return null;
        var its = uids.Select(ItemOf).ToList();
        if (its.Any(it => it == null || IsEquipped(it.uid))) return null;
        var p0 = Part(its[0].id);
        if (its.Any(it => Part(it.id).grade != p0.grade || Part(it.id).tier != p0.tier)) return null;
        if (p0.grade < 3) return uids.Count == FUSE_N ? new FuseInfo { tier = p0.tier, grade = p0.grade } : null;
        if (uids.Count > UP_MAX) return null;
        var f = new FuseInfo { up = true, tier = p0.tier, grade = 3, chance = UP_CHANCE[uids.Count] };
        if (p0.tier >= MaxTier) f.block = "이미 가장 높은 티어";
        else if (p0.tier + 1 > Tech()) f.block = $"{p0.tier + 1}단계 배가 있어야 도전 가능";
        return f;
    }
    public static (OwnedItem it, bool ok) Fuse(List<int> uids)
    {
        var f = GetFuseInfo(uids);
        if (f == null || f.block != null) return (null, false);
        Save.items.RemoveAll(it => uids.Contains(it.uid));
        OwnedItem got; bool ok = true;
        if (!f.up) got = Give(Save, Pick(Candidates(f.tier, f.grade + 1)).id);
        else { ok = Random.value * 100 < f.chance; got = Give(Save, Pick(Candidates(ok ? f.tier + 1 : f.tier, 3)).id); Save.tierUps++; }
        Store();
        return (got, ok);
    }

    // ── 항해 끝: 이기면 전부 + 다음 바다, 침몰하면 절반
    public static (int plank, int coin) Bank(int plank, int coin, bool win, int sea)
    {
        float k = win ? 1 : 0.5f;
        int p = Mathf.FloorToInt(plank * k), c = Mathf.FloorToInt(coin * k);
        Save.plank += p; Save.coin += c; Save.sorties++;
        if (win)
        {
            Save.clears++;
            var id = DB.seas[sea].id;
            if (!Save.cleared.Contains(id)) Save.cleared.Add(id);
            Save.unlocked = Mathf.Min(DB.seas.Count - 1, Mathf.Max(Save.unlocked, sea + 1));
        }
        Store();
        return (p, c);
    }
    // 바다별 웨이브: 3번째 바다부터 2바다마다 +1 (1·2 = 3, 3·4 = 4, 5·6 = 5, 7·8 = 6 웨이브 + 보스)
    // 늘어난 웨이브 = 마지막 웨이브 + 그 웨이브의 배를 한 척씩 더 (폭탄통 제외)
    public const int EXTRA_WAVE_FROM = 3, EXTRA_WAVE_EVERY = 2;
    public static string[] WavesOf(int sea)
    {
        var S = DB.seas[sea];
        int n = sea + 1, extra = n < EXTRA_WAVE_FROM ? 0 : (n - EXTRA_WAVE_FROM) / EXTRA_WAVE_EVERY + 1;
        var list = new List<string>(S.waves);
        string last = S.waves[S.waves.Length - 1];
        var ships = last.Split(',').Select(x => x.Trim()).Where(x => x != "mine").ToArray();
        if (ships.Length == 0) ships = new[] { "sloop" };
        for (int i = 1; i <= extra; i++) list.Add(last + string.Concat(Enumerable.Range(0, i).Select(j => "," + ships[j % ships.Length])));
        return list.ToArray();
    }

    public static void SeenStory(int n) { Save.story = Mathf.Max(Save.story, n); Store(); }
    public static bool PickSea(int i) { if (i < 0 || i > Save.unlocked) return false; Save.pick = i; Store(); return true; }
}

// 장면 사이에 넘기는 값: 고른 바다 · 방금 끝난 항해 결과
public static class GameSession
{
    public static int sea = -1;
    public static BattleResult last;
}

public class BattleResult
{
    public bool win;
    public int sea, kills, plank, coin, gotPlank, gotCoin, rescued, crew;
}
