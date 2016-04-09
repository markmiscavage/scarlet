'use strict'
import React from 'react'
import AutoFill from './AutoFill'
import TestUtils from 'react-addons-test-utils'
// import nock from 'nock'


describe('AutoFill Component', function() {

	let renderer = TestUtils.createRenderer()

	it('should render a thing', function() {
		let data = {
			dataApi: 'http://localhost:8000/admin/users/',
			dataAdd: 'http://localhost:8000/admin/users/',
			name: 'tags'
		}
		renderer.render(<AutoFill data={data} />)

		let autoFillNode = renderer.getRenderOutput()

		expect(autoFillNode.type).toBe('div')
		TestUtils.Simulate.change(autoFillNode)
		TestUtils.Simulate.keyDown(autoFillNode, {key: "Enter", keyCode: 13, which: 13})
		console.log(JSON.stringify(autoFillNode))
	})
})

