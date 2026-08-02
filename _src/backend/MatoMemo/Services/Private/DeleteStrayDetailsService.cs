using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Private;

/// <summary>未まとめ明細（archive_id=0）を削除するサービス</summary>
public class DeleteStrayDetailsService(
    UserContext userContext,
    ITransactionProvider provider,
    DetailRepository detailRepo
) : _BaseService(userContext)
{
    public record DeleteStrayDetailsReq(
        [Required] Guid login_user_id,
        [Required(ErrorMessage = "削除対象のseqリストは必須です")] long[] seqs
    ) : ILoginUserRequest;

    public record Response(int deletedCount);

    /// <summary>選択された未まとめ明細の論理削除を実行</summary>
    public async Task<Response> ExecuteAsync(DeleteStrayDetailsReq req)
    {
        await ValidateAsync(req);

        using var tran = provider.BeginTransaction();
        try
        {
            var count = await detailRepo.DeleteStrayBySeqsAsync(req.seqs);
            tran.Commit();
            return new Response(count);
        }
        catch
        {
            throw;
        }
    }

    private async Task ValidateAsync(DeleteStrayDetailsReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.seqs.Length == 0, "削除対象が選択されていません。");
        await Task.CompletedTask;
    }

}