import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { OAuth2Client } from 'google-auth-library';

interface TokenPayload {
    iss: string;
    email: string;
    email_verified: boolean;
    exp: number;
}

interface Form {
    uuid: string;
    name: string;
}

interface FormListRsDto {
    forms?: Form[];
    message?: string;
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

    const forms = await mongoClient
        .db('FormBuilder')
        .collection('Forms')
        .aggregate([
            { $match: { ownerEmail: tokenPayload.email } },
            {
                $group: {
                    _id: '$uuid',
                    max_version: { $max: '$version' },
                    document: { $last: '$$ROOT' },
                },
            },
            { $sort: { 'document._id': -1 } },
            { $project: { _id: 0, uuid: '$document.uuid', name: '$document.name' } },
        ])
        .toArray();

    return {
        statusCode: 200,
        body: JSON.stringify({
            forms: forms.map((form) => {
                return {
                    uuid: form.uuid,
                    name: form.name,
                };
            }),
        } as FormListRsDto),
    };
};

const verifyIdToken = async (event: APIGatewayProxyEvent): Promise<TokenPayload> => {
    const token = event.headers['Authorization'];

    if (!token) throw new Error('Token is missing');
    try {
        const decodedToken = await oauth2Client.verifyIdToken({
            idToken: token,
            audience: process.env.googleOAuthClientId,
        });
        console.log(`decodedToken: ${JSON.stringify(decodedToken)}`);
        if (!decodedToken.getPayload()?.email) throw new Error('Email is missing in the token');

        return decodedToken.getPayload() as TokenPayload;
    } catch (error) {
        console.error(error);
        throw new Error('Token is invalid');
    }
};

const generateUnauthorizedResponse = (message: string) => {
    return {
        statusCode: 401,
        body: JSON.stringify({ message } as FormListRsDto),
    };
};
