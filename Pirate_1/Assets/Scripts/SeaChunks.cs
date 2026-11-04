using System.Collections.Generic;
using UnityEngine;

// 끝없는 바다 (웹 chunks · makeChunk): 배 둘레 칸마다 섬 0~2개 + 바다 장식을 해시로 만들고, 멀어지면 버렸다가 돌아오면 똑같이 다시 만듦
// 섬 · 장식 생김새는 원본(프리팹 · 하이라키)에서 복제. 바다 물결 타일은 카메라를 따라 타일 간격으로 옮김
// 너무 멀리 떨어진 적은 배 근처로 다시 데려오고, 너무 먼 보물 상자는 치움
// 바다 오브젝트 (기획서 5쪽 배치 규칙): 섬과 함께 칸마다 배치, 출발점 주변 제외, 칸을 벗어나면 삭제 · 돌아오면 같은 자리에 복원 (부순 건 그대로 없음)
// 바다마다 구성 비율이 다름 (폭풍 해협 = 바람 구역, 해적 소굴 = 난파선 위주)
[System.Serializable]
public class ObjectMix
{
    public string note;
    public float supply = 3, bomb = 2, reef = 2, wreck = 2, current = 1, wind = 1;
    public ObjectMix() { }
    public ObjectMix(string n, float s, float b, float r, float w, float c, float wi) { note = n; supply = s; bomb = b; reef = r; wreck = w; current = c; wind = wi; }
    public float Of(SeaObjectKind k)
    {
        switch (k)
        {
            case SeaObjectKind.Supply: return supply;
            case SeaObjectKind.BombCrate: return bomb;
            case SeaObjectKind.Reef: return reef;
            case SeaObjectKind.Wreck: return wreck;
            case SeaObjectKind.Current: return current;
            case SeaObjectKind.Wind: return wind;
        }
        return 0;
    }
}

public class SeaChunks : MonoBehaviour
{
    public static readonly HashSet<long> Broken = new HashSet<long>();
    [Header("원본")]
    public Island islandTemplate;
    public SpriteRenderer decoTemplate;
    [Tooltip("섬 그림 (islands_0~3)")]
    public Sprite[] islandSprites;
    public Sprite[] decoSprites;
    [Tooltip("바다마다 쓰는 섬 그림 번호 (웹 SEA_ISLAND)")]
    public int[] seaIsland = { 0, 1, 0, 2, 1, 3, 1, 3 };

    [Header("바다 오브젝트 (원본 프리팹: 보급 상자 · 폭탄 상자 · 암초 · 난파선 · 해류 · 바람 구역)")]
    public SeaObject[] objectPrefabs;
    [Tooltip("칸 하나에 놓는 오브젝트 수 (최소 ~ 최대)")]
    public int objMin = 1, objMax = 3;
    [Tooltip("출발점 둘레 비우는 거리 (유닛)")]
    public float homeClear = 5;
    [Tooltip("난파선 둘레에 흩어 놓는 나무 조각 장식 (부딪히지 않음)")]
    public Sprite wreckDebris;
    public int wreckDebrisCount = 3;
    [Tooltip("바다 번호 순서 구성 비율")]
    public ObjectMix[] mixes =
    {
        new ObjectMix("치즈 항구 앞바다", 4, 1, 1, 1, 1, 0.5f),
        new ObjectMix("1", 3, 2, 2, 1, 1.5f, 1),
        new ObjectMix("2", 3, 2, 1.5f, 2, 1, 1),
        new ObjectMix("해적 소굴 = 난파선", 2, 1.5f, 1, 5, 1, 0.5f),
        new ObjectMix("폭풍 해협 = 바람", 2, 1.5f, 1, 1, 1, 5),
        new ObjectMix("철갑 = 폭탄 상자", 2, 3, 2, 1.5f, 1, 1),
        new ObjectMix("소용돌이 = 해류", 2, 1.5f, 1.5f, 1, 4, 1),
        new ObjectMix("7 = 바람", 2, 2, 1.5f, 1.5f, 1.5f, 3),
    };

    [Header("바다 물결 타일")]
    public Transform seaTile;
    public float tileSize = 5.12f;

    [Header("칸 (유닛)")]
    public float chunk = 14;
    public int near = 2, far = 3;

