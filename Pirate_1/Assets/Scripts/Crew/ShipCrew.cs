using System.Collections.Generic;
using UnityEngine;

// 갑판 위 선원들 (웹 mates · crewTick · crewFire · crewJumpOff)
// 자리(CREW_SPOTS)는 배 길이 비율 [뱃머리 +x, 오른쪽 +y] — 웹 좌표 그대로 쓰고, 놓을 때만 y 를 뒤집음
// 선원 그림은 원본 리깅 프리팹을 복제. 자리는 배와 같이 돌지만 그림은 화면 기준으로 서 있고 보는 쪽에 따라 좌우만 뒤집힘
public class ShipCrew : MonoBehaviour
{
    static readonly Vector2[] SPOTS = { new Vector2(-0.3f, 0), new Vector2(0.2f, -0.065f), new Vector2(0.2f, 0.065f), new Vector2(-0.13f, -0.065f), new Vector2(-0.13f, 0.065f), new Vector2(0.27f, 0), new Vector2(0.11f, 0), new Vector2(-0.2f, 0) };
    const float RAIL = 0.068f, WALK = 0.45f;
    public const int MAX_SHOWN = 7;

    [Tooltip("선원이 붙는 자리 (배 루트 아래)")]
    public Transform holder;
    [Tooltip("적 배: 선장 먼저, 그다음 선원 (원본 리깅)")]
    public CrewMember[] lineup;
    [Tooltip("웹 배 길이 (픽셀) → 선원 크기")]
    public float baseLen = 76;
    public float captainScale = 1f;
    [Tooltip("선원 그리기 순서 시작 (배 그림보다 위, 포탄 20 보다 아래) — 화면 아래일수록 +0~6")]
    public int sortBase = 13;

    [Header("내 배: 배 단계(시대)별 옷차림")]
    public bool isPlayer;
    [Tooltip("단계 0~5 선장")]
    public CrewMember[] captains;
    [Tooltip("단계 × 4 (단계 0 의 선원 4종, 단계 1 의 4종 …)")]
    public CrewMember[] eraCrew;

    class Job { public Vector2 to; public float face, dur, wait; public string act; public bool home, arrived; }
    class Mate { public CrewMember m; public Vector2 home, pos; public float face, flip = 1; public Job job; public UnityEngine.Rendering.SortingGroup sg; }
    readonly List<Mate> mates = new List<Mate>();
    float len, size;
    int tier;

    void Start()
    {
        if (mates.Count > 0) return; // 미리보기가 먼저 ShowShip 으로 세움
        var ps = GetComponent<PlayerShip>();
        var es = GetComponent<EnemyShip>();
        len = ps ? ps.len : es ? es.len : 1.5f;
        if (isPlayer && Shipyard.DB) { var s = Shipyard.Compute(); baseLen = s.ship.len; tier = s.ship.tier; }
        size = 0.22f * Mathf.Clamp(baseLen / 100f, 0.85f, 1.5f);
        if (isPlayer) { Add(captains[Mathf.Clamp(tier, 0, captains.Length - 1)], 0, size * 1.1f, false); SetCount(ps ? ps.crew : 2); }
        else for (int i = 0; i < lineup.Length; i++) Add(lineup[i], i, i == 0 ? size * captainScale : size, false);
    }

    // 내 배: 건진 선원 수만큼 갑판에 올림 (최대 7명 보임)
    public void SetCount(int n)
    {
        n = Mathf.Min(MAX_SHOWN, n);
        while (mates.Count - 1 < n)
        {
            int k = mates.Count - 1;
            Add(eraCrew[Mathf.Clamp(tier, 0, 5) * 4 + k % 4], 1 + k, size, Time.timeSinceLevelLoad > 1);
        }
    }

// 항구 미리보기: 그 배 단계의 선장 + 선원 count 명을 다시 세움
    public void ShowShip(ShipDef d, int count)
    {
        foreach (var x in mates) if (x.m) Destroy(x.m.gameObject);
        mates.Clear();
        len = d.len * 1.8f / 100f; baseLen = d.len; tier = d.tier;
        size = 0.22f * Mathf.Clamp(baseLen / 100f, 0.85f, 1.5f);
        Add(captains[Mathf.Clamp(tier, 0, captains.Length - 1)], 0, size * 1.1f, false);
        for (int k = 0; k < Mathf.Min(MAX_SHOWN, count); k++) Add(eraCrew[Mathf.Clamp(tier, 0, 5) * 4 + k % 4], 1 + k, size, false);
    }


    void Add(CrewMember prefab, int spot, float sz, bool fromRail)
    {
        if (!prefab) return;
        var m = Instantiate(prefab, holder);
        m.SetSize(sz);
        var home = SPOTS[Mathf.Min(spot, SPOTS.Length - 1)];
        var mate = new Mate { m = m, home = home, pos = home, sg = m.GetComponent<UnityEngine.Rendering.SortingGroup>() };
        if (fromRail) // 새로 건진 선원은 난간에서 올라와 자리로 걸어감
        {
            mate.pos = new Vector2(home.x, Mathf.Sign(home.y == 0 ? 1 : home.y) * RAIL);
            mate.job = new Job { to = home, act = "idle" };
            m.ch = 0.8f;
        }
        mates.Add(mate);
        Place(mate, 0);
    }

