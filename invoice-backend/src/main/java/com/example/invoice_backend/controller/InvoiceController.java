package com.example.invoice_backend.controller;

import com.example.invoice_backend.model.InvoiceRecord;
import com.example.invoice_backend.repository.InvoiceRecordRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    @Autowired
    private InvoiceRecordRepository invoiceRecordRepository;

 

    @PostMapping
    public InvoiceRecord createInvoice(@RequestBody Map<String, Object> payload) throws Exception {

        InvoiceRecord record = new InvoiceRecord();

        // ✅ correct keys from frontend
        record.setInvoiceNumber((String) payload.get("invoiceNumber"));
        record.setInvoiceDate((String) payload.get("invoiceDate"));
        record.setCustomerName((String) payload.get("customerName"));

        Object totalAmount = payload.get("totalAmount");
        if (totalAmount != null) {
            record.setTotalAmount(Double.valueOf(totalAmount.toString()));
        }

        // ✅ store FULL invoice JSON
        record.setContentJson((String) payload.get("contentJson"));

        return invoiceRecordRepository.save(record);
    }

    @GetMapping
    public List<InvoiceRecord> getAllInvoices() {
        return invoiceRecordRepository.findAll();
    }

    @GetMapping("/{id}")
    public InvoiceRecord getInvoiceById(@PathVariable Long id) {
        return invoiceRecordRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
    }
}
