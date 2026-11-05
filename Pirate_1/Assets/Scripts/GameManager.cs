using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;

// 전투 진행: 웨이브 소환 · 적 목록 · 포탄 · 폭격 · 보상 · 승패 (웹 pirate/game.js 의 start · nextWave · update 끝부분)
// 단위: 웹 픽셀 / 100 = 유니티 유닛. 각도는 유니티 기준(반시계 +)
// 생김새는 전부 원본 프리팹에서 옴. 여기서는 복제 + 위치 · 수치만 넣음
public class GameManager : MonoBehaviour
{
    public static GameManager I;

    [Header("바다 (웹 seas.js 한 줄)")]
    public string seaName = "치즈 항구 앞바다";
    [TextArea] public string story = "항구를 막아선 라이벌 해적 '회색꼬리'. 첫 바다부터 길을 연다.";
    public float hpMult = 1f;
    [Tooltip("웨이브마다 적 kind 를 쉼표로")]
    public string[] waves = { "sloop,sloop,mine", "sloop,sloop,mine,mine,rival", "sloop,sloop,sloop,rival,mine" };
    public string boss = "b_rival";

    [Header("난이도 곡선 (일반 적만 · 체력과 피해에 곱함)")]
    [Tooltip("바다 순서별 (칸이 모자라면 1). 초반 바다를 약하게")]
    public float[] seaEase = { 0.75f, 0.85f, 0.85f, 0.9f, 0.95f };
    [Tooltip("한 바다 안 웨이브별 (보스 웨이브 호위는 마지막 값)")]
    public float[] waveEase = { 0.85f, 0.93f, 1f };
    [Tooltip("보스 피해만 바다 순서별로 낮춤 (체력은 그대로). 칸이 모자라면 1")]
    public float[] bossDmgEase = { 0.85f, 0.9f, 0.8f, 0.85f, 0.9f };
    [Tooltip("보스 체력을 바다 순서별로 낮춤 (짧고 굵게). 칸이 모자라면 1")]
    public float[] bossHpEase = { 0.8f, 0.9f };

    [Header("적 조준 (명중률) — 1번째 바다 → 8번째 바다로 갈수록 정확해짐")]
    [Tooltip("적 사거리 배율 (일제 사격 · 선수포 · 박격포선 사거리와 포탄 날아가는 거리)")]
    public float foeRangeMul = 0.94f;
    [Tooltip("적 일제 사격 포탄이 옆으로 퍼지는 정도 (처음 바다, 마지막 바다)")]
    public Vector2 foeSpread = new Vector2(0.3f, 0.15f);
    [Tooltip("적 폭격이 노린 곳에서 빗나가는 거리 (유닛, 처음 바다, 마지막 바다)")]
    public Vector2 foeLobScatter = new Vector2(0.5f, 0.25f);
    float SeaT => Shipyard.DB ? Mathf.Clamp01(seaIndex / Mathf.Max(1f, Shipyard.DB.seas.Count - 1)) : 0;
    public float FoeSpreadNow => Mathf.Lerp(foeSpread.x, foeSpread.y, SeaT);

    [Header("장면 연결")]
    public PlayerShip player;
    public Transform world;
    public AudioSource bgm;
    public AudioClip battleClip, bossClip;
    [Tooltip("바다마다 색을 살짝 바꿈")]
    public SpriteRenderer seaTint;
    public string portScene = "Port";
    [Tooltip("바다 특성 (안개 · 폭풍 · 소용돌이)")]
    public Weather weather;

