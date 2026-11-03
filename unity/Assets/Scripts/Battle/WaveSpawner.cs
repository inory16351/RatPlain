using System.Collections.Generic;
using UnityEngine;

// 웨이브: 프리팹 원본을 복제해 적을 소환 (하이라키에 둔 SpawnPoints 자식 자리 중에서 고름)
// 적 생김새 · 수치는 프리팹에 있고, 웨이브 구성은 인스펙터에서 정함 (웹 seas.js 의 1번 바다)
public class WaveSpawner : MonoBehaviour
{
    [System.Serializable]
    public class Wave { public List<PirateShip> ships = new List<PirateShip>(); }

    public List<Wave> waves = new List<Wave>();
    public Transform spawnPoints;   // 자식 Transform 들 = 소환 자리
    public float delayBetween = 2.5f;
    public int CurrentWave { get; private set; }
    public int Alive => alive.Count;

    readonly List<PirateShip> alive = new List<PirateShip>();
    float wait;

    void Start() => SpawnNext();

    void Update()
    {
        alive.RemoveAll(s => !s || s.Dead);
        if (alive.Count > 0 || CurrentWave >= waves.Count) return;
        wait -= Time.deltaTime;
        if (wait <= 0f) SpawnNext();
    }

    void SpawnNext()
    {
        if (CurrentWave >= waves.Count) return;
        var w = waves[CurrentWave++];
        for (int i = 0; i < w.ships.Count; i++)
        {
            if (!w.ships[i]) continue;
            Transform p = spawnPoints && spawnPoints.childCount > 0 ? spawnPoints.GetChild((i + CurrentWave) % spawnPoints.childCount) : transform;
            alive.Add(Instantiate(w.ships[i], p.position, p.rotation));
        }
        wait = delayBetween;
    }
}
