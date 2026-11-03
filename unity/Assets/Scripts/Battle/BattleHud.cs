using UnityEngine;
using UnityEngine.UI;

// 전투 HUD: 체력 막대 · 양쪽 뱃전 장전 막대 · 웨이브 글자 (UI 오브젝트는 하이라키에 있고 여기서는 값만 넣음)
public class BattleHud : MonoBehaviour
{
    public PirateShip player;
    public WaveSpawner spawner;
    public Image hpFill;
    public Image leftReload;
    public Image rightReload;
    public Text waveText;

    void Update()
    {
        if (!player) return;
        if (hpFill) hpFill.fillAmount = Mathf.Clamp01(player.hp / player.maxHp);
        if (leftReload) leftReload.fillAmount = Mathf.Clamp01(player.Cooldown01(-1));
        if (rightReload) rightReload.fillAmount = Mathf.Clamp01(player.Cooldown01(1));
        if (waveText && spawner)
            waveText.text = player.Dead ? "해적선 침몰…"
                : spawner.CurrentWave >= spawner.waves.Count && spawner.Alive == 0 ? "바다 정복!"
                : $"웨이브 {spawner.CurrentWave}/{spawner.waves.Count} · 남은 적 {spawner.Alive}";
    }
}
