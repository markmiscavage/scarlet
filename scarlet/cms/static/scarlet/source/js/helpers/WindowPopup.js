'use strict';

class WindowPopup {
	constructor(url, name, input, options, cb) {
	  this.url = url
	  this.options = options
	  this.cb = cb
	  this.name = name
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

}


function respond (data) {
	let name = window.name
	if (window.opener && window.opener[name] && typeof window.opener[name] === 'function') {
		window.opener[name](data)
	}
}

function getQueryString ( field ) {
  let href = window.location.href
  let reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' )
  let string = reg.exec(href)
  return string ? string[1] : null
}

const handlePopup = function () {
	if (!window.opener) {
		return
	}
	if(getQueryString('popup') && getQueryString('addInput')) {
		$('#id_name').val(getQueryString('addInput'))
	}

	$('.close-popup').click(function (i, dom) {
		window.close()
	})	

	$('.widget-popup-data').each(function (i, dom) {
		respond($(dom).data())
	})	
}

export default WindowPopup
export { handlePopup }