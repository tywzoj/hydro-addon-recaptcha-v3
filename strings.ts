export const enum CE_String {
    TITLE = "Google reCAPTCHA v3",
    SITE_KEY_DESC = "Site Key",
    SECRET_KEY_DESC = "Secret Key",
    ValidationFailed = "reCAPTCHA validation failed",
    SecretKeyNotConfigured = "reCAPTCHA secret key is not configured",
    RecaptchaValidating = "Validating reCAPTCHA...",
    IPWhitelist = "IP Whitelist",
    UserWhitelist = "User Whitelist",
    PrivacyPolicy = 'This site is protected by reCAPTCHA and the Google <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer noopener">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer noopener">Terms of Service</a> apply.',
}

export const strings: Record<string, Record<CE_String, string>> = {
    zh: {
        [CE_String.TITLE]: "Google reCAPTCHA v3",
        [CE_String.SITE_KEY_DESC]: "网站密钥",
        [CE_String.SECRET_KEY_DESC]: "服务端密钥",
        [CE_String.ValidationFailed]: "人机验证失败",
        [CE_String.SecretKeyNotConfigured]: "reCAPTCHA 密钥未配置",
        [CE_String.RecaptchaValidating]: "正在人机验证...",
        [CE_String.IPWhitelist]: "IP 白名单",
        [CE_String.UserWhitelist]: "用户白名单",
        [CE_String.PrivacyPolicy]:
            '本站受 reCAPTCHA 保护，适用 Google 的<a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer noopener">隐私政策</a>和<a href="https://policies.google.com/terms" target="_blank" rel="noreferrer noopener">服务条款</a>',
    },
    zh_TW: {
        [CE_String.TITLE]: "Google reCAPTCHA v3",
        [CE_String.SITE_KEY_DESC]: "網站密鑰",
        [CE_String.SECRET_KEY_DESC]: "服務端密鑰",
        [CE_String.ValidationFailed]: "人機驗證失敗",
        [CE_String.SecretKeyNotConfigured]: "reCAPTCHA 密鑰未配置",
        [CE_String.RecaptchaValidating]: "正在人機驗證...",
        [CE_String.IPWhitelist]: "IP 白名單",
        [CE_String.UserWhitelist]: "用戶白名單",
        [CE_String.PrivacyPolicy]:
            '本站受 reCAPTCHA 保護，適用 Google 的<a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer noopener">隱私政策</a>和<a href="https://policies.google.com/terms" target="_blank" rel="noreferrer noopener">服務條款</a>',
    },
    en: {
        [CE_String.TITLE]: "Google reCAPTCHA v3",
        [CE_String.SITE_KEY_DESC]: "Site Key",
        [CE_String.SECRET_KEY_DESC]: "Secret Key",
        [CE_String.ValidationFailed]: "reCAPTCHA validation failed",
        [CE_String.SecretKeyNotConfigured]: "reCAPTCHA secret key is not configured",
        [CE_String.RecaptchaValidating]: "Validating reCAPTCHA...",
        [CE_String.IPWhitelist]: "IP Whitelist",
        [CE_String.UserWhitelist]: "User Whitelist",
        [CE_String.PrivacyPolicy]:
            'This site is protected by reCAPTCHA and the Google <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer noopener">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer noopener">Terms of Service</a> apply.',
    },
};
