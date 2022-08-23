import boto3

def _handler(event, context):
    s3 = boto3.client("s3")
