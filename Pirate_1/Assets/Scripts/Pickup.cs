using UnityEngine;

public enum PickupKind { Coin, Plank, Item, Chest, Swimmer }

// 바다에 뜬 보상: 금화 · 판자 · 아이템 · 보물 상자 (웹 pickups)
// 금화 · 판자 · 아이템은 가까우면 배로 끌려옴. 사용 아이템은 1칸이라 주우면 들고 있던 것과 교체 (ItemSlots.Take)
// (보물상자는 이제 SeaObject — 포탄으로 부숨. Chest 는 옛 저장 장면 호환용)
public class Pickup : MonoBehaviour
{
    public PickupKind kind;
    [Tooltip("둥둥 뜨는 그림 (자식)")]
    public Transform visual;
    [Tooltip("아이템 그림 (아이템 종류에 따라 바뀜)")]
    public SpriteRenderer icon;
    public float life = 22;

    int value, plank, item = -1;
    float bob;

    public void Setup(int v, int planks = 0, int itemIndex = -1)
    {
        value = v; plank = planks; item = itemIndex;
        bob = Random.value * 7;
        if (kind == PickupKind.Item && icon && item >= 0)
        {
            var s = GameManager.I.player.items.slots[item];
            icon.sprite = s.icon; icon.color = s.tint;
        }
    }

    void Update()
    {
        var gm = GameManager.I;
        var me = gm.player;
        float dt = Time.deltaTime;
        bob += dt;
        if (visual) visual.localPosition = new Vector3(0, Mathf.Sin(bob * 3) * 0.04f, 0);
        if (kind != PickupKind.Chest && !gm.Looting && (life -= dt) <= 0) { Destroy(gameObject); return; } // 이긴 뒤엔 안 사라짐
        // 사용 아이템은 사라지기 3 초 전부터 깜빡임 (아이템 테이블 drop_blink)
        if (kind == PickupKind.Item && visual) visual.gameObject.SetActive(life > 3 || Mathf.Repeat(life * 6, 1) > 0.35f);
        if (gm.Over && !gm.Looting) return;
        Vector2 p = transform.position, mp = me.transform.position;
        float d = Vector2.Distance(p, mp);
        float pull = kind == PickupKind.Swimmer ? me.pickup * 0.75f : me.pickup;
        if (kind != PickupKind.Chest && d < pull) transform.position = p + (mp - p) * Mathf.Min(1, dt * 4);
        if (kind == PickupKind.Swimmer && Random.value < dt * 0.5f) gm.Text(p + new Vector2(0.18f, 0.1f), Loc.T("float.squeak"), Color.white);
        if (d < (kind == PickupKind.Chest ? 0.46f + me.len * 0.2f : kind == PickupKind.Swimmer ? 0.34f : 0.32f)) Collect();
    }

    // 정산 때 남은 금화 · 목재를 소리 없이 챙김
    public void Grab()
    {
        var gm = GameManager.I;
        if (kind == PickupKind.Coin) gm.gold += value;
        else if (kind == PickupKind.Plank) gm.plank += value;
        Destroy(gameObject);
    }

    void Collect()
    {
        var gm = GameManager.I;
        var items = gm.player.items;
        Vector2 p = transform.position;
        switch (kind)
        {
            case PickupKind.Coin: gm.gold += value; Sfx.Play("coin"); break;
            case PickupKind.Swimmer: gm.player.Rescue(); break;
            case PickupKind.Plank: gm.plank += value; Sfx.Play("wood"); break;
            case PickupKind.Item:
                bool swap = items.Held >= 0 && items.Held != item;
                items.Take(item);
                Sfx.Play("chest", 0.6f, 1.2f);
                gm.Sparkle(p);
                gm.Text(p, swap ? Loc.F("float.swap", items.slots[item].Name) : items.slots[item].Name, new Color(0.6f, 0.95f, 1f), true);
                break;
            case PickupKind.Chest:
                gm.gold += value; gm.plank += plank;
                Sfx.Play("chest");
                gm.Text(p, Loc.F("float.treasure_n", value), new Color(1f, 0.85f, 0.29f), true);
                gm.Blast(p, 0.5f);
                break;
        }
        Destroy(gameObject);
    }
}
