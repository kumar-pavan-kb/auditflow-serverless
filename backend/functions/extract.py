import json
import uuid

def lambda_handler(event, context):
    # If triggered by API/Step Functions, get the uploaded file name
    file_key = event.get('file_key', 'demo-invoice.pdf')
    document_id = str(uuid.uuid4())
    
    # Simulating data extraction from the document
    extracted_data = {
        "invoice_amount": 1250.00,
        "vendor_name": "Acme Corp",
        "date": "2026-11-13"
    }
    
    return {
        "document_id": document_id,
        "file_key": file_key,
        "extraction_status": "SUCCESS",
        "data": extracted_data
    }