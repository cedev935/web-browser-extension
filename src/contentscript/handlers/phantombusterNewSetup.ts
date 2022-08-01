import { FromBackgroundRuntimeMessages } from "../../shared/messages"
import { IWebsite, WebsiteName, getWebsiteFromName, isPhantombusterSite } from "../../shared/websites"
import { Handler } from "./handler"
import { Cookies } from "webextension-polyfill-ts"

interface IElement {
	cookieName: string
	div: HTMLDivElement
	innerDiv: HTMLDivElement
	input: HTMLInputElement
	inputListener?: (event: Event) => void
	btn: HTMLButtonElement
}

interface IFoundWebsite {
	website: IWebsite
	login: boolean
	elements: IElement[]
}

type IFoundWebsites = {
	[key in WebsiteName]?: IFoundWebsite
}

export class PhantombusterNewSetup extends Handler {
	private _fastPoll = 100
	private _spinnerDelay = 1000
	private _fieldInfosLength = 2
	private _pathnameRegex = RegExp("/setup/step")
	private _interval?: ReturnType<typeof setInterval>
	private _stepSetupSessionCookieDivSelector = 'div[id^="formField-sessionCookie"]'
	private _stepSetupSessionCookieInnerDivSelector = "div"
	private _stepSetupSessionCookieInputSelector = "input"
	private _getCookieButtonClass = "pbExtensionNewSetupCookieButton"
	private _phantomNameSelector1 = "header p"
	private _phantomNameSelector2 = "aside header span"

	private _phantomName: string = ""
	private _foundWebsites: IFoundWebsites = {}

	public detect = () => {
		return isPhantombusterSite() && this._pathnameRegex.test(window.location.pathname)
	}

	public onMessage = (msg: FromBackgroundRuntimeMessages) => {
		if (msg.cookies) {
			this._onMessageCookies(msg.cookies.websiteName, msg.cookies.cookies, msg.cookies.newSession)
		}
	}

	public run = async () => {
		this._interval = setInterval(this._findStepSetupFieldSessionCookies, this._fastPoll)
	}

