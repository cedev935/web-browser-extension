import { WebsiteName } from "./websites"
import { Cookies } from "webextension-polyfill-ts"

type FromBackgroundRuntimeMessages = {
	restart?: boolean

	cookies?: {
		websiteName: WebsiteName
		cookies: Cookies.Cookie[]
	}

	injectCookies?: {
		prefix: string
	}
}

type FromContentScriptRuntimeMessages = {
	getCookies?: {
		websiteName: WebsiteName
	}

	newTab?: {
		websiteName: WebsiteName
		url: string
	}

	notif?: {
		title?: string
		message: string
	}

	restartMe?: boolean
}

export { FromBackgroundRuntimeMessages, FromContentScriptRuntimeMessages }
