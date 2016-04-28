'use strict'

import { View } from 'backbone'
import selectize  from 'selectize'
import WindowPopup from '../helpers/WindowPopup'
import '../../stylesheets/views/select.scss'

const SelectAsset = View.extend({

  /**
   * Backbone Init Setter
   */
  initialize: function () {
    this.input = this.$el.find('input')
    this.preview = this.$el.find('.widget-asset-preview')
    this.url = this.$el.data('api')
    this.addUrl = this.$el
    this.cropsList = this.$el.find('.crops-list')
    this.baseLink = this.cropsList.data('base-link')
    this.selectizeInput = this.input.after('<input />')
    this.autoTag()
    this.linkifyCrops()
  },

  /**
   * Backbone Events Object
   */
  events: {
    'click .button, .crop-link' : 'openPopup'
  },

  /**
   * Render Views  
   */
  render: function() {
    let opts = {
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
      onInitialize: this.initSelections.bind(this)
    }
    this.selectizeInput.selectize(opts).setValue
    this.tag()
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
    this.selectize = this.selectizeInput[0].selectize
    let thumb = window.location.origin + this.preview.css('background-image')
    let opt = {
      id: this.selectize.$input.val(),
      user_filename: this.$el.attr('data-title'),
      thumbnail: thumb,
      text: this.$el.attr('data-title')
    }
    this.selectize.removeOption(opt.id)
    this.setSelected(opt)
  },

  // Set Selected Image
  setSelected: function (item) {
    this.selectize.addOption(item)
    this.selectize.setValue(item.id)
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
    this.preview.css('background-image', 'url(' + $item.attr('data-thumb') + ')')
  },

  /**
   * Prepare Selectize options
   * @return {object}
   */
  renderOption: function () {
    return {
      item: (item, escape) => {
        return '<div class="item" data-thumb="' +  
          window.location.origin + escape(item.thumbnail) + 
          '" data-id="'+item['id']+'" >' + escape(item['text']) + 
        '</div>'
      },
      option: (item, escape) => {
        let opt =  '<div data-id="' + item['id']+'">' +
                '<div style="background-image: url(' + window.location.origin + escape(item.thumbnail) + ')" class="selectAsset__image--thumb"></div>' +
                escape(item['text']) + 
              '</div>'
        return opt
      }
    }
  },

  /**
   * Window open trigger
   * @param  {object} event object  
   */
  openPopup : function (e) {
    e.preventDefault()
    let url = $(e.currentTarget).attr('href')
    let options = 'menubar=no,location=no,resizable=no,scrollbars=yes,status=no,height=500,width=800'
    let windowPopup = new WindowPopup(url, 'media', options, (data) => {
      this.setSelected(data)
      // this.input.val = data.id
      // this.preview.css('background-image', 'url(' + data.thumbnail + ')')
    })
    windowPopup.request()

    return false
  },

  linkifyCrops : function () {
    let guidLink = this.baseLink + this.cropsList.parent().find('[type=hidden]').val()

    this.cropsList.find('li').each(function (i, el) {
      el = $(el);

      let editLink = guidLink + "/" + el.data("crop-link") + '?popup=1';

      el.find('a').attr('href', editLink);
    })
  },

  paramConstruct : function (obj) {
    let op = []
    for (let i in obj) {
      op.push(i + '=' + obj[i])
    }
    return "?" + op.join('&')
  },

  paramDestruct : function (path) {
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
      let data_auto_tag = $(dom).data('auto-tag')
      if (data_auto_tag) {
        let allTags = data_auto_tag.toLowerCase().split(',')
        while (allTags.length) {
          let tag = allTags.shift()
          let splitTag = tag.split(" ")
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
    $('#auto_tags').val(tags.join(','));
    this.autoTags = tags;
  },

  tag : function () {

    if (!this.$el.find('a.button').length) {
      return
    }

    let node = this.$el.find('a.button')
    let params = this.paramDestruct(node[0].search)
    let tags = ($(this.$el).data('tags') || '').toLowerCase().split(',')

    tags = tags.concat(this.autoTags)
    params.tags = encodeURIComponent(tags.join(','))
    node[0].search = this.paramConstruct(params)
  },


})


export default SelectAsset