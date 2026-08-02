
namespace LittleTripMemo.Services;

/// <summary>
/// サービス層専用の補助処理をまとめたユーティリティクラス。
/// ・画面（Controller）からは直接使用しない
/// ・リポジトリ（DB層）にも依存しない
/// ・ユースケース（Service）内でのみ使用される
/// </summary>
public static class ServiceUtilities
{
    #region Sanitize(現在は非推奨)

    /// <summary>
    /// URL文字列を正規化します。
    /// </summary>
    /// <param name="url"></param>
    /// <param name="maxLength"></param>
    /// <returns></returns>
    public static string? NormalizeUrl(string? url, int maxLength = 2000)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;

        // 前後の空白、および不可視の制御文字（タブ、改行等）を除去
        var normalized = new string(url.Where(c => !char.IsControl(c)).ToArray()).Trim();

        // 念のための最終切り詰め
        if (normalized.Length > maxLength)
            normalized = normalized.Substring(0, maxLength);

        return normalized;
    }

    #endregion

    #region Base64 Encode / Decode

    /// <summary>
    /// 復号化
    /// </summary>
    public static int DecodeId(string? encodedId)
    {
        if (string.IsNullOrEmpty(encodedId)) return 0;

        try
        {
            // 1. 反転を戻す
            char[] charArray = encodedId.ToCharArray();
            Array.Reverse(charArray);
            string reversed = new string(charArray);

            // 2. Base64のパディング(=)を補完（4の倍数にする）
            int mod4 = reversed.Length % 4;
            if (mod4 > 0)
            {
                reversed += new string('=', 4 - mod4);
            }

            // 3. Base64デコードして数値に戻す
            byte[] data = Convert.FromBase64String(reversed);
            string decodedString = System.Text.Encoding.UTF8.GetString(data);

            return int.Parse(decodedString);
        }
        catch
        {
            // 不正な文字列が送られてきた場合は安全に0を返す
            return 0;
        }
    }

    #endregion
}

