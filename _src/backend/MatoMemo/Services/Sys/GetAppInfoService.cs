using LittleTripMemo.Common;
using LittleTripMemo.Models;
using LittleTripMemo.Repository.Sys;

namespace LittleTripMemo.Services.Sys;

/// <summary>
/// アプリ情報（mgr_app_info id=1）を取得するサービス
/// </summary>
public class GetAppInfoService(
    UserContext userContext,
    AppInfoRepository appInfoRepository
) : _BaseService(userContext)
{
    public record Response(TAppInfo? app_info);

    /// <summary>
    /// アプリ情報を取得する
    /// </summary>
    public async Task<Response> ExecuteAsync()
    {
        // 1. バリデーション
        await ValidateAsync();

        // 2. リポジトリから取得
        var appInfo = await appInfoRepository.GetAsync();

        // 3. 返却
        return new Response(appInfo);
    }

    /// <summary>
    /// 業務バリデーション
    /// GetSystemInfo と同様、アプリ情報自体は未ログインでも取得可能なためログイン必須チェックは行わない
    /// </summary>
    private async Task ValidateAsync()
    {
        await Task.CompletedTask;
    }
}