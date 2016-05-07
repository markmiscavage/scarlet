'use strict'

import '../../stylesheets/views/modalDialog.scss'

class ModalDialog {

	constructor (url, name, options, cb){
		this.name = name
		this.cb = cb
		this.options = {
			autoOpen: false,
			closeOnEscape: true,
			modal: false,
			height: 500,
			width: 600,
			dialogClass: 'dialog__no-title'
		}
		if(options) this.options = Object.assign(this.options, options)
		this.$dialog = buildDialog(url, name, this.options)

	}

	open () {
		this.$dialog.dialog('open')
		let frame = document.getElementById(this.name)
		$(frame).load( () => {
			this.addListeners(frame)
		})

	}

	close () {
		console.log('dialog data')
		this.$dialog.dialog('close')
	}

	addListeners (frame) {
		this.frameBody = frame.contentDocument.body

		$(this.frameBody).find('.close-popup').on('click', (e) => {
			e.preventDefault()
			this.close()
		})

		$(this.frameBody).find('.widget-popup-data').each( (i, dom) => {
			this.cb($(dom).data())
			this.close()
		})

	}

}


function buildDialog (url, name, options) {
	let dialog = $('<div></div>')
		.html('<iframe id="'+name+'" style="border: 0px; " src="' + url + '" width="100%" height="100%"></iframe>')
		.dialog(options)

	return dialog
}

/**
 * get query param from window location
 * @param  {string} query param
 * @return {string}
 */
function getQueryString ( field ) {
  let href = window.location.href
  let reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' )
  let string = reg.exec(href)
  return string ? string[1] : null
}


export default ModalDialog