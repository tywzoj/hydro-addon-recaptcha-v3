import type { Context, Handler } from "hydrooj";
import { ForbiddenError, Schema, superagent } from "hydrooj";
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
const SITE_KEY = "site-key";
const SECRET_KEY = "secret-key";
const WHITELIST_IP = "whitelist-ips";
const WHITELIST_USER = "whitelist-users";
const SETTING_SITE_KEY = `${packageJson.name}.${SITE_KEY}`;
const SETTING_SECRET_KEY = `${packageJson.name}.${SECRET_KEY}`;
const SETTING_WHITELIST_IP = `${packageJson.name}.${WHITELIST_IP}`;
const SETTING_WHITELIST_USER = `${packageJson.name}.${WHITELIST_USER}`;

export const Config = Schema.object({
    [SITE_KEY]: Schema.string().description(CE_String.SITE_KEY_DESC),
    [SECRET_KEY]: Schema.string().description(CE_String.SECRET_KEY_DESC).role("secret"),
    [WHITELIST_IP]: Schema.array(Schema.string()).description(CE_String.IPWhitelist).default([]),
    [WHITELIST_USER]: Schema.array(Schema.string()).description(CE_String.UserWhitelist).default([]),
}).description(CE_String.TITLE);

export function apply(ctx: Context) {
    for (const [lang, strMap] of Object.entries(strings)) {
        ctx.i18n.load(lang, strMap);
    }

    const uiCtxHandler: IHandlerFunction = (handler) => {
        if (!ctx.setting.get(SETTING_SITE_KEY)) return; // If site key is not configured, skip loading reCAPTCHA
        if (handler.user && handler.user._id !== 0) return; // If user is logged in, skip loading reCAPTCHA
        if (checkIPInWhitelist(ctx, handler.request.ip)) return; // If IP is in whitelist, skip loading reCAPTCHA

        handler.UiContext.recaptchaSiteKey = ctx.setting.get(SETTING_SITE_KEY) as string | undefined;
    };

    const postHandler: IHandlerFunction = async (handler) => {
        if (!ctx.setting.get(SETTING_SITE_KEY)) return; // If site key is not configured, skip verification
        if (checkIPInWhitelist(ctx, handler.request.ip)) return; // If IP is in whitelist, skip verification

        const secretKey = ctx.setting.get(SETTING_SECRET_KEY) as string | undefined;
        if (!secretKey) throw new ForbiddenError(CE_String.SecretKeyNotConfigured);
        const token = handler.args["recaptcha-response"] as string | undefined;

        const response = await superagent
            .post("https://recaptcha.net/recaptcha/api/siteverify")
            .field("secret", secretKey)
            .field("response", token || "")
            .field("remoteip", handler.request.ip);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!response.body.success) {
            throw new ForbiddenError(CE_String.ValidationFailed);
        }
    };

    ctx.on("handler/before", uiCtxHandler);
    ctx.on("handler/before/UserLogin#post", withUserWhitelistChecker(ctx, postHandler));
    ctx.on("handler/before/UserRegister#post", postHandler);
}

function checkIPInWhitelist(ctx: Context, ipAddress: string): boolean {
    const whitelist = ctx.setting.get(SETTING_WHITELIST_IP) as string[] | undefined;
    if (!whitelist) return false;

    return whitelist.some((cidr) => {
        try {
            return (isCidr(cidr) && ip.cidrSubnet(cidr).contains(ipAddress)) || ip.isEqual(ipAddress, cidr);
        } catch {
            return false;
        }
    });
}

function withUserWhitelistChecker(ctx: Context, handlerFn: IHandlerFunction): IHandlerFunction {
    const checker = (uname: string | undefined) => {
        if (!uname) return false;

        const whitelist = ctx.setting.get(SETTING_WHITELIST_USER) as string[] | undefined;
        if (!whitelist) return false;

        return whitelist.includes(uname);
    };

    return (handler) => {
        if (checker(handler.args["uname"] as string | undefined)) return;
        return handlerFn(handler);
    };
}
