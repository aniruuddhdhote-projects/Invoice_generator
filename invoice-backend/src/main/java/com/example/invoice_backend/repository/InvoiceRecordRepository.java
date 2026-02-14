
package com.example.invoice_backend.repository;

import com.example.invoice_backend.model.InvoiceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceRecordRepository
        extends JpaRepository<InvoiceRecord, Long> {

}

