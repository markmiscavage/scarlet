'use strict'
import ModalInline from 'views/ModalInline'
import { dasherize } from 'helpers/utils'
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
			height: 600,
			width: 600,
			draggable: false,
			show: { effect: 'fadeIn', duration: 300 },
			dialogClass: 'dialog__no-title'
		}
		if (options) this.options = Object.assign(this.options, options)
		if (isModalOpen()) this.$parentModal = window.scarlet_form_modal
		this.$dialog = buildDialog(url, name, this.options)
	}

	/**
	 * Open method triggers modal open
	 * @param  {string}
	 */
	open (qry, tags) {	
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
			this.onLoad(qry, frame, tags)
		})

	}

	/**
	 * fires on iFrame Load
	 * @param  {object}
	 */
	onLoad (qry, frame, tags) {
		let frameBody = frame.contentDocument.body
		if(tags) $(frameBody).find('#auto_tags, #id_tags').val(tags.join(','))
		$(frameBody).addClass('modal__body')
		if(qry) {
			$(frameBody).find('#id_name').val(qry)
			$(frameBody).find('#id_slug').val(dasherize(qry))
		}
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
		if(this.$dialog.hasClass('ui-dialog-content')) {
			this.$dialog.dialog('destroy').remove()
		} else {
			this.$dialog.remove()
			this.resizeDialog()
		}
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
	resizeDialog () {
		if(this.$parentModal){
			// LIST
			// let children = this.$parentModal.children()
			// this.$parentModal.dialog({height: getChildrenHeight(children) + 100, width: getLargestWidth(children) + 50})
			// STACKED 
			let last = this.$parentModal.children().last()
			this.$parentModal.dialog({height: getModalContent(last).outerHeight() + 25, width: getModalContent(last).outerWidth() + 20})
		} else if(this.$dialog){
			// LIST
			// let children = this.$dialog.children()
			// this.$dialog.dialog({height: getChildrenHeight(children) + 100, width: getLargestWidth(children) + 50})
			// STACKED
			let last = this.$dialog.children().last()
			this.$dialog.dialog({height: getModalContent(last).outerHeight() + 25, width: getModalContent(last).outerWidth() + 20})
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
		return $('<div class="modal__frameWrap modal__inline"></div>')
	 		.html('<iframe id="'+name+'" src="'+url+'" style="border: 0px; " src="' + url + '" width="100%" height="100%"></iframe>')
	} else {

		return $('<div class="modal__framesContainer"></div>')
			.html('<div class="modal__frameWrap"><iframe id="'+name+'" style="border: 0px; " src="' + url + '" width="100%" height="100%"></iframe></div>')
			.dialog(options)
	}
}


/**
 * calculate height of children
 * updates height to child explicitly based on content
 * @param  {array} children [jquery children object]
 * @return {number}   combined height
 */
function getChildrenHeight (children) {
	return children.toArray().reduce( (a, b) => {
			$(b).css('height', getModalContent(b).height() + 50)
			return a + $childContent.height()
		}, 0)
}

/**
 * find largest width of children
 * @param  {array} children [jquery children object]
 * @return {number}   compares widths
 */
function getLargestWidth (children) {
	return children.toArray().reduce( (a, b) => {
			return Math.max(a, getModalContent(b).width())
		}, 0)
}

/**
 * helper to find doc body content for modal
 * @param  Object - iframe wrapper
 * @return Object - #content node inside iframe
 */
function getModalContent (wrap) {
	if(wrap && $(wrap).find('iframe')[0].contentDocument){
		let childBody = $(wrap).find('iframe')[0].contentDocument.body
		return $(childBody).find('#content')
	}
}

/**
 * For Click to open window 
 * @param  {object} event
 * @param  {Function} callback
 */
const clickOpenModal = function (e, name, cb, tags) {
  e.preventDefault()
  let url = $(e.currentTarget).attr('href')
  let modal = new Modal(url, name, false, function (data) {
    cb(data)
  })
  modal.open(false, tags)

  return false
}

const isModalOpen  = function () {
	return window.location != window.parent.location
}


export default Modal
export { clickOpenModal, isModalOpen }