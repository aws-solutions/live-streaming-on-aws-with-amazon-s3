/*********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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
const AWS = require('aws-sdk');

/**
 * Description: creates a medialive device input (Elemental Link)
 * @param {object} config  the configuration settings for input:
 * @param {string} config.StreamName   the name of the input
 * @param {string} config.Type  should be INPUT_DEVICE
 * @param {string} config.InputDeviceId  should be the device id "hd-11111111111"
*/
const createDeviceInput = async (config) => {
    console.log('Creating Link Input.....');
    const medialive = new AWS.MediaLive({
        region: process.env.AWS_REGION
    });
    let responseData
    try {
        let params = {
            Name: config.StreamName,
            Type: config.Type,
            InputDevices: [
              {
                Id:config.InputDeviceId
              }
            ]
        };
        data = await medialive.createInput(params).promise();
        responseData = {
            Id: data.Input.Id,
            EndPoint: 'Push InputType only'
        };
    } catch (err) {
        throw (err);
    }
    return responseData;
};


/**
 * Description: creates a medialive RTP push input and associated security group
 * @param {object} config  the configuration settings for input:
 * @param {string} config.StreamName   the name of the input
 * @param {string} config.Type  should be RTP_PUSH
 * @param {string} config.Cidr  a valid cidr block to restrict access to the input (0.0.0.0/0)
*/
const createRtpInput = async (config) => {
    console.log('Creating RTP Input.....');
    const medialive = new AWS.MediaLive({
        region: process.env.AWS_REGION
    });
    let responseData,
        params,
        data;
    try {
        params = {
            WhitelistRules: [{
                Cidr: config.Cidr
            }]
        };
        data = await medialive.createInputSecurityGroup(params).promise();
        params = {
            InputSecurityGroups: [data.SecurityGroup.Id],
            Name: config.StreamName,
            Type: config.Type
        };
        data = await medialive.createInput(params).promise();
        responseData = {
            Id: data.Input.Id,
            EndPoint: data.Input.Destinations[0].Url
        };
    } catch (err) {
        throw (err);
    }
    return responseData;
};


/**
 * Description: creates a medialive RTP push input and associated security group
 * @param {object} config  the configuration settings for input:
 * @param {string} config.StreamName   the name of the input
 * @param {string} config.Type  should be RTP_PUSH
 * @param {string} config.Cidr  a valid cidr block to restrict access to the input (0.0.0.0/0)
*/
const createRtmpInput = async (config) => {
    console.log('Creating RTMP Input.....');
    const medialive = new AWS.MediaLive({
        region: process.env.AWS_REGION
    });
    let responseData,
        params,
        data;
    try {
        params = {
            WhitelistRules: [{
                Cidr: config.Cidr
            }]
        };
        data = await medialive.createInputSecurityGroup(params).promise();
        params = {
            InputSecurityGroups: [data.SecurityGroup.Id],
            Name: config.StreamName,
            Type: config.Type,
            Destinations: [{
                    StreamName: `${config.StreamName}/stream`
                }
            ]
        };
        data = await medialive.createInput(params).promise();
        responseData = {
            Id: data.Input.Id,
            EndPoint: data.Input.Destinations[0].Url,
        };
    } catch (err) {
        throw (err);
    }
    return responseData;
};


/**
 * Description: creates a medialive RTP push input and associated security group
 * @param {object} config  the configuration settings for input:
 * @param {string} config.StreamName   the name of the input
 * @param {string} config.Type  should be RTP_PUSH
 * @param {string} config.PullUser  the username if autnetication is required to access the source URL
 * @param {string} config.PullPass  the password if autnetication is required to access the source URL
*/
const createUrlInput = async (config) => {
    console.log('Creating URL_PULL Input.....');
    const medialive = new AWS.MediaLive({
        region: process.env.AWS_REGION
    });
    const ssm = new AWS.SSM({
        region: process.env.AWS_REGION
    });
    let responseData,
        params,
        data;
    try {
        params = {
            Name: config.StreamName,
            Type: config.Type,
            Sources: [{
                    Url: config.PullUrl
                }
            ]
        };
        if (config.PullUser && config.PullUser !== '') {
            params.Sources[0].Username = config.PullUser;
            params.Sources[0].PasswordParam = config.PullUser;
            let ssm_params = {
                Name: config.PullUser,
                Description: 'Live Stream solution input credentials',
                Type: 'String',
                Value: config.PullPass,
                Overwrite: true
            };
            await ssm.putParameter(ssm_params).promise();
        }
        data = await medialive.createInput(params).promise();
        responseData = {
            Id: data.Input.Id,
            EndPoint: 'Push InputType only'
        };
    } catch (err) {
        throw (err);
    }
    return responseData;
};


/**
 * Description: delete a medialive input and associated security group
 * @param {string} InputId  the InputId which in CloudFormation is the physical resource ID.
 */
