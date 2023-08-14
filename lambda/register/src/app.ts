import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MongoClient, ServerApiVersion } from 'mongodb';

interface RegisterUserRqDto {
    firstName: string;
    lastName: string;
    email: string;
    emailVerified?: boolean;
    photoUrl?: string;
    provider: IdentityProvider;
}

export interface RegisterUserRsDto {
    id?: string;
    message: string;
}

enum IdentityProvider {
    INTERNAL = 'INTERNAL',
    GOOGLE = 'GOOGLE',
}

const mongoClient = new MongoClient(process.env.mongoUrl || '', {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const body: RegisterUserRqDto = JSON.parse(event.body || '{}');

    if (!body.firstName) return generateMissingFieldResponse(body, 'firstName');
    if (!body.lastName) return generateMissingFieldResponse(body, 'lastName');
    if (!body.email) return generateMissingFieldResponse(body, 'email');
    if (!body.provider) return generateMissingFieldResponse(body, 'provider');

    await mongoClient.connect();
    const usersCollection = mongoClient.db('FormBuilder').collection('Users');
    const existingUser = await usersCollection.findOne({ email: body.email });

    if (existingUser) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                id: existingUser._id.toString(),
                message: 'User has already been registered',
            } as RegisterUserRsDto),
        };
    }

    const insertResult = await usersCollection.insertOne(body);
    if (insertResult.insertedId) {
        return {
            statusCode: 200,
            body: JSON.stringify({
                id: insertResult.insertedId.toString(),
                message: 'Registration successful',
            } as RegisterUserRsDto),
        };
    } else {
        console.log(`Error while registering a user. Request body: ${ JSON.stringify(body) }`);
        console.log(`Insertion result: ${ JSON.stringify(insertResult) }`);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Unable to register user' } as RegisterUserRsDto),
        };
    }
};

const generateMissingFieldResponse = (requestBody: RegisterUserRqDto, fieldName: string) => {
    console.log('Bad request: ' + JSON.stringify(requestBody));
    return {
        statusCode: 400,
        body: JSON.stringify({ message: fieldName + ' field is missing in the request' } as RegisterUserRsDto),
    };
};
