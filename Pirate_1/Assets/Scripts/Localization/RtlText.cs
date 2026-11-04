using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.UI;

// 아랍어 표시: Unity 기본 Text 는 글자 모양 잇기(초성 · 중성 · 종성 형태) · 오른쪽 → 왼쪽을 못 하므로 여기서 미리 만들어 넣음
// 1) 모양 잇기 = 표시형 글자(FExx)로 바꿈, 라무-알리프 합자, 모음 부호는 뺌
// 2) 줄 나누기 = Text 칸 너비로 직접 나눔 (Unity 가 뒤집힌 글을 나누면 줄 순서가 거꾸로 됨)
// 3) 줄마다 뒤집기 = 아랍 글자는 거꾸로, 숫자 · 영문 덩어리는 그대로, 괄호는 좌우 바꿈, <b> <size> <color> 태그는 짝 맞춤
public static class RtlText
{
    // 0621~064A: 단독(=기본 글자), 끝, 처음, 가운데. 끝 형태만 있는 글자(오른쪽만 이음)는 처음 · 가운데 = 0
    static readonly Dictionary<char, int[]> FORMS = new Dictionary<char, int[]>
    {
        { 'ء', new[] { 0xFE80, 0, 0, 0 } },
        { 'آ', new[] { 0xFE81, 0xFE82, 0, 0 } }, { 'أ', new[] { 0xFE83, 0xFE84, 0, 0 } }, { 'ؤ', new[] { 0xFE85, 0xFE86, 0, 0 } },
        { 'إ', new[] { 0xFE87, 0xFE88, 0, 0 } }, { 'ئ', new[] { 0xFE89, 0xFE8A, 0xFE8B, 0xFE8C } }, { 'ا', new[] { 0xFE8D, 0xFE8E, 0, 0 } },
        { 'ب', new[] { 0xFE8F, 0xFE90, 0xFE91, 0xFE92 } }, { 'ة', new[] { 0xFE93, 0xFE94, 0, 0 } }, { 'ت', new[] { 0xFE95, 0xFE96, 0xFE97, 0xFE98 } },
        { 'ث', new[] { 0xFE99, 0xFE9A, 0xFE9B, 0xFE9C } }, { 'ج', new[] { 0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0 } }, { 'ح', new[] { 0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4 } },
        { 'خ', new[] { 0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8 } }, { 'د', new[] { 0xFEA9, 0xFEAA, 0, 0 } }, { 'ذ', new[] { 0xFEAB, 0xFEAC, 0, 0 } },
        { 'ر', new[] { 0xFEAD, 0xFEAE, 0, 0 } }, { 'ز', new[] { 0xFEAF, 0xFEB0, 0, 0 } }, { 'س', new[] { 0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4 } },
        { 'ش', new[] { 0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8 } }, { 'ص', new[] { 0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC } }, { 'ض', new[] { 0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0 } },
        { 'ط', new[] { 0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4 } }, { 'ظ', new[] { 0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8 } }, { 'ع', new[] { 0xFEC9, 0xFECA, 0xFECB, 0xFECC } },
        { 'غ', new[] { 0xFECD, 0xFECE, 0xFECF, 0xFED0 } }, { 'ف', new[] { 0xFED1, 0xFED2, 0xFED3, 0xFED4 } }, { 'ق', new[] { 0xFED5, 0xFED6, 0xFED7, 0xFED8 } },
        { 'ك', new[] { 0xFED9, 0xFEDA, 0xFEDB, 0xFEDC } }, { 'ل', new[] { 0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0 } }, { 'م', new[] { 0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4 } },
        { 'ن', new[] { 0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8 } }, { 'ه', new[] { 0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC } }, { 'و', new[] { 0xFEED, 0xFEEE, 0, 0 } },
        { 'ى', new[] { 0xFEEF, 0xFEF0, 0, 0 } }, { 'ي', new[] { 0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4 } },
    };
    // 라무 + 알리프 합자 (단독, 끝)
    static readonly Dictionary<char, int[]> LAM_ALEF = new Dictionary<char, int[]>
    {
        { 'آ', new[] { 0xFEF5, 0xFEF6 } }, { 'أ', new[] { 0xFEF7, 0xFEF8 } }, { 'إ', new[] { 0xFEF9, 0xFEFA } }, { 'ا', new[] { 0xFEFB, 0xFEFC } },
    };

