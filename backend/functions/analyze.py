def lambda_handler(event, context):
    # event is the direct output from extract.py
    extracted_data = event.get('data', {})
    amount = extracted_data.get('invoice_amount', 0)
    
    compliance_status = "APPROVED"
    audit_notes = "Auto-approved. Within standard limits."
    
    # Apply business compliance logic
    if amount > 1000.00:
        compliance_status = "FLAGGED_FOR_REVIEW"
        audit_notes = "Invoice exceeds $1,000 threshold. Manual approval required."
        
    # Append the analysis results to the payload
    event['compliance_status'] = compliance_status
    event['audit_notes'] = audit_notes
    
    return event