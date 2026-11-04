using System.Collections.Generic;
using UnityEngine;

public enum SeaObjectKind { Treasure, Supply, BombCrate, Reef, Wreck, Current, Wind }

// 바다 오브젝트 (기획서 오브젝트 · 아이템 + Pirat_Table/오브젝트 아이템 테이블 Object 시트). 수치는 프리팹 인스펙터에서
// 보물상자 · 보급 상자 = 포탄으로 부수면 재화 · 사용 아이템 / 폭탄 상자 = 부딪히면 피해, 터지면 주변 모두 피해 (적 포함)
// 암초 · 난파선 = 포탄을 막는 엄폐물 (난파선은 맞으면 부서짐, 암초는 부딪히면 느려짐) / 해류 · 바람 구역 = 함선 · 포탄을 미는 구역
// 적에게도 똑같이 작용 (폭탄 상자로 유인, 해류에 휩쓸림)
public class SeaObject : MonoBehaviour
{
    public static readonly List<SeaObject> All = new List<SeaObject>();

    public SeaObjectKind kind;
    [Header("테이블 수치 (유닛 = 픽셀/100)")]
    [Tooltip("0 = 부서지지 않음")]
    public float hp = 30;
    public float radius = 0.24f;
    public float contactDmg, explodeDmg, explodeRadius;
    [Tooltip("해류 · 바람 구역이 미는 힘 (유닛/초), 방향 = 오브젝트 오른쪽(+x)")]
    public float push;
    [Header("드랍 (Drop 시트)")]
    public int goldMin, goldMax, plank;
    [Range(0, 1)] public float itemChance;
    [Tooltip("금화가 나올 확률 (1 = 항상). 난파선은 아주 가끔")]
    [Range(0, 1)] public float goldChance = 1;
    [Header("효과 (Value_Type)")]
    public bool blockShot;
    [Tooltip("부딪히면 함선 속도 × 값 (암초)")]
    public float hitSlow = 1;
    [Tooltip("해류: 흐름 쪽으로 갈 때 · 거슬러 갈 때 속도 배율")]
    public float flowSpeedMul = 1, againstSpeedMul = 1;
    [Tooltip("바람 구역: 안을 지나는 포탄도 밀림")]
    public bool shotPush;

    [Header("연결")]
    public SpriteRenderer art;

    [HideInInspector] public long id = -1; // 맵 구역 배치 번호 (부서지면 재진입해도 안 생김)
    float maxHp, hitT, bob;
    Color baseCol = Color.white;
    bool dead;

    public bool Zone => kind == SeaObjectKind.Current || kind == SeaObjectKind.Wind;
    public bool Breakable => hp > 0 || maxHp > 0;
    public Vector2 Flow => transform.right;

    void OnEnable() { All.Add(this); }
    void OnDisable() { All.Remove(this); }
    void Awake() { maxHp = hp; bob = Random.value * 7; if (art) baseCol = art.color; }

    // 포탄 · 폭발 · 박치기로 맞음. byPlayer = 내 포탄 (보물 · 보급 상자는 내 포탄으로만 부서짐)
    public void Hurt(float d, bool byPlayer)
    {
        if (dead || maxHp <= 0) return;
        if (!byPlayer && (kind == SeaObjectKind.Treasure || kind == SeaObjectKind.Supply)) return;
        hp -= d; hitT = 0.15f;
        if (kind == SeaObjectKind.BombCrate || hp <= 0) Break();
    }

    void Break()
    {
        if (dead) return;
        dead = true;
        var gm = GameManager.I;
        Vector2 p = transform.position;
        if (id >= 0) SeaChunks.Broken.Add(id);
        if (kind == SeaObjectKind.BombCrate) Explode(p);
        else gm.Debris(p, radius * 4);
        int gold = Random.value < goldChance ? Random.Range(goldMin, goldMax + 1) : 0;
        if (goldMax > 0 || plank > 0 || itemChance > 0) gm.DropLoot(p, gold, plank, itemChance, radius * 2);
        if (kind == SeaObjectKind.Treasure) { gm.Text(p, Loc.T("float.treasure"), new Color(1f, 0.85f, 0.29f), true); Sfx.Play("chest"); gm.Sparkle(p); }
        else if (kind == SeaObjectKind.Supply) Sfx.Play("wood");
        Destroy(gameObject);
    }

