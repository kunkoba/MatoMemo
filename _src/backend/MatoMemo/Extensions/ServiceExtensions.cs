using LittleTripMemo.Repository;
using LittleTripMemo.Repository.App;
using LittleTripMemo.Repository.Batch;
using LittleTripMemo.Repository.Core;
using LittleTripMemo.Repository.Sys;
using LittleTripMemo.Services.Account;
using LittleTripMemo.Services.Admin;
using LittleTripMemo.Services.Core;
using LittleTripMemo.Services.Private;
using LittleTripMemo.Services.Public;
using LittleTripMemo.Services.Sys;

namespace LittleTripMemo.Extensions;

public static class ServiceExtensions
{
    /// <summary>
    /// リポジトリ（DB操作層）の一括登録
    /// </summary>
    public static IServiceCollection AddAppInfrastructure(this IServiceCollection services)
    {
        // App / Infrastructure
        services.AddScoped<AppUserRepository>();
        services.AddScoped<ArchiveRepository>();
        services.AddScoped<DetailRepository>();
        services.AddScoped<ArchivePubRepository>();
        services.AddScoped<DetailPubRepository>();
        services.AddScoped<ReactionPubRepository>();
        services.AddScoped<CountQueueRepository>();

        // Sys / Core
        services.AddScoped<SysFeedbackRepository>();
        services.AddScoped<SysNotificationRepository>();
        services.AddScoped<SysReportRepository>();
        services.AddScoped<SysUserNotificationRepository>();
        services.AddScoped<TableStatisticsRepository>();
        services.AddScoped<CoreConfigRepository>();
        services.AddScoped<SysUserHistoryRepository>();
        services.AddScoped<AppInfoRepository>();

        // Batch (Worker用)
        services.AddScoped<TableStatisticsTaskRepository>();
        services.AddScoped<CountQueueTaskRepository>();

        return services;
    }

    /// <summary>
    /// 業務サービス（ロジック層）の一括登録
    /// </summary>
    public static IServiceCollection AddAppBusinessServices(this IServiceCollection services)
    {
        // Account
        services.AddScoped<RegistrationUserService>();
        services.AddScoped<UpdateUserProfileService>();
        services.AddScoped<GetUserProfileService>();
        services.AddScoped<EnsureLoginUserService>();
        services.AddScoped<WithdrawalUserService>();

        // Private
        services.AddScoped<GetUnMergeDetailsService>();
        services.AddScoped<GetArchiveDetailsService>();
        services.AddScoped<GetArchiveListService>();
        services.AddScoped<MergeDetailsService>();
        services.AddScoped<AddDetailsService>();
        services.AddScoped<UpdateArchiveService>();
        services.AddScoped<DeleteArchiveService>();
        services.AddScoped<DeleteStrayDetailsService>();
        services.AddScoped<DetachDetailsService>();
        services.AddScoped<BulkSyncDetailsService>();
        services.AddScoped<PublishArchiveService>();
        services.AddScoped<UpdateDetailService>();
        services.AddScoped<RecreatePublicArchiveService>(); 

        // Public
        services.AddScoped<GetArchiveDetailsPubService>();
        services.AddScoped<SearchByLocationPubService>();
        services.AddScoped<UnpublishArchiveService>();
        services.AddScoped<OpenArchiveService>();
        services.AddScoped<CloseArchiveService>();
        services.AddScoped<UpdateArchivePubService>();
        services.AddScoped<UpdateDetailPubService>();
        services.AddScoped<BulkSyncReactionService>();
        services.AddScoped<AddCountQueueService>();
        services.AddScoped<OpenLimitedArchiveService>();
        services.AddScoped<GetArchiveListByIdsService>();
        services.AddScoped<GetArchiveListByUserService>();

        // Sys
        services.AddScoped<GetSystemInfoService>();
        services.AddScoped<UpsertFeedbackService>();
        services.AddScoped<GetMyFeedbackService>();
        services.AddScoped<UpsertReportService>();
        services.AddScoped<GetMyReportService>();
        services.AddScoped<DeleteMyReportService>();
        services.AddScoped<GetMyUserNotificationsService>();

        // Admin
        services.AddScoped<GetAdminAllInfoService>();
        services.AddScoped<GetAllFeedbackService>();
        services.AddScoped<UpsertNotificationService>();
        services.AddScoped<SendUserNotificationService>();
        services.AddScoped<GetReportSummaryService>();
        services.AddScoped<GetAdminNotificationsService>();
        services.AddScoped<GetSentUserMailListService>();
        services.AddScoped<GetReportDetailsService>();
        services.AddScoped<AdminCloseArchivePubService>();
        services.AddScoped<AdminUnpublishArchiveService>();
        services.AddScoped<UpdateUserBanStatusService>();
        services.AddScoped<GetUserHistoryService>();
        services.AddScoped<GetShadowBanUsersService>();

        // Core (System Config)
        services.AddScoped<GetCoreConfigService>();  
        services.AddScoped<UpdateCoreConfigService>();
        services.AddScoped<GetLegalConfigsService>();
        services.AddScoped<UpdateLegalConfigService>();

        return services;
    }

}