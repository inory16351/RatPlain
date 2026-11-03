using UnityEngine;

// 피해 숫자 · 알림 글자: 떠오르며 사라짐
public class FloatText : MonoBehaviour
{
    public TextMesh text;
    public float life = 0.8f, rise = 0.5f, bigScale = 1.4f;

    Color col;
    float t;

    public void Setup(string s, Color c, bool big)
    {
        text.text = s; col = c; text.color = c;
        if (big) { transform.localScale *= bigScale; life *= 1.4f; }
    }

    void Update()
    {
        t += Time.deltaTime;
        transform.position += Vector3.up * rise * Time.deltaTime;
        text.color = new Color(col.r, col.g, col.b, 1 - Mathf.Clamp01((t - life * 0.5f) / (life * 0.5f)));
        if (t >= life) Destroy(gameObject);
    }
}
