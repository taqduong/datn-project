using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Data;

public partial class ShopDbContext : DbContext
{
    public ShopDbContext(DbContextOptions<ShopDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Cart> Carts { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderDetail> OrderDetails { get; set; }

    public virtual DbSet<Wishlist> Wishlists { get; set; }

    public virtual DbSet<ProductAnalytics> ProductAnalytics { get; set; }

    public virtual DbSet<ProductImage> ProductImages { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(entity =>
        {
            entity.Property(e => e.ImageUrl).HasDefaultValue("");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()");
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()");
        });

        modelBuilder.Entity<Cart>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.Property(e => e.OrderDate).HasDefaultValueSql("GETDATE()");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}