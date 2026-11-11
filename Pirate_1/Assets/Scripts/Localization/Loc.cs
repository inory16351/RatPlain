using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

// 다국어 (스트링 테이블 = Pirat_Table/스트링 테이블.xlsx → tools/loc/loc_export.py → Resources/Localization/strings.tsv)
// Loc.T("키") = 지금 언어 글자, Loc.F("키", 값…) = {0} 자리에 값 넣기. 없는 키는 한국어 → 키 그대로
// 씬에 박힌 한국어 글자 (버튼 · 제목 등) 는 테이블의 '원문(검수 전)' 또는 ko 와 같으면 장면을 열 때 알아서 바꿈
// 언어마다 글꼴을 바꿔 끼움 (한국어 = 원래 Jua, 나머지 = Resources/Localization/Fonts). 아랍어는 RtlText 로 모양 잇기 · 뒤집기
public static class Loc
{
    public static readonly string[] Codes = { "ko", "en", "ru", "fr", "de", "zh", "ja", "ar" };
    static readonly string[] FontOf = { null, "Loc_Latin", "Loc_Latin", "Loc_Latin", "Loc_Latin", "Loc_SC", "Loc_JP", "Loc_AR" };
    const string PREF = "lang";

    static Dictionary<string, string[]> table;
    static Dictionary<string, string> bySource; // 씬 한국어 글자 → 키
    static int lang = -1;
    public static event System.Action Changed;

    public static int Lang { get { Load(); return lang; } }
    public static string Code => Codes[Lang];
    public static bool RTL => Code == "ar";
    public static bool CJK => Code == "zh" || Code == "ja";
    public static int Count => Codes.Length;

    static void Load()
    {
        if (table != null) return;
        table = new Dictionary<string, string[]>();
        bySource = new Dictionary<string, string>();
        var ta = Resources.Load<TextAsset>("Localization/strings");
        if (ta)
        {
            var lines = ta.text.Split('\n');
            for (int i = 1; i < lines.Length; i++)
            {
                var c = lines[i].TrimEnd('\r').Split('\t');
                if (c.Length < 2 + Codes.Length || c[0] == "") continue;
                var v = new string[Codes.Length];
                for (int k = 0; k < v.Length; k++) v[k] = c[2 + k].Replace("\\n", "\n");
                table[c[0]] = v;
                bySource[Norm(v[0])] = c[0];
                if (c[1] != "") bySource[Norm(c[1].Replace("\\n", "\n"))] = c[0];
            }
        }
        // 처음 켜면 영어 (설정에서 고른 언어가 있으면 그것)
        if (lang < 0) lang = PlayerPrefs.HasKey(PREF) ? Mathf.Clamp(PlayerPrefs.GetInt(PREF), 0, Codes.Length - 1) : 1;
    }

    // 씬 글자 찾기용: 공백 · 줄바꿈 개수 차이는 무시
    static string Norm(string s) => System.Text.RegularExpressions.Regex.Replace(s, @"\s+", " ").Trim();

    public static bool Has(string key) { Load(); return key != null && table.ContainsKey(key); }

    // 키 → 지금 언어. 빈 칸이면 한국어, 키가 없으면 fallback (없으면 키)
    public static string T(string key, string fallback = null)
    {
        Load();
        if (key != null && table.TryGetValue(key, out var v))
        {
            var s = v[lang];
            return string.IsNullOrEmpty(s) ? v[0] : s;
        }
        return fallback ?? key;
    }

    public static string F(string key, params object[] args)
    {
        var f = T(key);
        try { return string.Format(f, args); } catch (System.FormatException) { return f; }
    }

    // 나열 구분자 (속도 +10%, 회전 +5%)
    public static string ListSep => CJK ? T("common.list_sep") : T("common.list_sep") + " ";
    // "성공! " 처럼 뒤에 다른 글자가 붙는 짧은 말
    public static string Lead(string key) => CJK ? T(key) : T(key) + " ";

