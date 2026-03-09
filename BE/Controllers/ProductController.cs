using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Data;

namespace BE.Controllers
{
    [Route("api/products")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly ShopDbContext _context;

        public ProductController(ShopDbContext context)
        {
            _context = context;
        }

        // GET: api/products
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts()
        {
            var products = await _context.Products
                .Include(p => p.Category)
                .ToListAsync();

            var result = products.Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                Price = p.Price,
                Discount = p.Discount,
                Description = p.Description,
                ImageUrl = p.ImageUrl,
                Stock = p.Stock,
                PriceAfterDiscount = p.Discount.HasValue
                    ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                    : p.Price,
                CategoryId = p.CategoryId,
                CategoryName = p.Category != null ? p.Category.Name : null,
                CreatedAt = p.CreatedAt
            });

            return Ok(result);
        }

        // GET: api/products/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var dto = await _context.Products
                .Where(p => p.Id == id)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Discount = p.Discount,
                    Price = p.Price,
                    PriceAfterDiscount = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price,
                    Stock = p.Stock,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl,
                    CreatedAt = p.CreatedAt
                })
                .FirstOrDefaultAsync();

            return dto is null ? NotFound() : Ok(dto);
        }

        // POST: api/products
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProductCreateDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId);
            if (!categoryExists)
                return BadRequest(new { message = "CategoryId không hợp lệ." });

            var product = new Product
            {
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                Stock = dto.Stock,
                CategoryId = dto.CategoryId,
                Discount = dto.Discount,
                ImageUrl = dto.ImageUrl,
                CreatedAt = DateTime.Now
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            var result = await _context.Products
                .Where(p => p.Id == product.Id)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    Discount = p.Discount,
                    PriceAfterDiscount = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price,
                    Stock = p.Stock,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl,
                    CreatedAt = p.CreatedAt
                })
                .FirstAsync();

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        // PUT: api/products/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ProductUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var product = await _context.Products.FindAsync(id);
            if (product == null)
                return NotFound();

            if (dto.CategoryId.HasValue && dto.CategoryId.Value != product.CategoryId)
            {
                var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId.Value);
                if (!categoryExists)
                    return BadRequest(new { message = "CategoryId không hợp lệ." });

                product.CategoryId = dto.CategoryId.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                product.Name = dto.Name;

            if (dto.Description != null)
                product.Description = dto.Description;

            if (dto.Price.HasValue)
                product.Price = dto.Price.Value;

            if (dto.Stock.HasValue)
                product.Stock = dto.Stock.Value;

            if (dto.Discount.HasValue)
                product.Discount = dto.Discount.Value;

            if (!string.IsNullOrWhiteSpace(dto.ImageUrl))
                product.ImageUrl = dto.ImageUrl;

            await _context.SaveChangesAsync();

            var result = await _context.Products
                .Where(p => p.Id == id)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    Discount = p.Discount,
                    PriceAfterDiscount = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price,
                    Stock = p.Stock,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl,
                    CreatedAt = p.CreatedAt
                })
                .AsNoTracking()
                .FirstAsync();

            return Ok(result);
        }

        // DELETE: api/products/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id);
            if (product == null)
                return NotFound();

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa sản phẩm thành công." });
        }

        // GET: api/products/categories/1
        [HttpGet("categories/{id}")]
        public async Task<IActionResult> GetProductsByCategory(int id)
        {
            var products = await _context.Products
                .Where(p => p.CategoryId == id)
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    Discount = p.Discount,
                    PriceAfterDiscount = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price,
                    Stock = p.Stock,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return Ok(products);
        }

        // GET: api/products/search?keyword=ao
        [HttpGet("search")]
        public async Task<IActionResult> Search(string keyword)
        {
            if (string.IsNullOrWhiteSpace(keyword))
                return BadRequest(new { message = "Từ khóa không hợp lệ." });

            var results = await _context.Products
                .Where(p => p.Name.Contains(keyword))
                .Select(p => new ProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    Price = p.Price,
                    Discount = p.Discount,
                    PriceAfterDiscount = p.Discount.HasValue
                        ? Math.Round(p.Price * (1 - (decimal)p.Discount.Value / 100), 0)
                        : p.Price,
                    Stock = p.Stock,
                    CategoryId = p.CategoryId,
                    CategoryName = p.Category.Name,
                    ImageUrl = p.ImageUrl,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();

            return Ok(results);
        }

        public class ProductDto
        {
            public int Id { get; set; }
            public required string Name { get; set; }
            public decimal Price { get; set; }
            public string? Description { get; set; }
            public string? ImageUrl { get; set; }
            public int Stock { get; set; }
            public int? Discount { get; set; }
            public decimal PriceAfterDiscount { get; set; }
            public int CategoryId { get; set; }
            public string? CategoryName { get; set; }
            public DateTime CreatedAt { get; set; }
        }

        public class ProductCreateDto
        {
            public required string Name { get; set; }
            public decimal Price { get; set; }
            public string? Description { get; set; }
            public string? ImageUrl { get; set; }
            public int Stock { get; set; }
            public int? Discount { get; set; }
            public int CategoryId { get; set; }
        }

        public class ProductUpdateDto
        {
            public string? Name { get; set; }
            public decimal? Price { get; set; }
            public string? Description { get; set; }
            public string? ImageUrl { get; set; }
            public int? Stock { get; set; }
            public int? Discount { get; set; }
            public int? CategoryId { get; set; }
        }
    }
}