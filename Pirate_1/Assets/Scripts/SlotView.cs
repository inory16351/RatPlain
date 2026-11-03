using UnityEngine;
using UnityEngine.UI;

// 아이템 슬롯 1칸 그림 (기획서 8쪽): 아이콘 + F 키, 비어 있으면 회색 · 사용 중 남은 시간 게이지 · 교체 때 버려진 아이콘이 떠올랐다 사라짐
public class SlotView : MonoBehaviour
{
    public Image icon, frame;
    public Text label;
    [Tooltip("키 표시 (F)")]
    public Text key;
    [Tooltip("사용 중 남은 시간 · 횟수 게이지 (피벗 왼쪽, 가로 크기로 줄임)")]
    public RectTransform gauge;
    [Tooltip("교체로 버려진 아이템 아이콘 (위로 떠오르며 흐려짐)")]
    public Image dropped;
    public Color empty = new Color(0.1f, 0.13f, 0.18f, 0.75f), full = new Color(1f, 0.82f, 0.3f, 0.95f);

    Vector2 dropHome;
    void Awake() { if (dropped) dropHome = dropped.rectTransform.anchoredPosition; }

    void Update()
    {
        var p = GameManager.I.player;
        var items = p.items;
        var s = items.HeldItem;
        icon.enabled = s != null;
        if (s != null) { icon.sprite = s.icon; icon.color = s.tint; }
        label.text = s != null ? s.name : "빈 칸";
        label.color = s != null ? Color.white : new Color(0.7f, 0.74f, 0.8f);
        if (key) key.color = s != null ? Color.white : new Color(0.6f, 0.6f, 0.6f);
        frame.color = s != null ? full : empty;
        transform.localScale = Vector3.one * (s != null ? 1f + 0.04f * Mathf.Sin(Time.unscaledTime * 5) : 1f);
        if (gauge)
        {
            float q = items.Active >= 0 ? Mathf.Clamp01(p.BuffFrac(items.slots[items.Active].id)) : 0;
            if (gauge.gameObject.activeSelf != q > 0) gauge.gameObject.SetActive(q > 0);
            gauge.localScale = new Vector3(q, 1, 1);
        }
        if (dropped)
        {
            bool on = items.dropT > 0 && items.Dropped >= 0;
            dropped.enabled = on;
            if (on)
            {
                float t = 1 - items.dropT / 0.9f;
                var d = items.slots[items.Dropped];
                dropped.sprite = d.icon;
                dropped.color = new Color(d.tint.r, d.tint.g, d.tint.b, 1 - t);
                dropped.rectTransform.anchoredPosition = dropHome + new Vector2(0, 60 * t);
            }
        }
    }
}
