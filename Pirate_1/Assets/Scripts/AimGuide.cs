using System.Collections.Generic;
using UnityEngine;

// 조준선 (웹 draw 의 조준선): broadside 와 같은 계산(대포 자리 · 배 속도 · 회전 선속도 · 폭풍 바람)으로
// 대포 한 문마다 실제 날아갈 길을 점선으로, 끝 = 떨어질 곳. 장전되면 금빛, 장전 중이면 흐린 빨강
// 점 그림은 원본 점(dotTemplate)을 복제해 씀
public class AimGuide : MonoBehaviour
{
    public PlayerShip ship;
    public SpriteRenderer dotTemplate;
    public int points = 12, maxGuns = 8;
    public float dotSize = 0.05f, endSize = 0.11f;
    public Color ready = new Color(1f, 0.86f, 0.4f, 0.8f), loading = new Color(1f, 0.43f, 0.35f, 0.35f);

    readonly List<SpriteRenderer> dots = new List<SpriteRenderer>();

    void Start()
    {
        dotTemplate.gameObject.SetActive(false);
        for (int i = 0; i < maxGuns * points; i++) dots.Add(Instantiate(dotTemplate, transform));
    }

    void LateUpdate()
    {
        var gm = GameManager.I;
        int used = 0;
        if (!gm.Over && !gm.Paused)
        {
            var me = ship.transform;
            int side = ship.SideToward(ship.MouseWorld());
            var col = ship.Cooldown(side) <= 0 ? ready : loading;
            Vector2 f = me.right, n = side > 0 ? -(Vector2)me.up : (Vector2)me.up;
            Vector2 acc = gm.weather ? gm.weather.wind * 0.8f : Vector2.zero;
            float life = 0.75f * ship.range;
            int guns = Mathf.Min(ship.guns, maxGuns);
            // 점선이 흐르듯: 점 위치를 시간에 따라 조금씩 밂
            float flow = Mathf.Repeat(Time.time * 1.5f, 1f);
            for (int i = 0; i < guns; i++)
            {
                float along = (guns == 1 ? 0 : (i / (guns - 1f) - 0.5f)) * ship.len * 0.6f;
                Vector2 o = f * along + n * ship.len * 0.15f, p0 = (Vector2)me.position + o;
                Vector2 v = n * ship.ballSpeed + ship.Vel + new Vector2(-ship.av * o.y, ship.av * o.x);
                for (int k = 1; k <= points; k++)
                {
                    bool end = k == points;
                    float t = life * (end ? 1 : (k - 1 + flow) / points);
                    var d = dots[used++];
                    d.gameObject.SetActive(true);
                    d.transform.position = p0 + v * t + 0.5f * acc * t * t;
                    d.transform.localScale = Vector3.one * (end ? endSize : dotSize);
                    d.color = col;
                }
            }
        }
        for (int i = used; i < dots.Count; i++) if (dots[i].gameObject.activeSelf) dots[i].gameObject.SetActive(false);
    }
}
