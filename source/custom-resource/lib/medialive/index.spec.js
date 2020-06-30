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
const expect = require('chai').expect;
const path = require('path');
let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

const lambda = require('./index.js');

const device_input = {
  StreamName:'test',
  Type: 'INPUT_DEVICE',
  InputDevices: [
    {
      Id:'hd-123'
    }
  ]
}
const rtp_input = {
  StreamName:'test',
  Type: 'RTP_PUSH',
  Cidr: '0.0.0.0/0',
}
const rtmp_input = {
  StreamName:'test',
  Type: 'RTMP_PUSH',
  Cidr: '0.0.0.0/0'
}
const url_input = {
  StreamName:'test',
  Type: 'URL_PULL',
  PullUrl:'http://abc/123',
  PullUser: 'username',
  PullPass: 'password'
}
const data = {
  State:'IDLE',
  ChannelId: '12345',
  Channel: {
    Id:'2468'
  },
  SecurityGroup: {
    Id:'1357'
  },
  Input:{
    Id:'2468',
    Destinations: [
      {Url:'http://123:5000'}
    ]
  }
};
const config = {
  Codec:'AVC',
  Name: 'test',
  InputId: '1357',
  EncodingProfile: 'HD-1080p',
  Role: 'arn:aws:iam::12345:role/test',
  MediaStoreEndpoint: 'https://mediastore',
  ChannelId:'2468'
};
const InputId = '2468';


describe('#MEDIALIVE::', () => {

  afterEach(() => {
  AWS.restore('MediaLive');
  });

  it('CREATE DEVICE INPUT SUCCESS', async () => {
    AWS.mock('MediaLive', 'createInput', Promise.resolve(data));
    const response = await lambda.createDeviceInput(device_input)
    expect(response.Id).to.equal('2468');
  });
  it('CREATE RTP INPUT SUCCESS', async () => {
    AWS.mock('MediaLive', 'createInputSecurityGroup', Promise.resolve(data));
    AWS.mock('MediaLive', 'createInput', Promise.resolve(data));
    const response = await lambda.createRtpInput(rtp_input)
    expect(response.Id).to.equal('2468');
  });
    it('CREATE RTMP INPUT SUCCESS', async () => {
    AWS.mock('MediaLive', 'createInputSecurityGroup', Promise.resolve(data));
    AWS.mock('MediaLive', 'createInput', Promise.resolve(data));
    const response = await lambda.createRtmpInput(rtmp_input)
    expect(response.Id).to.equal('2468');
  });
  it('CREATE URL_PULL  INPUT SUCCESS', async () => {
    AWS.mock('SSM', 'putParameter', Promise.resolve());
    AWS.mock('MediaLive', 'createInput', Promise.resolve(data));
    const response = await lambda.createUrlInput(url_input)
    expect(response.Id).to.equal('2468');
  });
  it('DELETE INPUT SUCCESS', async () => {
    AWS.mock('MediaLive', 'describeInput', Promise.resolve(data));
    AWS.mock('MediaLive', 'deleteInput', Promise.resolve());
    AWS.mock('MediaLive', 'describeInputSecurityGroup', Promise.resolve({State:'IDLE'}));
    AWS.mock('MediaLive', 'deleteInputSecurityGroup', Promise.resolve());
    const response = await lambda.deleteInput(InputId)
    expect(response).to.equal('success');
  });
  it('CREATE DEVICE INPUT ERROR', async () => {
    AWS.mock('MediaLive', 'createInput', Promise.reject('ERROR'));
    await lambda.createDeviceInput(device_input).catch(err => {
      expect(err).to.equal('ERROR');
    });
  });
  it('CREATE RTP INPUT ERROR', async () => {
    AWS.mock('MediaLive', 'createInputSecurityGroup', Promise.reject('ERROR'));
    await lambda.createRtpInput(rtp_input).catch(err => {
      expect(err).to.equal('ERROR');
    });
  });
  it('CREATE RTMP INPUT ERROR', async () => {
    AWS.mock('MediaLive', 'createInputSecurityGroup', Promise.resolve(data));
    AWS.mock('MediaLive', 'createInput', Promise.reject('ERROR'));
    await lambda.createRtmpInput(rtmp_input).catch(err => {
      expect(err).to.equal('ERROR');
    });
  });
    it('CREATE CHANNEL SUCCESS',async () => {
      AWS.mock('MediaLive', 'createChannel', Promise.resolve(data));
      AWS.mock('MediaLive', 'waitFor', Promise.resolve());
      const response = await lambda.createChannel(config)
      expect(response.ChannelId).to.equal('2468');
    });
    it('CREATE CHANNEL ERROR', async () => {
      AWS.mock('MediaLive', 'createChannel', Promise.reject('ERROR'));
      await lambda.createChannel(config).catch(err => {
        expect(err).to.equal('ERROR');
      });
    });
    it('START CHANNEL SUCCESS', async () => {
      AWS.mock('MediaLive', 'startChannel', Promise.resolve(data));
      const response = await lambda.startChannel(config)
      expect(response).to.equal('success');
    });
    it('START CHANNEL ERROR', async () => {
      AWS.mock('MediaLive', 'startChannel', Promise.reject('ERROR'));
      await lambda.startChannel(config).catch(err => {
        expect(err).to.equal('ERROR');
      });
    });
    it('DELETE CHANNEL SUCCESS', async () => {
      AWS.mock('MediaLive', 'stopChannel', Promise.resolve());
      AWS.mock('MediaLive', 'waitFor', Promise.resolve());
      AWS.mock('MediaLive', 'deleteChannel', Promise.resolve());
      AWS.mock('MediaLive', 'waitFor', Promise.resolve());
      const response = await lambda.deleteChannel('1234')
      expect(response).to.equal('success');
    });
    it('DELETE CHANNEL ERROR', async () => {
      AWS.mock('MediaLive', 'stopChannel', Promise.resolve());
      AWS.mock('MediaLive', 'waitFor', Promise.resolve());
      AWS.mock('MediaLive', 'deleteChannel', Promise.reject('ERROR'));
      await lambda.deleteChannel('1234').catch(err => {
        expect(err).to.equal('ERROR');
      });
    });
});
