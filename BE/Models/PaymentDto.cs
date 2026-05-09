namespace BE.Models
{
    // Data Transfer Object (DTO) tiếp nhận payload từ Client
    public class PaymentInformationModel
    {
        public int OrderId { get; set; }
        public double Amount { get; set; } 
        public string OrderDescription { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }

    // Trả cái Link URL thanh toán về cho Frontend
    public class PaymentResponseModel
    {
        public bool Success { get; set; }
        public string PaymentMethod { get; set; } = string.Empty;
        public string OrderDescription { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public string PaymentId { get; set; } = string.Empty;
        public string TransactionId { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string VnPayResponseCode { get; set; } = string.Empty;
        public string PaymentUrl { get; set; } = string.Empty; // Thuộc tính lưu trữ URL của Cổng thanh toán
    }
}