    class Chunk { public readonly List<GameObject> objs = new List<GameObject>(); }
    readonly Dictionary<Vector2Int, Chunk> chunks = new Dictionary<Vector2Int, Chunk>();
    float seed, tidyT;
    Vector2 home;
    int look;

    // 0 이상 1 미만. 소수 부분을 double 로 끝까지 계산 (float 로 섞어 계산하면 Floor 가 반올림돼 아주 작은 음수가 나와 배열 번호가 -1 이 됐음)
    static float Hash(float a, float b)
    {
        double s = System.Math.Sin((double)a * 127.1 + (double)b * 311.7) * 43758.5453;
        float f = (float)(s - System.Math.Floor(s));
        return f >= 1f ? 0f : f;
    }

    void Start()
    {
        var gm = GameManager.I;
        seed = Random.value * 1000;
        Broken.Clear();
        foreach (var o in objectPrefabs) if (o && o.gameObject.scene.IsValid()) o.gameObject.SetActive(false); // 하이라키 원본이면 숨김
        home = gm.player.transform.position;
        look = seaIsland[Mathf.Clamp(gm.SeaIndex, 0, seaIsland.Length - 1)];
        islandTemplate.gameObject.SetActive(false);
        decoTemplate.gameObject.SetActive(false);
    }

    void Update()
    {
        var gm = GameManager.I;
        Vector2 me = gm.player.transform.position;
        int cx0 = Mathf.FloorToInt(me.x / chunk), cy0 = Mathf.FloorToInt(me.y / chunk);
        for (int cy = cy0 - near; cy <= cy0 + near; cy++)
            for (int cx = cx0 - near; cx <= cx0 + near; cx++)
            {
                var k = new Vector2Int(cx, cy);
                if (!chunks.ContainsKey(k)) chunks[k] = Make(cx, cy);
            }
        var drop = new List<Vector2Int>();
        foreach (var kv in chunks) if (Mathf.Max(Mathf.Abs(kv.Key.x - cx0), Mathf.Abs(kv.Key.y - cy0)) > far) drop.Add(kv.Key);
        foreach (var k in drop) { foreach (var o in chunks[k].objs) if (o) Destroy(o); chunks.Remove(k); }

        var cam = Camera.main.transform.position;
        if (seaTile) seaTile.position = new Vector3(Mathf.Round(cam.x / tileSize) * tileSize, Mathf.Round(cam.y / tileSize) * tileSize, seaTile.position.z);

        if ((tidyT -= Time.deltaTime) <= 0)
        {
            tidyT = 0.5f;
            foreach (var f in gm.foes) if (f.boss == BossKind.None && Vector2.Distance(f.transform.position, me) > 32) f.transform.position = gm.FreeSpot(9f, 13f);
            foreach (var c in SeaObject.All.ToArray()) if (c.kind == SeaObjectKind.Treasure && Vector2.Distance(c.transform.position, me) > 40) Destroy(c.gameObject);
        }
    }

    Chunk Make(int cx, int cy)
    {
        var gm = GameManager.I;
        float H(float k) => Hash(cx * 7.13f + k * 13.7f + seed, cy * 3.71f + k * 1.93f - seed * 0.5f);
        var ch = new Chunk();
        float x0 = cx * chunk, y0 = cy * chunk;
        int n = H(1) < 0.22f ? 0 : H(2) < 0.72f ? 1 : 2;
        var made = new List<Island>();
        bool whirl = gm.weather && gm.weather.trait == "whirl";
        for (int i = 0; i < n; i++)
        {
            float r = 0.7f + H(10 + i) * 1.0f;
            var p = new Vector2(x0 + 2.2f + H(20 + i) * (chunk - 4.4f), y0 + 2.2f + H(30 + i) * (chunk - 4.4f));
            if (Vector2.Distance(p, home) < 4.5f + r) continue; // 출발점 비움
            if (whirl && Vector2.Distance(p, gm.weather.whirl.position) < 7) continue;
            if (Island.All.Exists(o => Vector2.Distance(o.transform.position, p) < o.radius + r + 1.2f)) continue;
            var isl = Instantiate(islandTemplate, p, Quaternion.identity, transform);
            isl.gameObject.SetActive(true);
            isl.Setup(r, islandSprites[look], H(40 + i) * 7);
            ch.objs.Add(isl.gameObject); made.Add(isl);
        }
        for (int i = 0; i < 4; i++)
        {
            var p = new Vector2(x0 + H(50 + i) * chunk, y0 + H(60 + i) * chunk);
            if (made.Exists(o => Vector2.Distance(o.transform.position, p) < o.radius * 1.5f + 0.4f)) continue;
            var d = Instantiate(decoTemplate, p, Quaternion.Euler(0, 0, H(90 + i) * 7 * Mathf.Rad2Deg), transform);
            d.gameObject.SetActive(true);
            d.sprite = decoSprites[Mathf.FloorToInt(H(70 + i) * decoSprites.Length) % decoSprites.Length];
            d.transform.localScale = Vector3.one * (0.34f + H(80 + i) * 0.36f) / 0.72f;
            ch.objs.Add(d.gameObject);
        }
        PlaceObjects(cx, cy, ch, made, H);
        return ch;
    }

