using UnityEngine;

// 잠깐 커지며 사라지는 그림 (물보라 · 폭발 · 연기). 색 · 크기 · 수명은 프리팹에서
public class Effect : MonoBehaviour
{
    public SpriteRenderer sr;
    public float life = 0.5f, startScale = 0.3f, endScale = 1f;
    [Tooltip("초당 위로 뜨는 거리 (연기)")]
    public float rise;
    [Tooltip("밀려가는 속도 (물결 자국) — 물 저항으로 줄어듦")]
    public Vector2 vel;
    public float drag = 2;

    Color col;
    float t, k = 1;

    void Awake() { col = sr.color; transform.localScale = Vector3.one * startScale; }

    public void Setup(float size) { k = size; transform.localScale = Vector3.one * startScale * k; }

    void Update()
    {
        t += Time.deltaTime;
        float q = Mathf.Clamp01(t / life);
        transform.localScale = Vector3.one * Mathf.Lerp(startScale, endScale, 1 - (1 - q) * (1 - q)) * k;
        transform.position += (Vector3.up * rise + (Vector3)vel) * Time.deltaTime;
        vel *= Mathf.Exp(-drag * Time.deltaTime);
        sr.color = new Color(col.r, col.g, col.b, col.a * (1 - q));
        if (t >= life) Destroy(gameObject);
    }
}