const deleteInput = async (InputId) => {
    console.log('Deleting Input.....');
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const medialive = new AWS.MediaLive({
        region: process.env.AWS_REGION
    });
    let params,
        data;
    try {
        params = {
            InputId: InputId
        };
        data = await medialive.describeInput(params).promise();
        await medialive.deleteInput(params).promise();
        if (data.SecurityGroups && data.SecurityGroups.length !== 0 ) {
            params = {
                 InputSecurityGroupId: data.SecurityGroups[0]
            };
            /**
            * When the input is deleted the SG is detached however it can take a few seconds for the SG state
            * to change from IN_USE to IDLE
            */
            let state = '';
            let retry = 5;
            while (state !== 'IDLE') {
                await sleep(6000);
                data = await medialive.describeInputSecurityGroup(params).promise();
                state = data.State;
                retry = retry -1;
                if (retry === 0 && state !== 'IDLE') {
                    throw new Error(`Failed to delete Security Group, state: ${state} is not IDLE`);
                }
            }
            await medialive.deleteInputSecurityGroup(params).promise();
        }
    } catch (err) {
        throw err;
    }
    return 'success';
};


/**
 * Description: creates a medialive channel and then call the waitFor function to confirm the channel creation is successful.
 * @param {object} config  the configuration settings for input:
 * @param {string} config.EncodingProfile  should one of HD-1080p, HD-720p, SD-540p.
 * @param {string} config.Codec encoding codec option, default is AVC.
 * @param {string} config.Role  the MediaLive IAM Role associated with the channel.
 * @param {string} config.InputId  the ID of the medialive input to attach to the channel.
 * @param {string} config.MediaStoreEndpoint the mediastore endpoint to use as the output destination
 * @param {string} config.SoltionId used to tag the medialive channel
 */
const createChannel = async (config) => {
    const medialive = new AWS.MediaLive({
        region: process.env.AWS_REGION
    });
    const encode1080p = require('./encoding-profiles/hd-1080p');
    const encode720p = require('./encoding-profiles/hd-720p');
    const encode540p = require('./encoding-profiles/sd-540p');
    let responseData,
        params,
        data;
    try {
        params = {
            ChannelClass:'SINGLE_PIPELINE',
            Destinations: [{
                Id: "destination1",
                Settings: [{
                        Url: config.MediaStoreEndpoint.replace('https','mediastoressl')+'/stream/index'
                    }
                ]
            }],
            InputSpecification: {
                Codec: config.Codec,
                Resolution: '',
                MaximumBitrate: ''
            },
            Name: config.Name,
            RoleArn: config.Role,
            InputAttachments: [{
                InputId: config.InputId,
                InputSettings: {}
            }],
            EncoderSettings: {},
            Tags: {
              Solution:'SO0013'
            }
        };

        if (config.Type === 'URL_PULL') {
            params.InputAttachments[0].InputSettings = {
                SourceEndBehavior: 'LOOP'
            };
        }

        switch (config.EncodingProfile) {
            case 'HD-1080p':
                params.InputSpecification.Resolution = 'HD';
                params.InputSpecification.MaximumBitrate = 'MAX_20_MBPS';
                params.EncoderSettings = encode1080p;
                break;
            case 'HD-720p':
                params.InputSpecification.Resolution = 'HD';
                params.InputSpecification.MaximumBitrate = 'MAX_10_MBPS';
                params.EncoderSettings = encode720p;
                break;
            case 'SD-540p':
                params.InputSpecification.Resolution = 'SD';
                params.InputSpecification.MaximumBitrate = 'MAX_10_MBPS';
                params.EncoderSettings = encode540p;
                break;
            default:
                throw new Error('EncodingProfile is not defined');
        }
        console.log(`Creating Channel with a ${config.EncodingProfile} profile`);
        data = await medialive.createChannel(params).promise();
        params = {
            ChannelId: data.Channel.Id
        }
        await medialive.waitFor('channelCreated',params).promise();
        responseData = {
            ChannelId: data.Channel.Id
        };
    } catch (err) {
        throw err;
    }
    return responseData;
};


/**
 * Description: start the medialive channel
 * @param {object} config  the configuration settings for input:
 * @param {string} ChannelId  the medialive channel id
 */
const startChannel = async (config) => {
    console.log('Starting Channel.....');
    const medialive = new AWS.MediaLive({
        region: process.env.AWS_REGION
    });
    try {
        let params = {
            ChannelId: config.ChannelId
        };
        await medialive.startChannel(params).promise();
    } catch (err) {
        throw err;
    }
    return 'success';
};


/**
 * Description: delete a medialive channel.
 * @param {string} ChannelId  the ChannelId which in CloudFormation is the physical resource ID.
 */
const deleteChannel = async (ChannelId) => {
    console.log('Deleting Channel.....');
    const medialive = new AWS.MediaLive({
        region: process.env.AWS_REGION
    });
    let params,
        data;
    try {
        params = {
            ChannelId: ChannelId
        };
        await medialive.stopChannel(params).promise();
        await medialive.waitFor('channelStopped',params).promise();
        await medialive.deleteChannel(params).promise();
        await medialive.waitFor('channelDeleted',params).promise();
    } catch (err) {
        throw err;
    }
    return 'success';
};


module.exports = {
    createDeviceInput: createDeviceInput,
    createRtpInput: createRtpInput,
    createRtmpInput: createRtmpInput,
    createUrlInput: createUrlInput,
    deleteInput: deleteInput,
    createChannel: createChannel,
    startChannel: startChannel,
    deleteChannel: deleteChannel
};