    [Header("원본 프리팹")]
    public EnemyShip[] enemyPrefabs;
    public Cannonball ballPrefab;
    public MortarShell shellPrefab;
    public Pickup coinPrefab, plankPrefab, itemPrefab, swimmerPrefab;
    [Tooltip("보물상자 (웨이브마다 생김, 포탄으로 부숴야 열림)")]
    public SeaObject treasurePrefab;
    [Tooltip("웨이브마다 생기는 보물상자 수 (Item_Config treasure_per_wave)")]
    public int treasurePerWave = 1;
    [Tooltip("웨이브마다 이 확률로 보물상자 하나 더")]
    [Range(0, 1)] public float extraTreasureChance = 0.5f;
    [Tooltip("일반 적이 사용 아이템을 떨굴 확률 (오브젝트 아이템 테이블 Drop)")]
    [Range(0, 1)] public float itemDropChance = 0.15f;
    [Header("전리품 비율 (일반 함선 격침 · 보스 제외) — 함선 = 목재 많이 · 금화 조금, 보물상자 = 금화 많이 · 목재 조금")]
    public float shipGoldMul = 0.5f;
    [Tooltip("이 적들은 목재 없이 금화만 떨굼 (작은 배 · 상어)")]
    public string[] goldOnlyKinds = { "sloop", "speeder", "shark" };
    [Tooltip("모든 치즈 금화 (격침 · 보물상자 · 보급 상자) 에 곱함")]
    public float goldMul = 1.08f;
    [Tooltip("모든 목재 (격침 · 보물상자 · 난파선) 에 곱함")]
    public float plankMul = 1.02f;
    public float shipPlankMul = 1f;
    [Tooltip("이 바다 번호들에선 일반 상어가 한 방에 가라앉음 (상어 암초 = 1)")]
    public int[] oneShotSharkSeas = { 1 };
    public Effect splashPrefab, blastPrefab, smokePrefab;
    [Tooltip("뱃머리 물결 · 포구 불꽃 · 불타는 불길")]
    public Effect wakePrefab, flashPrefab, flamePrefab;
    [Tooltip("상자 · 난파선 부서지는 나무 조각 · 보물 반짝임")]
    public Effect debrisPrefab, sparklePrefab;
    [Tooltip("박격포 발사 불꽃 · 연기 (쏜 배 위)")]
    public Effect mortarLaunchPrefab;
    public FloatText textPrefab;

    [HideInInspector] public List<EnemyShip> foes = new List<EnemyShip>();
    [HideInInspector] public EnemyShip bossShip;
    [HideInInspector] public int gold, plank, kills, wave, rescued;
    [HideInInspector] public string msg, sub;
    [HideInInspector] public float msgT;
    int state; // 0 = 전투 중, 1 = 승리, -1 = 패배
    int seaIndex;
    public int SeaIndex => seaIndex;

    // 콤보: 맞힐 때마다 +1, 2.5 초 동안 못 맞히면 0. 5 콤보마다 금화 +10%
    [HideInInspector] public int combo, bestCombo;
    float comboT;
    public void AddCombo() { combo++; comboT = 2.5f; bestCombo = Mathf.Max(bestCombo, combo); }
    public float ComboBonus => 1 + Mathf.Floor(combo / 5f) * 0.1f;

    // 멈칫(맞는 순간) · 슬로모션(보스 격침 · 침몰) · 일시정지 = Time.timeScale
    float hitStopT, slowT;
    bool paused;
    public bool Paused => paused || (exitMenu && exitMenu.IsOpen);
    [Tooltip("Esc 확인 배너 (예 = 전투 결과 없이 로비로)")]
    public ExitMenu exitMenu;
    public void HitStop(float t) { hitStopT = Mathf.Max(hitStopT, t); }
    public void SlowMo(float t) { slowT = Mathf.Max(slowT, t); }
    void OnDestroy() { Time.timeScale = 1; }
    float waveT;
    bool waiting;

    [Header("웨이브 소환 (한꺼번에 몰려나오지 않게 한 척씩)")]
    [Tooltip("적을 한 척씩 내보내는 간격 (초)")]
    public float spawnGap = 0.8f;
    [Tooltip("바다에 동시에 떠 있는 적 최대 수 (폭탄통 제외). 넘으면 줄어들 때까지 다음 적을 기다림")]
    public int maxAlive = 6;
    [Tooltip("섬 · 암초에 끼어 이 시간(초) 동안 거의 못 움직인 적은 빈 바다로 옮김")]
    public float stuckTime = 3f;
    readonly Queue<string> spawnQueue = new Queue<string>();
    float spawnT;
    readonly Dictionary<EnemyShip, Vector3> stuckAt = new Dictionary<EnemyShip, Vector3>(); // x, y = 끼인 자리, z = 끼어 있던 시간
    float stuckCheckT;

