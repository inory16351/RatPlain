using UnityEngine;

public enum FoeAI { Ship, Speeder, Mortar, Mine, Shark }
public enum BossKind { None, Rival, Shark, Admiral, King, Fortress }

// 적 배 (웹 game.js FOES 한 줄 + foeAI · shipAI · bossPattern · bossShark). 수치는 프리팹 인스펙터에서
// 상어: 잠수(지느러미만, 포탄은 위로 지나감) → 떠올라 돌진 · 물기 → 지쳐서 멈춤(피해 1.5배) → 다시 잠수. 폭격은 잠수 중에도 맞음
// 보스: 회색꼬리 = 폭격 3발 / 거대 상어 = 예고선 돌진 · 상어 소환 / 제독 = 폭격 세례 · 쾌속정 / 해적왕 = 원형 탄 · 라이벌 / 해상 요새 = 포탑 4곳 · 폭격 비 · 나선 탄
public class EnemyShip : MonoBehaviour
{
    [Header("종류")]
    public string kind = "sloop";
    public string displayName = "고양이 순찰선";
    // 화면에 보이는 이름 (스트링 테이블 foe.<kind>, 없으면 displayName)
    public string Name => Loc.T("foe." + kind, displayName);
    public FoeAI ai = FoeAI.Ship;
    public BossKind boss = BossKind.None;
    [Tooltip("보스 강화판 (제독 Mk2 · 해적왕 재도전)")]
    public bool mk2;
    [Tooltip("분노한 거대 상어: 지친 동안 원형 탄")]
    public bool rage;

    [Header("수치 (유닛 = 픽셀/100)")]
    public float hp = 60;
    public float len = 1.37f, speed = 1.05f, turn = 1.2f;
    public int guns = 2;
    [Tooltip("포탄 · 물기 피해")]
    public float reload = 2.6f, dmg = 9;
    [Tooltip("쾌속정 박치기 · 폭탄통 폭발 피해")]
    public float ram = 22;
    public float armor = 1;
    [Tooltip("선수포 간격 (0 = 없음)")]
    public float bowGun;
    [Range(0, 1)] public float fireChance;
    public int gold = 15, plank = 4;
    [Range(0, 1)] public float itemDropChance = 0.25f;

    [Header("연결")]
    public SpriteRenderer body;
    [Tooltip("상어: 잠수 중에 보이는 지느러미")]
    public SpriteRenderer fin;
    [Tooltip("거대 상어: 돌진 예고선")]
    public SpriteRenderer aimLine;
    [Tooltip("갑판 선원 (없으면 비움)")]
    public ShipCrew crewView;
    [Tooltip("머리 위 체력 막대 (보스는 화면 위 막대를 씀) — Fill 은 피벗이 왼쪽")]
    public Transform hpBar, hpFill;
    public SpriteRenderer hpFillRenderer;
    [Tooltip("체인샷에 돛이 찢겨 느려진 동안 보이는 점선 고리")]
    public SpriteRenderer slowRing;

    bool sinking;
    float sinkT, fxT;

    [HideInInspector] public float maxHp, v;
    readonly float[] cd = new float[6];
    float burn, bob, ramCd, pt, aimA, turret;
    [HideInInspector] public float hitT, slow, stuck;
    bool dead, exploded, dive, bit;
    int charges;
    enum Phase { Dive, Lunge, Tired, Aim, Charge, Surface }
    Phase phase = Phase.Dive;

    public void Init(float hpK)
    {
        hp *= hpK; maxHp = hp;
        cd[0] = Random.Range(0f, 2f); cd[1] = Random.Range(0f, 2f); cd[2] = 2; cd[3] = 3; cd[4] = 4; cd[5] = 5;
        bob = Random.value * 7;
        dive = ai == FoeAI.Shark;
        pt = 3;
    }

    // 잠수 중인 상어 · 떠오르지 않은 거대 상어는 포탄이 안 맞음 (폭격만)
    public bool Targetable => !(ai == FoeAI.Shark && (boss == BossKind.Shark ? phase != Phase.Surface : dive));

