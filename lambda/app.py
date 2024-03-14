import boto3
import os
from decimal import Decimal
import json

textract = boto3.client('textract')
dynamodb = boto3.resource('dynamodb')

S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')
DDB_TABLE_NAME = os.getenv('DDB_TABLE_NAME')

def lambda_handler(event, context):
    # get the object key from the event
    object_key = event['Records'][0]['s3']['object']['key']

    # detect the text in the document
    text = detect_text(S3_BUCKET_NAME, object_key)
    text_id = text['ResponseMetadata']['RequestId']

    text = json.loads(json.dumps(text), parse_float=Decimal)

    # analyze the document
    analysis = analyze_doc(S3_BUCKET_NAME, object_key)
    analysis_id = analysis['ResponseMetadata']['RequestId']
    analysis = json.loads(json.dumps(analysis), parse_float=Decimal)

    # save the result to DynamoDB
    result = {
        'documentId': text_id,
        'text': text,
    }
    save_to_ddb(result)

    result = {
        'documentId': analysis_id,
        'analysis': analysis,
    }
    save_to_ddb(result)

# function to detect the text
def detect_text(bucket, key):
    try:
        response = textract.detect_document_text(
            Document={
                'S3Object': {
                    'Bucket': bucket,
                    'Name': key
                }
            }
        )
        return response
    except Exception as e:
        print(f"Error: {e}")
        pass

# function to analyze the document
def analyze_doc(bucket, key):
    try:
        response = textract.analyze_document(
            Document={
                'S3Object': {
                    'Bucket': bucket,
                    'Name': key
                }
            },
            FeatureTypes=['TABLES', 'FORMS', ]
        )
        return response
    except Exception as e:
        print(f"Error: {e}")
        pass


# function to save the result to DynamoDB
def save_to_ddb(result):
    # get the table
    table = dynamodb.Table(DDB_TABLE_NAME)

    # save the result to DynamoDB
    table.put_item(Item=result)

    print(f"Result saved to DynamoDB: {result}")
    return result
