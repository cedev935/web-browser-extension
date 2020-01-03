const _browserMain = chrome || browser;
// @ts-ignore
let website;
let websiteName;
let websiteUrl;
const zapierDropdownSelector = "div.fm-field-type-fields fieldset.fm-fields div[role=listbox]";
const zapierExtensionId = "button[id*=\"zapierPbExtension\"]";
const FAST_POLL = 100;
const DEF_POLL = 500;
const CUSTOM_POLL = 2500;
const isV2InputPage = () => {
    try {
        return (new URL(window.location.toString())).pathname.indexOf("/setup") > -1;
    }
    catch (err) {
        return false;
    }
};
const isZapierPage = () => {
    try {
        return (new URL(window.location.toString())).hostname.indexOf("zapier") > -1;
    }
    catch (err) {
        return false;
    }
};
const waitUntilZapierBoot = () => {
    const idleBoot = setInterval(() => {
        if (document.querySelector("div[role=listbox] .select-arrow")) {
            clearInterval(idleBoot);
            if (document.querySelector("fieldset fieldset.fm-fields")) {
                createZapierButton();
            }
            buildListeners();
        }
    }, FAST_POLL);
};
const waitWhileBlur = () => {
    const blurIdle = setInterval(() => {
        const el = document.querySelector("div.flowform");
        if (el && !el.classList.contains("loading-needs")) {
            clearInterval(blurIdle);
            createZapierButton();
        }
    }, FAST_POLL);
};
const buildListeners = () => {
    const idle = setInterval(() => {
        if (document.querySelector("div.choices-container")) {
            document.querySelector("div.choices-container").addEventListener("click", waitWhileBlur);
            clearInterval(idle);
        }
    }, FAST_POLL);
};
const parentUntils = (el, selector) => {
    if (el.classList.contains(selector)) {
        return el;
    }
    if (el.tagName.toLowerCase() === "body") {
        return null;
    }
    return parentUntils(el.parentElement, selector);
};
const setWebsite = (api, zapier = false) => {
    for (const property in WEBSITEENUM) {
        if (zapier) {
            if (api.match(property)) {
                website = property;
                break;
            }
        }
        else {
            if (api.indexOf(WEBSITEENUM[property].match) > -1) {
                website = property;
                break;
            }
        }
    }
};
const getPredefinedCSS = () => isV2InputPage() ? ["btn", "btn-sm", "bg-teal-2", "pull-right"] : ["btn", "btn-xs", "pull-right"];
const setSelectListenerIfNeeded = (el, networksCount) => {
    if (el && !el.onchange && networksCount > 1) {
        el.onchange = refreshBtn;
    }
};
/* END UTILS */
const createZapierButton = () => {
    const detectButton = setInterval(() => {
        const injectBtnLocation = "fieldset.fm-fields.child-fields-group";
        const btnSels = zapierExtensionId;
        if (document.querySelector(zapierDropdownSelector) && document.querySelector(injectBtnLocation)) {
            website = null;
            let apiName = document.querySelector(zapierDropdownSelector).textContent.trim();
            apiName = apiName.split(" ").shift();
            setWebsite(apiName, true);
            // We need to remove all existing buttons when a dropdown element is selected
            document.querySelectorAll(btnSels).forEach((el) => el.remove());
            // No need to continue when the user select a custom script
            if (!website) {
                return;
            }
            websiteName = WEBSITEENUM[website].name;
            websiteUrl = WEBSITEENUM[website].websiteUrl;
            openConnection();
            buildListeners();
            clearInterval(detectButton);
        }
    }, FAST_POLL);
};
// create the Get Cookies button
const createButton = () => {
    const checkExist = setInterval(() => {
        const sel = "div[data-alpaca-field-path*=\"/sessionCookie\"]:not([style*=\"display: none\"]) label a";
        const cookiesFieldsSelectors = "div[data-alpaca-field-path*=\"/sessionCookie\"]";
        const select = document.querySelector("div[data-alpaca-field-path] select");
        const networksCount = document.querySelectorAll(cookiesFieldsSelectors).length;
        // Don't overwrite onchange, we don't want to break the page
        setSelectListenerIfNeeded(select, networksCount);
        if (document.querySelector(sel)) {
            const apiLink = document.querySelector(sel).getAttribute("href");
            setWebsite(apiLink);
            websiteName = WEBSITEENUM[website].name;
            websiteUrl = WEBSITEENUM[website].websiteUrl;
            const btn = document.createElement("BUTTON");
            btn.id = "pbExtensionButton";
            const css = getPredefinedCSS();
            if (isV2InputPage()) {
                Object.assign(btn.style, { borderRadius: "20px", color: "#FFF", marginBottom: "2px" });
            }
            btn.classList.add(...css);
            btn.onclick = openConnection;
            if (!document.querySelector("#pbExtensionButton")) {
                document.querySelector("div[data-alpaca-field-path*=\"/sessionCookie\"]:not([style*=\"display: none\"]) label").appendChild(btn);
                document.querySelector("#pbExtensionButton").parentElement.style.display = "block";
            }
            enableButton();
            clearInterval(checkExist);
        }
    }, FAST_POLL);
};
const refreshBtn = (evt) => {
    const extensionBtn = document.querySelector("#pbExtensionButton");
    if (!extensionBtn) {
        return;
    }
    const root = parentUntils(extensionBtn, "form-group");
    const idleChangeTimer = setInterval(() => {
        const el = getComputedStyle(root);
        if (el.display === "none") {
            clearInterval(idleChangeTimer);
            extensionBtn.parentNode.removeChild(extensionBtn);
            createButton();
        }
    }, DEF_POLL);
};
const createSheetButton = () => {
    const checkExist2 = setInterval(() => {
        if (document.querySelector("div[data-alpaca-field-path*=\"/spreadsheetUrl\"] label a")) {
            if (!document.querySelector("#spreadsheetLink")) {
                const sheetLink = document.createElement("a");
                sheetLink.id = "spreadsheetLink";
                sheetLink.textContent = "Create Google Spreadsheet";
                sheetLink.href = "https://docs.google.com/spreadsheets/u/0/create";
                sheetLink.setAttribute("target", "_blank");
                sheetLink.classList.add("btn", "btn-xs", "pull-right", "btn-success", "btn-primary");
                document.querySelector("div[data-alpaca-field-path*=\"/spreadsheetUrl\"] label").appendChild(sheetLink);
                document.querySelector("#spreadsheetLink").parentElement.style.display = "block";
            }
            clearInterval(checkExist2);
        }
    }, FAST_POLL);
};
// send a message to background script
const sendMessage = (message) => {
    try {
        _browserMain.runtime.sendMessage(message);
    }
    catch (err) {
        try {
            const port = _browserMain.runtime.connect();
            port.postMessage(message);
        }
        catch (err) {
            // ...
        }
    }
};
const disableButton = (cookiesLength) => {
    document.querySelectorAll("#pbExtensionButton").forEach((el) => {
        el.classList.add("btn-success");
        el.classList.remove("btn-warning");
        el.setAttribute("disabled", "true");
        el.textContent = `${websiteName} Cookie${cookiesLength > 1 ? "s" : ""} successfully pasted!`;
    });
    listenInputChange();
};
const enableButton = () => {
    document.querySelectorAll("#pbExtensionButton").forEach((el) => {
        if (!isV2InputPage()) {
            el.classList.add("btn-primary");
        }
        el.classList.remove("btn-success", "btn-warning");
        const cookieCount = document.querySelectorAll("div[data-alpaca-field-path*=\"/sessionCookie\"]:not([style*=\"display: none\"]) input").length;
        el.textContent = `Get Cookie${cookieCount > 1 ? "s" : ""} from ${websiteName}`;
        el.removeAttribute("disabled");
    });
};
// send the website to background to query its cookies
const openConnection = () => sendMessage({ website, silence: !!isZapierPage() });
const listenInputChange = () => {
    document.querySelector("#pbExtensionButton").parentElement.parentElement.querySelector("input").addEventListener("input", inputChange);
};
const inputChange = (event) => {
    enableButton();
    event.target.removeEventListener("type", inputChange, true);
};
const displayLogin = () => {
    document.querySelectorAll(isZapierPage() ? zapierExtensionId : "#pbextensionbutton").forEach((el) => {
        if (isZapierPage()) {
            Object.assign(el.style, { background: "#DC3545", borderColor: "#DC3545" });
        }
        else {
            el.classList.replace("btn-primary", "btn-warning");
        }
        el.textContent = `please log in to ${websiteName} to get your cookie`;
    });
};
const buildCopyButton = (id, cookieName, cookieValue) => {
    const FLOOR = 10;
    const DEF_TXT = `Copy ${cookieName} cookie`;
    const DEF_POS = `999${Math.floor(Math.random() * Math.floor(FLOOR))}px`;
    const DEF_CSS = { position: "relative", right: 0, width: "auto", height: "auto", background: "#35C2DB", color: "#FFF" };
    const res = document.createElement("button");
    res.id = id;
    res.classList.add("toggle-switch");
    Object.assign(res.style, DEF_CSS);
    res.textContent = DEF_TXT;
    res.addEventListener("click", () => {
        let tmp = res.querySelector("input");
        const sel = document.getSelection();
        const range = document.createRange();
        if (!tmp) {
            tmp = document.createElement("input");
            Object.assign(tmp.style, { position: "absolute", opacity: 0, top: DEF_POS, right: DEF_POS });
            tmp.setAttribute("value", cookieValue);
            tmp.textContent = cookieValue;
            res.appendChild(tmp);
        }
        tmp.parentElement.style.background = "#35C2DB";
        tmp.select();
        range.selectNode(tmp);
        range.selectNodeContents(tmp);
        sel.addRange(range);
        const er = document.execCommand("copy", true);
        if (!er) {
            // @ts-ignore
            navigator.clipboard.writeText(tmp.value);
        }
        sendMessage({ notif: { title: "Phantombuster", message: `Your ${cookieName} is copied into the clipboard` } });
        Object.assign(res.style, DEF_CSS, { background: "#5CB85C" });
        res.textContent = `${cookieName} copied into clipboard!`;
        setTimeout(() => {
            Object.assign(res.style, DEF_CSS);
            res.textContent = DEF_TXT;
        }, CUSTOM_POLL);
        sel.removeAllRanges();
        sel.empty();
    });
    return res;
};
// fill the form with the correct cookie(s)
const setCookies = (cookies) => {
    const isZapier = document.location.hostname.indexOf("zapier.com") > -1;
    if (isZapier) {
        const injectBtnLocation = "fieldset.fm-fields.child-fields-group";
        const btnId = "zapierPbExtension";
        let i = 0;
        for (const cookie of cookies) {
            const labels = Array.from(document.querySelectorAll(`${injectBtnLocation} label`))
                .filter((el) => el.textContent.trim().toLowerCase().indexOf(cookie.name) > -1);
            const btn = buildCopyButton(`${btnId}${i}`, cookie.name, cookie.value);
            if (labels.length < 1) {
                document.querySelector(`${injectBtnLocation} .fm-field:first-of-type .fm-label`).appendChild(btn);
            }
            else {
                const injectLocation = parentUntils(labels.shift(), "fm-label");
                injectLocation.appendChild(btn);
            }
            i++;
        }
    }
    else {
        for (let i = 0; i < cookies.length; i++) {
            const inputField = document.querySelectorAll("div[data-alpaca-field-path*=\"/sessionCookie\"]:not([style*=\"display: none\"]) input")[i];
            inputField.value = cookies[i].value;
        }
        disableButton(cookies.length);
    }
};
// listen to messages from background
_browserMain.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.cookies) {
        const cookies = message.cookies;
        if (cookies[0]) {
            setCookies(cookies);
        }
        else {
            displayLogin();
            window.open(websiteUrl, "_blank");
            sendMessage({ opening: websiteName });
        }
    }
    if (message.restart) {
        if (isV2InputPage()) {
            createButton();
        }
    }
});
const main = () => {
    // add an event listener next to all launch buttons
    document.querySelectorAll(".launchButtonOptions, #launchButtonModalSwitchEditor").forEach((el) => el.addEventListener("click", createButton));
    document.querySelectorAll(".launchButtonOptions, #launchButtonModalSwitchEditor").forEach((el) => el.addEventListener("click", createSheetButton));
    // Need to wait until Zapier shows elements...
    if (isZapierPage()) {
        waitUntilZapierBoot();
    }
};
main();
//# sourceMappingURL=main.js.map