    public bool Hurt(float d, ShotKind k)
    {
        if (dead) return false;
        if (!Targetable && k != ShotKind.Shell && k != ShotKind.Torp) return false; // 폭격 · 어뢰는 물속까지
        var gm = GameManager.I;
        bool crit = Random.value < gm.player.crit;
        if (crit) d *= 2;
        if (armor < 1 && k != ShotKind.Shell && k != ShotKind.Torp && k != ShotKind.Missile) d *= armor;
        if (ai == FoeAI.Shark && (phase == Phase.Surface || phase == Phase.Tired)) d *= 1.5f; // 지친 상어 = 약점
        hp -= d; hitT = 0.22f;
        if (crewView) crewView.Hit();
        gm.AddCombo();
        gm.Text(transform.position, crit ? Loc.F("float.crit", Mathf.RoundToInt(d)) : "-" + Mathf.RoundToInt(d), crit ? new Color(1f, 0.7f, 0.28f) : new Color(1f, 0.89f, 0.48f), crit);
        if (crit) { CameraFollow.Shake(12); Sfx.Play("crit"); gm.HitStop(0.06f); }
        bool ball = k == ShotKind.Ball;
        var me = gm.player;
        if (k == ShotKind.Chain || (ball && Random.value < me.chainAll))
        {
            slow = 4; gm.Text((Vector2)transform.position + Vector2.up * 0.15f, Loc.T("float.sail_torn"), new Color(0.81f, 0.84f, 0.88f));
            // 크라켄: 주변 적도 묶음
            if (me.kraken > 0) foreach (var o in gm.foes) if (o != this && Vector2.Distance(o.transform.position, transform.position) < 1.8f) { o.slow = Mathf.Max(o.slow, me.kraken); o.stuck = me.kraken; }
        }
        if (k == ShotKind.Fire || (ball && Random.value < me.burnAll)) burn = 5;
        // 작렬 포탄: 맞은 곳에서 폭발, 주변 적 절반 피해
        float splash = me.SplashNow;
        if (splash > 0 && (ball || k == ShotKind.Chain || k == ShotKind.Fire))
        {
            gm.Blast(transform.position, splash);
            foreach (var o in gm.foes) if (o != this && o.Targetable && Vector2.Distance(o.transform.position, transform.position) < splash + o.len * 0.3f) { o.hp -= d * 0.5f; o.hitT = 0.15f; }
        }
        return true;
    }

    // 침몰: 목록에서 빠진 뒤 2 초 동안 기울며 작아지고 흐려짐 (웹 sinkShip)
    public void BeginSink()
    {
        sinking = true; sinkT = 0;
        if (hpBar) hpBar.gameObject.SetActive(false);
        if (slowRing) slowRing.enabled = false;
        if (fin) fin.enabled = false;
        if (aimLine) aimLine.enabled = false;
        if (body) body.enabled = true;
    }

