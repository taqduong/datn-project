using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class FixReviewCascadePath : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Review_User_Product_Order_Unique",
                table: "Reviews");

            migrationBuilder.RenameColumn(
                name: "OrderId",
                table: "Reviews",
                newName: "OrderDetailId");

            migrationBuilder.CreateIndex(
                name: "IX_Review_User_OrderDetail_Unique",
                table: "Reviews",
                columns: new[] { "UserId", "OrderDetailId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_OrderDetailId",
                table: "Reviews",
                column: "OrderDetailId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_OrderDetails_OrderDetailId",
                table: "Reviews",
                column: "OrderDetailId",
                principalTable: "OrderDetails",
                principalColumn: "OrderDetailId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_OrderDetails_OrderDetailId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Review_User_OrderDetail_Unique",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_OrderDetailId",
                table: "Reviews");

            migrationBuilder.RenameColumn(
                name: "OrderDetailId",
                table: "Reviews",
                newName: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Review_User_Product_Order_Unique",
                table: "Reviews",
                columns: new[] { "UserId", "ProductId", "OrderId" },
                unique: true);
        }
    }
}
