using UnityEngine;
using UnityEngine.UI;

// Esc 확인 배너 "메인메뉴로 나가시겠습니까?" (프리팹 Prefabs/UI/ExitMenu 하나를 항구 · 전투 캔버스에 둠)
// 예 = onYes (장면마다 다름), 아니오 = 닫기. 언제 열지는 장면 쪽이 정함 (TitleScreen · GameManager)
public class ExitMenu : MonoBehaviour
{
    public GameObject panel;
    public Button yes, no;
    public System.Action onYes;
    public bool IsOpen => panel && panel.activeSelf;

    void Awake()
    {
        panel.SetActive(false);
        yes.onClick.AddListener(() => { Sfx.Play("ui_click"); Close(); onYes?.Invoke(); });
        no.onClick.AddListener(() => { Sfx.Play("ui_click"); Close(); });
    }

    public void Open() { panel.SetActive(true); Sfx.Play("ui_click"); }
    public void Close() => panel.SetActive(false);
}
