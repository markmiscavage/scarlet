'use strict';

class WindowPopup {
	constructor(url, options, cb) {
	  this.url = url
	  this.options = options
	  this.cb = cb
	  this.name = 'popup'
	  this.newWin = null
	}

	request () {
		window[this.name] = (data) => {
			this.cb(data)
			this.newWin.close()
			window[name] = null
			delete window[name]
		}

		this.newWin = window.open(this.url, this.name, this.options)
	}

	respond (data) {
		let name = window.name
		if (window.opener && window.opener[name] && typeof window.opener[name] === 'function') {
			window.opener[name](data)
		}
	}
}

export default WindowPopup