    public bool Over => state != 0;
    [HideInInspector] public bool tutorialSafe; // 첫 전투 조작 안내 중엔 내 배가 피해를 안 받음 (Tutorial)
    // 이긴 뒤 항구로 가기 전: 배를 몰아 떨어진 금화 · 목재를 주움 (Enter 로 정산)
    bool banked;
    public bool Looting => state > 0 && !banked;
    [Tooltip("이긴 뒤 이 시간(초)이 지나면 자동으로 정산하고 항구로")]
    public float lootTime = 30;
    [HideInInspector] public float lootLeft;
    public bool Won => state > 0;
    [Tooltip("바다 배율이 내가 받는 피해에 얼마나 붙는지 (1 = 체력 배율 그대로, 0 = 안 붙음)")]
    public float enemyDmgSlope = 0.5f;
    public float DmgMult => 1 + (hpMult - 1) * enemyDmgSlope;
    public float LootMult => 1 + (hpMult - 1) * 0.8f;

    void Awake() { I = this; }

void Start()
    {
        if (exitMenu) exitMenu.onYes = () => { Time.timeScale = 1; GameSession.last = null; TitleScreen.lobbyNext = true; SceneManager.LoadScene(portScene); };
        // 항구에서 고른 바다 (바로 이 장면을 틀면 저장된 마지막 바다)
        if (Shipyard.DB)
        {
            seaIndex = Mathf.Clamp(GameSession.sea >= 0 ? GameSession.sea : Shipyard.Save.pick, 0, Shipyard.DB.seas.Count - 1);
            var S = Shipyard.DB.seas[seaIndex];
            seaName = Shipyard.SeaName(S); story = Shipyard.SeaStory(S); hpMult = S.mult; waves = Shipyard.WavesOf(seaIndex); boss = S.boss;
            if (seaTint && ColorUtility.TryParseHtmlString(S.col0, out var c)) seaTint.color = Color.Lerp(Color.white, c * 1.6f, 0.35f);
        }
        if (weather) weather.Begin(Shipyard.DB ? Shipyard.DB.seas[seaIndex].trait : "", player);
        PlayMusic(battleClip);
        NextWave();
    }

