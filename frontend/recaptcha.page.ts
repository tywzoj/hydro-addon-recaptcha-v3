import { $, addPage, AutoloadPage, i18n, NamedPage } from "@hydrooj/ui-default";

import { CE_String } from "../strings";

declare global {
    interface Window {
        recaptchaPromise?: Promise<void>;
    }

    let grecaptcha: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
}

// Login dialog
addPage(
    new AutoloadPage("recaptcha-login-dialog", () => {
        if (UserContext && UserContext._id) return;
        const siteKey = getRecaptchaSiteKey();
        if (!siteKey) return;

        void ensureRecaptchaScript(siteKey);

        const form = $(".dialog--signin form");
        if (!form.length) return;
        injectRecaptchaPrivacyPolicy(form, true);
        overrideFormSubmit(siteKey, "login", form);
    }),
);

addPage(
    new NamedPage(["user_login", "user_register"], (pagename) => {
        const siteKey = getRecaptchaSiteKey();
        if (!siteKey) return;

        void ensureRecaptchaScript(siteKey);

        const form = $("form").not(".dialog--signin form");
        if (!form.length) return;
        injectRecaptchaPrivacyPolicy(form, false);
        overrideFormSubmit(siteKey, pagename === "user_login" ? "login" : "register", form);
    }),
);

function getRecaptchaSiteKey(): string | undefined {
    return UiContext.recaptchaSiteKey as string | undefined;
}

function ensureRecaptchaScript(siteKey: string) {
    if (window.recaptchaPromise) return window.recaptchaPromise;

    window.recaptchaPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://recaptcha.net/recaptcha/api.js?render=${siteKey}`;
        script.onload = () => grecaptcha.ready(() => resolve());
        script.onerror = () => reject(new Error("Failed to load reCAPTCHA script"));
        document.head.appendChild(script);
    });

    return window.recaptchaPromise;
}

function overrideFormSubmit(siteKey: string, action: string, form: JQuery<HTMLElement>) {
    const submitButton = form.find("input[type=submit]");

    const handlerAsync = async () => {
        submitButton.prop("disabled", true).addClass("disabled").val(i18n(CE_String.RecaptchaValidating));
        try {
            await ensureRecaptchaScript(siteKey);
            const token = await grecaptcha.execute(siteKey, { action });
            const existingInput = form.find("input[name=recaptcha-response]");
            if (existingInput.length) {
                existingInput.val(token);
            } else {
                form.append(
                    $("<input>", {
                        type: "hidden",
                        name: "recaptcha-response",
                        value: token,
                    }),
                );
            }
        } catch (err) {
            alert(i18n(CE_String.ValidationFailed));
            console.error("reCAPTCHA error:", err);
        } finally {
            submitButton.prop("disabled", false).removeClass("disabled").val(i18n("Login"));
        }
    };

    // Hack: Override the form's submit method to handle reCAPTCHA before actual submission
    // Avoid using jQuery's submit event to prevent conflicts with webauthn handlers
    // See https://github.com/hydro-dev/Hydro/blob/04fcd57f517af52d89ce940e35f63f3189144c2a/packages/ui-default/pages/user_verify.page.ts#L99
    // form[0] is the raw HTMLFormElement, which has a submit method. We are sure it exists because we checked form.length above.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const originalSubmit = form[0].submit as () => void;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    form[0].submit = function (...args: any[]) {
        void handlerAsync().then(() => {
            // After handling reCAPTCHA, submit the form
            originalSubmit?.apply(this, args);
        });
    };
}

function injectRecaptchaPrivacyPolicy(form: JQuery<HTMLElement>, isDialog: boolean) {
    let elem = $(
        `<div class="text-center supplementary" style="margin-top: 1rem; font-size: 0.75rem; line-height: 1.2;">
            ${i18n(CE_String.PrivacyPolicy)}
        </div>`,
    );
    if (!isDialog) {
        elem.addClass("inverse");
        elem = $('<div class="row">').append('<div class="column">').append(elem);
    }
    form.append(elem);
}
