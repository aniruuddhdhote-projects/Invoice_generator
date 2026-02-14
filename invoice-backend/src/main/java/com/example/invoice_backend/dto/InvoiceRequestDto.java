package com.example.invoice_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class InvoiceRequestDto {

    @NotBlank(message = "Invoice number is required")
    private String invoiceNumber;

    @NotBlank(message = "Invoice date is required")
    private String invoiceDate;

    @NotBlank(message = "Customer name is required")
    private String toName;

    @NotNull(message = "Total amount is required")
    private Double total;

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }
    public String getInvoiceDate() { return invoiceDate; }
    public void setInvoiceDate(String invoiceDate) { this.invoiceDate = invoiceDate; }
    public String getToName() { return toName; }
    public void setToName(String toName) { this.toName = toName; }
    public Double getTotal() { return total; }
    public void setTotal(Double total) { this.total = total; }
}

