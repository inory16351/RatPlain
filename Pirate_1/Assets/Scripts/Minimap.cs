using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

// 미니맵 = 배 둘레 레이더 (웹 drawHud 미니맵). 바다가 끝이 없어서 배가 늘 가운데, 반경 radius 유닛. 안개면 시야 안의 적만
// 섬(모래) · 보물 상자(노랑) · 물에 빠진 쥐(초록) · 적(빨강, 보스 분홍, 폭탄통 갈색). 점은 원본 점을 복제해 씀
public class Minimap : MonoBehaviour
{
    public RectTransform area;
    public Image dotTemplate;
    public RectTransform playerArrow;
    public RectTransform whirlRing;
    public float radius = 24;
    public Color island = new Color(0.85f, 0.77f, 0.55f), chest = new Color(1f, 0.85f, 0.29f), swimmer = new Color(0.62f, 0.88f, 0.48f),
        foe = new Color(1f, 0.31f, 0.31f), boss = new Color(1f, 0.29f, 0.82f), mine = new Color(0.63f, 0.44f, 0.19f);

    readonly List<Image> pool = new List<Image>();
    int used;

    void Start() { dotTemplate.gameObject.SetActive(false); }

    void LateUpdate()
    {
        var gm = GameManager.I;
        var me = gm.player;
        Vector2 c = me.transform.position;
        float sc = area.rect.width / (radius * 2);
        float fog = gm.weather && gm.weather.trait == "fog" ? me.vision : 1e9f;
        used = 0;
        foreach (var o in Island.All) Dot((Vector2)o.transform.position - c, Mathf.Max(3, o.radius * 2 * sc), island, sc);
        foreach (var p in FindObjectsByType<Pickup>(FindObjectsSortMode.None))
        {
            if (p.kind == PickupKind.Chest) Dot((Vector2)p.transform.position - c, 5, chest, sc);
            else if (p.kind == PickupKind.Swimmer) Dot((Vector2)p.transform.position - c, 3, swimmer, sc);
        }
        foreach (var f in gm.foes)
        {
            Vector2 d = (Vector2)f.transform.position - c;
            if (d.magnitude > fog || !f.Targetable) continue;
            bool b = f.boss != BossKind.None;
            Dot(d, b ? 7 : 4, b ? boss : f.ai == FoeAI.Mine ? mine : foe, sc);
        }
        for (int i = used; i < pool.Count; i++) if (pool[i].gameObject.activeSelf) pool[i].gameObject.SetActive(false);
        playerArrow.localRotation = me.transform.rotation;
        bool whirl = gm.weather && gm.weather.trait == "whirl";
        whirlRing.gameObject.SetActive(whirl);
        if (whirl)
        {
            whirlRing.anchoredPosition = ((Vector2)gm.weather.whirl.position - c) * sc;
            whirlRing.sizeDelta = Vector2.one * gm.weather.whirlRange * 2 * sc;
        }
    }

    void Dot(Vector2 d, float size, Color col, float sc)
    {
        Vector2 p = d * sc;
        var half = area.rect.size / 2;
        if (Mathf.Abs(p.x) > half.x + size || Mathf.Abs(p.y) > half.y + size) return;
        if (used == pool.Count) pool.Add(Instantiate(dotTemplate, area));
        var im = pool[used++];
        im.gameObject.SetActive(true);
        im.rectTransform.anchoredPosition = p;
        im.rectTransform.sizeDelta = Vector2.one * size;
        im.color = col;
    }
}
