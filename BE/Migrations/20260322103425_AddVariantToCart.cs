using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class AddVariantToCart : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProductVariantId",
                table: "Carts",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VariantId",
                table: "Carts",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Carts_ProductVariantId",
                table: "Carts",
                column: "ProductVariantId");

            migrationBuilder.AddForeignKey(
                name: "FK_Carts_ProductVariants_ProductVariantId",
                table: "Carts",
                column: "ProductVariantId",
                principalTable: "ProductVariants",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Carts_ProductVariants_ProductVariantId",
                table: "Carts");

            migrationBuilder.DropIndex(
                name: "IX_Carts_ProductVariantId",
                table: "Carts");

            migrationBuilder.DropColumn(
                name: "ProductVariantId",
                table: "Carts");

            migrationBuilder.DropColumn(
                name: "VariantId",
                table: "Carts");
        }
    }
}