    void Update()
    {
        if (sinking)
        {
            float q = (sinkT += Time.deltaTime) / 2f;
            if (body) body.color = new Color(1, 1, 1, ai == FoeAI.Shark ? 1 - q : 1 - q * 0.9f);
            if (ai != FoeAI.Shark) { transform.localScale = Vector3.one * (1 - q * 0.35f); transform.Rotate(0, 0, -0.5f * Mathf.Rad2Deg * Time.deltaTime / 2f); }
            if (q >= 1) Destroy(gameObject);
            return;
        }
        if (dead) return;
        var gm = GameManager.I;
        var me = gm.player;
        float dt = Time.deltaTime;
        Vector2 pos = transform.position, to = (Vector2)me.transform.position - pos;
        float d = to.magnitude;
        for (int i = 0; i < cd.Length; i++) cd[i] -= dt;
        hitT = Mathf.Max(0, hitT - dt); slow = Mathf.Max(0, slow - dt); stuck = Mathf.Max(0, stuck - dt); bob += dt; ramCd -= dt;
        if (burn > 0)
        {
            burn -= dt; hp -= 7 * dt * (1 + (gm.hpMult - 1) * 0.5f);
            if (Random.value < dt * 18) gm.Flame((Vector2)transform.position + (Vector2)transform.right * Random.Range(-0.25f, 0.25f) * len + Random.insideUnitCircle * len * 0.1f);
        }

        switch (ai)
        {
            case FoeAI.Mine:
                transform.position = pos + new Vector2(Mathf.Cos(bob * 0.3f), Mathf.Sin(bob * 0.4f)) * 0.08f * dt;
                if (d < len + me.len * 0.3f && !gm.Over) { me.Hurt(ram, pos); hp = 0; exploded = true; }
                break;
            case FoeAI.Speeder:
                Steer(me.transform.position, dt);
                if (d < len * 0.5f + me.len * 0.3f && !gm.Over) { if (me.ram > 0) Hurt(me.ram, ShotKind.Ram); else me.Hurt(ram, pos); hp = 0; exploded = true; }
                break;
            case FoeAI.Mortar:
                if (d > 7.2f) Steer(me.transform.position, dt);
                else if (d < 4.8f) Steer(pos - to, dt);
                else Steer(me.transform.position, dt, 0.3f, Mathf.PI / 2);
                if (d < 8.2f * gm.foeRangeMul && cd[0] <= 0 && !gm.Over) { cd[0] = reload; Sfx.Boom(1, 0.6f); gm.Lob((Vector2)me.transform.position + me.Vel * 0.9f, dmg, 0.7f, 1.3f, true, transform.position); }
                break;
            case FoeAI.Shark:
                if (boss == BossKind.Shark) BossShark(dt, d); else Shark(dt, d);
                break;
            default:
                ShipAI(dt, d, to);
                break;
        }
        if (boss != BossKind.None && boss != BossKind.Shark && !gm.Over) BossPattern(dt);

        if (ai != FoeAI.Mine)
        {
            transform.position = (Vector2)transform.position + (Vector2)transform.right * v * dt;
            if (boss != BossKind.Shark) gm.CollideIslands(transform, len * 0.3f, ref v);
            if (ai != FoeAI.Speeder && ai != FoeAI.Shark)
            {
                // 서로 밀어냄
                Vector2 dd = (Vector2)me.transform.position - (Vector2)transform.position;
                float m = (len + me.len) * 0.28f, dl = dd.magnitude;
                if (dl < m && dl > 0.001f)
                {
                    Vector2 push = dd / dl * (m - dl) / 2;
                    transform.position = (Vector2)transform.position - push;
                    me.transform.position = (Vector2)me.transform.position + push;
                    // 박치기: 내 배에 충각 장비가 있고 달리는 중이면 적만 다침
                    if (me.ram > 0 && ramCd <= 0 && Mathf.Abs(me.v) > 0.6f) { ramCd = 0.8f; Hurt(me.ram, ShotKind.Ram); Sfx.Play("hit"); gm.Text((Vector2)transform.position + Vector2.up * 0.2f, Loc.T("float.ram"), new Color(1f, 0.7f, 0.28f)); CameraFollow.Shake(8); }
                }
            }
        }

        // 물결 · 부서진 배 연기
        if (ai != FoeAI.Mine && Targetable) gm.Wake(transform, len, v);
        if (ai != FoeAI.Shark && ai != FoeAI.Mine && hp < maxHp * 0.5f && (fxT -= dt) <= 0) { fxT = 0.12f; gm.Smoke((Vector2)transform.position + Random.insideUnitCircle * len * 0.15f, 0.6f); }

        // 그림: 잠수 중이면 지느러미만, 예고선은 조준 때만
        bool under = !Targetable;
        if (body)
        {
            body.enabled = !under || boss == BossKind.Shark && phase == Phase.Aim;
            var c = hitT > 0 ? new Color(1f, 0.55f, 0.55f) : burn > 0 ? new Color(1f, 0.75f, 0.55f) : Color.white;
            if (under) c.a = 0.35f;
            body.color = c;
        }
        if (fin) fin.enabled = under;
        if (aimLine) aimLine.enabled = boss == BossKind.Shark && phase == Phase.Aim;
        if (hp <= 0) { dead = true; gm.Sink(this, exploded); }
    }

// 머리 위 체력 막대 · 묶임 고리: 배가 돌아도 화면 기준으로 서 있음
    void LateUpdate()
    {
        if (sinking || dead) return;
        if (hpBar)
        {
            bool show = boss == BossKind.None && ai != FoeAI.Mine && hp < maxHp && Targetable;
            if (hpBar.gameObject.activeSelf != show) hpBar.gameObject.SetActive(show);
            if (show)
            {
                hpBar.position = transform.position + Vector3.up * (len * 0.3f + 0.18f);
                hpBar.rotation = Quaternion.identity;
                hpFill.localScale = new Vector3(Mathf.Clamp01(hp / maxHp), 1, 1);
                if (hpFillRenderer) hpFillRenderer.color = burn > 0 ? new Color(1f, 0.54f, 0.16f) : new Color(0.91f, 0.27f, 0.24f);
            }
        }
        if (slowRing) { slowRing.enabled = slow > 0 && Targetable; slowRing.transform.Rotate(0, 0, 60 * Time.deltaTime); }
    }


