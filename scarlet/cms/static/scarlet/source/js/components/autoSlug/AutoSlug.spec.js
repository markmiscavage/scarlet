'use strict'
import React from 'react'
import AutoSlug from './AutoSlug'
import TestUtils from 'react-addons-test-utils'


describe('AutoSlug Component', function() {

    let renderer = TestUtils.createRenderer()

    it('should render a thing', function() {
        let props = {
          sourceNode: document.createElement('input'),
          slugNode: document.createElement('input'),
          label: labelNode.textContent,
          fieldAttributes: {
            id: dataNode.id,
            name: dataNode.name,
            maxLength: dataNode.maxlength,
            type: dataNode.type,
            className: dataNode.class
          },
          labelAttributes: {
            className: labelNode.class
          }
        }
        renderer.render(<AutoSlug {...props} />)

        let autoSlugNode = renderer.getRenderOutput()

        expect(autoSlugNode.type).toBe('div')
        TestUtils.Simulate.change(autoSlugNode)
        TestUtils.Simulate.keyDown(autoSlugNode, {key: 'Enter', keyCode: 13, which: 13})
        console.log(JSON.stringify(autoSlugNode))
    })
})

