using UnityEngine;

// 배 공통: 체력 · 움직임 상태 · 뱃전 일제 사격
// 웹 데모(pirate/game.js) 의 broadside 를 옮김. 단위: 1 유닛 = 웹 100px
// 생김새(스프라이트 · 콜라이더)는 프리팹에 있고, 이 스크립트는 동작만 함
public class PirateShip : MonoBehaviour
{
    public enum Team { Player, Enemy }

    [Header("편")]
    public Team team = Team.Enemy;

    [Header("체력")]
    public float maxHp = 100f;
    public float hp;

    [Header("크기 · 이동 (유닛)")]
    public float length = 1.5f;      // 뱃머리~고물 길이 (대포 배치에 씀)
    public float maxSpeed = 1.7f;    // 돛 100% 일 때
    public float turnRate = 1.5f;    // 라디안/초

    [Header("뱃전 대포")]
    public int guns = 2;             // 한쪽 뱃전 대포 수
    public float reload = 2.1f;      // 초
    public float damage = 14f;
    public float ballSpeed = 5.4f;   // 유닛/초
    public float ballLife = 0.75f;   // 초 (사거리 = 속도 × 시간)

    [Header("프리팹 원본 (복제해서 쏨)")]
    public Cannonball ballPrefab;

    [HideInInspector] public float speed;        // 지금 앞으로 가는 속도
    [HideInInspector] public float angularSpeed; // 지금 도는 속도 (라디안/초, + = 반시계)
    readonly float[] cooldown = new float[2];    // 0 = 왼쪽, 1 = 오른쪽
    SpriteRenderer body;
    float hitFlash;

    public bool Dead => hp <= 0f;
    public Vector2 Forward => transform.right;   // 그림이 뱃머리 = 오른쪽
    public Vector2 Velocity => Forward * speed;

    void Awake()
    {
        hp = maxHp;
        body = GetComponentInChildren<SpriteRenderer>();
    }

    void Update()
    {
        for (int i = 0; i < 2; i++) cooldown[i] = Mathf.Max(0f, cooldown[i] - Time.deltaTime);
        if (hitFlash > 0f && body)
        {
            hitFlash -= Time.deltaTime;
            body.color = Color.Lerp(Color.white, new Color(1f, 0.55f, 0.5f), Mathf.Clamp01(hitFlash / 0.2f));
        }
    }

    public bool Ready(int side) => cooldown[side > 0 ? 1 : 0] <= 0f;
    public float Cooldown01(int side) => 1f - cooldown[side > 0 ? 1 : 0] / reload;

    // side: +1 = 오른쪽 뱃전, -1 = 왼쪽 뱃전 (뱃머리 기준)
    public static Vector2 SideNormal(Vector2 fwd, int side) => side > 0 ? new Vector2(fwd.y, -fwd.x) : new Vector2(-fwd.y, fwd.x);

    public bool Broadside(int side)
    {
        if (Dead || !ballPrefab || !Ready(side)) return false;
        cooldown[side > 0 ? 1 : 0] = reload;
        Vector2 fwd = Forward;
        Vector2 normal = SideNormal(fwd, side);
        for (int i = 0; i < guns; i++)
        {
            float along = (guns == 1 ? 0f : (i / (float)(guns - 1) - 0.5f)) * length * 0.6f;
            Vector2 offset = fwd * along + normal * length * 0.15f;
            Vector2 dir = (normal + fwd * Random.Range(-0.04f, 0.04f)).normalized;
            // 포탄은 배 속도 + 회전 선속도(ω × r)를 이어받음
            Vector2 spin = new Vector2(-offset.y, offset.x) * angularSpeed;
            Cannonball b = Instantiate(ballPrefab, (Vector2)transform.position + offset, Quaternion.identity);
            b.Launch(this, dir * ballSpeed + Velocity + spin, ballLife, damage);
        }
        return true;
    }

    public void Hurt(float dmg)
    {
        if (Dead) return;
        hp -= dmg;
        hitFlash = 0.2f;
        if (hp <= 0f) StartCoroutine(Sink());
    }

    // 가라앉기: 돌며 작아지고 사라짐 (다음 단계에서 선원 뛰어내리기 · 파편 추가)
    System.Collections.IEnumerator Sink()
    {
        foreach (var c in GetComponentsInChildren<Collider2D>()) c.enabled = false;
        float t = 0f;
        Vector3 s0 = transform.localScale;
        while (t < 1.5f)
        {
            t += Time.deltaTime;
            transform.localScale = s0 * (1f - t / 1.5f * 0.6f);
            transform.Rotate(0f, 0f, 25f * Time.deltaTime);
            if (body) body.color = new Color(1f, 1f, 1f, 1f - t / 1.5f);
            yield return null;
        }
        Destroy(gameObject);
    }
}
