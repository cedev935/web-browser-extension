# Makes PhantomBuster easier to use by automatically retrieving your session cookies

PhantomBuster is the growth-hackers favorite weapon. Elected best Growth-hacking tool of 2018 by the Bad-Ass Marketers and Founders, they keep innovating thanks to their digital marketing platform.

On our path to make Growth-hacking available to non-technical people we've decided to simplify the process of filling out your session cookies.

This extension will automatically retrieve the session cookies of the websites you're connected to. Once you're in PhantomBuster, just click on "Add Cookie" to fill the session cookies input field.

If you have any question about this extension, feel free to send us an email at support@phantombuster.com or directly on our Intercom support chat.

## Install on Google Chrome

Find this extension on the [Chrome Web Store](https://chrome.google.com/webstore/detail/phantombuster/mdlnjfcpdiaclglfbdkbleiamdafilil).

## Install on Firefox

Find this extension on the [Firefox Add-ons site](https://addons.mozilla.org/fr/firefox/addon/phantombuster/).

Versions changelog:

[Here](https://github.com/phantombuster/web-browser-extension/releases)

## Contributing

### ⚠️ MANIFEST UPDATE WARNING

Please be very careful while updating the values of the manifest fields such as adding a new entry in `permissions` or in `content_scripts.matches`. It may impact our users by disabling the extension and requiring them to accept new authorizations. It already occurred twice by mistake for this extension.

### Development process

To be able to use the extension on all PhantomBuster App environnement (localhost, deploy previews, etc.) and to have the source maps to debug in the browser, use the following commands:

```sh
npm run build:dev
# or firefox:
# npm run build:dev:firefox
```

or

```sh
npm run watch
```

## Packaging

### Beta

```sh
npm run build:beta
# or firefox:
# npm run build:beta:firefox
npm run zip:beta
```

### Stable release

```sh
npm run build
# or firefox:
# npm run build:firefox
npm run zip:release
```
