using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

// 화면 밖 화살표 (웹 arrow): 화면 밖 적(폭탄통 빼고, 안개면 시야 안만) · 보물 상자 쪽을 화면 가장자리에서 가리킴
// 화살표 그림은 원본을 복제해 씀
public class EdgeArrows : MonoBehaviour
{
    public RectTransform canvas;
    public Image arrowTemplate;
    public float margin = 26, topMargin = 70;
    public Color foe = new Color(1f, 0.35f, 0.31f, 0.85f), boss = new Color(1f, 0.29f, 0.82f, 0.95f), chest = new Color(1f, 0.85f, 0.29f, 0.85f);

    readonly List<Image> pool = new List<Image>();
    int used;

    void Start() { arrowTemplate.gameObject.SetActive(false); }

    void LateUpdate()
    {
        var gm = GameManager.I;
        var me = gm.player;
        used = 0;
        if (!gm.Over)
        {
            float fog = gm.weather && gm.weather.trait == "fog" ? me.vision : 1e9f;
            foreach (var f in gm.foes)
                if (f.ai != FoeAI.Mine && f.Targetable && Vector2.Distance(f.transform.position, me.transform.position) < fog)
                    Point(f.transform.position, f.boss != BossKind.None ? boss : foe);
            foreach (var p in FindObjectsByType<Pickup>(FindObjectsSortMode.None)) if (p.kind == PickupKind.Chest) Point(p.transform.position, chest);
        }
        for (int i = used; i < pool.Count; i++) if (pool[i].gameObject.activeSelf) pool[i].gameObject.SetActive(false);
    }

    void Point(Vector3 world, Color col)
    {
        Vector3 v = Camera.main.WorldToViewportPoint(world);
        if (v.x > 0 && v.x < 1 && v.y > 0 && v.y < 1) return;
        var size = canvas.rect.size;
        Vector2 d = new Vector2((v.x - 0.5f) * size.x, (v.y - 0.5f) * size.y);
        float a = Mathf.Atan2(d.y, d.x);
        Vector2 e = new Vector2(Mathf.Cos(a) * (size.x / 2 - margin), Mathf.Sin(a) * (size.y / 2 - margin));
        e.x = Mathf.Clamp(e.x, -size.x / 2 + margin, size.x / 2 - margin);
        e.y = Mathf.Clamp(e.y, -size.y / 2 + margin, size.y / 2 - topMargin);
        if (used == pool.Count) pool.Add(Instantiate(arrowTemplate, transform));
        var im = pool[used++];
        im.gameObject.SetActive(true);
        im.rectTransform.anchoredPosition = e;
        im.rectTransform.localRotation = Quaternion.Euler(0, 0, a * Mathf.Rad2Deg);
        im.color = col;
    }
}
