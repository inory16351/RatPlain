using UnityEngine;

// 유도탄: 옆으로 튀어나간 뒤 가까운 적을 따라 돌며 빨라짐 (웹 missiles). 목표가 잠수하거나 가라앉으면 다른 적을 찾음
// 박격포처럼 위로 날아가니 암초 · 난파선을 넘어감. 터질 때 폭발 범위 안 오브젝트는 깎음
public class Missile : MonoBehaviour
{
    public float life = 3f, turnRate = 4.5f, accel = 5f, maxSpeed = 5.6f, seekRange = 9f, blastRadius = 0.45f;
    public float smokeEvery = 0.03f;

    EnemyShip target;
    float v, dmg, smokeT;

    public void Launch(float angle, float speed, float damage, EnemyShip tgt)
    {
        transform.rotation = Quaternion.Euler(0, 0, angle * Mathf.Rad2Deg);
        v = speed; dmg = damage; target = tgt;
    }

    void Update()
    {
        var gm = GameManager.I;
        float dt = Time.deltaTime;
        Vector2 p = transform.position;
        if (!target || !target.Targetable || !gm.foes.Contains(target)) target = gm.Nearest(p, seekRange, true);
        float a = transform.eulerAngles.z * Mathf.Deg2Rad;
        if (target)
        {
            Vector2 to = (Vector2)target.transform.position - p;
            float diff = Mathf.DeltaAngle(a * Mathf.Rad2Deg, Mathf.Atan2(to.y, to.x) * Mathf.Rad2Deg) * Mathf.Deg2Rad;
            a += Mathf.Sign(diff) * Mathf.Min(Mathf.Abs(diff), turnRate * dt);
            transform.rotation = Quaternion.Euler(0, 0, a * Mathf.Rad2Deg);
        }
        v = Mathf.Min(maxSpeed, v + accel * dt);
        p += new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * v * dt;
        transform.position = p;
        if ((smokeT -= dt) <= 0) { smokeT = smokeEvery; gm.Smoke(p, 0.2f); }
        foreach (var f in gm.foes.ToArray())
            if (f.Targetable && Vector2.Distance(p, f.transform.position) < f.len * 0.42f + 0.06f)
            {
                f.Hurt(dmg, ShotKind.Missile);
                gm.Blast(p, blastRadius); Sfx.Boom(1);
                SeaObject.HurtArea(p, blastRadius, dmg, true);
                Destroy(gameObject); return;
            }
        if ((life -= dt) <= 0) { gm.Splash(p, false); Destroy(gameObject); }
    }
}