    // 씬에 박힌 한국어 → 키 (없으면 null)
    public static string KeyOfSource(string text)
    {
        Load();
        return text != null && bySource.TryGetValue(Norm(text), out var k) ? k : null;
    }

    public static void SetLang(int i)
    {
        Load();
        i = Mathf.Clamp(i, 0, Codes.Length - 1);
        if (i == lang) return;
        lang = i;
        PlayerPrefs.SetInt(PREF, i); PlayerPrefs.Save();
        LocTexts.ReapplyAll();
        Changed?.Invoke();
    }

    // 지금 언어 글꼴 (한국어 = null → 원래 글꼴 그대로)
    static readonly Dictionary<string, Font> fonts = new Dictionary<string, Font>();
    public static Font LangFont
    {
        get
        {
            var n = FontOf[Lang];
            if (n == null) return null;
            if (!fonts.TryGetValue(n, out var f) || !f) fonts[n] = f = Resources.Load<Font>("Localization/Fonts/" + n);
            return f;
        }
    }

    // 떠오르는 글자 (TextMesh, 월드 공간): 글꼴 · 아랍어 모양
    public static void Apply(TextMesh tm, string s)
    {
        var f = LangFont;
        if (f && tm.font != f)
        {
            tm.font = f;
            var r = tm.GetComponent<MeshRenderer>();
            if (r) r.sharedMaterial = f.material;
        }
        tm.text = RTL ? RtlText.Shape(s) : s;
    }

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    static void Boot()
    {
        Load();
        SceneManager.sceneLoaded += (s, m) => LocTexts.Scan();
        // 모든 Update · LateUpdate 가 글자를 바꾼 뒤, UI 다시 그리기(PostLateUpdate) 전에 한 번
        // (Canvas.willRenderCanvases 는 UI 다시 그리기보다 늦게 불려 매 프레임 바뀌는 글자가 뒤집히지 않은 채 그려짐)
        var loop = UnityEngine.LowLevel.PlayerLoop.GetCurrentPlayerLoop();
        for (int i = 0; i < loop.subSystemList.Length; i++)
        {
            if (loop.subSystemList[i].type != typeof(UnityEngine.PlayerLoop.PreLateUpdate)) continue;
            var subs = new List<UnityEngine.LowLevel.PlayerLoopSystem>(loop.subSystemList[i].subSystemList);
            if (subs.Exists(x => x.type == typeof(LocTexts))) return;
            subs.Add(new UnityEngine.LowLevel.PlayerLoopSystem { type = typeof(LocTexts), updateDelegate = LocTexts.BeforeRender });
            loop.subSystemList[i].subSystemList = subs.ToArray();
        }
        UnityEngine.LowLevel.PlayerLoop.SetPlayerLoop(loop);
    }
}

// 화면의 UI Text 들: 장면 글자 번역 · 글꼴 바꾸기 · 넘치면 줄이기 · 아랍어 모양 (코드가 text 를 바꿔도 그리기 직전에 다시 맞춤)
public static class LocTexts
{
    class Info
    {
        public string key;          // 장면 글자의 테이블 키 (없으면 null = 코드가 채우는 글자)
        public Font font;           // 원래 글꼴 (한국어로 돌아올 때)
        public bool bestFit; public int minSize, maxSize;
        public TextAnchor align;
        public HorizontalWrapMode hOver; public VerticalWrapMode vOver;
        public string shown;        // 마지막으로 RTL 처리해 넣은 글자 (코드가 바꿨는지 알아보려고)
    }
    static readonly Dictionary<Text, Info> all = new Dictionary<Text, Info>();
    static float scanT;
    static Font baseFont;

