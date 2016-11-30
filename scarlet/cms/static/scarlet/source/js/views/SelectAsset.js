'use strict'

import { View } from 'backbone'
import selectize  from 'selectize'
import { clickOpenModal } from 'helpers/Modal'
import { clickOpenPopup } from 'helpers/WindowPopup'

const SelectAsset = View.extend({

  initialize: function () {
    this.$input = this.$('input')
    this.$preview = this.$('.asset__preview')
    this.$cropsList = this.$('.asset__crop-list')
    this.$selectizeInput = this.$input.after('<input />')
    this.baseLink = this.$cropsList.data('base-link')
    this.url = this.$el.data('api')
    this.addOpen = false
  },

  /**
   * Backbone Events Object
   */
  events: {
    'click .button, .asset__crop-link' : 'handlePopup'
  },

  /**
   * Render View
   */
  render: function() {
    let options = {
      placeholder: 'Choose an asset',
      valueField: 'id',
      labelField: 'text',
      searchField: 'text',
      create: false,
      load: this.load.bind(this),
      preload: 'focus',
      maxItems: 1,
      render: this.renderOption(),
      onItemAdd: this.onSelect.bind(this),
      onInitialize: this.initSelections.bind(this),
      onChange: this.onChange.bind(this)
    }
    this.$selectizeInput.selectize(options).setValue
    this.tag()
    this.autoTag()
    this.linkifyCrops()
  },

  /**
   * Load Data
   * @param  {string}  input query
   * @param  {Function}  callback function
   * @return {function}  return callback
   */
  load: function (query, callback) {
    $.ajax({
      url: this.url,
      type: 'GET',
      dataType: 'json',
      error: () => {
        callback()
      },
      success: (response) => {
        let results = this.transformResults(response)
        callback(results)
      }
    })
  },

  /**
   * Set selections based on server rendered data
   */
  initSelections: function () {
    this.selectize = this.$selectizeInput[0].selectize
    let thumb = this.$preview.data('src')
    let options = this.options = {
      id: this.selectize.$input.val(),
      user_filename: this.$el.attr('data-title'),
      thumbnail: thumb,
      text: this.$el.attr('data-title')
    }

    this.selectize.removeOption(options.id)
    this.setSelected(options)
  },

  /**
   * Trasnform Response Data
   * @param  {object}
   * @return {object}
   */
  transformResults: function (response) {
    this.fields = []
    this.params = []

    for (let field in response.fields) {
      this.fields.push(field)
    }

    return response.results.map( (item) => {
      item.text = item.user_filename
      return item
    })
  },

  /**
   * Selecting Asset from list
   * @param  {'string'}
   * @param  {object}
   */
  onSelect: function (value, $item) {
    this.linkifyCrops()
    this.$preview.css('background-image', 'url(' + $item.attr('data-thumb') + ')')
    if($item.attr('data-src')){
      this.$input.attr('data-src', $item.attr('data-src'))
    }
  },

  onChange: function () {
    this.linkifyCrops()

    if (!this.$input.val()) {
      this.$preview.css('background-image', 'none')
    }
  },

  /**
   * Prepare Selectize options
   * @return {object}
   */
  renderOption: function () {
    return {
      item: (item, escape) => {
        return '<div data-thumb="' +
                window.location.origin + escape(item.thumbnail) +
                '" data-id="'+ item['id'] +
                '" data-src="'+ item['url'] +'" >' +
                escape(item['text']) +
                '</div>'
      },
      option: (item, escape) => {
        let option =  '<div class="select-asset__item" data-id="' + item['id']+'">' +
                      '<div style="background-image: url(' + window.location.origin + escape(item.thumbnail) + ')" class="select-asset__image--thumb"></div><span class="select-asset__caption">' +
                      escape(item['text']) +
                      '</span></div>'
        return option
      }
    }
  },

  linkifyCrops : function () {
    let guidLink = this.baseLink + this.$cropsList.parent().find('[type=hidden]').val()
    this.$cropsList.find('li').each(function (i, el) {
      let $el = $(el)
      let editLink = guidLink + '/' + $el.data('crop-link') + '?popup=1'
      $el.find('a').attr('href', editLink)
    })
  },

  /**
   * constructs param for tagging
   * @param  {obj}
   * @return {string}
   */
  constructParams : function (obj) {
    let params = []
    for (let i in obj) {
      params.push(i + '=' + obj[i])
    }
    return '?' + params.join('&')
  },

  /**
   * parsing query string
   * @param  {string}
   * @return {arra7}
   */
  destructParams : function (path) {
    let ret = {}
    let seg = path.replace(/^\?/, '').split('&')
    for (let i = 0, len = seg.length; i < len; i++) {
      if (!seg[i]) {
        continue
      }
      let s = seg[i].split('=')
      ret[s[0]] = s[1]
    }
    return ret
  },

  autoTag : function () {
    let tags = []
    $('[data-auto-tag]').each(function (i, dom) {
      let dataAutoTag = $(dom).data('auto-tag')
      if (dataAutoTag) {
        let allTags = dataAutoTag.toLowerCase().split(',')

        while (allTags.length) {
          let tag = allTags.shift()
          let splitTag = tag.split(' ')
          tags.push(tag)

          // if splitTag length > 3, push individual values
          if (tag.match(/[a-z0-9]/i) && splitTag.length > 3) {
            while (splitTag.length) {
              let newTag = splitTag.shift()
              if (tags.indexOf(newTag) === -1) {
                tags.push(newTag)
              }
            }
          }
        }
        tags = tags.concat(allTags)
      }
    })
    $('#auto_tags').val(tags.join(','))
    this.autoTags = tags
  },

  tag: function () {
    if (!this.$('a.button').length) {
      return
    }

    let node = this.$('a.button')
    let params = this.destructParams(node[0].search)
    let tags = ($(this.$el).data('tags') || '').toLowerCase().split(',')

    tags = tags.concat(this.autoTags)
    params.tags = encodeURIComponent(tags.join(','))
    node[0].search = this.constructParams(params)
  },

  // Set Selected Image
  setSelected: function (options) {
    if (options.thumbnail) {
      this.selectize.addOption(options)
      this.selectize.setValue(options.id)
      this.addOpen = false
    }
  },

  handlePopup: function (e) {
    //clickOpenModal(e, 'modal-add-asset', this.setSelected.bind(this), this.autoTags)
    clickOpenPopup(e, this.setSelected.bind(this))

    // LIST APPROACH
    // if(this.addOpen){
    //   e.preventDefault()
    // } else {
    //   this.addOpen = true
    //   clickOpenModal(e, 'modal-add-asset', this.setSelected.bind(this), this.autoTags)
    // }
  }
})

export default SelectAsset
