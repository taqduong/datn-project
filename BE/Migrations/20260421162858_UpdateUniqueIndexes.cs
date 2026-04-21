using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class UpdateUniqueIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_ProductAnalytics_ProductId",
                table: "ProductAnalytics",
                newName: "IX_ProductAnalytics_ProductId_Unique");

            migrationBuilder.CreateIndex(
                name: "IX_Wishlist_User_Product_Unique",
                table: "Wishlist",
                columns: new[] { "UserId", "ProductId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Carts_User_Product_Variant_Unique",
                table: "Carts",
                columns: new[] { "UserId", "ProductId", "VariantId" },
                unique: true,
                filter: "[VariantId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Wishlist_User_Product_Unique",
                table: "Wishlist");

            migrationBuilder.DropIndex(
                name: "IX_Carts_User_Product_Variant_Unique",
                table: "Carts");

            migrationBuilder.RenameIndex(
                name: "IX_ProductAnalytics_ProductId_Unique",
                table: "ProductAnalytics",
                newName: "IX_ProductAnalytics_ProductId");
        }
    }
}
