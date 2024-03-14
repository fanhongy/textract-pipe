#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TextractPipeStack } from '../lib/textract-pipe-stack';

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "ap-southeast-2" 
};
new TextractPipeStack(app, 'TextractPipeStack', { env: env});