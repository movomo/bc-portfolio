import * as dotenv from "dotenv";
dotenv.config();

import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import is from "@sindresorhus/is";
import multer from "multer";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { Router } from "express";

import { login_required } from "../middlewares/login_required";
import { userAuthService } from "../services/userService";
import * as status from "../utils/status";
import { RequestError } from "../utils/errors";
import { Logger, UNIFIED_LOG } from "../utils/logging";

const logger = new Logger({
    name: `userRouter`,
    tee: [
        UNIFIED_LOG,
        Logger.generateLogPath(`user.log`),
        Logger.generateLogPath(`router.log`),
        Logger.generateLogPath(`userrouter.log`),
    ],
    default_level: 2,
});

[
    "SERVER_DOMAIN",
    "SERVER_PORT",
    "SERVICE_DOMAIN",
    "MAILER_PASSWORD",
    "IMAGE_ENDPOINT",
    "IMAGE_ACCESSKEY",
    "IMAGE_SECRETACCESSKEY",
    "IMAGE_BUCKET",
].forEach((k) => {
    if (!(k in process.env)) {
        throw new Error(`OUR STUPID ADMIN FORGOT TO ADD "${k}" IN THE ENV`);
    }
});

const userAuthRouter = Router();
const upload = multer();

const transport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "team5portfolioservice@gmail.com",
        pass: process.env.MAILER_PASSWORD,
    },
});

userAuthRouter.post(
    "/user/profileImage",
    upload.single("image"),
    async function (req, res, next) {
        try {
            const S3 = new AWS.S3({
                endpoint: new AWS.Endpoint(process.env.IMAGE_ENDPOINT),
                region: "kr-standard",
                credentials: {
                    accessKeyId: process.env.IMAGE_ACCESSKEY,
                    secretAccessKey: process.env.IMAGE_SECRETACCESSKEY,
                },
            });
            //create unique id
            const imageName = uuidv4();

            logger.log(
                {},
                `POST /user/profileImage`,
                `imageName = ${imageName}`
            );

            //add image file in Bucket in Ncloud with settings
            await S3.putObject({
                Bucket: process.env.IMAGE_BUCKET,
                Key: `${imageName}.PNG`,
                //ACL is access permission in image, all client can acces
                // imagefile with 'public-read'
                ACL: "public-read",
                Body: req.file.buffer,
                ContentType: "image/png",
            }).promise();
            //return image url
            res.status(status.STATUS_200_OK).json({
                imageLink:
                    `${process.env.IMAGE_ENDPOINT}/` +
                    `${process.env.IMAGE_BUCKET}/` +
                    `${imageName}.PNG`,
            });
        } catch (error) {
            next(error);
        }
    }
);

userAuthRouter.post("/user/register", async function (req, res, next) {
    try {
        if (is.emptyObject(req.body)) {
            throw new RequestError(
                "headers??? Content-Type??? application/json?????? ??????????????????"
            );
        }

        // req (request) ?????? ????????? ????????????
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;

        logger.log(
            {},
            `POST /user/register`,
            `name = ${name}`,
            `email = ${email}`
        );

        // ??? ???????????? ?????? db??? ????????????
        const newUser = await userAuthService.addUser({
            name,
            email,
            password,
        });

        if ("errorMessage" in newUser) {
            throw new RequestError(
                { status: newUser.statusCode },
                newUser.errorMessage
            );
        }

        /* */
        // ?????????: ????????? ????????? ???????????????.
        // crypto ??? 128?????? ????????? ???????????? ????????? ??? ????????? ????????? ????????????.
        // ?????? ????????? ?????? ?????? db??? ???????????????.
        let activationKey = crypto
            .generateKeySync("aes", { length: 128 })
            .export()
            .toString("hex");
        // sendMail??? ????????? ???????????? ????????? ??????????????? ???????????????.
        // ???????????? ???????????? ??????????????? ????????? ??? ????????? ???????????? ?????? ???????????? ????????????.
        const activationPath =
            `${process.env.SERVER_DOMAIN}:${process.env.SERVER_PORT}/users` +
            `/${newUser.id}/activate/${activationKey}`;
        //
        logger.log({}, `activationPath = ${activationPath}`);
        //
        transport.sendMail({
            from: "team5portfolioservice@gmail.com",
            to: email,
            subject: "??????????????? ????????? ?????? ????????? ??????",
            html: `
                <html>
                    <body>
                        ${newUser.name} ??? ???????????????!
                        <br>
                        <a href="${activationPath}">
                            ??? ????????? ????????? ????????? ?????????????????????
                        </a>
                        <br>
                        <!-- ${activationPath} -->
                    </body>
                </html>
                `,
        });
        if (
            !(await userAuthService.setActivation({
                user_id: newUser.id,
                activation_key: activationKey,
            }))
        ) {
            throw new Error(
                `Failed storing activation code for user {${newUser.id}}`
            );
        }
        /* */

        res.status(status.STATUS_201_CREATED).json(newUser);
    } catch (error) {
        next(error);
    }
});

