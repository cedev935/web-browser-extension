const headElement = document.head || document.documentElement

export const injectFunction = (func: (vals: string[]) => void, vals: string[]) => {
	const s = document.createElement("script")
	s.textContent = `(${func})(${JSON.stringify(vals)});`
	headElement.insertBefore(s, headElement.firstElementChild)
}
