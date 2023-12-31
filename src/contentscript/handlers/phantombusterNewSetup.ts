import { FromBackgroundRuntimeMessages } from "../../shared/messages"
import { IWebsite, WebsiteName, getWebsiteFromName, isPhantombusterSite } from "../../shared/websites"
import { Handler } from "./handler"
import { Cookies } from "webextension-polyfill"

interface IElement {
	cookieName: string
	rootElement: HTMLElement
	input: HTMLInputElement
	inputListener?: (event: Event) => void
	btnContainer: HTMLElement
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
	private _fastPoll = 200
	private _spinnerDelay = 1000
	private _fieldInfosLength = 2
	private _pathnameRegex = RegExp("/setup/step")
	private _interval?: ReturnType<typeof setInterval>
	private _stepSetupSessionCookieRootSelector = '[id^="formField-sessionCookie"]'
	private _stepSetupSessionCookieInputSelector = 'input[data-role="sessionCookieField"]'
	private _stepSetupSessionCookieBtnContainerSelector = '[data-role="connectButtonContainer"]'
	private _getCookieButtonClass = "pbExtensionNewSetupCookieButton"
	private _phantomNameSelector1 = "header p"
	private _phantomNameSelector2 = "aside header span"
	private _phantomNameSelector3 = '[id^="agent-name"]'
	private _getCookieBtnAnalyticsId = "agentSetupStepsInputGetcookieBtn"
	private _getCookieBtnSelector = `button[analyticsid="${this._getCookieBtnAnalyticsId}"]`

	private _phantomName: string = ""
	private _foundWebsites: IFoundWebsites = {}

	public detect = () => {
		return isPhantombusterSite() && this._pathnameRegex.test(window.location.pathname)
	}

	public onMessage = (msg: FromBackgroundRuntimeMessages) => {
		if (msg.cookies) {
			this._onMessageCookies(msg.cookies.websiteName, msg.cookies.cookies)
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
	}

	private _onMessageCookies = (websiteName: WebsiteName, cookies: Cookies.Cookie[]) => {
		const foundWebsite = this._foundWebsites[websiteName]
		if (foundWebsite) {
			if (cookies.length === 0 || !cookies[0]) {
				this._websiteLogin(foundWebsite)
			} else {
				void this._fillInputs(foundWebsite, cookies)
			}
		}
	}

	private _websiteLogin = (foundWebsite: IFoundWebsite) => {
		foundWebsite.login = true
		for (const element of foundWebsite.elements) {
			element.btn.textContent = `Please log in to ${foundWebsite.website.name}`
		}
		void this.sendMessage({ notif: { message: `Please log in to ${foundWebsite.website.name}` } })
		void this.sendMessage({
			newTab: {
				websiteName: foundWebsite.website.name,
				url: foundWebsite.website.url,
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
		// remove detached elements
		foundWebsite.elements = foundWebsite.elements.filter(({ btn }) => btn.isConnected)

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
		el.setAttribute("analyticsid", this._getCookieBtnAnalyticsId)
		el.setAttribute("analyticsval1", website.name)

		el.setAttribute("textContentConnect", `Connect to ${website.name}`)

		el.textContent = el.getAttribute("textContentConnect")

		if (document.querySelector<HTMLDivElement>("body > #root > div")?.dataset.loggedAs === "true") {
			el.disabled = true
		} else {
			el.onclick = () => {
				void this.sendMessage({
					getCookies: {
						websiteName: website.name,
					},
				})
			}
		}

		return el
	}

	private _handleStepSetupFieldDiv = (stepSetupRoot: HTMLElement) => {
		const stepSetupInput = stepSetupRoot?.querySelector<HTMLInputElement>(this._stepSetupSessionCookieInputSelector)
		const stepSetupBtnContainer = stepSetupRoot?.querySelector<HTMLElement>(
			this._stepSetupSessionCookieBtnContainerSelector,
		)
		const fieldInfos = stepSetupRoot.dataset.fieldInfo?.split("/")

		if (stepSetupInput && stepSetupBtnContainer && fieldInfos && fieldInfos.length === this._fieldInfosLength) {
			const websiteName = fieldInfos[0] as WebsiteName
			const cookieName = fieldInfos[1]

			const foundWebsite = getWebsiteFromName(websiteName)
			if (!foundWebsite) {
				return
			}
			const btn = this._createGetCookieBtn(foundWebsite)
			const elements: IElement = {
				cookieName,
				rootElement: stepSetupRoot,
				input: stepSetupInput,
				btnContainer: stepSetupBtnContainer,
				btn,
			}

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
		if (this._phantomNameSelector3) {
			phantomName = document.querySelector<HTMLSpanElement>(this._phantomNameSelector3)?.textContent
		}
		this._phantomName = phantomName || ""
	}

	private _findStepSetupFieldSessionCookies = () => {
		const stepSetupRoots = Array.from(
			document.querySelectorAll<HTMLElement>(this._stepSetupSessionCookieRootSelector),
		)

		if (!stepSetupRoots.length) {
			return
		}
		// as this function is a loop we have to prevent multiple addition of the same elements
		if (document.querySelector(this._getCookieBtnSelector)) {
			return
		}

		for (const stepSetupRoot of stepSetupRoots) {
			this._handleStepSetupFieldDiv(stepSetupRoot)
		}

		this._setPhantomName()

		for (const foundWebsite of Object.values(this._foundWebsites)) {
			if (foundWebsite) {
				for (const elements of foundWebsite.elements) {
					elements.btnContainer.appendChild(elements.btn)
				}
			}
		}
	}
}
