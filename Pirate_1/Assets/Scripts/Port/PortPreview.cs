using UnityEngine;

// 항구 미리보기 무대 (웹 drawShipPreview · npcLoop): 화면 밖 무대를 미리보기 카메라가 그려 UI(RawImage)에 띄움
// 배 = 배 그림 + 선장 · 선원 4명 리깅 (뱃머리 오른쪽) / 조선공 = 테크(가진 배 최고 단계) 옷차림, 의뢰 · 합성 때 망치질, 희귀 이상이면 만세
// 배 그림 · 선원 · 조선공 생김새는 원본(리깅 프리팹)에서 복제
public class PortPreview : MonoBehaviour
{
    public Camera cam;
    public SpriteRenderer ship;
    public ShipCrew crew;
    [Tooltip("조선공 리깅 원본 (테크 0~5)")]
    public CrewMember[] wrights;
    public Transform wrightSpot;
    public float wrightSize = 2f, wrightView = 1.3f;

    CrewMember wright;
    int wrightTier = -1;
    string shown;
    bool cheerAfter;

    public void ShowShip(string id)
    {
        if (wright) wright.gameObject.SetActive(false);
        ship.gameObject.SetActive(true);
        crew.gameObject.SetActive(true);
        if (shown == id) return;
        shown = id;
        var d = Shipyard.Ship(id);
        ship.sprite = d.sprite;
        crew.ShowShip(d, 4);
        var b = d.sprite.bounds.size;
        cam.transform.position = new Vector3(ship.transform.position.x, ship.transform.position.y, -10);
        cam.orthographicSize = Mathf.Max(b.y * 0.5f * 1.15f, b.x * 0.5f * 1.12f / cam.aspect);
    }

    public void ShowWright(int tier)
    {
        ship.gameObject.SetActive(false);
        crew.gameObject.SetActive(false);
        shown = null;
        tier = Mathf.Clamp(tier, 0, wrights.Length - 1);
        if (wrightTier != tier)
        {
            if (wright) Destroy(wright.gameObject);
            wright = Instantiate(wrights[tier], wrightSpot);
            wright.transform.localPosition = Vector3.zero;
            wright.SetSize(wrightSize);
            wright.transform.localScale = Vector3.one * wright.SizeK;
            wrightTier = tier;
        }
        wright.gameObject.SetActive(true);
        cam.transform.position = wrightSpot.position + new Vector3(0, 0.1f, -10);
        cam.orthographicSize = wrightView;
    }

    // 의뢰 · 합성: 망치질 1.1 초, 좋은 게 나오면 끝나고 만세
    public void Hammer(bool cheer)
    {
        if (!wright) return;
        wright.SetAct("hammer", 1.1f);
        cheerAfter = cheer;
    }

    void Update()
    {
        if (wright && wright.act == "hammer" && wright.at > wright.dur)
        {
            wright.SetAct("idle", 0);
            if (cheerAfter) wright.ch = 0.9f;
            cheerAfter = false;
        }
    }
}
