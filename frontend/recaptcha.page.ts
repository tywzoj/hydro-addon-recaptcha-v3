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
        injectRecaptchaPrivacyPolicy(form);
        overrideFormSubmit(siteKey, "login", form);
    }),
);

addPage(
    new NamedPage(["user_login", "user_register"], (pagename) => {
        const siteKey = getRecaptchaSiteKey();
        if (!siteKey) return;

        void ensureRecaptchaScript(siteKey);

        const form = $("form").not(".dialog--signin form");
        injectRecaptchaPrivacyPolicy(form);
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
    submitButton.on("click", (e) => {
        e.preventDefault();
        submitButton.prop("disabled", true).addClass("disabled").val(i18n(CE_String.RecaptchaValidating));
        void ensureRecaptchaScript(siteKey)
            .then(() => grecaptcha.execute(siteKey, { action }))
            .then((token) => {
                form.append(
                    $("<input>", {
                        type: "hidden",
                        name: "recaptcha-response",
                        value: token,
                    }),
                );
                form.off("submit"); // Remove the handler to avoid infinite loop
                form.trigger("submit"); // Submit the form
            })
            .catch((err) => {
                alert(i18n(CE_String.ValidationFailed));
                console.error("reCAPTCHA error:", err);
            })
            .finally(() => {
                submitButton.prop("disabled", false).removeClass("disabled").val(i18n("Login"));
            });
    });
}

function injectRecaptchaPrivacyPolicy(form: JQuery<HTMLElement>) {
    form.append(
        $(`
        <div class="row"><div class="column">
            <div class="text-center supplementary inverse" style="margin-top: 1rem;">
                ${i18n(CE_String.PrivacyPolicy)}
            </div>
        </div></div>
    `),
    );
}
