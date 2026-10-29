using UnityEngine;

// 카메라: 진행 방향을 조금 앞서 보여 주며 부드럽게 따라감 + 흔들림
public class CameraFollow : MonoBehaviour
{
    public PirateShip target;
    public float lead = 1.3f;     // 진행 방향으로 앞서 보는 거리
    public float smooth = 4.8f;
    float shake;

    public void Shake(float amount) => shake = Mathf.Max(shake, amount);

    void LateUpdate()
    {
        if (!target) return;
        Vector3 want = (Vector2)target.transform.position + target.Forward * lead;
        want.z = transform.position.z;
        Vector3 p = Vector3.Lerp(transform.position, want, 1f - Mathf.Exp(-smooth * Time.deltaTime));
        transform.position = p + (Vector3)(Random.insideUnitCircle * shake);
        shake *= Mathf.Pow(0.003f, Time.deltaTime);
    }
}
