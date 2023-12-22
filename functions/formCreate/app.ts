import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuid } from 'uuid';

interface FormCreateRqDto {
    name: string;
    columnsNum: string;
    elements: FormElement[];
}

interface TokenPayload {
    iss: string;
    email: string;
    email_verified: boolean;
    exp: number;
}

interface Form {
    uuid: string;
    version: number;
    ownerEmail: string;
    name: string;
    columnsNum: string;
    elements: FormElement[];
}

interface FormElement {
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
}

interface FormCreateRsDto {
    uuid?: string;
    message: string;
}

const oauth2Client = new OAuth2Client();

const mongoClient = new MongoClient(process.env.mongoUrl || '', {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let tokenPayload: TokenPayload;
    try {
        tokenPayload = await verifyIdToken(event);
    } catch (error) {
        return generateUnauthorizedResponse((error as Error).message);
    }

    const body: FormCreateRqDto = JSON.parse(event.body || '{}');
    if (!body.name) return generateMissingFieldResponse(body, 'name');
    if (!body.columnsNum) return generateMissingFieldResponse(body, 'columnsNum');

    for (const element of body.elements) {
        if (!element.label) return generateMissingFieldResponse(body, 'label');
        if (!element.type) return generateMissingFieldResponse(body, 'type');
    }

    const form: Form = body as Form;
    form.uuid = uuid();
    form.version = 1;
    form.ownerEmail = tokenPayload.email;

    const insertResult = await mongoClient.db('FormBuilder').collection('Forms').insertOne(form);

    if (insertResult.insertedId) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                uuid: form.uuid,
                message: 'Creation successful',
            } as FormCreateRsDto),
        };
    } else {
        console.log(`Error while creating a form. Request body: ${ JSON.stringify(body) }`);
        console.log(`Insertion result: ${ JSON.stringify(insertResult) }`);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Unable to create form' } as FormCreateRsDto),
        };
    }
};

const verifyIdToken = async (event: APIGatewayProxyEvent): Promise<TokenPayload> => {
    const token = event.headers['Authorization'];

    if (!token) throw new Error('Token is missing');
    try {
        const decodedToken = await oauth2Client.verifyIdToken({ idToken: token, audience: process.env.googleOAuthClientId});
        console.log(`decodedToken: ${ JSON.stringify(decodedToken) }`);
        if (!decodedToken.getPayload()?.email) throw new Error('Email is missing in the token');

        return decodedToken.getPayload() as TokenPayload;
    } catch (error) {
        console.error(error);
        throw new Error('Token is invalid');
    }
}

const generateUnauthorizedResponse = (message: string) => {
    return {
        statusCode: 401,
        body: JSON.stringify({ message } as FormCreateRsDto),
    };
};

const generateMissingFieldResponse = (requestBody: FormCreateRqDto, fieldName: string) => {
    console.log('Bad request: ' + JSON.stringify(requestBody));
    return {
        statusCode: 400,
        body: JSON.stringify({ message: fieldName + ' field is missing in the request' } as FormCreateRsDto),
    };
};
