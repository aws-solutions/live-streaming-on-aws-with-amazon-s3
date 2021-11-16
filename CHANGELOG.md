# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2021-11-12
### Changed
- Added additional permissions for AWS MediaLive IAM Policy. Now has additional CloudWatch, MediaConnect, and MediaStore access. 
- Changed "Start MediaLive Channel" CloudFormation option to no by default. This saves money in the case customer did not want MediaLive to start on launch. 

### Fixed
- Add new Permissions to the CloudFormation template that will allow customers to add tags on EML resources. 

## [2.0.0] - 2021-9-27
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
- Readme (https://github.com/awslabs/video-on-demand-on-aws-foundations/issues/12)


## [1.2.1] - 2021-7-1
### Fixed
- Updated CFN template for aws-cloudfront-mediastore CDK. 
- MediaStore policy is now retricting to only requests from Amazon CloudFront.
- Updated README.


## [1.2.0] - 2020-12-21
### Added
- Updated the source code to build the CloudFormation template using the AWS CDK 

## [1.1.1] - 2020-08-17
### Bugfix
- added permissions for the custom resource to create SSM parameter stores.
- resolved https://github.com/awslabs/live-streaming-on-aws-with-mediastore/issues/2

## [1.1.0] - 2020-06-30
### Added
- Elemental Link as an input option
- changed the MediaLive Encoding segment length from 10 seconds to 4

## [1.0.0] - 2020-04-30
### Added
- CHANGELOG version 1.0.0 release