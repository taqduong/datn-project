using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BE.Models;

public partial class ProductImage
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int ProductId { get; set; }

    [Required]
    [StringLength(500)]
    public string ImageUrl { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [ForeignKey(nameof(ProductId))]
    [InverseProperty("ProductImages")]
    public virtual Product Product { get; set; } = null!;
}