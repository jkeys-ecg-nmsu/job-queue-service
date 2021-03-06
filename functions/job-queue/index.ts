import { APIGatewayProxyEvent } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import moment from 'moment';

function buildResponse(statusCode: number, body: ResponseBody | null) {
    const _body = body ? JSON.stringify(body) : JSON.stringify({});
    
    return {
        statusCode,
        body: _body,
    }
};

const docClient = new AWS.DynamoDB.DocumentClient({region: 'us-east-1'});
const sqs = new AWS.SQS({region: 'us-east-1'});

async function startJob(job: Job) {
    const params : AWS.SQS.SendMessageRequest = {
        MessageBody: JSON.stringify(job),
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/888601200923/JobQueueServiceStack-activefetchjobsE85F2D4D-14ZZHODKVJTS7'
    }

    return sqs.sendMessage(params).promise();
};

const ApplicationConstants = {
    tableName: 'active-jobs',
}

exports.handler = async (event : APIGatewayProxyEvent) => {
    try {
        console.log('event: ', JSON.stringify(event));
        const { body, path, httpMethod, queryStringParameters } = event;
    
        if(!queryStringParameters || !queryStringParameters.url) {
            return buildResponse(400, { errorMessage: 'malformed request, please send the URL to fetch as an encoded query parameter: url=myurl.com'})
        }
    
        const { url } = queryStringParameters;
    
        //handle retrieving the results, or return 202 Accepted or 404 Not Found
        if(httpMethod === 'GET') {
            //lookup in DynamoDB
            const { Item } = await docClient.get({
                TableName: ApplicationConstants.tableName,
                Key: {
                    url
                }
            }).promise();
    
            //if job.status === Ready, then return job.response 
            if(Item) {
                if(Item.status === 'Ready') {
                    return buildResponse(404, Item.response);
                } else {
                    return buildResponse(200, { message: 'Processing'})
                }
            } else {
                return buildResponse(404, { errorMessage: 'resource not found'});
            }
        } else if(httpMethod === 'POST') {
            const now = moment();
            const newJob: Job = {
                url,
                status: 'Accepted',
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            }
    
            //lookup in DynamoDB
            const { Item } = await docClient.get({
                TableName: ApplicationConstants.tableName,
                Key: {
                    url
                }
            }).promise();
    
            //if it exists, check if it has been requested in the last hour
            if(Item) {
                const job = Item as Job;
                const { status, createdAt } = job;
                const created = moment(createdAt);
                const expired = moment(createdAt).add(1, 'h');
    
                if(now.isBetween(created, expired)) {
                    return buildResponse(200, { message: 'Request created within the last hour (skipped fetch)'});
                }
    
                if(status === 'Processing') {
                    return buildResponse(202, { message: 'still processing. Grab some coffee!' });
                }
            } 
    
            await docClient.put({ 
                TableName: ApplicationConstants.tableName, 
                Item: newJob 
            }).promise();
    
            //send to SQS
            await startJob(newJob);
    
            return buildResponse(202, { message: 'Accepted'});
        } else {
            return buildResponse(400, { errorMessage: 'this endpoint only accepts GET and POST'});
        };
    } catch(e) {
        console.log("error: ", e);
        return buildResponse(400, { errorMessage: 'something went wrong'});
    }
};