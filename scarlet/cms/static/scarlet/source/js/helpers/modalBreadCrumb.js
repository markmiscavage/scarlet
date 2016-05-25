'use strict'

var crumbs = []

const modalBreadCrumb = {

	addCrumb: function addCrumb (name) {
		return crumbs.push(name)
	},

	removeCrumb: function removeCrumb (name) {
		if (this.crumbs.indexOf(name) !== -1) {
			return crumbs.splice(this.crumbs.indexOf(name), 1)
		}
		return 
	},

	getCrumbs: function getCrumbs () {
		return crumbs
	},

	resetCrumbs: function resetCrumbs () {
		return crumbs = []
	}

}


let instance = null

class BreadCrumb{  

	constructor() {
		if(!instance){
			instance = this
		}

		this.crumbs = this.crumbs || []

		return instance
	}

	addCrumb (name) {
		return this.crumbs.push(name)
	}

	removeCrumb (name) {
		if (this.crumbs.indexOf(name) !== -1) {
			return this.crumbs.splice(this.crumbs.indexOf(name), 1)
		}
		return 
	}

	getCrumbs () {
		return this.crumbs
	}

	resetCrumbs () {
		return this.crumbs = []
	}

}

export default modalBreadCrumb