    void Update()
    {
        float dt = Time.deltaTime, u = Time.unscaledDeltaTime;
        var kb = Keyboard.current;
        // P = 일시정지, 일시정지 중 X = 항구로 후퇴 (침몰로 쳐서 전리품 절반), Esc = 메인메뉴 확인 배너 (열려 있는 동안 멈춤)
        if (kb != null && state == 0)
        {
            if (kb.escapeKey.wasPressedThisFrame && exitMenu) { if (exitMenu.IsOpen) exitMenu.Close(); else exitMenu.Open(); }
            else if (kb.pKey.wasPressedThisFrame || (kb.escapeKey.wasPressedThisFrame && !exitMenu)) paused = !paused;
            if (paused && kb.xKey.wasPressedThisFrame) { paused = false; player.hp = 0; }
        }
        if (hitStopT > 0) hitStopT -= u;
        if (slowT > 0) slowT -= u;
        Time.timeScale = Paused || hitStopT > 0 ? 0 : slowT > 0 ? 0.3f : 1;
        if ((comboT -= dt) <= 0) combo = 0;
        if (msgT > 0) msgT -= dt;
        if (state == 0)
        {
            // 대기 줄의 적을 spawnGap 마다 한 척씩 (동시에 maxAlive 척까지)
            if (spawnQueue.Count > 0 && (spawnT -= dt) <= 0 && foes.FindAll(f => f.ai != FoeAI.Mine).Count < maxAlive)
            {
                spawnT = spawnGap;
                string k = spawnQueue.Dequeue();
                Spawn(k, FreeSpot(7f, 13f, ClearOf(k)));
            }
            if ((stuckCheckT -= dt) <= 0) { UnstickFoes(0.5f); stuckCheckT = 0.5f; }
            if (player.hp <= 0)
            {
                state = -1;
                Finish(false);
                SlowMo(1f);
                Blast(player.transform.position, 1.2f);
                if (bgm) bgm.Stop();
            }
            else if (!waiting && spawnQueue.Count == 0 && !foes.Exists(f => f.ai != FoeAI.Mine))
            {
                if (wave > waves.Length)
                {
                    state = 1; lootLeft = lootTime;
                    if (bgm) bgm.Stop();
                    Sfx.Play("win");
                    Message(Loc.T("msg.win"), Loc.T("msg.win_sub"), 4f);
                }
                else
                {
                    waiting = true; waveT = 2.6f;
                    float fix = Mathf.Round(player.repair + player.crew + player.maxHp * player.waveRepairFrac); // 선원이 많을수록 더 고침 + 최대 체력 비례
                    player.hp = Mathf.Min(player.maxHp, player.hp + fix);
                    Text(player.transform.position + Vector3.up * 0.3f, Loc.F("float.repair", fix.ToString("0")), new Color(0.5f, 1f, 0.55f));
                }
            }
            if (waiting && (waveT -= dt) <= 0) { waiting = false; NextWave(); }
        }
        else if (kb != null)
        {
            // 전리품 줍는 동안 Space 는 무시 (사격 키라 실수로 나가지 않게)
            bool go = kb.enterKey.wasPressedThisFrame || (!Looting && kb.spaceKey.wasPressedThisFrame);
            if (Looting && (go || kb.rKey.wasPressedThisFrame)) Finish(true); // 정산 (남은 전리품은 자동으로 챙김)
            if (Looting && (lootLeft -= Time.unscaledDeltaTime) <= 0) { Finish(true); SceneManager.LoadScene(portScene); return; } // 시간 다 되면 자동으로 항구
            if (kb.rKey.wasPressedThisFrame) { GameSession.sea = seaIndex; SceneManager.LoadScene(SceneManager.GetActiveScene().buildIndex); }
            else if (go) SceneManager.LoadScene(portScene);
        }
    }

// 항해 끝: 이기면 전부, 침몰하면 절반을 항구 창고에 넣음 (사용 아이템은 스테이지와 함께 사라짐)
    void Finish(bool win)
    {
        banked = true;
        if (win) foreach (var w in FindObjectsByType<Pickup>(FindObjectsSortMode.None)) // 이기면 떠 있던 쥐 · 금화 · 목재도 모두 챙김
            if (w.kind == PickupKind.Swimmer) { rescued++; Destroy(w.gameObject); }
            else if (w.kind == PickupKind.Coin || w.kind == PickupKind.Plank) w.Grab();
        else if (player.crewView) player.crewView.JumpOff();
        var r = new BattleResult { win = win, sea = seaIndex, kills = kills, plank = plank, coin = gold, rescued = rescued, crew = player.crew };
        if (Shipyard.DB)
        {
            (r.gotPlank, r.gotCoin) = Shipyard.Bank(plank, gold, win, seaIndex);
        }
        GameSession.last = r;
        if (!win) Sfx.Play("lose"); // 이긴 소리는 전리품 줍기 시작할 때
        string got = Loc.F("msg.result", r.gotCoin, r.gotPlank, kills, rescued) + (win ? "" : "  " + Loc.T("msg.result_half"));
        Message(win ? Loc.T("msg.win") : Loc.T("msg.lose"), got + "\n" + Loc.T("msg.result_keys"), 999);
    }


    void NextWave()
    {
        wave++;
        if (wave > waves.Length)
        {
            bossShip = Spawn(boss, FreeSpot(8f, 11f, ClearOf(boss)));
            int n = 0;
            foreach (var k in waves[0].Split(',')) if (k.Trim() != "mine" && n++ < 2) spawnQueue.Enqueue(k.Trim()); // 호위는 보스 뒤로 한 척씩
            spawnT = spawnGap;
            Message(bossShip ? bossShip.Name : Loc.T("foe." + boss, boss), Loc.T("msg.boss"), 3f);
            PlayMusic(bossClip);
            Sfx.Play("roar");
            CameraFollow.Shake(10);
        }
        else
        {
            foreach (var k in waves[wave - 1].Split(',')) if (k.Trim() != "") spawnQueue.Enqueue(k.Trim()); // 한꺼번에 말고 spawnGap 마다 한 척씩
            spawnT = 0.3f; // 첫 척은 곧바로 (바다 칸 · 섬이 먼저 깔리도록 아주 잠깐 뒤)
            for (int i = 0; i < treasurePerWave; i++) SpawnTreasure();
            if (Random.value < extraTreasureChance) SpawnTreasure();
            Message(Loc.F("msg.wave", seaName, wave, waves.Length), wave == 1 ? story : "", 2.8f);
            Sfx.Play("wave");
        }
    }

