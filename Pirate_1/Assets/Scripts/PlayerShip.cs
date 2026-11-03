using UnityEngine;
using UnityEngine.InputSystem;

// 내 배 (웹 game.js update 의 조작 · fire · hurtMe)
// W/S = 돛 올림/내림, A/D = 키, 좌클릭 = 마우스 쪽 뱃전 일제 사격, Q/E = 왼쪽/오른쪽 뱃전
// 사용 아이템: 1칸, F = 사용 (ItemSlots). 해류 위에선 순방향 빠르게 · 역방향 느리게 (SeaObject)
public class PlayerShip : MonoBehaviour
{
    [Header("배 수치 (웹 SHIPYARD BASE + 갤리선, 유닛 = 픽셀/100)")]
    public float maxHp = 100;
    public float speed = 1.7f, turn = 1.5f, dmgTaken = 1;
    public int guns = 2;
    public float reload = 2.1f, dmg = 14, crit = 0.1f, range = 1, ballSpeed = 5.4f;
    public float pickup = 1.5f, repair = 15;

    [Header("웨이브 사이 수리 (체력 · 피해 · 사거리 보정은 ShipyardDB 에서 — 조선소에도 보이게)")]
    [Tooltip("웨이브 사이 수리에 최대 체력 × 비율을 더함")]
    public float waveRepairFrac = 0.08f;

    [Header("고유 장비 효과 (조선소 장비에서 옴)")]
    public float evade;
    public float doubleShot, burnAll, chainAll, plunder, ram, goldBonus, plankBonus;
    [Tooltip("포탄이 맞은 곳 폭발 반지름 (유닛)")]
    public float splash;
    [Tooltip("체인샷이 맞으면 주변 적도 N 초 묶음")]
    public float kraken;
    [Tooltip("바람 · 번개 · 소용돌이 피해 · 밀림 감소 (0~0.9)")]
    public float stormGuard;
    [Tooltip("안개 속 시야 반지름 (유닛)")]
    public float vision = 5.2f;

    [Header("자동 무기 (간격 초, 0 = 없음) — AutoWeapons 가 씀")]
    public float bow;
    public float bowDmg = 10, torpedo, torpedoDmg = 40, missile, missileDmg = 18, autoMortar;
    public float planes, planeDmg = 6;

    [Header("선원 (물에 빠진 쥐를 건지면 +1)")]
    public int crew = 2;
    [Tooltip("물에 빠진 쥐를 건지면 회복: 최대 체력 × 비율 + 고정값 (+ 장비 선원 구조 시 수리)")]
    public float rescueHealFrac = 0.08f, rescueHealFlat = 5;
    [Tooltip("선원 1명당 장전 단축 (최대 crewMax 명)")]
    public float crewReload = 0.02f, crewMax = 12, crewHeal;
    public ShipCrew crewView;
    [Tooltip("배 길이 (유닛). 맞는 범위 · 대포 간격")]
    public float len = 1.51f;

    [Header("특수탄 위력 (적 화염탄 · 장비 효과)")]
    public float chainDmgK = 0.6f;
    public float fireDmgK = 0.7f;

    [Header("사용 아이템 (오브젝트 아이템 테이블 Use_Item 초안)")]
    public float invincibleTime = 4;
    public int shieldHits = 3;
    public float boostTime = 1.2f, boostSpeedMul = 2.6f, boostRam = 40;
    public float powerTime = 8, powerDmgMul = 1.5f, powerSplash = 0.6f;
    public float rapidTime = 6, rapidReload = 0.25f;
    [Tooltip("무적 = 금빛, 방어막 = 하늘색 버블, 부스터 = 뒤쪽 불꽃")]
    public SpriteRenderer invincibleGlow, shieldBubble, boostFlame;
    public float mortarDmg = 60, mortarRadius = 1.1f, mortarDelay = 0.9f;

    [Header("연결")]
    public ItemSlots items;
    public SpriteRenderer body;

    [HideInInspector] public float hp, v, av, sail = 0.4f, burn;
    readonly float[] cd = new float[2];
    Vector2 push;
    float hitT;
    float invT, boostT, powerT, rapidT;
    int shieldN;
    readonly System.Collections.Generic.HashSet<EnemyShip> boostHit = new System.Collections.Generic.HashSet<EnemyShip>();
    public bool Invincible => invT > 0;
    // 포탄 강화 중이면 폭발 반지름이 장비 값보다 크면 그걸 씀
    public float SplashNow => Mathf.Max(splash, powerT > 0 ? powerSplash : 0);
    float sinkQ;
    public float HitT => hitT;

