using LittleTripMemo.Common;
using LittleTripMemo.Repository.Core;
using LittleTripMemo.Services;

/// <summary>法的文書（規約・ポリシー等）を差分取得するサービス</summary>
public class GetLegalConfigsService(
    UserContext user,
    CoreConfigRepository coreRepo
) : _BaseService(user)
{
    public record LegalCheckItem(string key, DateTime? last_sync_tim);
    public record LegalResultItem(string key, string? value, DateTime update_tim);
    public record GetLegalConfigsReq(IEnumerable<LegalCheckItem> items);
    public record Response(IEnumerable<LegalResultItem> results);

    public async Task<Response> ExecuteAsync(GetLegalConfigsReq req)
    {
        await ValidateAsync(req);

        // DBから法的文書設定を取得
        var dbConfigs = await coreRepo.GetConfigsByCategoryAsync("LEGAL");

        var results = dbConfigs.Select(db => {
            string key = db.key;
            DateTime dbTim = db.update_tim;
            var clientItem = req.items.FirstOrDefault(i => i.key == key);

            // クライアント側より新しい場合のみ内容を返却
            string? content = (clientItem == null || dbTim > (clientItem.last_sync_tim ?? DateTime.MinValue))
                ? (string)db.value
                : null;
            return new LegalResultItem(key, content, dbTim);
        });

        return new Response(results);
    }

    private async Task ValidateAsync(GetLegalConfigsReq req)
    {
        // 取得処理のため制約なし
        await Task.CompletedTask;
    }

}