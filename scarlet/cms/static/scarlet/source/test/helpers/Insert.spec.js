import Insert from '../../js/helpers/Insert'

describe('Insert Base View', function () {
	var view

	beforeEach(function () {
		let el = $('<div class=".widget-insert-image"><form name="fakeForm"> </form></div>')
	
		view = new Insert({el: el})

	})

	describe('Insert View Construction', function () {

		it('should create vars', function () {
			expect(view.vars.$inputs).toBeDefined()
			expect(view.vars.$form).toBeDefined()
			expect(view.vars.size).toBeDefined()
			expect(view.vars.$node).toBeDefined()
		})

		it('should set $dom', function() {
			expect(view.$dom).toExist()
			expect(view.vars.$form.attr('name')).toBe('fakeForm')
		});

		


	})
})