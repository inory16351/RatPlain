using UnityEngine;

// 갈매기 한 마리: 날갯짓 그림(Codex 시트 6장)을 돌리며 화면을 가로질러 날아감. 바다 위 그림자는 아래 오른쪽에 떨어짐
// 그림 · 크기 · 정렬은 프리팹(하이라키 원본)에서. GullFlock 이 복제해서 방향 · 속도만 넣음
public class Gull : MonoBehaviour
{
    public SpriteRenderer body, shadow;
    [Tooltip("날갯짓 한 바퀴 (오른쪽을 보는 그림)")]
    public Sprite[] frames;
    public float fps = 10;
    [Tooltip("날갯짓을 멈추고 미끄러지는 비율 (0~1)")]
    [Range(0, 1)] public float glide = 0.35f;
    [Tooltip("카메라에서 이만큼 멀어지면 사라짐 (유닛)")]
    public float despawn = 22;

    Vector2 vel;
    float t, wob, glideT, flapT;

    public void Launch(Vector2 velocity, float phase)
    {
        vel = velocity; t = phase; wob = Random.value * 7;
        transform.rotation = Quaternion.Euler(0, 0, Mathf.Atan2(vel.y, vel.x) * Mathf.Rad2Deg);
    }

    void Update()
    {
        float dt = Time.deltaTime;
        wob += dt;
        // 살짝 좌우로 흔들리며 날아감
        Vector2 side = new Vector2(-vel.y, vel.x).normalized;
        transform.position += (Vector3)(vel * dt + side * Mathf.Sin(wob * 1.3f) * 0.15f * dt);
        if (frames != null && frames.Length > 0)
        {
            // 날갯짓 몇 번 → 날개 편 채로 잠깐 미끄러짐
            if (glideT > 0) { glideT -= dt; body.sprite = frames[frames.Length - 1]; }
            else
            {
                t += dt * fps;
                int f = Mathf.FloorToInt(t) % frames.Length;
                body.sprite = frames[f];
                if ((flapT += dt) > 1.6f) { flapT = 0; if (Random.value < glide) glideT = Random.Range(0.6f, 1.4f); }
            }
            if (shadow) shadow.sprite = body.sprite;
        }
        if (shadow) shadow.transform.position = transform.position + new Vector3(0.28f, -0.38f, 0);
        var cam = Camera.main;
        if (cam && Vector2.Distance(cam.transform.position, transform.position) > despawn) Destroy(gameObject);
    }
}
