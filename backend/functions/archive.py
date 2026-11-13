import os
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('TABLE_NAME')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    document_id = event.get('document_id')
    
    item = {
        'document_id': document_id,
        'file_key': event.get('file_key'),
        'extraction_status': event.get('extraction_status'),
        'compliance_status': event.get('compliance_status'),
        'audit_notes': event.get('audit_notes'),
        'extracted_data': event.get('data'),
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # Commit the final record to DynamoDB
    table.put_item(Item=item)
    
    return {
        "statusCode": 200,
        "message": f"Document {document_id} archived successfully.",
        "final_status": item['compliance_status']
    }