    public static void Scan()
    {
        foreach (var t in Resources.FindObjectsOfTypeAll<Text>())
        {
            if (!t || all.ContainsKey(t) || !t.gameObject.scene.IsValid()) continue;
            var i = new Info { key = Loc.KeyOfSource(t.text), font = t.font, bestFit = t.resizeTextForBestFit, minSize = t.resizeTextMinSize, maxSize = t.resizeTextMaxSize, align = t.alignment, hOver = t.horizontalOverflow, vOver = t.verticalOverflow };
            // 이미 바뀐 원본을 복제한 줄 (조선소 줄 · 바다 카드 등): 원래 값은 한국어 기본값으로
            if (t.font && t.font.name.StartsWith("Loc_"))
            {
                i.font = baseFont; i.bestFit = false; i.maxSize = t.fontSize; i.minSize = 10;
                if (Loc.RTL) i.align = Mirror(t.alignment);
            }
            else if (t.font && !baseFont) baseFont = t.font;
            all[t] = i;
            Apply(t, i);
        }
    }

    public static void ReapplyAll()
    {
        var dead = new List<Text>();
        foreach (var kv in all) if (kv.Key) { kv.Value.shown = null; Apply(kv.Key, kv.Value); } else dead.Add(kv.Key);
        foreach (var d in dead) all.Remove(d);
    }

    static void Apply(Text t, Info i)
    {
        var f = Loc.LangFont;
        t.font = f ? f : i.font;
        RtlText.RestoreSize(t);
        // 한국어보다 긴 말이 많아서 칸을 넘치면 글자를 줄임 (ContentSizeFitter 가 있는 글자는 그대로)
        // 아랍어는 RtlText 가 줄을 직접 나누고 크기를 고르므로 끔 (Unity 가 다시 줄을 나누면 순서가 꼬임)
        bool fit = Loc.Lang != 0 && !Loc.RTL && !t.GetComponent<ContentSizeFitter>();
        t.resizeTextForBestFit = fit || i.bestFit;
        t.resizeTextMaxSize = fit && !i.bestFit ? t.fontSize : i.maxSize;
        t.resizeTextMinSize = fit && !i.bestFit ? Mathf.Max(8, Mathf.RoundToInt(t.fontSize * 0.55f)) : i.minSize;
        // 줄이기는 칸 안에 가둘 때만 먹힘 (넘침 허용이면 Unity 가 안 줄임) → 다른 언어에선 줄바꿈 + 칸 안으로
        t.horizontalOverflow = fit ? HorizontalWrapMode.Wrap : i.hOver;
        t.verticalOverflow = fit ? VerticalWrapMode.Truncate : i.vOver;
        t.alignment = Loc.RTL ? Mirror(i.align) : i.align;
        if (i.key != null) t.text = Loc.T(i.key);
        if (Loc.RTL) Shape(t, i);
    }

    static TextAnchor Mirror(TextAnchor a)
    {
        switch (a)
        {
            case TextAnchor.UpperLeft: return TextAnchor.UpperRight;
            case TextAnchor.UpperRight: return TextAnchor.UpperLeft;
            case TextAnchor.MiddleLeft: return TextAnchor.MiddleRight;
            case TextAnchor.MiddleRight: return TextAnchor.MiddleLeft;
            case TextAnchor.LowerLeft: return TextAnchor.LowerRight;
            case TextAnchor.LowerRight: return TextAnchor.LowerLeft;
            default: return a;
        }
    }

    static void Shape(Text t, Info i)
    {
        if (t.text == i.shown) return;
        var s = RtlText.ShapeWrapped(t, t.text);
        i.shown = s;
        t.text = s;
    }

    // 캔버스를 그리기 직전: 새로 생긴 글자 찾기 (가끔), 아랍어면 코드가 바꾼 글자를 다시 모양 잡기
    public static void BeforeRender()
    {
        // 아랍어는 새로 복제된 줄이 뒤집히기 전 모습으로 오래 보이지 않게 더 자주 찾음
        if ((scanT -= Time.unscaledDeltaTime) <= 0) { scanT = Loc.RTL ? 0.05f : 0.5f; Scan(); }
        if (!Loc.RTL) return;
        foreach (var kv in all)
            if (kv.Key && kv.Key.isActiveAndEnabled && kv.Key.text != kv.Value.shown) Shape(kv.Key, kv.Value);
    }
}
