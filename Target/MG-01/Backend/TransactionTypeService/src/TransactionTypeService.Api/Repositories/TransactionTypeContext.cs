using Microsoft.EntityFrameworkCore;
using TransactionTypeService.Api.Models;

namespace TransactionTypeService.Api.Repositories;

public class TransactionTypeContext : DbContext
{
    public TransactionTypeContext(DbContextOptions<TransactionTypeContext> options) : base(options) { }

    public DbSet<TransactionType> TransactionTypes { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TransactionType>(entity =>
        {
            entity.ToTable("TRANSACTION_TYPE");
            entity.HasKey(e => e.TypeCode);
            entity.Property(e => e.TypeCode).HasColumnName("TR_TYPE").HasMaxLength(2).IsFixedLength();
            entity.Property(e => e.Description).HasColumnName("TR_DESCRIPTION").HasMaxLength(50).IsRequired();
        });
    }
}
