using UnityEngine;
using UnityEngine.UI;

// 바다 특성 (웹 traits): 안개 = 시야 밖이 하얗게 가림 / 폭풍 = 바람에 밀림 + 번개 예고 원 / 소용돌이 = 끌어당김 + 가운데 피해
// 그림(안개 가림막 · 빗줄기 · 소용돌이 · 번쩍임)은 하이라키에 있고, 여기서는 켜고 끄고 움직이기만 함
public class Weather : MonoBehaviour
{
    [Header("안개")]
    [Tooltip("배를 따라다니는 가림막 (반지름 1 유닛 그림)")]
    public SpriteRenderer fogMask;

    [Header("폭풍")]
    public Image stormDim;
    public Image flash;
    [Tooltip("카메라 아래 빗줄기들")]
    public Transform rain;
    [Tooltip("번개가 떨어질 때 그림")]
    public Effect boltFx;
    public float boltRadius = 0.95f, boltDmg = 16, boltFoeDmg = 20;
    [Tooltip("번개가 떨어지는 곳: 이 확률로 내 배 근처, 이 확률로 적 근처, 나머지는 화면 안 아무 데나")]
    [Range(0, 1)] public float boltNearMe = 0.2f, boltNearFoe = 0.3f;
    [Tooltip("아무 데나 떨어질 때 내 배에서 최대 거리 (유닛)")]
    public float boltArea = 7.5f;

    [Header("소용돌이")]
    public Transform whirl;
    public Transform whirlSpiral;
    public Vector2 whirlOffset = new Vector2(13, 0);
    public float whirlRange = 15, whirlCore = 1.5f, whirlDps = 14;

    [HideInInspector] public string trait = "";
    [HideInInspector] public Vector2 wind;
    float windA, boltT = 3, flashA, t, sayT;
    float[] seeds;

    public bool Storm => trait == "storm";

    // GameManager 가 바다를 정한 뒤 부름
    public void Begin(string tr, PlayerShip me)
    {
        trait = tr ?? "";
        windA = Random.value * Mathf.PI * 2;
        fogMask.gameObject.SetActive(trait == "fog");
        stormDim.gameObject.SetActive(Storm);
        rain.gameObject.SetActive(Storm);
        whirl.gameObject.SetActive(trait == "whirl");
        if (trait == "whirl")
        {
            whirl.position = (Vector2)me.transform.position + whirlOffset;
            // 소용돌이 근처 섬은 치움 (웹: 700 안쪽엔 섬을 안 만듦)
            foreach (var o in Island.All.ToArray()) if (Vector2.Distance(o.transform.position, whirl.position) < 7) o.gameObject.SetActive(false);
        }
        seeds = new float[rain.childCount * 3];
        for (int i = 0; i < seeds.Length; i++) seeds[i] = Random.value;
    }

    void Update()
    {
        var gm = GameManager.I;
        var me = gm.player;
        float dt = Time.deltaTime, guard = 1 - me.stormGuard;
        t += dt;
        if (trait == "fog") { fogMask.transform.position = me.transform.position; fogMask.transform.localScale = Vector3.one * me.vision; }
        if (Storm)
        {
            windA += dt * 0.08f;
            float v = 0.38f + Mathf.Sin(t * 0.3f) * 0.18f;
            wind = new Vector2(Mathf.Cos(windA), Mathf.Sin(windA)) * v;
            if (!gm.Over) me.transform.position += (Vector3)(wind * guard * dt);
            foreach (var f in gm.foes) if (f.boss == BossKind.None) f.transform.position += (Vector3)(wind * 0.6f * dt);
            // 번개: 바다 곳곳에 무작위로 예고 원 → 1.3 초 뒤 내리침 (내 배 · 적 모두 맞음). 가끔만 내 배 근처
            if ((boltT -= dt) <= 0 && !gm.Over)
            {
                boltT = Random.Range(2.2f, 3.6f);
                Vector2 mp = me.transform.position, at;
                float roll = Random.value;
                var foe = gm.foes.Count > 0 ? gm.foes[Random.Range(0, gm.foes.Count)] : null;
                if (roll < boltNearMe) at = mp + Random.insideUnitCircle.normalized * Random.Range(0.8f, 3f) + me.Vel * 0.8f;
                else if (roll < boltNearMe + boltNearFoe && foe) at = (Vector2)foe.transform.position + Random.insideUnitCircle * 1.2f;
                else at = mp + Random.insideUnitCircle * boltArea;
                gm.Lob(at, boltDmg * guard, boltRadius, 1.3f, true).MakeBolt(boltFoeDmg);
            }
            Rain();
        }
        else wind = Vector2.zero;
        if (trait == "whirl")
        {
            whirlSpiral.Rotate(0, 0, 1.5f * Mathf.Rad2Deg * dt);
            if (Pull(me.transform, guard, dt) < whirlCore && !gm.Over && !me.Invincible)
            {
                me.hp -= whirlDps * guard * dt;
                if ((sayT -= dt) <= 0) { sayT = 0.4f; gm.Text(me.transform.position, "소용돌이!", new Color(0.62f, 0.88f, 1f)); }
            }
            foreach (var f in gm.foes) if (f.boss == BossKind.None) Pull(f.transform, 0.7f, dt);
        }
        flashA = Mathf.Max(0, flashA - dt);
        flash.color = new Color(1, 1, 0.94f, flashA);
    }

    // 가운데로 끌면서 빙글 돌림. 거리 돌려줌
    float Pull(Transform o, float k, float dt)
    {
        Vector2 to = (Vector2)whirl.position - (Vector2)o.position;
        float d = to.magnitude;
        if (d > whirlRange || d < 0.001f) return d;
        float p = 0.9f * (1 - d / whirlRange) * k;
        Vector2 n = to / d, side = new Vector2(-n.y, n.x);
        o.position += (Vector3)((n * p + side * p * 0.9f) * dt);
        return d;
    }

    // 번개가 내리침: 화면 번쩍 + 그림 + 물보라
    public void Strike(Vector2 p)
    {
        flashA = 0.25f;
        Sfx.Play("zap");
        Instantiate(boltFx, p, Quaternion.identity, GameManager.I.world);
        GameManager.I.Splash(p, true);
        CameraFollow.Shake(9);
    }

    // 빗줄기: 화면 안에서 바람 쪽으로 비스듬히 떨어짐 (웹 storm 그리기)
    void Rain()
    {
        var cam = Camera.main;
        float VH = cam.orthographicSize * 2, VW = VH * cam.aspect;
        Vector2 dir = new Vector2(Mathf.Cos(windA) * 0.14f, -0.18f);
        float rot = Mathf.Atan2(dir.y, dir.x) * Mathf.Rad2Deg - 90;
        for (int i = 0; i < rain.childCount; i++)
        {
            float x = Mathf.Repeat(seeds[i * 3] * VW + t * 3f * Mathf.Cos(windA) * (1 + seeds[i * 3 + 1]), VW);
            float y = Mathf.Repeat(seeds[i * 3 + 2] * VH + t * 5f, VH);
            var d = rain.GetChild(i);
            d.localPosition = new Vector3(x - VW / 2, VH / 2 - y, 1);
            d.localRotation = Quaternion.Euler(0, 0, rot);
        }
    }
}