    float Angle => transform.eulerAngles.z * Mathf.Deg2Rad;
    float AngleTo(Vector2 p) { Vector2 t = p - (Vector2)transform.position; return Mathf.Atan2(t.y, t.x); }
    void Face(float a) { transform.rotation = Quaternion.Euler(0, 0, a * Mathf.Rad2Deg); }
    void TurnToward(float a, float k) { Face(Angle + Mathf.DeltaAngle(Angle * Mathf.Rad2Deg, a * Mathf.Rad2Deg) * Mathf.Deg2Rad * Mathf.Min(1, k)); }

    // 웹 shipAI: 멀면 다가오고, 가까우면 옆으로 돌아 뱃전을 들이댐 → 정렬되면 일제 사격. 선수포가 있으면 앞쪽으로도 쏨
    void ShipAI(float dt, float d, Vector2 to)
    {
        var gm = GameManager.I;
        var me = gm.player;
        float want = 2.4f + len * 0.8f;
        float rel = Mathf.DeltaAngle(Angle * Mathf.Rad2Deg, Mathf.Atan2(to.y, to.x) * Mathf.Rad2Deg) * Mathf.Deg2Rad;
        float side = Mathf.Sign(rel);
        if (d > want + 1.2f) Steer(me.transform.position, dt);
        else Steer(me.transform.position, dt, 0.6f, -side * Mathf.PI / 2 * (d < want - 0.6f ? 1.3f : 1));
        bool aligned = Mathf.Abs(Mathf.Abs(rel) - Mathf.PI / 2) < 0.4f;
        int s = rel > 0 ? -1 : 1; // 플레이어가 왼쪽(반시계)이면 좌현
        int ci = s > 0 ? 1 : 0;
        if (aligned && d < (4.6f + len * 0.3f) * gm.foeRangeMul && cd[ci] <= 0 && !gm.Over)
        {
            cd[ci] = reload * Random.Range(0.8f, 1.2f);
            var k = fireChance > 0 && Random.value < fireChance ? ShotKind.Fire : ShotKind.Ball;
            gm.Broadside(transform, (Vector2)transform.right * v, 0, len, s, guns, dmg, 4.3f, (1.05f + len * 0.1f) * gm.foeRangeMul, true, k);
            if (crewView) crewView.OnFire(s, guns, reload);
            Sfx.Boom(1, Mathf.Min(0.8f, d / 9f));
        }
        if (bowGun > 0 && cd[2] <= 0 && Mathf.Abs(rel) < 0.6f && d < 5.6f * gm.foeRangeMul && !gm.Over)
        {
            cd[2] = bowGun;
            Vector2 bow = (Vector2)transform.position + (Vector2)transform.right * len * 0.45f;
            float wob = (Random.value - 0.5f) * gm.FoeSpreadNow; // 선수포도 조금 빗나감
            Vector2 dir = to.normalized; dir = new Vector2(dir.x - dir.y * wob, dir.y + dir.x * wob).normalized;
            gm.Shot(bow, dir * 4.8f, 1.2f * gm.foeRangeMul, dmg, true, ShotKind.Ball);
            Sfx.Boom(1, 0.6f);
            gm.Smoke(bow, 0.5f);
        }
    }

