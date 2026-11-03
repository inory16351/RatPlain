using UnityEngine;

// 어뢰: 곧게 달리며 잠수한 상어도 맞힘 (웹 torps). 방향 · 속도는 쏠 때 정해짐
// 물속으로 가니 바다 오브젝트엔 포탄과 똑같이 막힘 (암초 · 난파선에 부딪히고, 상자 · 폭탄 상자는 부숨)
public class Torpedo : MonoBehaviour
{
    public float life = 2.4f, blastRadius = 0.6f;
    [Tooltip("물거품 간격 (초)")]
    public float bubbleEvery = 0.05f;

    Vector2 vel;
    float dmg, bubbleT;

    public void Launch(Vector2 velocity, float damage)
    {
        vel = velocity; dmg = damage;
        transform.rotation = Quaternion.Euler(0, 0, Mathf.Atan2(vel.y, vel.x) * Mathf.Rad2Deg);
    }

    void Update()
    {
        var gm = GameManager.I;
        float dt = Time.deltaTime;
        Vector2 p = (Vector2)transform.position + vel * dt;
        transform.position = p;
        if ((bubbleT -= dt) <= 0) { bubbleT = bubbleEvery; gm.Smoke(p, 0.25f); }
        foreach (var f in gm.foes.ToArray())
            if (Vector2.Distance(p, f.transform.position) < f.len * 0.42f + 0.06f)
            {
                f.Hurt(dmg, ShotKind.Torp);
                gm.Blast(p, blastRadius); gm.Splash(p, true); CameraFollow.Shake(4); Sfx.Boom(2);
                Destroy(gameObject); return;
            }
        if (SeaObject.HitShot(p, dmg, true)) { gm.Blast(p, blastRadius * 0.6f); gm.Splash(p, true); Sfx.Boom(1); Destroy(gameObject); return; }
        if (gm.HitsIsland(p) || (life -= dt) <= 0) { gm.Splash(p, false); Destroy(gameObject); }
    }
}