    public void Message(string text, string subText, float t) { msg = text; sub = subText; msgT = t; }

    void PlayMusic(AudioClip c)
    {
        if (!bgm || !c || bgm.clip == c) return;
        bgm.clip = c; bgm.loop = true; bgm.Play();
    }

    // ── 소환
    public EnemyShip Spawn(string kind, Vector2 pos)
    {
        var prefab = System.Array.Find(enemyPrefabs, p => p && p.kind == kind);
        if (!prefab) { Debug.LogWarning("적 원본 없음: " + kind); return null; }
        Vector2 to = (Vector2)player.transform.position - pos;
        var e = Instantiate(prefab, pos, Quaternion.Euler(0, 0, Mathf.Atan2(to.y, to.x) * Mathf.Rad2Deg), world);
        // 일반 적: 초반 바다 · 앞 웨이브일수록 약하게. 보스: 체력은 그대로, 초반 바다만 피해를 낮춤
        float k = e.boss == BossKind.None ? Ease(seaEase, seaIndex) * Ease(waveEase, Mathf.Min(wave, waves.Length) - 1) : Ease(bossHpEase, seaIndex);
        e.Init(hpMult * k);
        e.dmg *= e.boss == BossKind.None ? k : Ease(bossDmgEase, seaIndex);
        if (e.boss == BossKind.None) e.ram *= k;
        if (e.ai == FoeAI.Shark && e.boss == BossKind.None && System.Array.IndexOf(oneShotSharkSeas, seaIndex) >= 0) e.hp = e.maxHp = 1;
        foes.Add(e);
        return e;
    }

    // 보물상자: 바다 깊이(LootMult) 만큼 금화 · 판자가 늘어남
    static float Ease(float[] t, int i) => t == null || t.Length == 0 || i < 0 ? 1 : i < t.Length ? t[i] : 1;

    void SpawnTreasure()
    {
        if (!treasurePrefab) return;
        var c = Instantiate(treasurePrefab, FreeSpot(3f, 12f), Quaternion.identity, world);
        c.goldMin = Mathf.RoundToInt(c.goldMin * LootMult); c.goldMax = Mathf.RoundToInt(c.goldMax * LootMult);
        c.plank = Mathf.RoundToInt(c.plank * LootMult);
    }

    // 배 둘레 빈 바다 한 곳. clear = 섬 · 암초 · 다른 적과 띄울 거리 (배가 클수록 크게)
    // 빈자리를 못 찾으면 그나마 가장 넓은 자리 (예전엔 마지막으로 뽑은 자리를 그대로 써서 섬 속에 나오곤 했음)
    public Vector2 FreeSpot(float minD, float maxD, float clear = 0.9f)
    {
        Vector2 me = player.transform.position, best = me + Vector2.right * maxD;
        float bestRoom = float.MinValue;
        for (int n = 0; n < 300; n++)
        {
            float a = Random.value * Mathf.PI * 2, d = Random.Range(minD, maxD);
            Vector2 p = me + new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * d;
            float room = RoomAt(p);
            if (room >= clear) return p;
            if (room > bestRoom) { bestRoom = room; best = p; }
        }
        return best;
    }

    // p 에서 가장 가까운 섬 · 단단한 오브젝트 · 적 가장자리까지 거리
    float RoomAt(Vector2 p)
    {
        float room = float.MaxValue;
        foreach (var o in Island.All) room = Mathf.Min(room, Vector2.Distance(o.transform.position, p) - o.radius);
        foreach (var o in SeaObject.All) if (!o.Zone) room = Mathf.Min(room, Vector2.Distance(o.transform.position, p) - o.radius);
        foreach (var f in foes) if (f) room = Mathf.Min(room, Vector2.Distance(f.transform.position, p) - f.len * 0.3f);
        return room;
    }

    // 이 종류 배가 나올 때 비워 둘 거리 (원본 프리팹 길이 기준)
    public float ClearOf(string kind)
    {
        var prefab = System.Array.Find(enemyPrefabs, p => p && p.kind == kind);
        return (prefab ? prefab.len * 0.3f : 0.5f) + 0.9f;
    }

