using Microsoft.EntityFrameworkCore;
using BE.Models;

namespace BE.Data
{
    public class ShopDbContext : DbContext
    {
        public ShopDbContext(DbContextOptions<ShopDbContext> options)
            : base(options) { }

        public DbSet<Product> Products { get; set; }
    }
}