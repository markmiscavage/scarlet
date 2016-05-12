import InsertImage from 'views/InsertImage'

describe('InsertImage View', function () {
	var view, model

	beforeEach(function () {
		let el = $('<div class="widget-insert-image"><form name="fakeForm"> <input data-response="true" /></form></div>')
		view = new InsertImage(el)
	})

	describe('InsertImage View Constructor', function () {

		it ('should exist', function () {
			expect(view.vars.$inputs).toBeDefined()
			expect(view.vars.$form).toBeDefined()
			expect(view.vars.size).toBeDefined()
			expect(view.vars.$node).toBeDefined()		
		});


		it('should setup Listeners', function() {
		});

	})
})