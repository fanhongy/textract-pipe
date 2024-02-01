import { Stack, Duration, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { Function, Runtime, Code, } from 'aws-cdk-lib/aws-lambda';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Role, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class TextractPipeStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Define a S3 bucket for upload the document
    const documentBucket = new Bucket(this, 'textractBucket', {
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY,
    });


    // define a Lambda function execution role with permission to log in CloudWatch, run DetectText api and AnalyzeDoc
    const textractRole = new Role(this, 'textractRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });

    textractRole.addToPolicy(new PolicyStatement({
      resources: ['*'],
      actions: ['logs:*'],
      effect: Effect.ALLOW,
    }));

    textractRole.addToPolicy(new PolicyStatement({
      resources: ['*'],
      actions: ['textract:*'],
      effect: Effect.ALLOW,
    }));

    textractRole.addToPolicy(new PolicyStatement({
      resources: ['*'],
      actions: ['s3:*'],
      effect: Effect.ALLOW,
    }));

    // Define the DDB that will store the response from lambda function
    const textractTable = new Table(this, 'textractTable', {
      partitionKey: { name: 'documentId', type: AttributeType.STRING },
    });

    // Define a lambda function that triggers a document analysis in textract
    const textractLambda = new Function(this, 'textractFunction', {
      runtime: Runtime.PYTHON_3_10,
      handler: 'app.lambda_handler',
      timeout: Duration.minutes(5),
      code: Code.fromAsset('lambda'),
      role: textractRole,
      environment: {
        S3_BUCKET_NAME: documentBucket.bucketName,
        DDB_TABLE_NAME: textractTable.tableName,
      },
    });

    textractTable.grantWriteData(textractLambda)

    // Define the event that tirggers the lambda while the document is uploaded
    documentBucket.addEventNotification(EventType.OBJECT_CREATED, new LambdaDestination(textractLambda));

    // define the output with S3 bucket name for upload
    new CfnOutput(this, 'textractBucketOutput', { value: documentBucket.bucketName });

  }
}
