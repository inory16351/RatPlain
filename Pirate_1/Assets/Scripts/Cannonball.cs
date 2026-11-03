using UnityEngine;

public enum ShotKind { Ball, Chain, Fire, Shell, Ram, Torp, Missile, Bow, Plane }

// 포탄: 직선으로 날며 그림만 포물선으로 떠오름 (웹 projectiles 의 balls)
public class Cannonball : MonoBehaviour
{
    [Tooltip("떠오르는 그림 (자식)")]
    public Transform visual;
    public SpriteRenderer sprite;
    public float arcHeight = 0.24f;
    [Tooltip("떨어질 곳 표시 (고리). 떨어질 때가 가까울수록 작아지고 진해짐")]
    public SpriteRenderer landing;
    public Color foeMark = new Color(1f, 0.31f, 0.25f, 1f), myMark = new Color(1f, 0.84f, 0.35f, 1f);
    public Color ballColor = Color.white, chainColor = new Color(0.75f, 0.8f, 0.9f), fireColor = new Color(1f, 0.55f, 0.2f);

    Vector2 vel;
    float life, max, dmg;
    bool foe;
    ShotKind kind;

    public void Launch(Vector2 velocity, float lifeTime, float damage, bool fromFoe, ShotKind k)
    {
        vel = velocity; life = max = lifeTime; dmg = damage; foe = fromFoe; kind = k;
        if (sprite) sprite.color = k == ShotKind.Chain ? chainColor : k == ShotKind.Fire ? fireColor : ballColor;
        if (k == ShotKind.Chain || k == ShotKind.Fire) transform.localScale *= 1.3f;
        else if (k == ShotKind.Plane) transform.localScale *= 0.6f;
    }

    void Update()
    {
        var gm = GameManager.I;
        float dt = Time.deltaTime;
        if (gm.weather && kind != ShotKind.Plane) vel += gm.weather.wind * 0.8f * dt; // 폭풍 바람이 날아가는 포탄도 밀어냄
        if (kind != ShotKind.Plane) vel += SeaObject.ShotPushAt(transform.position) * dt; // 바람 구역
        Vector2 p = (Vector2)transform.position + vel * dt;
        transform.position = p;
        life -= dt;
        if (landing)
        {
            bool show = kind != ShotKind.Plane && life > 0;
            landing.enabled = show;
            if (show)
            {
                Vector2 acc = gm.weather && kind != ShotKind.Plane ? gm.weather.wind * 0.8f : Vector2.zero;
                landing.transform.position = p + vel * life + 0.5f * acc * life * life;
                float near = 1 - life / max;
                landing.transform.localScale = Vector3.one * (0.1f + 0.14f * (1 - near)) * 2 / transform.localScale.x;
                var c = foe ? foeMark : myMark;
                landing.color = new Color(c.r, c.g, c.b, (foe ? 0.6f + 0.4f * near : 0.3f + 0.3f * near));
            }
        }
        if (visual && kind != ShotKind.Plane) visual.localPosition = new Vector3(0, Mathf.Sin((1 - life / max) * Mathf.PI) * arcHeight, 0);

        if (foe)
        {
            var me = gm.player;
            if (!gm.Over && Vector2.Distance(p, me.transform.position) < me.len * 0.36f)
            {
                me.Hurt(dmg, p);
                if (kind == ShotKind.Fire) me.burn = 3;
                Destroy(gameObject); return;
            }
        }
        else
        {
            foreach (var f in gm.foes)
                if (Vector2.Distance(p, f.transform.position) < f.len * 0.42f + 0.08f && f.Hurt(dmg, kind))
                { Sfx.Play("hit"); CameraFollow.Shake(2); Destroy(gameObject); return; }
        }
        if (gm.HitsIsland(p)) { gm.Smoke(p, 0.5f); Destroy(gameObject); return; }
        // 암초 · 난파선은 양쪽 포탄을 막음, 상자는 내 포탄으로 부숨
        if (kind != ShotKind.Plane && SeaObject.HitShot(p, dmg, !foe)) { gm.Smoke(p, 0.5f); Sfx.Play("wood", 0.5f); Destroy(gameObject); return; }
        if (life <= 0) { gm.Splash(p, false); Destroy(gameObject); }
    }
}
