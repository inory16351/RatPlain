using UnityEngine;

// 파츠 리깅 선원 한 명 (웹 game.js pose · drawRig). 파츠 구조는 MCP 로 만든 원본 프리팹(Rig_*)에 있고,
// 여기서는 자세(숨쉬기 · 걷기 · 호령 · 장전 · 망치질 · 만세 · 움찔)만 계산해 파츠를 돌림
// 웹 캔버스는 y 가 아래라 회전 · dy 부호를 뒤집어 넣음. 파츠 단위 = 리깅 그림 픽셀 / ppu
public class CrewMember : MonoBehaviour
{
    [Header("리깅 파츠 (없으면 비움)")]
    public Transform torso, head, tail, armF, armB, tool;
    [Tooltip("원본 그림 크기 (픽셀)")]
    public float rigW = 400, rigH = 400;
    public float ppu = 100;

    [HideInInspector] public string act = "idle";
    [HideInInspector] public float t, at, dur, fl, ch;

    struct Base { public Vector3 pos, scale; }
    Base bTorso, bHead, bTail, bArmF, bArmB, bTool;
    float sizeK = 1;
    Vector2 jumpVel;
    float jumpT = -1;

    void Awake()
    {
        bTorso = B(torso); bHead = B(head); bTail = B(tail); bArmF = B(armF); bArmB = B(armB); bTool = B(tool);
        t = Random.value * 10;
    }
    static Base B(Transform x) => x ? new Base { pos = x.localPosition, scale = x.localScale } : default;

    // 선원 크기 (유닛). 웹: 그림 긴 변 = size × 1.12
    public void SetSize(float units) { sizeK = units * 1.12f / (Mathf.Max(rigW, rigH) / ppu); }
    public float SizeK => sizeK;

    public void SetAct(string a, float duration) { act = a; at = 0; dur = duration; }

    // 배에서 뛰어내림: 날아가다 물에 빠짐
    public void JumpOff(Vector2 vel, float time, Transform world)
    {
        transform.SetParent(world, true);
        jumpVel = vel; jumpT = time; act = "idle"; fl = 0.35f;
    }

    void Update()
    {
        float dt = Time.deltaTime;
        t += dt; at += dt; fl = Mathf.Max(0, fl - dt); ch = Mathf.Max(0, ch - dt);
        if (jumpT >= 0)
        {
            transform.position += (Vector3)(jumpVel * dt);
            transform.Rotate(0, 0, 400 * dt);
            if ((jumpT -= dt) <= 0) { GameManager.I.Splash(transform.position, false); Destroy(gameObject); return; }
        }
        Pose();
    }

    static float Ease(float q) => q < 0 ? 0 : q > 1 ? 1 : q * q * (3 - 2 * q);

    void Pose()
    {
        float s(float x) => Mathf.Sin(x);
        // 파츠별 { rot, sx, sy, dx, dy } (웹 단위: 라디안 · 그림 픽셀, y 아래)
        float tR = 0, tSx = 1, tSy = 1 + 0.03f * s(t * 4.2f);
        float hR = 0.05f * s(t * 2.3f), hDy = -2 * s(t * 4.2f);
        float taR = 0.28f * s(t * 3.1f);
        float fR = 0.08f * s(t * 2.7f + 1), bR = 0.08f * s(t * 2.7f);
        float toolDx = 0;
        if (act == "walk")
        {
            float w = t * 13; fR += 0.55f * s(w); bR -= 0.55f * s(w); tR = 0.07f * s(w); taR += 0.35f * s(w * 0.5f); hDy -= 4 * Mathf.Abs(s(w));
        }
        else if (act == "order") // 선장 호령: 팔을 쏘는 쪽으로 쳐들고 고개를 내밂
        {
            float e = at < 0.15f ? Ease(at / 0.15f) : 1 - Ease((at - 0.35f) / 0.35f);
            fR -= 1.25f * e; hR -= 0.07f * e; tR = -0.05f * e;
        }
        else if (act == "hammer") // 조선공 망치질
        {
            float c = s(at * 11), hit = Mathf.Max(0, -c);
            fR += -0.9f + 1.0f * c; tR = 0.05f * c; hR += 0.1f * hit; hDy += 3 * hit; taR += 0.2f * c;
        }
        else if (act == "load") // 장전: 꽂을대를 밀고 당김
        {
            bool on = at < dur; float c = on ? s(at * 9) : 0;
            fR += -0.5f + 0.45f * c; bR += -0.4f + 0.45f * c; tR = 0.06f * c; toolDx = 14 * c; hR += 0.08f * c;
            if (!on) { fR = -0.15f; bR = -0.1f; }
        }
        if (ch > 0) { float e = s((1 - ch / 0.9f) * Mathf.PI); fR -= 1.5f * e; bR -= 1.3f * e; hDy -= 10 * e; taR += 0.5f * e; } // 만세
        if (fl > 0) { float e = fl / 0.35f; tSx = 1 + 0.1f * e; tSy *= 1 - 0.12f * e; taR += 0.9f * e; hR += 0.25f * e; fR += 0.5f * e; bR += 0.5f * e; } // 움찔

        Apply(torso, bTorso, tR, tSx, tSy, 0, 0);
        Apply(head, bHead, hR, 1, 1, 0, hDy - (tSy - 1) * 18); // 숨쉴 때 몸통 따라 머리도 오르내림
        Apply(tail, bTail, taR, 1, 1, 0, 0);
        Apply(armF, bArmF, fR, 1, 1, 0, 0);
        Apply(armB, bArmB, bR, 1, 1, 0, 0);
        Apply(tool, bTool, 0, 1, 1, toolDx, 0);
    }

    void Apply(Transform x, Base b, float rot, float sx, float sy, float dx, float dy)
    {
        if (!x) return;
        x.localRotation = Quaternion.Euler(0, 0, -rot * Mathf.Rad2Deg);
        x.localPosition = b.pos + new Vector3(dx, -dy, 0) / ppu;
        x.localScale = new Vector3(b.scale.x * sx, b.scale.y * sy, 1);
    }
}
