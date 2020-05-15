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
const axios = require('axios');
const expect = require('chai').expect;
const MockAdapter = require('axios-mock-adapter');

const lambda = require('./index.js');
const _config = {
    SolutionId: 'SO0021',
    UUID: '999-999'
  }

describe('#SEND METRICS', () => {
  it('should return "200" on a send metrics sucess', async () => {
    const mock = new MockAdapter(axios);
    mock.onPost().reply(200, {});
      await lambda.send(_config, (err, res) => {
        expect(res.status).to.equal(200);
      });
  });
  it('should return "Network Error" on send metrics', async () => {
    const mock = new MockAdapter(axios);
    mock.onPut().networkError();
    await lambda.send(_config).catch(err => {
      expect(err.toString()).to.equal("Error: Request failed with status code 404");
    });
  });
});
