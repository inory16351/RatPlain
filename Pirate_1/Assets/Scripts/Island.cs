using System.Collections.Generic;
using UnityEngine;

// 섬: 배 · 포탄이 부딪히는 원 (반지름 유닛). 하이라키에 놓아두면 알아서 목록에 들어감
public class Island : MonoBehaviour
{
    public static readonly List<Island> All = new List<Island>();
    public float radius = 1.2f;
    [Header("그림 (끝없는 바다에서 복제해 쓸 때 크기 · 모양을 맞춤)")]
    public SpriteRenderer art;
    [Tooltip("얕은 물 (반지름 + 0.4)")]
    public Transform shallow;
    [Tooltip("돌아가는 물결 점선 고리")]
    public Transform ring;
    float seed;

    // 웹: 섬 그림 긴 변 = 반지름 × 2.7, 얕은 물 = 반지름 + 40px, 물결 고리 = 반지름 × 1.32
    public void Setup(float r, Sprite sprite, float rot)
    {
        radius = r; seed = rot;
        if (art) { art.sprite = sprite; art.transform.localScale = Vector3.one * r * 2.7f / Mathf.Max(sprite.bounds.size.x, sprite.bounds.size.y); art.transform.localRotation = Quaternion.Euler(0, 0, rot * Mathf.Rad2Deg); }
        if (shallow) shallow.localScale = Vector3.one * (r + 0.4f) * 2;
        if (ring) ring.localScale = Vector3.one * r * 1.32f * 2;
    }

    void Update()
    {
        if (!ring) return;
        ring.Rotate(0, 0, -12 * Time.deltaTime);
        ring.localScale = Vector3.one * (radius * 1.32f + Mathf.Sin(Time.time * 2 + seed) * 0.03f) * 2;
    }

    void OnEnable() { All.Add(this); }
    void OnDisable() { All.Remove(this); }

    void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, radius);
    }
}
