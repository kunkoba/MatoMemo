namespace LittleTripMemo.Common
{
    public interface IAppRecord
    {
        Guid user_id { get; set; }
        bool is_owner { get; set; }
        bool is_public { get; set; }
    }

}
