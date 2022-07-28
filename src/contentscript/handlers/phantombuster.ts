import { FromBackgroundRuntimeMessages } from "../../shared/messages"
import { Handler } from "./handler"
import {version} from '../../../manifest.json'

export class Phantombuster extends Handler {
	private _titleRegex = /PhantomBuster/

	public detect() {
		return this._titleRegex.test(document.title)
	}

	public onMessage(_msg: FromBackgroundRuntimeMessages) {
		return
	}

	public async run() {
		/*
		// Setting this attribute to indicate to the phantombuster front
		// that the extension is installed.
		*/
		document.body.setAttribute("data-pb-extension", version)
		return
	}

	public destroy() {
		return
	}
}
