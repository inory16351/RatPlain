using System.IO;
using System.Text;
using UnityEngine;

// 웹 빌드 이어하기 기록 지키기
// Unity WebGL 의 PlayerPrefs 는 게임 주소별 폴더(/idbfs/<주소 해시>/PlayerPrefs)에 저장되는데,
// itch 는 파일을 새로 올릴 때마다 주소가 바뀜 → 새 빌드가 이전 기록을 못 찾음.
// 그래서 기록을 주소와 상관없는 고정 파일(/idbfs/ratpirate_save.json)에도 같이 쓰고,
// PlayerPrefs 에 기록이 없으면 고정 파일 → (없으면) 이전 업로드 폴더들의 PlayerPrefs 에서 가장 최근 기록을 가져옴.
// 에디터 · PC 빌드에서는 아무것도 안 함
public static class WebSave
{
#if UNITY_WEBGL && !UNITY_EDITOR
    const string Root = "/idbfs";
    static string Fixed => Root + "/ratpirate_save.json";
    static bool tried;

    // PlayerPrefs 에 key 가 없으면 한 번 찾아서 넣어 둠 (HasSave · Load 전에 부름)
    public static void Recover(string key)
    {
        if (tried) return;
        tried = true;
        if (PlayerPrefs.HasKey(key)) return;
        try
        {
            string j = null;
            if (File.Exists(Fixed)) j = File.ReadAllText(Fixed); // 비어 있으면 새 게임으로 지운 것
            else j = FromOldFolders(key);
            if (string.IsNullOrEmpty(j)) return;
            PlayerPrefs.SetString(key, j);
            PlayerPrefs.Save();
            Debug.Log("[WebSave] 이전 이어하기 기록을 가져옴");
        }
        catch (System.Exception e) { Debug.LogWarning("[WebSave] 기록 찾기 실패: " + e.Message); }
    }

    // Store 때 같이 씀 (이어서 PlayerPrefs.Save 가 브라우저 저장소에 반영)
    public static void Write(string json)
    {
        try { File.WriteAllText(Fixed, json ?? ""); } catch (System.Exception e) { Debug.LogWarning("[WebSave] 저장 실패: " + e.Message); }
    }

    // 다른 주소 폴더들의 PlayerPrefs 파일에서 key 다음의 JSON 을 꺼내, savedAt 이 가장 늦은 것
    static string FromOldFolders(string key)
    {
        if (!Directory.Exists(Root)) return null;
        string best = null, bestAt = null;
        var mine = Path.GetFullPath(Application.persistentDataPath).TrimEnd('/');
        foreach (var dir in Directory.GetDirectories(Root))
        {
            if (Path.GetFullPath(dir).TrimEnd('/') == mine) continue;
            var f = Path.Combine(dir, "PlayerPrefs");
            if (!File.Exists(f)) continue;
            var j = ExtractJson(File.ReadAllBytes(f), key);
            if (j == null) continue;
            string at = "";
            try { var s = JsonUtility.FromJson<SaveData>(j); if (s == null || s.v != 1) continue; at = s.savedAt ?? ""; } catch { continue; }
            if (best == null || string.CompareOrdinal(at, bestAt) > 0) { best = j; bestAt = at; }
        }
        return best;
    }

    static string ExtractJson(byte[] b, string key)
    {
        var k = Encoding.UTF8.GetBytes(key);
        int at = IndexOf(b, k, 0);
        if (at < 0) return null;
        int start = -1;
        for (int i = at + k.Length; i < b.Length && i < at + k.Length + 16; i++) if (b[i] == '{') { start = i; break; }
        if (start < 0) return null;
        int depth = 0; bool str = false, esc = false;
        for (int i = start; i < b.Length; i++)
        {
            byte c = b[i];
            if (str) { if (esc) esc = false; else if (c == '\\') esc = true; else if (c == '"') str = false; continue; }
            if (c == '"') str = true;
            else if (c == '{') depth++;
            else if (c == '}' && --depth == 0) return Encoding.UTF8.GetString(b, start, i - start + 1);
        }
        return null;
    }

    static int IndexOf(byte[] b, byte[] k, int from)
    {
        for (int i = from; i <= b.Length - k.Length; i++)
        {
            int n = 0;
            while (n < k.Length && b[i + n] == k[n]) n++;
            if (n == k.Length) return i;
        }
        return -1;
    }
#else
    public static void Recover(string key) { }
    public static void Write(string json) { }
#endif
}
