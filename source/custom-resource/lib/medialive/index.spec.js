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
const { mockClient } = require('aws-sdk-client-mock');
const {
  MediaLiveClient,
  CreateInputCommand,
  DeleteInputCommand,
  DescribeInputCommand,
  CreateInputSecurityGroupCommand,
  DeleteInputSecurityGroupCommand,
  DescribeInputSecurityGroupCommand,
  CreateChannelCommand,
  StartChannelCommand,
  StopChannelCommand,
  DeleteChannelCommand,
  DescribeChannelCommand
} = require('@aws-sdk/client-medialive');
const {
  SSMClient,
  PutParameterCommand
} = require('@aws-sdk/client-ssm');

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
  PullUrl:'https://abc/123',
  PullUser: 'username',
  PullPass: 'password'
}
const data = {
  State:'DETACHED',
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
      {Url:'https://123:5000'}
    ]
  }
};
const config = {
  Codec:'AVC',
  Name: 'test',
  InputId: '1357',
  EncodingProfile: 'HD-1080p',
  Role: 'arn:aws:iam::12345:role/test',
  ChannelId:'2468'
};
const InputId = '2468';


describe('#MEDIALIVE::', () => {

  const mediaLiveClientMock = mockClient(MediaLiveClient);
  const ssmClientMock = mockClient(SSMClient);

  it('CREATE DEVICE INPUT SUCCESS', async () => {
    mediaLiveClientMock.on(CreateInputCommand).resolves(data);
    const response = await lambda.createDeviceInput(device_input)
    expect(response.Id).to.equal('2468');
  });
  it('CREATE RTP INPUT SUCCESS', async () => {
    mediaLiveClientMock.on(CreateInputSecurityGroupCommand).resolves(data);
    const response = await lambda.createRtpInput(rtp_input)
    expect(response.Id).to.equal('2468');
  });
  it('CREATE RTMP INPUT SUCCESS', async () => {
    const response = await lambda.createRtmpInput(rtmp_input)
    expect(response.Id).to.equal('2468');
  });
  it('CREATE URL_PULL  INPUT SUCCESS', async () => {
    ssmClientMock.on(PutParameterCommand).resolves();
    const response = await lambda.createUrlInput(url_input)
    expect(response.Id).to.equal('2468');
  });
  it('DELETE INPUT SUCCESS', async () => {
    mediaLiveClientMock.on(DescribeInputCommand).resolves(data);
    mediaLiveClientMock.on(DeleteInputCommand).resolves();
    mediaLiveClientMock.on(DescribeInputSecurityGroupCommand).resolves({ State: 'IDLE' });
    mediaLiveClientMock.on(DeleteInputSecurityGroupCommand).resolves();
    const response = await lambda.deleteInput(InputId)
    expect(response).to.equal('success');
  });
  it('DELETE INPUT TIMEOUT ERROR', async () => {
    data.State = 'test';
    mediaLiveClientMock.on(DescribeInputCommand).resolves(data);
    await lambda.deleteInput(InputId).catch(err => {
      expect(err.toString()).to.equal(`Error: Failed to delete Input, state: ${data.State} is not DETACHED`);
    });
  }, 36000);
  it('CREATE DEVICE INPUT ERROR', async () => {
    mediaLiveClientMock.on(CreateInputCommand).rejects('ERROR');
    await lambda.createDeviceInput(device_input).catch(err => {
      expect(err.toString()).to.equal('Error: ERROR');
    });
  });
  it('CREATE RTP INPUT ERROR', async () => {
    mediaLiveClientMock.on(CreateInputSecurityGroupCommand).rejects('ERROR');
    await lambda.createRtpInput(rtp_input).catch(err => {
      expect(err.toString()).to.equal('Error: ERROR');
    });
  });
  it('CREATE RTMP INPUT ERROR', async () => {
    mediaLiveClientMock.on(CreateInputSecurityGroupCommand).resolves(data);
    await lambda.createRtmpInput(rtmp_input).catch(err => {
      expect(err.toString()).to.equal('Error: ERROR');
    });
  });
  it('CREATE CHANNEL SUCCESS', async () => {
    mediaLiveClientMock.on(CreateChannelCommand).resolves(data);
    const response = await lambda.createChannel(config)
    expect(response.ChannelId).to.equal('2468');
  });
  it('CREATE CHANNEL ERROR', async () => {
    mediaLiveClientMock.on(CreateChannelCommand).rejects('ERROR');
    await lambda.createChannel(config).catch(err => {
      expect(err.toString()).to.equal('Error: ERROR');
    });
  });
  it('START CHANNEL SUCCESS', async () => {
    data.State = 'IDLE';
    mediaLiveClientMock.on(StartChannelCommand).resolves(data);
    mediaLiveClientMock.on(DescribeChannelCommand).resolves(data);
    const response = await lambda.startChannel(config)
    expect(response).to.equal('success');
  });
  it('START CHANNEL ERROR', async () => {
    mediaLiveClientMock.on(StartChannelCommand).rejects('ERROR');
    await lambda.startChannel(config).catch(err => {
      expect(err.toString()).to.equal('Error: ERROR');
    });
  });
  it('START CHANNEL TIMEOUT ERROR', async () => {
    data.State = 'test';
    mediaLiveClientMock.on(StartChannelCommand).resolves(data);
    mediaLiveClientMock.on(DescribeChannelCommand).resolves(data);
    await lambda.startChannel(config).catch(err => {
      expect(err.toString()).to.equal(`Error: Failed to start channel, state: ${data.State} is not IDLE`);
    });
  }, 36000);
  it('DELETE CHANNEL SUCCESS', async () => {
    mediaLiveClientMock.on(StopChannelCommand).resolves();
    mediaLiveClientMock.on(DeleteChannelCommand).resolves();
    const response = await lambda.deleteChannel('1234')
    expect(response).to.equal('success');
  });
  it('DELETE CHANNEL ERROR', async () => {
    mediaLiveClientMock.on(DeleteChannelCommand).rejects('ERROR');
    await lambda.deleteChannel('1234').catch(err => {
      expect(err.toString()).to.equal('Error: ERROR');
    });
  });
});
