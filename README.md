# Form Builder Backend
AWS Lambda functions for https://github.com/pkorchak/Form-Builder-UI application.

This project contains source code and supporting files for a serverless application that can be deployed with the SAM CLI.

The application uses several AWS resources, including Lambda functions and API Gateway. These resources are defined in the `template.yml` file.

## Required tools

* SAM CLI - [Install the SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
* Node.js - [Install Node.js 18](https://nodejs.org/en/), including the NPM package management tool.
* Docker - [Install Docker community edition](https://hub.docker.com/search/?type=edition&offering=community)

## Deployment

To build and deploy the application, run the following in your shell:

```bash
sam build
sam deploy --guided
```

## Local Testing

Build the application with the `sam build` command.

```bash
sam build
```

Test a single function by invoking it directly with a test event. An event is a JSON document that represents the input that the function receives from the event source. Test events are included in the `events` folder.

Run functions locally and invoke them with the `sam local invoke` command. For example:

```bash
sam local invoke FormCreateFunction -e events/formCreate.json
```

The SAM CLI can also emulate the application's API. Use the `sam local start-api` to run the API locally on port 3000. Usage example:

```bash
sam local start-api
curl --location 'http://localhost:3000/users/register' \
--data-raw '{\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"johndoe@example.com\",\"provider\":\"GOOGLE\"}'
```
