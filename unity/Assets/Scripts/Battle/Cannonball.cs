using UnityEngine;

// 포탄: 쏜 배 속도를 이어받아 직진, 낮은 포물선(그림자와 공이 벌어짐), 맞으면 피해, 다 날면 물보라
// 생김새는 프리팹(공 그림 자식 · 그림자)에 있음
public class Cannonball : MonoBehaviour
{
    public Transform ballVisual;     // 높이만큼 위로 띄우는 공 그림 (자식)
    public float arcHeight = 0.25f;
    public GameObject splashPrefab;  // 물에 떨어지거나 맞을 때 (프리팹 원본)

    PirateShip owner;
    Vector2 velocity;
    float life, maxLife = 1f, damage;

    public void Launch(PirateShip from, Vector2 vel, float lifeTime, float dmg)
    {
        owner = from;
        velocity = vel;
        life = maxLife = lifeTime;
        damage = dmg;
    }

    void Update()
    {
        transform.position += (Vector3)(velocity * Time.deltaTime);
        life -= Time.deltaTime;
        float q = 1f - life / maxLife;
        if (ballVisual) ballVisual.localPosition = new Vector3(0f, Mathf.Sin(q * Mathf.PI) * arcHeight, 0f);
        if (life <= 0f) Pop();
    }

    void OnTriggerEnter2D(Collider2D other)
    {
        var ship = other.GetComponentInParent<PirateShip>();
        if (!ship || ship == owner || ship.Dead || (owner && ship.team == owner.team)) return;
        ship.Hurt(damage);
        Pop();
    }

    void Pop()
    {
        if (splashPrefab) Instantiate(splashPrefab, transform.position, Quaternion.identity);
        Destroy(gameObject);
    }
}
