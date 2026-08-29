namespace LittleTripMemo.Common
{
    public interface IAppRecord
    {
        Guid user_id { get; set; }
        bool is_owner { get; set; }
        bool is_public { get; set; }
    }

    /// <summary>
    /// ユーザIDチェック用
    /// </summary>
    public interface ILoginUserRequest
    {
        // JSから送られてくる login_user_id と一致させる
        Guid login_user_id { get; }
    }

}
