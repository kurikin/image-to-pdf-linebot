"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done
                    ? resolve(result.value)
                    : adopt(result.value).then(fulfilled, rejected);
            }
            step(
                (generator = generator.apply(thisArg, _arguments || [])).next()
            );
        });
    };
var __generator =
    (this && this.__generator) ||
    function (thisArg, body) {
        var _ = {
                label: 0,
                sent: function () {
                    if (t[0] & 1) throw t[1];
                    return t[1];
                },
                trys: [],
                ops: [],
            },
            f,
            y,
            t,
            g;
        return (
            (g = { next: verb(0), throw: verb(1), return: verb(2) }),
            typeof Symbol === "function" &&
                (g[Symbol.iterator] = function () {
                    return this;
                }),
            g
        );
        function verb(n) {
            return function (v) {
                return step([n, v]);
            };
        }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_)
                try {
                    if (
                        ((f = 1),
                        y &&
                            (t =
                                op[0] & 2
                                    ? y["return"]
                                    : op[0]
                                    ? y["throw"] ||
                                      ((t = y["return"]) && t.call(y), 0)
                                    : y.next) &&
                            !(t = t.call(y, op[1])).done)
                    )
                        return t;
                    if (((y = 0), t)) op = [op[0] & 2, t.value];
                    switch (op[0]) {
                        case 0:
                        case 1:
                            t = op;
                            break;
                        case 4:
                            _.label++;
                            return { value: op[1], done: false };
                        case 5:
                            _.label++;
                            y = op[1];
                            op = [0];
                            continue;
                        case 7:
                            op = _.ops.pop();
                            _.trys.pop();
                            continue;
                        default:
                            if (
                                !((t = _.trys),
                                (t = t.length > 0 && t[t.length - 1])) &&
                                (op[0] === 6 || op[0] === 2)
                            ) {
                                _ = 0;
                                continue;
                            }
                            if (
                                op[0] === 3 &&
                                (!t || (op[1] > t[0] && op[1] < t[3]))
                            ) {
                                _.label = op[1];
                                break;
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                                _.label = t[1];
                                t = op;
                                break;
                            }
                            if (t && _.label < t[2]) {
                                _.label = t[2];
                                _.ops.push(op);
                                break;
                            }
                            if (t[2]) _.ops.pop();
                            _.trys.pop();
                            continue;
                    }
                    op = body.call(thisArg, _);
                } catch (e) {
                    op = [6, e];
                    y = 0;
                } finally {
                    f = t = 0;
                }
            if (op[0] & 5) throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
