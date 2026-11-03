using System.Collections.Generic;
using UnityEngine;

// 아웃게임 표 (웹 pirate/ships.js · seas.js 를 그대로 옮긴 데이터 에셋). Resources/ShipyardDB 에 하나
// 일반 · 고급 장비는 배마다 gearNormal · gearGood 이름 + Shipyard 의 틀(TEMPLATE)로 만들어짐. 희귀 · 전설은 uniques
[System.Serializable]
public class StatMod
{
    public string stat;
    public float value;
}

[System.Serializable]
public class ShipDef
{
    public string id, name, kind;
    public int tier, row;
    [Tooltip("갈래 S 쾌속선 · M 다목적함 · H 중포함, 갤리선은 비움")]
    public string line;
    [Tooltip("이 배를 가져야 살 수 있음")]
    public string req;
    public int costPlank, costCoin;
    [Tooltip("웹 픽셀 길이 (게임 속 = × 1.8 / 100 유닛)")]
    public float len;
    [TextArea] public string desc;
    public List<StatMod> add = new List<StatMod>(), mul = new List<StatMod>();
    public string[] slots;
    public string[] gearNormal, gearGood;
    public Sprite sprite;
}

[System.Serializable]
public class UniqueDef
{
    public string id, ship, slot;
    public int grade;
    public string name;
    public string[] lines;
    public List<StatMod> add = new List<StatMod>(), mul = new List<StatMod>();
    [TextArea] public string desc;
}

[System.Serializable]
public class SeaDef
{
    public bool IsBuilt(ShipyardDB db)
    {
        foreach (var w in waves) foreach (var k in w.Split(',')) if (System.Array.IndexOf(db.builtEnemies, k.Trim()) < 0) return false;
        return System.Array.IndexOf(db.builtEnemies, boss) >= 0;
    }

    public string id, name;
    public string col0, col1;
    public float mult;
    public int rec;
    public string trait;
    public string[] waves;
    public string boss;
    [TextArea] public string story;
}

[System.Serializable]
public class ShopItemDef
{
    public string id, name;
    [TextArea] public string desc;
    public int price;
    public Sprite icon;
    public Color tint = Color.white;
    public int startCount;
    [Tooltip("적에게서 나올 때 종류 비율 (오브젝트 아이템 테이블 drop_weight)")]
    public float dropWeight = 20;
    [Tooltip("지속 시간 (초, 0 = 횟수형) — 설명용")]
    public float duration;
}

[System.Serializable]
public class SlotTypeDef
{
    public string id, name;
    public Sprite icon, uniqueIcon;
}

[CreateAssetMenu(menuName = "RatPirate/Shipyard DB")]
public class ShipyardDB : ScriptableObject
{
    public List<StatMod> baseStats = new List<StatMod>();
    public List<ShipDef> ships = new List<ShipDef>();
    public List<UniqueDef> uniques = new List<UniqueDef>();
    public List<SeaDef> seas = new List<SeaDef>();
    public List<SlotTypeDef> slotTypes = new List<SlotTypeDef>();
    [Tooltip("사용 아이템 5종 (전투에서만, 드랍 가중치 · 아이콘)")]
    public List<ShopItemDef> items = new List<ShopItemDef>();
    [Header("내 배 전체 보정 (밸런스용, 배 · 장비 수치 위에 곱함 · 조선소 화면에도 보임)")]
    public float hpBuff = 1.15f, dmgBuff = 1.1f, takenBuff = 0.93f, rangeBuff = 1.05f;
    [Tooltip("시대가 지날수록 선체가 튼튼해짐: 쾌속선 · 다목적함 받는 피해 배율 (단계 0~5). 중포함은 배 자체 장갑이 있어 안 붙음")]
    public float[] eraArmor = { 1f, 1f, 0.97f, 0.94f, 0.91f, 0.88f };
    [Tooltip("쾌속선은 가벼운 선체라 받는 피해 조금 더")]
    public float lightHull = 1.05f;
    public string[] gradeNames = { "일반", "고급", "희귀", "전설" };
    public Color[] gradeColors = { new Color(0.79f, 0.82f, 0.86f), new Color(0.5f, 0.85f, 0.54f), new Color(0.44f, 0.72f, 1f), new Color(1f, 0.72f, 0.3f) };
    [Tooltip("Battle 장면에 원본 프리팹이 있는 적 kind. 바다의 적이 전부 여기 있어야 출항 가능")]
    public string[] builtEnemies = { "sloop", "frigate", "mortar", "speeder", "rival", "mine", "b_rival" };
    public string[] eras = { "고대", "대항해시대", "범선 전성기", "증기선 시대", "강철 군함", "현대" };
}