userAuthRouter.post("/user/login", async function (req, res, next) {
    try {
        // req (request) ?????? ????????? ????????????
        const email = req.body.email;
        const password = req.body.password;
        logger.log({}, `POST /user/login`, `email = ${email}`);

        // ??? ???????????? ???????????? ?????? db?????? ?????? ??????
        const user = await userAuthService.getUser({ email, password });

        if ("errorMessage" in user) {
            throw new RequestError(
                { status: user.statusCode },
                user.errorMessage
            );
        }

        if (user.active !== "y") {
            throw new RequestError(
                { status: status.STATUS_403_FORBIDDEN },
                "Account not activated"
            );
        }

        res.status(status.STATUS_200_OK).json(user);
    } catch (error) {
        next(error);
    }
});

userAuthRouter.get(
    "/userlist",
    login_required,
    async function (req, res, next) {
        try {
            // ?????? ????????? ????????? ??????
            const users = await userAuthService.getUsers();
            res.status(status.STATUS_200_OK).json(users);
        } catch (error) {
            next(error);
        }
    }
);

userAuthRouter.get(
    "/user/current",
    login_required,
    async function (req, res, next) {
        try {
            // jwt???????????? ????????? ????????? id??? ????????? db?????? ????????? ????????? ??????.
            const user_id = req.currentUserId;
            const currentUserInfo = await userAuthService.getUserInfo({
                user_id,
            });

            if ("errorMessage" in currentUserInfo) {
                throw new RequestError(
                    { status: currentUserInfo.statusCode },
                    currentUserInfo.errorMessage
                );
            }

            res.status(status.STATUS_200_OK).json(currentUserInfo);
        } catch (error) {
            next(error);
        }
    }
);

userAuthRouter.put(
    "/users/:id",
    login_required,
    async function (req, res, next) {
        try {
            // URI????????? ????????? id??? ?????????.
            const user_id = req.params.id;
            // body data ????????? ??????????????? ????????? ????????? ?????????.
            if (user_id !== req.currentUserId) {
                throw new RequestError(
                    { status: status.STATUS_403_FORBIDDEN },
                    `Trying to set different user's Info`
                );
            }
            //???????????? ??????????????? ??????????????? ???????????? ????????????.
            const name = req.body.name ?? null;
            const description = req.body.description ?? null;
            const profileImage = req.body.profileImage ?? null;
            const user_category = req.body.user_category ?? null;
            const user_mvp = req.body.user_mvp ?? null;
            const toUpdate = {
                name,
                description,
                profileImage,
                user_category,
                user_mvp,
            };

            // ?????? ????????? ???????????? ????????? ????????? db?????? ?????? ???????????????. ???????????? ????????? ?????? ??? ?????????
            const updatedUser = await userAuthService.setUser({
                user_id,
                toUpdate,
            });

            if ("errorMessage" in updatedUser) {
                throw new RequestError(
                    { status: updatedUser.statusCode },
                    updatedUser.errorMessage
                );
            }

            res.status(status.STATUS_200_OK).json(updatedUser);
        } catch (error) {
            next(error);
        }
    }
);
userAuthRouter.put(
    "/users/:id/password",
    login_required,
    async function (req, res, next) {
        try {
            // URI????????? ????????? id??? ?????????.
            const user_id = req.params.id;
            // body data ????????? ??????????????? ????????? ????????? ?????????.
            if (user_id !== req.currentUserId) {
                throw new RequestError(
                    { status: status.STATUS_403_FORBIDDEN },
                    `Trying to set different user's Password`
                );
            }
            const password = req.body.password ?? null;
            const passwordReset = req.body.passwordReset ?? null;
            if (!password || !passwordReset) {
                throw new Error(`password and passwordReset is required`);
            }
            const updatedUser = await userAuthService.setUserPassword({
                user_id,
                password,
                passwordReset,
            });

            if ("errorMessage" in updatedUser) {
                throw new RequestError(
                    { status: updatedUser.statusCode },
                    updatedUser.errorMessage
                );
            }
            res.status(status.STATUS_200_OK).json(updatedUser);
        } catch (error) {
            next(error);
        }
    }
);
userAuthRouter.put(
    "/users/:id/likes",
    login_required,
    async function (req, res, next) {
        try {
            // URI????????? ????????? id??? ?????????.
            const user_id = req.params.id;
            // body data ????????? ??????????????? ????????? ????????? ?????????.
            if (user_id !== req.currentUserId) {
                throw new RequestError(
                    { status: status.STATUS_403_FORBIDDEN },
                    `Trying to set different user's likes`
                );
            }
            const following = req.body.following ?? null;
            const state = req.body.state ?? null;
            if (!following || !(state === true || state === false)) {
                throw new Error(`following and state are required`);
            }
            const updatedUser = await userAuthService.setUserLikes({
                user_id,
                following,
                state,
            });

            if ("errorMessage" in updatedUser) {
                throw new RequestError(
                    { status: updatedUser.statusCode },
                    updatedUser.errorMessage
                );
            }
            res.status(status.STATUS_200_OK).json(updatedUser);
        } catch (error) {
            next(error);
        }
    }
);
userAuthRouter.get(
    "/users/:id",
    login_required,
    async function (req, res, next) {
        try {
            const user_id = req.params.id;
            const userInfo = await userAuthService.getUserInfo({
                user_id,
            });

            if ("errorMessage" in userInfo) {
                throw new RequestError(
                    { status: userInfo.statusCode },
                    userInfo.errorMessage
                );
            }

            res.status(status.STATUS_200_OK).json(userInfo);
        } catch (error) {
            next(error);
        }
    }
);