	public destroy = () => {
		if (this._interval) {
			clearInterval(this._interval)
		}
		const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(`.${this._getCookieButtonClass}`))
		for (const button of buttons) {
			button.remove()
		}
		document.removeEventListener("keydown", this._keydownListener)
		document.removeEventListener("keyup", this._keyupListener)
	}

	private _onMessageCookies = (websiteName: WebsiteName, cookies: Cookies.Cookie[], newSession = false) => {
		const foundWebsite = this._foundWebsites[websiteName]
		if (foundWebsite) {
			if (cookies.length === 0 || !cookies[0]) {
				this._websiteLogin(foundWebsite, newSession)
			} else {
				void this._fillInputs(foundWebsite, cookies)
			}
		}
	}

	private _websiteLogin = (foundWebsite: IFoundWebsite, newSession = false) => {
		foundWebsite.login = true
		for (const element of foundWebsite.elements) {
			element.btn.textContent = `Please log in to ${foundWebsite.website.name}`
			// element.btn.classList.add("pr-10")
		}
		void this.sendMessage({ notif: { message: `Please log in to ${foundWebsite.website.name}` } })
		void this.sendMessage({
			newTab: {
				websiteName: foundWebsite.website.name,
				url: foundWebsite.website.url,
				newSession,
			},
		})
	}

	private _onInputChange = (elements: IElement[]) => {
		for (const element of elements) {
			element.btn.disabled = false
			element.btn.textContent = element.btn.getAttribute("textContentConnect")
		}
	}

	private _fillInputs = async (foundWebsite: IFoundWebsite, cookies: Cookies.Cookie[]) => {
		if (foundWebsite.login) {
			await new Promise((resolve) => setTimeout(resolve, this._spinnerDelay))
			foundWebsite.login = false
		}
		for (const i in cookies) {
			if (cookies[i] && foundWebsite.elements[i]) {
				foundWebsite.elements[i].btn.textContent = `Connected to ${foundWebsite.website.name}`
				foundWebsite.elements[i].btn.classList.remove("pr-10")
				foundWebsite.elements[i].btn.disabled = true
				foundWebsite.elements[i].input.value = cookies[i].value
				if (foundWebsite.elements[i].inputListener) {
					foundWebsite.elements[i].input.removeEventListener("input", foundWebsite.elements[i].inputListener!)
				}
				foundWebsite.elements[i].input.dispatchEvent(new Event("input", { bubbles: true }))
				if (!foundWebsite.elements[i].inputListener) {
					foundWebsite.elements[i].inputListener = () => {
						this._onInputChange(foundWebsite.elements)
					}
				}
				foundWebsite.elements[i].input.addEventListener("input", foundWebsite.elements[i].inputListener!)
			}
		}
		void this.sendMessage({
			notif: { message: `${this._phantomName} is now connected to ${foundWebsite.website.name}` },
		})
	}

	private _createGetCookieBtn(website: IWebsite) {
		const el = document.createElement("button")
		el.className = `${this._getCookieButtonClass} btn br-4 bg-dark-blue text-nowrap relative f5 mx-1 my-1`
		el.type = "button"
		el.setAttribute("analyticsid", "agentSetupStepsInputGetcookieBtn")
		el.setAttribute("analyticsval1", website.name)

		el.setAttribute("textContentConnect", `Connect to ${website.name}`)
		el.setAttribute("textContentLogin", `Connect to ${website.name} (new session)`)

		el.textContent = el.getAttribute("textContentConnect")

		if (document.querySelector<HTMLDivElement>("body > #root > div")?.dataset.loggedAs === "true") {
			el.disabled = true
		} else {
			el.onclick = (event: MouseEvent) => {
				void this.sendMessage({
					getCookies: {
						websiteName: website.name,
						newSession: event.shiftKey,
					},
				})
			}
			el.onmouseover = (event: MouseEvent) => {
				if (event.target instanceof HTMLButtonElement) {
					event.target.setAttribute("hover", "true")
					if (event.shiftKey === true) {
						event.target.textContent = event.target.getAttribute("textContentLogin")
					}
				}
			}
			el.onmouseout = (event: MouseEvent) => {
				if (event.target instanceof HTMLButtonElement) {
					event.target.removeAttribute("hover")
					event.target.textContent = event.target.getAttribute("textContentConnect")
				}
			}
		}

		return el
	}

	private _handleStepSetupFieldDiv = (stepSetupDiv: HTMLDivElement) => {
		const stepSetupInnerDiv = stepSetupDiv?.querySelector<HTMLDivElement>(
			this._stepSetupSessionCookieInnerDivSelector,
		)
		const stepSetupInput = stepSetupDiv?.querySelector<HTMLInputElement>(this._stepSetupSessionCookieInputSelector)
		const fieldInfos = stepSetupDiv.dataset.fieldInfo?.split("/")

		if (stepSetupInnerDiv && stepSetupInput && fieldInfos && fieldInfos.length === this._fieldInfosLength) {
			const websiteName = fieldInfos[0] as WebsiteName
			const cookieName = fieldInfos[1]

			const foundWebsite = getWebsiteFromName(websiteName)
			if (!foundWebsite) {
				return
			}
			const btn = this._createGetCookieBtn(foundWebsite)
			const elements = { cookieName, div: stepSetupDiv, innerDiv: stepSetupInnerDiv, input: stepSetupInput, btn }

			if (!this._foundWebsites[foundWebsite.name]) {
				this._foundWebsites[foundWebsite.name] = { website: foundWebsite, login: false, elements: [elements] }
			} else {
				this._foundWebsites[foundWebsite.name]!.elements.push(elements)
			}
		}
	}

	private _setPhantomName = () => {
		let phantomName = document.querySelector<HTMLParagraphElement>(this._phantomNameSelector1)?.textContent
		if (!phantomName || phantomName.trim() === "Setup") {
			phantomName = document.querySelector<HTMLSpanElement>(this._phantomNameSelector2)?.textContent
		}
		this._phantomName = phantomName || ""
	}

	private _keydownListener = (event: KeyboardEvent) => {
		if (event.key === "Shift") {
			const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(`.${this._getCookieButtonClass}`))
			for (const button of buttons) {
				if (button.hasAttribute("hover")) {
					button.textContent = button.getAttribute("textContentLogin")
				}
			}
		}
	}

	private _keyupListener = (event: KeyboardEvent) => {
		if (event.key === "Shift") {
			const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(`.${this._getCookieButtonClass}`))
			for (const button of buttons) {
				if (button.hasAttribute("hover")) {
					button.textContent = button.getAttribute("textContentConnect")
				}
			}
		}
	}

	private _findStepSetupFieldSessionCookies = () => {
		const stepSetupDivs = Array.from(
			document.querySelectorAll<HTMLDivElement>(this._stepSetupSessionCookieDivSelector),
		)

		if (this._interval && stepSetupDivs.length) {
			clearInterval(this._interval)
		} else {
			return
		}

		for (const stepSetupDiv of stepSetupDivs) {
			this._handleStepSetupFieldDiv(stepSetupDiv)
		}

		this._setPhantomName()

		for (const foundWebsite of Object.values(this._foundWebsites)) {
			if (foundWebsite) {
				for (const elements of foundWebsite.elements) {
					elements.innerDiv.appendChild(elements.btn)
				}

				document.addEventListener("keydown", this._keydownListener)
				document.addEventListener("keyup", this._keyupListener)
			}
		}
	}
}