    // 상어: 잠수(지느러미만) → 가까우면 떠올라 돌진(물기) → 지쳐서 멈춤 = 공격할 때 → 다시 잠수
    void Shark(float dt, float d)
    {
        var gm = GameManager.I;
        var me = gm.player;
        if (dive)
        {
            Steer(me.transform.position, dt, 1, d > 2.6f ? 0 : 0.9f);
            if (d < 2.3f && cd[0] <= 0) { dive = false; phase = Phase.Lunge; pt = 0.6f; bit = false; Face(AngleTo(me.transform.position)); gm.Splash(transform.position, false); }
        }
        else if (phase == Phase.Lunge)
        {
            v = speed * 2.6f;
            TurnToward(AngleTo(me.transform.position), dt * 1.5f);
            if (!bit && d < len * 0.4f + me.len * 0.3f && !gm.Over) { bit = true; me.Hurt(dmg, transform.position); Sfx.Play("bite"); gm.Splash(me.transform.position, false); }
            if ((pt -= dt) <= 0) { phase = Phase.Tired; pt = 2.6f; gm.Text((Vector2)transform.position + Vector2.up * 0.26f, Loc.T("float.pant"), new Color(0.62f, 0.88f, 1f)); }
        }
        else
        {
            v *= Mathf.Pow(0.02f, dt);
            Face(Angle + Mathf.Sin(Time.time * 3 + bob) * 0.4f * dt);
            if ((pt -= dt) <= 0) { dive = true; phase = Phase.Dive; cd[0] = 2.5f; gm.Splash(transform.position, false); }
        }
    }

    // 거대 상어: 잠수(무적) → 예고선 → 돌진 · 물기 → (두 번에 한 번 상어 소환) → 떠올라 약점
    void BossShark(float dt, float d)
    {
        var gm = GameManager.I;
        var me = gm.player;
        pt -= dt;
        switch (phase)
        {
            case Phase.Dive:
                Steer(me.transform.position, dt, 0.8f, d > 3.8f ? 0 : 1.3f);
                if (pt <= 0) { phase = Phase.Aim; pt = rage ? 0.8f : 1.1f; aimA = AngleTo(me.transform.position); v *= 0.3f; CameraFollow.Shake(6); Sfx.Play("roar"); }
                break;
            case Phase.Aim:
                v *= Mathf.Pow(0.002f, dt);
                TurnToward(aimA, dt * 8);
                if (pt <= 0) { phase = Phase.Charge; pt = 1.1f; Face(aimA); bit = false; }
                break;
            case Phase.Charge:
                v = speed * 3.4f;
                if (!bit && d < len * 0.35f + me.len * 0.3f && !gm.Over) { bit = true; me.Hurt(dmg, transform.position); CameraFollow.Shake(16); Sfx.Play("bite"); }
                if (pt <= 0)
                {
                    if (++charges % 2 == 0 && gm.foes.Count < 8)
                        for (int i = 0; i < (rage ? 3 : 2); i++) gm.Spawn("shark", (Vector2)transform.position + Random.insideUnitCircle * 1.2f);
                    phase = Phase.Surface; pt = rage ? 3 : 4;
                    gm.Splash(transform.position, true);
                    gm.Text((Vector2)transform.position + Vector2.up * 0.4f, Loc.T("float.tired"), new Color(1f, 0.85f, 0.29f), true);
                }
                break;
            case Phase.Surface:
                v *= Mathf.Pow(0.02f, dt);
                if (rage && cd[3] <= 0 && !gm.Over) { cd[3] = 1.2f; gm.Ring(transform.position, 10, 2.6f, dmg * 0.5f, Time.time); }
                if (pt <= 0) { phase = Phase.Dive; pt = Random.Range(2.5f, 3.5f); gm.Splash(transform.position, true); }
                break;
        }
    }

