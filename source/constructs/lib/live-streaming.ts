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

import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';

//Solution construct
import { CloudFrontToMediaStore } from '@aws-solutions-constructs/aws-cloudfront-mediastore';
import { CachePolicy } from '@aws-cdk/aws-cloudfront';

export class LiveStreaming extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        /**
         * CloudFormation Template Descrption
         */
        this.templateOptions.description = '(SO0109) Live Streaming on AWS with MediaStore Solution %%VERSION%%';
        /**
         * Cfn Parameters
         */
        const inputType = new cdk.CfnParameter(this, 'InputType', {
            type: 'String',
            description: 'Specify the input type for MediaLive (default parameters are for the demo video).  For details on setting up each input type, see https://docs.aws.amazon.com/solutions/latest/live-streaming-on-aws-with-mediastore/appendix-a.html.',
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
         * Mapping for sending anonymous metrics to AWS Solution Builders API
         */
        new cdk.CfnMapping(this, 'AnonymousData', {
            mapping: {
                SendAnonymousData: {
                    Data: 'Yes'
                }
            }
        });
        /**
         * AWS Solutions Construct. Creates a mediastore container frontend by Amazon CloudFront.
         * Construct also includes a logs bucket for the CloudFront distribution and a CloudFront
         * OriginAccessIdentity which is used to restrict access to MediaStore from CloudFront.
         * Disabling the default settings for security headers and update the lifecycle policy to delete expired
         * .ts segments after 5 minutes.
         */
        const cachePolicy = new CachePolicy(this, 'CachePolicy', {
            headerBehavior: {
              behavior: 'whitelist',
              headers: ['Origin']
            }
        });

        const distibution = new CloudFrontToMediaStore(this, 'CloudFrontToMediaStore', {
            cloudFrontDistributionProps: {
              defaultBehavior: {
                cachePolicy
              },
              errorResponses: [400, 403, 404, 405, 414, 416, 500, 501, 502, 503, 504].map((httpStatus: number) => {
                return { httpStatus, ttl: cdk.Duration.seconds(1) };
              })
            },
            insertHttpSecurityHeaders: false
        });
        distibution.mediaStoreContainer.lifecyclePolicy = JSON.stringify({
            rules: [
                {
                    definition: {
                        path: [{ wildcard: 'stream/*.ts' }],
                        seconds_since_create: [{ numeric: ['>', 300] }]
                    },
                    action: 'EXPIRE'
                }
            ]
        });

        /**
         * IAM Roles
         */
        const mediaLiveRole = new iam.Role(this, 'MediaLiveRole', {
            assumedBy: new iam.ServicePrincipal('medialive.amazonaws.com'),
        });
        const mediaLivePolicy = new iam.Policy(this, 'mediaLivePolicy', {
            statements: [
                new iam.PolicyStatement({
                    resources: [`arn:${cdk.Aws.PARTITION}:mediastore:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
                    actions: [
                        'mediastore:DeleteObject',
                        'mediastore:DescribeObject',
                        'mediastore:GetObject',
                        'mediastore:ListItems',
                        'mediastore:PutObject'
                    ]
                }),
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
        /**
         * Custom Resource, Role and Policy.
         */
        const customResourceLambda = new lambda.Function(this, 'CustomResource', {
            runtime: lambda.Runtime.NODEJS_12_X,
            handler: 'index.handler',
            description: 'CFN Custom resource to copy assets to S3 and get the MediaConvert endpoint',
            environment: {
                SOLUTION_IDENTIFIER: 'AwsSolution/SO0109/%%VERSION%%'
            },
            code: lambda.Code.fromAsset('../custom-resource'),
            timeout: cdk.Duration.seconds(30),
            initialPolicy: [
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
                })
            ]
        });
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
                MediaStoreEndpoint: distibution.mediaStoreContainer.attrEndpoint
            }
        });
        /**
         * custom resource, this will configure and deploy a mediaLive Channel
         */
        const startChannel = new cdk.CustomResource(this, 'MediaLiveChannelStart', {
            serviceToken: customResourceLambda.functionArn,
            properties: {
                ChannelId: mediaLiveChannel.getAttString('ChannelId'),
                ChannelStart: channelStart.valueAsString
            }
        });
        startChannel.node.addDependency(distibution.cloudFrontWebDistribution);

        /**
         * custom resource, this will configure and deploy a mediaLive Channel
         */
        const uuid = new cdk.CustomResource(this, 'UUID', {
            serviceToken: customResourceLambda.functionArn,
        });
        /**
         * custom resource, this will configure and deploy a mediaLive Channel
         */
        new cdk.CustomResource(this, 'AnonymousMetric', {
            serviceToken: customResourceLambda.functionArn,
            properties: {
                SolutionId: 'SO0109',
                UUID: uuid.getAttString('UUID'),
                Version: '%%VERSION%%',
                Type: inputType.valueAsString,
                Cidr: inputCIDR.valueAsString,
                EncodingProfile: encodingProfile.valueAsString,
                ChannelStart: channelStart.valueAsString,
                SendAnonymousMetric: cdk.Fn.findInMap('AnonymousData', 'SendAnonymousData', 'Data')
            }
        });
        /**
         * CloudWatch Dashboard for MediaStore
         */
        const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
            dashboardName: `${cdk.Aws.STACK_NAME}-${cdk.Aws.REGION}`,
        });
        dashboard.addWidgets(new cloudwatch.TextWidget({
            markdown: '\nThis dashboard monitors the CloudWatch Logs for the MediaStore container and shows data points for \
                    both ingress and egress operations while the live stream is running. This dashboard monitors the CloudWatch \
                    Logs for the MediaStore container and shows data points for both ingress and egress operations while the live stream is running. \
                    An IAM Role is required to allow MediaStore to write to CloudWatch Logs. If you do not see any data points on this dashboard, please follow \
                    [these instructions to create the Role](https://docs.aws.amazon.com/mediastore/latest/ug/monitoring-cloudwatch-permissions.html).\n',
            width: 24,
            height: 2,
        }));
        dashboard.addWidgets(
            new cloudwatch.LogQueryWidget({
                title: "Ingress Transaction Per Minute",
                logGroupNames: [`/aws/mediastore/${cdk.Aws.STACK_NAME}`],
                queryString: `fields @message\n| filter (Path like \"/stream/index\") and (Operation=\"PutObject\")\n| stats count(*) as TPM by bin(1m)`,
                region: `${cdk.Aws.REGION}`,
                view: cloudwatch.LogQueryVisualizationType.LINE,
                width: 12,
                height: 6
            }),
            new cloudwatch.LogQueryWidget({
                title: "Egress Transaction Per Minute",
                logGroupNames: [`/aws/mediastore/${cdk.Aws.STACK_NAME}`],
                queryString: `fields @message\n| filter (Path like \"/stream/index\") and (Operation=\"GetObject\")\n| stats count(*) as TPM by bin(1m)`,
                region: `${cdk.Aws.REGION}`,
                view: cloudwatch.LogQueryVisualizationType.LINE,
                width: 12,
                height: 6
            })
        );
        dashboard.addWidgets(
            new cloudwatch.LogQueryWidget({
                title: 'Ingress PutObject Latencies (Successful Requests)',
                logGroupNames: [`/aws/mediastore/${cdk.Aws.STACK_NAME}`],
                queryString: `filter HTTPStatus like /2\\d{2}/ and Operation=\"PutObject\" | stats avg(TurnAroundTime), avg(TotalTime), percentile(TurnAroundTime, 99), percentile(TotalTime, 99) by bin(1m)`,
                region: `${cdk.Aws.REGION}`,
                view: cloudwatch.LogQueryVisualizationType.LINE,
                width: 12,
                height: 6
            }),
            new cloudwatch.LogQueryWidget({
                title: "Egress GetObject Latencies (Successful Requests)",
                logGroupNames: [`/aws/mediastore/${cdk.Aws.STACK_NAME}`],
                queryString: `filter HTTPStatus like /2\\d{2}/ and Operation=\"GetObject\" | stats avg(TurnAroundTime), avg(TotalTime), percentile(TurnAroundTime, 99), percentile(TotalTime, 99) by bin(1m)`,
                region: `${cdk.Aws.REGION}`,
                view: cloudwatch.LogQueryVisualizationType.LINE,
                width: 12,
                height: 6
            })
        );
        dashboard.addWidgets(
            new cloudwatch.LogQueryWidget({
                title: 'Ingress 2xx Status Count by Operation',
                logGroupNames: [`/aws/mediastore/${cdk.Aws.STACK_NAME}`],
                queryString: `filter (Path like \"/stream/index\") | filter HTTPStatus like /2\\d{2}/ \n| filter Operation = \"PutObject\" or Operation=\"DeleteObject\"\n| stats count() as '2xx Count' by Operation | sort '2xx Count' desc`,
                region: `${cdk.Aws.REGION}`,
                view: cloudwatch.LogQueryVisualizationType.TABLE,
                width: 12,
                height: 6
            }),
            new cloudwatch.LogQueryWidget({
                title: "Egress 2xx Status Count by Operation",
                logGroupNames: [`/aws/mediastore/${cdk.Aws.STACK_NAME}`],
                queryString: `filter (Path like \"/stream/index\") | filter HTTPStatus like /2\\d{2}/ \n| filter Operation = \"GetObject\" \n| stats count() as '2xx Count' by Operation | sort '2xx Count' desc`,
                region: `${cdk.Aws.REGION}`,
                view: cloudwatch.LogQueryVisualizationType.TABLE,
                width: 12,
                height: 6
            })
        );
        dashboard.addWidgets(
            new cloudwatch.LogQueryWidget({
                title: 'Ingress 4xx Status Count',
                logGroupNames: [`/aws/mediastore/${cdk.Aws.STACK_NAME}`],
                queryString: `filter (Path like \"/stream/index\")\n| filter HTTPStatus like /4\\d{2}/ \n| filter Operation = \"PutObject\"\n| stats count() as '4xx Count' by Operation`,
                region: `${cdk.Aws.REGION}`,
                view: cloudwatch.LogQueryVisualizationType.TABLE,
                width: 6,
                height: 6
            }),
            new cloudwatch.LogQueryWidget({
                title: 'Ingress 5xx Status Count',
                logGroupNames: [`/aws/mediastore/${cdk.Aws.STACK_NAME}`],
                queryString: `filter (Path like \"/stream/index\")\n| filter HTTPStatus like /5\\d{2}/ \n| filter Operation = \"PutObject\"\n| stats count() as '5xx Count' by Operation`,
                region: `${cdk.Aws.REGION}`,
                view: cloudwatch.LogQueryVisualizationType.TABLE,
                width: 6,
                height: 6
            }),
            new cloudwatch.LogQueryWidget({
                title: 'Egress 4xx Status Count',
                logGroupNames: [`/aws/mediastore/${cdk.Aws.STACK_NAME}`],
                queryString: `filter (Path like \"/stream/index\")\n| filter HTTPStatus like /4\\d{2}/ \n| filter Operation = \"GetObject\"\n| stats count() as '4xx Count' by Operation`,
                region: `${cdk.Aws.REGION}`,
                view: cloudwatch.LogQueryVisualizationType.TABLE,
                width: 6,
                height: 6
            }),
            new cloudwatch.LogQueryWidget({
                title: 'Egress 5xx Status Count',
                logGroupNames: [`/aws/mediastore/${cdk.Aws.STACK_NAME}`],
                queryString: `filter (Path like \"/stream/index\")\n| filter HTTPStatus like /5\\d{2}/ \n| filter Operation = \"GetObject\"\n| stats count() as '5xx Count' by Operation`,
                region: `${cdk.Aws.REGION}`,
                view: cloudwatch.LogQueryVisualizationType.TABLE,
                width: 6,
                height: 6
            })
        );
        /**
         * Outputs
         */
        new cdk.CfnOutput(this, 'LiveStreamUrl', {
            value: `https://${distibution.cloudFrontWebDistribution.distributionDomainName}/stream/index.m3u8`,
            description: 'CloudFront Live Stream URL',
            exportName: `${cdk.Aws.STACK_NAME}-LiveStreamUrl`
        });
        new cdk.CfnOutput(this, 'MediaLiveConsole', {
            value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/medialive/home?region=${cdk.Aws.REGION}#!/channels`,
            description: 'MediaLive Channel',
            exportName: `${cdk.Aws.STACK_NAME}-MediaLiveConsole`
        });
        new cdk.CfnOutput(this, 'MediaStoreConsole', {
            value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/mediastore/home/containers/`,
            description: 'MediaStore Container',
            exportName: `${cdk.Aws.STACK_NAME}-MediaStoreConsole`
        });
        new cdk.CfnOutput(this, 'CloudWatchDashboard', {
            value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Aws.REGION}#dashboards:name=${cdk.Aws.STACK_NAME}-${cdk.Aws.REGION}`,
            description: 'CloudWatch Dashboard for MediaStore Ingress and Egress',
            exportName: `${cdk.Aws.STACK_NAME}-CloudWatchDashboard`
        });
        new cdk.CfnOutput(this, 'MediaLivePushEndpoint', {
            value: mediaLiveInput.getAttString('EndPoint'),
            description: 'The MediaLive Input ingress endpoint for push input types',
            exportName: `${cdk.Aws.STACK_NAME}-MediaLiveEndpoint`
        });
    }
}
