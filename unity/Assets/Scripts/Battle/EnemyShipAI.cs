using UnityEngine;

// 적 배 (웹 데모 shipAI): 멀면 다가오고, 가까우면 옆으로 돌아 뱃전을 겨눠 일제 사격
[RequireComponent(typeof(PirateShip))]
public class EnemyShipAI : MonoBehaviour
{
    public PirateShip target;   // 비우면 Player 편 배를 찾음
    PirateShip ship;

    void Awake() => ship = GetComponent<PirateShip>();

    void Update()
    {
        if (ship.Dead) return;
        if (!target || target.Dead) { target = FindTarget(); if (!target) return; }
        float dt = Time.deltaTime;
        Vector2 to = target.transform.position - transform.position;
        float dist = to.magnitude;
        float want = 2.4f + ship.length * 0.8f;
        float rel = Vector2.SignedAngle(ship.Forward, to) * Mathf.Deg2Rad; // + = 왼쪽(반시계)
        float side = Mathf.Sign(rel);
        float toAngle = Mathf.Atan2(to.y, to.x);
        if (dist > want + 1.2f) Steer(toAngle, 1f, dt);
        else Steer(toAngle - side * Mathf.PI / 2f * (dist < want - 0.6f ? 1.3f : 1f), 0.6f, dt);
        // 뱃전이 표적을 향하면 쏨 (오른쪽 뱃전 = 시계 방향 = rel < 0)
        bool aligned = Mathf.Abs(Mathf.Abs(rel) - Mathf.PI / 2f) < 0.4f;
        if (aligned && dist < 4.6f + ship.length * 0.3f) ship.Broadside(rel < 0f ? 1 : -1);
        transform.position += (Vector3)(ship.Velocity * dt);
    }

    void Steer(float wantAngle, float speedFrac, float dt)
    {
        float d = Mathf.DeltaAngle(transform.eulerAngles.z, wantAngle * Mathf.Rad2Deg) * Mathf.Deg2Rad;
        float step = Mathf.Sign(d) * Mathf.Min(Mathf.Abs(d), ship.turnRate * dt);
        ship.angularSpeed = step / Mathf.Max(dt, 1e-4f);
        transform.Rotate(0f, 0f, step * Mathf.Rad2Deg);
        ship.speed += (ship.maxSpeed * speedFrac - ship.speed) * Mathf.Min(1f, dt * 1.5f);
    }

    static PirateShip FindTarget()
    {
        foreach (var s in FindObjectsByType<PirateShip>(FindObjectsSortMode.None))
            if (s.team == PirateShip.Team.Player && !s.Dead) return s;
        return null;
    }
}
