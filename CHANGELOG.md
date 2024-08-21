# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.2.5] - 2024-08-22

### Security

- Security updates for npm packages

## [3.2.4] - 2024-08-09

### Security

- Upgraded vulnerable packages

## [3.2.3] - 2024-07-02

### Security

- Security updates

## [3.2.2] - 2023-10-30

### Security

- Security updates

## [3.2.1] - 2023-08-28

### Added

- Unit tests for custom-resource/index.js file

### Changed

- Upgraded lambda runtimes to NodeJS 18 and AWS SDK v3
- Updated npm packages

### Fixed

- Issue where Anonymized data was sent even when CfnMapping is specified as No

## [3.2.0] - 2023-05-18

### Changed

- Upgraded to cdk v2
- Added region name and account ID to AppRegistry Application name
- Changed AppRegistry Attribute Group name to Region-StackName
- Updated AppRegistry attribute and tag names
- Upgraded Lambda runtimes to node 16
- Removed application insights
- Enabled bucket versioning

## [3.1.2] - 2023-04-17

### Changed

- Updated object ownership configuration on the S3 logging bucket.

## [3.1.1] - 2022-11-09

### Changed

- Added stack name to CachePolicy to make unique name allowing for multiple concurrent stacks
- Added stack name to AppRegistry application name to allow for multiple concurrent stacks

## [3.1.0] - 2022-09-01

### Added

- SonarQube properties file: sonar-project.properties
- Added cdk nag rule suppressions
- Added SolutionId tag to resources
- Added Service Catalog AppRegistry configuration and ApplicationInsights

### Changed

- Updated deployment/run-unit-tests.sh to generate unit test coverage reports
- Updated deployment/build-s3-dist.sh to output cdk nag errors
- Disabled versioning on buckets within the CloudFront to S3 construct

## [3.0.0] - 2022-03-10

### Added

- Added Amazon S3 construct to replace AWS MediaStore for storing video segments.
- Amazon S3 request metrics added, including first byte latency, and total latency of each request.

### Changed

- Github repo name changed from live-streaming-on-aws-with-mediastore to live-streaming-on-aws-with-amazon-s3.
- Removed mediastore actions from min_user_iam_deploy.json.
- Updated architecture diagram.
- Changed references to MediaStore in implementation guide to Amazon S3.
- Removed CloudWatch MediaStore dashboard.
- Replaced mentions of MediaStore with Amazon S3 where appropriate.
- Package follow-redirects updated to 1.14.8
- Replaced resource urls pointing to MediaStore with Amazon S3 urls.

## [2.1.1] - 2022-01-24

### Changed

- Follow Redirects updated to 1.14.7
- Updated Type Script unit test
- Architecture diagram updated

## [2.1.0] - 2021-11-12

### Changed

- Added additional permissions for AWS MediaLive IAM Policy. Now has additional CloudWatch MediaConnect, and MediaStore access.
- Changed "Start MediaLive Channel" CloudFormation option to no by default. This saves money in the case customer did not want MediaLive to start on launch.

### Fixed

- Add new Permissions to the CloudFormation template that will allow customers to add tags on EML resources.

## [2.0.0] - 2021-09-27

### Added

- Added new section that explains the minimum IAM permissions a AWS IAM user needs to deploy this CloudFormation template.

### Changed

- The Amazon CloudFront distribution TTL values were modified to 1 second for all http error codes. 403, 404, 405, 500, 501, 503, and 504.
- New Amazon CloudFront cache policy that includes the "Origin" header.
- Updated outdated node.js packages.

### Fixed

- Removed logging of AWS MediaLive input details since they could contain input passwords.
- Fixed the AWS CloudWatch Dashboard url on the CloudFormation output page.
- Removed --silent from npm commands for custom builds to make it so building will not fail silently.
- Readme (<https://github.com/awslabs/video-on-demand-on-aws-foundations/issues/12>)

## [1.2.1] - 2021-07-01

### Fixed

- Updated CFN template for aws-cloudfront-mediastore CDK.
- MediaStore policy is now retricting to only requests from Amazon CloudFront.
- Updated README.

## [1.2.0] - 2020-12-21

### Added

- Updated the source code to build the CloudFormation template using the AWS CDK

## [1.1.1] - 2020-08-17

### Fixed

- added permissions for the custom resource to create SSM parameter stores.
- resolved <https://github.com/awslabs/live-streaming-on-aws-with-mediastore/issues/2>

## [1.1.0] - 2020-06-30

### Added

- Elemental Link as an input option
- changed the MediaLive Encoding segment length from 10 seconds to 4

## [1.0.0] - 2020-04-30

### Added

- CHANGELOG version 1.0.0 release
