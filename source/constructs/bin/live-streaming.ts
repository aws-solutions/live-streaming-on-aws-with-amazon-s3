#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { LiveStreaming } from '../lib/live-streaming';

const app = new cdk.App();
new LiveStreaming(app, 'LiveStreaming');
