/*********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import * as appreg from '@aws-cdk/aws-servicecatalogappregistry-alpha';
import { Construct } from 'constructs';

//Solution construct
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { CachePolicy } from 'aws-cdk-lib/aws-cloudfront';


export class LiveStreaming extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        /**
         * CloudFormation Template Descrption
         */
        const solutionId = 'SO0109'
        const solutionName = 'Live Streaming on AWS with Amazon S3'
        this.templateOptions.description = `(${solutionId}) ${solutionName} Solution %%VERSION%%`;
        /**
         * Cfn Parameters
         */
        const inputType = new cdk.CfnParameter(this, 'InputType', {
            type: 'String',
            description: 'Specify the input type for MediaLive (default parameters are for the demo video).  For details on setting up each input type, see https://docs.aws.amazon.com/solutions/latest/live-streaming-on-aws-with-amazon-s3/appendix-a.html.',
            allowedValues: ['RTP_PUSH', 'RTMP_PUSH', 'URL_PULL', 'INPUT_DEVICE'],
            default: 'URL_PULL'
        });
        const inputDeviceId = new cdk.CfnParameter(this, 'InputDeviceId', {
            type: 'String',
            description: 'Specify the ID for your Elemental Link Input device (please note a Link device can only be attached to one input at a time)',
            default: ''
        });
        const inputCIDR = new cdk.CfnParameter(this, 'InputCIDR', {
            type: 'String',
            description: 'For RTP and RTMP PUSH input types ONLY, specify the CIDR Block for the MediaLive SecurityGroup. Input security group restricts access to the input and prevents unauthorized third parties from pushing content into a channel that is associated with that input.',
            default: ''
        });
        const pullUrl = new cdk.CfnParameter(this, 'PullUrl', {
            type: 'String',
            description: 'For URL PULL input type ONLY, specify the primary source URL, this should be a HTTP or HTTPS link to the stream manifest file.',
            default: 'https://d15an60oaeed9r.cloudfront.net/live_stream_v2/sports_reel_with_markers.m3u8'
        });
        const pullUser = new cdk.CfnParameter(this, 'PullUser', {
            type: 'String',
            description: 'For URL PULL input type ONLY, if basic authentication is enabled on the source stream enter the username',
            default: ''
        });
        const pullPass = new cdk.CfnParameter(this, 'PullPass', {
            type: 'String',
            description: 'For URL PULL input type ONLY, if basic authentication is enabled on the source stream enter the password',
            default: ''
        });
        const encodingProfile = new cdk.CfnParameter(this, 'EncodingProfile', {
            type: 'String',
            description: 'Select an encoding profile. HD 1080p [1920x1080, 1280x720, 960x540, 768x432, 640x360, 512x288] HD 720p [1280x720, 960x540, 768x432, 640x360, 512x288] SD 540p [960x540, 768x432, 640x360, 512x288]  See the implementation guide for details https://docs.aws.amazon.com/solutions/latest/live-streaming/considerations.html',
            default: 'HD-720p',
            allowedValues: ['HD-1080p', 'HD-720p', 'SD-540p']
        });
        const channelStart = new cdk.CfnParameter(this, 'ChannelStart', {
            type: 'String',
            description: 'If your source is ready to stream select true, this wil start the MediaLive Channel as part of the deployment. If you select false you will need to manually start the MediaLive Channel when your source is ready.',
            default: 'No',
            allowedValues: ['Yes', 'No']
        });
        /**
         * Template metadata
         */
        this.templateOptions.metadata = {
            'AWS::CloudFormation::Interface': {
                ParameterGroups: [
                    {
                        Label: { default: 'LIVE STREAM SOURCE' },
                        Parameters: [inputType.logicalId]
                    },
                    {
                        Label: { default: 'URL_PULL CONFIGURATION' },
                        Parameters: [pullUrl.logicalId, pullUser.logicalId, pullPass.logicalId]
                    },
                    {
                        Label: { default: 'RTP_PUSH / RTMP_PUSH CONFIGURATION' },
                        Parameters: [inputCIDR.logicalId]
                    },
                    {
                        Label: { default: 'INPUT_DEVICE CONFIGURATION' },
                        Parameters: [inputDeviceId.logicalId]
                    },
                    {
                        Label: { default: 'ENCODING OPTIONS' },
                        Parameters: [encodingProfile.logicalId, channelStart.logicalId]
                    }
                ],
                ParameterLabels: {
                    InputType: {
                        default: 'Source Input Type'
                    },
                    EncodingProfile: {
                        default: 'Encoding Profile'
                    },
                    InputDeviceId: {
                        default: 'Elemental Link Input Device ID'
                    },
                    InputCIDR: {
                        default: 'Input Security Group CIDR Block (REQUIRED)'
                    },
                    PullUrl: {
                        default: 'Source URL (REQUIRED)'
                    },
                    PullUser: {
                        default: 'Source Username (OPTIONAL)'
                    },
                    pullPass: {
                        default: 'Source Password (REQUIRED)'
                    },
                    ChannelStart: {
                        default: 'Start MediaLive Channel'
                    }
                }
            }
        };
        /**
         * Mapping for sending anonymized metrics to AWS Solution Builders API
         */
        new cdk.CfnMapping(this, 'AnonymizedData', { // NOSONAR
            mapping: {
                SendAnonymizedData: {
                    Data: 'Yes'
                }
            }
        });
        /**
         * AWS Solutions Construct. Creates a S3 bucket frontend by Amazon CloudFront.
         * Construct also includes a logs bucket for the CloudFront distribution and a CloudFront
         * OriginAccessIdentity which is used to restrict access to S3 from CloudFront.
         */
        // Need Unique name for each Cache Policy. 
        const cachePolicyName = `CachePolicy-${cdk.Aws.STACK_NAME}-${cdk.Aws.REGION}`;

        const cachePolicy = new CachePolicy(this, `CachePolicy`, {
            cachePolicyName: cachePolicyName,
            headerBehavior: {
              behavior: 'whitelist',
              headers: ['Origin']
            }
        });

        const distribution = new CloudFrontToS3(this, 'CloudFrontToS3', {
            cloudFrontDistributionProps: {
              defaultBehavior: {
                cachePolicy
              },
              errorResponses: [400, 403, 404, 405, 414, 416, 500, 501, 502, 503, 504].map((httpStatus: number) => {
                return { httpStatus, ttl: cdk.Duration.seconds(1) };
              })
            },
            bucketProps: {
                objectOwnership: s3.ObjectOwnership.OBJECT_WRITER
            },
            loggingBucketProps: {
                objectOwnership: s3.ObjectOwnership.OBJECT_WRITER
            },
            cloudFrontLoggingBucketProps: {
                objectOwnership: s3.ObjectOwnership.OBJECT_WRITER
            },
            insertHttpSecurityHeaders: false
        });

        const bucketMetrics: s3.BucketMetrics = {
            id: 'EntireBucket'
        };
        distribution.s3Bucket?.addMetric(bucketMetrics);

        //cdk_nag
        NagSuppressions.addResourceSuppressions(
            distribution.s3LoggingBucket!,
            [
                {
                    id: 'AwsSolutions-S1',
                    reason: 'Used to store access logs for other buckets'
                }
            ]
        );
        NagSuppressions.addResourceSuppressions(
            distribution.cloudFrontLoggingBucket!,
            [
                {
                    id: 'AwsSolutions-S1',
                    reason: 'Used to store access logs for other buckets'
                }
            ]
        );
        NagSuppressions.addResourceSuppressions(
            distribution.cloudFrontWebDistribution,
            [
              {
                id: 'AwsSolutions-CFR1',
                reason: 'Use case does not warrant CloudFront Geo restriction'
              }, {
                id: 'AwsSolutions-CFR2',
                reason: 'Use case does not warrant CloudFront integration with AWS WAF'
              }, {
                id: 'AwsSolutions-CFR4',
                reason: 'CloudFront automatically sets the security policy to TLSv1 when the distribution uses the CloudFront domain name'
              }
            ],
          );

        /**
         * IAM Roles
         */
        const mediaLiveRole = new iam.Role(this, 'MediaLiveRole', {
            assumedBy: new iam.ServicePrincipal('medialive.amazonaws.com'),
        });
        /**
        * MediaLive needs s3:PutObject access to show thumbnails in the console.
        * It uses an internal bucket but doesn't expose a name for the bucket so we can't restrict by bucket name.
        * https://docs.aws.amazon.com/medialive/latest/ug/thumbnails-enable.html#thumbnails-enable-iam
        */
        const thumbnailPolicyStatement = new iam.PolicyStatement({
            actions: [ 's3:PutObject' ],
            conditions: {
                StringNotEquals: {
                    's3:ResourceAccount': `${cdk.Aws.ACCOUNT_ID}`
                }
            }
        });
        thumbnailPolicyStatement.addAllResources()
        const mediaLivePolicy = new iam.Policy(this, 'mediaLivePolicy', {
            statements: [
                new iam.PolicyStatement({
                    resources: [`arn:aws:s3:::${distribution.s3Bucket?.bucketName}/*`],
                    actions: [
                        's3:ListBucket',
                        's3:PutObject',
                        's3:GetObject',
                        's3:DeleteObject'
                    ],
                    conditions: {
                        StringEquals: {
                            's3:ResourceAccount': `${cdk.Aws.ACCOUNT_ID}`
                        }
                    }
                }),
                thumbnailPolicyStatement,
                new iam.PolicyStatement({
                    resources: [`arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/*`],
                    actions: [
                        'ssm:DescribeParameters',
                        'ssm:GetParameter',
                        'ssm:GetParameters',
                        'ssm:PutParameter'
                    ]
                }),
                new iam.PolicyStatement({
                    resources: [`arn:${cdk.Aws.PARTITION}:mediaconnect:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
                    actions: [
                        'mediaconnect:ManagedDescribeFlow',
                        'mediaconnect:ManagedAddOutput',
                        'mediaconnect:ManagedRemoveOutput'
                    ]
                }),
                new iam.PolicyStatement({
                    resources: [`arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
                    actions: [
                        'ec2:describeSubnets',
                        'ec2:describeNetworkInterfaces',
                        'ec2:createNetworkInterface',
                        'ec2:createNetworkInterfacePermission',
                        'ec2:deleteNetworkInterface',
                        'ec2:deleteNetworkInterfacePermission',
                        'ec2:describeSecurityGroups'
                    ]
                }),
                new iam.PolicyStatement({
                    resources: [`arn:${cdk.Aws.PARTITION}:logs:*:*:*`],
                    actions: [
                        'logs:CreateLogGroup',
                        'logs:CreateLogStream',
                        'logs:PutLogEvents',
                        'logs:DescribeLogStreams',
                        'logs:DescribeLogGroups'
                    ]
                }),
            ]
        });
        mediaLivePolicy.attachToRole(mediaLiveRole);

        //cdk_nag
        NagSuppressions.addResourceSuppressions(
            mediaLivePolicy,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Resource ARNs are not generated at the time of policy creation'
                }
            ]
        );

        /**
         * Custom Resource, Role and Policy.
         */
        const customResourceRole = new iam.Role(this, 'CustomResourceRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
        });

        const customResourcePolicy = new iam.Policy(this, 'CustomResourcePolicy', {
            statements: [
                new iam.PolicyStatement({
                    resources: [`arn:${cdk.Aws.PARTITION}:medialive:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
                    actions: [
                        'medialive:DescribeInputSecurityGroup',
                        'medialive:createInputSecurityGroup',
                        'medialive:describeInput',
                        'medialive:createInput',
                        'medialive:deleteInput',
                        'medialive:stopChannel',
                        'medialive:createChannel',
                        'medialive:deleteChannel',
                        'medialive:deleteInputSecurityGroup',
                        'medialive:describeChannel',
                        'medialive:startChannel',
                        'medialive:createTags',
                        'medialive:deleteTags'
                    ]
                }),
                new iam.PolicyStatement({
                    resources: [`arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/*`],
                    actions: [
                        'ssm:PutParameter'
                    ]
                }),
                new iam.PolicyStatement({
                    resources: [mediaLiveRole.roleArn],
                    actions: ['iam:PassRole']
                }),
                new iam.PolicyStatement({
                    resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/*`],
                    actions: [
                        'logs:CreateLogGroup',
                        'logs:CreateLogStream',
                        'logs:PutLogEvents'
                    ]
                })
            ]
        });
        customResourcePolicy.attachToRole(customResourceRole);

        //cdk_nag
        NagSuppressions.addResourceSuppressions(
            customResourcePolicy,
            [
              {
                id: 'AwsSolutions-IAM5',
                reason: 'Resource ARNs are not generated at the time of policy creation'
              }
            ]
          );

        const customResourceLambda = new lambda.Function(this, 'CustomResource', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            description: 'CFN Custom resource to copy assets to S3 and get the MediaConvert endpoint',
            environment: {
                SOLUTION_IDENTIFIER: `AwsSolution/${solutionId}/%%VERSION%%`
            },
            code: lambda.Code.fromAsset('../custom-resource'),
            timeout: cdk.Duration.seconds(30),
            role: customResourceRole
        });
        customResourceLambda.node.addDependency(customResourceRole);
        customResourceLambda.node.addDependency(customResourcePolicy);

        /** get the cfn resource for the role and attach cfn_nag rule */
        const cfnCustomResource = customResourceLambda.node.findChild('Resource') as lambda.CfnFunction;
        cfnCustomResource.cfnOptions.metadata = {
            cfn_nag: {
                rules_to_suppress: [{
                    id: 'W58',
                    reason: 'Invalid warning: function has access to cloudwatch'
                },{
                    id: 'W89',
                    reason: 'This CustomResource does not need to be deployed inside a VPC'
                },{
                    id: 'W92',
                    reason: 'This CustomResource does not need to define ReservedConcurrentExecutions to reserve simultaneous executions'
                }]
            }
        };
        /**
         * custom resource, this will configure and deploy a mediaLive Input and SG
         */
        const mediaLiveInput = new cdk.CustomResource(this, 'MediaLiveInput', {
            serviceToken: customResourceLambda.functionArn,
            properties: {
                StreamName: cdk.Aws.STACK_NAME,
                Type: inputType.valueAsString,
                InputDeviceId: inputDeviceId.valueAsString,
                Cidr: inputCIDR.valueAsString,
                PullUrl: pullUrl.valueAsString,
                PullUser: pullUser.valueAsString,
                PullPass: pullPass.valueAsString
            }
        });
        /**
         * custom resource, this will configure and deploy a mediaLive Channel
         */
        const mediaLiveChannel = new cdk.CustomResource(this, 'MediaLiveChannel', {
            serviceToken: customResourceLambda.functionArn,
            properties: {
                StreamName: cdk.Aws.STACK_NAME,
                EncodingProfile: encodingProfile.valueAsString,
                Codec: 'AVC',
                Role: mediaLiveRole.roleArn,
                InputId: mediaLiveInput.getAttString('Id'),
                Type: inputType.valueAsString,
                S3Bucket: distribution.s3Bucket?.bucketName
            }
        });
        // Create the mediaLiveChannel after S3 bucket and CloudFront distribution is created so we know the S3 name
        mediaLiveChannel.node.addDependency(distribution);

        /**
         * custom resource, this will configure and deploy a mediaLive Channel
         */
        const startChannel = new cdk.CustomResource(this, 'MediaLiveChannelStart', { // NOSONAR
            serviceToken: customResourceLambda.functionArn,
            properties: {
                ChannelId: mediaLiveChannel.getAttString('ChannelId'),
                ChannelStart: channelStart.valueAsString
            }
        });
        /**
         * custom resource, this will configure and deploy a mediaLive Channel
         */
        const uuid = new cdk.CustomResource(this, 'UUID', {
            serviceToken: customResourceLambda.functionArn,
        });
        /**
         * custom resource, this will configure and deploy a mediaLive Channel
         */
        new cdk.CustomResource(this, 'AnonymizedMetric', { // NOSONAR
            serviceToken: customResourceLambda.functionArn,
            properties: {
                SolutionId: `${solutionId}`,
                UUID: uuid.getAttString('UUID'),
                Version: '%%VERSION%%',
                Type: inputType.valueAsString,
                Cidr: inputCIDR.valueAsString,
                EncodingProfile: encodingProfile.valueAsString,
                ChannelStart: channelStart.valueAsString,
                SendAnonymizedMetric: cdk.Fn.findInMap('AnonymizedData', 'SendAnonymizedData', 'Data')
            }
        });


        /**
        * AppRegistry
        */
        const applicationName = `live-streaming-on-aws-with-amazon-s3-${cdk.Aws.REGION}-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.STACK_NAME}`;
        const attributeGroup = new appreg.AttributeGroup(this, 'AppRegistryAttributeGroup', {
            attributeGroupName: `${cdk.Aws.REGION}-${cdk.Aws.STACK_NAME}`,
            description: 'Attribute group for solution information.',
            attributes: {
                ApplicationType: 'AWS-Solutions',
                SolutionVersion: '%%VERSION%%',
                SolutionID: solutionId
            }
        });
        const appRegistry = new appreg.Application(this, 'AppRegistryApp', {
            applicationName: applicationName,
            description: `Service Catalog application to track and manage all your resources. The SolutionId is ${solutionId} and SolutionVersion is %%VERSION%%.`
        });
        appRegistry.associateApplicationWithStack(this);
        cdk.Tags.of(appRegistry).add('Solutions:SolutionName', solutionName);
        cdk.Tags.of(appRegistry).add('Solutions:SolutionVersion', '%%VERSION%%');
        cdk.Tags.of(appRegistry).add('Solutions:ApplicationType', 'AWS-Solutions');
        cdk.Tags.of(appRegistry).add('Solutions:SolutionID', solutionId);

        attributeGroup.associateWith(appRegistry);

        /**
         * Outputs
         */
        new cdk.CfnOutput(this, 'LiveStreamUrl', { // NOSONAR
            value: `https://${distribution.cloudFrontWebDistribution.distributionDomainName}/stream/index.m3u8`,
            description: 'CloudFront Live Stream URL',
            exportName: `${cdk.Aws.STACK_NAME}-LiveStreamUrl`
        });
        new cdk.CfnOutput(this, 'MediaLiveConsole', { // NOSONAR
            value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/medialive/home?region=${cdk.Aws.REGION}#!/channels`,
            description: 'MediaLive Channel',
            exportName: `${cdk.Aws.STACK_NAME}-MediaLiveConsole`
        });
        new cdk.CfnOutput(this, 'LiveStreamBucket', { // NOSONAR
            value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/s3/buckets/${distribution.s3Bucket?.bucketName}?region=${cdk.Aws.REGION}`,
            description: 'Live Stream Destination Bucket',
            exportName: `${cdk.Aws.STACK_NAME}-LiveStreamBucket`
        });
        new cdk.CfnOutput(this, 'BucketMetrics', { // NOSONAR
            value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/s3/bucket/${distribution.s3Bucket?.bucketName}/metrics/bucket_metrics?region=${cdk.Aws.REGION}&tab=request&period=1h`,
            description: 'Bucket Request Metrics',
            exportName: `${cdk.Aws.STACK_NAME}-BucketMetrics`
        });
        new cdk.CfnOutput(this, 'MediaLivePushEndpoint', { // NOSONAR
            value: mediaLiveInput.getAttString('EndPoint'),
            description: 'The MediaLive Input ingress endpoint for push input types',
            exportName: `${cdk.Aws.STACK_NAME}-MediaLiveEndpoint`
        });
        new cdk.CfnOutput(this, 'AppRegistryConsole', { // NOSONAR
            description: 'AppRegistry',
            value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/servicecatalog/home?#applications/${appRegistry.applicationId}`,
            exportName: `${cdk.Aws.STACK_NAME}-AppRegistry`
        });
        new cdk.CfnOutput(this, 'MediaLiveChannelId', { // NOSONAR
            description: 'MediaLive Channel Id',
            value: `${mediaLiveChannel.getAttString('ChannelId')}`,
            exportName: `${cdk.Aws.STACK_NAME}-MediaLiveChannelId`
        });


        /**
        * Tag all resources with Solution Id
        */
        cdk.Tags.of(this).add(
            'SolutionId',
            solutionId
        );
    }
}
