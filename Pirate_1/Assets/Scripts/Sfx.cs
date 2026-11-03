using UnityEngine;

// 효과음 (웹 game.js SFX 를 같은 합성 공식으로 구운 WAV). 이름으로 부름: Sfx.Play("hit")
// 장면마다 하나 (Battle · Port). 같은 소리를 한 프레임에 여러 번 부르면 한 번만 남 (포탄 여러 발 · 보상 여러 개)
public class Sfx : MonoBehaviour
{
    [System.Serializable]
    public class Entry
    {
        public string name;
        public AudioClip clip;
        [Range(0, 2)] public float volume = 1;
    }

    static Sfx inst;
    public AudioSource source;
    public Entry[] clips;
    [Tooltip("같은 소리 최소 간격 (초)")]
    public float minGap = 0.03f;

    readonly System.Collections.Generic.Dictionary<string, Entry> byName = new System.Collections.Generic.Dictionary<string, Entry>();
    readonly System.Collections.Generic.Dictionary<string, float> last = new System.Collections.Generic.Dictionary<string, float>();

    void Awake()
    {
        inst = this;
        foreach (var e in clips) if (e.clip) byName[e.name] = e;
        Apply();
    }

    // M = 소리 끄기 · 켜기 (음악까지, 저장됨)
    void Update()
    {
        var kb = UnityEngine.InputSystem.Keyboard.current;
        if (kb != null && kb.mKey.wasPressedThisFrame) Muted = !Muted;
    }

    // 소리 설정 (PlayerPrefs "mute" · "volume", 로비 설정 창 · M 키)
    public static bool Muted
    {
        get => PlayerPrefs.GetInt("mute", 0) == 1;
        set { PlayerPrefs.SetInt("mute", value ? 1 : 0); PlayerPrefs.Save(); Apply(); }
    }
    public static float Volume
    {
        get => PlayerPrefs.GetFloat("volume", 1);
        set { PlayerPrefs.SetFloat("volume", Mathf.Clamp01(value)); PlayerPrefs.Save(); Apply(); }
    }
    static void Apply() => AudioListener.volume = Muted ? 0 : Volume;

    public static void Play(string name, float volume = 1, float pitch = 1)
    {
        if (!inst || volume <= 0 || !inst.byName.TryGetValue(name, out var e)) return;
        float now = Time.unscaledTime;
        if (inst.last.TryGetValue(name, out var t) && now - t < inst.minGap) return;
        inst.last[name] = now;
        inst.source.pitch = pitch;
        inst.source.PlayOneShot(e.clip, e.volume * volume);
    }

    // 대포 소리: 일제 사격 문 수(1~5)만큼 겹쳐 울림, far = 멀수록 작게 (0~1)
    public static void Boom(int guns, float far = 0) => Play("boom_" + Mathf.Clamp(guns, 1, 5), 1 - far);
}
