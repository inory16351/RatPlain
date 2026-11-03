using UnityEngine;
using UnityEngine.InputSystem;

// 플레이어 조작 (웹 데모 그대로): W/S = 돛 올리기 · 내리기, A/D = 키, 왼쪽 클릭 = 마우스 쪽 뱃전, Q/E = 왼쪽/오른쪽, Space = 양쪽
[RequireComponent(typeof(PirateShip))]
public class PlayerShipControl : MonoBehaviour
{
    [Range(-0.3f, 1f)] public float sail = 0.4f;
    PirateShip ship;
    Camera cam;
    Vector2 push; // 쏠 때 옆으로 밀리는 반동

    void Awake()
    {
        ship = GetComponent<PirateShip>();
        cam = Camera.main;
    }

    void Update()
    {
        if (ship.Dead) return;
        var kb = Keyboard.current;
        var mouse = Mouse.current;
        float dt = Time.deltaTime;
        if (kb != null)
        {
            if (kb.wKey.isPressed) sail = Mathf.Min(1f, sail + dt * 1.4f);
            if (kb.sKey.isPressed) sail = Mathf.Max(-0.3f, sail - dt * 1.4f);
        }
        // 키: 빠를수록 크게 돎, 각속도에 관성 (A = 왼쪽 = 반시계)
        float turn = kb == null ? 0f : (kb.aKey.isPressed ? 1f : 0f) - (kb.dKey.isPressed ? 1f : 0f);
        float tr = ship.turnRate * (1.15f - Mathf.Min(0.5f, Mathf.Abs(ship.speed) / 5f));
        ship.angularSpeed += (turn * tr - ship.angularSpeed) * Mathf.Min(1f, dt * 6f);
        transform.Rotate(0f, 0f, ship.angularSpeed * Mathf.Rad2Deg * dt);
        ship.speed += (ship.maxSpeed * sail - ship.speed) * Mathf.Min(1f, dt * 1.3f);
        transform.position += (Vector3)(ship.Velocity * dt + push * dt);
        push *= Mathf.Pow(0.02f, dt);

        if (mouse != null && mouse.leftButton.isPressed) Fire(SideTowardMouse());
        if (kb != null)
        {
            if (kb.qKey.isPressed) Fire(-1);
            if (kb.eKey.isPressed) Fire(1);
            if (kb.spaceKey.wasPressedThisFrame) { Fire(1); Fire(-1); }
        }
    }

    public int SideTowardMouse()
    {
        if (!cam || Mouse.current == null) return 1;
        Vector2 m = cam.ScreenToWorldPoint(Mouse.current.position.ReadValue());
        Vector2 to = m - (Vector2)transform.position;
        return Vector2.SignedAngle(ship.Forward, to) < 0f ? 1 : -1; // 시계 방향 = 오른쪽 뱃전
    }

    void Fire(int side)
    {
        if (!ship.Broadside(side)) return;
        push -= PirateShip.SideNormal(ship.Forward, side) * (0.4f + ship.guns * 0.15f);
        ship.angularSpeed += side * 0.04f * ship.guns; // 한쪽만 쏘면 살짝 돌아감
        var follow = cam ? cam.GetComponent<CameraFollow>() : null;
        if (follow) follow.Shake(0.05f + ship.guns * 0.02f);
    }
}