    static bool IsMark(char c) => (c >= 'ً' && c <= 'ٟ') || c == 'ٰ';
    static bool Joins(char c) => FORMS.ContainsKey(c) && c != 'ء' || c == 'ـ';
    static bool Dual(char c) => c == 'ـ' || (FORMS.TryGetValue(c, out var f) && f[2] != 0);

    // 모양 잇기 (논리 순서 그대로, 표시형 글자로)
    public static string ShapeLetters(string s)
    {
        var src = new List<char>(s.Length);
        foreach (var c in s) if (!IsMark(c)) src.Add(c);
        var sb = new StringBuilder(src.Count);
        bool inTag = false;
        for (int i = 0; i < src.Count; i++)
        {
            char c = src[i];
            if (c == '<' && LooksLikeTag(src, i)) inTag = true;
            if (inTag) { sb.Append(c); if (c == '>') inTag = false; continue; }
            if (!FORMS.ContainsKey(c)) { sb.Append(c); continue; }
            char prev = Prev(src, i), next = Next(src, i);
            bool pj = prev != '\0' && Dual(prev);
            // 라무 + 알리프
            if (c == 'ل' && LAM_ALEF.TryGetValue(next, out var la))
            {
                sb.Append((char)la[pj ? 1 : 0]);
                i = IndexOfNext(src, i);
                continue;
            }
            bool nj = next != '\0' && Joins(next) && Dual(c);
            var f = FORMS[c];
            int form = pj && nj ? 3 : pj ? 1 : nj ? 2 : 0;
            if (f[form] == 0) form = pj ? 1 : 0;
            sb.Append(form == 0 ? c : (char)f[form]); // 단독형 = 기본 글자 (글꼴에 단독 표시형이 없는 경우가 많음)
        }
        return sb.ToString();
    }

    static bool LooksLikeTag(List<char> s, int i)
    {
        int j = i + 1;
        if (j < s.Count && s[j] == '/') j++;
        foreach (var name in new[] { "b>", "i>", "size", "color" })
        {
            bool ok = true;
            for (int k = 0; k < name.Length; k++) if (j + k >= s.Count || s[j + k] != name[k]) { ok = false; break; }
            if (ok) return true;
        }
        return false;
    }
    static char Prev(List<char> s, int i) { for (int j = i - 1; j >= 0; j--) { if (s[j] == '>') return '\0'; return Joins(s[j]) ? s[j] : '\0'; } return '\0'; }
    static char Next(List<char> s, int i) { int j = IndexOfNext(s, i); return j < s.Count ? s[j] : '\0'; }
    static int IndexOfNext(List<char> s, int i) => i + 1;

    // ── 한 줄을 눈에 보이는 순서로 (오른쪽 → 왼쪽)
    enum Dir { R, L, N }
    static bool IsArabic(char c) => (c >= '؀' && c <= 'ۿ') || (c >= 'ﭐ' && c <= '﷿') || (c >= 'ﹰ' && c <= '﻿');
    static bool IsStrongL(char c) => char.IsLetterOrDigit(c) && !IsArabic(c);
    const string ATTACH = "+-−%.,×:/";

    class Item { public string s; public bool tag, open; public string name; public int pair = -1; public Dir d, resolved; }

