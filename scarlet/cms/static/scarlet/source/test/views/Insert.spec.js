import Insert from 'views/Insert'

describe('Insert Base View', function () {
	var view

	beforeEach( () => {
		let el = $('<div class=".widget-insert-image"><form name="fakeForm"> </form></div>')
		let $node = $('<img src="happy.jpg" width="200" height="100" />')
		let size = {
			width: 200,
			height: 100
		}
	
		view = new Insert({el: el})
		view.vars.$node = $node
		view.vars.size = size

	})

	describe('Constructor', () => {

		it('should create vars', () => {
			expect(view.vars.$inputs).toBeDefined()
			expect(view.vars.$form).toBeDefined()
			expect(view.vars.size).toBeDefined()
			expect(view.vars.$node).toBeDefined()
		})

		it('should set $dom', () => {
			expect(view.$dom).toExist()
			expect(view.vars.$form.attr('name')).toBe('fakeForm')
		})

		it('should bind inputs', () => {
			
		})

	})

	describe('onInput', () => {
		it('should thow error', () => {
			expect( () => {
			  view.onInput()
	    }).toThrow('You must override the `onInput` method.')
		})

	})

	describe('constrainProportion', () => {

		it('should update width and height', function() {
			console.log('size before', view.vars.size)
			view.constrainProportion('height', 200)
			console.log('size after', view.vars.size)
		});


	})
})