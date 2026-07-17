import type { Context, Handler } from "hydrooj";
import { ForbiddenError, OplogModel, Schema, superagent, SystemError } from "hydrooj";
import ip from "ip";
import isCidr from "is-cidr";

import { CE_String, strings } from "./strings";

declare module "hydrooj" {
    export interface UiContext {
        recaptchaSiteKey?: string;
    }
}

type IHandlerFunction = (handler: Handler) => void | Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const packageJson = require("./package.json") as { name: string };
const ENABLED = "enabled";
const SITE_KEY = "site-key";
const SECRET_KEY = "secret-key";
const WHITELIST_IP = "whitelist-ips";
const WHITELIST_USER = "whitelist-users";
const BYPASS_WHEN_NETWORK_ERROR = "bypass-when-network-error";
const MIN_SCORE = "min-score";
const SETTING_ENABLED = `${packageJson.name}.${ENABLED}`;
const SETTING_SITE_KEY = `${packageJson.name}.${SITE_KEY}`;
const SETTING_SECRET_KEY = `${packageJson.name}.${SECRET_KEY}`;
const SETTING_WHITELIST_IP = `${packageJson.name}.${WHITELIST_IP}`;
const SETTING_WHITELIST_USER = `${packageJson.name}.${WHITELIST_USER}`;
const SETTING_BYPASS_WHEN_NETWORK_ERROR = `${packageJson.name}.${BYPASS_WHEN_NETWORK_ERROR}`;
const SETTING_MIN_SCORE = `${packageJson.name}.${MIN_SCORE}`;

export const Config = Schema.object({
    [ENABLED]: Schema.boolean().default(false),
    [SITE_KEY]: Schema.string().description(CE_String.SITE_KEY_DESC),
    [SECRET_KEY]: Schema.string().description(CE_String.SECRET_KEY_DESC).role("secret"),
    [WHITELIST_IP]: Schema.array(Schema.string()).description(CE_String.IPWhitelist).default([]),
    [WHITELIST_USER]: Schema.array(Schema.string()).description(CE_String.UserWhitelist).default([]),
    [BYPASS_WHEN_NETWORK_ERROR]: Schema.boolean().description(CE_String.BypassWhenNetworkError).default(false),
    [MIN_SCORE]: Schema.number().min(0.0).max(1.0).description(CE_String.MinScore).default(0.0),
}).description(CE_String.TITLE);

export function apply(ctx: Context) {
    for (const [lang, strMap] of Object.entries(strings)) {
        ctx.i18n.load(lang, strMap);
    }

    const sharedCheckers = [checkNotEnabled, checkIPInWhitelist];

    ctx.on(
        "handler/before",
        withCheckers(
            (handler) => {
                handler.UiContext.recaptchaSiteKey = ctx.setting.get(SETTING_SITE_KEY) as string;
            },
            [...sharedCheckers, checkLoggedIn],
        ),
    );

    ctx.on(
        "handler/before/UserLogin#post",
        withCheckers(createPostHandler(ctx, "login"), [...sharedCheckers, checkUserInWhitelist]),
    );
    ctx.on("handler/before/UserRegister#post", withCheckers(createPostHandler(ctx, "register"), sharedCheckers));
    ctx.on("handler/before/UserLostPass#post", withCheckers(createPostHandler(ctx, "password_reset"), sharedCheckers));
}

function createPostHandler(ctx: Context, scenario: string): IHandlerFunction {
    return async (handler) => {
        const secretKey = ctx.setting.get(SETTING_SECRET_KEY) as string | undefined;
        if (!secretKey) {
            throw new SystemError(CE_String.SecretKeyNotConfigured);
        }
        const minScore = (ctx.setting.get(SETTING_MIN_SCORE) ?? 0.0) as number;
        const token = handler.args["recaptcha-response"] as string | undefined;

        let response: superagent.Response;

        try {
            response = await superagent
                .post("https://recaptcha.net/recaptcha/api/siteverify")
                .field("secret", secretKey)
                .field("response", token || "")
                .field("remoteip", handler.request.ip)
                .timeout(10000);
        } catch (err) {
            if (ctx.setting.get(SETTING_BYPASS_WHEN_NETWORK_ERROR)) {
                ctx.logger.warn("reCAPTCHA network error, bypassing verification", err);
                await OplogModel.log(handler, "user.recaptcha.bypassed", {
                    scenario,
                    reason: "reCAPTCHA network error, bypassing verification",
                });
                return;
            }

            ctx.logger.error("reCAPTCHA network error", err);
            throw new SystemError("reCAPTCHA network error on server side, please contact the administrator");
        }

        const { success, score } = response.body as { success: boolean; score: number };

        if (!success || typeof score !== "number") {
            await OplogModel.log(handler, "user.recaptcha.failed", {
                scenario,
                success,
                score,
                reason: "reCAPTCHA validation failed",
            });
            throw new ForbiddenError(CE_String.ValidationFailed);
        }

        if (score < minScore) {
            await OplogModel.log(handler, "user.recaptcha.failed", {
                scenario,
                success,
                score,
                reason: "reCAPTCHA score too low",
            });
            throw new ForbiddenError(
                CE_String.ValidationFailed,
                `reCAPTCHA score too low: ${score}, minimum required: ${minScore}`,
            );
        }

        await OplogModel.log(handler, "user.recaptcha.success", { scenario, score });
    };
}

/**
 * @param checkers - An array of functions that take a handler and return a boolean indicating whether to skip the handler function.
 */
function withCheckers(handlerFn: IHandlerFunction, checkers: ((handler: Handler) => boolean)[]): IHandlerFunction {
    return (handler) => {
        for (const checker of checkers) {
            if (checker(handler)) return;
        }

        return handlerFn(handler);
    };
}

function checkNotEnabled(handler: Handler) {
    if (!handler.ctx.setting.get(SETTING_ENABLED)) return true; // If addon is not enabled, skip verification
    if (!handler.ctx.setting.get(SETTING_SITE_KEY)) return true; // If site key is not configured, skip verification

    return false;
}

function checkIPInWhitelist(handler: Handler) {
    const whitelist = handler.ctx.setting.get(SETTING_WHITELIST_IP) as string[] | undefined;
    if (!whitelist) return false;
    const ipAddress = handler.request.ip;

    for (const cidr of whitelist) {
        try {
            if (isCidr(cidr)) {
                if (ip.cidrSubnet(cidr).contains(ipAddress)) {
                    return true; // If IP is in whitelist, bypass verification
                }
            } else if (ip.isV4Format(cidr) || ip.isV6Format(cidr)) {
                if (ip.isEqual(cidr, ipAddress)) {
                    return true; // If IP is in whitelist, bypass verification
                }
            }
        } catch (err) {
            handler.ctx.logger.warn(`Invalid CIDR or IP in whitelist: ${cidr}, request IP: ${ipAddress}`, err);
        }
    }

    return false;
}

function checkLoggedIn(handler: Handler) {
    return !!handler.user && handler.user._id !== 0; // If user is logged in, skip verification
}

function checkUserInWhitelist(handler: Handler) {
    const uname = handler.args["uname"] as string | undefined;
    if (!uname) return false;

    const whitelist = handler.ctx.setting.get(SETTING_WHITELIST_USER) as string[] | undefined;
    if (!whitelist) return false;

    if (whitelist.includes(uname)) {
        return true; // If user is in whitelist, bypass verification
    }

    return false;
}