    // 칸마다 같은 해시로 오브젝트 자리 · 종류를 정함 → 다시 와도 똑같이. 구역(해류 · 바람)은 칸에 하나까지
    // 난파선 둘레 나무 조각 (같은 해시 → 다시 와도 같은 자리)
    void Debris(Vector2 at, float r, int i, Chunk ch, System.Func<float, float> H)
    {
        if (!wreckDebris) return;
        for (int j = 0; j < wreckDebrisCount; j++)
        {
            float k = 200 + i * 10 + j * 3;
            float a = H(k) * Mathf.PI * 2, d = r + 0.25f + H(k + 1) * 0.8f;
            var dd = Instantiate(decoTemplate, at + new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * d, Quaternion.Euler(0, 0, H(k + 2) * 360), transform);
            dd.gameObject.SetActive(true);
            dd.sprite = wreckDebris;
            dd.transform.localScale = Vector3.one * (0.3f + H(k + 1.5f) * 0.2f) / 0.72f;
            ch.objs.Add(dd.gameObject);
        }
    }

    void PlaceObjects(int cx, int cy, Chunk ch, List<Island> made, System.Func<float, float> H)
    {
        if (objectPrefabs == null || objectPrefabs.Length == 0) return;
        var gm = GameManager.I;
        var mix = mixes.Length > 0 ? mixes[Mathf.Clamp(gm.SeaIndex, 0, mixes.Length - 1)] : new ObjectMix();
        float sum = 0;
        foreach (var o in objectPrefabs) if (o) sum += mix.Of(o.kind);
        if (sum <= 0) return;
        float x0 = cx * chunk, y0 = cy * chunk;
        int n = objMin + Mathf.FloorToInt(H(100) * (objMax - objMin + 1));
        bool zone = false;
        var placed = new List<Vector3>(); // x, y, 반지름
        for (int i = 0; i < n; i++)
        {
            long id = ((long)(cx + 5000) * 10000 + (cy + 5000)) * 10 + i;
            float r = H(110 + i) * sum;
            SeaObject pf = null;
            foreach (var o in objectPrefabs) { if (!o) continue; r -= mix.Of(o.kind); if (r < 0) { pf = o; break; } }
            if (!pf) continue;
            if (pf.Zone && zone) continue;
            if (Broken.Contains(id)) continue;
            var p = new Vector2(x0 + 1.5f + H(120 + i) * (chunk - 3), y0 + 1.5f + H(130 + i) * (chunk - 3));
            float pr = pf.radius;
            if (Vector2.Distance(p, home) < homeClear + pr) continue; // 출발점 비움
            if (Island.All.Exists(o => Vector2.Distance(o.transform.position, p) < o.radius + pr + 0.6f)) continue;
            if (placed.Exists(q => Vector2.Distance(q, p) < q.z + pr + 0.5f)) continue;
            var so = Instantiate(pf, p, Quaternion.Euler(0, 0, H(140 + i) * 360), transform);
            so.gameObject.SetActive(true);
            so.id = id;
            if (!so.Zone && so.art) so.art.transform.rotation = Quaternion.Euler(0, 0, (H(150 + i) - 0.5f) * 40); // 상자 · 암초는 거의 똑바로
            if (pf.Zone) zone = true;
            if (pf.kind == SeaObjectKind.Wreck) Debris(p, pr, i, ch, H);
            placed.Add(new Vector3(p.x, p.y, pr));
            ch.objs.Add(so.gameObject);
        }
    }
}
