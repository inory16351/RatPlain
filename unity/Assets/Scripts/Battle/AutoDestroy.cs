using UnityEngine;

// 물보라 같은 잠깐 효과: 커지며 흐려지다 사라짐
public class AutoDestroy : MonoBehaviour
{
    public float life = 0.5f;
    public float grow = 1.6f;
    float t;
    SpriteRenderer sr;
    Vector3 s0;

    void Awake() { sr = GetComponent<SpriteRenderer>(); s0 = transform.localScale; }

    void Update()
    {
        t += Time.deltaTime;
        float q = t / life;
        transform.localScale = s0 * (1f + q * grow);
        if (sr) sr.color = new Color(sr.color.r, sr.color.g, sr.color.b, 1f - q);
        if (t >= life) Destroy(gameObject);
    }
}
