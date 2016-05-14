'use strict'
import ModalInline from 'views/ModalInline'
import '../../stylesheets/views/modal.scss'

class Modal {

	/**
	 * @param  {string} url - url to load
	 * @param  {string} name - name to pass to modal
	 * @param  {object} options - dialog overrides
	 * @param  {function} cb - successful submit callback
	 * @param  {function} cb - close modal callback 
	 */
	constructor (url, name, options, cb, closeCb){
		this.name = name
		this.cb = cb
		this.closeCb = closeCb
		this.options = {
			autoOpen: false,
			closeOnEscape: true,
			modal: true,
			height: 500,
			width: 600,
			draggable: false,
			show: { effect: 'fadeIn', duration: 300 },
			dialogClass: 'dialog__no-title'
		}
		if (options) this.options = Object.assign(this.options, options)
		if (isModalOpen()) this.$parentModal = window.scarlet_form_modal
		this.$dialog = buildDialog(url, name, this.options)

		// TODO(JM) remove if we decide to keep modals in place
		// this.$dialog.parent().draggable().css('cursor', 'move')
	}

	/**
	 * Open method triggers modal open
	 * @param  {string}
	 */
	open (qry) {	
		let frame
		if (isModalOpen()) {
			frame = this.$dialog.find('iframe#' + this.name)[0]
			this.$parentModal.find('iframe').parent().after(this.$dialog)
		} else {
			this.$dialog.dialog('open')
			frame = document.getElementById(this.name)
			frame.contentWindow.scarlet_form_modal = this.$dialog
		}
		this.initLoad = false
		$(frame).load( () => {
			this.onLoad(qry, frame)
		})

	}

	/**
	 * fires on iFrame Load
	 * @param  {object}
	 */
	onLoad (qry, frame) {
		let frameBody = frame.contentDocument.body
		$(frameBody).addClass('modalDialog__body')
		if(qry) $(frameBody).find('#id_name').val(qry)
		this.addListeners(frameBody)
		if(!this.initLoad) this.resizeDialog(frameBody)
		this.initLoad = true
	}

	/**
	 * close method calls passed in close callback
	 * close method destroys and removes initialized modal
	 */
	close () {
		if(this.closeCb) this.closeCb()
		this.$dialog.dialog('destroy').remove()
	}

	/**
	 * Add listeners to iframe dom
	 * @param {object} iframe document body
	 */
	addListeners (frameBody) {
		$(frameBody).find('.close-popup').on('click', (e) => {
			e.preventDefault()
			this.close()
		})

		$(frameBody).find('.widget-popup-data').each( (i, dom) => {
			this.cb($(dom).data())
			this.close()
		})
	}

	/**
	 * resizeDialog updates size based on form content
	 * @param  {object} iframe document body
	 */
	resizeDialog (frameBody) {
		let $content = $(frameBody).find('#content')
		if(isModalOpen()){
			let width = Math.max(this.$parentModal.width(), $content.width())
			let height = this.$parentModal.height() + $content.height()
			this.$parentModal.dialog({height: height, width: width})
		} else {
			this.$dialog.dialog({height: $content.height() + 100, width: $content.width()})
		}
	}

}

/**
 * @param  {string} url - url to load in modal
 * @param  {string} name - name of modal
 * @param  {object} options - dialot options overrieds
 * @return {object}	dialog node dom element
 */
function buildDialog (url, name, options) {
	if(isModalOpen()) {
		return $('<div class="dialog__frame--wrap"></div>')
	 		.html('<iframe id="'+name+'" src="'+url+'" style="border: 0px; " src="' + url + '" width="100%" height="100%"></iframe>')
	} else {

		return $('<div class="dialog__frame--wrap"></div>')
			.html('<iframe id="'+name+'" style="border: 0px; " src="' + url + '" width="100%" height="100%"></iframe>')
			.dialog(options)
	}
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

/**
 * For Click to open window 
 * @param  {object} event
 * @param  {Function} callback
 */
const clickOpenModal = function (e, name, cb) {
  e.preventDefault()
  let url = $(e.currentTarget).attr('href')
  let modal = new Modal(url, name, false, function (data) {
    cb(data)
  })
  modal.open()

  return false
}

const isModalOpen  = function () {
	return window.location != window.parent.location
}


export default Modal
export { clickOpenModal, isModalOpen }