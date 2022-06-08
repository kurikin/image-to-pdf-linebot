import * as aws from "aws-sdk";
import axios, { AxiosRequestConfig } from "axios";
import {
    ClientConfig,
    Client,
    WebhookEvent,
    MessageAPIResponseBase,
    TextMessage,
    WebhookRequestBody,
} from "@line/bot-sdk";
import { APIGatewayEvent, APIGatewayProxyHandler } from "aws-lambda";
import * as base64 from "base-64";
import * as utf8 from "utf8";
import * as Jimp from "jimp";
import { nanoid } from "nanoid";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

const docClient = new aws.DynamoDB.DocumentClient();
const s3 = new aws.S3();

const checkAccessIsFirstTime = async (userId: string): Promise<void> => {
    const params: DocumentClient.PutItemInput = {
        TableName: process.env.STORAGE_IMAGETOPDFMAINDYNAMODB_NAME,
        Item: {
            user_id: userId,
            id: nanoid(),
            pdf_name_waiting: false,
        },
        ConditionExpression: "attribute_not_exists(user_id)",
    };

    await docClient
        .put(params)
        .promise()
        .catch((err) => {
            if (err.code !== "ConditionalCheckFailedException") {
                throw new Error(err.code);
            }
        });
};

const createResponse = (replyText: string): TextMessage => {
    const response: TextMessage = {
        type: "text",
        text: replyText,
    };

    return response;
};

const createDownloadInfoResponses = (
    pdfName: string,
    id: string
): TextMessage[] => {
    const responses: TextMessage[] = [];
    const texts: string[] = [
        `ファイル名「${pdfName}.pdf」でPDFに変換したよ！`,
        `以下のURLにPCからアクセスするとダウンロードできるよ！\n（URLは固定なのでブックマークしておくと便利です！）`,
        `${process.env.PDF_DOWNLOAD_URL}?id=${id}`,
    ];

    for (const text of texts) {
        responses.push(createResponse(text));
    }

    return responses;
};

const createAskPDFNameResponses = (): TextMessage[] => {
    const responses: TextMessage[] = [];

    const texts: string[] = [
        "変換先のPDFファイルに付ける名前を「.pdf」は含めずに教えてね！\n例）\n○：第3回レポート\n ×：第3回レポート.pdf",
        "最初からやり直す場合には「キャンセル」と送ってね！",
    ];

    for (const text of texts) {
        responses.push(createResponse(text));
    }

    return responses;
};

const fetchValueFromDynamoDB = async (
    userId: string,
    key: string
): Promise<any> => {
    const params: DocumentClient.GetItemInput = {
        TableName: process.env.STORAGE_IMAGETOPDFMAINDYNAMODB_NAME,
        Key: {
            user_id: userId,
        },
    };

    const data: DocumentClient.GetItemOutput = await docClient
        .get(params)
        .promise();
    return data.Item[key];
};

const fetchItemFromDynamoDB = async (
    userId: string
): Promise<DocumentClient.GetItemOutput> => {
    const params: DocumentClient.GetItemInput = {
        TableName: process.env.STORAGE_IMAGETOPDFMAINDYNAMODB_NAME,
        Key: {
            user_id: userId,
        },
    };

    return await docClient.get(params).promise();
};

const updateItemInDynamoDB = async (
    userId: string,
    key: string,
    value: any
): Promise<void> => {
    const params: DocumentClient.UpdateItemInput = {
        TableName: process.env.STORAGE_IMAGETOPDFMAINDYNAMODB_NAME,
        Key: {
            user_id: userId,
        },
        UpdateExpression: "set #key=:value",
        ExpressionAttributeNames: {
            "#key": key,
        },
        ExpressionAttributeValues: {
            ":value": value,
        },
    };

    await docClient.update(params).promise();
};

const putJpegImageToS3 = async (id: string, image: Buffer): Promise<void> => {
    const params: aws.S3.PutObjectRequest = {
        Bucket: process.env.STORAGE_IMAGETOPDFMAINS3_BUCKETNAME,
        Key: `${id}.jpeg`,
        Body: image,
    };

    await s3.putObject(params).promise();
};

