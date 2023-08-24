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
const expect = require('chai').expect;
const uuid = require('uuid');
const index = require('./index');
const mediaLive = require('./lib/medialive/');
const cfn = require('./lib/cfn');
const metrics = require('./lib/metrics');

// Object used to cache original functions and mocks
const originalFunctions = {
    cfn: {
        send: cfn.send,
    },
    mediaLive: {
        createDeviceInput: mediaLive.createDeviceInput,
        createRtpInput: mediaLive.createRtpInput,
        createRtmpInput: mediaLive.createRtmpInput,
        createUrlInput: mediaLive.createUrlInput,
        createChannel: mediaLive.createChannel,
        startChannel: mediaLive.startChannel,
        deleteChannel: mediaLive.deleteChannel,
        deleteInput: mediaLive.deleteInput,
    },
    metrics: {
        send: metrics.send,
    },
};

const cfnSendParameters = {
    event: 0,
    context: 1,
    responseStatus: 2,
    responseData: 3,
    physicalResourceId: 4,
};

describe('#CUSTOM_RESOURCE::index',() => {
    beforeAll(() => {
        // mock cfn
        cfn.send = jest.fn();
    });

    afterEach(() => {
        // reset mocks
        cfn.send.mockReset();
    })

    afterAll(() => {
        // restore original functions
        cfn.send = originalFunctions.cfn.send;
        metrics.send = originalFunctions.metrics.send;
        mediaLive.createDeviceInput = originalFunctions.createDeviceInput;
        mediaLive.createRtpInput = originalFunctions.createRtpInput;
        mediaLive.createRtmpInput = originalFunctions.createRtmpInput;
        mediaLive.createUrlInput = originalFunctions.createUrlInput;
        mediaLive.createChannel = originalFunctions.createChannel;
        mediaLive.startChannel = originalFunctions.startChannel;
        mediaLive.deleteChannel = originalFunctions.deleteChannel;
        mediaLive.deleteInput = originalFunctions.deleteInput;
    });

    describe('Create tests', () => {
        it('should fail when LogicalResourceId is invalid', async () => {
            // parameters
            const event = {
                ResourceProperties: {
                    Resource: 'invalidResourceType',
                },
                RequestType: 'Create',
                LogicalResourceId: 'invalidResourceType',
            };
            await index.handler(event);
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('FAILED');
        });

        it('should fail when MediaLiveInput Type is not valid', async () => {
            // parameters
            const event = {
                ResourceProperties: {
                    Resource: 'MediaLiveInput',
                    Type: 'InvalidType'
                },
                RequestType: 'Create',
                LogicalResourceId: 'MediaLiveInput',
            };
            await index.handler(event);
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('FAILED');
        });

        [{
            type: 'INPUT_DEVICE',
            action: 'create device',
            mockResponse: 'testDeviceId',
            mockMethod: 'createDeviceInput'
        }, {
            type: 'RTP_PUSH',
            action: 'create rtp',
            mockResponse: 'testRtpId',
            mockMethod: 'createRtpInput'
        }, {
            type: 'RTMP_PUSH',
            action: 'create rtmp',
            mockResponse: 'testRtmpId',
            mockMethod: 'createRtmpInput'
        }, {
            type: 'URL_PULL',
            action: 'create url',
            mockResponse: 'testUrlId',
            mockMethod: 'createUrlInput'
        }].forEach(({ type, action, mockResponse, mockMethod }) => {
            it(`should ${action} when config type is ${type}`, async () => {
                // mock medialiveinput method
                mediaLive[mockMethod] = jest.fn(() => ({ Id: mockResponse }));

                // parameters
                const event = {
                    ResourceProperties: {
                        Resource: 'MediaLiveInput',
                        Type: type,
                    },
                    RequestType: 'Create',
                    LogicalResourceId: 'MediaLiveInput',
                };

                await index.handler(event);
                expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('SUCCESS');
                expect(cfn.send.mock.lastCall[cfnSendParameters.physicalResourceId]).to.equal(mockResponse);
            });
        })

        it('should create media live channel', async () => {
            // mock medialive createChannel
            mediaLive.createChannel = jest.fn(() => ({ ChannelId: 'testChannelId' }));

            // parameters
            const event = {
                ResourceProperties: {
                    Resource: 'MediaLiveChannel'
                },
                RequestType: 'Create',
                LogicalResourceId: 'MediaLiveChannel',
            };

            await index.handler(event);
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('SUCCESS');
            expect(cfn.send.mock.lastCall[cfnSendParameters.physicalResourceId]).to.equal('testChannelId');
        });

        it('should start medialive channel when ChannelStart property is Yes', async () => {
            // mock medialive startChannel
            mediaLive.startChannel = jest.fn();

            // parameters
            const event = {
                ResourceProperties: {
                    Resource: 'MediaLiveChannelStart',
                    ChannelStart: 'Yes',
                },
                RequestType: 'Create',
                LogicalResourceId: 'MediaLiveChannelStart',
            };

            await index.handler(event);
            expect(mediaLive.startChannel.mock.calls.length).to.equal(1);
            expect(mediaLive.startChannel.mock.lastCall[cfnSendParameters.event].Resource).to.equal('MediaLiveChannelStart');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('SUCCESS');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseData]).to.deep.equal({});
            expect(cfn.send.mock.lastCall[cfnSendParameters.physicalResourceId]).to.be.undefined;
        });

        it('should start medialive channel when ChannelStart property is No', async () => {
            // mock medialive startChannel
            mediaLive.startChannel = jest.fn();

            // parameters
            const event = {
                ResourceProperties: {
                    Resource: 'MediaLiveChannelStart',
                    ChannelStart: 'No',
                },
                RequestType: 'Create',
                LogicalResourceId: 'MediaLiveChannelStart',
            };

            await index.handler(event);
            expect(mediaLive.startChannel.mock.calls.length).to.equal(0);
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('SUCCESS');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseData]).to.deep.equal({});
            expect(cfn.send.mock.lastCall[cfnSendParameters.physicalResourceId]).to.be.undefined;
        });

        it('should return valid uuid', async () => {
            // parameters
            const event = {
                ResourceProperties: {
                    Resource: 'UUID',
                },
                RequestType: 'Create',
                LogicalResourceId: 'UUID',
            };

            await index.handler(event);
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('SUCCESS');
            expect(
                uuid.validate(cfn.send.mock.lastCall[cfnSendParameters.responseData].UUID)
            ).to.be.true;
            expect(cfn.send.mock.lastCall[cfnSendParameters.physicalResourceId]).to.be.undefined;
        });

        it('should send anonymized metric when SendAnonymizedMetric property is set to Yes', async () => {
            // mock metrics
            metrics.send = jest.fn();

            // parameters
            const event = {
                ResourceProperties: {
                    Resource: 'AnonymizedMetric',
                    SendAnonymizedMetric: 'Yes'
                },
                RequestType: 'Create',
                LogicalResourceId: 'AnonymizedMetric',
            };

            await index.handler(event);
            expect(metrics.send.mock.calls.length).to.equal(1);
            expect(metrics.send.mock.lastCall[cfnSendParameters.event].Resource).to.equal('AnonymizedMetric');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('SUCCESS');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseData]).to.deep.equal({});
            expect(cfn.send.mock.lastCall[cfnSendParameters.physicalResourceId]).to.be.undefined;
        });

        it('should send anonymized metric when SendAnonymizedMetric property is set to No', async () => {
            // mock metrics
            metrics.send = jest.fn();

            // parameters
            const event = {
                ResourceProperties: {
                    Resource: 'AnonymizedMetric',
                    SendAnonymizedMetric: 'No'
                },
                RequestType: 'Create',
                LogicalResourceId: 'AnonymizedMetric',
            };

            await index.handler(event);
            expect(metrics.send.mock.calls.length).to.equal(0);
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('SUCCESS');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseData]).to.deep.equal({});
            expect(cfn.send.mock.lastCall[cfnSendParameters.physicalResourceId]).to.be.undefined;
        });
    });

    describe('Update test', () => {
        it('should respond with not support message', async () => {
            // parameters
            const event = {
                ResourceProperties: {
                    Resource: 'Resource',
                },
                RequestType: 'Update',
                LogicalResourceId: 'Resource',
            };

            await index.handler(event);
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('SUCCESS');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseData]).to.equal('update currently not supported, please delete the stack and launch a new one');
            expect(cfn.send.mock.lastCall[cfnSendParameters.physicalResourceId]).to.be.undefined;
        });
    });

    describe('Delete tests', () => {
        it('should do nothing when attempting to delete non supported resource', async () => {
            // parameters
            const event = {
                ResourceProperties: {
                    Resource: 'Resource',
                },
                RequestType: 'Delete',
                LogicalResourceId: 'Resource',
            };

            await index.handler(event);
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('SUCCESS');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseData]).to.deep.equal({});
            expect(cfn.send.mock.lastCall[cfnSendParameters.physicalResourceId]).to.be.undefined;
        });

        it('should delete media live channel', async () => {
            // mock medialive deleteChannel
            mediaLive.deleteChannel = jest.fn();

            // parameters
            const event = {
                PhysicalResourceId: 'testMedialiveChannelId',
                ResourceProperties: {
                    Resource: 'MediaLiveChannel',
                },
                RequestType: 'Delete',
                LogicalResourceId: 'MediaLiveChannel',
            };

            await index.handler(event);
            expect(mediaLive.deleteChannel.mock.calls.length).to.equal(1);
            expect(mediaLive.deleteChannel.mock.lastCall[cfnSendParameters.event]).to.equal('testMedialiveChannelId');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('SUCCESS');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseData]).to.deep.equal({});
            expect(cfn.send.mock.lastCall[cfnSendParameters.physicalResourceId]).to.be.undefined;
        });

        it('should delete media live input', async () => {
            // mock medialive deleteInput
            mediaLive.deleteInput = jest.fn();

            // parameters
            const event = {
                PhysicalResourceId: 'testMedialiveInputId',
                ResourceProperties: {
                    Resource: 'MediaLiveInput',
                },
                RequestType: 'Delete',
                LogicalResourceId: 'MediaLiveInput',
            };

            await index.handler(event);
            expect(mediaLive.deleteInput.mock.calls.length).to.equal(1);
            expect(mediaLive.deleteInput.mock.lastCall[cfnSendParameters.event]).to.equal('testMedialiveInputId');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseStatus]).to.equal('SUCCESS');
            expect(cfn.send.mock.lastCall[cfnSendParameters.responseData]).to.deep.equal({});
            expect(cfn.send.mock.lastCall[cfnSendParameters.physicalResourceId]).to.be.undefined;
        });
    })
});
