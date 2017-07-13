'use strict'

/**
 * Create Window object
 */
class WindowPopup {
	/**
	 * @param  {string}
	 * @param  {string}
	 * @param  {object}
	 * @param  {Function}
	 */
	constructor(url, name, options, cb) {
		this.url = url
		this.options = options
		this.cb = cb
		this.name = name
		this.newWin = null
		debugger
	}

	/**
	 * open window
	 */
	request() {
		debugger
		window[this.name] = data => {
			this.cb(data)
			this.newWin.close()
			window[name] = null
			delete window[name]
		}

		return (this.newWin = window.open(this.url, this.name, this.options))
	}
}

/**
 * window response
 * @param  {object}
 */
const respond = function(data) {
	debugger
	let name = window.name
	if (
		window.opener &&
		window.opener[name] &&
		typeof window.opener[name] === 'function'
	) {
		window.opener[name](data)
	}
}

/**
 * get query param from window location
 * @param  {string} query param
 * @return {string}
 */
function getQueryString(field) {
	let href = window.location.href
	let reg = new RegExp('[?&]' + field + '=([^&#]*)', 'i')
	let string = reg.exec(href)
	return string ? string[1] : null
}

/**
 * attach handlers to dom
 */
const handlePopup = function() {
	if (!window.opener) {
		return
	}
	if (getQueryString('popup') && getQueryString('addInput')) {
		$('#id_name').val(getQueryString('addInput'))
	}

	$('.close-popup').click(function(e) {
		window.close()
	})

	$('.widget-popup-data').each(function(i, dom) {
		respond($(dom).data())
	})
}

/**
 * For Click to open window
 * @param  {object} event
 * @param  {Function} callback
 */
const clickOpenPopup = function(e, cb) {
	e.preventDefault()
	let url = $(e.currentTarget).attr('href')
	let options =
		'menubar=no,location=no,resizable=no,scrollbars=yes,status=no,height=500,width=800'
	let windowPopup = new WindowPopup(url, 'assetWindow', options, function(
		data
	) {
		cb(data)
	})
	windowPopup.request()

	return false
}

export default WindowPopup
export { handlePopup, clickOpenPopup, respond }
