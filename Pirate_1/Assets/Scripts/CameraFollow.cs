using UnityEngine;

// 카메라: 배를 따라감 (달리는 쪽을 조금 앞서 봄) + 흔들림
public class CameraFollow : MonoBehaviour
{
    static CameraFollow inst;
    public PlayerShip target;
    public float lead = 0.35f, smooth = 6f;
    [Tooltip("흔들림 1 = 웹 픽셀 1")]
    public float shakeScale = 0.01f;

    Vector3 basePos;
    float shake;

    void Awake() { inst = this; basePos = transform.position; }

    public static void Shake(float px)
    {
        if (inst) inst.shake = Mathf.Max(inst.shake, px * inst.shakeScale);
    }

    void LateUpdate()
    {
        if (!target) return;
        Vector3 want = target.transform.position + (Vector3)(target.Vel * lead);
        want.z = transform.position.z;
        basePos = Vector3.Lerp(basePos, want, 1 - Mathf.Exp(-smooth * Time.deltaTime));
        basePos.z = want.z;
        transform.position = basePos + (Vector3)(Random.insideUnitCircle * shake);
        shake *= Mathf.Pow(0.002f, Time.deltaTime);
    }
}
