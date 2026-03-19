# Hydro Addon: Google reCAPTCHA v3

This addon integrates Google reCAPTCHA v3 into [Hydro](https://github.com/hydro-dev/Hydro)'s user registration and login forms, providing an additional layer of security against automated bots.

## Installation

1. Clone the repository and install dependencies:

    ```bash
    git clone https://github.com/tywzoj/hydro-addon-recaptcha-v3.git
    cd hydro-addon-recaptcha-v3
    yarn install --production
    ```

2. Apply the addon to your Hydro instance:

    ```bash
    hydrooj addon add /path/to/hydro-addon-recaptcha-v3
    pm2 restart hydrooj
    ```

## Usage

1. Obtain your reCAPTCHA v3 site key and secret key from the [Google reCAPTCHA admin console](https://www.google.com/recaptcha/admin).

2. Login as an administrator on Hydro and navigate to the system configuration page.

3. In section "Google reCAPTCHA v3", enter your site key and secret key.

4. Save the configuration.

## IP Whitelist

If you want to exclude certain IP addresses or CIDR ranges from reCAPTCHA verification (e.g., for trusted internal networks), you can add them to the "reCAPTCHA IP Whitelist" setting in the system configuration. This setting accepts a comma-separated list of IP addresses and CIDR notations.
