#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { JobQueueServiceStack } from '../lib/job-queue-service-stack';

const app = new cdk.App();
new JobQueueServiceStack(app, 'JobQueueServiceStack');
