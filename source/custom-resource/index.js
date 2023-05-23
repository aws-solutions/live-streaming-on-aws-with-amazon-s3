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
const uuid = require('uuid');
const cfn = require('./lib/cfn');
const mediaLive = require('./lib/medialive/');
const metrics = require('./lib/metrics');

const create = async (event, config) => {
  let responseData = {};
  let Id;
  switch (event.LogicalResourceId) {
    case 'MediaLiveInput':
      switch (config.Type) {
        case 'INPUT_DEVICE':
          responseData = await mediaLive.createDeviceInput(config);
          Id = responseData.Id;
          break;
        case 'RTP_PUSH':
          responseData = await mediaLive.createRtpInput(config);
          Id = responseData.Id;
          break;
        case 'RTMP_PUSH':
          responseData = await mediaLive.createRtmpInput(config);
          Id = responseData.Id;
          break;
        case 'URL_PULL':
          responseData = await mediaLive.createUrlInput(config);
          Id = responseData.Id;
          break;
        default:
          throw new Error('Resource is not defiend');
      }
      break;

    case 'MediaLiveChannel':
      responseData = await mediaLive.createChannel(config);
      Id = responseData.ChannelId;
      break;
    case 'MediaLiveChannelStart':
      if (config.ChannelStart === 'Yes') {
        await mediaLive.startChannel(config);
      }
      break;
    case ('UUID'):
      responseData.UUID = uuid.v4();
      break;
    case ('AnonymizedMetric'):
      if (config.SendAnonymizedMetric) {
        await metrics.send(config);
      }
      break;
    default:
      throw new Error('Resource is not defiend');
  }
  return [responseData, Id];
};

exports.handler = async (event, context) => {

  const resource = event.ResourceProperties.Resource;
  if (resource != "MediaLiveInput") {
    // Do not log MediaLive input. Which may contain sensitive passwords
    console.log(JSON.stringify(event, null, 2));
  }

  const config = event.ResourceProperties;
  let responseData = {};
  let Id;
  try {
    switch (event.RequestType) {
      case 'Create':
        [responseData, Id] = await create(event, config);
        break;
      case 'Update':
        responseData = 'update currently not supported, please delete the stack and launch a new one';
        break;
      case 'Delete':
        switch (event.LogicalResourceId) {
          case 'MediaLiveChannel':
            await mediaLive.deleteChannel(event.PhysicalResourceId);
            break;
          case 'MediaLiveInput':
            await mediaLive.deleteInput(event.PhysicalResourceId);
            break;
          default:
            console.log(`Delete not required for resource:: ${config.Resource}`);
        }
        break;
    }
    const response = await cfn.send(event, context, 'SUCCESS', responseData, Id);
    console.log('CFN STATUS:: ', response);
  }
  catch (err) {
    console.log('ERROR:: ', err, err.stack);
    await cfn.send(event, context, 'FAILED');
  }
};
