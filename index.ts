import type { Context, Handler } from "hydrooj";
import { ForbiddenError, Schema, superagent } from "hydrooj";
import ip from "ip";
import isCidr from "is-cidr";

declare module "hydrooj" {
    export interface UiContext {
        turnstileSiteKey?: string;
    }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const packageJson = require("./package.json") as { name: string };
const SITE_KEY = "site-key";
const SECRET_KEY = "secret-key";
const WHITELIST = "whitelist-ips";
const SETTING_SITE_KEY = `${packageJson.name}.${SITE_KEY}`;
const SETTING_SECRET_KEY = `${packageJson.name}.${SECRET_KEY}`;
const SETTING_WHITELIST = `${packageJson.name}.${WHITELIST}`;

export const enum CE_String {
    TITLE = "Google reCAPTCHA v3",
    SITE_KEY_DESC = "Site Key",
    SECRET_KEY_DESC = "Secret Key",
    ValidationFailed = "Validation Failed",
    SecretKeyNotConfigured = "Secret Key Not Configured",
    RecaptchaValidating = "Recaptcha Validating",
    IPWhitelist = "IP Whitelist",
}

const strings: Record<string, Record<CE_String, string>> = {
    zh: {
        [CE_String.TITLE]: "Google reCAPTCHA v3",
        [CE_String.SITE_KEY_DESC]: "网站密钥",
        [CE_String.SECRET_KEY_DESC]: "服务端密钥",
        [CE_String.ValidationFailed]: "人机验证失败",
        [CE_String.SecretKeyNotConfigured]: "reCAPTCHA 密钥未配置",
        [CE_String.RecaptchaValidating]: "正在人机验证...",
        [CE_String.IPWhitelist]: "IP 白名单",
    },
    zh_TW: {
        [CE_String.TITLE]: "Google reCAPTCHA v3",
        [CE_String.SITE_KEY_DESC]: "網站密鑰",
        [CE_String.SECRET_KEY_DESC]: "服務端密鑰",
        [CE_String.ValidationFailed]: "人機驗證失敗",
        [CE_String.SecretKeyNotConfigured]: "reCAPTCHA 密鑰未配置",
        [CE_String.RecaptchaValidating]: "正在人機驗證...",
        [CE_String.IPWhitelist]: "IP 白名單",
    },
    en: {
        [CE_String.TITLE]: "Google reCAPTCHA v3",
        [CE_String.SITE_KEY_DESC]: "Site Key",
        [CE_String.SECRET_KEY_DESC]: "Secret Key",
        [CE_String.ValidationFailed]: "reCAPTCHA validation failed",
        [CE_String.SecretKeyNotConfigured]: "reCAPTCHA secret key is not configured",
        [CE_String.RecaptchaValidating]: "Validating reCAPTCHA...",
        [CE_String.IPWhitelist]: "IP Whitelist",
    },
};

export const Config = Schema.object({
    [SITE_KEY]: Schema.string().description(CE_String.SITE_KEY_DESC),
    [SECRET_KEY]: Schema.string().description(CE_String.SECRET_KEY_DESC).role("secret"),
    [WHITELIST]: Schema.array(
        Schema.transform(Schema.string(), (value, opts) => {
            // Validate IP or CIDR
            if (!isCidr(value) && !ip.isV4Format(value) && !ip.isV6Format(value)) {
                throw new Schema.ValidationError(`Invalid IP or CIDR: ${value}`, opts);
            }

            return value;
        }),
    )
        .description(CE_String.IPWhitelist)
        .default([]),
}).description(CE_String.TITLE);

export function apply(ctx: Context) {
    for (const [lang, strMap] of Object.entries(strings)) {
        ctx.i18n.load(lang, strMap);
    }

    const uiCtxHandler = (handler: Handler) => {
        if (!ctx.setting.get(SETTING_SITE_KEY)) return; // If site key is not configured, skip loading reCAPTCHA
        if (handler.user && handler.user._id !== 0) return; // If user is logged in, skip loading reCAPTCHA
        if (checkIPInWhitelist(ctx, handler.request.ip)) return; // If IP is in whitelist, skip loading reCAPTCHA

        handler.UiContext.recaptchaSiteKey = ctx.setting.get(SETTING_SITE_KEY) as string | undefined;
    };

    const postHandler = async (handler: Handler) => {
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
    ctx.on("handler/before/UserLogin#post", postHandler);
    ctx.on("handler/before/UserRegister#post", postHandler);
}

function checkIPInWhitelist(ctx: Context, ipAddress: string): boolean {
    const whitelist = ctx.setting.get(SETTING_WHITELIST) as string[] | undefined;
    if (!whitelist) return false;

    return whitelist.some((cidr) => {
        return (isCidr(cidr) && ip.cidrSubnet(cidr).contains(ipAddress)) || ip.isEqual(ipAddress, cidr);
    });
}
