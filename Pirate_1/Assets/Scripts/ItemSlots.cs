using UnityEngine;
using UnityEngine.InputSystem;

// 사용 아이템 1칸 (기획서 오브젝트 · 아이템 6쪽: 1개만 소지, 새로 주우면 교체, F 로 사용)
// 적 · 보급 상자를 부수면 일정 확률로 떨어짐 → 주우면 들고 있던 건 사라짐. 웨이브 사이 유지, 스테이지 끝나면 소멸 (저장 안 함)
// 종류 목록 · 이름 · 아이콘은 ShipyardDB.items 에서 옴 (없으면 인스펙터 값). 효과는 PlayerShip.Activate
[System.Serializable]
public class ItemSlot
{
    public string id;
    public string name;
    public Sprite icon;
    // 화면 이름 (스트링 테이블 item.<id>.name)
    public string Name => Shipyard.ItemName(id, name);
    public Color tint = Color.white;
}

public class ItemSlots : MonoBehaviour
{
    [Tooltip("아이템 종류 목록 (드랍 가중치 순서 = DB.items)")]
    public ItemSlot[] slots = new ItemSlot[5];
    // 들고 있는 아이템 (-1 = 빈 칸)
    public int Held { get; private set; } = -1;
    // 마지막에 쓴 아이템 (HUD 남은 시간 게이지)
    public int Active { get; private set; } = -1;
    // 교체로 버려진 아이템 · 남은 연출 시간
    public int Dropped { get; private set; } = -1;
    [HideInInspector] public float dropT;

    public ItemSlot HeldItem => Held >= 0 ? slots[Held] : null;

    void Awake()
    {
        if (!Shipyard.DB) return;
        var d = Shipyard.DB.items;
        slots = new ItemSlot[d.Count];
        for (int i = 0; i < d.Count; i++) slots[i] = new ItemSlot { id = d[i].id, name = d[i].name, icon = d[i].icon, tint = d[i].tint };
    }

    void Update()
    {
        dropT = Mathf.Max(0, dropT - Time.unscaledDeltaTime);
        var kb = Keyboard.current;
        var gm = GameManager.I;
        if (kb == null || gm.Over || gm.Paused) return;
        if (kb.fKey.wasPressedThisFrame) Use();
    }

    // 주움: 빈 칸이면 들고, 들고 있으면 기존 것을 버리고 교체
    public void Take(int i)
    {
        if (i < 0 || i >= slots.Length) return;
        if (Held >= 0 && Held != i) { Dropped = Held; dropT = 0.9f; }
        Held = i;
    }

    // F: 들고 있는 아이템 발동 → 칸 비움
    public void Use()
    {
        var gm = GameManager.I;
        if (Held < 0)
        {
            Sfx.Play("deny");
            gm.Text(gm.player.transform.position + Vector3.up * 0.4f, Loc.T("float.no_item"), new Color(0.8f, 0.85f, 0.9f));
            return;
        }
        if (!gm.player.Activate(slots[Held].id)) return;
        Active = Held;
        Held = -1;
    }
}