    public Vector2 Vel => (Vector2)transform.right * v;
    public float Cooldown(int side) => cd[side > 0 ? 1 : 0];

void Awake()
    {
        if (Shipyard.DB) ApplyStats(Shipyard.Compute());
        hp = maxHp;
    }

// 항구에서 고른 배 + 장비 수치 (웹 단위 픽셀 → 유닛 /100)
    public void ApplyStats(Stats s)
    {
        maxHp = s["hp"]; speed = s["speed"] / 100f; turn = s["turn"]; dmgTaken = s["dmgTaken"];
        guns = Mathf.RoundToInt(s["guns"]); reload = s["reload"]; dmg = s["dmg"]; crit = s["crit"]; range = s["range"]; ballSpeed = s["ballSpd"] / 100f;
        pickup = s["pickup"] / 100f; repair = s["repair"];
        mortarDmg = s["mortarDmg"]; mortarRadius = s["mortarR"] / 100f;
        evade = s["evade"]; doubleShot = s["double"]; burnAll = s["burnAll"]; chainAll = s["chainAll"]; plunder = s["plunder"]; ram = s["ram"];
        goldBonus = s["goldBonus"]; plankBonus = s["plankBonus"];
        splash = s["splash"] / 100f; kraken = s["kraken"]; stormGuard = s["stormGuard"]; vision = s["vision"] / 100f;
        crewReload = s["crewReload"]; crewMax = s["crewMax"]; crewHeal = s["crewHeal"];
        bow = s["bow"]; bowDmg = s["bowDmg"]; torpedo = s["torpedo"]; torpedoDmg = s["torpedoDmg"]; missile = s["missile"]; missileDmg = s["missileDmg"];
        // 자동 폭격 간격: 박격포 칸에 장비를 끼웠을 때만 배 능력치 '폭격' 간격으로 쏨. 고유 장비 '자동 폭격'(선수상 등) 이 있으면 짧은 쪽. 둘 다 없으면 안 쏨
        float am = s["autoMortar"], sm = s.equip.ContainsKey("mortar") && !string.IsNullOrEmpty(s.equip["mortar"]) ? s["mortar"] : 0;
        autoMortar = am > 0 && sm > 0 ? Mathf.Min(am, sm) : Mathf.Max(am, sm);
        planes = s["planes"]; planeDmg = s["planeDmg"];
        len = s.ship.len * 1.8f / 100f;
        if (body && s.ship.sprite) body.sprite = s.ship.sprite;
    }

// 선원이 많을수록 장전이 빨라짐 (최대 crewMax 명까지)
    public float ReloadNow => rapidT > 0 ? rapidReload : reload * (1 - Mathf.Min(crewMax, crew) * crewReload);

    // HUD 게이지: 사용 중인 아이템의 남은 시간 · 횟수 (0~1, 0 = 안 쓰는 중)
    public float BuffFrac(string id)
    {
        switch (id)
        {
            case "invincible": return invT / invincibleTime;
            case "shield": return (float)shieldN / shieldHits;
            case "booster": return boostT / boostTime;
            case "power_shot": return powerT / powerTime;
            case "rapid_fire": return rapidT / rapidTime;
        }
        return 0;
    }

    // F 로 쓴 사용 아이템 효과 발동
    public bool Activate(string id)
    {
        var gm = GameManager.I;
        Vector2 at = (Vector2)transform.position + Vector2.up * 0.35f;
        switch (id)
        {
            case "invincible": invT = invincibleTime; gm.Text(at, "무적!", new Color(1f, 0.85f, 0.3f), true); Sfx.Play("chest"); break;
            case "shield": shieldN = shieldHits; gm.Text(at, "방어막!", new Color(0.55f, 0.85f, 1f), true); Sfx.Play("wave", 0.7f); break;
            case "booster": boostT = boostTime; boostHit.Clear(); sail = 1; gm.Text(at, "부스터!", new Color(1f, 0.6f, 0.25f), true); Sfx.Play("torp"); CameraFollow.Shake(6); break;
            case "power_shot": powerT = powerTime; gm.Text(at, "포탄 강화!", new Color(1f, 0.55f, 0.3f), true); Sfx.Play("fire"); break;
            case "rapid_fire": rapidT = rapidTime; cd[0] = cd[1] = 0; gm.Text(at, "사격 속도 강화!", new Color(1f, 0.9f, 0.45f), true); Sfx.Play("chain"); break;
            default: return false;
        }
        return true;
    }