    // 보스 패턴 (웹 bossPattern)
    void BossPattern(float dt)
    {
        var gm = GameManager.I;
        var me = gm.player;
        Vector2 mp = me.transform.position, p = transform.position;
        bool half = hp < maxHp * 0.5f, few = gm.foes.Count < 7;
        switch (boss)
        {
            case BossKind.Rival:
                if (cd[3] <= 0) { cd[3] = 7; Sfx.Boom(1, 0.6f); for (int i = 0; i < 3; i++) gm.Lob(mp + Random.insideUnitCircle * 1.2f + me.Vel * 0.8f, dmg * 1.4f, 0.75f, 1.4f + i * 0.2f, true, transform.position); }
                break;
            case BossKind.Admiral:
                if (cd[3] <= 0)
                {
                    cd[3] = mk2 ? 5 : 6;
                    gm.Message(Loc.T("msg.barrage"), "", 1); Sfx.Play("whistle");
                    for (int i = 0; i < (mk2 ? 7 : 5); i++) gm.Lob(mp + Random.insideUnitCircle * 2.6f, dmg * 1.3f, 0.75f, Random.Range(1.1f, 1.8f), true, transform.position);
                }
                if (cd[4] <= 0 && few)
                {
                    cd[4] = 10;
                    Vector2 f = transform.right * len * 0.4f;
                    gm.Spawn("speeder", p - f); gm.Spawn("speeder", p + f); Sfx.Play("meow");
                    if (mk2 && gm.foes.Count < 6) gm.Spawn("ironclad", gm.FreeSpot(7f, 10f));
                }
                break;
            case BossKind.King:
                if (cd[3] <= 0) { cd[3] = mk2 ? 4 : 5; gm.Ring(p, mk2 ? 20 : 16, 3f, dmg, Time.time, mk2 ? ShotKind.Fire : ShotKind.Ball); CameraFollow.Shake(6); Sfx.Boom(4, 0.2f); }
                if (cd[4] <= 0 && few) { cd[4] = 12; gm.Spawn("rival", gm.FreeSpot(7f, 10f)); }
                break;
            case BossKind.Fortress:
                speed = half ? 0.6f : 0.34f;
                if ((turret -= dt) <= 0)
                {
                    turret = half ? 1.0f : 1.6f;
                    Sfx.Boom(2, 0.4f);
                    // 포탑 4곳 (배 길이 비율)
                    foreach (var o in new[] { new Vector2(0.3f, -0.14f), new Vector2(0.3f, 0.14f), new Vector2(-0.2f, -0.14f), new Vector2(-0.2f, 0.14f) })
                    {
                        Vector2 at = transform.TransformPoint(o * len);
                        float a = Mathf.Atan2(mp.y - at.y, mp.x - at.x) + Random.Range(-0.08f, 0.08f);
                        gm.Shot(at, new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * 4.7f, 1.5f, dmg, true, ShotKind.Ball);
                        gm.Smoke(at, 0.5f);
                    }
                }
                if (cd[3] <= 0) { cd[3] = 7; gm.Message(Loc.T("msg.shell_rain"), "", 1); Sfx.Play("whistle"); for (int i = 0; i < 6; i++) gm.Lob(mp + Random.insideUnitCircle * 3f, dmg * 1.3f, 0.8f, Random.Range(1.1f, 2f), true, transform.position); }
                if (cd[4] <= 0 && few) { cd[4] = 11; gm.Spawn("speeder", gm.FreeSpot(6f, 9f)); gm.Spawn("speeder", gm.FreeSpot(6f, 9f)); }
                if (half && cd[5] <= 0)
                {
                    cd[5] = 0.12f;
                    float a = Time.time * 2.2f;
                    for (int k = 0; k < 2; k++) { float b = a + k * Mathf.PI; gm.Shot(p, new Vector2(Mathf.Cos(b), Mathf.Sin(b)) * 2.6f, 2f, dmg * 0.7f, true, ShotKind.Ball); }
                }
                break;
        }
    }

    void Steer(Vector2 target, float dt, float speedFrac = 1, float angOff = 0)
    {
        if (stuck > 0) { v *= Mathf.Pow(0.002f, dt); return; } // 크라켄에 묶임
        Vector2 p = transform.position;
        float a = Angle;
        float wantA = Mathf.Atan2(target.y - p.y, target.x - p.x) + angOff;
        float diff = Mathf.DeltaAngle(a * Mathf.Rad2Deg, wantA * Mathf.Rad2Deg) * Mathf.Deg2Rad;
        float k = slow > 0 ? 0.45f : 1;
        a += Mathf.Sign(diff) * Mathf.Min(Mathf.Abs(diff), turn * dt * k);
        Face(a);
        v += (speed * speedFrac * k * SeaObject.SpeedMulAt(p, transform.right) - v) * Mathf.Min(1, dt * 1.5f);
    }
}