    public static string VisualLine(string line)
    {
        // 낱말 · 태그로 쪼갬
        var items = new List<Item>();
        for (int i = 0; i < line.Length; i++)
        {
            if (line[i] == '<')
            {
                int e = line.IndexOf('>', i);
                if (e > i)
                {
                    var t = line.Substring(i, e - i + 1);
                    var m = System.Text.RegularExpressions.Regex.Match(t, @"^<(/?)(b|i|size|color)(=[^>]*)?>$");
                    if (m.Success) { items.Add(new Item { s = t, tag = true, open = m.Groups[1].Value == "", name = m.Groups[2].Value, d = Dir.N }); i = e; continue; }
                }
            }
            char c = line[i];
            items.Add(new Item { s = c.ToString(), d = IsArabic(c) ? Dir.R : IsStrongL(c) ? Dir.L : Dir.N });
        }
        // 태그 짝
        var st = new Stack<int>();
        for (int i = 0; i < items.Count; i++)
        {
            var it = items[i];
            if (!it.tag) continue;
            if (it.open) st.Push(i);
            else if (st.Count > 0) { int o = st.Pop(); items[o].pair = i; it.pair = o; }
        }
        // 숫자 · 영문에 붙은 + % . 같은 기호 = 왼쪽→오른쪽
        for (int i = 0; i < items.Count; i++)
        {
            var it = items[i];
            if (it.tag || it.d != Dir.N || ATTACH.IndexOf(it.s[0]) < 0) continue;
            bool l = (i > 0 && items[i - 1].d == Dir.L) || (i + 1 < items.Count && items[i + 1].d == Dir.L);
            if (l) it.d = Dir.L;
        }
        // 나머지 중립: 양쪽 가까운 글자가 둘 다 왼쪽→오른쪽이면 L, 아니면 R
        for (int i = 0; i < items.Count; i++)
        {
            if (items[i].d != Dir.N) continue;
            Dir a = Dir.R, b = Dir.R;
            for (int j = i - 1; j >= 0; j--) if (!items[j].tag && items[j].d != Dir.N) { a = items[j].d; break; }
            for (int j = i + 1; j < items.Count; j++) if (!items[j].tag && items[j].d != Dir.N) { b = items[j].d; break; }
            items[i].resolved = a == Dir.L && b == Dir.L ? Dir.L : Dir.R;
        }
        foreach (var it in items) if (it.d != Dir.N) it.resolved = it.d;

        // 전체를 뒤집고, L 덩어리만 다시 원래 순서로
        var vis = new List<Item>(items);
        vis.Reverse();
        for (int i = 0; i < vis.Count;)
        {
            if (vis[i].resolved != Dir.L) { i++; continue; }
            int j = i;
            while (j < vis.Count && vis[j].resolved == Dir.L) j++;
            vis.Reverse(i, j - i);
            i = j;
        }
        // 오른쪽→왼쪽 쪽 괄호 좌우 바꾸기 · 태그 짝 순서 맞추기
        var pos = new Dictionary<Item, int>();
        for (int i = 0; i < vis.Count; i++) pos[vis[i]] = i;
        var sb = new StringBuilder(line.Length);
        foreach (var it in vis)
        {
            if (it.tag)
            {
                if (it.pair >= 0)
                {
                    var other = items[it.pair];
                    var opener = it.open ? it : other;
                    bool swapped = pos[opener] > pos[it.open ? other : it];
                    bool asOpen = swapped ? !it.open : it.open;
                    sb.Append(asOpen ? opener.s : "</" + it.name + ">");
                }
                continue; // 짝 없는 태그는 버림
            }
            if (it.resolved == Dir.R && it.s.Length == 1) sb.Append(Mirror(it.s[0])); else sb.Append(it.s);
        }
        return sb.ToString();
    }

    static char Mirror(char c)
    {
        switch (c)
        {
            case '(': return ')'; case ')': return '(';
            case '[': return ']'; case ']': return '[';
            case '«': return '»'; case '»': return '«';
            case '<': return '>'; case '>': return '<';
            default: return c;
        }
    }

