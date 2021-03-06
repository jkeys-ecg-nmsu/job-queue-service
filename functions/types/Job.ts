declare type Job = {
    url: string
    status: JobStatus
    response?: string //will be stored in DynamoDB as a string, of some encoding
    updatedAt: string
    createdAt: string
};