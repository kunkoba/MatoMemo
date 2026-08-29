using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using LittleTripMemo.Models;

namespace LittleTripMemo.DbContext;

// IdentityDbContextを継承することで、ユーザー管理機能が使えるようになります。
// 継承元の型を MyAppUser に書き換えます
public class ApplicationDbContext : IdentityDbContext<MyAppUser, IdentityRole<Guid>, Guid>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ここで、Identityが作るテーブル名を自分好みに変えることもできますが、
        // まずは標準のまま（AspNetUsersなど）進めるのが一番トラブルが少ないです。
    }
}

