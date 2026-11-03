using UnityEngine;

// 폭격 (박격포 · 폭격 아이템 · 보스 폭격): 떨어질 곳에 원을 그려 예고 → 시간이 되면 범위 피해
public class MortarShell : MonoBehaviour
{
    [Tooltip("예고 원 (지름 1 유닛 그림)")]
    public SpriteRenderer ring;
    [Tooltip("차오르는 안쪽 원")]
    public SpriteRenderer fill;
    public Color foeColor = new Color(1f, 0.35f, 0.3f, 0.9f), mineColor = new Color(1f, 0.85f, 0.3f, 0.9f);

    public Color boltColor = new Color(1f, 0.95f, 0.6f, 0.9f);
    [Tooltip("쏜 배에서 떨어질 곳까지 포물선으로 날아가는 포탄 그림 (없으면 원만)")]
    public SpriteRenderer shell;
    [Tooltip("포탄이 가장 높이 떴을 때 크기 배율 · 화면에서 위로 뜨는 높이 (유닛)")]
    public float arcScale = 1.8f, arcHeight = 1.2f;

    Vector2 from;
    bool flying;

    float dmg, radius, t, dur, foeDmg;
    bool foe, bolt;

    public void Setup(float damage, float r, float delay, bool fromFoe)
    {
        dmg = damage; radius = r; t = dur = delay; foe = fromFoe;
        var c = foe ? foeColor : mineColor;
        if (ring) { ring.color = c; ring.transform.localScale = Vector3.one * r * 2; }
        if (fill) { fill.color = new Color(c.r, c.g, c.b, 0.25f); fill.transform.localScale = Vector3.zero; }
    }

// 폭풍 번개: 내 배 · 적 모두 맞음 (잠수한 상어도)
    public void MakeBolt(float damageToFoes)
    {
        bolt = true; foeDmg = damageToFoes;
        if (ring) ring.color = boltColor;
        if (fill) fill.color = new Color(boltColor.r, boltColor.g, boltColor.b, 0.25f);
    }


    // 쏜 자리 (배) → 떨어질 곳으로 포탄을 날림
    public void FlyFrom(Vector2 origin) { from = origin; flying = shell != null; if (shell) shell.gameObject.SetActive(true); }

    void Update()
    {
        t -= Time.deltaTime;
        if (shell)
        {
            if (!flying) shell.gameObject.SetActive(false);
            else
            {
                float q = Mathf.Clamp01(1 - t / dur), up = Mathf.Sin(q * Mathf.PI);
                shell.transform.position = Vector2.Lerp(from, transform.position, q) + Vector2.up * up * arcHeight;
                shell.transform.localScale = Vector3.one * (1 + up * (arcScale - 1));
                shell.transform.Rotate(0, 0, 360 * Time.deltaTime);
            }
        }
        if (fill) fill.transform.localScale = Vector3.one * radius * 2 * Mathf.Clamp01(1 - t / dur);
        if (t > 0) return;
        var gm = GameManager.I;
        Vector2 p = transform.position;
        if (bolt && gm.weather) gm.weather.Strike(p); else { gm.Blast(p, radius); Sfx.Boom(2, foe ? 0.2f : 0); }
        CameraFollow.Shake(foe ? 6 : 11);
        if (!bolt) SeaObject.HurtArea(p, radius, dmg, !foe);
        if (bolt) foreach (var f in gm.foes) if (Vector2.Distance(f.transform.position, p) < radius) { f.hp -= foeDmg; f.hitT = 0.2f; }
        if (foe)
        {
            var me = gm.player;
            if (Vector2.Distance(me.transform.position, p) < radius + me.len * 0.25f) me.Hurt(dmg, p);
        }
        else
        {
            foreach (var f in gm.foes.ToArray())
                if (Vector2.Distance(f.transform.position, p) < radius + f.len * 0.3f) f.Hurt(dmg, ShotKind.Shell);
        }
        Destroy(gameObject);
    }
}