    // 줄바꿈 없이 (떠오르는 글자 · 한 줄 글자)
    public static string Shape(string s)
    {
        if (string.IsNullOrEmpty(s)) return s;
        var lines = ShapeLetters(s).Split('\n');
        for (int i = 0; i < lines.Length; i++) lines[i] = VisualLine(lines[i]);
        return string.Join("\n", lines);
    }

    // UI Text 칸 너비에 맞춰 줄을 나눈 뒤 줄마다 뒤집음. 칸 높이를 넘치면 글자 크기를 줄여 다시
    static readonly TextGenerator gen = new TextGenerator();
    static readonly Dictionary<Text, int> baseSize = new Dictionary<Text, int>();
    // 아랍어에서 다른 언어로 돌아갈 때 줄였던 글자 크기를 되돌림
    public static void RestoreSize(Text t) { if (baseSize.TryGetValue(t, out int s)) { t.fontSize = s; baseSize.Remove(t); } }
    public static string ShapeWrapped(Text t, string s)
    {
        if (string.IsNullOrEmpty(s)) return s;
        var rect = t.rectTransform.rect;
        bool wrap = t.horizontalOverflow == HorizontalWrapMode.Wrap && rect.width > 1;
        string shaped = ShapeLetters(s);
        if (!baseSize.TryGetValue(t, out int size0)) baseSize[t] = size0 = t.fontSize;
        if (!wrap) { t.fontSize = size0; return Visual(shaped.Split('\n')); }
        int min = Mathf.Max(8, Mathf.RoundToInt(size0 * 0.55f));
        List<string> lines = null;
        for (int size = size0; size >= min; size--)
        {
            lines = Wrap(t, shaped, size, rect.width);
            float h = lines.Count * size * t.lineSpacing * 1.2f;
            t.fontSize = size;
            if (t.verticalOverflow == VerticalWrapMode.Overflow || h <= rect.height + 1) break;
        }
        return Visual(lines.ToArray());
    }

    static string Visual(string[] lines)
    {
        lines = BalanceTags(lines);
        for (int i = 0; i < lines.Length; i++) lines[i] = VisualLine(lines[i]);
        return string.Join("\n", lines);
    }

    static List<string> Wrap(Text t, string s, int size, float width)
    {
        var set = t.GetGenerationSettings(new Vector2(width, 10000));
        set.fontSize = size;
        set.resizeTextForBestFit = false;
        set.horizontalOverflow = HorizontalWrapMode.Overflow;
        set.scaleFactor = 1;
        var outLines = new List<string>();
        foreach (var para in s.Split('\n'))
        {
            var words = para.Split(' ');
            var cur = "";
            foreach (var w in words)
            {
                var test = cur == "" ? w : cur + " " + w;
                if (cur != "" && gen.GetPreferredWidth(test, set) > width) { outLines.Add(cur); cur = w; }
                else cur = test;
            }
            outLines.Add(cur);
        }
        return outLines;
    }

    // 줄을 넘는 태그: 줄 끝에서 닫고 다음 줄 처음에 다시 엶 (줄마다 따로 뒤집으려고)
    static string[] BalanceTags(string[] lines)
    {
        var open = new List<string>();
        var re = new System.Text.RegularExpressions.Regex(@"<(/?)(b|i|size|color)(=[^>]*)?>");
        for (int i = 0; i < lines.Length; i++)
        {
            string head = string.Concat(open);
            foreach (System.Text.RegularExpressions.Match m in re.Matches(lines[i]))
            {
                if (m.Groups[1].Value == "") open.Add(m.Value);
                else { int k = open.FindLastIndex(o => o.StartsWith("<" + m.Groups[2].Value)); if (k >= 0) open.RemoveAt(k); }
            }
            var tail = new StringBuilder();
            for (int k = open.Count - 1; k >= 0; k--) tail.Append("</" + re.Match(open[k]).Groups[2].Value + ">");
            lines[i] = head + lines[i] + tail;
        }
        return lines;
    }
}