exports.__esModule = true;
exports.handler = void 0;
var aws = require("aws-sdk");
var axios_1 = require("axios");
var bot_sdk_1 = require("@line/bot-sdk");
var Jimp = require("jimp");
var nanoid_1 = require("nanoid");
var docClient = new aws.DynamoDB.DocumentClient();
var s3 = new aws.S3();
var checkAccessIsFirstTime = function (userId) {
    return __awaiter(void 0, void 0, void 0, function () {
        var params;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    params = {
                        TableName:
                            process.env.STORAGE_IMAGETOPDFMAINDYNAMODB_NAME,
                        Item: {
                            user_id: userId,
                            id: (0, nanoid_1.nanoid)(),
                            pdf_name_waiting: false,
                        },
                        ConditionExpression: "attribute_not_exists(user_id)",
                    };
                    return [
                        4 /*yield*/,
                        docClient
                            .put(params)
                            .promise()
                            ["catch"](function (err) {
                                if (
                                    err.code !==
                                    "ConditionalCheckFailedException"
                                ) {
                                    throw new Error(err.code);
                                }
                            }),
                    ];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
var createResponse = function (replyText) {
    var response = {
        type: "text",
        text: replyText,
    };
    return response;
};
var createDownloadInfoResponses = function (pdfName, id) {
    var responses = [];
    var texts = [
        "\u30D5\u30A1\u30A4\u30EB\u540D\u300C" +
            pdfName +
            ".pdf\u300D\u3067PDF\u306B\u5909\u63DB\u3057\u305F\u3088\uFF01",
        "\u4EE5\u4E0B\u306EURL\u306BPC\u304B\u3089\u30A2\u30AF\u30BB\u30B9\u3059\u308B\u3068\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3067\u304D\u308B\u3088\uFF01\n\uFF08URL\u306F\u56FA\u5B9A\u306A\u306E\u3067\u30D6\u30C3\u30AF\u30DE\u30FC\u30AF\u3057\u3066\u304A\u304F\u3068\u4FBF\u5229\u3067\u3059\uFF01\uFF09",
        process.env.PDF_DOWNLOAD_URL + "?id=" + id,
    ];
    for (var _i = 0, texts_1 = texts; _i < texts_1.length; _i++) {
        var text = texts_1[_i];
        responses.push(createResponse(text));
    }
    return responses;
};
var createAskPDFNameResponses = function () {
    var responses = [];
    var texts = [
        "変換先のPDFファイルに付ける名前を「.pdf」は含めずに教えてね！\n例）\n○：第3回レポート\n ×：第3回レポート.pdf",
        "最初からやり直す場合には「キャンセル」と送ってね！",
    ];
    for (var _i = 0, texts_2 = texts; _i < texts_2.length; _i++) {
        var text = texts_2[_i];
        responses.push(createResponse(text));
    }
    return responses;
};
var fetchValueFromDynamoDB = function (userId, key) {
    return __awaiter(void 0, void 0, void 0, function () {
        var params, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    params = {
                        TableName:
                            process.env.STORAGE_IMAGETOPDFMAINDYNAMODB_NAME,
                        Key: {
                            user_id: userId,
                        },
                    };
                    return [4 /*yield*/, docClient.get(params).promise()];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.Item[key]];
            }
        });
    });
};
var fetchItemFromDynamoDB = function (userId) {
    return __awaiter(void 0, void 0, void 0, function () {
        var params;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    params = {
                        TableName:
                            process.env.STORAGE_IMAGETOPDFMAINDYNAMODB_NAME,
                        Key: {
                            user_id: userId,
                        },
                    };
                    return [4 /*yield*/, docClient.get(params).promise()];
                case 1:
                    return [2 /*return*/, _a.sent()];
            }
        });
    });
};
var updateItemInDynamoDB = function (userId, key, value) {
    return __awaiter(void 0, void 0, void 0, function () {
        var params;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    params = {
                        TableName:
                            process.env.STORAGE_IMAGETOPDFMAINDYNAMODB_NAME,
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
                    return [4 /*yield*/, docClient.update(params).promise()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
var putJpegImageToS3 = function (id, image) {
    return __awaiter(void 0, void 0, void 0, function () {
        var params;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    params = {
                        Bucket: process.env.STORAGE_IMAGETOPDFMAINS3_BUCKETNAME,
                        Key: id + ".jpeg",
                        Body: image,
                    };
                    return [4 /*yield*/, s3.putObject(params).promise()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
var eventHandler = function (event, client) {
    return __awaiter(void 0, void 0, void 0, function () {
        var replyToken, userId, text, messageId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Process all variables here.
                    if (event.type !== "message") {
                        return [2 /*return*/];
                    }
                    replyToken = event.replyToken;
                    userId = event.source.userId;
                    // 初回アクセスの場合は user_id & id を追加する
                    return [
                        4 /*yield*/,
                        checkAccessIsFirstTime(userId)["catch"](function (err) {
                            return __awaiter(
                                void 0,
                                void 0,
                                void 0,
                                function () {
                                    var responses, replyText;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                console.log(err);
                                                responses = [];
                                                replyText =
                                                    "エラーが発生したよ";
                                                responses.push(
                                                    createResponse(replyText)
                                                );
                                                return [
                                                    4 /*yield*/,
                                                    client.replyMessage(
                                                        replyToken,
                                                        responses
                                                    ),
                                                ];
                                            case 1:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }
                            );
                        }),
                    ];
                case 1:
                    // 初回アクセスの場合は user_id & id を追加する
                    _a.sent();
                    if (!(event.message.type === "text"))
                        return [3 /*break*/, 3];
                    text = event.message.text;
                    return [
                        4 /*yield*/,
                        textEventHandler(replyToken, userId, text, client),
                    ];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3:
                    if (!(event.message.type === "image"))
                        return [3 /*break*/, 5];
                    messageId = event.message.id;
                    return [
                        4 /*yield*/,
                        imageEventHandler(
                            replyToken,
                            messageId,
                            client,
                            userId
                        ),
                    ];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    return [2 /*return*/];
            }
        });
    });
};
var textEventHandler = function (replyToken, userId, text, client) {
    return __awaiter(void 0, void 0, void 0, function () {
        var responses, data, pdfNameWaiting, id, replyText;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    responses = [];
                    return [4 /*yield*/, fetchItemFromDynamoDB(userId)];
                case 1:
                    data = _a.sent();
                    pdfNameWaiting = data.Item["pdf_name_waiting"];
                    id = data.Item["id"];
                    if (!(pdfNameWaiting == false)) return [3 /*break*/, 2];
                    replyText = "まず画像を送ってね！";
                    responses.push(createResponse(replyText));
                    return [3 /*break*/, 6];
                case 2:
                    if (!(text == "キャンセル")) return [3 /*break*/, 4];
                    return [
                        4 /*yield*/,
                        updateItemInDynamoDB(userId, "pdf_name_waiting", false)
                            .then(function () {
                                var replyText = "キャンセルしました！";
                                responses.push(createResponse(replyText));
                            })
                            ["catch"](function (err) {
                                responses.push(createResponse("エラー"));
                                console.log(err);
                            }),
                    ];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    return [
                        4 /*yield*/,
                        updateItemInDynamoDB(userId, "pdf_name", text)
                            .then(function () {
                                return updateItemInDynamoDB(
                                    userId,
                                    "pdf_name_waiting",
                                    false
                                );
                            })
                            .then(function () {
                                responses.push.apply(
                                    responses,
                                    createDownloadInfoResponses(text, id)
                                );
                            })
                            ["catch"](function (err) {
                                responses.push(createResponse("エラー"));
                                console.error(err);
                            }),
                    ];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    return [
                        4 /*yield*/,
                        client.replyMessage(replyToken, responses),
                    ];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
var generateJpegBuffer = function (buffer, extension) {
    return __awaiter(void 0, void 0, void 0, function () {
        var image;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(extension === "png")) return [3 /*break*/, 3];
                    return [4 /*yield*/, Jimp.read(buffer)];
                case 1:
                    image = _a.sent();
                    image.quality(100);
                    return [4 /*yield*/, image.getBufferAsync(Jimp.MIME_JPEG)];
                case 2:
                    return [2 /*return*/, _a.sent()];
                case 3:
                    return [2 /*return*/, buffer];
            }
        });
    });
};
var imageEventHandler = function (replyToken, messageId, client, userId) {
    return __awaiter(void 0, void 0, void 0, function () {
        var responses,
            accessToken,
            url,
            params,
            res,
            buffer,
            extension,
            jpegBuffer,
            id,
            err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    responses = [];
                    accessToken = process.env.CHANNEL_ACCESS_TOKEN;
                    url =
                        "https://api-data.line.me/v2/bot/message/" +
                        messageId +
                        "/content";
                    params = {
                        responseType: "arraybuffer",
                        headers: {
                            Authorization: "Bearer " + accessToken,
                        },
                    };
                    return [4 /*yield*/, axios_1["default"].get(url, params)];
                case 1:
                    res = _a.sent();
                    if (!(res.status !== 200)) return [3 /*break*/, 3];
                    console.log(res);
                    responses.push(createResponse("エラー"));
                    return [
                        4 /*yield*/,
                        client.replyMessage(replyToken, responses),
                    ];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    buffer = res.data;
                    extension = res.headers["content-type"].split("/")[1];
                    return [4 /*yield*/, generateJpegBuffer(buffer, extension)];
                case 4:
                    jpegBuffer = _a.sent();
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 9, , 10]);
                    return [4 /*yield*/, fetchValueFromDynamoDB(userId, "id")];
                case 6:
                    id = _a.sent();
                    return [4 /*yield*/, putJpegImageToS3(id, jpegBuffer)];
                case 7:
                    _a.sent();
                    return [
                        4 /*yield*/,
                        updateItemInDynamoDB(userId, "pdf_name_waiting", true),
                    ];
                case 8:
                    _a.sent();
                    responses.push.apply(
                        responses,
                        createAskPDFNameResponses()
                    );
                    return [3 /*break*/, 10];
                case 9:
                    err_1 = _a.sent();
                    console.log(err_1);
                    responses.push(createResponse("エラー"));
                    return [3 /*break*/, 10];
                case 10:
                    return [
                        4 /*yield*/,
                        client.replyMessage(replyToken, responses),
                    ];
                case 11:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
var handler = function (event, _context) {
    return __awaiter(void 0, void 0, void 0, function () {
        var clientConfig, client, body;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log(JSON.stringify(event));
                    clientConfig = {
                        channelSecret: process.env.CHANNEL_SECRET,
                        channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
                    };
                    client = new bot_sdk_1.Client(clientConfig);
                    body = JSON.parse(event.body);
                    return [
                        4 /*yield*/,
                        Promise.all(
                            body.events.map(function (event) {
                                return __awaiter(
                                    void 0,
                                    void 0,
                                    void 0,
                                    function () {
                                        return __generator(this, function (_a) {
                                            return [
                                                2 /*return*/,
                                                eventHandler(event, client),
                                            ];
                                        });
                                    }
                                );
                            })
                        )["catch"](function (_) {
                            return {
                                statusCode: 500,
                                body: "Error",
                            };
                        }),
                    ];
                case 1:
                    _a.sent();
                    return [
                        2 /*return*/,
                        {
                            statusCode: 200,
                            body: "OK",
                        },
                    ];
            }
        });
    });
};
exports.handler = handler;
