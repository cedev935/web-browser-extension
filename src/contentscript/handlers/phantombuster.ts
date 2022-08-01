import { FromBackgroundRuntimeMessages } from "../../shared/messages"
import { Handler } from "./handler"
import {version} from '../../../manifest.json'
import { isPhantombusterSite } from "../../shared/websites"

export class Phantombuster extends Handler {

	public detect() {
		return isPhantombusterSite()
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
