using LittleTripMemo.Common;
using LittleTripMemo.Exceptions;
using LittleTripMemo.Models;
using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using System.ComponentModel.DataAnnotations;

namespace LittleTripMemo.Services.Private;

/// <summary>
/// 複数の未まとめ明細を統合し、新しいアーカイブ（まとめ）を作成するサービス
/// </summary>
public class MergeDetailsService(
    UserContext userContext,
    ITransactionProvider transactionProvider,
    ArchiveRepository archiveRepository,
    DetailRepository detailRepository
) : _BaseService(userContext)
{
    public record MergeDetailsReq(
        [Required] Guid login_user_id,
        [Required(ErrorMessage = "対象の明細が選択されていません")] long[] seqs,
        string? title
    ) : ILoginUserRequest;

    public record Response(int archiveId);

    /// <summary>
    /// アーカイブを新規作成し、指定された明細を紐付ける
    /// </summary>
    public async Task<Response> ExecuteAsync(MergeDetailsReq req)
    {
        // 1. バリデーション
        await ValidateAsync(req);

        // 2. タイトルの決定
        var archiveTitle = string.IsNullOrWhiteSpace(req.title)
            ? $"旅のまとめのタイトル_{DateTime.Now:_HHmm}"
            : req.title;

        // 3. 実行
        using var transaction = transactionProvider.BeginTransaction();
        try
        {
            // ① アーカイブ（親）を新規登録
            var archiveId = await archiveRepository.InsertAsync(new TMemoArchive
            {
                title = archiveTitle,
                memo = "旅の思い出についての情報を書き込みましょう。",
                link_url = string.Empty
            });

            // ② 明細（子）をアーカイブに紐付ける
            await detailRepository.UpdateArchiveIdBySeqsAsync(archiveId, req.seqs);

            // ③ 件数カウントを更新
            await archiveRepository.UpdateDetailCountAsync(archiveId);

            transaction.Commit();
            return new Response(archiveId);
        }
        catch
        {
            throw;
        }
    }

    private async Task ValidateAsync(MergeDetailsReq req)
    {
        BusinessException.ThrowIf(_user.login_user_id == Guid.Empty, "ログインが必要です");
        BusinessException.ThrowIf(req.seqs == null || req.seqs.Length == 0, "統合する明細が選択されていません");

        await Task.CompletedTask;
    }

}