const eventHandler = async (
    event: WebhookEvent,
    client: Client
): Promise<MessageAPIResponseBase> => {
    // Process all variables here.
    if (event.type !== "message") {
        return;
    }

    const replyToken: string = event.replyToken;
    const userId: string = event.source.userId;

    // 初回アクセスの場合は user_id & id を追加する
    await checkAccessIsFirstTime(userId).catch(async (err) => {
        console.log(err);
        const responses: TextMessage[] = [];
        const replyText: string = "エラーが発生したよ";

        responses.push(createResponse(replyText));
        await client.replyMessage(replyToken, responses);
    });

    if (event.message.type === "text") {
        const text: string = event.message.text;
        await textEventHandler(replyToken, userId, text, client);
    } else if (event.message.type === "image") {
        const messageId: string = event.message.id;
        await imageEventHandler(replyToken, messageId, client, userId);
    }
};

const textEventHandler = async (
    replyToken: string,
    userId: string,
    text: string,
    client: Client
): Promise<void> => {
    const responses: TextMessage[] = [];

    const data: DocumentClient.GetItemOutput = await fetchItemFromDynamoDB(
        userId
    );
    const pdfNameWaiting: Boolean = data.Item["pdf_name_waiting"];
    const id: string = data.Item["id"];

    if (pdfNameWaiting == false) {
        const replyText: string = "まず画像を送ってね！";
        responses.push(createResponse(replyText));
    } else if (text == "キャンセル") {
        await updateItemInDynamoDB(userId, "pdf_name_waiting", false)
            .then(() => {
                const replyText: string = "キャンセルしました！";
                responses.push(createResponse(replyText));
            })
            .catch((err: unknown) => {
                responses.push(createResponse("エラー"));
                console.log(err);
            });
    } else {
        await updateItemInDynamoDB(userId, "pdf_name", text)
            .then(() => updateItemInDynamoDB(userId, "pdf_name_waiting", false))
            .then(() => {
                responses.push(...createDownloadInfoResponses(text, id));
            })
            .catch((err: unknown) => {
                responses.push(createResponse("エラー"));
                console.error(err);
            });
    }

    await client.replyMessage(replyToken, responses);
};

const generateJpegBuffer = async (
    buffer: Buffer,
    extension: string
): Promise<Buffer> => {
    if (extension === "png") {
        const image = await Jimp.read(buffer);
        image.quality(100);
        return await image.getBufferAsync(Jimp.MIME_JPEG);
    } else {
        return buffer;
    }
};

const imageEventHandler = async (
    replyToken: string,
    messageId: string,
    client: Client,
    userId: string
): Promise<void> => {
    const responses: TextMessage[] = [];
    const accessToken: string = process.env.CHANNEL_ACCESS_TOKEN;

    const url: string = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
    const params: AxiosRequestConfig = {
        responseType: "arraybuffer",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    };

    const res = await axios.get(url, params);

    if (res.status !== 200) {
        console.log(res);
        responses.push(createResponse("エラー"));
        await client.replyMessage(replyToken, responses);
    }

    const buffer: Buffer = res.data;
    const extension: string = res.headers["content-type"].split("/")[1];

    const jpegBuffer: Buffer = await generateJpegBuffer(buffer, extension);

    try {
        const id: string = await fetchValueFromDynamoDB(userId, "id");

        await putJpegImageToS3(id, jpegBuffer);
        await updateItemInDynamoDB(userId, "pdf_name_waiting", true);

        responses.push(...createAskPDFNameResponses());
    } catch (err: unknown) {
        console.log(err);
        responses.push(createResponse("エラー"));
    }

    await client.replyMessage(replyToken, responses);
};

export const handler: APIGatewayProxyHandler = async (
    event: APIGatewayEvent,
    _context: unknown
) => {
    console.log(JSON.stringify(event));

    // Setup all LINE client and Express configurations.
    const clientConfig: ClientConfig = {
        channelSecret: process.env.CHANNEL_SECRET,
        channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    };

    // Create a new LINE SDK client.
    const client: Client = new Client(clientConfig);

    // const bytes: string = base64.decode(event.body);
    const body: WebhookRequestBody = JSON.parse(event.body);

    await Promise.all(
        body.events.map(async (event) => eventHandler(event, client))
    ).catch((_) => {
        return {
            statusCode: 500,
            body: "Error",
        };
    });

    return {
        statusCode: 200,
        body: "OK",
    };
};