    // 섬 · 암초에 붙어 거의 못 움직이는 적은 빈 바다로 옮김 (끼인 적 때문에 웨이브가 안 끝나던 문제)
    void UnstickFoes(float step)
    {
        foreach (var f in foes.ToArray())
        {
            if (!f || f.ai == FoeAI.Mine || f.boss != BossKind.None) { stuckAt.Remove(f); continue; }
            Vector2 p = f.transform.position;
            bool touching = RoomAtSolid(p) < f.len * 0.3f + 0.15f;
            if (!touching) { stuckAt.Remove(f); continue; }
            if (stuckAt.TryGetValue(f, out var s) && Vector2.Distance(s, p) < 0.4f)
            {
                s.z += step;
                if (s.z >= stuckTime) { f.transform.position = FreeSpot(7f, 12f, ClearOf(f.kind)); stuckAt.Remove(f); continue; }
                stuckAt[f] = s;
            }
            else stuckAt[f] = new Vector3(p.x, p.y, 0);
        }
    }

    float RoomAtSolid(Vector2 p)
    {
        float room = float.MaxValue;
        foreach (var o in Island.All) room = Mathf.Min(room, Vector2.Distance(o.transform.position, p) - o.radius);
        foreach (var o in SeaObject.All) if (!o.Zone) room = Mathf.Min(room, Vector2.Distance(o.transform.position, p) - o.radius);
        return room;
    }

// 가장 가까운 적 (폭탄통 제외). needTargetable = 잠수한 상어 빼기
    public EnemyShip Nearest(Vector2 p, float maxD, bool needTargetable, System.Func<EnemyShip, bool> ok = null)
    {
        EnemyShip best = null; float bd = maxD;
        foreach (var f in foes)
        {
            if (f.ai == FoeAI.Mine || (needTargetable && !f.Targetable) || (ok != null && !ok(f))) continue;
            float d = Vector2.Distance(p, f.transform.position);
            if (d < bd) { bd = d; best = f; }
        }
        return best;
    }


    // ── 섬
    public void CollideIslands(Transform t, float r, ref float v)
    {
        foreach (var o in Island.All)
        {
            Vector2 d = (Vector2)t.position - (Vector2)o.transform.position;
            float m = o.radius + r, len = d.magnitude;
            if (len < m)
            {
                if (len < 0.001f) d = Vector2.right; else d /= len;
                t.position = (Vector2)o.transform.position + d * m;
                v *= 0.5f;
            }
        }
    }
    public bool HitsIsland(Vector2 p) => Island.All.Exists(o => Vector2.Distance(o.transform.position, p) < o.radius);

    // ── 사격: 포탄은 쏜 배의 속도 + 회전 선속도(ω × r) 를 이어받음
    public void Broadside(Transform ship, Vector2 vel, float av, float len, int side, int count, float dmg, float speed, float life, bool foe, ShotKind kind)
    {
        Vector2 f = ship.right, n = side > 0 ? -(Vector2)ship.up : (Vector2)ship.up;
        for (int i = 0; i < count; i++)
        {
            float along = (count == 1 ? 0 : (i / (count - 1f) - 0.5f)) * len * 0.6f;
            float spread = (Random.value - 0.5f) * (kind == ShotKind.Chain ? 0.3f : 0.08f);
            if (foe) spread += (Random.value - 0.5f) * 2 * FoeSpreadNow; // 적은 덜 정확하게
            Vector2 o = f * along + n * len * 0.15f, pos = (Vector2)ship.position + o, dir = n + f * spread;
            Vector2 spin = new Vector2(-av * o.y, av * o.x);
            Shot(pos, dir * speed + vel + spin, life, dmg, foe, kind);
            Smoke(pos + n * 0.1f, 0.5f);
            if (flashPrefab) Instantiate(flashPrefab, pos + n * 0.12f, Quaternion.Euler(0, 0, Mathf.Atan2(n.y, n.x) * Mathf.Rad2Deg), world).Setup(kind == ShotKind.Ball ? 1 : 1.3f);
        }
    }

