import * as aws from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from "aws-lambda";
import { jsPDF } from "jspdf";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

const docClient = new aws.DynamoDB.DocumentClient();
const s3 = new aws.S3();

const createProperOrientationPDF = (width: number, height: number): jsPDF => {
    if (width > height) {
        return new jsPDF("l", "mm", [width, height]);
    } else {
        return new jsPDF("p", "mm", [height, width]);
    }
};

const getPDFNameFromDynamoDB = async (id: string): Promise<string> => {
    const params: DocumentClient.QueryInput = {
        TableName: process.env.STORAGE_IMAGETOPDFMAINDYNAMODB_NAME,
        IndexName: "id-index",
        KeyConditionExpression: "id = :u",
        ExpressionAttributeValues: {
            ":u": id,
        },
    };

    const data = await docClient.query(params).promise();
    return data.Items[0]["pdf_name"];
};

const convertImageToPDF = (image: Uint8Array): ArrayBuffer => {
    const sizeChecker: jsPDF = new jsPDF();

    const width: number = sizeChecker.getImageProperties(image).width;
    const height: number = sizeChecker.getImageProperties(image).height;

    const pdf: jsPDF = createProperOrientationPDF(width, height);

    pdf.addImage(image, 0, 0, width, height);

    return pdf.output("arraybuffer");
};

const createPDFBufferFromImage = (image: Buffer): Buffer => {
    const arrayImage: Uint8Array = Uint8Array.from(image);
    const arrayBufferPDF: ArrayBuffer = convertImageToPDF(arrayImage);

    return Buffer.from(arrayBufferPDF);
};

export const handler: APIGatewayProxyHandler = async (
    event: APIGatewayProxyEvent,
    _context: unknown
) => {
    const id: string = event.queryStringParameters["id"];

    let object: aws.S3.GetObjectOutput;
    let pdfName: string;

    try {
        pdfName = await getPDFNameFromDynamoDB(id);

        const s3Params: aws.S3.GetObjectRequest = {
            Bucket: process.env.STORAGE_IMAGETOPDFMAINS3_BUCKETNAME,
            Key: `${id}.jpeg`,
        };

        console.log(s3Params);

        object = await s3.getObject(s3Params).promise();
        console.log(object);
    } catch (err: unknown) {
        console.error(err);
        return {
            statusCode: 400,
            body: "ファイルのダウンロードエラー",
        };
    }

    const image: Buffer = object.Body as Buffer;
    const pdfBuffer: Buffer = createPDFBufferFromImage(image);

    const encodedName = encodeURIComponent(`${pdfName}.pdf`);

    return {
        statusCode: 200,
        headers: {
            "Content-type": "application/pdf",
            "Content-disposition": `attachment; filename*=UTF-8\'\'${encodedName}`,
        },
        body: pdfBuffer.toString("base64"),
        isBase64Encoded: true,
    };
};
