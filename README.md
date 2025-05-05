# CDK OpenAPI example

This is an example project for CDK development with OpenAPI, API Gateway, and Lambda

## Quickstart

```sh
git clone <repo>
cd cdk-openapi-example
npm run build
cdk deploy
```

After deployment, the output of cdk deploy will show the API Gateway URL. If you send a request to that URL, such as /posts or /posts/1, Lambda will be called and a log will be displayed.

```sh
curl https://******.execute-api.ap-northeast-1.amazonaws.com/prod/posts
curl https://******.execute-api.ap-northeast-1.amazonaws.com/prod/posts/1

{"message":"Hello from Lambda!"}
```

Finally, cleanup project

```sh
cdk destroy
```


## How to create OpenAPI project from scratch

### 1. Initialize CDK Project

```sh
mkdir cdk-openapi-example && cd cdk-openapi-example
cdk init app --language=typescript
```

### 2. Install packages

```sh
npm install aws-cdk-lib constructs
npm install @aws-cdk/aws-lambda @aws-cdk/aws-apigateway
npm install js-yaml fs --save
npm install --save-dev @types/js-yaml
```

### 3. Create simple Lambda function (lambda/handler.ts)

```ts
export const handler = async (event: any = {}): Promise<any> => {
  console.log("event:", event);
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Hello from Lambda!" }),
  };
};
```

### 4. Create OpenAPI (api/docs/openapi.yaml)

```yaml
openapi: 3.0.0
info:
  version: 1.0.0
  title: JSON Placeholder API
  description: See https://jsonplaceholder.typicode.com/
paths:
  /posts:
    get:
      description: Returns all posts
      tags: ["Posts"]
      operationId: "getPosts"
      responses:
        "200":
          description: Successful response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PostsList"
  /posts/{id}:
    get:
      description: Returns a post by id
      tags: ["Posts"]
      operationId: "getPost"
      parameters:
        - name: id
          in: path
          required: true
          description: The user id.
          schema:
            type: integer
            format: int64
      responses:
        "200":
          description: Successful response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Post"
        "404":
          description: Post not found
components:
  schemas:
    PostsList:
      type: array
      items:
        $ref: "#/components/schemas/Post"
    Post:
      type: object
      required:
        - id
        - userId
        - title
        - body
      properties:
        id:
          type: integer
        userId:
          type: integer
        title:
          type: string
        body:
          type: string
```


### 5. Create CDK code (lib/cdk-openapi-example-stack.ts)

```ts
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
```

### 6. Check auto-generated file (bin/cdk-openapi-example.ts)

```ts
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkOpenapiExampleStack } from '../lib/cdk-openapi-example-stack';

const app = new cdk.App();
new CdkOpenapiExampleStack(app, 'CdkOpenapiExampleStack');
```

### 7. Build & Deploy

```sh
npm run build
cdk deploy
```

### 8. Checking deployed app

The output of cdk deploy will show the API Gateway URL. If you send a request to that URL, such as /posts or /posts/1, Lambda will be called and a log will be displayed.

```sh
curl https://******.execute-api.ap-northeast-1.amazonaws.com/prod/posts
curl https://******.execute-api.ap-northeast-1.amazonaws.com/prod/posts/1

{"message":"Hello from Lambda!"}
```

### Cleanup project

```sh
cdk destroy
```
