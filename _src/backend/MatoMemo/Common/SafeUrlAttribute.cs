using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace LittleTripMemo.Common;

/// <summary>
/// 安全なURL形式であることを検証するアノテーション。
/// XSS（javascript:等）を遮断し、プロトコルを制限する。
/// </summary>
public class SafeUrlAttribute : ValidationAttribute
{
    private readonly int _maxLength;
    private static readonly Regex SafeUrlRegex = new(
        @"^(https?):\/\/[^\s/$.?#].[^\s]*$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public SafeUrlAttribute(int maxLength = 2000)
    {
        _maxLength = maxLength;
    }

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        var url = value as string;
        if (string.IsNullOrWhiteSpace(url)) return ValidationResult.Success;

        // 1. 文字数チェック
        if (url.Length > _maxLength)
            return new ValidationResult($"URLは{_maxLength}文字以内で入力してください。");

        // 2. 形式・プロトコルチェック
        if (!SafeUrlRegex.IsMatch(url))
            return new ValidationResult("無効なURL形式、または許可されていないプロトコルです。");

        // 3. XSS / 危険なスキームの拒否
        string lowerUrl = url.ToLower();
        if (lowerUrl.Contains("javascript:") || lowerUrl.Contains("data:") || lowerUrl.Contains("vbscript:"))
            return new ValidationResult("セキュリティ上の理由により、このURLは許可されません。");

        return ValidationResult.Success;
    }

}