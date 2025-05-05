// import * as cdk from 'aws-cdk-lib';
// import { Construct } from 'constructs';
// // import * as sqs from 'aws-cdk-lib/aws-sqs';
// export class CdkOpenapiExampleStack extends cdk.Stack {
//   constructor(scope: Construct, id: string, props?: cdk.StackProps) {
//     super(scope, id, props);
//     // The code that defines your stack goes here
//     // example resource
//     // const queue = new sqs.Queue(this, 'CdkOpenapiExampleQueue', {
//     //   visibilityTimeout: cdk.Duration.seconds(300)
//     // });
//   }
// }

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export class CdkOpenapiExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Lambda function
    const fn = new lambda.Function(this, 'MyLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('lambda'),
    });

    // Loading OpenAPI and extending settings
    const openapiPath = './api/docs/openapi.yaml';
    const swaggerYaml = yaml.load(fs.readFileSync(openapiPath, 'utf-8')) as any;

    for (const path in swaggerYaml.paths) {
      for (const method in swaggerYaml.paths[path]) {
        swaggerYaml.paths[path][method]['x-amazon-apigateway-integration'] = {
          uri: `arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}:lambda:path/2015-03-31/functions/${fn.functionArn}/invocations`,
          passthroughBehavior: 'when_no_match',
          httpMethod: 'POST',
          type: 'aws_proxy',
        };
      }
    }

    // Create API Gateway
    const api = new apigateway.SpecRestApi(this, 'MySpecApi', {
      apiDefinition: apigateway.ApiDefinition.fromInline(swaggerYaml),
      restApiName: 'OpenApiGateway',
    });

    // Grant Lambda execution permission to API Gateway
    fn.addPermission('ApiInvokePermission', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: api.arnForExecuteApi(),
    });
  }
}
