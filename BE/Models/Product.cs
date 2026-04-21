using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BE.Models;

[Index(nameof(CategoryId), Name = "IX_Products_CategoryId")]
public partial class Product
{
    [Key]
    public int Id { get; set; }

    [Required]
    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [Column(TypeName = "nvarchar(max)")]
    public string? Description { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    public int Stock { get; set; }

    public int CategoryId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    public int? Discount { get; set; }

    [StringLength(500)]
    [Unicode(false)]
    public string? ImageUrl { get; set; }

    [InverseProperty("Product")]
    public virtual ICollection<Cart> Carts { get; set; } = new List<Cart>();

    [ForeignKey(nameof(CategoryId))]
    public virtual Category Category { get; set; } = null!;

    [InverseProperty("Product")]
    public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();

    [InverseProperty("Product")]
    public virtual ICollection<Wishlist> Wishlists { get; set; } = new List<Wishlist>();

    [InverseProperty("Product")]
    public virtual ProductAnalytics? ProductAnalytics { get; set; }

    [InverseProperty("Product")]
    public virtual ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();

    [InverseProperty("Product")]
    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    [InverseProperty("Product")]
    public virtual ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();

    [InverseProperty("Product")]
    public virtual ICollection<UserActivity> UserActivities { get; set; } = new List<UserActivity>();
}