    public void Shot(Vector2 pos, Vector2 vel, float life, float dmg, bool foe, ShotKind kind)
    {
        Instantiate(ballPrefab, pos, Quaternion.identity, world).Launch(vel, life, dmg, foe, kind);
    }

// from = 쏜 배 위치 (있으면 거기서 포탄이 날아가고 발사 불꽃이 남)
    public MortarShell Lob(Vector2 at, float dmg, float radius, float delay, bool foe, Vector2? from = null)
    {
        if (foe) at += Random.insideUnitCircle * Mathf.Lerp(foeLobScatter.x, foeLobScatter.y, SeaT); // 적 폭격은 조금 빗나감
        var s = Instantiate(shellPrefab, at, Quaternion.identity, world);
        s.Setup(dmg, radius, delay, foe);
        if (from.HasValue)
        {
            s.FlyFrom(from.Value);
            if (mortarLaunchPrefab) Instantiate(mortarLaunchPrefab, from.Value, Quaternion.Euler(0, 0, Random.value * 360), world).Setup(1);
        }
        return s;
    }

// 원형 탄: n 방향으로 고르게 (해적왕 · 분노한 거대 상어)
    public void Ring(Vector2 p, int n, float speed, float dmg, float off, ShotKind kind = ShotKind.Ball)
    {
        for (int i = 0; i < n; i++)
        {
            float a = off + i * Mathf.PI * 2 / n;
            Shot(p, new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * speed, 1.6f, dmg, true, kind);
        }
    }


    // ── 효과
    public void Splash(Vector2 p, bool big)
    {
        if (splashPrefab) Instantiate(splashPrefab, p, Quaternion.identity, world).Setup(big ? 1.6f : 1f);
        if (big || Random.value < 0.35f) Sfx.Play("splash");
    }
    public void Blast(Vector2 p, float r) { if (blastPrefab) Instantiate(blastPrefab, p, Quaternion.identity, world).Setup(r); }
    public void Smoke(Vector2 p, float size) { if (smokePrefab) Instantiate(smokePrefab, p, Quaternion.identity, world).Setup(size); }

// 뱃머리 물결: 달리는 배의 양옆으로 퍼져 나감 (웹 wakeOf)
    public void Wake(Transform s, float len, float v)
    {
        if (!wakePrefab || Mathf.Abs(v) < 0.3f || Random.value > Time.deltaTime * 20) return;
        Vector2 f = s.right, side = s.up, bow = (Vector2)s.position + f * len * 0.45f;
        for (int sd = -1; sd <= 1; sd += 2)
        {
            var e = Instantiate(wakePrefab, bow, Quaternion.identity, world);
            e.Setup(1 + len * 0.35f);
            e.vel = side * sd * 0.4f - f * 0.1f;
        }
    }
    public void Debris(Vector2 p, float size) { if (debrisPrefab) Instantiate(debrisPrefab, p, Quaternion.Euler(0, 0, Random.value * 360), world).Setup(size); }
    public void Sparkle(Vector2 p) { if (sparklePrefab) Instantiate(sparklePrefab, p, Quaternion.identity, world).Setup(1); }
    public void Flame(Vector2 p) { if (flamePrefab) Instantiate(flamePrefab, p, Quaternion.identity, world).Setup(Random.Range(0.6f, 1.2f)); }

    public void Text(Vector2 p, string s, Color c, bool big = false)
    {
        if (textPrefab) Instantiate(textPrefab, p + new Vector2(Random.Range(-0.1f, 0.1f), 0.2f), Quaternion.identity, world).Setup(s, c, big);
    }

