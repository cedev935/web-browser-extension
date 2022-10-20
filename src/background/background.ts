import { extensionWebsiteDomains, WebsiteName, getWebsiteFromName } from "../shared/websites"
import { Tabs, Runtime, Cookies } from "webextension-polyfill"
import * as browser from "webextension-polyfill"
import { FromContentScriptRuntimeMessages, FromBackgroundRuntimeMessages } from "../shared/messages"
import { initSentry, wrapAsyncFunctionWithSentry } from "../shared/sentry"

initSentry()

const isChrome = () => {
	return location.protocol.indexOf("chrome") !== -1
}

// Only global here.
// Used to keep track of callback functions for changed cookie listeners
// and store found cookies while watching for the changes.
const cookieChangedListeners: {
	[key: string]: {
		fn: (changeInfo: Cookies.OnChangedChangeInfoType) => Promise<void>
		matching: Cookies.Cookie[]
	}
} = {}

const getListenerKey = (websiteName: WebsiteName, tab: Tabs.Tab, senderTab: Tabs.Tab) => {
	return `${websiteName}_${tab.id}_${senderTab.id}`
}

// Function to be used to send message instead of browser.tabs.sendMessage()
const sendMessage = async (tabId: number, msg: FromBackgroundRuntimeMessages) => {
	// tslint:disable-next-line:ban
	await browser.tabs.sendMessage(tabId, msg)
}

// Function to be used to send notifications instead of browser.notifications.create()
const sendNotification = async (title: string, message: string) => {
	// tslint:disable-next-line:ban
	return browser.notifications.create({ type: "basic", message, title, iconUrl: "assets/buster-icon-48.png" })
}

// Here we attach an a listener to each tab url change to (re)start the extension if the domain matches
// the list of domains where we want the extension to run content scripts.
browser.tabs.onUpdated.addListener(
	wrapAsyncFunctionWithSentry(async (id, changeInfo, tab) => {
		if (tab.url && extensionWebsiteDomains.some((v) => tab.url!.includes(v)) && changeInfo.status === "complete") {
			await sendMessage(id, { restart: true })
		}
	}),
)

// At the extension installation or update (or browser update) we reload/restart on each tab matching the list
// of domains where we want the extension to run content scripts
browser.runtime.onInstalled.addListener(
	wrapAsyncFunctionWithSentry(async () => {
		const tabs = await browser.tabs.query({ url: extensionWebsiteDomains.map((url) => `*://*.${url}/*`) })
		for (const t of tabs) {
			if (t.id) {
				if (isChrome()) {
					// Google chrome does not (re)install content scripts so we need to do a full reload of the tab
					await browser.tabs.reload(t.id)
				} else {
					// Firefox (re)installs content scripts directly so we just need to send the "restart" message
					await sendMessage(t.id, { restart: true })
				}
			}
		}
	}),
)

// Here we receive messages from the content scripts
browser.runtime.onMessage.addListener(
	wrapAsyncFunctionWithSentry(async (msg: FromContentScriptRuntimeMessages, sender: Runtime.MessageSender) => {
		if (msg.newTab && sender.tab) {
			await newTab(msg.newTab.websiteName, msg.newTab.url, sender.tab)
		} else if (msg.getCookies && sender.tab) {
			await getCookies(msg.getCookies.websiteName, sender.tab)
		} else if (msg.notif) {
			await sendNotification(msg.notif.title || "PhantomBuster", msg.notif.message)
		} else if (msg.restartMe && sender.tab && sender.tab.id) {
			await sendMessage(sender.tab.id, { restart: true })
		}
	}),
)

const getCookies = async (websiteName: WebsiteName, senderTab: Tabs.Tab) => {
	if (senderTab.id) {
		const cookiesList = getWebsiteFromName(websiteName)?.cookies
		if (cookiesList) {
			const cookies = await browser.cookies.getAll({})
			const matchingCookies = cookiesList.map(
				(cookie) => cookies.filter((c) => c.name === cookie.name && c.domain === cookie.domain)[0],
			)

			// Whether cookies have been found or not, we send the result to the content script.
			// The content script handles the empty|null|undefined array of cookies and asks the user to log in.
			await sendMessage(senderTab.id, {
				cookies: {
					websiteName,
					cookies: matchingCookies,
				},
			})
		}
	}
}

const newTab = async (websiteName: WebsiteName, url: string, senderTab: Tabs.Tab) => {
	const tab = await browser.tabs.create({})

	await browser.tabs.update(tab.id, { url })

	// We need to store the listeners' callbacks in a global to be able to unregister/delete them later
	const listenerKey = getListenerKey(websiteName, tab, senderTab)
	cookieChangedListeners[listenerKey] = {
		matching: [],
		fn: (changeInfo) => cookieChanged(changeInfo, websiteName, tab, senderTab),
	}
	browser.cookies.onChanged.addListener(wrapAsyncFunctionWithSentry(cookieChangedListeners[listenerKey].fn))
}

const cookieChanged = async (
	changeInfo: Cookies.OnChangedChangeInfoType,
	websiteName: WebsiteName,
	tab: Tabs.Tab,
	senderTab: Tabs.Tab,
) => {
	if (changeInfo.removed === true) {
		return
	}

	const listenerKey = getListenerKey(websiteName, tab, senderTab)
	const cookiesList = getWebsiteFromName(websiteName)?.cookies
	if (cookiesList && senderTab.id) {
		const matchingCookie = cookiesList.filter(
			(cookie) => changeInfo.cookie.name === `${cookie.name}` && changeInfo.cookie.domain === cookie.domain,
		)
		if (matchingCookie.length > 0) {
			// One cookie we want has been found
			cookieChangedListeners[listenerKey].matching.push(changeInfo.cookie)
			if (cookiesList.length === cookieChangedListeners[listenerKey].matching.length) {
				// All wanted cookies for this website have been found
				browser.cookies.onChanged.removeListener(cookieChangedListeners[listenerKey].fn)

				// We put the found cookies in the order defined in 'websites' because
				// on the old alpaca form the fields have to be in the same order (no way to know which is which)
				const matchingCookies = cookiesList.map(
					(cookie) => cookieChangedListeners[listenerKey].matching.filter((c) => c.name === cookie.name)[0],
				)
				delete cookieChangedListeners[listenerKey]

				if (tab.id) {
					// We delete the 'login' tab
					await browser.tabs.remove(tab.id)
				}
				// We focus on the Phantombuster tab
				await browser.tabs.highlight({ tabs: senderTab.index })
				await sendMessage(senderTab.id, {
					cookies: {
						websiteName,
						cookies: matchingCookies,
					},
				})
			}
		}
	}
}

// opens phantombuster in a new tab when clicking on the extension icon
browser.action.onClicked.addListener(
	wrapAsyncFunctionWithSentry(async (_tab) => {
		await browser.tabs.create({ url: "https://phantombuster.com/phantoms" })
	}),
)
