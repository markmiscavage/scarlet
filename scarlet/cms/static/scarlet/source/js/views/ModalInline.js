import { View } from 'backbone'

class ModalChild {

	constructor (url, cb, closeCb) {
		this.name = name
		this.cb = cb
		this.closeCb = closeCb
		this.$inlineModal = buildInlineModal(url)
		this.$parentModal = window.scarlet_form_modal
	}

  addChild () {
  	this.$parentModal.find('iframe').parent().after($(this.$inlineModal))
  	resizeDialog($('body'), this.$parentModal)
  }


}


function buildInlineModal (url) {
	return $('<div class="dialog__frame--wrap"></div>')
 			.html('<iframe id="'+name+'" src="'+url+'" style="border: 0px; " src="' + url + '" width="100%" height="100%"></iframe>')
}

function resizeDialog (body, modal) {
	let height = body.height() + modal.height()
	let width = Math.max(body.width(), modal.width())
	console.log('new height width', height, width)
	modal.dialog({
		height: height,
		width: width
	})
}

/**
 * For Click to open window 
 * @param  {object} event
 * @param  {Function} callback
 */
const clickCreateModalChild = function (e, cb) {
  e.preventDefault()
  let url = $(e.currentTarget).attr('href')
  let child = new ModalChild(url, function (data) {
    cb(data)
  })
  child.addChild()
}

export default ModalChild
export { clickCreateModalChild }
