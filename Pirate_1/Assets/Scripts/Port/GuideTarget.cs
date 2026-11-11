using System.Collections.Generic;
using UnityEngine;

// 항구 안내(PortGuide)가 가리킬 수 있는 UI (id 로 찾음). 강조 테두리가 이 사각형을 감쌈
public class GuideTarget : MonoBehaviour
{
    [Tooltip("money · settings · save · tab_sea · tab_ship · tab_gear · tab_lab · sea_list · sail")] public string id;
    [Tooltip("테두리 여백 (캔버스 단위)")] public float pad = 8;

    static readonly List<GuideTarget> all = new List<GuideTarget>();
    void OnEnable() { all.Add(this); }
    void OnDisable() { all.Remove(this); }

    public static GuideTarget Find(string id)
    {
        if (string.IsNullOrEmpty(id)) return null;
        foreach (var t in all) if (t && t.id == id && t.isActiveAndEnabled) return t;
        return null;
    }

    // 캔버스(root) 안 좌표 사각형
    public Rect RectIn(RectTransform canvas)
    {
        var c = new Vector3[4];
        ((RectTransform)transform).GetWorldCorners(c);
        Vector2 a = canvas.InverseTransformPoint(c[0]), b = canvas.InverseTransformPoint(c[2]);
        return Rect.MinMaxRect(Mathf.Min(a.x, b.x) - pad, Mathf.Min(a.y, b.y) - pad, Mathf.Max(a.x, b.x) + pad, Mathf.Max(a.y, b.y) + pad);
    }
}
