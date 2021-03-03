import * as cdk from '@aws-cdk/core';
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as sqs from '@aws-cdk/aws-sqs';
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as lambda from "@aws-cdk/aws-lambda";

export class JobQueueServiceStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //create the SQS that the acceptor will access
    const queue = new sqs.Queue(this, "active-fetch-jobs");

    //create the lambda
    const apiHandler = new lambda.Function(this, 'job-handler', {
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset('functions/job-queue')
    });

    //create the API Gateway that will front the service
    const api = new apigateway.LambdaRestApi(this, 'fetch-jobs', {
      restApiName: 'Job Service',
      description: 'asynchronously accept jobs and retrieve the results',
      handler: apiHandler
    });

    //create the resource for the path, e.g. POST base-url.com/{id} 
    const jobIdResource = api.root.addResource("{id}");

    //and the table that will store the status of jobs
    const table = new dynamodb.Table(this, 'active-jobs', {
      partitionKey: {
        name: 'url',
        type: dynamodb.AttributeType.STRING
      },
      tableName: 'active-jobs'
    });
  }
}
