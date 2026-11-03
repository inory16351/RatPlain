using UnityEngine;

// 갈매기 떼: 몇 초마다 화면 밖 한쪽에서 1~4 마리가 V 자로 나타나 반대편으로 날아감 (분위기용, 게임에 영향 없음)
// 생김새는 하이라키 원본 갈매기(template)를 복제
public class GullFlock : MonoBehaviour
{
    public Gull template;
    [Tooltip("다음 떼까지 간격 (초)")]
    public Vector2 interval = new Vector2(5, 11);
    public int minBirds = 1, maxBirds = 4;
    [Tooltip("나는 속도 (유닛/초)")]
    public Vector2 speed = new Vector2(1.3f, 2.0f);
    [Tooltip("화면 가장자리에서 얼마나 밖에서 나타나는지 (유닛)")]
    public float margin = 1.5f;
    [Tooltip("폭풍 · 안개 바다에서는 덜 나옴")]
    public float badWeatherMul = 2.5f;

    float t = 1.5f;

    void Start() { if (template) template.gameObject.SetActive(false); }

    void Update()
    {
        if ((t -= Time.deltaTime) > 0) return;
        var gm = GameManager.I;
        bool bad = gm && gm.weather && (gm.weather.trait == "storm" || gm.weather.trait == "fog");
        t = Random.Range(interval.x, interval.y) * (bad ? badWeatherMul : 1);
        Spawn();
    }

    public void Spawn()
    {
        var cam = Camera.main;
        if (!cam || !template) return;
        float h = cam.orthographicSize, w = h * cam.aspect;
        Vector2 c = cam.transform.position;
        // 화면 둘레의 한 점에서 화면 안쪽(반대편 근처)을 향해 날아감
        float a = Random.value * Mathf.PI * 2;
        Vector2 dir = new Vector2(Mathf.Cos(a), Mathf.Sin(a));
        Vector2 from = c - Vector2.Scale(dir, new Vector2(w + margin, h + margin));
        Vector2 aim = c + new Vector2(Random.Range(-w, w), Random.Range(-h, h)) * 0.5f;
        Vector2 fly = (aim - from).normalized;
        Vector2 side = new Vector2(-fly.y, fly.x);
        float v = Random.Range(speed.x, speed.y);
        int n = Random.Range(minBirds, maxBirds + 1);
        for (int i = 0; i < n; i++)
        {
            // V 자: 앞장선 한 마리 뒤로 양옆에 번갈아
            int row = (i + 1) / 2, s = i % 2 == 0 ? 1 : -1;
            Vector2 p = from - fly * row * 0.7f + side * s * row * 0.55f;
            var g = Instantiate(template, p, Quaternion.identity, transform);
            g.gameObject.SetActive(true);
            g.Launch(fly * v * Random.Range(0.95f, 1.05f), Random.value * 6);
        }
    }
}