    // 물에 빠진 쥐 건짐
    public void Rescue()
    {
        var gm = GameManager.I;
        crew++; gm.rescued++;
        Sfx.Play("squeak");
        float heal = maxHp * rescueHealFrac + rescueHealFlat + crewHeal;
        hp = Mathf.Min(maxHp, hp + heal);
        if (crewView) crewView.SetCount(crew);
        gm.Text((Vector2)transform.position + Vector2.up * 0.3f, $"선원 +1 ({crew})  체력 +{Mathf.RoundToInt(heal)}", new Color(0.49f, 1f, 0.54f));
    }



    void Update()
    {
        var gm = GameManager.I;
        float dt = Time.deltaTime;
        var kb = Keyboard.current;
        var ms = Mouse.current;
        if ((!gm.Over || gm.Looting) && !gm.Paused && kb != null && ms != null) // 이긴 뒤에도 몰고 다니며 전리품 줍기
        {
            if (kb.wKey.isPressed) sail = Mathf.Min(1, sail + dt * 1.4f);
            if (kb.sKey.isPressed) sail = Mathf.Max(-0.3f, sail - dt * 1.4f);
            float t = (kb.aKey.isPressed ? 1 : 0) - (kb.dKey.isPressed ? 1 : 0);
            float tr = turn * (1.15f - Mathf.Min(0.5f, Mathf.Abs(v) / 5f));
            av += (t * tr - av) * Mathf.Min(1, dt * 6);
            v += (speed * sail * SeaObject.SpeedMulAt(transform.position, transform.right) - v) * Mathf.Min(1, dt * 1.3f);

            if (ms.leftButton.isPressed) Fire(SideToward(MouseWorld()));
            if (kb.spaceKey.isPressed) { Fire(1); Fire(-1); } // Space = 양쪽 뱃전
            if (kb.qKey.isPressed) Fire(-1);
            if (kb.eKey.isPressed) Fire(1);
        }
        else { v *= Mathf.Pow(0.16f, dt); av *= Mathf.Pow(0.1f, dt); }
        if (boostT > 0 && !gm.Over) Boost(dt);

        transform.Rotate(0, 0, av * Mathf.Rad2Deg * dt);
        Vector2 p = (Vector2)transform.position + Vel * dt;
        if (push != Vector2.zero)
        {
            p += push * dt;
            push *= Mathf.Pow(0.02f, dt);
            if (push.magnitude < 0.01f) push = Vector2.zero;
        }
        transform.position = p;
        gm.CollideIslands(transform, len * 0.3f, ref v);
        if (!gm.Over || gm.Looting) gm.Wake(transform, len, v);
        // 침몰: 2.4 초 동안 기울며 작아지고 흐려짐
        if (gm.Over && hp <= 0 && body)
        {
            sinkQ = Mathf.Min(1, sinkQ + dt / 2.4f);
            body.color = new Color(1, 1, 1, 1 - sinkQ * 0.9f);
            transform.localScale = Vector3.one * (1 - sinkQ * 0.35f);
            transform.Rotate(0, 0, -0.5f * Mathf.Rad2Deg * dt / 2.4f);
            return;
        }

        cd[0] = Mathf.Max(0, cd[0] - dt);
        cd[1] = Mathf.Max(0, cd[1] - dt);
        hitT = Mathf.Max(0, hitT - dt);
        if (burn > 0) { burn -= dt; if (invT <= 0) hp -= 3 * dt; }
        invT = Mathf.Max(0, invT - dt); boostT = Mathf.Max(0, boostT - dt); powerT = Mathf.Max(0, powerT - dt); rapidT = Mathf.Max(0, rapidT - dt);
        if (body) body.color = invT > 0 ? Color.Lerp(Color.white, new Color(1f, 0.85f, 0.35f), 0.5f + 0.3f * Mathf.Sin(Time.time * 12)) : hitT > 0 ? new Color(1f, 0.55f, 0.55f) : burn > 0 ? new Color(1f, 0.8f, 0.6f) : Color.white;
        if (invincibleGlow) { invincibleGlow.enabled = invT > 0; invincibleGlow.transform.localScale = Vector3.one * len * (1.15f + 0.05f * Mathf.Sin(Time.time * 10)); }
        if (boostFlame) { boostFlame.enabled = boostT > 0; boostFlame.transform.localScale = Vector3.one * (0.9f + 0.15f * Mathf.Sin(Time.time * 40)); }
        if (shieldBubble) { shieldBubble.enabled = shieldN > 0; shieldBubble.transform.Rotate(0, 0, 40 * dt); shieldBubble.transform.localScale = Vector3.one * len * (1.05f + 0.03f * Mathf.Sin(Time.time * 4)); }
    }