    // ── 격침: 금화 · 판자 · 아이템을 떨굼
    public void Sink(EnemyShip f, bool exploded)
    {
        kills++;
        foes.Remove(f);
        Vector2 p = f.transform.position;
        if (exploded || f.ai == FoeAI.Mine) { Blast(p, 1f); CameraFollow.Shake(8); Sfx.Boom(2); }
        else { Splash(p, true); Sfx.Play("sink"); HitStop(0.05f); }
        if (f.boss != BossKind.None) SlowMo(1.2f);
        if (f.displayName.Contains("고양이")) Sfx.Play("meow"); // 프리팹의 한국어 원문으로 고양이 배인지 봄 (화면 이름은 f.Name)
        float spread = 0.4f * (1 + f.len / 2f);
        bool ship = f.boss == BossKind.None && (f.ai == FoeAI.Ship || f.ai == FoeAI.Mortar || f.ai == FoeAI.Speeder);
        int coins = Mathf.CeilToInt(f.gold * (ship ? shipGoldMul : 1) * goldMul * LootMult * (1 + player.goldBonus) * ComboBonus / 5f);
        for (int i = 0; i < coins; i++) Drop(coinPrefab, p, spread).Setup(5);
        bool goldOnly = System.Array.IndexOf(goldOnlyKinds, f.kind) >= 0;
        int planks = goldOnly ? 0 : Mathf.CeilToInt(Mathf.Round(f.plank * (ship ? shipPlankMul : 1) * plankMul * LootMult * (1 + player.plankBonus)) / 3f);
        if (player.plunder > 0) player.hp = Mathf.Min(player.maxHp, player.hp + player.maxHp * player.plunder);
        for (int i = 0; i < planks; i++) Drop(plankPrefab, p, spread).Setup(3);
        // 사용 아이템: 일반 적만 itemDropChance(테이블 6%), 종류는 드랍 가중치 비율. 보스는 확정 드랍 없음
        if (f.boss == BossKind.None && Random.value < itemDropChance) Drop(itemPrefab, p, spread).Setup(1, 0, RollItem());
        // 납치된 쥐: 고양이 배 · 라이벌 배에서 1~2, 보스 4 (상어 · 폭탄통 · 쾌속정은 없음)
        int swim = f.boss != BossKind.None && f.boss != BossKind.Shark ? 4 : f.ai == FoeAI.Ship || f.ai == FoeAI.Mortar ? (Random.value < 0.7f ? 1 : 2) : 0;
        for (int i = 0; i < swim && swimmerPrefab; i++) Drop(swimmerPrefab, p, 0.4f).Setup(0);
        if (f.crewView) f.crewView.JumpOff();
        if (player.crewView) player.crewView.Cheer();
        if (f == bossShip)
        {
            bossShip = null;
            Message(Loc.F("msg.sunk", f.Name), "", 2.4f);
            CameraFollow.Shake(24);
        }
        if (f.ai == FoeAI.Mine) Destroy(f.gameObject); else f.BeginSink(); // 배는 천천히 기울며 가라앉음
    }

// 오브젝트 부서짐 드랍 (Drop 시트): 금화는 5 단위로 나눠 뿌림, itemChance 확률로 사용 아이템
    public void DropLoot(Vector2 p, int coin, int planks, float itemChance, float spread)
    {
        coin = Mathf.RoundToInt(coin * goldMul * (1 + player.goldBonus) * ComboBonus);
        int n = Mathf.CeilToInt(coin / 5f);
        for (int i = 0; i < n; i++) Drop(coinPrefab, p, spread).Setup(Mathf.Max(1, Mathf.RoundToInt(coin / (float)n)));
        planks = Mathf.RoundToInt(planks * plankMul * (1 + player.plankBonus));
        int m = Mathf.CeilToInt(planks / 3f);
        for (int i = 0; i < m; i++) Drop(plankPrefab, p, spread).Setup(Mathf.Max(1, Mathf.RoundToInt(planks / (float)m)));
        if (itemChance >= 1 || Random.value < itemChance) Drop(itemPrefab, p, spread * 0.5f).Setup(1, 0, RollItem()); // 1 = 반드시 (Random.value 는 1 도 나옴)
    }

// 드랍 가중치로 사용 아이템 고르기
    int RollItem()
    {
        var items = Shipyard.DB ? Shipyard.DB.items : null;
        if (items == null || items.Count == 0) return Random.Range(0, player.items.slots.Length);
        float sum = 0; foreach (var d in items) sum += d.dropWeight;
        float r = Random.value * sum;
        for (int i = 0; i < items.Count; i++) { r -= items[i].dropWeight; if (r < 0) return i; }
        return items.Count - 1;
    }


    Pickup Drop(Pickup prefab, Vector2 p, float spread)
    {
        return Instantiate(prefab, p + Random.insideUnitCircle * spread, Quaternion.identity, world);
    }
}
