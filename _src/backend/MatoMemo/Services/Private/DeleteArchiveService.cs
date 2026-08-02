using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Private;

/// <summary>まとめ削除（解除）ユースケース</summary>
public class DeleteArchiveService(
    UserContext userContext,
    ITransactionProvider provider,
    ArchiveRepository archiveRepo,
    DetailRepository detailRepo
) : _BaseService(userContext)
{
    public record DeleteArchiveReq(
        [Required] Guid login_user_id,
        [Required(ErrorMessage = "アーカイブIDは必須です")] int archive_id
    ) : ILoginUserRequest;

    public record Response(bool is_success, string message);

    /// <summary>所有権を確認し、まとめを解体（明細はarchive_id=0へ戻す）</summary>
    public async Task<Response> ExecuteAsync(DeleteArchiveReq req)
    {
        await ValidateAsync(req);

        using var tran = provider.BeginTransaction();
        try
        {
            var archive = await archiveRepo.GetByKeyAsync(req.archive_id);
            BusinessException.ThrowIf(archive == null || archive.user_id != _user.login_user_id,
                "対象のデータが見つからないか、権限がありません。");

            await detailRepo.ReleaseArchiveIdAsync(req.archive_id);
            await archiveRepo.DeletePhysicalByKeyAsync(req.archive_id);

            tran.Commit();
            return new Response(true, "まとめを解除しました。");
        }
        catch
        {
            throw;
        }
    }

    private async Task ValidateAsync(DeleteArchiveReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.archive_id <= 0, "無効なアーカイブIDです");
        await Task.CompletedTask;
    }

}
