using UnityEngine;
using UnityEngine.UI;

// 항구 목록 한 줄 (바다 · 배 · 슬롯 · 장비). 원본 줄을 PortUI 가 복제해서 글자 · 그림만 채움
public class RowView : MonoBehaviour
{
    [Tooltip("줄 전체 클릭 (고르기)")]
    public Button click;
    public Image bg, icon;
    public Text title, desc, right;
    [Tooltip("줄 안의 작은 버튼 (장착 · 해제 · 사기 …), 없으면 비움")]
    public Button button;
    public Text buttonText;
}
