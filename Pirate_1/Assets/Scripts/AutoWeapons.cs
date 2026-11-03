using System.Collections.Generic;
using UnityEngine;

// 자동 무기 (웹 autoWeapons): 선수포 · 어뢰 · 유도탄 · 자동 폭격 · 함재기
// 간격 · 위력은 PlayerShip 수치(배 + 장비)에서 옴, 0 이면 그 무기 없음. 함재기는 원본을 복제해 배 둘레를 돌게 함
public class AutoWeapons : MonoBehaviour
{
    public PlayerShip ship;
    public Torpedo torpedoPrefab;
    public Missile missilePrefab;
    [Tooltip("함재기 원본 (그림만 있는 프리팹)")]
    public Transform planePrefab;

    [Header("웹 수치 (유닛 = 픽셀/100)")]
    public float bowRange = 5.6f, bowCone = 0.8f, bowSpeed = 6.2f, bowLife = 0.9f;
    public float missileRange = 9f, mortarRange = 7.5f;
    public float planeRange = 4.2f, planeShotSpeed = 7f, planeShotLife = 0.6f, planeEvery = 0.6f;

    float bowT = 1, torpT = 1, missT = 1, mortT = 2, planeT, planeA;
    readonly List<Transform> planes = new List<Transform>();

    void Start()
    {
        for (int i = 0; i < Mathf.RoundToInt(ship.planes); i++) planes.Add(Instantiate(planePrefab, transform.position, Quaternion.identity, GameManager.I.world));
    }

    void Update()
    {
        var gm = GameManager.I;
        float dt = Time.deltaTime;
        UpdatePlanes(dt);
        if (gm.Over) return;
        Vector2 me = transform.position, fwd = transform.right;
        float a = Mathf.Atan2(fwd.y, fwd.x);

        // 선수포: 앞쪽 부채꼴 안의 가까운 적
        if (ship.bow > 0 && (bowT -= dt) <= 0)
        {
            var t = gm.Nearest(me, bowRange * ship.range, true, f => Mathf.Abs(Vector2.SignedAngle(fwd, (Vector2)f.transform.position - me)) * Mathf.Deg2Rad < bowCone);
            if (t)
            {
                bowT = ship.bow;
                Vector2 bow = me + fwd * ship.len * 0.45f, dir = ((Vector2)t.transform.position - bow).normalized;
                gm.Shot(bow, dir * bowSpeed + ship.Vel, bowLife, ship.bowDmg, false, ShotKind.Bow);
                Sfx.Boom(1, 0.5f);
                gm.Smoke(bow, 0.4f);
            }
        }
        // 어뢰: 마우스 쪽으로 곧게 (배가 달리던 속도 중 그 방향 성분을 얹음)
        if (ship.torpedo > 0 && (torpT -= dt) <= 0 && gm.foes.Count > 0)
        {
            torpT = ship.torpedo;
            Vector2 m = ship.MouseWorld(), dir = (m - me).normalized;
            float ta = Mathf.Atan2(dir.y, dir.x);
            float sp = Mathf.Max(2f, 3.3f + Mathf.Cos(ta - a) * ship.v);
            Instantiate(torpedoPrefab, me + dir * ship.len * 0.3f, Quaternion.identity, gm.world).Launch(dir * sp, ship.torpedoDmg);
            Sfx.Play("torp");
        }
        // 유도탄: 옆으로 튀어나가 가까운 적을 따라감
        if (ship.missile > 0 && (missT -= dt) <= 0)
        {
            var t = gm.Nearest(me, missileRange, true);
            if (t)
            {
                missT = ship.missile;
                Instantiate(missilePrefab, me, Quaternion.identity, gm.world).Launch(a + (Random.value < 0.5f ? 1.2f : -1.2f), 2.6f, ship.missileDmg, t);
                Sfx.Play("whistle", 0.6f, 1.3f);
            }
        }
        // 자동 폭격: 가장 가까운 적이 갈 곳에
        if (ship.autoMortar > 0 && (mortT -= dt) <= 0)
        {
            var t = gm.Nearest(me, mortarRange, false);
            if (t)
            {
                mortT = ship.autoMortar;
                gm.Lob((Vector2)t.transform.position + (Vector2)t.transform.right * t.v * 0.8f, ship.mortarDmg, ship.mortarRadius * 0.8f, 0.9f, false, me);
                Sfx.Play("whistle");
            }
        }
    }

    // 함재기: 배 둘레를 돌며 가까운 적에게 짧게 쏨
    void UpdatePlanes(float dt)
    {
        if (planes.Count == 0) return;
        var gm = GameManager.I;
        planeA += dt * 1.6f;
        bool fire = !gm.Over && (planeT -= dt) <= 0;
        if (fire) planeT = planeEvery;
        for (int i = 0; i < planes.Count; i++)
        {
            float a = planeA + i * Mathf.PI * 2 / planes.Count, r = ship.len * 0.9f + 0.4f + Mathf.Sin(planeA * 2 + i) * 0.2f;
            Vector2 p = (Vector2)transform.position + new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * r;
            planes[i].position = p;
            planes[i].rotation = Quaternion.Euler(0, 0, (a + Mathf.PI / 2) * Mathf.Rad2Deg);
            if (!fire) continue;
            var t = gm.Nearest(p, planeRange, true);
            if (t) gm.Shot(p, ((Vector2)t.transform.position - p).normalized * planeShotSpeed, planeShotLife, ship.planeDmg, false, ShotKind.Plane);
        }
    }
}
