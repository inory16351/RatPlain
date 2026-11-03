using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

// itch.io 용 WebGL 빌드. 배치 모드:
// Unity.exe -batchmode -quit -projectPath Pirate_1 -executeMethod WebGLBuild.Build -logFile build_webgl.log
// 결과: ../build/Pirate_1_WebGL (index.html 이 루트에 있음 → 폴더째 zip 해서 itch 에 올림)
public static class WebGLBuild
{
    const string OutDir = "../build/Pirate_1_WebGL";

    [MenuItem("Tools/Build WebGL (itch)")]
    public static void Build()
    {
        // itch 는 Brotli 헤더를 안 붙여 주므로 압축 해제 폴백 켜 둠
        PlayerSettings.WebGL.decompressionFallback = true;
        PlayerSettings.defaultWebScreenWidth = 1280;
        PlayerSettings.defaultWebScreenHeight = 720;

        var scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = OutDir,
            target = BuildTarget.WebGL,
            options = BuildOptions.None,
        });

        var s = report.summary;
        Debug.Log($"[WebGLBuild] {s.result} · {s.totalSize / (1024 * 1024)}MB · {s.totalTime} · 오류 {s.totalErrors}");
        if (Application.isBatchMode) EditorApplication.Exit(s.result == BuildResult.Succeeded ? 0 : 1);
    }
}