    public Vector2 MouseWorld()
    {
        var cam = Camera.main;
        Vector3 m = Mouse.current.position.ReadValue();
        m.z = -cam.transform.position.z;
        return cam.ScreenToWorldPoint(m);
    }

    // 목표가 배 왼쪽(반시계)이면 -1 = 좌현, 오른쪽이면 +1 = 우현
    public int SideToward(Vector2 target)
    {
        float rel = Vector2.SignedAngle(transform.right, target - (Vector2)transform.position);
        return rel > 0 ? -1 : 1;
    }

    public bool Fire(int side, ShotKind kind = ShotKind.Ball)
    {
        var gm = GameManager.I;
        if (gm.Over) return false;
        int i = side > 0 ? 1 : 0;
        if (kind == ShotKind.Ball) { if (cd[i] > 0) return false; cd[i] = ReloadNow; }
        if (crewView) crewView.OnFire(side, guns, ReloadNow);
        float d = dmg * (kind == ShotKind.Chain ? chainDmgK : kind == ShotKind.Fire ? fireDmgK : 1) * (powerT > 0 ? powerDmgMul : 1);
        gm.Broadside(transform, Vel, av, len, side, guns, d, ballSpeed, 0.75f * range, false, kind);
        Sfx.Boom(guns);
        if (kind == ShotKind.Chain) Sfx.Play("chain");
        if (kind == ShotKind.Fire) Sfx.Play("fire");
        if (Random.value < doubleShot) StartCoroutine(Again(side, d, kind));
        CameraFollow.Shake(4 + guns);
        Vector2 n = side > 0 ? -(Vector2)transform.up : (Vector2)transform.up;
        push -= n * (3 + guns * 1.2f) * 0.14f;       // 옆으로 밀리는 반동
        av += side * 0.04f * guns / Mathf.Max(1, len); // 한쪽만 쏘면 살짝 돌아감
        return true;
    }

System.Collections.IEnumerator Again(int side, float d, ShotKind kind)
    {
        yield return new WaitForSeconds(0.18f);
        if (!GameManager.I.Over) GameManager.I.Broadside(transform, Vel, av, len, side, guns, d, ballSpeed, 0.75f * range, false, kind);
    }


// 부스터: 앞으로 쏟아지며 부딪힌 적에게 한 번씩 피해, 뒤로 불꽃 · 물살
    void Boost(float dt)
    {
        var gm = GameManager.I;
        v = speed * boostSpeedMul;
        if (Random.value < dt * 30) gm.Flame((Vector2)transform.position - (Vector2)transform.right * len * 0.5f + Random.insideUnitCircle * 0.08f);
        foreach (var f in gm.foes.ToArray())
        {
            if (boostHit.Contains(f) || !f.Targetable) continue;
            if (Vector2.Distance(f.transform.position, transform.position) < (len + f.len) * 0.32f)
            {
                boostHit.Add(f);
                f.Hurt(boostRam, ShotKind.Ram);
                gm.Text((Vector2)f.transform.position + Vector2.up * 0.25f, "돌격!", new Color(1f, 0.6f, 0.25f));
                Sfx.Play("hit"); CameraFollow.Shake(10);
            }
        }
    }

    public void Hurt(float d, Vector2 at)
    {
        var gm = GameManager.I;
        if (gm.Over) return;
        if (gm.tutorialSafe) return;
        if (invT > 0) { gm.Text(transform.position, "무적!", new Color(1f, 0.85f, 0.3f)); return; }
        if (shieldN > 0) { shieldN--; gm.Text(transform.position, shieldN > 0 ? $"막음! ({shieldN})" : "방어막 깨짐", new Color(0.55f, 0.85f, 1f)); Sfx.Play("wood"); CameraFollow.Shake(4); return; }
        if (Random.value < evade) { gm.Text(transform.position, "빗나감!", new Color(0.81f, 0.91f, 1f)); return; }
        d *= gm.DmgMult * dmgTaken;
        hp -= d; hitT = 0.22f;
        if (crewView) crewView.Hit();
        Sfx.Play("hit");
        gm.Text(transform.position, "-" + Mathf.RoundToInt(d), new Color(1f, 0.42f, 0.36f));
        gm.Smoke(at, 0.7f);
        CameraFollow.Shake(10);
    }
}
