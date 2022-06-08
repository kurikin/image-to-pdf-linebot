"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.handler = void 0;
var aws = require("aws-sdk");
var jspdf_1 = require("jspdf");
var docClient = new aws.DynamoDB.DocumentClient();
var s3 = new aws.S3();
var createProperOrientationPDF = function (width, height) {
    if (width > height) {
        return new jspdf_1.jsPDF("l", "mm", [width, height]);
    }
    else {
        return new jspdf_1.jsPDF("p", "mm", [height, width]);
    }
};
var getPDFNameFromDynamoDB = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    var params, data;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                params = {
                    TableName: process.env.STORAGE_IMAGETOPDFMAINDYNAMODB_NAME,
                    IndexName: "id-index",
                    KeyConditionExpression: "id = :u",
                    ExpressionAttributeValues: {
                        ":u": id
                    }
                };
                return [4 /*yield*/, docClient.query(params).promise()];
            case 1:
                data = _a.sent();
                return [2 /*return*/, data.Items[0]["pdf_name"]];
        }
    });
}); };
var convertImageToPDF = function (image) {
    var sizeChecker = new jspdf_1.jsPDF();
    var width = sizeChecker.getImageProperties(image).width;
    var height = sizeChecker.getImageProperties(image).height;
    var pdf = createProperOrientationPDF(width, height);
    pdf.addImage(image, 0, 0, width, height);
    return pdf.output("arraybuffer");
};
var createPDFBufferFromImage = function (image) {
    var arrayImage = Uint8Array.from(image);
    var arrayBufferPDF = convertImageToPDF(arrayImage);
    return Buffer.from(arrayBufferPDF);
};
var handler = function (event, _context) { return __awaiter(void 0, void 0, void 0, function () {
    var id, object, pdfName, s3Params, err_1, image, pdfBuffer, encodedName;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = event.queryStringParameters["id"];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 4, , 5]);
                return [4 /*yield*/, getPDFNameFromDynamoDB(id)];
            case 2:
                pdfName = _a.sent();
                s3Params = {
                    Bucket: process.env.STORAGE_IMAGETOPDFMAINS3_BUCKETNAME,
                    Key: id + ".jpeg"
                };
                console.log(s3Params);
                return [4 /*yield*/, s3.getObject(s3Params).promise()];
            case 3:
                object = _a.sent();
                console.log(object);
                return [3 /*break*/, 5];
            case 4:
                err_1 = _a.sent();
                console.error(err_1);
                return [2 /*return*/, {
                        statusCode: 400,
                        body: "ファイルのダウンロードエラー"
                    }];
            case 5:
                image = object.Body;
                pdfBuffer = createPDFBufferFromImage(image);
                encodedName = encodeURIComponent(pdfName + ".pdf");
                return [2 /*return*/, {
                        statusCode: 200,
                        headers: {
                            "Content-type": "application/pdf",
                            "Content-disposition": "attachment; filename*=UTF-8''" + encodedName
                        },
                        body: pdfBuffer.toString("base64"),
                        isBase64Encoded: true
                    }];
        }
    });
}); };
exports.handler = handler;