    // 폭탄 상자: 반지름 안 함선 모두 피해 (Hit_All). 옆 폭탄 상자도 연달아 터짐
    void Explode(Vector2 p)
    {
        var gm = GameManager.I;
        gm.Blast(p, explodeRadius);
        Sfx.Boom(3); CameraFollow.Shake(12);
        var me = gm.player;
        if (Vector2.Distance(me.transform.position, p) < explodeRadius + me.len * 0.25f) me.Hurt(explodeDmg, p);
        foreach (var f in gm.foes.ToArray())
            if (Vector2.Distance(f.transform.position, p) < explodeRadius + f.len * 0.3f) f.Hurt(explodeDmg, ShotKind.Shell);
        HurtArea(p, explodeRadius, explodeDmg, true);
    }

    void Update()
    {
        var gm = GameManager.I;
        if (!gm || dead) return;
        float dt = Time.deltaTime;
        bob += dt;
        hitT = Mathf.Max(0, hitT - dt);
        if (art)
        {
            if (!Zone) art.transform.localPosition = new Vector3(0, Mathf.Sin(bob * 2) * 0.02f, 0);
            art.color = hitT > 0 ? new Color(1f, 0.6f, 0.6f, baseCol.a) : baseCol;
        }
        var me = gm.player;
        if (Zone)
        {
            // 구역 안 함선을 흐름 쪽으로 밂 (적도)
            if (!gm.Over && Vector2.Distance(me.transform.position, transform.position) < radius) me.transform.position += (Vector3)(Flow * push * dt);
            foreach (var f in gm.foes) if (f.boss == BossKind.None && Vector2.Distance(f.transform.position, transform.position) < radius) f.transform.position += (Vector3)(Flow * push * dt);
            return;
        }
        // 부딪힘: 밀어냄 (+ 암초 감속 · 폭탄 상자 피해 후 폭발)
        Collide(me.transform, me.len * 0.3f, ref me.v, true);
        foreach (var f in gm.foes.ToArray()) if (f.ai != FoeAI.Mine && f.Targetable) Collide(f.transform, f.len * 0.3f, ref f.v, false);
    }

    void Collide(Transform t, float r, ref float v, bool isPlayer)
    {
        Vector2 d = (Vector2)t.position - (Vector2)transform.position;
        float m = radius + r, len = d.magnitude;
        if (len >= m || dead) return;
        if (kind == SeaObjectKind.BombCrate)
        {
            if (isPlayer) GameManager.I.player.Hurt(contactDmg, transform.position);
            else { var f = t.GetComponent<EnemyShip>(); if (f) { f.hp -= contactDmg; f.hitT = 0.2f; } }
            Break();
            return;
        }
        if (len < 0.001f) d = Vector2.right; else d /= len;
        t.position = (Vector2)transform.position + d * m;
        v *= hitSlow < 1 ? hitSlow : 0.6f;
    }

    // 해류 위에서 플레이어 속도 배율: 흐름 쪽이면 ×flow, 거슬러 가면 ×against
    public static float SpeedMulAt(Vector2 p, Vector2 forward)
    {
        foreach (var o in All)
            if (o.kind == SeaObjectKind.Current && Vector2.Distance(p, o.transform.position) < o.radius)
                return Vector2.Dot(forward, o.Flow) >= 0 ? o.flowSpeedMul : o.againstSpeedMul;
        return 1;
    }

    // 포탄이 여기에 막히는지 (엄폐물) · 부서지는 오브젝트에 맞는지. 맞으면 true
    public static bool HitShot(Vector2 p, float dmg, bool byPlayer)
    {
        foreach (var o in All.ToArray())
        {
            if (o.Zone || o.dead || Vector2.Distance(p, o.transform.position) > o.radius) continue;
            if (o.blockShot || o.kind == SeaObjectKind.BombCrate || (byPlayer && o.maxHp > 0))
            {
                o.Hurt(dmg, byPlayer);
                return true;
            }
        }
        return false;
    }

    // 폭발 범위 안 오브젝트 피해 (폭탄 상자 · 박격포)
    public static void HurtArea(Vector2 p, float r, float dmg, bool byPlayer)
    {
        foreach (var o in All.ToArray())
            if (!o.Zone && Vector2.Distance(o.transform.position, p) < r + o.radius) o.Hurt(dmg, byPlayer);
    }

    // 바람 구역: 안을 지나는 포탄 가속
    public static Vector2 ShotPushAt(Vector2 p)
    {
        Vector2 a = Vector2.zero;
        foreach (var o in All) if (o.shotPush && Vector2.Distance(p, o.transform.position) < o.radius) a += o.Flow * o.push;
        return a;
    }

    void OnDrawGizmosSelected() { Gizmos.color = Zone ? Color.cyan : Color.yellow; Gizmos.DrawWireSphere(transform.position, radius); }
}
