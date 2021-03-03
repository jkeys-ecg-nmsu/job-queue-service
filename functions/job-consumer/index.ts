import { SQSEvent } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import axios from 'axios';

const docClient = new AWS.DynamoDB.DocumentClient({region: 'us-east-1' });

exports.handler = async (event : SQSEvent) => {
    for(const record of event.Records) {
        try {
            const { messageId, body} = record;
    
            const parsed = JSON.parse(body) as Job;
            
            const { url } = parsed;

            //set the status of the request to Processing
            await docClient.update({
                TableName: 'active-jobs',
                Key: {
                    url
                },
                UpdateExpression: 'SET #status = :proc',
                ExpressionAttributeNames: {
                    '#status' : 'status'
                },
                ExpressionAttributeValues: {
                    ':proc' : 'Processing'
                }
            }).promise();
    
            const response = await axios.get(url);
            const { data } = response;
    
            if(!data) {
                console.error('something went wrong, reprocess this (TODO)');
                continue;
            }
    
            console.log('data: ', data);
    
            await docClient.put({
                TableName: 'active-jobs',
                Item: {
                    ...parsed,
                    updatedAt: new Date().toISOString(),
                    response: data,
                    status: 'Ready'
                }
            }).promise().catch(e => {
                console.error('something went wrong updating DynamoDB, reprocess this (TODO)')
            });
        } catch(e) {
            console.error(`error: `, e);
        }
    }

    return 'success';
};