// ?????????: ????????? ????????? ??????????????????.
// ????????? ??????????????? ??? ???????????? ???????????? ???????????? ????????? ????????? ????????? ????????? ????????????.
userAuthRouter.get(
    "/users/:id/activate/:activation_key",
    async function (req, res, next) {
        try {
            const id = req.params.id;
            const activationKey = req.params.activation_key;
            const user = await userAuthService.getUserInfo({
                user_id: id,
            });
            if ("errorMessage" in user) {
                throw new RequestError(
                    { status: user.statusCode },
                    user.errorMessage
                );
            }

            if (activationKey === user.activation_key) {
                await userAuthService.setActivation({
                    user_id: id,
                    active: "y",
                });
                // res.status(status.STATUS_200_OK).json({ result: true });
                // ????????? ???????????? ???????????? ????????????
                logger.log({ __level__: 2 }, `activate user of id {${id}}`);
                res.status(status.STATUS_200_OK).redirect(
                    process.env.SERVICE_DOMAIN
                );
            } else {
                throw new RequestError(
                    { status: status.STATUS_403_FORBIDDEN },
                    "Mismatching activation code"
                );
            }
        } catch (error) {
            next(error);
        }
    }
);

userAuthRouter.delete(
    "/users/:id",
    login_required,
    async function (req, res, next) {
        try {
            // URI????????? ????????? id??? ?????????.
            const user_id = req.params.id;
            if (user_id !== req.currentUserId) {
                throw new RequestError(
                    { status: status.STATUS_403_FORBIDDEN },
                    `Trying to delete a different user other than himself`
                );
            }

            const currentUserInfo = await userAuthService.getUserInfo({
                user_id,
            });

            if ("errorMessage" in currentUserInfo) {
                throw new RequestError(
                    { status: currentUserInfo.statusCode },
                    currentUserInfo.errorMessage
                );
            }
            const result = await userAuthService.deleteUser({ user_id });
            res.status(status.STATUS_200_OK).json(result);
        } catch (error) {
            next(error);
        }
    }
);
// jwt ?????? ?????? ?????????, ???????????? ?????? ????????????.
// userAuthRouter.get("/afterlogin", login_required, function (req, res, next) {
//     res.status(200).send(
//         `??????????????? ${req.currentUserId}???, jwt ??? ?????? ?????? ?????? ?????? ????????????.`
//     );
// });

export { userAuthRouter };
