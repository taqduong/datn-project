using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class FixCartVariantKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.CreateIndex(
                name: "IX_Carts_VariantId",
                table: "Carts",
                column: "VariantId");

            migrationBuilder.AddForeignKey(
                name: "FK_Carts_ProductVariants_VariantId",
                table: "Carts",
                column: "VariantId",
                principalTable: "ProductVariants",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Carts_ProductVariants_VariantId",
                table: "Carts");

            migrationBuilder.DropIndex(
                name: "IX_Carts_VariantId",
                table: "Carts");

            migrationBuilder.AddColumn<int>(
                name: "ProductVariantId",
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
    }
}