    // 일제 사격: 선장 호령 + 선원들이 그쪽 난간 대포로 뛰어가 장전 (side +1 = 우현 = 웹 +y)
    public void OnFire(int side, int guns, float reload)
    {
        if (mates.Count == 0) return;
        var cap = mates[0];
        cap.job = new Job { to = cap.pos, face = side * 0.3f, act = "order", dur = 0.7f };
        var hands = mates.GetRange(1, mates.Count - 1).FindAll(x => x.job == null || x.job.home || x.m.act == "idle");
        hands.Sort((a, b) => Mathf.Abs(a.pos.y - side * RAIL).CompareTo(Mathf.Abs(b.pos.y - side * RAIL)));
        int n = Mathf.Min(3, guns, hands.Count);
        for (int i = 0; i < n; i++)
        {
            float along = (n == 1 ? 0 : (i / (n - 1f) - 0.5f)) * 0.42f;
            hands[i].job = new Job { to = new Vector2(along, side * RAIL), face = side * 0.7f, act = "load", dur = Mathf.Max(0.6f, reload), wait = 1.2f };
        }
    }

    public void Hit() { foreach (var x in mates) x.m.fl = 0.35f; }
    public void Cheer() { foreach (var x in mates) if (x.m.act == "idle" && x.job == null) x.m.ch = 0.9f; }

    // 침몰: 선원이 모두 물로 뛰어내림
    public void JumpOff()
    {
        var world = GameManager.I.world;
        foreach (var x in mates)
        {
            if (!x.m) continue;
            Vector2 p = x.m.transform.position, d = p - (Vector2)transform.position;
            float a = Mathf.Atan2(d.y, d.x) + Random.Range(-0.6f, 0.6f);
            x.m.JumpOff(new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * Random.Range(0.6f, 1.3f), Random.Range(0.5f, 0.9f), world);
        }
        mates.Clear();
    }

    void Update()
    {
        float dt = Time.deltaTime;
        foreach (var x in mates)
        {
            var m = x.m;
            if (!m) continue;
            var j = x.job;
            if (j != null)
            {
                Vector2 d = j.to - x.pos;
                if (!j.arrived && d.magnitude > 0.004f)
                {
                    x.pos += d.normalized * Mathf.Min(d.magnitude, WALK * dt);
                    if (m.act != "walk") m.SetAct("walk", 0);
                    x.face = LerpA(x.face, Mathf.Atan2(d.y, d.x), dt * 12);
                }
                else
                {
                    if (!j.arrived) { j.arrived = true; m.SetAct(j.act, j.dur); }
                    x.face = LerpA(x.face, j.face, dt * 8);
                    if (m.at > j.dur + j.wait) x.job = j.act == "load" ? new Job { to = x.home, act = "idle", home = true } : null;
                }
            }
            else
            {
                x.face = LerpA(x.face, 0, dt * 3);
                if (m.act != "idle" && m.at > m.dur) m.SetAct("idle", 0);
            }
            Place(x, dt);
        }
    }

    static float LerpA(float a, float b, float k) => a + Mathf.DeltaAngle(a * Mathf.Rad2Deg, b * Mathf.Rad2Deg) * Mathf.Deg2Rad * Mathf.Min(1, k);

    void Place(Mate x, float dt)
    {
        var m = x.m;
        m.transform.localPosition = new Vector3(x.pos.x * len, -x.pos.y * len, 0);
        float shipA = transform.eulerAngles.z * Mathf.Deg2Rad;
        // 화면에서 왼쪽을 보면 좌우 뒤집음 (휙 뒤집히지 않고 살짝 납작해졌다 돌아섬)
        float look = Mathf.Cos(shipA - x.face) < -0.15f ? -1 : 1;
        x.flip = dt > 0 ? x.flip + (look - x.flip) * 0.35f : look;
        float fx = Mathf.Abs(x.flip) < 0.15f ? 0.15f * Mathf.Sign(x.flip == 0 ? 1 : x.flip) : x.flip;
        float hop = m.ch > 0 ? Mathf.Sin((1 - m.ch / 0.9f) * Mathf.PI) * 0.15f : 0;
        m.transform.rotation = Quaternion.Euler(0, 0, -Mathf.Sin(m.t * 1.7f) * 0.04f * Mathf.Rad2Deg);
        float k = m.SizeK * (1 + hop);
        m.transform.localScale = new Vector3(k * fx, k, 1);
        // 화면 아래쪽일수록 앞
        if (x.sg) x.sg.sortingOrder = sortBase + Mathf.Clamp(Mathf.RoundToInt((transform.position.y - m.transform.position.y) * 6) + 3, 0, 6);
    }
}
